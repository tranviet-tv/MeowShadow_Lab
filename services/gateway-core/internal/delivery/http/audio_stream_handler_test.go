package http_test

import (
	"context"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

	"github.com/gofiber/fiber/v2"
	deliveryHttp "meowshadow/gateway-core/internal/delivery/http"
	"meowshadow/gateway-core/internal/domain"
)

type mockLessonSvcForStream struct {
	lesson *domain.LessonResponse
	err    error
}

func (m *mockLessonSvcForStream) CreateLesson(ctx context.Context, userID string, isGuest bool, req domain.CreateLessonRequest) (*domain.LessonResponse, error) {
	return nil, nil
}
func (m *mockLessonSvcForStream) GetLessonByID(ctx context.Context, id string) (*domain.LessonResponse, error) {
	return m.lesson, m.err
}
func (m *mockLessonSvcForStream) ListLessons(ctx context.Context, userID string, isGuest bool, page, limit int64) ([]domain.LessonResponse, int64, error) {
	return nil, 0, nil
}
func (m *mockLessonSvcForStream) DeleteLesson(ctx context.Context, id string) error {
	return nil
}

func setupStreamApp(t *testing.T) (*fiber.App, string) {
	tempDir := t.TempDir()
	audioDir := filepath.Join(tempDir, "audio")
	_ = os.MkdirAll(audioDir, 0755)

	// Create dummy audio file of 5000 bytes
	testAudioPath := filepath.Join(audioDir, "lesson_test_123.mp3")
	dummyData := make([]byte, 5000)
	for i := range dummyData {
		dummyData[i] = byte(i % 256)
	}
	_ = os.WriteFile(testAudioPath, dummyData, 0644)

	mockSvc := &mockLessonSvcForStream{
		lesson: &domain.LessonResponse{
			ID:            "lesson_test_123",
			Title:         "Stream Test",
			AudioFilePath: testAudioPath,
		},
	}

	app := fiber.New()
	apiV1 := app.Group("/api/v1")
	handler := deliveryHttp.NewAudioStreamHandler(mockSvc, tempDir)
	handler.RegisterRoutes(apiV1)

	return app, testAudioPath
}

func TestAudioStreamHandler_FullFile(t *testing.T) {
	app, _ := setupStreamApp(t)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/audio/stream/lesson_test_123", nil)
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected status 200, got %d", resp.StatusCode)
	}
	if resp.Header.Get("Accept-Ranges") != "bytes" {
		t.Errorf("expected Accept-Ranges: bytes, got '%s'", resp.Header.Get("Accept-Ranges"))
	}
	if resp.Header.Get("Content-Type") != "audio/mpeg" {
		t.Errorf("expected Content-Type: audio/mpeg, got '%s'", resp.Header.Get("Content-Type"))
	}

	body, _ := io.ReadAll(resp.Body)
	if len(body) != 5000 {
		t.Errorf("expected 5000 bytes body, got %d", len(body))
	}
}

func TestAudioStreamHandler_RangeRequest_206(t *testing.T) {
	app, _ := setupStreamApp(t)

	// Test 1: Standard range 0-1024
	req := httptest.NewRequest(http.MethodGet, "/api/v1/audio/stream/lesson_test_123", nil)
	req.Header.Set("Range", "bytes=0-1024")
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}

	if resp.StatusCode != http.StatusPartialContent {
		t.Fatalf("expected status 206 Partial Content, got %d", resp.StatusCode)
	}
	if resp.Header.Get("Content-Range") != "bytes 0-1024/5000" {
		t.Errorf("expected Content-Range: bytes 0-1024/5000, got '%s'", resp.Header.Get("Content-Range"))
	}
	body, _ := io.ReadAll(resp.Body)
	if len(body) != 1025 {
		t.Errorf("expected 1025 bytes, got %d", len(body))
	}

	// Test 2: Safari probe request bytes=0-1
	reqProbe := httptest.NewRequest(http.MethodGet, "/api/v1/audio/stream/lesson_test_123", nil)
	reqProbe.Header.Set("Range", "bytes=0-1")
	respProbe, err := app.Test(reqProbe, -1)
	if err != nil {
		t.Fatalf("probe request failed: %v", err)
	}

	if respProbe.StatusCode != http.StatusPartialContent {
		t.Fatalf("expected probe status 206, got %d", respProbe.StatusCode)
	}
	if respProbe.Header.Get("Content-Range") != "bytes 0-1/5000" {
		t.Errorf("expected probe Content-Range: bytes 0-1/5000, got '%s'", respProbe.Header.Get("Content-Range"))
	}
	probeBody, _ := io.ReadAll(respProbe.Body)
	if len(probeBody) != 2 {
		t.Errorf("expected probe body length 2, got %d", len(probeBody))
	}

	// Test 3: Seeking request bytes=1000-2000
	reqSeek := httptest.NewRequest(http.MethodGet, "/api/v1/audio/stream/lesson_test_123", nil)
	reqSeek.Header.Set("Range", "bytes=1000-2000")
	respSeek, err := app.Test(reqSeek, -1)
	if err != nil {
		t.Fatalf("seek request failed: %v", err)
	}

	if respSeek.StatusCode != http.StatusPartialContent {
		t.Fatalf("expected seek status 206, got %d", respSeek.StatusCode)
	}
	if respSeek.Header.Get("Content-Range") != "bytes 1000-2000/5000" {
		t.Errorf("expected Content-Range: bytes 1000-2000/5000, got '%s'", respSeek.Header.Get("Content-Range"))
	}
}

func TestAudioStreamHandler_UnsatisfiableRange_416(t *testing.T) {
	app, _ := setupStreamApp(t)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/audio/stream/lesson_test_123", nil)
	req.Header.Set("Range", "bytes=6000-7000")
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}

	if resp.StatusCode != http.StatusRequestedRangeNotSatisfiable {
		t.Fatalf("expected status 416, got %d", resp.StatusCode)
	}
	if resp.Header.Get("Content-Range") != "bytes */5000" {
		t.Errorf("expected Content-Range: bytes */5000, got '%s'", resp.Header.Get("Content-Range"))
	}
}
