package websocket_test

import (
	"encoding/json"
	"testing"
	"time"

	"meowshadow/gateway-core/internal/orchestrator"
	"meowshadow/gateway-core/internal/websocket"
)

func TestHub_RegisterAndBroadcastProgress(t *testing.T) {
	hub := websocket.NewHub()
	go hub.Run()
	defer hub.Close()

	// Create client 1 subscribed to job-100
	client1 := &websocket.Client{
		Hub:   hub,
		Send:  make(chan []byte, 10),
		JobID: "job-100",
	}

	// Create client 2 subscribed to job-200
	client2 := &websocket.Client{
		Hub:   hub,
		Send:  make(chan []byte, 10),
		JobID: "job-200",
	}

	// Create client 3 global observer (no filter)
	client3 := &websocket.Client{
		Hub:  hub,
		Send: make(chan []byte, 10),
	}

	hub.Register(client1)
	hub.Register(client2)
	hub.Register(client3)

	// Wait for registration processing
	time.Sleep(20 * time.Millisecond)

	if hub.ClientCount() != 3 {
		t.Fatalf("expected 3 clients, got %d", hub.ClientCount())
	}
	if hub.SubscribedClientCount("job-100") != 1 {
		t.Fatalf("expected 1 subscriber for job-100, got %d", hub.SubscribedClientCount("job-100"))
	}

	// Broadcast progress event for job-100
	event := orchestrator.ProgressBroadcastEvent{
		JobID:                 "job-100",
		LessonID:              "lesson-100",
		Status:                orchestrator.StateSynthesizing,
		Progress:              60,
		EstimatedRemainingSec: 12.5,
		Message:               "Synthesizing voice clips",
		Timestamp:             time.Now().UTC(),
	}

	hub.BroadcastProgress(event)

	// Client 1 should receive it
	select {
	case msg := <-client1.Send:
		var received orchestrator.ProgressBroadcastEvent
		if err := json.Unmarshal(msg, &received); err != nil {
			t.Fatalf("failed to unmarshal client1 message: %v", err)
		}
		if received.JobID != "job-100" || received.Progress != 60 {
			t.Fatalf("client1 received unexpected event: %+v", received)
		}
	case <-time.After(500 * time.Millisecond):
		t.Fatalf("client1 timed out waiting for progress message")
	}

	// Client 3 (global observer) should receive it
	select {
	case msg := <-client3.Send:
		var received orchestrator.ProgressBroadcastEvent
		if err := json.Unmarshal(msg, &received); err != nil {
			t.Fatalf("failed to unmarshal client3 message: %v", err)
		}
		if received.JobID != "job-100" {
			t.Fatalf("client3 received unexpected event: %+v", received)
		}
	case <-time.After(500 * time.Millisecond):
		t.Fatalf("client3 timed out waiting for progress message")
	}

	// Client 2 (subscribed to job-200) should NOT receive it
	select {
	case msg := <-client2.Send:
		t.Fatalf("client2 received unexpected message: %s", string(msg))
	default:
		// Expected: no message for client2
	}

	// Unregister client 1
	hub.Unregister(client1)
	time.Sleep(20 * time.Millisecond)

	if hub.ClientCount() != 2 {
		t.Fatalf("expected 2 clients after unregister, got %d", hub.ClientCount())
	}
	if hub.SubscribedClientCount("job-100") != 0 {
		t.Fatalf("expected 0 subscribers for job-100, got %d", hub.SubscribedClientCount("job-100"))
	}
}
