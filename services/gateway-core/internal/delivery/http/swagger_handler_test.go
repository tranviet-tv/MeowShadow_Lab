package http_test

import (
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/gofiber/fiber/v2"
	deliveryHttp "meowshadow/gateway-core/internal/delivery/http"
)

func TestSwaggerHandler_Endpoints(t *testing.T) {
	tempDir := t.TempDir()
	specFile := filepath.Join(tempDir, "swagger.json")
	dummySpec := `{"openapi":"3.0.3","info":{"title":"Test API"}}`
	_ = os.WriteFile(specFile, []byte(dummySpec), 0644)

	app := fiber.New()
	swaggerHandler := deliveryHttp.NewSwaggerHandler(specFile)
	swaggerHandler.RegisterRoutes(app)

	// 1. Test GET /swagger
	reqUI := httptest.NewRequest(http.MethodGet, "/swagger", nil)
	respUI, err := app.Test(reqUI, -1)
	if err != nil {
		t.Fatalf("request /swagger failed: %v", err)
	}
	if respUI.StatusCode != http.StatusOK {
		t.Fatalf("expected status 200 on /swagger, got %d", respUI.StatusCode)
	}
	bodyUI, _ := io.ReadAll(respUI.Body)
	if !strings.Contains(string(bodyUI), "swagger-ui") {
		t.Fatalf("expected HTML containing swagger-ui div")
	}

	// 2. Test GET /swagger/doc.json
	reqDoc := httptest.NewRequest(http.MethodGet, "/swagger/doc.json", nil)
	respDoc, err := app.Test(reqDoc, -1)
	if err != nil {
		t.Fatalf("request /swagger/doc.json failed: %v", err)
	}
	if respDoc.StatusCode != http.StatusOK {
		t.Fatalf("expected status 200 on /swagger/doc.json, got %d", respDoc.StatusCode)
	}
	bodyDoc, _ := io.ReadAll(respDoc.Body)
	if !strings.Contains(string(bodyDoc), "openapi") {
		t.Fatalf("expected JSON containing openapi field")
	}
}
