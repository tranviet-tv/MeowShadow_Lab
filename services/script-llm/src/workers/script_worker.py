"""Redis queue and pubsub worker processing script parsing and chunking tasks asynchronously."""

import asyncio
import json
import logging
import threading
import time
from typing import Any, Dict, Optional

import redis

from src.config import settings
from src.services.llm_pipeline import LLMPipeline

logger = logging.getLogger(__name__)

SCRIPT_PARSE_QUEUE = "queue:script_parse"
SCRIPT_PARSE_TOPIC = "jobs:script:parse"
TASK_EVENTS_CHANNEL = "channel:task_events"


class ScriptWorker:
    """Worker listening on Redis queue and pubsub for script parsing and chunking tasks."""

    def __init__(
        self,
        redis_addr: Optional[str] = None,
        queue_name: str = SCRIPT_PARSE_QUEUE,
        topic_name: str = SCRIPT_PARSE_TOPIC,
        events_channel: str = TASK_EVENTS_CHANNEL,
    ):
        self.redis_addr = redis_addr or settings.redis_addr
        self.queue_name = queue_name
        self.topic_name = topic_name
        self.events_channel = events_channel
        self.running = False
        self.client: Optional[redis.Redis] = None
        self.pipeline = LLMPipeline()

    def get_redis_client(self) -> redis.Redis:
        """Initialize or return existing Redis client connection."""
        if self.client is None:
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

    def handle_task_payload(self, raw_data: str) -> None:
        """Process a script parse job payload and publish results to TASK_EVENTS_CHANNEL."""
        client = self.get_redis_client()
        task_id = "unknown"
        lesson_id = "unknown"

        try:
            payload = json.loads(raw_data)
            task_id = payload.get("task_id") or payload.get("job_id", f"task_{int(time.time()*1000)}")
            lesson_id = payload.get("lesson_id", "unknown")
            source_text = payload.get("source_text", "")
            target_language = payload.get("target_language", "en")

            logger.info("Processing script parsing task_id='%s' (lesson='%s')", task_id, lesson_id)

            # Publish task started notification
            start_event = {
                "event": "TASK_STARTED",
                "task_id": task_id,
                "lesson_id": lesson_id,
                "service": settings.app_name,
                "timestamp": int(time.time()),
            }
            client.publish(self.events_channel, json.dumps(start_event))

            # Run async LLM pipeline safely whether inside or outside an existing loop
            try:
                running_loop = asyncio.get_running_loop()
            except RuntimeError:
                running_loop = None

            if running_loop and running_loop.is_running():
                import concurrent.futures
                with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
                    res = pool.submit(
                        asyncio.run,
                        self.pipeline.auto_chunk_and_translate(
                            raw_text=source_text,
                            target_lang=target_language,
                        ),
                    ).result()
            else:
                res = asyncio.run(
                    self.pipeline.auto_chunk_and_translate(
                        raw_text=source_text,
                        target_lang=target_language,
                    )
                )


            chunks_data = [
                {
                    "id": chunk.id,
                    "order": chunk.order,
                    "lang": chunk.lang,
                    "text": chunk.text,
                }
                for chunk in res.chunks
            ]

            complete_event = {
                "event": "TASK_COMPLETED",
                "task_id": task_id,
                "lesson_id": lesson_id,
                "status": "success",
                "timestamp": int(time.time()),
                "result": {
                    "chunks": chunks_data,
                    "formatted_script": res.formatted_script,
                    "word_count": res.word_count,
                    "estimated_duration_sec": res.estimated_duration_sec,
                },
            }
            client.publish(self.events_channel, json.dumps(complete_event))
            logger.info("Successfully completed script parsing task_id='%s' (%d chunks)", task_id, len(chunks_data))

        except Exception as exc:
            logger.exception("Failed to process script parsing task_id='%s': %s", task_id, exc)
            fail_event = {
                "event": "TASK_FAILED",
                "task_id": task_id,
                "lesson_id": lesson_id,
                "status": "failed",
                "timestamp": int(time.time()),
                "error": str(exc),
            }
            try:
                client.publish(self.events_channel, json.dumps(fail_event))
            except Exception as publish_err:
                logger.error("Failed to publish failure event: %s", publish_err)

    def _run_queue_listener(self) -> None:
        """Poll Redis queue via BRPOP in a loop."""
        client = self.get_redis_client()
        while self.running:
            try:
                item = client.brpop(self.queue_name, timeout=1)
                if item:
                    _, raw_data = item
                    self.handle_task_payload(raw_data)
            except redis.ConnectionError:
                time.sleep(2)
            except Exception as e:
                if self.running:
                    logger.warning("Error in script queue listener: %s", e)
                    time.sleep(1)

    def _run_pubsub_listener(self) -> None:
        """Listen to Redis Pub/Sub topic in a loop."""
        while self.running:
            try:
                client = self.get_redis_client()
                pubsub = client.pubsub()
                pubsub.subscribe(self.topic_name)
                for message in pubsub.listen():
                    if not self.running:
                        break
                    if message and message["type"] == "message":
                        raw_data = message["data"]
                        self.handle_task_payload(raw_data)
            except redis.ConnectionError:
                time.sleep(2)
            except Exception as e:
                if self.running:
                    logger.warning("Error in script pubsub listener: %s", e)
                    time.sleep(1)

    def start_background(self) -> None:
        """Start both queue and pubsub listener threads."""
        self.running = True
        logger.info(
            "ScriptWorker starting. Listening on queue '%s' and topic '%s' (Redis: %s)",
            self.queue_name,
            self.topic_name,
            self.redis_addr,
        )
        t_queue = threading.Thread(target=self._run_queue_listener, daemon=True, name="ScriptWorkerQueueThread")
        t_pubsub = threading.Thread(target=self._run_pubsub_listener, daemon=True, name="ScriptWorkerPubSubThread")
        t_queue.start()
        t_pubsub.start()

    def stop(self) -> None:
        """Signal worker threads to stop."""
        self.running = False
        if self.client:
            try:
                self.client.close()
            except Exception:
                pass
