package middleware

import (
	"log"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"meowshadow/gateway-core/pkg/response"
)

// NewRecover creates panic recovery middleware returning a graceful 500 error response.
func NewRecover() fiber.Handler {
	return recover.New(recover.Config{
		EnableStackTrace: true,
		StackTraceHandler: func(c *fiber.Ctx, e interface{}) {
			log.Printf("[PANIC RECOVERED] %v", e)
			_ = response.Error(c, fiber.StatusInternalServerError, "Internal Server Error", "An unexpected error occurred")
		},
	})
}
