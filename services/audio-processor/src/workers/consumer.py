"""Redis queue consumer worker processing AUDIO_MASTERING tasks asynchronously."""

import json
import logging
import signal
import sys
import time
from typing import Any, Dict, Optional

import redis

from src.config import settings
from src.schemas.process_request import ProcessRequest
from src.services.pipeline import pipeline_service

logger = logging.getLogger(__name__)

AUDIO_MASTERING_QUEUE = "queue:audio_mastering"
TASK_EVENTS_CHANNEL = "channel:task_events"


class AudioMasteringConsumer:
    """Worker polling Redis queue for AUDIO_MASTERING tasks and orchestrating jobs."""

    def __init__(
        self,
        redis_addr: Optional[str] = None,
        queue_name: str = AUDIO_MASTERING_QUEUE,
        events_channel: str = TASK_EVENTS_CHANNEL,
    ):
        self.redis_addr = redis_addr or settings.redis_addr
        self.queue_name = queue_name
        self.events_channel = events_channel
        self.running = False
        self.client: Optional[redis.Redis] = None

    def get_redis_client(self) -> redis.Redis:
        """Initialize or return existing Redis client connection."""
        if self.client is None:
            # Parse redis_addr (e.g., 'localhost:6379' or 'redis-broker:6379')
            if ":" in self.redis_addr:
                host, port_str = self.redis_addr.split(":", 1)
                port = int(port_str)
            else:
                host = self.redis_addr
                port = 6379

            self.client = redis.Redis(
                host=host,
                port=port,
                decode_responses=True,
                socket_timeout=10,
            )
        return self.client

    def process_job_payload(self, raw_data: str) -> Dict[str, Any]:
        """
        Parse and execute a single job from raw JSON string.

        :param raw_data: Serialized JSON payload matching ProcessRequest.
        :return: Dict representation of MasteringResult.
        """
        data = json.loads(raw_data)
        request = ProcessRequest.model_validate(data)
        result = pipeline_service.process_lesson(request)
        return result.model_dump()

    def handle_task(self, raw_data: str) -> None:
        """Process job and publish completion or failure event to Redis."""
        client = self.get_redis_client()
        task_id = "unknown"
        try:
            payload_peek = json.loads(raw_data)
            task_id = payload_peek.get("task_id", "unknown")
            lesson_id = payload_peek.get("lesson_id", "")

            logger.info("Processing background job for task_id='%s' (lesson='%s')", task_id, lesson_id)
            result_data = self.process_job_payload(raw_data)

            # Publish success notification
            event = {
                "event": "TASK_COMPLETED",
                "task_id": task_id,
                "lesson_id": lesson_id,
                "status": "success",
                "timestamp": int(time.time()),
                "result": result_data,
            }
            client.publish(self.events_channel, json.dumps(event))
            logger.info("Successfully completed task_id='%s'", task_id)

        except Exception as e:
            logger.exception("Failed to process task_id='%s': %s", task_id, str(e))
            error_event = {
                "event": "TASK_FAILED",
                "task_id": task_id,
                "status": "failed",
                "timestamp": int(time.time()),
                "error": str(e),
            }
            try:
                client.publish(self.events_channel, json.dumps(error_event))
            except Exception as pub_err:
                logger.error("Failed to publish error event: %s", pub_err)

    def run_worker(self, poll_timeout_sec: int = 2) -> None:
        """Continuous polling loop for jobs on Redis queue."""
        self.running = True
        client = self.get_redis_client()

        logger.info("Starting AudioMasteringConsumer on queue '%s'", self.queue_name)

        while self.running:
            try:
                # BLPOP blocks until a job is pushed or timeout occurs
                job = client.blpop(self.queue_name, timeout=poll_timeout_sec)
                if job:
                    _, raw_data = job
                    self.handle_task(raw_data)
            except redis.ConnectionError as ce:
                logger.warning("Redis connection error, retrying in 3 seconds: %s", ce)
                time.sleep(3)
            except Exception as e:
                logger.error("Unexpected error in consumer loop: %s", e)
                time.sleep(1)

        logger.info("AudioMasteringConsumer stopped gracefully.")

    def stop(self) -> None:
        """Signal consumer to stop gracefully."""
        self.running = False


def main():
    """Worker entrypoint when executed as a standalone module."""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )

    consumer = AudioMasteringConsumer()

    def handle_shutdown(signum, frame):
        logger.info("Received signal %d, shutting down worker...", signum)
        consumer.stop()
        sys.exit(0)

    signal.signal(signal.SIGINT, handle_shutdown)
    signal.signal(signal.SIGTERM, handle_shutdown)

    consumer.run_worker()


if __name__ == "__main__":
    main()
