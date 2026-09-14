// Package orchestrator handles worker completion events, state advancement,
// and database synchronization for rendered lessons.
package orchestrator

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"meowshadow/gateway-core/internal/domain"
	"meowshadow/gateway-core/internal/queue"
	"meowshadow/gateway-core/internal/repository"
	"meowshadow/gateway-core/internal/repository/db"
)

// WorkerEventType defines types of completion/failure events produced by Python workers.
type WorkerEventType string

const (
	EventParsingDone   WorkerEventType = "PARSING_DONE"
	EventTtsDone       WorkerEventType = "TTS_DONE"
	EventMasteringDone WorkerEventType = "MASTERING_DONE"
	EventWorkerFailed  WorkerEventType = "WORKER_FAILED"
)

// WorkerEvent holds structured event data reported back from microservice workers.
type WorkerEvent struct {
	JobID            string                 `json:"job_id"`
	TaskID           string                 `json:"task_id,omitempty"`
	LessonID         string                 `json:"lesson_id"`
	Type             WorkerEventType        `json:"type"`
	Event            string                 `json:"event,omitempty"`
	TranscriptChunks []domain.ScriptChunk   `json:"transcript_chunks,omitempty"`
	AudioClipPaths   []string               `json:"audio_clip_paths,omitempty"`
	AudioFilePath    string                 `json:"audio_file_path,omitempty"`
	SrtFilePath      string                 `json:"srt_file_path,omitempty"`
	DurationSec      float64                `json:"duration_sec,omitempty"`
	TotalWords       int                    `json:"total_words,omitempty"`
	ErrorMessage     string                 `json:"error_message,omitempty"`
	Error            string                 `json:"error,omitempty"`
	Result           map[string]interface{} `json:"result,omitempty"`
}

// ProgressBroadcastEvent represents a real-time event sent across the system.
type ProgressBroadcastEvent struct {
	JobID                 string    `json:"job_id"`
	LessonID              string    `json:"lesson_id"`
	Status                JobState  `json:"status"`
	Progress              int       `json:"progress"`
	EstimatedRemainingSec float64   `json:"estimated_remaining_sec"`
	Message               string    `json:"message"`
	AudioFilePath         string    `json:"audio_file_path,omitempty"`
	SrtFilePath           string    `json:"srt_file_path,omitempty"`
	Timestamp             time.Time `json:"timestamp"`
}

var (
	ErrJobNotFound = errors.New("render job not found")
)

// PipelineConsumer orchestrates worker responses and advances the pipeline.
type PipelineConsumer interface {
	RegisterJob(job *RenderJob)
	StartPipeline(ctx context.Context, job *RenderJob) error
	GetJob(jobID string) (*RenderJob, error)
	HandleWorkerEvent(ctx context.Context, event WorkerEvent) (*RenderJob, error)
}

type pipelineConsumer struct {
	mu         sync.RWMutex
	jobs       map[string]*RenderJob
	producer   queue.RedisProducer
	lessonRepo repository.LessonRepository
}

// NewPipelineConsumer initializes a PipelineConsumer with Redis and DB repository access.
func NewPipelineConsumer(producer queue.RedisProducer, lessonRepo repository.LessonRepository) PipelineConsumer {
	return &pipelineConsumer{
		jobs:       make(map[string]*RenderJob),
		producer:   producer,
		lessonRepo: lessonRepo,
	}
}

// RegisterJob adds a newly created RenderJob to the consumer cache.
func (c *pipelineConsumer) RegisterJob(job *RenderJob) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.jobs[job.ID] = job
}

// StartPipeline initiates execution for a new render job across microservices.
func (c *pipelineConsumer) StartPipeline(ctx context.Context, job *RenderJob) error {
	c.RegisterJob(job)
	if c.producer != nil {
		_ = c.producer.SaveJobState(ctx, job.ID, job.GetSnapshot(), 24*time.Hour)
		c.broadcastProgress(ctx, job)
	}

	// If transcript chunks are already provided (e.g. from studio editor), advance directly to TTS synthesis
	if len(job.TranscriptChunks) > 0 {
		if err := job.TransitionTo(StateSynthesizing, ""); err != nil {
			return err
		}
		if c.producer != nil {
			ttsPayload := map[string]interface{}{
				"lesson_id":            job.LessonID,
				"task_id":              job.ID,
				"chunks":               job.TranscriptChunks,
				"default_voice_vi":     job.PacingConfig.ViVoice,
				"default_voice_target": job.PacingConfig.TargetVoice,
			}
			_ = c.producer.PushToQueue(ctx, queue.QueueTtsSynthesis, ttsPayload)
			_ = c.producer.PublishEvent(ctx, queue.TopicTtsSynthesize, ttsPayload)
			_ = c.producer.SaveJobState(ctx, job.ID, job.GetSnapshot(), 24*time.Hour)
			c.broadcastProgress(ctx, job)
		}
		return nil
	}

	// Otherwise dispatch raw text to script-llm parsing
	if c.producer != nil {
		_ = job.TransitionTo(StateParsing, "")
		parsePayload := map[string]interface{}{
			"job_id":          job.ID,
			"task_id":         job.ID,
			"lesson_id":       job.LessonID,
			"source_text":     job.RawText,
			"target_language": job.TargetLanguage,
		}
		_ = c.producer.PublishEvent(ctx, queue.TopicScriptParse, parsePayload)
		_ = c.producer.SaveJobState(ctx, job.ID, job.GetSnapshot(), 24*time.Hour)
		c.broadcastProgress(ctx, job)
	}

	return nil
}

