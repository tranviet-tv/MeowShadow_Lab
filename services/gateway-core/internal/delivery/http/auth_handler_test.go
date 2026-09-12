package http

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"meowshadow/gateway-core/config"
	"meowshadow/gateway-core/internal/delivery/middleware"
	"meowshadow/gateway-core/internal/repository/db"
	"meowshadow/gateway-core/internal/services"
	"meowshadow/gateway-core/pkg/response"
)

type mockUserRepo struct {
	users map[string]*db.User
}

func (m *mockUserRepo) CreateUser(ctx context.Context, email, passwordHash, fullName string) (*db.CreateUserRow, error) {
	newID := uuid.New()
	var pgUUID pgtype.UUID
	copy(pgUUID.Bytes[:], newID[:])
	pgUUID.Valid = true

	u := &db.User{
		ID:           pgUUID,
		Email:        email,
		PasswordHash: passwordHash,
		FullName:     pgtype.Text{String: fullName, Valid: true},
		CreatedAt:    pgtype.Timestamptz{Time: time.Now().UTC(), Valid: true},
	}
	m.users[email] = u
	return &db.CreateUserRow{
		ID:       pgUUID,
		Email:    email,
		FullName: u.FullName,
	}, nil
}

func (m *mockUserRepo) GetUserByEmail(ctx context.Context, email string) (*db.User, error) {
	if u, ok := m.users[email]; ok {
		return u, nil
	}
	return nil, nil
}

func (m *mockUserRepo) GetUserByID(ctx context.Context, id pgtype.UUID) (*db.User, error) {
	for _, u := range m.users {
		if u.ID == id {
			return u, nil
		}
	}
	return nil, nil
}

func setupTestApp() (*fiber.App, services.AuthService, *config.Config) {
	cfg := &config.Config{
		JWTSecret:           "super_secret_for_test_1234567890",
		JWTAccessExpMinutes: 15,
		JWTRefreshExpDays:   7,
	}
	repo := &mockUserRepo{users: make(map[string]*db.User)}
	authSvc := services.NewAuthService(repo, cfg)
	authHandler := NewAuthHandler(authSvc)
	jwtAuth := middleware.NewJWTAuth(cfg.JWTSecret)

	app := fiber.New()
	apiV1 := app.Group("/api/v1")
	authHandler.RegisterRoutes(apiV1, jwtAuth)

	return app, authSvc, cfg
}

func TestAuthHandler_EndToEnd(t *testing.T) {
	app, _, _ := setupTestApp()

	// 1. Test POST /api/v1/auth/register
	regPayload := map[string]string{
		"email":     "learner@meowshadow.local",
		"password":  "learning123",
		"full_name": "Shadowing Learner",
	}
	body, _ := json.Marshal(regPayload)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/register", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("Register request failed: %v", err)
	}
	if resp.StatusCode != http.StatusCreated {
		t.Fatalf("Expected 201 Created, got %d", resp.StatusCode)
	}

	var regRes response.Response
	json.NewDecoder(resp.Body).Decode(&regRes)
	if !regRes.Success {
		t.Fatalf("Expected success true on register")
	}

	// 2. Test POST /api/v1/auth/login
	loginPayload := map[string]string{
		"email":    "learner@meowshadow.local",
		"password": "learning123",
	}
	body, _ = json.Marshal(loginPayload)
	req = httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	resp, err = app.Test(req, -1)
	if err != nil {
		t.Fatalf("Login request failed: %v", err)
	}
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("Expected 200 OK on login, got %d", resp.StatusCode)
	}

	var loginRes response.Response
	json.NewDecoder(resp.Body).Decode(&loginRes)
	dataMap := loginRes.Data.(map[string]interface{})
	tokensMap := dataMap["tokens"].(map[string]interface{})
	accessToken := tokensMap["access_token"].(string)

	// 3. Test GET /api/v1/auth/me with Bearer Token
	req = httptest.NewRequest(http.MethodGet, "/api/v1/auth/me", nil)
	req.Header.Set("Authorization", "Bearer "+accessToken)

	resp, err = app.Test(req, -1)
	if err != nil {
		t.Fatalf("Get profile request failed: %v", err)
	}
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("Expected 200 OK on /me, got %d", resp.StatusCode)
	}

	// 4. Test GET /api/v1/auth/me without Token (should return 401)
	req = httptest.NewRequest(http.MethodGet, "/api/v1/auth/me", nil)
	resp, err = app.Test(req, -1)
	if err != nil {
		t.Fatalf("Unauthenticated request failed: %v", err)
	}
	if resp.StatusCode != http.StatusUnauthorized {
		t.Fatalf("Expected 401 Unauthorized, got %d", resp.StatusCode)
	}

	// 5. Test POST /api/v1/auth/guest
	req = httptest.NewRequest(http.MethodPost, "/api/v1/auth/guest", nil)
	resp, err = app.Test(req, -1)
	if err != nil {
		t.Fatalf("Guest login request failed: %v", err)
	}
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("Expected 200 OK on guest login, got %d", resp.StatusCode)
	}
}
