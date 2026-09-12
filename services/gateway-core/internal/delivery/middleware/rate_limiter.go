package middleware

import (
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/limiter"
	"meowshadow/gateway-core/pkg/response"
)

// NewRateLimiter creates IP-based rate limiting middleware.
func NewRateLimiter(maxRequests, expirationSec int) fiber.Handler {
	if maxRequests <= 0 {
		maxRequests = 100
	}
	if expirationSec <= 0 {
		expirationSec = 60
	}

	return limiter.New(limiter.Config{
		Max:        maxRequests,
		Expiration: time.Duration(expirationSec) * time.Second,
		KeyGenerator: func(c *fiber.Ctx) string {
			return c.IP()
		},
		LimitReached: func(c *fiber.Ctx) error {
			return response.Error(
				c,
				fiber.StatusTooManyRequests,
				"Too Many Requests",
				"Rate limit exceeded. Please try again later.",
			)
		},
	})
}
