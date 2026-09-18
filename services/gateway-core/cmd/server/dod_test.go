package main

import (
	"bytes"
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

	"github.com/google/uuid"
	"meowshadow/gateway-core/config"
	"meowshadow/gateway-core/internal/domain"
	"meowshadow/gateway-core/internal/services"
	pkgJwt "meowshadow/gateway-core/pkg/jwt"
	"meowshadow/gateway-core/pkg/response"
)


// mockDoDAuthService implements services.AuthService for DoD integration testing.
type mockDoDAuthService struct {
	secret string
}

func (m *mockDoDAuthService) Register(ctx context.Context, req services.RegisterRequest) (*services.AuthResponse, error) {
	userId := uuid.New().String()
	tokens, err := pkgJwt.GenerateTokenPair(userId, req.Email, false, m.secret, 15, 7)
	if err != nil {
		return nil, err
	}
	return &services.AuthResponse{
		User: services.UserDTO{
			ID:        userId,
			Email:     req.Email,
			FullName:  req.FullName,
			IsGuest:   false,
			CreatedAt: time.Now().UTC().Format(time.RFC3339),
		},
		Tokens: *tokens,
	}, nil
}

func (m *mockDoDAuthService) Login(ctx context.Context, req services.LoginRequest) (*services.AuthResponse, error) {
	userId := uuid.New().String()
	tokens, err := pkgJwt.GenerateTokenPair(userId, req.Email, false, m.secret, 15, 7)
	if err != nil {
		return nil, err
	}
	return &services.AuthResponse{
		User: services.UserDTO{
			ID:        userId,
			Email:     req.Email,
			FullName:  "Test User",
			IsGuest:   false,
			CreatedAt: time.Now().UTC().Format(time.RFC3339),
		},
		Tokens: *tokens,
	}, nil
}

func (m *mockDoDAuthService) GuestLogin(ctx context.Context) (*services.AuthResponse, error) {
	guestId := uuid.New().String()
	tokens, err := pkgJwt.GenerateTokenPair(guestId, "guest@meowshadow.local", true, m.secret, 15, 7)
	if err != nil {
		return nil, err
	}
	return &services.AuthResponse{
		User: services.UserDTO{
			ID:        guestId,
			Email:     "guest@meowshadow.local",
			FullName:  "Guest User",
			IsGuest:   true,
			CreatedAt: time.Now().UTC().Format(time.RFC3339),
		},
		Tokens: *tokens,
	}, nil
}

func (m *mockDoDAuthService) GetProfile(ctx context.Context, userID string) (*services.UserDTO, error) {
	return &services.UserDTO{
		ID:        userID,
		Email:     "test@meowshadow.local",
		FullName:  "Test User",
		IsGuest:   false,
		CreatedAt: time.Now().UTC().Format(time.RFC3339),
	}, nil
}

func (m *mockDoDAuthService) RefreshToken(ctx context.Context, req services.RefreshTokenRequest) (*pkgJwt.TokenPair, error) {
	userId := uuid.New().String()
	tokens, err := pkgJwt.GenerateTokenPair(userId, "refreshed@meowshadow.local", false, m.secret, 15, 7)
	if err != nil {
		return nil, err
	}
	return tokens, nil
}

func (m *mockDoDAuthService) RegisterDevice(ctx context.Context, userID string, isGuest bool, req services.RegisterDeviceRequest) error {
	return nil
}

// mockDoDLessonService implements services.LessonService for DoD integration testing.
type mockDoDLessonService struct {
	lessons map[string]domain.LessonResponse
}

func (m *mockDoDLessonService) CreateLesson(
	ctx context.Context,
	userID string,
	isGuest bool,
	req domain.CreateLessonRequest,
) (*domain.LessonResponse, error) {
	lessonId := uuid.New().String()
	res := domain.LessonResponse{
		ID:               lessonId,
		UserID:           userID,
		Title:            req.Title,
		TargetLanguage:   req.TargetLanguage,
		SourceLanguage:   req.SourceLanguage,
		TotalWords:       req.TotalWords,
		DurationSec:      req.DurationSec,
		PacingConfig:     req.PacingConfig,
		TranscriptChunks: req.TranscriptChunks,
		AudioFilePath:    req.AudioFilePath,
		SrtFilePath:      req.SrtFilePath,
		CreatedAt:        time.Now().UTC().Format(time.RFC3339),
		UpdatedAt:        time.Now().UTC().Format(time.RFC3339),
	}
	m.lessons[lessonId] = res
	return &res, nil
}

func (m *mockDoDLessonService) GetLessonByID(ctx context.Context, id string) (*domain.LessonResponse, error) {
	lesson, exists := m.lessons[id]
	if !exists {
		return nil, services.ErrLessonNotFound
	}
	return &lesson, nil
}

