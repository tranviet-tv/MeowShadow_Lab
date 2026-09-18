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

	contentType := "audio/mpeg"
	if strings.HasSuffix(strings.ToLower(filePath), ".wav") {
		contentType = "audio/wav"
	}

	// Case 1: No Range header present -> deliver full audio file with 200 OK
	if rangeHeader == "" {
		c.Set("Content-Type", contentType)
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
	c.Set("Content-Type", contentType)
	c.Set("Cache-Control", "public, max-age=3600")
	c.Status(fiber.StatusPartialContent)

	sectionReader := io.NewSectionReader(file, byteRange.Start, byteRange.Length)
	return c.SendStream(&sectionReadCloser{SectionReader: sectionReader, closer: file}, int(byteRange.Length))
}

// sectionReadCloser wraps an io.SectionReader and ensures the underlying file is closed upon completion.
type sectionReadCloser struct {
	*io.SectionReader
	closer io.Closer
}

// Close closes the underlying file descriptor.
func (s *sectionReadCloser) Close() error {
	if s.closer != nil {
		return s.closer.Close()
	}
	return nil
}

// resolveAudioFilePath locates the physical path of the audio file on disk.
func (h *AudioStreamHandler) resolveAudioFilePath(ctx context.Context, rawLessonID string) (string, error) {
	// Strip extensions and prefixes to support all url formats (.mp3, .wav, lesson_ prefix)
	lessonID := strings.TrimSuffix(rawLessonID, ".mp3")
	lessonID = strings.TrimSuffix(lessonID, ".wav")
	cleanUUID := strings.TrimPrefix(lessonID, "lesson_")

	// 1. Try querying lesson from database if service is available
	if h.lessonSvc != nil {
		for _, qID := range []string{cleanUUID, lessonID, rawLessonID} {
			lesson, err := h.lessonSvc.GetLessonByID(ctx, qID)
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
	}

	// 2. Direct storage search candidates for the specified lesson
	candidatePaths := []string{
		filepath.Join(h.storageDir, "audio", fmt.Sprintf("lesson_%s.mp3", cleanUUID)),
		filepath.Join(h.storageDir, "audio", fmt.Sprintf("lesson_%s.wav", cleanUUID)),
		filepath.Join(h.storageDir, "audio", fmt.Sprintf("lesson_%s.mp3", lessonID)),
		filepath.Join(h.storageDir, "audio", fmt.Sprintf("lesson_%s.wav", lessonID)),
		filepath.Join(h.storageDir, "audio", cleanUUID+".mp3"),
		filepath.Join(h.storageDir, "audio", cleanUUID+".wav"),
		filepath.Join(h.storageDir, "audio", lessonID+".mp3"),
		filepath.Join(h.storageDir, "audio", lessonID+".wav"),
		filepath.Join(h.storageDir, "audio", rawLessonID),
		filepath.Join(h.storageDir, rawLessonID),
		filepath.Join(h.storageDir, cleanUUID),
	}

	for _, p := range candidatePaths {
		if _, err := os.Stat(p); err == nil {
			return p, nil
		}
	}

	return "", fmt.Errorf("audio file for lesson '%s' not found on storage volume", rawLessonID)
}
