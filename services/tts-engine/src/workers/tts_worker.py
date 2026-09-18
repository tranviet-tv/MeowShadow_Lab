"""Redis queue consumer worker processing TTS_SYNTHESIS jobs asynchronously."""

import asyncio
import json
import logging
from pathlib import Path
import signal
import sys
import time
from typing import Any, Callable, Dict, List, Optional

import redis

from src.config import settings
from src.schemas.tts import (
    TTSChunkRequest,
    BatchTTSRequest,
    BatchTTSResponse,
    TTSClipResult,
)
from src.services.edge_engine import edge_engine
from src.services.kokoro_engine import export_kokoro_engine as kokoro_engine
from src.utils.audio import format_rate

logger = logging.getLogger(__name__)

TTS_SYNTHESIS_QUEUE = "queue:tts_synthesis"
TASK_EVENTS_CHANNEL = "channel:task_events"


class TTSWorker:
    """Worker polling Redis queue for TTS_SYNTHESIS tasks and orchestrating batch generation."""

    def __init__(
        self,
        redis_addr: Optional[str] = None,
        queue_name: str = TTS_SYNTHESIS_QUEUE,
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

    async def execute_batch_with_progress(
        self,
        request: BatchTTSRequest,
        output_dir: Path,
        on_progress: Optional[Callable[[int, int, float], Any]] = None,
    ) -> BatchTTSResponse:
        """
        Execute batch synthesis while tracking and reporting incremental chunk progress.

        :param request: BatchTTSRequest payload.
        :param output_dir: Directory where audio clips will be saved.
        :param on_progress: Callback taking (completed_chunks, total_chunks, percent).
        :return: Completed BatchTTSResponse.
        """
        chunks = request.chunks
        total_chunks = len(chunks)
        completed_count = 0
        concurrency = request.concurrency or settings.concurrency_limit

        output_dir.mkdir(parents=True, exist_ok=True)
        semaphore = asyncio.Semaphore(concurrency)

        # Prepare processed chunks with default voice fallbacks and speed rate
        processed_chunks: List[TTSChunkRequest] = []
        for c in chunks:
            item = c.model_copy()
            if not item.voice_id:
                if item.lang == "vi" and request.default_voice_vi:
                    item.voice_id = request.default_voice_vi
                elif item.lang in ("en", "ja") and request.default_voice_target:
                    item.voice_id = request.default_voice_target

            # Apply speed rate if chunk has specific speed_rate or fallback to request default speed
            if item.speed_rate is not None and item.speed_rate > 0:
                item.rate = format_rate(item.speed_rate)
            elif item.rate in ("+0%", "", None):
                if item.lang == "vi" and request.default_speed_vi is not None:
                    item.rate = format_rate(request.default_speed_vi)
                elif item.lang in ("en", "ja") and request.default_speed_target is not None:
                    item.rate = format_rate(request.default_speed_target)

            processed_chunks.append(item)

        results: List[TTSClipResult] = []

        async def _run_single(chunk: TTSChunkRequest) -> TTSClipResult:
            nonlocal completed_count
            is_kokoro = (
                request.engine == "kokoro"
                or (chunk.voice_id and chunk.voice_id.startswith("kokoro-"))
            )
            engine = kokoro_engine if is_kokoro else edge_engine
            res = await engine._synthesize_chunk_task(
                chunk=chunk,
                output_dir=output_dir,
                semaphore=semaphore,
                use_cache=True,
            )
            completed_count += 1
            if on_progress:
                percent = round((completed_count / total_chunks) * 100, 1)
                try:
                    on_progress(completed_count, total_chunks, percent)
                except Exception as exc:
                    logger.warning("Error in progress callback: %s", exc)
            return res

        tasks = [_run_single(chunk) for chunk in processed_chunks]
        results = await asyncio.gather(*tasks)
        results = list(results)
        results.sort(key=lambda r: r.order)

        successful = [r for r in results if r.error is None]
        total_duration = sum(r.duration_sec for r in successful)
        cache_hits = sum(1 for r in results if r.cached)

        return BatchTTSResponse(
            success=len(successful) == total_chunks,
            lesson_id=request.lesson_id,
            total_chunks=total_chunks,
            successful_chunks=len(successful),
            total_duration_sec=round(total_duration, 2),
            cache_hits=cache_hits,
            clips=results,
        )

    def process_job_payload(
        self,
        raw_data: str,
        on_progress: Optional[Callable[[int, int, float], Any]] = None,
    ) -> Dict[str, Any]:
        """
        Parse and execute a single job from raw JSON string synchronously.

        :param raw_data: Serialized JSON payload matching BatchTTSRequest plus optional task_id.
        :param on_progress: Optional callback function.
        :return: Dict representation of BatchTTSResponse.
        """
        data = json.loads(raw_data)
        request = BatchTTSRequest.model_validate(data)
        output_dir = settings.get_audio_dir() / request.lesson_id

        # Run async pipeline in sync context
        loop = asyncio.new_event_loop()
        try:
            asyncio.set_event_loop(loop)
            response = loop.run_until_complete(
                self.execute_batch_with_progress(
                    request=request,
                    output_dir=output_dir,
                    on_progress=on_progress,
                )
            )
            return response.model_dump()
        finally:
            loop.close()

    def handle_task(self, raw_data: str) -> None:
        """Process job and publish status/progress events to Redis channel."""
        client = self.get_redis_client()
        task_id = "unknown"
        lesson_id = "unknown"

        try:
            peek = json.loads(raw_data)
            task_id = peek.get("task_id", f"task_{int(time.time()*1000)}")
            lesson_id = peek.get("lesson_id", "unknown")

            logger.info("Started processing TTS job task_id='%s' (lesson='%s')", task_id, lesson_id)

            # Publish started notification
            start_event = {
                "event": "TASK_STARTED",
                "task_id": task_id,
                "lesson_id": lesson_id,
                "service": settings.app_name,
                "timestamp": int(time.time()),
            }
            client.publish(self.events_channel, json.dumps(start_event))

            def _publish_progress(completed: int, total: int, percent: float):
                progress_event = {
                    "event": "TASK_PROGRESS",
                    "task_id": task_id,
                    "lesson_id": lesson_id,
                    "completed_chunks": completed,
                    "total_chunks": total,
                    "progress_percent": percent,
                    "timestamp": int(time.time()),
                }
                client.publish(self.events_channel, json.dumps(progress_event))

            result_data = self.process_job_payload(raw_data, on_progress=_publish_progress)

            # Publish completion notification
            complete_event = {
                "event": "TASK_COMPLETED",
                "task_id": task_id,
                "lesson_id": lesson_id,
                "status": "success" if result_data.get("success") else "partial",
                "timestamp": int(time.time()),
                "result": result_data,
            }
            client.publish(self.events_channel, json.dumps(complete_event))
            logger.info("Successfully completed TTS job task_id='%s'", task_id)

        except Exception as exc:
            logger.exception("Failed to process TTS job task_id='%s': %s", task_id, exc)
            fail_event = {
                "event": "TASK_FAILED",
                "task_id": task_id,
                "lesson_id": lesson_id,
                "status": "failed",
                "timestamp": int(time.time()),
                "error": str(exc),
            }
            client.publish(self.events_channel, json.dumps(fail_event))

    def run(self) -> None:
        """Main worker loop polling Redis queue."""
        self.running = True
        logger.info(
            "TTSWorker started. Listening on queue '%s' (Redis: %s)",
            self.queue_name,
            self.redis_addr,
        )

        client = self.get_redis_client()

        while self.running:
            try:
                # Blocking pop with 1 second timeout
                item = client.brpop(self.queue_name, timeout=1)
                if item:
                    _, raw_data = item
                    self.handle_task(raw_data)
            except redis.ConnectionError:
                logger.warning("Lost connection to Redis (%s). Reconnecting in 3s...", self.redis_addr)
                time.sleep(3)
            except Exception as exc:
                logger.error("Unexpected worker loop exception: %s", exc)
                time.sleep(1)

        logger.info("TTSWorker stopped gracefully.")

    def stop(self) -> None:
        """Stop worker loop."""
        self.running = False


# Global singleton instance
tts_worker = TTSWorker()


def main():
    """CLI entrypoint for standalone worker daemon."""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )

    worker = TTSWorker()

    def _signal_handler(signum, frame):
        logger.info("Signal %d received, stopping worker...", signum)
        worker.stop()
        sys.exit(0)

    signal.signal(signal.SIGINT, _signal_handler)
    signal.signal(signal.SIGTERM, _signal_handler)

    worker.run()


if __name__ == "__main__":
    main()