func (m *mockDoDLessonService) ListLessons(
	ctx context.Context,
	userID string,
	isGuest bool,
	page, limit int64,
) ([]domain.LessonResponse, int64, error) {
	list := make([]domain.LessonResponse, 0)
	for _, l := range m.lessons {
		if l.UserID == userID {
			list = append(list, l)
		}
	}
	return list, int64(len(list)), nil
}

func (m *mockDoDLessonService) DeleteLesson(ctx context.Context, id string) error {
	_, exists := m.lessons[id]
	if !exists {
		return services.ErrLessonNotFound
	}
	delete(m.lessons, id)
	return nil
}

func (m *mockDoDLessonService) GetProgress(ctx context.Context, userID, lessonID string) (*domain.LearningProgressDTO, error) {
	return &domain.LearningProgressDTO{
		LessonID: lessonID,
		UserID:   userID,
	}, nil
}

func (m *mockDoDLessonService) SyncProgress(ctx context.Context, userID string, req domain.SyncProgressRequest) error {
	return nil
}

func (m *mockDoDLessonService) SyncBatchProgress(ctx context.Context, userID string, req domain.SyncBatchProgressRequest) error {
	return nil
}


func TestSprint7_DefinitionOfDone_IntegrationFlow(t *testing.T) {
	cfg := config.LoadConfig()
	cfg.JWTSecret = "dod_secret_key_testing_123456789012"

	authSvc := &mockDoDAuthService{secret: cfg.JWTSecret}
	lessonSvc := &mockDoDLessonService{lessons: make(map[string]domain.LessonResponse)}

	app := SetupApp(cfg, authSvc, lessonSvc)

	// Step 1: Health Check (200 OK)
	healthReq := httptest.NewRequest(http.MethodGet, "/health", nil)
	healthResp, err := app.Test(healthReq, -1)
	if err != nil || healthResp.StatusCode != http.StatusOK {
		t.Fatalf("DoD Step 1 Failed: GET /health returned status %d, err: %v", healthResp.StatusCode, err)
	}

	// Step 2: Auth Register (201 Created)
	regPayload := services.RegisterRequest{
		Email:    "dod_user@meowshadow.local",
		Password: "SecretPass123!",
		FullName: "DoD Tester",
	}
	regBody, _ := json.Marshal(regPayload)
	regReq := httptest.NewRequest(http.MethodPost, "/api/v1/auth/register", bytes.NewReader(regBody))
	regReq.Header.Set("Content-Type", "application/json")
	regResp, err := app.Test(regReq, -1)
	if err != nil || regResp.StatusCode != http.StatusCreated {
		t.Fatalf("DoD Step 2 Failed: POST /api/v1/auth/register returned status %d, err: %v", regResp.StatusCode, err)
	}

	// Step 3: Auth Login (200 OK) & Token Retrieval
	loginPayload := services.LoginRequest{
		Email:    "dod_user@meowshadow.local",
		Password: "SecretPass123!",
	}
	loginBody, _ := json.Marshal(loginPayload)
	loginReq := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", bytes.NewReader(loginBody))
	loginReq.Header.Set("Content-Type", "application/json")
	loginResp, err := app.Test(loginReq, -1)
	if err != nil || loginResp.StatusCode != http.StatusOK {
		t.Fatalf("DoD Step 3 Failed: POST /api/v1/auth/login returned status %d, err: %v", loginResp.StatusCode, err)
	}

	var authRes response.Response
	_ = json.NewDecoder(loginResp.Body).Decode(&authRes)
	authDataBytes, _ := json.Marshal(authRes.Data)
	var authResponse services.AuthResponse
	_ = json.Unmarshal(authDataBytes, &authResponse)
	if authResponse.Tokens.AccessToken == "" {
		t.Fatalf("DoD Step 3 Failed: No access token in login response")
	}
	authToken := authResponse.Tokens.AccessToken

	// Step 4: Unauthenticated Lesson Creation (Expect 401 Unauthorized)
	createLessonPayload := domain.CreateLessonRequest{
		Title:          "Shadowing Lesson: Daily Greetings",
		SourceLanguage: "vi",
		TargetLanguage: "ja",
		TotalWords:     12,
		DurationSec:    5.5,
		TranscriptChunks: []domain.ScriptChunk{
			{ID: "c1", Order: 1, Lang: "ja", Text: "Konnichiwa."},
			{ID: "c2", Order: 2, Lang: "vi", Text: "Xin chào."},
		},
		PacingConfig: domain.PacingConfig{
			SilenceAfterViSec:     1.0,
			SilenceAfterTargetSec: 1.5,
			InsertCueSound:        true,
		},
	}
	createBody, _ := json.Marshal(createLessonPayload)
	unauthReq := httptest.NewRequest(http.MethodPost, "/api/v1/lessons", bytes.NewReader(createBody))
	unauthReq.Header.Set("Content-Type", "application/json")
	unauthResp, _ := app.Test(unauthReq, -1)
	if unauthResp.StatusCode != http.StatusUnauthorized {
		t.Errorf("Expected 401 Unauthorized for unauthenticated request, got %d", unauthResp.StatusCode)
	}

	// Step 5: Authenticated Lesson Creation (201 Created)
	authLessonReq := httptest.NewRequest(http.MethodPost, "/api/v1/lessons", bytes.NewReader(createBody))
	authLessonReq.Header.Set("Content-Type", "application/json")
	authLessonReq.Header.Set("Authorization", "Bearer "+authToken)
	createResp, err := app.Test(authLessonReq, -1)
	if err != nil || createResp.StatusCode != http.StatusCreated {
		t.Fatalf("DoD Step 5 Failed: POST /api/v1/lessons returned status %d, err: %v", createResp.StatusCode, err)
	}

	var createLessonRes response.Response
	_ = json.NewDecoder(createResp.Body).Decode(&createLessonRes)
	lessonDataBytes, _ := json.Marshal(createLessonRes.Data)
	var createdLesson domain.LessonResponse
	_ = json.Unmarshal(lessonDataBytes, &createdLesson)
	if createdLesson.ID == "" {
		t.Fatalf("DoD Step 5 Failed: Invalid lesson ID created")
	}

	// Step 6: Get Lesson by ID (200 OK)
	getReq := httptest.NewRequest(http.MethodGet, "/api/v1/lessons/"+createdLesson.ID, nil)
	getReq.Header.Set("Authorization", "Bearer "+authToken)
	getResp, err := app.Test(getReq, -1)
	if err != nil || getResp.StatusCode != http.StatusOK {
		t.Fatalf("DoD Step 6 Failed: GET /api/v1/lessons/:id returned status %d, err: %v", getResp.StatusCode, err)
	}

	// Step 7: List User Lessons (200 OK)
	listReq := httptest.NewRequest(http.MethodGet, "/api/v1/lessons", nil)
	listReq.Header.Set("Authorization", "Bearer "+authToken)
	listResp, err := app.Test(listReq, -1)
	if err != nil || listResp.StatusCode != http.StatusOK {
		t.Fatalf("DoD Step 7 Failed: GET /api/v1/lessons returned status %d, err: %v", listResp.StatusCode, err)
	}

	// Step 8: Delete Lesson by ID (200 OK)
	delReq := httptest.NewRequest(http.MethodDelete, "/api/v1/lessons/"+createdLesson.ID, nil)
	delReq.Header.Set("Authorization", "Bearer "+authToken)
	delResp, err := app.Test(delReq, -1)
	if err != nil || delResp.StatusCode != http.StatusOK {
		t.Fatalf("DoD Step 8 Failed: DELETE /api/v1/lessons/:id returned status %d, err: %v", delResp.StatusCode, err)
	}

	// Step 9: Guest Mode Session Creation (200 OK)
	guestReq := httptest.NewRequest(http.MethodPost, "/api/v1/auth/guest", nil)
	guestResp, err := app.Test(guestReq, -1)
	if err != nil || guestResp.StatusCode != http.StatusOK {
		t.Fatalf("DoD Step 9 Failed: POST /api/v1/auth/guest returned status %d, err: %v", guestResp.StatusCode, err)
	}
}

