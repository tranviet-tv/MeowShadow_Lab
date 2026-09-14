// Package main is the entrypoint for the gateway-core API service.
package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gofiber/fiber/v2"
	fiberWs "github.com/gofiber/websocket/v2"
	"meowshadow/gateway-core/config"
	deliveryHttp "meowshadow/gateway-core/internal/delivery/http"
	"meowshadow/gateway-core/internal/delivery/middleware"
	"meowshadow/gateway-core/internal/orchestrator"
	"meowshadow/gateway-core/internal/queue"
	"meowshadow/gateway-core/internal/repository"
	"meowshadow/gateway-core/internal/repository/db"
	"meowshadow/gateway-core/internal/repository/postgres"
	"meowshadow/gateway-core/internal/services"
	ws "meowshadow/gateway-core/internal/websocket"
	"meowshadow/gateway-core/pkg/response"
)

// SetupApp builds and configures the Fiber application with all middleware and routes.
func SetupApp(cfg *config.Config, authSvc services.AuthService, lessonSvc services.LessonService, opts ...interface{}) *fiber.App {
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

	var hub *ws.Hub
	var consumer orchestrator.PipelineConsumer

	for _, opt := range opts {
		switch v := opt.(type) {
		case *ws.Hub:
			hub = v
		case orchestrator.PipelineConsumer:
			consumer = v
		}
	}

	// Global Middlewares
	app.Use(middleware.NewRecover())
	app.Use(middleware.NewCORS(cfg.CORSAllowOrigins))
	app.Use(middleware.NewLogger())
	app.Use(middleware.NewRateLimiter(cfg.RateLimitMaxRequests, cfg.RateLimitExpirationSec))

	// Auth JWT Middleware
	jwtAuth := middleware.NewJWTAuth(cfg.JWTSecret)
	optionalJwtAuth := middleware.NewOptionalJWTAuth(cfg.JWTSecret)

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
		lessonHandler.RegisterRoutes(apiV1, jwtAuth, optionalJwtAuth)

		progressHandler := deliveryHttp.NewProgressHandler(lessonSvc)
		progressHandler.RegisterRoutes(apiV1, jwtAuth)
	}

	// Mount Async Audio Generation handler if consumer is provided
	if consumer != nil {
		audioHandler := deliveryHttp.NewAudioHandler(lessonSvc, consumer)
		audioHandler.RegisterRoutes(apiV1, jwtAuth)
	}

	// Mount Audio Range Streaming route
	audioStreamHandler := deliveryHttp.NewAudioStreamHandler(lessonSvc, cfg.StorageDir)
	audioStreamHandler.RegisterRoutes(apiV1)

	// Mount Static Asset Server routes (SRT, VTT, Waveform JSON, Export)
	assetsHandler := deliveryHttp.NewAssetsHandler(lessonSvc, cfg.StorageDir)
	assetsHandler.RegisterRoutes(apiV1)

	// Mount Swagger / OpenAPI 3.0 Documentation routes
	swaggerHandler := deliveryHttp.NewSwaggerHandler("docs/swagger.json")
	swaggerHandler.RegisterRoutes(app)

	// WebSocket Protocol Upgrade Middleware
	app.Use("/ws", func(c *fiber.Ctx) error {
		if fiberWs.IsWebSocketUpgrade(c) {
			return c.Next()
		}
		return fiber.ErrUpgradeRequired
	})

	if hub != nil {
		handleProgressWs := fiberWs.New(func(c *fiberWs.Conn) {
			jobID := c.Query("job_id")
			if jobID == "" {
				jobID = c.Query("taskId")
			}
			if jobID == "" {
				jobID = c.Params("taskId")
			}
			lessonID := c.Query("lesson_id")
			client := ws.NewClient(hub, c, jobID, lessonID)
			hub.Register(client)
			go client.WritePump()
			client.ReadPump()
		})

		app.Get("/ws/progress", handleProgressWs)
		app.Get("/ws/v1/progress", handleProgressWs)
		app.Get("/ws/v1/progress/:taskId", handleProgressWs)

		app.Get("/ws/lessons/:id", fiberWs.New(func(c *fiberWs.Conn) {
			lessonID := c.Params("id")
			jobID := c.Query("job_id")
			client := ws.NewClient(hub, c, jobID, lessonID)
			hub.Register(client)
			go client.WritePump()
			client.ReadPump()
		}))
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
	var lessonRepo repository.LessonRepository

	if pool != nil {
		queries := db.New(pool)
		userRepo := repository.NewUserRepository(queries)
		lessonRepo = repository.NewLessonRepository(queries)
		authSvc = services.NewAuthService(userRepo, cfg)
		lessonSvc = services.NewLessonService(lessonRepo)
	}

	// Initialize Redis Producer and Pipeline Orchestrator
	var redisProd queue.RedisProducer
	var pipelineConsumer orchestrator.PipelineConsumer

	rdb := queue.NewRedisClient(cfg.RedisAddr)
	if rdb != nil {
		// Retry connecting to Redis with a backoff loop
		var redisErr error
		for attempt := 1; attempt <= 5; attempt++ {
			pingCtx, cancel := context.WithTimeout(ctx, 2*time.Second)
			redisErr = rdb.Ping(pingCtx).Err()
			cancel()
			if redisErr == nil {
				log.Printf("Connected to Redis broker at %s (attempt %d)", cfg.RedisAddr, attempt)
				break
			}
			log.Printf("Waiting for Redis broker at %s (attempt %d/5): %v", cfg.RedisAddr, attempt, redisErr)
			time.Sleep(1 * time.Second)
		}

		redisProd = queue.NewRedisProducer(rdb)
		if lessonRepo != nil {
			pipelineConsumer = orchestrator.NewPipelineConsumer(redisProd, lessonRepo)
		}
		if redisErr != nil {
			log.Printf("Warning: Initial Redis ping failed, producer and pipeline consumer initialized for automatic reconnection: %v", redisErr)
		}
	}

	// Initialize WebSocket Hub
	hub := ws.NewHub()
	go hub.Run()
	defer hub.Close()

	// Forward Redis task event notifications to pipeline orchestrator and WebSocket hub
	if rdb != nil {
		go func() {
			pubsub := rdb.Subscribe(context.Background(), queue.ChannelTaskEvents)
			defer pubsub.Close()
			ch := pubsub.Channel()
			for msg := range ch {
				var evt orchestrator.WorkerEvent
				if err := json.Unmarshal([]byte(msg.Payload), &evt); err == nil {
					taskID := evt.TaskID
					if taskID == "" {
						taskID = evt.JobID
					}
					if pipelineConsumer != nil {
						if _, err := pipelineConsumer.HandleWorkerEvent(context.Background(), evt); err != nil {
							log.Printf("Pipeline event handler error: %v", err)
						}
					}
					hub.BroadcastProgress(orchestrator.ProgressBroadcastEvent{
						JobID:     taskID,
						LessonID:  evt.LessonID,
						Message:   string(evt.Type),
						Timestamp: time.Now(),
					})
				}
			}
		}()
	}

	// Initialize Storage Retention & Cleanup Worker (purges temp files > 24h)
	cleanupSvc := services.NewStorageCleanupService(services.CleanupConfig{
		StorageDir:        cfg.StorageDir,
		RetentionDuration: 24 * time.Hour,
		DryRun:            false,
	})
	cleanupCtx, cleanupCancel := context.WithCancel(context.Background())
	defer cleanupCancel()
	cleanupSvc.StartScheduler(cleanupCtx, 1*time.Hour)

	app := SetupApp(cfg, authSvc, lessonSvc, hub, pipelineConsumer)

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
