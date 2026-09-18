package http

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"
	"meowshadow/gateway-core/config"
	"meowshadow/gateway-core/internal/delivery/middleware"
	"meowshadow/gateway-core/internal/domain"
	pkgJwt "meowshadow/gateway-core/pkg/jwt"
	"meowshadow/gateway-core/pkg/response"
)

type mockLessonService struct {
	lessons map[string]domain.LessonResponse
}

func newMockLessonService() *mockLessonService {
	return &mockLessonService{
		lessons: make(map[string]domain.LessonResponse),
	}
}

func (m *mockLessonService) CreateLesson(ctx context.Context, userID string, isGuest bool, req domain.CreateLessonRequest) (*domain.LessonResponse, error) {
	lessonID := "lesson-12345"
	resp := domain.LessonResponse{
		ID:               lessonID,
		UserID:           userID,
		Title:            req.Title,
		TargetLanguage:   req.TargetLanguage,
		SourceLanguage:   req.SourceLanguage,
		TotalWords:       req.TotalWords,
		DurationSec:      req.DurationSec,
		PacingConfig:     req.PacingConfig,
		TranscriptChunks: req.TranscriptChunks,
	}
	m.lessons[lessonID] = resp
	return &resp, nil
}

func (m *mockLessonService) GetLessonByID(ctx context.Context, id string) (*domain.LessonResponse, error) {
	if l, ok := m.lessons[id]; ok {
		return &l, nil
	}
	return nil, nil
}

func (m *mockLessonService) ListLessons(ctx context.Context, userID string, isGuest bool, page, limit int64) ([]domain.LessonResponse, int64, error) {
	var list []domain.LessonResponse
	for _, l := range m.lessons {
		list = append(list, l)
	}
	return list, int64(len(list)), nil
}

func (m *mockLessonService) DeleteLesson(ctx context.Context, id string) error {
	delete(m.lessons, id)
	return nil
}

func (m *mockLessonService) GetProgress(ctx context.Context, userID, lessonID string) (*domain.LearningProgressDTO, error) {
	return &domain.LearningProgressDTO{
		LessonID: lessonID,
		UserID:   userID,
	}, nil
}

func (m *mockLessonService) SyncProgress(ctx context.Context, userID string, req domain.SyncProgressRequest) error {
	return nil
}

func (m *mockLessonService) SyncBatchProgress(ctx context.Context, userID string, req domain.SyncBatchProgressRequest) error {
	return nil
}


func TestLessonHandler_CRUD(t *testing.T) {
	cfg := &config.Config{
		JWTSecret: "test_secret_for_lessons_12345678",
	}
	mockSvc := newMockLessonService()
	handler := NewLessonHandler(mockSvc)
	jwtAuth := middleware.NewJWTAuth(cfg.JWTSecret)

	app := fiber.New()
	apiV1 := app.Group("/api/v1")
	handler.RegisterRoutes(apiV1, jwtAuth)

	// Issue token
	tokens, err := pkgJwt.GenerateTokenPair("user-1", "user@meowshadow.local", false, cfg.JWTSecret, 30, 7)
	if err != nil {
		t.Fatalf("Generate token failed: %v", err)
	}
	authHeader := "Bearer " + tokens.AccessToken

	// 1. Test POST /api/v1/lessons
	createReq := domain.CreateLessonRequest{
		Title:          "Neuroscience of Deliberate Practice",
		TargetLanguage: "en",
		SourceLanguage: "vi",
		TotalWords:     120,
		DurationSec:    65.5,
		PacingConfig: domain.PacingConfig{
			SilenceAfterViSec:     1.5,
			SilenceAfterTargetSec: 3.5,
		},
		TranscriptChunks: []domain.ScriptChunk{
			{ID: "c1", Order: 0, Lang: "vi", Text: "Sự tập trung là chìa khóa."},
			{ID: "c2", Order: 1, Lang: "en", Text: "Focus is the key."},
		},
	}
	body, _ := json.Marshal(createReq)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/lessons", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", authHeader)

	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("Create lesson request failed: %v", err)
	}
	if resp.StatusCode != http.StatusCreated {
		t.Fatalf("Expected 201 Created, got %d", resp.StatusCode)
	}

	var createRes response.Response
	json.NewDecoder(resp.Body).Decode(&createRes)
	if !createRes.Success {
		t.Fatalf("Expected create response success true")
	}

	// 2. Test GET /api/v1/lessons (List)
	req = httptest.NewRequest(http.MethodGet, "/api/v1/lessons?page=1&limit=10", nil)
	req.Header.Set("Authorization", authHeader)
	resp, err = app.Test(req, -1)
	if err != nil {
		t.Fatalf("List lessons request failed: %v", err)
	}
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("Expected 200 OK, got %d", resp.StatusCode)
	}

	// 3. Test GET /api/v1/lessons/:id
	req = httptest.NewRequest(http.MethodGet, "/api/v1/lessons/lesson-12345", nil)
	req.Header.Set("Authorization", authHeader)
	resp, err = app.Test(req, -1)
	if err != nil {
		t.Fatalf("Get lesson request failed: %v", err)
	}
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("Expected 200 OK, got %d", resp.StatusCode)
	}

	// 4. Test DELETE /api/v1/lessons/:id
	req = httptest.NewRequest(http.MethodDelete, "/api/v1/lessons/lesson-12345", nil)
	req.Header.Set("Authorization", authHeader)
	resp, err = app.Test(req, -1)
	if err != nil {
		t.Fatalf("Delete lesson request failed: %v", err)
	}
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("Expected 200 OK on delete, got %d", resp.StatusCode)
	}
}
