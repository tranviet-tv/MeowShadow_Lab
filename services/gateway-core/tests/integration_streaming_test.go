package tests

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"meowshadow/gateway-core/config"
	deliveryHttp "meowshadow/gateway-core/internal/delivery/http"
	"meowshadow/gateway-core/internal/repository/db"
	"meowshadow/gateway-core/internal/services"
)

func buildTestStreamingApp(cfg *config.Config, lessonSvc services.LessonService) *fiber.App {
	app := fiber.New()
	apiV1 := app.Group("/api/v1")
	audioStreamHandler := deliveryHttp.NewAudioStreamHandler(lessonSvc, cfg.StorageDir)
	audioStreamHandler.RegisterRoutes(apiV1)
	assetsHandler := deliveryHttp.NewAssetsHandler(lessonSvc, cfg.StorageDir)
	assetsHandler.RegisterRoutes(apiV1)
	return app
}


// mockStreamingLessonRepo provides mock data for streaming integration tests.
type mockStreamingLessonRepo struct {
	lesson *db.GetLessonByIDRow
}

func (m *mockStreamingLessonRepo) CreateLesson(ctx context.Context, params db.CreateLessonParams) (*db.CreateLessonRow, error) {
	return nil, nil
}

func (m *mockStreamingLessonRepo) GetLessonByID(ctx context.Context, id pgtype.UUID) (*db.GetLessonByIDRow, error) {
	if m.lesson != nil {
		return m.lesson, nil
	}
	return nil, fmt.Errorf("lesson not found")
}

func (m *mockStreamingLessonRepo) ListLessonsByUserID(ctx context.Context, userID pgtype.UUID, limit, offset int32) ([]db.ListLessonsByUserIDRow, error) {
	return nil, nil
}

func (m *mockStreamingLessonRepo) CountLessonsByUserID(ctx context.Context, userID pgtype.UUID) (int64, error) {
	return 0, nil
}

func (m *mockStreamingLessonRepo) ListAllLessons(ctx context.Context, limit, offset int32) ([]db.ListAllLessonsRow, error) {
	return nil, nil
}

func (m *mockStreamingLessonRepo) CountAllLessons(ctx context.Context) (int64, error) {
	return 0, nil
}

func (m *mockStreamingLessonRepo) UpdateLessonStatus(ctx context.Context, id pgtype.UUID, status string) error {
	return nil
}

func (m *mockStreamingLessonRepo) UpdateLessonRenderResult(ctx context.Context, params db.UpdateLessonRenderResultParams) (*db.UpdateLessonRenderResultRow, error) {
	return nil, nil
}

func (m *mockStreamingLessonRepo) DeleteLesson(ctx context.Context, id pgtype.UUID) error {
	return nil
}

func (m *mockStreamingLessonRepo) GetLearningProgress(ctx context.Context, userID, lessonID pgtype.UUID) (*db.GetLearningProgressRow, error) {
	return nil, nil
}

func (m *mockStreamingLessonRepo) UpsertLearningProgress(ctx context.Context, params db.UpsertLearningProgressParams) error {
	return nil
}

// Helper to setup test environment with realistic mock files and app instance.
func setupStreamingTestEnv(t *testing.T) (*mockStreamingLessonRepo, string, string, uuid.UUID) {
	tempDir := t.TempDir()
	lessonUUID := uuid.New()

	// 1. Create simulated 64KB audio file with non-trivial byte pattern
	audioPath := filepath.Join(tempDir, fmt.Sprintf("%s.mp3", lessonUUID.String()))
	audioData := make([]byte, 65536)
	for i := range audioData {
		audioData[i] = byte(i % 256)
	}
	if err := os.WriteFile(audioPath, audioData, 0644); err != nil {
		t.Fatalf("Failed to create audio test file: %v", err)
	}

	// 2. Create SRT subtitle file
	srtPath := filepath.Join(tempDir, fmt.Sprintf("%s.srt", lessonUUID.String()))
	srtContent := `1
00:00:01,000 --> 00:00:03,500
Xin chào các bạn, chào mừng đến với MeowShadow Lab.

2
00:00:04,000 --> 00:00:07,200
Hello everyone, welcome to MeowShadow Lab language training.
`
	if err := os.WriteFile(srtPath, []byte(srtContent), 0644); err != nil {
		t.Fatalf("Failed to create srt test file: %v", err)
	}

	// 3. Create Waveform JSON file
	waveformPath := filepath.Join(tempDir, fmt.Sprintf("%s_waveform.json", lessonUUID.String()))
	waveformData := `{"version":2,"channels":1,"sample_rate":44100,"samples_per_pixel":256,"bits":8,"length":200,"data":[-10,12,-30,45,-80,95,-50,20,-5,0]}`
	if err := os.WriteFile(waveformPath, []byte(waveformData), 0644); err != nil {
		t.Fatalf("Failed to create waveform test file: %v", err)
	}

	var pgUUID pgtype.UUID
	_ = pgUUID.Scan(lessonUUID.String())

	var numDuration pgtype.Numeric
	_ = numDuration.Scan("120")

	repo := &mockStreamingLessonRepo{
		lesson: &db.GetLessonByIDRow{
			ID:            pgUUID,
			Title:         "High Performance Audio Streaming Test Lesson",
			Status:        "COMPLETED",
			AudioFilePath: audioPath,
			SrtFilePath:   srtPath,
			DurationSec:   numDuration,
		},
	}

	return repo, tempDir, audioPath, lessonUUID
}