// GetJob returns a RenderJob by its jobID.
func (c *pipelineConsumer) GetJob(jobID string) (*RenderJob, error) {
	c.mu.RLock()
	job, exists := c.jobs[jobID]
	c.mu.RUnlock()

	if exists {
		return job, nil
	}

	// Fallback check in Redis if producer is configured
	if c.producer != nil {
		data, err := c.producer.GetJobState(context.Background(), jobID)
		if err == nil && len(data) > 0 {
			var redisJob RenderJob
			if err := json.Unmarshal(data, &redisJob); err == nil {
				c.RegisterJob(&redisJob)
				return &redisJob, nil
			}
		}
	}

	return nil, ErrJobNotFound
}

// HandleWorkerEvent processes an incoming event from a Python worker and advances the pipeline.
func (c *pipelineConsumer) HandleWorkerEvent(ctx context.Context, event WorkerEvent) (*RenderJob, error) {
	// Normalize task_id to job_id
	if event.JobID == "" && event.TaskID != "" {
		event.JobID = event.TaskID
	}

	job, err := c.GetJob(event.JobID)
	if err != nil {
		return nil, fmt.Errorf("cannot process event: %w", err)
	}

	// Normalize Python worker events if generic TASK_COMPLETED was published
	if event.Type == "" && event.Event != "" {
		switch event.Event {
		case "TASK_COMPLETED":
			if event.Result != nil {
				if _, ok := event.Result["audio_path"]; ok {
					event.Type = EventMasteringDone
				} else if _, ok := event.Result["clips"]; ok {
					event.Type = EventTtsDone
				}
			}
		case "TASK_FAILED":
			event.Type = EventWorkerFailed
		}
	}

	// Extract nested result dictionary fields produced by Python workers
	if event.Result != nil {
		if p, ok := event.Result["audio_path"].(string); ok && event.AudioFilePath == "" {
			event.AudioFilePath = p
		}
		if p, ok := event.Result["audio_file_path"].(string); ok && event.AudioFilePath == "" {
			event.AudioFilePath = p
		}
		if p, ok := event.Result["srt_path"].(string); ok && event.SrtFilePath == "" {
			event.SrtFilePath = p
		}
		if p, ok := event.Result["srt_file_path"].(string); ok && event.SrtFilePath == "" {
			event.SrtFilePath = p
		}
		if d, ok := event.Result["duration_sec"].(float64); ok && event.DurationSec == 0 {
			event.DurationSec = d
		}
		if clips, ok := event.Result["clips"].([]interface{}); ok && len(event.AudioClipPaths) == 0 {
			for _, item := range clips {
				if clipMap, ok := item.(map[string]interface{}); ok {
					if fp, ok := clipMap["file_path"].(string); ok {
						event.AudioClipPaths = append(event.AudioClipPaths, fp)
					}
				}
			}
		}
	}
	if event.ErrorMessage == "" && event.Error != "" {
		event.ErrorMessage = event.Error
	}

	switch event.Type {
	case EventParsingDone:
		// Advance PENDING/PARSING -> SYNTHESIZING (60%)
		if job.GetState() == StatePending {
			_ = job.TransitionTo(StateParsing, "")
		}
		if err := job.TransitionTo(StateSynthesizing, ""); err != nil {
			return nil, err
		}

		if len(event.TranscriptChunks) > 0 {
			job.TranscriptChunks = event.TranscriptChunks
		}

		// Dispatch synthesis job to Redis queue and pub/sub
		if c.producer != nil {
			ttsPayload := map[string]interface{}{
				"lesson_id":            job.LessonID,
				"task_id":              job.ID,
				"chunks":               job.TranscriptChunks,
				"default_voice_vi":     job.PacingConfig.ViVoice,
				"default_voice_target": job.PacingConfig.TargetVoice,
			}
			_ = c.producer.PushToQueue(ctx, queue.QueueTtsSynthesis, ttsPayload)
			_ = c.producer.PublishEvent(ctx, queue.TopicTtsSynthesize, ttsPayload)
			_ = c.producer.SaveJobState(ctx, job.ID, job.GetSnapshot(), 24*time.Hour)
			c.broadcastProgress(ctx, job)
		}

	case EventTtsDone:
		// Advance SYNTHESIZING -> MASTERING (90%)
		if err := job.TransitionTo(StateMastering, ""); err != nil {
			return nil, err
		}

		if len(event.AudioClipPaths) > 0 {
			job.AudioClipPaths = event.AudioClipPaths
		}

		// Dispatch audio mastering task to Redis queue and pub/sub
		if c.producer != nil {
			var clips []map[string]interface{}
			for i, ch := range job.TranscriptChunks {
				clipPath := ""
				if i < len(job.AudioClipPaths) {
					clipPath = job.AudioClipPaths[i]
				}
				clips = append(clips, map[string]interface{}{
					"id":         ch.ID,
					"order":      ch.Order,
					"lang":       ch.Lang,
					"text":       ch.Text,
					"audio_path": clipPath,
				})
			}
			masteringPayload := map[string]interface{}{
				"task_id":          job.ID,
				"lesson_id":        job.LessonID,
				"title":            job.Title,
				"clips":            clips,
				"audio_clip_paths": job.AudioClipPaths,
				"pacing_config":    job.PacingConfig,
			}
			_ = c.producer.PushToQueue(ctx, queue.QueueAudioMastering, masteringPayload)
			_ = c.producer.PublishEvent(ctx, queue.TopicAudioMaster, masteringPayload)
			_ = c.producer.SaveJobState(ctx, job.ID, job.GetSnapshot(), 24*time.Hour)
			c.broadcastProgress(ctx, job)
		}

	case EventMasteringDone:
		// Advance MASTERING -> READY (100%)
		if err := job.TransitionTo(StateReady, ""); err != nil {
			return nil, err
		}

		job.AudioFilePath = event.AudioFilePath
		job.SrtFilePath = event.SrtFilePath
		job.DurationSec = event.DurationSec

		// Update PostgreSQL record if repository is provided
		if c.lessonRepo != nil && job.LessonID != "" {
			if lessonUUID, err := uuid.Parse(job.LessonID); err == nil {
				var pgID pgtype.UUID
				copy(pgID.Bytes[:], lessonUUID[:])
				pgID.Valid = true

				var chunksBytes []byte
				if len(job.TranscriptChunks) > 0 {
					chunksBytes, _ = json.Marshal(job.TranscriptChunks)
				} else {
					chunksBytes = []byte("[]")
				}

				var numDuration pgtype.Numeric
				_ = numDuration.Scan(fmt.Sprintf("%.2f", event.DurationSec))

				totalWords := event.TotalWords
				if totalWords == 0 {
					for _, ch := range job.TranscriptChunks {
						totalWords += len(ch.Text) / 5
					}
				}

				_, dbErr := c.lessonRepo.UpdateLessonRenderResult(ctx, db.UpdateLessonRenderResultParams{
					ID:               pgID,
					Status:           string(StateReady),
					AudioFilePath:    event.AudioFilePath,
					SrtFilePath:      event.SrtFilePath,
					DurationSec:      numDuration,
					TranscriptChunks: chunksBytes,
					TotalWords:       pgtype.Int4{Int32: int32(totalWords), Valid: true},
				})
				if dbErr != nil {
					return nil, fmt.Errorf("failed to update lesson in database: %w", dbErr)
				}
			}
		}

		if c.producer != nil {
			_ = c.producer.SaveJobState(ctx, job.ID, job.GetSnapshot(), 24*time.Hour)
			c.broadcastProgress(ctx, job)
		}

	case EventWorkerFailed:
		// Advance to FAILED
		_ = job.TransitionTo(StateFailed, event.ErrorMessage)

		// Mark lesson status FAILED in database
		if c.lessonRepo != nil && job.LessonID != "" {
			if lessonUUID, err := uuid.Parse(job.LessonID); err == nil {
				var pgID pgtype.UUID
				copy(pgID.Bytes[:], lessonUUID[:])
				pgID.Valid = true
				_ = c.lessonRepo.UpdateLessonStatus(ctx, pgID, string(StateFailed))
			}
		}

		if c.producer != nil {
			_ = c.producer.SaveJobState(ctx, job.ID, job.GetSnapshot(), 24*time.Hour)
			c.broadcastProgress(ctx, job)
		}
	}

	return job, nil
}

func (c *pipelineConsumer) broadcastProgress(ctx context.Context, job *RenderJob) {
	if c.producer == nil {
		return
	}

	event := ProgressBroadcastEvent{
		JobID:                 job.ID,
		LessonID:              job.LessonID,
		Status:                job.CurrentState,
		Progress:              job.ProgressPercent,
		EstimatedRemainingSec: job.EstimatedRemainingSec(100),
		Message:               job.Description,
		AudioFilePath:         job.AudioFilePath,
		SrtFilePath:           job.SrtFilePath,
		Timestamp:             time.Now().UTC(),
	}

	_ = c.producer.PublishEvent(ctx, queue.TopicProgressEvents, event)
}
