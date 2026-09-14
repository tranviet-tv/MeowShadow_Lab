package tests

import (
	"context"
	"encoding/json"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/redis/go-redis/v9"
	"meowshadow/gateway-core/internal/domain"
	"meowshadow/gateway-core/internal/notifications"
	"meowshadow/gateway-core/internal/orchestrator"
	"meowshadow/gateway-core/internal/queue"
	"meowshadow/gateway-core/internal/repository/db"
	"meowshadow/gateway-core/internal/websocket"
)

// Mock repos for end-to-end integration verification.
type mockPipelineLessonRepo struct {
	updatedStatus string
	updatedParams db.UpdateLessonRenderResultParams
}

func (m *mockPipelineLessonRepo) CreateLesson(ctx context.Context, params db.CreateLessonParams) (*db.CreateLessonRow, error) {
	return nil, nil
}
func (m *mockPipelineLessonRepo) GetLessonByID(ctx context.Context, id pgtype.UUID) (*db.GetLessonByIDRow, error) {
	return nil, nil
}
func (m *mockPipelineLessonRepo) ListLessonsByUserID(ctx context.Context, userID pgtype.UUID, limit, offset int32) ([]db.ListLessonsByUserIDRow, error) {
	return nil, nil
}
func (m *mockPipelineLessonRepo) CountLessonsByUserID(ctx context.Context, userID pgtype.UUID) (int64, error) {
	return 0, nil
}
func (m *mockPipelineLessonRepo) ListAllLessons(ctx context.Context, limit, offset int32) ([]db.ListAllLessonsRow, error) {
	return nil, nil
}
func (m *mockPipelineLessonRepo) CountAllLessons(ctx context.Context) (int64, error) {
	return 0, nil
}
func (m *mockPipelineLessonRepo) UpdateLessonStatus(ctx context.Context, id pgtype.UUID, status string) error {
	m.updatedStatus = status
	return nil
}
func (m *mockPipelineLessonRepo) UpdateLessonRenderResult(ctx context.Context, params db.UpdateLessonRenderResultParams) (*db.UpdateLessonRenderResultRow, error) {
	m.updatedParams = params
	m.updatedStatus = params.Status
	return &db.UpdateLessonRenderResultRow{
		ID:            params.ID,
		Status:        params.Status,
		AudioFilePath: params.AudioFilePath,
		SrtFilePath:   params.SrtFilePath,
		DurationSec:   params.DurationSec,
	}, nil
}
func (m *mockPipelineLessonRepo) DeleteLesson(ctx context.Context, id pgtype.UUID) error {
	return nil
}
func (m *mockPipelineLessonRepo) GetLearningProgress(ctx context.Context, userID, lessonID pgtype.UUID) (*db.GetLearningProgressRow, error) {
	return nil, nil
}
func (m *mockPipelineLessonRepo) UpsertLearningProgress(ctx context.Context, params db.UpsertLearningProgressParams) error {
	return nil
}

type mockPipelineUserRepo struct {
	devices []db.UserDevice
}

func (m *mockPipelineUserRepo) CreateUser(ctx context.Context, email, passwordHash, fullName string) (*db.CreateUserRow, error) {
	return nil, nil
}
func (m *mockPipelineUserRepo) GetUserByEmail(ctx context.Context, email string) (*db.User, error) {
	return nil, nil
}
func (m *mockPipelineUserRepo) GetUserByID(ctx context.Context, id pgtype.UUID) (*db.User, error) {
	return nil, nil
}
func (m *mockPipelineUserRepo) ListDevicesByUserID(ctx context.Context, userID pgtype.UUID) ([]db.UserDevice, error) {
	return m.devices, nil
}
func (m *mockPipelineUserRepo) UpsertUserDevice(ctx context.Context, userID pgtype.UUID, deviceType, pushToken string) error {
	return nil
}

// In-memory producer bridging pipeline consumer events directly to WebSocket hub
type bridgeProducer struct {
	hub *websocket.Hub
}

func (b *bridgeProducer) PublishEvent(ctx context.Context, channel string, payload interface{}) error {
	if channel == queue.TopicProgressEvents {
		bytes, _ := json.Marshal(payload)
		var ev orchestrator.ProgressBroadcastEvent
		_ = json.Unmarshal(bytes, &ev)
		b.hub.BroadcastProgress(ev)
	}
	return nil
}
func (b *bridgeProducer) DispatchToStream(ctx context.Context, stream string, values map[string]interface{}) (string, error) {
	return "stream-entry-1", nil
}
func (b *bridgeProducer) SaveJobState(ctx context.Context, jobID string, payload interface{}, ttl time.Duration) error {
	return nil
}
func (b *bridgeProducer) GetJobState(ctx context.Context, jobID string) ([]byte, error) {
	return nil, nil
}
func (b *bridgeProducer) Ping(ctx context.Context) error {
	return nil
}
func (b *bridgeProducer) Close() error {
	return nil
}
func (b *bridgeProducer) PushToQueue(ctx context.Context, queueName string, payload interface{}) error {
	return nil
}
func (b *bridgeProducer) Subscribe(ctx context.Context, channels ...string) *redis.PubSub {
	return nil
}
func (b *bridgeProducer) GetClient() *redis.Client {
	return nil
}

