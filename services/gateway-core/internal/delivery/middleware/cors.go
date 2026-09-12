package middleware

import (
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
)

// NewCORS creates and configures Cross-Origin Resource Sharing middleware.
func NewCORS(allowedOrigins string) fiber.Handler {
	if allowedOrigins == "" {
		allowedOrigins = "*"
	}
	return cors.New(cors.Config{
		AllowOrigins: allowedOrigins,
		AllowHeaders: "Origin, Content-Type, Accept, Authorization, Range",
		AllowMethods: "GET, POST, HEAD, PUT, DELETE, PATCH, OPTIONS",
		ExposeHeaders: "Content-Range, Accept-Ranges, Content-Length",
		AllowCredentials: false,
	})
}
