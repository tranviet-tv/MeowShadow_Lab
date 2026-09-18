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
	"meowshadow/gateway-core/internal/notifications"
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
	Status           string                 `json:"status,omitempty"`
	TranscriptChunks []domain.ScriptChunk   `json:"transcript_chunks,omitempty"`
	AudioClipPaths   []string               `json:"audio_clip_paths,omitempty"`
	AudioFilePath    string                 `json:"audio_file_path,omitempty"`
	SrtFilePath      string                 `json:"srt_file_path,omitempty"`
	DurationSec      float64                `json:"duration_sec,omitempty"`
	TotalWords       int                    `json:"total_words,omitempty"`
	ErrorMessage     string                 `json:"error_message,omitempty"`
	Error            string                 `json:"error,omitempty"`
	ProgressPercent  float64                `json:"progress_percent,omitempty"`
	CompletedChunks  int                    `json:"completed_chunks,omitempty"`
	TotalChunks      int                    `json:"total_chunks,omitempty"`
	Result           map[string]interface{} `json:"result,omitempty"`
}

// ProgressBroadcastEvent represents a real-time event sent across the system with camelCase client compatibility.
type ProgressBroadcastEvent struct {
	JobID                 string    `json:"job_id"`
	TaskIDCamel           string    `json:"taskId,omitempty"`
	LessonID              string    `json:"lesson_id"`
	ResultLessonIDCamel   string    `json:"resultLessonId,omitempty"`
	Status                JobState  `json:"status"`
	Progress              int       `json:"progress"`
	ProgressPercent       int       `json:"progressPercent,omitempty"`
	EstimatedRemainingSec float64   `json:"estimated_remaining_sec"`
	Message               string    `json:"message"`
	CurrentStepMessage    string    `json:"currentStepMessage,omitempty"`
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
	SetPushDispatcher(dispatcher notifications.PushDispatcher)
}

type pipelineConsumer struct {
	mu             sync.RWMutex
	jobs           map[string]*RenderJob
	producer       queue.RedisProducer
	lessonRepo     repository.LessonRepository
	pushDispatcher notifications.PushDispatcher
}

// NewPipelineConsumer initializes a PipelineConsumer with Redis and DB repository access.
func NewPipelineConsumer(producer queue.RedisProducer, lessonRepo repository.LessonRepository) PipelineConsumer {
	return &pipelineConsumer{
		jobs:       make(map[string]*RenderJob),
		producer:   producer,
		lessonRepo: lessonRepo,
	}
}