// TestSprint8_DoD_FullRenderPipeline verifies Definition of Done:
// Events: 15% (Parsed) -> 60% (TTS Done) -> 90% (Mastered) -> 100% (Completed) via WebSocket,
// DB updated to READY, and Push notification dispatched.
func TestSprint8_DoD_FullRenderPipeline(t *testing.T) {
	ctx := context.Background()

	// 1. Setup Hub, Repos, PushDispatcher, Bridge Producer, Consumer
	hub := websocket.NewHub()
	go hub.Run()
	defer hub.Close()

	lessonRepo := &mockPipelineLessonRepo{}

	userUUID := uuid.New()
	var pgUserUUID pgtype.UUID
	copy(pgUserUUID.Bytes[:], userUUID[:])
	pgUserUUID.Valid = true

	userRepo := &mockPipelineUserRepo{
		devices: []db.UserDevice{
			{ID: pgUserUUID, UserID: pgUserUUID, DeviceType: "ios", PushToken: "test_ios_token"},
		},
	}
	pushProvider := notifications.NewMockPushProvider()
	pushDispatcher := notifications.NewPushDispatcher(userRepo, pushProvider)

	producer := &bridgeProducer{hub: hub}
	consumer := orchestrator.NewPipelineConsumer(producer, lessonRepo)

	// 2. Client connects to WebSocket hub subscribing to target job
	jobID := "dod-job-uuid-1234"
	lessonID := uuid.New().String()
	wsClient := &websocket.Client{
		Hub:   hub,
		Send:  make(chan []byte, 20),
		JobID: jobID,
	}
	hub.Register(wsClient)
	time.Sleep(20 * time.Millisecond)

	// 3. Initiate job in PENDING (0%)
	job := orchestrator.NewRenderJob(
		jobID,
		lessonID,
		userUUID.String(),
		"Bài 01: Sức mạnh của sự kiên trì",
		"en",
		"vi",
		"Kiên trì là bí quyết lớn nhất của mọi thành công.",
		domain.PacingConfig{
			ViVoice:           "vi-VN-HoaiMyNeural",
			TargetVoice:       "en-US-JennyNeural",
			SilenceAfterViSec: 1.5,
		},
	)
	consumer.RegisterJob(job)

	// 4. Trigger Stage 1: Parsing Done -> Progress 60% (SYNTHESIZING)
	parsedChunks := []domain.ScriptChunk{
		{ID: "c1", Order: 1, Lang: "vi", Text: "Kiên trì là bí quyết lớn nhất của mọi thành công."},
		{ID: "c2", Order: 2, Lang: "en", Text: "Persistence is the greatest secret of all success."},
	}
	_, err := consumer.HandleWorkerEvent(ctx, orchestrator.WorkerEvent{
		JobID:            jobID,
		LessonID:         lessonID,
		Type:             orchestrator.EventParsingDone,
		TranscriptChunks: parsedChunks,
	})
	if err != nil {
		t.Fatalf("failed handling EventParsingDone: %v", err)
	}

	// Verify WebSocket received Synthesizing event (60%)
	select {
	case msg := <-wsClient.Send:
		var ev orchestrator.ProgressBroadcastEvent
		_ = json.Unmarshal(msg, &ev)
		if ev.Status != orchestrator.StateSynthesizing || ev.Progress != 60 {
			t.Fatalf("expected progress 60%% SYNTHESIZING, got %d%% %s", ev.Progress, ev.Status)
		}
	case <-time.After(500 * time.Millisecond):
		t.Fatalf("timed out waiting for 60%% progress event")
	}

	// 5. Trigger Stage 2: TTS Done -> Progress 90% (MASTERING)
	clips := []string{"/storage/cache/c1.mp3", "/storage/cache/c2.mp3"}
	_, err = consumer.HandleWorkerEvent(ctx, orchestrator.WorkerEvent{
		JobID:          jobID,
		LessonID:       lessonID,
		Type:           orchestrator.EventTtsDone,
		AudioClipPaths: clips,
	})
	if err != nil {
		t.Fatalf("failed handling EventTtsDone: %v", err)
	}

	// Verify WebSocket received Mastering event (90%)
	select {
	case msg := <-wsClient.Send:
		var ev orchestrator.ProgressBroadcastEvent
		_ = json.Unmarshal(msg, &ev)
		if ev.Status != orchestrator.StateMastering || ev.Progress != 90 {
			t.Fatalf("expected progress 90%% MASTERING, got %d%% %s", ev.Progress, ev.Status)
		}
	case <-time.After(500 * time.Millisecond):
		t.Fatalf("timed out waiting for 90%% progress event")
	}

	// 6. Trigger Stage 3: Mastering Done -> Progress 100% (READY)
	finalMP3 := "/storage/audio/lesson_persistence.mp3"
	finalSRT := "/storage/audio/lesson_persistence.srt"
	_, err = consumer.HandleWorkerEvent(ctx, orchestrator.WorkerEvent{
		JobID:         jobID,
		LessonID:      lessonID,
		Type:          orchestrator.EventMasteringDone,
		AudioFilePath: finalMP3,
		SrtFilePath:   finalSRT,
		DurationSec:   65.0,
		TotalWords:    45,
	})
	if err != nil {
		t.Fatalf("failed handling EventMasteringDone: %v", err)
	}

	// Verify WebSocket received Completed event (100% READY)
	select {
	case msg := <-wsClient.Send:
		var ev orchestrator.ProgressBroadcastEvent
		_ = json.Unmarshal(msg, &ev)
		if ev.Status != orchestrator.StateReady || ev.Progress != 100 {
			t.Fatalf("expected progress 100%% READY, got %d%% %s", ev.Progress, ev.Status)
		}
		if ev.AudioFilePath != finalMP3 || ev.SrtFilePath != finalSRT {
			t.Fatalf("expected audio & srt paths in final event")
		}
	case <-time.After(500 * time.Millisecond):
		t.Fatalf("timed out waiting for 100%% progress event")
	}

	// 7. Verify Database record updated with status READY and paths
	if lessonRepo.updatedStatus != "READY" {
		t.Fatalf("expected database status READY, got %s", lessonRepo.updatedStatus)
	}
	if lessonRepo.updatedParams.AudioFilePath != finalMP3 || lessonRepo.updatedParams.SrtFilePath != finalSRT {
		t.Fatalf("expected database audio & srt paths updated correctly")
	}

	// 8. Dispatch Push Notification upon completion
	dispatchRes, err := pushDispatcher.DispatchLessonCompleted(ctx, userUUID.String(), lessonID, job.Title)
	if err != nil {
		t.Fatalf("push dispatch failed: %v", err)
	}
	if len(dispatchRes) != 1 || !dispatchRes[0].Success {
		t.Fatalf("expected 1 successful push delivery")
	}
	if pushProvider.GetSentCount() != 1 {
		t.Fatalf("expected push provider sent count 1, got %d", pushProvider.GetSentCount())
	}
}

