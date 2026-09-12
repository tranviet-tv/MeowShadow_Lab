// Package http provides HTTP controllers and REST endpoints for gateway-core.
package http

import (
	"context"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"
	"meowshadow/gateway-core/internal/services"
	"meowshadow/gateway-core/pkg/audioutil"
	"meowshadow/gateway-core/pkg/response"
)

// AudioStreamHandler handles HTTP 206 Partial Content audio range streaming.
type AudioStreamHandler struct {
	lessonSvc  services.LessonService
	storageDir string
}

// NewAudioStreamHandler constructs a new AudioStreamHandler instance.
func NewAudioStreamHandler(lessonSvc services.LessonService, storageDir string) *AudioStreamHandler {
	if storageDir == "" {
		storageDir = "./storage"
	}
	return &AudioStreamHandler{
		lessonSvc:  lessonSvc,
		storageDir: storageDir,
	}
}

// RegisterRoutes mounts audio streaming routes onto the provided Fiber router.
func (h *AudioStreamHandler) RegisterRoutes(router fiber.Router) {
	router.Get("/audio/stream/:id", h.StreamAudio)
}

// StreamAudio handles GET /api/v1/audio/stream/:id with RFC 7233 Range support.
func (h *AudioStreamHandler) StreamAudio(c *fiber.Ctx) error {
	lessonID := c.Params("id")
	if lessonID == "" {
		return response.Error(c, fiber.StatusBadRequest, "Bad Request", "Lesson ID is required")
	}

	filePath, err := h.resolveAudioFilePath(c.UserContext(), lessonID)
	if err != nil {
		return response.Error(c, fiber.StatusNotFound, "Audio Not Found", err.Error())
	}

	file, err := os.Open(filePath)
	if err != nil {
		return response.Error(c, fiber.StatusNotFound, "File Missing", "Audio file cannot be accessed on storage volume")
	}

	stat, err := file.Stat()
	if err != nil {
		_ = file.Close()
		return response.Error(c, fiber.StatusInternalServerError, "Storage Error", "Failed to inspect audio file")
	}
	totalSize := stat.Size()

	rangeHeader := c.Get("Range")

	// Case 1: No Range header present -> deliver full audio file with 200 OK
	if rangeHeader == "" {
		c.Set("Content-Type", "audio/mpeg")
		c.Set("Accept-Ranges", "bytes")
		c.Set("Content-Length", strconv.FormatInt(totalSize, 10))
		c.Set("Cache-Control", "public, max-age=3600")
		c.Status(fiber.StatusOK)
		return c.SendStream(file, int(totalSize))
	}

	// Case 2: Range header present -> parse and validate requested byte range
	byteRange, err := audioutil.ParseByteRange(rangeHeader, totalSize)
	if err != nil {
		_ = file.Close()
		if errors.Is(err, audioutil.ErrUnsatisfiableRange) {
			c.Set("Content-Range", fmt.Sprintf("bytes */%d", totalSize))
			return c.Status(fiber.StatusRequestedRangeNotSatisfiable).SendString("Range Not Satisfiable")
		}
		return c.Status(fiber.StatusBadRequest).SendString("Invalid Range Header")
	}

	// Case 3: Valid Range -> deliver 206 Partial Content using efficient SectionReader
	c.Set("Content-Range", byteRange.ContentRangeHeader())
	c.Set("Accept-Ranges", "bytes")
	c.Set("Content-Length", strconv.FormatInt(byteRange.Length, 10))
	c.Set("Content-Type", "audio/mpeg")
	c.Set("Cache-Control", "public, max-age=3600")
	c.Status(fiber.StatusPartialContent)

	sectionReader := io.NewSectionReader(file, byteRange.Start, byteRange.Length)
	return c.SendStream(sectionReader, int(byteRange.Length))
}

// resolveAudioFilePath locates the physical path of the audio file on disk.
func (h *AudioStreamHandler) resolveAudioFilePath(ctx context.Context, lessonID string) (string, error) {
	// 1. Try querying lesson from database if service is available
	if h.lessonSvc != nil {
		lesson, err := h.lessonSvc.GetLessonByID(ctx, lessonID)
		if err == nil && lesson != nil && lesson.AudioFilePath != "" {
			path := lesson.AudioFilePath
			if _, err := os.Stat(path); err == nil {
				return path, nil
			}

			// Map container path /app/storage to host storageDir if needed
			if strings.HasPrefix(path, "/app/storage/") {
				relPath := strings.TrimPrefix(path, "/app/storage/")
				mapped := filepath.Join(h.storageDir, relPath)
				if _, err := os.Stat(mapped); err == nil {
					return mapped, nil
				}
			}
		}
	}

	// 2. Direct storage search fallbacks
	candidatePaths := []string{
		filepath.Join(h.storageDir, "audio", lessonID+".mp3"),
		filepath.Join(h.storageDir, "audio", fmt.Sprintf("lesson_%s.mp3", lessonID)),
		filepath.Join(h.storageDir, lessonID),
		filepath.Join(h.storageDir, "audio", "test_output_master.mp3"),
		filepath.Join(h.storageDir, "audio", "full_simulation_lesson.mp3"),
	}

	for _, p := range candidatePaths {
		if _, err := os.Stat(p); err == nil {
			return p, nil
		}
	}

	return "", fmt.Errorf("audio file for lesson '%s' not found on storage volume", lessonID)
}
