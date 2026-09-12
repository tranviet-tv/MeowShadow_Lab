package middleware

import (
	"strings"

	"github.com/gofiber/fiber/v2"
	pkgJwt "meowshadow/gateway-core/pkg/jwt"
	"meowshadow/gateway-core/pkg/response"
)

// Context keys for authenticated user information.
const (
	ContextKeyUserID  = "user_id"
	ContextKeyEmail   = "email"
	ContextKeyIsGuest = "is_guest"
)

// NewJWTAuth creates middleware that verifies Bearer JWT tokens.
func NewJWTAuth(secret string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return response.Error(
				c,
				fiber.StatusUnauthorized,
				"Unauthorized",
				"Missing Authorization header",
			)
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
			return response.Error(
				c,
				fiber.StatusUnauthorized,
				"Unauthorized",
				"Invalid Authorization header format. Expected 'Bearer <token>'",
			)
		}

		tokenString := parts[1]
		claims, err := pkgJwt.ValidateToken(tokenString, secret)
		if err != nil {
			return response.Error(
				c,
				fiber.StatusUnauthorized,
				"Unauthorized",
				"Invalid, malformed, or expired token",
			)
		}

		// Save claims to context for downstream handlers
		c.Locals(ContextKeyUserID, claims.UserID)
		c.Locals(ContextKeyEmail, claims.Email)
		c.Locals(ContextKeyIsGuest, claims.IsGuest)

		return c.Next()
	}
}

// GetAuthUserID extracts the authenticated user's ID from Fiber context.
func GetAuthUserID(c *fiber.Ctx) string {
	if val := c.Locals(ContextKeyUserID); val != nil {
		if id, ok := val.(string); ok {
			return id
		}
	}
	return ""
}

// IsGuestUser checks if the current request is operating under a guest session.
func IsGuestUser(c *fiber.Ctx) bool {
	if val := c.Locals(ContextKeyIsGuest); val != nil {
		if isGuest, ok := val.(bool); ok {
			return isGuest
		}
	}
	return false
}