// TestSprint9_DoD_RangeRequest_206 verifies curl -i -H "Range: bytes=0-1024" DoD requirement:
// Returns HTTP 206 Partial Content, Content-Range: bytes 0-1024/<total>, and accurate slice content.
func TestSprint9_DoD_RangeRequest_206(t *testing.T) {
	repo, tempDir, _, lessonUUID := setupStreamingTestEnv(t)
	lessonSvc := services.NewLessonService(repo)

	cfg := &config.Config{
		StorageDir: tempDir,
	}

	app := buildTestStreamingApp(cfg, lessonSvc)

	url := fmt.Sprintf("/api/v1/audio/stream/%s", lessonUUID.String())
	req := httptest.NewRequest(http.MethodGet, url, nil)
	req.Header.Set("Range", "bytes=0-1024")

	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("Request failed: %v", err)
	}
	defer resp.Body.Close()

	// 1. Verify Status Code 206 Partial Content
	if resp.StatusCode != http.StatusPartialContent {
		t.Fatalf("Expected HTTP status 206 Partial Content, got %d", resp.StatusCode)
	}

	// 2. Verify Content-Range header: bytes 0-1024/65536
	contentRange := resp.Header.Get("Content-Range")
	expectedContentRange := "bytes 0-1024/65536"
	if contentRange != expectedContentRange {
		t.Errorf("Expected Content-Range '%s', got '%s'", expectedContentRange, contentRange)
	}

	// 3. Verify Content-Length header: 1025
	contentLength := resp.Header.Get("Content-Length")
	if contentLength != "1025" {
		t.Errorf("Expected Content-Length '1025', got '%s'", contentLength)
	}

	// 4. Verify Content-Type and Accept-Ranges headers
	if resp.Header.Get("Content-Type") != "audio/mpeg" {
		t.Errorf("Expected Content-Type 'audio/mpeg', got '%s'", resp.Header.Get("Content-Type"))
	}
	if resp.Header.Get("Accept-Ranges") != "bytes" {
		t.Errorf("Expected Accept-Ranges 'bytes', got '%s'", resp.Header.Get("Accept-Ranges"))
	}

	// 5. Verify byte content matches exact initial slice
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("Failed to read response body: %v", err)
	}
	if len(body) != 1025 {
		t.Fatalf("Expected body length 1025, got %d", len(body))
	}
	for i := 0; i <= 1024; i++ {
		if body[i] != byte(i%256) {
			t.Fatalf("Byte mismatch at position %d: expected %d, got %d", i, byte(i%256), body[i])
		}
	}
}

