package http

import (
	"github.com/gofiber/fiber/v2"
	"meowshadow/gateway-core/internal/delivery/middleware"
	"meowshadow/gateway-core/internal/services"
	"meowshadow/gateway-core/pkg/response"
)

// AuthHandler handles HTTP requests for user authentication and session management.
type AuthHandler struct {
	authService services.AuthService
}

// NewAuthHandler creates a new AuthHandler.
func NewAuthHandler(authService services.AuthService) *AuthHandler {
	return &AuthHandler{
		authService: authService,
	}
}

// Register creates a new user account.
func (h *AuthHandler) Register(c *fiber.Ctx) error {
	var req services.RegisterRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "Invalid Request Body", err.Error())
	}

	authRes, err := h.authService.Register(c.Context(), req)
	if err != nil {
		if err == services.ErrUserAlreadyExists {
			return response.Error(c, fiber.StatusConflict, "User Conflict", err.Error())
		}
		return response.Error(c, fiber.StatusBadRequest, "Registration Failed", err.Error())
	}

	return response.Success(c, fiber.StatusCreated, "User registered successfully", authRes)
}

// Login authenticates an existing user.
func (h *AuthHandler) Login(c *fiber.Ctx) error {
	var req services.LoginRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "Invalid Request Body", err.Error())
	}

	authRes, err := h.authService.Login(c.Context(), req)
	if err != nil {
		return response.Error(c, fiber.StatusUnauthorized, "Authentication Failed", err.Error())
	}

	return response.Success(c, fiber.StatusOK, "Login successful", authRes)
}

// Guest generates a temporary guest exploration session.
func (h *AuthHandler) Guest(c *fiber.Ctx) error {
	authRes, err := h.authService.GuestLogin(c.Context())
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Guest Login Failed", err.Error())
	}

	return response.Success(c, fiber.StatusOK, "Guest session created successfully", authRes)
}

// Me retrieves the authenticated user's profile.
func (h *AuthHandler) Me(c *fiber.Ctx) error {
	userID := middleware.GetAuthUserID(c)
	if userID == "" {
		return response.Error(c, fiber.StatusUnauthorized, "Unauthorized", "User context missing")
	}

	profile, err := h.authService.GetProfile(c.Context(), userID)
	if err != nil {
		return response.Error(c, fiber.StatusNotFound, "User Not Found", err.Error())
	}

	return response.Success(c, fiber.StatusOK, "Profile retrieved successfully", profile)
}

// RegisterRoutes registers all authentication endpoints onto the router.
func (h *AuthHandler) RegisterRoutes(router fiber.Router, authMiddleware fiber.Handler) {
	authGroup := router.Group("/auth")
	authGroup.Post("/register", h.Register)
	authGroup.Post("/login", h.Login)
	authGroup.Post("/guest", h.Guest)
	authGroup.Get("/me", authMiddleware, h.Me)
}
