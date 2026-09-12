// Package http provides HTTP route handlers for authentication, lessons, and health monitoring.
package http

import (
	"time"

	"github.com/gofiber/fiber/v2"
	"meowshadow/gateway-core/pkg/response"
)

// HealthHandler handles health check requests.
type HealthHandler struct {
	version string
}

// NewHealthHandler creates a new HealthHandler.
func NewHealthHandler(version string) *HealthHandler {
	if version == "" {
		version = "1.0.0"
	}
	return &HealthHandler{version: version}
}

// Check returns service health status and metadata.
func (h *HealthHandler) Check(c *fiber.Ctx) error {
	return response.Success(c, fiber.StatusOK, "Service is healthy", fiber.Map{
		"service":   "msl-gateway-core",
		"version":   h.version,
		"status":    "running",
		"timestamp": time.Now().UTC().Format(time.RFC3339),
	})
}

// RegisterRoutes mounts health endpoints to the given router.
func (h *HealthHandler) RegisterRoutes(router fiber.Router) {
	router.Get("/health", h.Check)
}