// TestSprint9_DoD_SeekLatency_Under100ms verifies audio seek starts playback within < 100ms.
func TestSprint9_DoD_SeekLatency_Under100ms(t *testing.T) {
	repo, tempDir, _, lessonUUID := setupStreamingTestEnv(t)
	lessonSvc := services.NewLessonService(repo)

	cfg := &config.Config{
		StorageDir: tempDir,
	}

	app := buildTestStreamingApp(cfg, lessonSvc)

	// Seek to byte position 32768 (halfway through file)
	url := fmt.Sprintf("/api/v1/audio/stream/%s", lessonUUID.String())
	req := httptest.NewRequest(http.MethodGet, url, nil)
	req.Header.Set("Range", "bytes=32768-49151") // 16 KB range

	startTime := time.Now()
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("Seek request failed: %v", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	latency := time.Since(startTime)

	if err != nil {
		t.Fatalf("Failed to read seek response body: %v", err)
	}

	// Definition of Done requirement: Seek response latency < 100ms
	if latency > 100*time.Millisecond {
		t.Errorf("Seek latency exceeded 100ms threshold: took %v", latency)
	} else {
		t.Logf("Audio seek latency: %v (< 100ms DoD target achieved)", latency)
	}

	if resp.StatusCode != http.StatusPartialContent {
		t.Errorf("Expected status 206 for seek request, got %d", resp.StatusCode)
	}
	if len(body) != (49151 - 32768 + 1) {
		t.Errorf("Expected seek body length %d, got %d", 49151-32768+1, len(body))
	}
}

// TestSprint9_DoD_SafariProbe_Bytes0_1 verifies Safari/iOS AVPlayer initial 2-byte probe.
func TestSprint9_DoD_SafariProbe_Bytes0_1(t *testing.T) {
	repo, tempDir, _, lessonUUID := setupStreamingTestEnv(t)
	lessonSvc := services.NewLessonService(repo)

	cfg := &config.Config{
		StorageDir: tempDir,
	}

	app := buildTestStreamingApp(cfg, lessonSvc)

	url := fmt.Sprintf("/api/v1/audio/stream/%s", lessonUUID.String())
	req := httptest.NewRequest(http.MethodGet, url, nil)
	req.Header.Set("Range", "bytes=0-1")

	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("Request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusPartialContent {
		t.Fatalf("Expected 206 for Safari probe, got %d", resp.StatusCode)
	}
	if resp.Header.Get("Content-Range") != "bytes 0-1/65536" {
		t.Errorf("Expected Content-Range 'bytes 0-1/65536', got '%s'", resp.Header.Get("Content-Range"))
	}
	if resp.Header.Get("Content-Length") != "2" {
		t.Errorf("Expected Content-Length '2', got '%s'", resp.Header.Get("Content-Length"))
	}
}

// TestSprint9_DoD_StaticAssets_SrtAndVttAndWaveform verifies SP09-02 static asset delivery.
func TestSprint9_DoD_StaticAssets_SrtAndVttAndWaveform(t *testing.T) {
	repo, tempDir, _, lessonUUID := setupStreamingTestEnv(t)
	lessonSvc := services.NewLessonService(repo)

	cfg := &config.Config{
		StorageDir: tempDir,
	}

	app := buildTestStreamingApp(cfg, lessonSvc)

	// 1. GET /api/v1/lessons/:id/subtitles.srt
	reqSrt := httptest.NewRequest(http.MethodGet, fmt.Sprintf("/api/v1/lessons/%s/subtitles.srt", lessonUUID.String()), nil)
	respSrt, err := app.Test(reqSrt, -1)
	if err != nil {
		t.Fatalf("Failed to get SRT: %v", err)
	}
	if respSrt.StatusCode != http.StatusOK {
		t.Errorf("Expected status 200 for SRT, got %d", respSrt.StatusCode)
	}
	srtBody, _ := io.ReadAll(respSrt.Body)
	if !strings.Contains(string(srtBody), "MeowShadow Lab") {
		t.Errorf("SRT body missing expected text")
	}

	// 2. GET /api/v1/lessons/:id/subtitles.vtt
	reqVtt := httptest.NewRequest(http.MethodGet, fmt.Sprintf("/api/v1/lessons/%s/subtitles.vtt", lessonUUID.String()), nil)
	respVtt, err := app.Test(reqVtt, -1)
	if err != nil {
		t.Fatalf("Failed to get VTT: %v", err)
	}
	if respVtt.StatusCode != http.StatusOK {
		t.Errorf("Expected status 200 for VTT, got %d", respVtt.StatusCode)
	}
	vttBody, _ := io.ReadAll(respVtt.Body)
	if !strings.HasPrefix(string(vttBody), "WEBVTT") {
		t.Errorf("VTT body missing WEBVTT header: %s", string(vttBody))
	}

	// 3. GET /api/v1/lessons/:id/waveform.json
	reqWave := httptest.NewRequest(http.MethodGet, fmt.Sprintf("/api/v1/lessons/%s/waveform.json", lessonUUID.String()), nil)
	respWave, err := app.Test(reqWave, -1)
	if err != nil {
		t.Fatalf("Failed to get waveform.json: %v", err)
	}
	if respWave.StatusCode != http.StatusOK {
		t.Errorf("Expected status 200 for waveform.json, got %d", respWave.StatusCode)
	}
	var waveObj map[string]interface{}
	waveBody, _ := io.ReadAll(respWave.Body)
	if err := json.Unmarshal(waveBody, &waveObj); err != nil {
		t.Fatalf("Failed to parse waveform.json: %v", err)
	}
	if waveObj["sample_rate"] != float64(44100) {
		t.Errorf("Expected sample_rate 44100, got %v", waveObj["sample_rate"])
	}
}

// TestSprint9_DoD_StorageRetentionCleanup verifies SP09-03 retention worker purges temp files >24h.
func TestSprint9_DoD_StorageRetentionCleanup(t *testing.T) {
	tempDir := t.TempDir()
	tempSubdir := filepath.Join(tempDir, "temp")
	_ = os.MkdirAll(tempSubdir, 0755)

	// Create expired file (> 25 hours old)
	oldFile := filepath.Join(tempSubdir, "expired_temp_chunk.wav")
	_ = os.WriteFile(oldFile, []byte("old temporary audio data"), 0644)
	oldTime := time.Now().Add(-26 * time.Hour)
	_ = os.Chtimes(oldFile, oldTime, oldTime)

	// Create fresh file (< 1 hour old)
	freshFile := filepath.Join(tempSubdir, "active_lesson_cache.mp3")
	_ = os.WriteFile(freshFile, []byte("fresh lesson audio"), 0644)

	cleanupSvc := services.NewStorageCleanupService(services.CleanupConfig{
		StorageDir:        tempDir,
		RetentionDuration: 24 * time.Hour,
		DryRun:            false,
	})

	// Execute retention cleanup
	result, err := cleanupSvc.CleanupTempFiles(context.Background())
	if err != nil {
		t.Fatalf("Cleanup execution failed: %v", err)
	}

	if result.ScannedFiles != 2 {
		t.Errorf("Expected 2 scanned files, got %d", result.ScannedFiles)
	}
	if result.DeletedFiles != 1 {
		t.Errorf("Expected 1 deleted file, got %d", result.DeletedFiles)
	}

	// Verify old file was deleted
	if _, err := os.Stat(oldFile); !os.IsNotExist(err) {
		t.Errorf("Expected old file %s to be deleted", oldFile)
	}

	// Verify fresh file still exists
	if _, err := os.Stat(freshFile); os.IsNotExist(err) {
		t.Errorf("Expected fresh file %s to remain intact", freshFile)
	}
}

// TestSprint9_DoD_SwaggerDocumentation verifies SP09-04 Swagger UI and OpenAPI 3.0 spec.
func TestSprint9_DoD_SwaggerDocumentation(t *testing.T) {
	tempDir := t.TempDir()
	specPath := filepath.Join(tempDir, "swagger.json")
	_ = os.WriteFile(specPath, []byte(`{"openapi":"3.0.3","info":{"title":"MeowShadow API"}}`), 0644)

	app := fiber.New()
	swaggerHandler := deliveryHttp.NewSwaggerHandler(specPath)
	swaggerHandler.RegisterRoutes(app)

	// 1. GET /swagger
	reqUI := httptest.NewRequest(http.MethodGet, "/swagger", nil)
	respUI, err := app.Test(reqUI, -1)
	if err != nil {
		t.Fatalf("Failed to request /swagger: %v", err)
	}
	if respUI.StatusCode != http.StatusOK {
		t.Errorf("Expected status 200 on /swagger, got %d", respUI.StatusCode)
	}

	// 2. GET /swagger/doc.json
	reqDoc := httptest.NewRequest(http.MethodGet, "/swagger/doc.json", nil)
	respDoc, err := app.Test(reqDoc, -1)
	if err != nil {
		t.Fatalf("Failed to request /swagger/doc.json: %v", err)
	}
	if respDoc.StatusCode != http.StatusOK {
		t.Errorf("Expected status 200 on /swagger/doc.json, got %d", respDoc.StatusCode)
	}
	body, _ := io.ReadAll(respDoc.Body)
	if !strings.Contains(string(body), "openapi") {
		t.Errorf("Expected OpenAPI spec in body")
	}
}
