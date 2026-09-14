package orchestrator_test

import (
	"context"
	"testing"

	"github.com/jackc/pgx/v5/pgtype"
	"meowshadow/gateway-core/internal/domain"
	"meowshadow/gateway-core/internal/orchestrator"
	"meowshadow/gateway-core/internal/repository/db"
)

// MockLessonRepository implements repository.LessonRepository for tests.
type mockLessonRepo struct {
	lastUpdatedStatus string
	lastRenderResult  db.UpdateLessonRenderResultParams
}

func (m *mockLessonRepo) CreateLesson(ctx context.Context, params db.CreateLessonParams) (*db.CreateLessonRow, error) {
	return nil, nil
}
func (m *mockLessonRepo) GetLessonByID(ctx context.Context, id pgtype.UUID) (*db.GetLessonByIDRow, error) {
	return nil, nil
}
func (m *mockLessonRepo) ListLessonsByUserID(ctx context.Context, userID pgtype.UUID, limit, offset int32) ([]db.ListLessonsByUserIDRow, error) {
	return nil, nil
}
func (m *mockLessonRepo) CountLessonsByUserID(ctx context.Context, userID pgtype.UUID) (int64, error) {
	return 0, nil
}
func (m *mockLessonRepo) ListAllLessons(ctx context.Context, limit, offset int32) ([]db.ListAllLessonsRow, error) {
	return nil, nil
}
func (m *mockLessonRepo) CountAllLessons(ctx context.Context) (int64, error) {
	return 0, nil
}
func (m *mockLessonRepo) UpdateLessonStatus(ctx context.Context, id pgtype.UUID, status string) error {
	m.lastUpdatedStatus = status
	return nil
}
func (m *mockLessonRepo) UpdateLessonRenderResult(ctx context.Context, params db.UpdateLessonRenderResultParams) (*db.UpdateLessonRenderResultRow, error) {
	m.lastRenderResult = params
	m.lastUpdatedStatus = params.Status
	return &db.UpdateLessonRenderResultRow{
		ID:            params.ID,
		Status:        params.Status,
		AudioFilePath: params.AudioFilePath,
		SrtFilePath:   params.SrtFilePath,
		DurationSec:   params.DurationSec,
	}, nil
}
func (m *mockLessonRepo) DeleteLesson(ctx context.Context, id pgtype.UUID) error {
	return nil
}
func (m *mockLessonRepo) GetLearningProgress(ctx context.Context, userID, lessonID pgtype.UUID) (*db.GetLearningProgressRow, error) {
	return nil, nil
}
func (m *mockLessonRepo) UpsertLearningProgress(ctx context.Context, params db.UpsertLearningProgressParams) error {
	return nil
}

func TestPipelineConsumer_LifecycleFlow(t *testing.T) {
	mockRepo := &mockLessonRepo{}
	consumer := orchestrator.NewPipelineConsumer(nil, mockRepo)

	job := orchestrator.NewRenderJob(
		"job-test-consumer",
		"a0000000-0000-0000-0000-000000000001",
		"u0000000-0000-0000-0000-000000000001",
		"Test Lesson Flow",
		"en",
		"vi",
		"Sample raw script",
		domain.PacingConfig{},
	)
	consumer.RegisterJob(job)

	ctx := context.Background()

	// 1. Parsing Done -> Transitions to SYNTHESIZING (60%)
	chunks := []domain.ScriptChunk{
		{ID: "c1", Order: 1, Lang: "vi", Text: "Xin chao"},
		{ID: "c2", Order: 2, Lang: "en", Text: "Hello"},
	}
	updatedJob, err := consumer.HandleWorkerEvent(ctx, orchestrator.WorkerEvent{
		JobID:            job.ID,
		LessonID:         job.LessonID,
		Type:             orchestrator.EventParsingDone,
		TranscriptChunks: chunks,
	})
	if err != nil {
		t.Fatalf("failed handling EventParsingDone: %v", err)
	}
	if updatedJob.GetState() != orchestrator.StateSynthesizing || updatedJob.GetProgress() != 60 {
		t.Fatalf("expected SYNTHESIZING (60%%), got %s (%d%%)", updatedJob.GetState(), updatedJob.GetProgress())
	}

	// 2. TTS Done -> Transitions to MASTERING (90%)
	audioClips := []string{"/storage/cache/c1.mp3", "/storage/cache/c2.mp3"}
	updatedJob, err = consumer.HandleWorkerEvent(ctx, orchestrator.WorkerEvent{
		JobID:          job.ID,
		LessonID:       job.LessonID,
		Type:           orchestrator.EventTtsDone,
		AudioClipPaths: audioClips,
	})
	if err != nil {
		t.Fatalf("failed handling EventTtsDone: %v", err)
	}
	if updatedJob.GetState() != orchestrator.StateMastering || updatedJob.GetProgress() != 90 {
		t.Fatalf("expected MASTERING (90%%), got %s (%d%%)", updatedJob.GetState(), updatedJob.GetProgress())
	}

	// 3. Mastering Done -> Transitions to READY (100%) and updates DB
	finalAudio := "/storage/audio/lesson_final.mp3"
	finalSrt := "/storage/audio/lesson_final.srt"
	updatedJob, err = consumer.HandleWorkerEvent(ctx, orchestrator.WorkerEvent{
		JobID:         job.ID,
		LessonID:      job.LessonID,
		Type:          orchestrator.EventMasteringDone,
		AudioFilePath: finalAudio,
		SrtFilePath:   finalSrt,
		DurationSec:   42.5,
		TotalWords:    2,
	})
	if err != nil {
		t.Fatalf("failed handling EventMasteringDone: %v", err)
	}
	if updatedJob.GetState() != orchestrator.StateReady || updatedJob.GetProgress() != 100 {
		t.Fatalf("expected READY (100%%), got %s (%d%%)", updatedJob.GetState(), updatedJob.GetProgress())
	}

	// Check DB update call
	if mockRepo.lastUpdatedStatus != "READY" {
		t.Fatalf("expected mockRepo status READY, got %s", mockRepo.lastUpdatedStatus)
	}
	if mockRepo.lastRenderResult.AudioFilePath != finalAudio || mockRepo.lastRenderResult.SrtFilePath != finalSrt {
		t.Fatalf("expected audio and srt paths updated correctly")
	}
}

func TestPipelineConsumer_WorkerFailure(t *testing.T) {
	mockRepo := &mockLessonRepo{}
	consumer := orchestrator.NewPipelineConsumer(nil, mockRepo)

	job := orchestrator.NewRenderJob(
		"job-test-fail",
		"b0000000-0000-0000-0000-000000000001",
		"u0000000-0000-0000-0000-000000000001",
		"Test Failure Lesson",
		"en",
		"vi",
		"Sample text",
		domain.PacingConfig{},
	)
	consumer.RegisterJob(job)

	ctx := context.Background()
	errMsg := "GPU out of memory on TTS node"

	updatedJob, err := consumer.HandleWorkerEvent(ctx, orchestrator.WorkerEvent{
		JobID:        job.ID,
		LessonID:     job.LessonID,
		Type:         orchestrator.EventWorkerFailed,
		ErrorMessage: errMsg,
	})
	if err != nil {
		t.Fatalf("unexpected error handling EventWorkerFailed: %v", err)
	}

	if updatedJob.GetState() != orchestrator.StateFailed {
		t.Fatalf("expected job state FAILED, got %s", updatedJob.GetState())
	}
	if mockRepo.lastUpdatedStatus != "FAILED" {
		t.Fatalf("expected mockRepo status updated to FAILED, got %s", mockRepo.lastUpdatedStatus)
	}
}
