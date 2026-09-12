package http_test

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/gofiber/fiber/v2"
	deliveryHttp "meowshadow/gateway-core/internal/delivery/http"
	"meowshadow/gateway-core/internal/domain"
)

func setupAssetsApp(t *testing.T) (*fiber.App, string) {
	tempDir := t.TempDir()
	subDir := filepath.Join(tempDir, "subtitles")
	audioDir := filepath.Join(tempDir, "audio")
	_ = os.MkdirAll(subDir, 0755)
	_ = os.MkdirAll(audioDir, 0755)

	// Create a physical SRT file
	srtPath := filepath.Join(subDir, "lesson_phys_1.srt")
	srtContent := "1\n00:00:01,000 --> 00:00:03,000\n[VI] Xin chao\n"
	_ = os.WriteFile(srtPath, []byte(srtContent), 0644)

	// Create physical waveform json
	wavePath := filepath.Join(audioDir, "lesson_phys_1_waveform.json")
	waveContent := `{"peaks": [0.1, 0.5, 0.8], "duration": 12.5}`
	_ = os.WriteFile(wavePath, []byte(waveContent), 0644)

	mockSvc := &mockLessonSvcForStream{
		lesson: &domain.LessonResponse{
			ID:          "lesson_phys_1",
			Title:       "Physical Asset Lesson",
			SrtFilePath: srtPath,
			DurationSec: 12.5,
			TranscriptChunks: []domain.ScriptChunk{
				{ID: "c1", Order: 1, Lang: "vi", Text: "Xin chao"},
			},
		},
	}

	app := fiber.New()
	apiV1 := app.Group("/api/v1")
	handler := deliveryHttp.NewAssetsHandler(mockSvc, tempDir)
	handler.RegisterRoutes(apiV1)

	return app, tempDir
}

func TestAssetsHandler_SubtitlesSrt(t *testing.T) {
	app, _ := setupAssetsApp(t)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/lessons/lesson_phys_1/subtitles.srt", nil)
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected status 200, got %d", resp.StatusCode)
	}
	if !strings.Contains(resp.Header.Get("Content-Type"), "text/plain") {
		t.Errorf("expected text/plain Content-Type, got: %s", resp.Header.Get("Content-Type"))
	}

	body, _ := io.ReadAll(resp.Body)
	if !strings.Contains(string(body), "[VI] Xin chao") {
		t.Fatalf("missing SRT body content: %s", string(body))
	}
}

func TestAssetsHandler_SubtitlesVtt(t *testing.T) {
	app, _ := setupAssetsApp(t)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/lessons/lesson_phys_1/subtitles.vtt", nil)
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected status 200, got %d", resp.StatusCode)
	}
	if !strings.Contains(resp.Header.Get("Content-Type"), "text/vtt") {
		t.Errorf("expected text/vtt Content-Type, got: %s", resp.Header.Get("Content-Type"))
	}

	body, _ := io.ReadAll(resp.Body)
	if !strings.HasPrefix(string(body), "WEBVTT\n\n") {
		t.Fatalf("expected WEBVTT header, got: %s", string(body))
	}
	if !strings.Contains(string(body), "00:00:01.000 --> 00:00:03.000") {
		t.Fatalf("expected converted dot timestamp in VTT: %s", string(body))
	}
}

func TestAssetsHandler_WaveformJson(t *testing.T) {
	app, _ := setupAssetsApp(t)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/lessons/lesson_phys_1/waveform.json", nil)
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected status 200, got %d", resp.StatusCode)
	}
	if !strings.Contains(resp.Header.Get("Content-Type"), "application/json") {
		t.Errorf("expected application/json Content-Type, got: %s", resp.Header.Get("Content-Type"))
	}

	body, _ := io.ReadAll(resp.Body)
	var wave map[string]interface{}
	if err := json.Unmarshal(body, &wave); err != nil {
		t.Fatalf("failed to parse waveform json: %v", err)
	}

	if _, ok := wave["peaks"]; !ok {
		t.Fatalf("expected peaks in waveform response: %+v", wave)
	}
}