// TestSprint9_DefinitionOfDone_StreamingAndStorage verifies the full DoD criteria for Sprint 9:
// 1. curl -i -H "Range: bytes=0-1024" returns HTTP/1.1 206 Partial Content and Content-Range: bytes 0-1024/<total>.
// 2. Audio seeking latency is < 100ms.
// 3. Static assets (SRT, VTT, Waveform JSON) served properly.
// 4. Swagger UI accessible at /swagger.
func TestSprint9_DefinitionOfDone_StreamingAndStorage(t *testing.T) {
	tempDir := t.TempDir()
	audioID := uuid.New().String()

	// 1. Create simulated 128KB audio file
	audioPath := filepath.Join(tempDir, fmt.Sprintf("%s.mp3", audioID))
	audioData := make([]byte, 131072) // 128 KB
	for i := range audioData {
		audioData[i] = byte(i % 256)
	}
	if err := os.WriteFile(audioPath, audioData, 0644); err != nil {
		t.Fatalf("Failed to create test audio file: %v", err)
	}

	// 2. Create SRT file
	srtPath := filepath.Join(tempDir, fmt.Sprintf("%s.srt", audioID))
	srtContent := "1\n00:00:00,500 --> 00:00:03,000\nSprint 9 DoD Audio Streaming Validation\n"
	if err := os.WriteFile(srtPath, []byte(srtContent), 0644); err != nil {
		t.Fatalf("Failed to create test srt file: %v", err)
	}

	// 3. Create Waveform JSON file
	waveformPath := filepath.Join(tempDir, fmt.Sprintf("%s_waveform.json", audioID))
	_ = os.WriteFile(waveformPath, []byte(`{"version":2,"sample_rate":44100,"data":[-5,10,-20,30]}`), 0644)

	// 4. Setup mock lesson service
	lessonSvc := &mockDoDLessonService{
		lessons: map[string]domain.LessonResponse{
			audioID: {
				ID:            audioID,
				Title:         "Sprint 9 Streaming Lesson",
				AudioFilePath: audioPath,
				SrtFilePath:   srtPath,
				Status:        "COMPLETED",
			},
		},
	}

	cfg := config.LoadConfig()
	cfg.StorageDir = tempDir

	app := SetupApp(cfg, nil, lessonSvc)

	// Step 1: DoD Range Header curl -i -H "Range: bytes=0-1024"
	streamReq := httptest.NewRequest(http.MethodGet, fmt.Sprintf("/api/v1/audio/stream/%s", audioID), nil)
	streamReq.Header.Set("Range", "bytes=0-1024")
	streamResp, err := app.Test(streamReq, -1)
	if err != nil {
		t.Fatalf("DoD Step 1 Failed: Request error: %v", err)
	}
	defer streamResp.Body.Close()

	if streamResp.StatusCode != http.StatusPartialContent {
		t.Fatalf("DoD Step 1 Failed: Expected HTTP 206 Partial Content, got %d", streamResp.StatusCode)
	}
	contentRange := streamResp.Header.Get("Content-Range")
	expectedContentRange := "bytes 0-1024/131072"
	if contentRange != expectedContentRange {
		t.Fatalf("DoD Step 1 Failed: Expected Content-Range '%s', got '%s'", expectedContentRange, contentRange)
	}
	if streamResp.Header.Get("Content-Length") != "1025" {
		t.Fatalf("DoD Step 1 Failed: Expected Content-Length 1025, got '%s'", streamResp.Header.Get("Content-Length"))
	}

	// Step 2: DoD Seek Latency < 100ms
	seekReq := httptest.NewRequest(http.MethodGet, fmt.Sprintf("/api/v1/audio/stream/%s", audioID), nil)
	seekReq.Header.Set("Range", "bytes=65536-98303")
	startSeek := time.Now()
	seekResp, err := app.Test(seekReq, -1)
	if err != nil {
		t.Fatalf("DoD Step 2 Failed: Seek request error: %v", err)
	}
	defer seekResp.Body.Close()
	_, _ = io.ReadAll(seekResp.Body)
	seekLatency := time.Since(startSeek)

	if seekLatency > 100*time.Millisecond {
		t.Fatalf("DoD Step 2 Failed: Seek latency %v exceeded 100ms threshold", seekLatency)
	}
	t.Logf("DoD Step 2 Succeeded: Audio seek latency = %v (< 100ms requirement)", seekLatency)

	// Step 3: Subtitles SRT & WebVTT
	srtReq := httptest.NewRequest(http.MethodGet, fmt.Sprintf("/api/v1/lessons/%s/subtitles.srt", audioID), nil)
	srtResp, err := app.Test(srtReq, -1)
	if err != nil || srtResp.StatusCode != http.StatusOK {
		t.Fatalf("DoD Step 3 Failed: GET subtitles.srt returned status %d", srtResp.StatusCode)
	}

	vttReq := httptest.NewRequest(http.MethodGet, fmt.Sprintf("/api/v1/lessons/%s/subtitles.vtt", audioID), nil)
	vttResp, err := app.Test(vttReq, -1)
	if err != nil || vttResp.StatusCode != http.StatusOK {
		t.Fatalf("DoD Step 3 Failed: GET subtitles.vtt returned status %d", vttResp.StatusCode)
	}
	vttBytes, _ := io.ReadAll(vttResp.Body)
	if !strings.HasPrefix(string(vttBytes), "WEBVTT") {
		t.Fatalf("DoD Step 3 Failed: VTT does not begin with WEBVTT")
	}

	// Step 4: Waveform JSON
	waveReq := httptest.NewRequest(http.MethodGet, fmt.Sprintf("/api/v1/lessons/%s/waveform.json", audioID), nil)
	waveResp, err := app.Test(waveReq, -1)
	if err != nil || waveResp.StatusCode != http.StatusOK {
		t.Fatalf("DoD Step 4 Failed: GET waveform.json returned status %d", waveResp.StatusCode)
	}

	// Step 5: Swagger UI endpoint
	swagReq := httptest.NewRequest(http.MethodGet, "/swagger", nil)
	swagResp, err := app.Test(swagReq, -1)
	if err != nil || swagResp.StatusCode != http.StatusOK {
		t.Fatalf("DoD Step 5 Failed: GET /swagger returned status %d", swagResp.StatusCode)
	}
}

