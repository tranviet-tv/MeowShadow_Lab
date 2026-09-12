package orchestrator_test

import (
	"testing"

	"meowshadow/gateway-core/internal/domain"
	"meowshadow/gateway-core/internal/orchestrator"
)

func TestRenderJob_StateTransitions(t *testing.T) {
	pacing := domain.PacingConfig{
		ViVoice:               "vi-VN-HoaiMyNeural",
		TargetVoice:           "en-US-JennyNeural",
		SilenceAfterViSec:     1.5,
		SilenceAfterTargetSec: 3.5,
	}

	job := orchestrator.NewRenderJob(
		"job-100",
		"lesson-200",
		"user-300",
		"Test Lesson Title",
		"en",
		"vi",
		"Xin chao the gioi",
		pacing,
	)

	if job.GetState() != orchestrator.StatePending {
		t.Fatalf("expected initial state PENDING, got %s", job.GetState())
	}
	if job.GetProgress() != 0 {
		t.Fatalf("expected initial progress 0, got %d", job.GetProgress())
	}
	if job.IsTerminal() {
		t.Fatalf("job should not be terminal initially")
	}

	// 1. Transition PENDING -> PARSING (15%)
	if err := job.TransitionTo(orchestrator.StateParsing, ""); err != nil {
		t.Fatalf("failed transition to PARSING: %v", err)
	}
	if job.GetState() != orchestrator.StateParsing || job.GetProgress() != 15 {
		t.Fatalf("expected PARSING (15%%), got %s (%d%%)", job.GetState(), job.GetProgress())
	}

	// 2. Transition PARSING -> SYNTHESIZING (60%)
	if err := job.TransitionTo(orchestrator.StateSynthesizing, ""); err != nil {
		t.Fatalf("failed transition to SYNTHESIZING: %v", err)
	}
	if job.GetState() != orchestrator.StateSynthesizing || job.GetProgress() != 60 {
		t.Fatalf("expected SYNTHESIZING (60%%), got %s (%d%%)", job.GetState(), job.GetProgress())
	}

	// 3. Transition SYNTHESIZING -> MASTERING (90%)
	if err := job.TransitionTo(orchestrator.StateMastering, ""); err != nil {
		t.Fatalf("failed transition to MASTERING: %v", err)
	}
	if job.GetState() != orchestrator.StateMastering || job.GetProgress() != 90 {
		t.Fatalf("expected MASTERING (90%%), got %s (%d%%)", job.GetState(), job.GetProgress())
	}

	// 4. Transition MASTERING -> READY (100%)
	if err := job.TransitionTo(orchestrator.StateReady, ""); err != nil {
		t.Fatalf("failed transition to READY: %v", err)
	}
	if job.GetState() != orchestrator.StateReady || job.GetProgress() != 100 {
		t.Fatalf("expected READY (100%%), got %s (%d%%)", job.GetState(), job.GetProgress())
	}
	if !job.IsTerminal() {
		t.Fatalf("job should be terminal when READY")
	}

	// 5. Cannot transition from terminal state READY
	if err := job.TransitionTo(orchestrator.StateFailed, "test error"); err == nil {
		t.Fatalf("expected error when transitioning from terminal READY state")
	}
}

func TestRenderJob_InvalidTransitions(t *testing.T) {
	job := orchestrator.NewRenderJob(
		"job-101",
		"lesson-201",
		"user-301",
		"Invalid Transition Test",
		"en",
		"vi",
		"Sample text",
		domain.PacingConfig{},
	)

	// Direct jump PENDING -> MASTERING is forbidden
	if err := job.TransitionTo(orchestrator.StateMastering, ""); err == nil {
		t.Fatalf("expected error jumping from PENDING directly to MASTERING")
	}

	// Direct jump PENDING -> READY is forbidden
	if err := job.TransitionTo(orchestrator.StateReady, ""); err == nil {
		t.Fatalf("expected error jumping from PENDING directly to READY")
	}
}

func TestRenderJob_TransitionToFailed(t *testing.T) {
	job := orchestrator.NewRenderJob(
		"job-102",
		"lesson-202",
		"user-302",
		"Failure Test",
		"en",
		"vi",
		"Sample text",
		domain.PacingConfig{},
	)

	// PENDING -> PARSING
	_ = job.TransitionTo(orchestrator.StateParsing, "")

	// Worker error during PARSING -> FAILED
	errMsg := "Ollama service connection refused"
	if err := job.TransitionTo(orchestrator.StateFailed, errMsg); err != nil {
		t.Fatalf("failed to transition to FAILED: %v", err)
	}

	if job.GetState() != orchestrator.StateFailed {
		t.Fatalf("expected state FAILED, got %s", job.GetState())
	}
	if !job.IsTerminal() {
		t.Fatalf("job should be terminal when FAILED")
	}

	snap := job.GetSnapshot()
	if snap.ErrorMessage != errMsg {
		t.Fatalf("expected error message '%s', got '%s'", errMsg, snap.ErrorMessage)
	}

	// Cannot transition further from FAILED
	if err := job.TransitionTo(orchestrator.StateParsing, ""); err == nil {
		t.Fatalf("expected error when transitioning out of FAILED")
	}
}
