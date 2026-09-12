package main

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"

	"meowshadow/gateway-core/config"
	"meowshadow/gateway-core/pkg/response"
)

func TestSetupApp_HealthEndpoints(t *testing.T) {
	cfg := config.LoadConfig()
	app := SetupApp(cfg)

	// Test 1: GET /health
	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("Failed to execute request to /health: %v", err)
	}
	if resp.StatusCode != http.StatusOK {
		t.Errorf("Expected status 200 on /health, got %d", resp.StatusCode)
	}

	bodyBytes, _ := io.ReadAll(resp.Body)
	var res response.Response
	if err := json.Unmarshal(bodyBytes, &res); err != nil {
		t.Fatalf("Failed to parse JSON response: %v", err)
	}
	if !res.Success {
		t.Errorf("Expected success true, got false")
	}

	// Test 2: GET /api/v1/health
	reqV1 := httptest.NewRequest(http.MethodGet, "/api/v1/health", nil)
	respV1, err := app.Test(reqV1, -1)
	if err != nil {
		t.Fatalf("Failed to execute request to /api/v1/health: %v", err)
	}
	if respV1.StatusCode != http.StatusOK {
		t.Errorf("Expected status 200 on /api/v1/health, got %d", respV1.StatusCode)
	}

	// Test 3: GET / (root identification)
	reqRoot := httptest.NewRequest(http.MethodGet, "/", nil)
	respRoot, err := app.Test(reqRoot, -1)
	if err != nil {
		t.Fatalf("Failed to execute request to /: %v", err)
	}
	if respRoot.StatusCode != http.StatusOK {
		t.Errorf("Expected status 200 on /, got %d", respRoot.StatusCode)
	}

	// Test 4: 404 Route Not Found
	req404 := httptest.NewRequest(http.MethodGet, "/non-existent-path", nil)
	resp404, err := app.Test(req404, -1)
	if err != nil {
		t.Fatalf("Failed to execute request to 404 route: %v", err)
	}
	if resp404.StatusCode != http.StatusNotFound {
		t.Errorf("Expected status 404, got %d", resp404.StatusCode)
	}
}
