package http

import (
	"github.com/gofiber/fiber/v2"
	"meowshadow/gateway-core/internal/delivery/middleware"
	"meowshadow/gateway-core/internal/domain"
	"meowshadow/gateway-core/internal/services"
	"meowshadow/gateway-core/pkg/response"
)

// ProgressHandler handles learning progress queries and synchronizations.
type ProgressHandler struct {
	lessonService services.LessonService
}

// NewProgressHandler creates a new ProgressHandler instance.
func NewProgressHandler(lessonService services.LessonService) *ProgressHandler {
	return &ProgressHandler{
		lessonService: lessonService,
	}
}

// Get handles fetching user progress for a given lesson.
func (h *ProgressHandler) Get(c *fiber.Ctx) error {
	lessonID := c.Params("lessonId")
	if lessonID == "" {
		return response.Error(c, fiber.StatusBadRequest, "Invalid Request", "lessonId is required")
	}

	userID := middleware.GetAuthUserID(c)
	if userID == "" {
		return response.Error(c, fiber.StatusUnauthorized, "Unauthorized", "Authentication required to access progress")
	}

	progress, err := h.lessonService.GetProgress(c.Context(), userID, lessonID)
	if err != nil {
		return response.Error(c, fiber.StatusNotFound, "Progress Not Found", err.Error())
	}

	return response.Success(c, fiber.StatusOK, "Learning progress retrieved", progress)
}

// Sync handles updating playback offset, shadowing repetition count, and completion state.
func (h *ProgressHandler) Sync(c *fiber.Ctx) error {
	var req domain.SyncProgressRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "Invalid Request Body", err.Error())
	}
	req.Normalize()

	if req.LessonID == "" {
		return response.Error(c, fiber.StatusBadRequest, "Invalid Request", "lesson_id is required")
	}

	userID := middleware.GetAuthUserID(c)
	if userID == "" {
		return response.Error(c, fiber.StatusUnauthorized, "Unauthorized", "Authentication required to sync progress")
	}

	if err := h.lessonService.SyncProgress(c.Context(), userID, req); err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Sync Failed", err.Error())
	}

	return response.Success(c, fiber.StatusOK, "Learning progress synced successfully", fiber.Map{
		"lesson_id": req.LessonID,
		"status":    "synced",
	})
}

// RegisterRoutes registers progress endpoints onto the router.
func (h *ProgressHandler) RegisterRoutes(router fiber.Router, authMiddleware fiber.Handler) {
	group := router.Group("/progress", authMiddleware)
	group.Get("/:lessonId", h.Get)
	group.Post("/sync", h.Sync)
}