// SetPushDispatcher attaches push notification dispatcher to the consumer.
func (c *pipelineConsumer) SetPushDispatcher(dispatcher notifications.PushDispatcher) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.pushDispatcher = dispatcher
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
			ttsEngine := job.TtsEngine
			if ttsEngine == "" {
				ttsEngine = "edge-tts"
			}
			// Populate chunk speed rates if not already specified
			for idx := range job.TranscriptChunks {
				if job.TranscriptChunks[idx].SpeedRate == 0 {
					if job.TranscriptChunks[idx].Lang == "vi" && job.PacingConfig.ViSpeed > 0 {
						job.TranscriptChunks[idx].SpeedRate = job.PacingConfig.ViSpeed
					} else if job.PacingConfig.TargetSpeed > 0 {
						job.TranscriptChunks[idx].SpeedRate = job.PacingConfig.TargetSpeed
					}
				}
			}

			ttsPayload := map[string]interface{}{
				"lesson_id":            job.LessonID,
				"task_id":              job.ID,
				"engine":               ttsEngine,
				"chunks":               job.TranscriptChunks,
				"default_voice_vi":     job.PacingConfig.ViVoice,
				"default_voice_target": job.PacingConfig.TargetVoice,
				"default_speed_vi":     job.PacingConfig.ViSpeed,
				"default_speed_target": job.PacingConfig.TargetSpeed,
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
		_ = c.producer.PushToQueue(ctx, queue.QueueScriptParse, parsePayload)
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
					hasMissingClip := false
					if clips, ok := event.Result["clips"].([]interface{}); ok {
						for _, item := range clips {
							if clipMap, ok := item.(map[string]interface{}); ok {
								fp, _ := clipMap["file_path"].(string)
								if fp == "" {
									hasMissingClip = true
									break
								}
							}
						}
					}
					if hasMissingClip || event.Status == "partial" {
						event.Type = EventWorkerFailed
						if event.ErrorMessage == "" {
							event.ErrorMessage = "TTS synthesis was incomplete: one or more audio clips failed to generate."
						}
					} else {
						event.Type = EventTtsDone
					}
				} else if _, ok := event.Result["chunks"]; ok {
					event.Type = EventParsingDone
				} else if _, ok := event.Result["formatted_script"]; ok {
					event.Type = EventParsingDone
				}
			}
			if len(event.TranscriptChunks) > 0 {
				event.Type = EventParsingDone
			}
		case "TASK_PROGRESS":
			// Intermediate progress reporting (e.g. from TTS synthesis or audio mastering)
			if job.GetState() == StateSynthesizing {
				pct := event.ProgressPercent
				if pct == 0 && event.Result != nil {
					if p, ok := event.Result["progress_percent"].(float64); ok {
						pct = p
					}
				}
				if pct > 0 {
					// Map TTS chunk progress (0-100%) into synthesis progress window (15% - 85%)
					job.ProgressPercent = 15 + int(pct*0.7)
				}
				job.Description = fmt.Sprintf("Synthesizing voice clips (%d%%)", job.ProgressPercent)
				if c.producer != nil {
					_ = c.producer.SaveJobState(ctx, job.ID, job.GetSnapshot(), 24*time.Hour)
					c.broadcastProgress(ctx, job)
				}
			}
			return job, nil
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
		if chunks, ok := event.Result["chunks"].([]interface{}); ok && len(event.TranscriptChunks) == 0 {
			for _, item := range chunks {
				if chunkMap, ok := item.(map[string]interface{}); ok {
					id, _ := chunkMap["id"].(string)
					orderFloat, _ := chunkMap["order"].(float64)
					lang, _ := chunkMap["lang"].(string)
					text, _ := chunkMap["text"].(string)
					event.TranscriptChunks = append(event.TranscriptChunks, domain.ScriptChunk{
						ID:    id,
						Order: int(orderFloat),
						Lang:  lang,
						Text:  text,
					})
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
			ttsEngine := job.TtsEngine
			if ttsEngine == "" {
				ttsEngine = "edge-tts"
			}
			// Populate chunk speed rates if not already specified
			for idx := range job.TranscriptChunks {
				if job.TranscriptChunks[idx].SpeedRate == 0 {
					if job.TranscriptChunks[idx].Lang == "vi" && job.PacingConfig.ViSpeed > 0 {
						job.TranscriptChunks[idx].SpeedRate = job.PacingConfig.ViSpeed
					} else if job.PacingConfig.TargetSpeed > 0 {
						job.TranscriptChunks[idx].SpeedRate = job.PacingConfig.TargetSpeed
					}
				}
			}

			ttsPayload := map[string]interface{}{
				"lesson_id":            job.LessonID,
				"task_id":              job.ID,
				"engine":               ttsEngine,
				"chunks":               job.TranscriptChunks,
				"default_voice_vi":     job.PacingConfig.ViVoice,
				"default_voice_target": job.PacingConfig.TargetVoice,
				"default_speed_vi":     job.PacingConfig.ViSpeed,
				"default_speed_target": job.PacingConfig.TargetSpeed,
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
			// Ensure default pacing values if unset
			silenceVi := job.PacingConfig.SilenceAfterViSec
			if silenceVi <= 0 {
				silenceVi = 1.5
			}
			silenceTarget := job.PacingConfig.SilenceAfterTargetSec
			if silenceTarget <= 0 {
				silenceTarget = 3.5
			}
			silenceBetween := job.PacingConfig.SilenceBetweenSentencesSec
			if silenceBetween <= 0 {
				silenceBetween = 0.5
			}
			exportFormat := job.PacingConfig.ExportFormat
			if exportFormat == "" {
				exportFormat = "mp3"
			}
			audioBitrate := job.PacingConfig.AudioBitrate
			if audioBitrate == "" {
				audioBitrate = "192k"
			}

			masteringPayload := map[string]interface{}{
				"task_id":          job.ID,
				"lesson_id":        job.LessonID,
				"title":            job.Title,
				"clips":            clips,
				"audio_clip_paths": job.AudioClipPaths,
				"pacing_config": map[string]interface{}{
					"silence_after_vi_sec":          silenceVi,
					"silence_after_target_sec":      silenceTarget,
					"silence_between_sentences_sec": silenceBetween,
					"insert_cue_sound":              job.PacingConfig.InsertCueSound,
					"export_format":                 exportFormat,
					"audio_bitrate":                 audioBitrate,
				},
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

		if c.pushDispatcher != nil && job.UserID != "" {
			_, _ = c.pushDispatcher.DispatchLessonCompleted(ctx, job.UserID, job.LessonID, job.Title)
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

		if c.pushDispatcher != nil && job.UserID != "" {
			_, _ = c.pushDispatcher.DispatchLessonFailed(ctx, job.UserID, job.LessonID, job.Title, event.ErrorMessage)
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
		TaskIDCamel:           job.ID,
		LessonID:              job.LessonID,
		ResultLessonIDCamel:   job.LessonID,
		Status:                job.CurrentState,
		Progress:              job.ProgressPercent,
		ProgressPercent:       job.ProgressPercent,
		EstimatedRemainingSec: job.EstimatedRemainingSec(100),
		Message:               job.Description,
		CurrentStepMessage:    job.Description,
		AudioFilePath:         job.AudioFilePath,
		SrtFilePath:           job.SrtFilePath,
		Timestamp:             time.Now().UTC(),
	}

	_ = c.producer.PublishEvent(ctx, queue.TopicProgressEvents, event)
}
