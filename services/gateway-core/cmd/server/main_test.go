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
	app := SetupApp(cfg, nil, nil)

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

func TestSetupApp_SwaggerEndpoints(t *testing.T) {
	cfg := config.LoadConfig()
	app := SetupApp(cfg, nil, nil)

	// Test GET /swagger
	reqSwagger := httptest.NewRequest(http.MethodGet, "/swagger", nil)
	respSwagger, err := app.Test(reqSwagger, -1)
	if err != nil {
		t.Fatalf("Failed to execute request to /swagger: %v", err)
	}
	if respSwagger.StatusCode != http.StatusOK {
		t.Errorf("Expected status 200 on /swagger, got %d", respSwagger.StatusCode)
	}

	// Test GET /swagger/doc.json
	reqDoc := httptest.NewRequest(http.MethodGet, "/swagger/doc.json", nil)
	respDoc, err := app.Test(reqDoc, -1)
	if err != nil {
		t.Fatalf("Failed to execute request to /swagger/doc.json: %v", err)
	}
	if respDoc.StatusCode != http.StatusOK {
		t.Errorf("Expected status 200 on /swagger/doc.json, got %d", respDoc.StatusCode)
	}
}