// TestSprint8_DoD_WorkerFailure verifies automatic failure catching and marking FAILED.
func TestSprint8_DoD_WorkerFailure(t *testing.T) {
	ctx := context.Background()

	hub := websocket.NewHub()
	go hub.Run()
	defer hub.Close()

	lessonRepo := &mockPipelineLessonRepo{}
	producer := &bridgeProducer{hub: hub}
	consumer := orchestrator.NewPipelineConsumer(producer, lessonRepo)

	jobID := "dod-job-fail-1234"
	lessonID := uuid.New().String()

	wsClient := &websocket.Client{
		Hub:   hub,
		Send:  make(chan []byte, 10),
		JobID: jobID,
	}
	hub.Register(wsClient)
	time.Sleep(20 * time.Millisecond)

	job := orchestrator.NewRenderJob(
		jobID,
		lessonID,
		"user-111",
		"Test Abrupt Crash",
		"en",
		"vi",
		"Sample text",
		domain.PacingConfig{},
	)
	consumer.RegisterJob(job)

	// Simulate unexpected worker disconnection
	crashMsg := "Python Worker container disconnected abruptly (SIGKILL / OOM)"
	_, err := consumer.HandleWorkerEvent(ctx, orchestrator.WorkerEvent{
		JobID:        jobID,
		LessonID:     lessonID,
		Type:         orchestrator.EventWorkerFailed,
		ErrorMessage: crashMsg,
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// 1. Verify WebSocket received FAILED event
	select {
	case msg := <-wsClient.Send:
		var ev orchestrator.ProgressBroadcastEvent
		_ = json.Unmarshal(msg, &ev)
		if ev.Status != orchestrator.StateFailed {
			t.Fatalf("expected status FAILED, got %s", ev.Status)
		}
	case <-time.After(500 * time.Millisecond):
		t.Fatalf("timed out waiting for FAILED progress event")
	}

	// 2. Verify Database updated to FAILED
	if lessonRepo.updatedStatus != "FAILED" {
		t.Fatalf("expected database status FAILED, got %s", lessonRepo.updatedStatus)
	}
}
