// Package main is the entrypoint for the gateway-core API service.
package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gofiber/fiber/v2"
	"meowshadow/gateway-core/config"
	deliveryHttp "meowshadow/gateway-core/internal/delivery/http"
	"meowshadow/gateway-core/internal/delivery/middleware"
	"meowshadow/gateway-core/internal/repository"
	"meowshadow/gateway-core/internal/repository/db"
	"meowshadow/gateway-core/internal/repository/postgres"
	"meowshadow/gateway-core/internal/services"
	"meowshadow/gateway-core/pkg/response"
)

// SetupApp builds and configures the Fiber application with all middleware and routes.
func SetupApp(cfg *config.Config, authSvc services.AuthService, lessonSvc services.LessonService) *fiber.App {
	app := fiber.New(fiber.Config{
		AppName:      "MeowShadow Gateway Core v1.0.0",
		ServerHeader: "Fiber",
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			code := fiber.StatusInternalServerError
			if e, ok := err.(*fiber.Error); ok {
				code = e.Code
			}
			return response.Error(c, code, "Request Error", err.Error())
		},
	})

	// Global Middlewares
	app.Use(middleware.NewRecover())
	app.Use(middleware.NewCORS(cfg.CORSAllowOrigins))
	app.Use(middleware.NewLogger())
	app.Use(middleware.NewRateLimiter(cfg.RateLimitMaxRequests, cfg.RateLimitExpirationSec))

	// Auth JWT Middleware
	jwtAuth := middleware.NewJWTAuth(cfg.JWTSecret)

	// Root identification endpoint
	app.Get("/", func(c *fiber.Ctx) error {
		return response.Success(c, fiber.StatusOK, "MeowShadow Gateway Core is running", fiber.Map{
			"service": "msl-gateway-core",
			"version": "1.0.0",
			"docs":    "/api/v1/health",
		})
	})

	// Top-level health check endpoint
	healthHandler := deliveryHttp.NewHealthHandler("1.0.0")
	app.Get("/health", healthHandler.Check)

	// API v1 Central Router Group
	apiV1 := app.Group("/api/v1")
	healthHandler.RegisterRoutes(apiV1)

	// Mount Auth routes if service is provided
	if authSvc != nil {
		authHandler := deliveryHttp.NewAuthHandler(authSvc)
		authHandler.RegisterRoutes(apiV1, jwtAuth)
	}

	// Mount Lesson CRUD routes if service is provided
	if lessonSvc != nil {
		lessonHandler := deliveryHttp.NewLessonHandler(lessonSvc)
		lessonHandler.RegisterRoutes(apiV1, jwtAuth)
	}

	// Custom 404 handler
	app.Use(func(c *fiber.Ctx) error {
		return response.Error(c, fiber.StatusNotFound, "Not Found", fmt.Sprintf("Route '%s' not found", c.Path()))
	})

	return app
}

func main() {
	cfg := config.LoadConfig()
	ctx := context.Background()

	// Initialize database connection pool
	pool, err := postgres.NewPool(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Printf("Warning: Failed to initialize PostgreSQL pool: %v", err)
	}
	defer func() {
		if pool != nil {
			pool.Close()
		}
	}()

	var authSvc services.AuthService
	var lessonSvc services.LessonService

	if pool != nil {
		queries := db.New(pool)
		userRepo := repository.NewUserRepository(queries)
		lessonRepo := repository.NewLessonRepository(queries)
		authSvc = services.NewAuthService(userRepo, cfg)
		lessonSvc = services.NewLessonService(lessonRepo)
	}

	app := SetupApp(cfg, authSvc, lessonSvc)

	// Channel to listen for OS signals for graceful shutdown
	shutdownChan := make(chan os.Signal, 1)
	signal.Notify(shutdownChan, os.Interrupt, syscall.SIGTERM)

	addr := fmt.Sprintf(":%s", cfg.Port)
	go func() {
		log.Printf("Starting MeowShadow Gateway Core on %s (env: %s)...", addr, cfg.Env)
		if err := app.Listen(addr); err != nil {
			log.Printf("Server listen ended: %v", err)
		}
	}()

	// Block until signal is received
	sig := <-shutdownChan
	log.Printf("Received signal %s. Initiating graceful shutdown...", sig)

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := app.ShutdownWithContext(shutdownCtx); err != nil {
		log.Fatalf("Server forced to shutdown with error: %v", err)
	}

	log.Println("MeowShadow Gateway Core shutdown complete.")
}
