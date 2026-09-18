package http

import (
	"strconv"

	"github.com/gofiber/fiber/v2"
	"meowshadow/gateway-core/internal/delivery/middleware"
	"meowshadow/gateway-core/internal/domain"
	"meowshadow/gateway-core/internal/services"
	"meowshadow/gateway-core/pkg/response"
)

// LessonHandler handles HTTP requests for managing shadowing lessons.
type LessonHandler struct {
	lessonService services.LessonService
}

// NewLessonHandler creates a new LessonHandler.
func NewLessonHandler(lessonService services.LessonService) *LessonHandler {
	return &LessonHandler{
		lessonService: lessonService,
	}
}

// Create handles creating a new lesson with structured script chunks.
func (h *LessonHandler) Create(c *fiber.Ctx) error {
	var req domain.CreateLessonRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "Invalid Request Body", err.Error())
	}
	req.Normalize()

	userID := middleware.GetAuthUserID(c)
	isGuest := middleware.IsGuestUser(c)

	created, err := h.lessonService.CreateLesson(c.Context(), userID, isGuest, req)
	if err != nil {
		return response.Error(c, fiber.StatusBadRequest, "Failed to Create Lesson", err.Error())
	}

	return response.Success(c, fiber.StatusCreated, "Lesson created successfully", created)
}

// GetByID retrieves an individual lesson by its unique identifier.
func (h *LessonHandler) GetByID(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return response.Error(c, fiber.StatusBadRequest, "Invalid Request", "Lesson ID is required")
	}

	lesson, err := h.lessonService.GetLessonByID(c.Context(), id)
	if err != nil {
		if err == services.ErrLessonNotFound {
			return response.Error(c, fiber.StatusNotFound, "Lesson Not Found", err.Error())
		}
		return response.Error(c, fiber.StatusBadRequest, "Failed to Retrieve Lesson", err.Error())
	}

	return response.Success(c, fiber.StatusOK, "Lesson retrieved successfully", lesson)
}

// List retrieves a paginated list of lessons for the authenticated user or guest.
func (h *LessonHandler) List(c *fiber.Ctx) error {
	page, _ := strconv.ParseInt(c.Query("page", "1"), 10, 64)
	limit, _ := strconv.ParseInt(c.Query("limit", "10"), 10, 64)

	userID := middleware.GetAuthUserID(c)
	isGuest := middleware.IsGuestUser(c)

	lessons, total, err := h.lessonService.ListLessons(c.Context(), userID, isGuest, page, limit)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Failed to List Lessons", err.Error())
	}

	return response.Paginated(c, fiber.StatusOK, "Lessons retrieved successfully", lessons, page, limit, total)
}

// Delete removes a lesson by ID.
func (h *LessonHandler) Delete(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return response.Error(c, fiber.StatusBadRequest, "Invalid Request", "Lesson ID is required")
	}

	if err := h.lessonService.DeleteLesson(c.Context(), id); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "Failed to Delete Lesson", err.Error())
	}

	return response.Success(c, fiber.StatusOK, "Lesson deleted successfully", fiber.Map{
		"deleted_id": id,
	})
}

// RegisterRoutes registers all lesson endpoints onto the router.
func (h *LessonHandler) RegisterRoutes(router fiber.Router, authMiddleware fiber.Handler, optionalAuthMiddleware ...fiber.Handler) {
	optAuth := authMiddleware
	if len(optionalAuthMiddleware) > 0 && optionalAuthMiddleware[0] != nil {
		optAuth = optionalAuthMiddleware[0]
	}

	router.Post("/lessons", authMiddleware, h.Create)
	router.Get("/lessons", optAuth, h.List)
	router.Get("/lessons/:id", optAuth, h.GetByID)
	router.Delete("/lessons/:id", authMiddleware, h.Delete)
}
