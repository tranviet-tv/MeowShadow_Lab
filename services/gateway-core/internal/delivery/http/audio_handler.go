// Package http provides HTTP controllers and REST endpoints for gateway-core.
package http

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

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
	lessonSvc    services.LessonService
	consumer     orchestrator.PipelineConsumer
	ttsEngineURL string
}

// NewAudioHandler constructs a new AudioHandler.
func NewAudioHandler(lessonSvc services.LessonService, consumer orchestrator.PipelineConsumer, ttsEngineURL ...string) *AudioHandler {
	url := "http://tts-engine-service:8002"
	if len(ttsEngineURL) > 0 && ttsEngineURL[0] != "" {
		url = ttsEngineURL[0]
	}
	return &AudioHandler{
		lessonSvc:    lessonSvc,
		consumer:     consumer,
		ttsEngineURL: strings.TrimRight(url, "/"),
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

	// Propagate user TTS engine choice with intelligent voice prefix fallback
	if req.TtsEngine != "" {
		job.TtsEngine = req.TtsEngine
	} else if strings.HasPrefix(req.PacingConfig.TargetVoice, "kokoro-") || strings.HasPrefix(req.PacingConfig.ViVoice, "kokoro-") {
		job.TtsEngine = "kokoro"
	}

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
		TaskID:        taskID,
		TaskIDCamel:   taskID,
		LessonID:      lessonID,
		LessonIDCamel: lessonID,
		Status:        "QUEUED",
		Message:       "Tác vụ tạo audio đã được đưa vào hàng đợi.",
		WsEndpoint:    fmt.Sprintf("/ws/progress?job_id=%s&lesson_id=%s", taskID, lessonID),
	}

	return response.Success(c, fiber.StatusAccepted, "Tác vụ tạo audio đã được đưa vào hàng đợi", resp)
}

// SynthesizePreview proxies single-sentence speech synthesis requests to the TTS engine.
func (h *AudioHandler) SynthesizePreview(c *fiber.Ctx) error {
	var body map[string]interface{}
	if err := c.BodyParser(&body); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "Invalid Request Body", err.Error())
	}

	// Normalize voice_id from voiceId if needed
	if _, ok := body["voice_id"]; !ok {
		if v, exists := body["voiceId"]; exists {
			body["voice_id"] = v
		}
	}

	targetURL := fmt.Sprintf("%s/api/v1/synthesize", h.ttsEngineURL)

	reqBytes, err := json.Marshal(body)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Serialization Error", err.Error())
	}

	httpReq, err := http.NewRequestWithContext(c.Context(), http.MethodPost, targetURL, bytes.NewReader(reqBytes))
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Proxy Request Failed", err.Error())
	}
	httpReq.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(httpReq)
	if err != nil {
		return response.Error(c, fiber.StatusBadGateway, "TTS Engine Unreachable", err.Error())
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		return response.Error(c, resp.StatusCode, "TTS Synthesis Failed", string(respBody))
	}

	contentType := resp.Header.Get("Content-Type")
	if contentType == "" {
		contentType = "audio/mpeg"
	}
	c.Set("Content-Type", contentType)
	c.Status(fiber.StatusOK)

	audioBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Read Error", err.Error())
	}
	return c.Send(audioBytes)
}

// RegisterRoutes registers audio generation endpoints onto the Fiber router.
func (h *AudioHandler) RegisterRoutes(router fiber.Router, authMiddleware fiber.Handler) {
	router.Post("/audio/generate", authMiddleware, h.Generate)
	router.Post("/audio/preview", h.SynthesizePreview)
	router.Post("/tts/preview", h.SynthesizePreview)
}
