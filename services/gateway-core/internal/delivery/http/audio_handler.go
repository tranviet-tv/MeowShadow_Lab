// Package http provides HTTP controllers and REST endpoints for gateway-core.
package http

import (
	"fmt"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"meowshadow/gateway-core/internal/delivery/middleware"
	"meowshadow/gateway-core/internal/domain"
	"meowshadow/gateway-core/internal/orchestrator"
	"meowshadow/gateway-core/internal/services"
	"meowshadow/gateway-core/pkg/response"
)

// AudioHandler handles audio generation and rendering orchestration endpoints.
type AudioHandler struct {
	lessonSvc services.LessonService
	consumer  orchestrator.PipelineConsumer
}

// NewAudioHandler constructs a new AudioHandler.
func NewAudioHandler(lessonSvc services.LessonService, consumer orchestrator.PipelineConsumer) *AudioHandler {
	return &AudioHandler{
		lessonSvc: lessonSvc,
		consumer:  consumer,
	}
}

// Generate handles POST /api/v1/audio/generate and enqueues an asynchronous render task.
func (h *AudioHandler) Generate(c *fiber.Ctx) error {
	var req domain.GenerateAudioRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "Invalid Request Body", err.Error())
	}
	req.Normalize()

	if req.Title == "" {
		req.Title = "Bài học Shadowing mới"
	}
	if req.TargetLanguage == "" {
		req.TargetLanguage = "en"
	}
	if req.SourceLanguage == "" {
		req.SourceLanguage = "vi"
	}

	userID := middleware.GetAuthUserID(c)
	isGuest := middleware.IsGuestUser(c)

	taskID := uuid.New().String()
	lessonID := req.LessonID
	if lessonID == "" {
		lessonID = uuid.New().String()
		// Optionally create initial lesson entry if lesson service is present
		if h.lessonSvc != nil {
			created, err := h.lessonSvc.CreateLesson(c.Context(), userID, isGuest, domain.CreateLessonRequest{
				Title:          req.Title,
				TargetLanguage: req.TargetLanguage,
				SourceLanguage: req.SourceLanguage,
				PacingConfig:   req.PacingConfig,
				TranscriptChunks: []domain.ScriptChunk{
					{ID: "c1", Order: 1, Lang: req.SourceLanguage, Text: req.Title},
				},
				Status: "PENDING",
			})
			if err == nil && created != nil {
				lessonID = created.ID
			}
		}
	}

	// Create and register the render job in the pipeline consumer
	job := orchestrator.NewRenderJob(
		taskID,
		lessonID,
		userID,
		req.Title,
		req.TargetLanguage,
		req.SourceLanguage,
		req.SourceText,
		req.PacingConfig,
	)

	// Attach transcript chunks if provided in request or fetch from existing lesson
	if len(req.TranscriptChunks) > 0 {
		job.TranscriptChunks = req.TranscriptChunks
	} else if h.lessonSvc != nil && lessonID != "" {
		if l, err := h.lessonSvc.GetLessonByID(c.Context(), lessonID); err == nil && l != nil {
			if len(l.TranscriptChunks) > 0 {
				job.TranscriptChunks = l.TranscriptChunks
			}
		}
	}

	if h.consumer != nil {
		if err := h.consumer.StartPipeline(c.Context(), job); err != nil {
			return response.Error(c, fiber.StatusInternalServerError, "Pipeline Start Failed", err.Error())
		}
	}

	resp := domain.GenerateAudioResponse{
		TaskID:     taskID,
		Status:     "QUEUED",
		Message:    "Tác vụ tạo audio đã được đưa vào hàng đợi.",
		WsEndpoint: fmt.Sprintf("/ws/progress?job_id=%s", taskID),
	}

	return response.Success(c, fiber.StatusAccepted, "Tác vụ tạo audio đã được đưa vào hàng đợi", resp)
}

// RegisterRoutes registers audio generation endpoints onto the Fiber router.
func (h *AudioHandler) RegisterRoutes(router fiber.Router, authMiddleware fiber.Handler) {
	router.Post("/audio/generate", authMiddleware, h.Generate)
}
