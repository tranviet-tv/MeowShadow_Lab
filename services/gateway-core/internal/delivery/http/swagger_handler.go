// Package http provides HTTP controllers and REST endpoints for gateway-core.
package http

import (
	_ "embed"
	"os"
	"path/filepath"

	"github.com/gofiber/fiber/v2"
)

//go:embed swagger_ui.html
var swaggerUIHTML []byte

// SwaggerHandler serves interactive OpenAPI 3.0 documentation via Swagger UI.
type SwaggerHandler struct {
	specPath string
}

// NewSwaggerHandler constructs a new SwaggerHandler instance.
func NewSwaggerHandler(specPath string) *SwaggerHandler {
	if specPath == "" {
		specPath = "docs/swagger.json"
	}
	return &SwaggerHandler{
		specPath: specPath,
	}
}

// RegisterRoutes mounts Swagger UI endpoints onto the Fiber router.
func (h *SwaggerHandler) RegisterRoutes(app fiber.Router) {
	app.Get("/swagger/doc.json", h.GetSpec)
	app.Get("/swagger", h.GetUI)
	app.Get("/swagger/", h.GetUI)
}

// GetSpec returns the raw OpenAPI 3.0 specification JSON.
func (h *SwaggerHandler) GetSpec(c *fiber.Ctx) error {
	candidates := []string{
		h.specPath,
		"docs/swagger.json",
		"../docs/swagger.json",
		"../../docs/swagger.json",
		"../../../docs/swagger.json",
		"services/gateway-core/docs/swagger.json",
		"../services/gateway-core/docs/swagger.json",
		"../../services/gateway-core/docs/swagger.json",
		"/app/docs/swagger.json",
	}


	for _, p := range candidates {
		if data, err := os.ReadFile(p); err == nil {
			c.Set("Content-Type", "application/json")
			return c.Send(data)
		}
	}

	// Fallback check in current directory tree
	if matches, err := filepath.Glob("**/swagger.json"); err == nil && len(matches) > 0 {
		if data, err := os.ReadFile(matches[0]); err == nil {
			c.Set("Content-Type", "application/json")
			return c.Send(data)
		}
	}

	return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
		"error": "OpenAPI specification file swagger.json not found",
	})
}

// GetUI delivers the standalone interactive Swagger UI HTML page.
func (h *SwaggerHandler) GetUI(c *fiber.Ctx) error {
	c.Set("Content-Type", "text/html; charset=utf-8")
	return c.Send(swaggerUIHTML)
}
