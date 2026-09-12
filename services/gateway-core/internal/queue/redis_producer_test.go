package queue_test

import (
	"context"
	"testing"
	"time"

	"meowshadow/gateway-core/internal/domain"
	"meowshadow/gateway-core/internal/orchestrator"
	"meowshadow/gateway-core/internal/queue"
)

func TestRedisProducer_IntegrationOrSkip(t *testing.T) {
	client := queue.NewRedisClient("localhost:6379")
	defer client.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	if err := client.Ping(ctx).Err(); err != nil {
		t.Skipf("Skipping Redis integration test; local Redis not reachable: %v", err)
	}

	producer := queue.NewRedisProducer(client)

	// 1. Test Ping
	if err := producer.Ping(ctx); err != nil {
		t.Fatalf("expected ping to succeed: %v", err)
	}

	// 2. Test SaveJobState and GetJobState
	job := orchestrator.NewRenderJob(
		"test-job-producer-1",
		"lesson-abc",
		"user-xyz",
		"Producer Test Title",
		"en",
		"vi",
		"Test raw script content",
		domain.PacingConfig{
			ViVoice:           "vi-VN-HoaiMyNeural",
			TargetVoice:       "en-US-JennyNeural",
			SilenceAfterViSec: 1.5,
		},
	)

	_ = job.TransitionTo(orchestrator.StateParsing, "")

	if err := producer.SaveJobState(ctx, job, 5*time.Minute); err != nil {
		t.Fatalf("failed to save job state: %v", err)
	}

	retrieved, err := producer.GetJobState(ctx, job.ID)
	if err != nil {
		t.Fatalf("failed to retrieve job state: %v", err)
	}

	if retrieved.ID != job.ID {
		t.Fatalf("expected job ID %s, got %s", job.ID, retrieved.ID)
	}
	if retrieved.CurrentState != orchestrator.StateParsing {
		t.Fatalf("expected state PARSING, got %s", retrieved.CurrentState)
	}
	if retrieved.ProgressPercent != 15 {
		t.Fatalf("expected progress 15, got %d", retrieved.ProgressPercent)
	}

	// 3. Test PublishEvent
	event := map[string]interface{}{
		"job_id":   job.ID,
		"status":   "PARSING",
		"progress": 15,
	}
	if err := producer.PublishEvent(ctx, queue.TopicProgressEvents, event); err != nil {
		t.Fatalf("failed to publish progress event: %v", err)
	}

	// 4. Test DispatchToStream
	streamValues := map[string]interface{}{
		"job_id":  job.ID,
		"payload": "script text for worker",
	}
	entryID, err := producer.DispatchToStream(ctx, queue.StreamScriptParse, streamValues)
	if err != nil {
		t.Fatalf("failed to dispatch to stream: %v", err)
	}
	if entryID == "" {
		t.Fatalf("expected non-empty stream entry ID")
	}
}
