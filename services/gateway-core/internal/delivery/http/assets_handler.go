// Package http provides HTTP controllers and REST endpoints for gateway-core.
package http

import (
	"archive/zip"
	"bytes"
	"encoding/json"
	"fmt"
	"math"
	"os"
	"path/filepath"
	"strings"

	"github.com/gofiber/fiber/v2"
	"meowshadow/gateway-core/internal/domain"
	"meowshadow/gateway-core/internal/services"
	"meowshadow/gateway-core/pkg/audioutil"
	"meowshadow/gateway-core/pkg/response"
)

// AssetsHandler distributes static subtitle files (SRT, VTT) and waveform peak data.
type AssetsHandler struct {
	lessonSvc  services.LessonService
	storageDir string
}

// NewAssetsHandler constructs an AssetsHandler instance.
func NewAssetsHandler(lessonSvc services.LessonService, storageDir string) *AssetsHandler {
	if storageDir == "" {
		storageDir = "./storage"
	}
	return &AssetsHandler{
		lessonSvc:  lessonSvc,
		storageDir: storageDir,
	}
}

// RegisterRoutes mounts asset distribution endpoints on the provided Fiber router.
func (h *AssetsHandler) RegisterRoutes(router fiber.Router) {
	router.Get("/lessons/:id/subtitles.srt", h.GetSubtitlesSrt)
	router.Get("/lessons/:id/subtitles.vtt", h.GetSubtitlesVtt)
	router.Get("/lessons/:id/subtitles", h.GetSubtitlesGeneric)
	router.Get("/lessons/:id/waveform.json", h.GetWaveformJson)
	router.Get("/lessons/:id/waveform", h.GetWaveformJson)
	router.Get("/lessons/:id/export", h.ExportLesson)
}

// GetSubtitlesSrt distributes SubRip format subtitle files.
func (h *AssetsHandler) GetSubtitlesSrt(c *fiber.Ctx) error {
	lessonID := c.Params("id")
	if lessonID == "" {
		return response.Error(c, fiber.StatusBadRequest, "Bad Request", "Lesson ID is required")
	}

	lesson, srtPath := h.resolveSrtPath(c, lessonID)

	// 1. If file exists on storage volume, deliver it directly
	if srtPath != "" {
		data, err := os.ReadFile(srtPath)
		if err == nil {
			c.Set("Content-Type", "text/plain; charset=utf-8")
			c.Set("Cache-Control", "public, max-age=3600")
			return c.Send(data)
		}
	}

	// 2. If lesson exists with chunks, generate SRT dynamically
	if lesson != nil && len(lesson.TranscriptChunks) > 0 {
		srtContent := audioutil.GenerateSrtFromChunks(lesson.TranscriptChunks, lesson.DurationSec)
		c.Set("Content-Type", "text/plain; charset=utf-8")
		c.Set("Cache-Control", "public, max-age=3600")
		return c.SendString(srtContent)
	}

	return response.Error(c, fiber.StatusNotFound, "Subtitles Not Found", fmt.Sprintf("SRT file for lesson '%s' not found", lessonID))
}

// GetSubtitlesVtt distributes WebVTT format subtitle files with dynamic conversion from SRT if needed.
func (h *AssetsHandler) GetSubtitlesVtt(c *fiber.Ctx) error {
	lessonID := c.Params("id")
	if lessonID == "" {
		return response.Error(c, fiber.StatusBadRequest, "Bad Request", "Lesson ID is required")
	}

	// 1. Check if a dedicated .vtt file exists on disk
	vttCandidate := filepath.Join(h.storageDir, "subtitles", fmt.Sprintf("lesson_%s.vtt", lessonID))
	if data, err := os.ReadFile(vttCandidate); err == nil {
		c.Set("Content-Type", "text/vtt; charset=utf-8")
		c.Set("Cache-Control", "public, max-age=3600")
		return c.Send(data)
	}

	lesson, srtPath := h.resolveSrtPath(c, lessonID)

	// 2. If SRT file exists, convert it to WebVTT dynamically
	if srtPath != "" {
		srtBytes, err := os.ReadFile(srtPath)
		if err == nil {
			vttContent := audioutil.ConvertSrtToVtt(string(srtBytes))
			c.Set("Content-Type", "text/vtt; charset=utf-8")
			c.Set("Cache-Control", "public, max-age=3600")
			return c.SendString(vttContent)
		}
	}

	// 3. If lesson exists with chunks, generate WebVTT directly
	if lesson != nil && len(lesson.TranscriptChunks) > 0 {
		vttContent := audioutil.GenerateVttFromChunks(lesson.TranscriptChunks, lesson.DurationSec)
		c.Set("Content-Type", "text/vtt; charset=utf-8")
		c.Set("Cache-Control", "public, max-age=3600")
		return c.SendString(vttContent)
	}

	return response.Error(c, fiber.StatusNotFound, "Subtitles Not Found", fmt.Sprintf("WebVTT file for lesson '%s' not found", lessonID))
}

// GetWaveformJson distributes normalized audio waveform points for WaveSurfer / Player visualization.
func (h *AssetsHandler) GetWaveformJson(c *fiber.Ctx) error {
	rawLessonID := c.Params("id")
	if rawLessonID == "" {
		return response.Error(c, fiber.StatusBadRequest, "Bad Request", "Lesson ID is required")
	}

	lessonID := strings.TrimSuffix(rawLessonID, ".json")
	cleanUUID := strings.TrimPrefix(lessonID, "lesson_")

	// 1. Look for pre-generated waveform json on disk
	candidates := []string{
		filepath.Join(h.storageDir, "audio", fmt.Sprintf("lesson_%s_waveform.json", cleanUUID)),
		filepath.Join(h.storageDir, "audio", fmt.Sprintf("lesson_%s_waveform.json", lessonID)),
		filepath.Join(h.storageDir, "audio", fmt.Sprintf("%s_waveform.json", cleanUUID)),
		filepath.Join(h.storageDir, "audio", fmt.Sprintf("%s_waveform.json", lessonID)),
	}

	for _, p := range candidates {
		if data, err := os.ReadFile(p); err == nil {
			c.Set("Content-Type", "application/json")
			c.Set("Cache-Control", "public, max-age=3600")
			return c.Send(data)
		}
	}

	// 2. Generate normalized fallback waveform (100 points) so UI player displays immediately
	var duration float64 = 60.0
	if h.lessonSvc != nil {
		for _, qID := range []string{cleanUUID, lessonID, rawLessonID} {
			if l, err := h.lessonSvc.GetLessonByID(c.UserContext(), qID); err == nil && l != nil {
				if l.DurationSec > 0 {
					duration = l.DurationSec
					break
				}
			}
		}
	}

	peaks := make([]float64, 100)
	for i := 0; i < 100; i++ {
		// Generate smooth organic waveform envelope
		val := 0.2 + 0.6*math.Abs(math.Sin(float64(i)*0.15))*math.Cos(float64(i)*0.05)
		peaks[i] = math.Round(val*100) / 100
	}

	payload := map[string]interface{}{
		"lesson_id": lessonID,
		"duration":  duration,
		"sample_rate": 44100,
		"peaks":     peaks,
	}

	c.Set("Content-Type", "application/json")
	c.Set("Cache-Control", "public, max-age=3600")
	return c.JSON(payload)
}

func (h *AssetsHandler) resolveSrtPath(c *fiber.Ctx, rawLessonID string) (*domain.LessonResponse, string) {
	lessonID := strings.TrimSuffix(strings.TrimSuffix(rawLessonID, ".srt"), ".vtt")
	cleanUUID := strings.TrimPrefix(lessonID, "lesson_")

	var lesson *domain.LessonResponse
	if h.lessonSvc != nil {
		for _, qID := range []string{cleanUUID, lessonID, rawLessonID} {
			l, err := h.lessonSvc.GetLessonByID(c.UserContext(), qID)
			if err == nil && l != nil {
				lesson = l
				if l.SrtFilePath != "" {
					if _, err := os.Stat(l.SrtFilePath); err == nil {
						return lesson, l.SrtFilePath
					}
					if strings.HasPrefix(l.SrtFilePath, "/app/storage/") {
						rel := strings.TrimPrefix(l.SrtFilePath, "/app/storage/")
						mapped := filepath.Join(h.storageDir, rel)
						if _, err := os.Stat(mapped); err == nil {
							return lesson, mapped
						}
					}
				}
				break
			}
		}
	}

	candidates := []string{
		filepath.Join(h.storageDir, "subtitles", fmt.Sprintf("lesson_%s.srt", cleanUUID)),
		filepath.Join(h.storageDir, "subtitles", fmt.Sprintf("lesson_%s.srt", lessonID)),
		filepath.Join(h.storageDir, "subtitles", fmt.Sprintf("%s.srt", cleanUUID)),
		filepath.Join(h.storageDir, "subtitles", fmt.Sprintf("%s.srt", lessonID)),
		filepath.Join(h.storageDir, "subtitles", rawLessonID),
	}

	for _, p := range candidates {
		if _, err := os.Stat(p); err == nil {
			return lesson, p
		}
	}

	return lesson, ""
}

// GetSubtitlesGeneric distributes subtitles dynamically according to query format (json, srt, or vtt).
func (h *AssetsHandler) GetSubtitlesGeneric(c *fiber.Ctx) error {
	format := strings.ToLower(c.Query("format", ""))
	accept := c.Get("Accept")

	if format == "json" || (format == "" && strings.Contains(accept, "application/json")) {
		return h.GetSubtitlesJson(c)
	}
	if format == "vtt" {
		return h.GetSubtitlesVtt(c)
	}
	return h.GetSubtitlesSrt(c)
}

// GetSubtitlesJson distributes structured subtitle timestamps as JSON.
func (h *AssetsHandler) GetSubtitlesJson(c *fiber.Ctx) error {
	lessonID := c.Params("id")
	if lessonID == "" {
		return response.Error(c, fiber.StatusBadRequest, "Bad Request", "Lesson ID is required")
	}

	lesson, srtPath := h.resolveSrtPath(c, lessonID)

	var items []audioutil.SubtitleTimestampItem
	if srtPath != "" {
		if data, err := os.ReadFile(srtPath); err == nil {
			items = audioutil.ParseSrtToTimestamps(string(data))
		}
	}

	if len(items) == 0 && lesson != nil && len(lesson.TranscriptChunks) > 0 {
		items = audioutil.GenerateTimestampsFromChunks(lesson.TranscriptChunks, lesson.DurationSec)
	}

	return response.Success(c, fiber.StatusOK, "Subtitles retrieved successfully", fiber.Map{
		"lesson_id": lessonID,
		"subtitles": items,
	})
}

// ExportLesson packages lesson assets as MP3, SRT, VTT, or an in-memory ZIP archive.
func (h *AssetsHandler) ExportLesson(c *fiber.Ctx) error {
	lessonID := c.Params("id")
	if lessonID == "" {
		return response.Error(c, fiber.StatusBadRequest, "Bad Request", "Lesson ID is required")
	}

	format := strings.ToLower(c.Query("format", "zip"))

	switch format {
	case "mp3":
		audioPath := h.resolveAudioPath(c, lessonID)
		if audioPath == "" {
			return response.Error(c, fiber.StatusNotFound, "Audio Not Found", "Audio file is not ready or missing")
		}
		c.Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"lesson_%s.mp3\"", lessonID))
		c.Set("Content-Type", "audio/mpeg")
		return c.SendFile(audioPath)

	case "srt":
		c.Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"lesson_%s.srt\"", lessonID))
		return h.GetSubtitlesSrt(c)

	case "vtt":
		c.Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"lesson_%s.vtt\"", lessonID))
		return h.GetSubtitlesVtt(c)

	case "zip":
		buf := new(bytes.Buffer)
		w := zip.NewWriter(buf)

		// 1. Audio
		audioPath := h.resolveAudioPath(c, lessonID)
		if audioPath != "" {
			if data, err := os.ReadFile(audioPath); err == nil {
				if f, err := w.Create("audio.mp3"); err == nil {
					_, _ = f.Write(data)
				}
			}
		}

		// 2. SRT & VTT
		lesson, srtPath := h.resolveSrtPath(c, lessonID)
		var srtBytes []byte
		if srtPath != "" {
			srtBytes, _ = os.ReadFile(srtPath)
		}
		if len(srtBytes) == 0 && lesson != nil && len(lesson.TranscriptChunks) > 0 {
			srtBytes = []byte(audioutil.GenerateSrtFromChunks(lesson.TranscriptChunks, lesson.DurationSec))
		}

		if len(srtBytes) > 0 {
			if f, err := w.Create("subtitles.srt"); err == nil {
				_, _ = f.Write(srtBytes)
			}
			vttContent := audioutil.ConvertSrtToVtt(string(srtBytes))
			if f, err := w.Create("subtitles.vtt"); err == nil {
				_, _ = f.Write([]byte(vttContent))
			}
		}

		// 3. Metadata
		if lesson != nil {
			if metaBytes, err := json.MarshalIndent(lesson, "", "  "); err == nil {
				if f, err := w.Create("metadata.json"); err == nil {
					_, _ = f.Write(metaBytes)
				}
			}
		}

		if err := w.Close(); err != nil {
			return response.Error(c, fiber.StatusInternalServerError, "Archive Error", "Failed to generate zip package")
		}

		c.Set("Content-Type", "application/zip")
		c.Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"lesson_%s.zip\"", lessonID))
		return c.Send(buf.Bytes())

	default:
		return response.Error(c, fiber.StatusBadRequest, "Invalid Format", fmt.Sprintf("Unsupported export format '%s'. Supported: mp3, srt, vtt, zip", format))
	}
}

// resolveAudioPath locates the audio file on disk for a given lesson.
func (h *AssetsHandler) resolveAudioPath(c *fiber.Ctx, rawLessonID string) string {
	lessonID := strings.TrimSuffix(rawLessonID, ".mp3")
	lessonID = strings.TrimSuffix(lessonID, ".wav")
	cleanUUID := strings.TrimPrefix(lessonID, "lesson_")

	if h.lessonSvc != nil {
		for _, qID := range []string{cleanUUID, lessonID, rawLessonID} {
			l, err := h.lessonSvc.GetLessonByID(c.UserContext(), qID)
			if err == nil && l != nil && l.AudioFilePath != "" {
				if _, err := os.Stat(l.AudioFilePath); err == nil {
					return l.AudioFilePath
				}
				if strings.HasPrefix(l.AudioFilePath, "/app/storage/") {
					rel := strings.TrimPrefix(l.AudioFilePath, "/app/storage/")
					mapped := filepath.Join(h.storageDir, rel)
					if _, err := os.Stat(mapped); err == nil {
						return mapped
					}
				}
			}
		}
	}
	candidates := []string{
		filepath.Join(h.storageDir, "audio", fmt.Sprintf("lesson_%s.mp3", cleanUUID)),
		filepath.Join(h.storageDir, "audio", fmt.Sprintf("lesson_%s.mp3", lessonID)),
		filepath.Join(h.storageDir, "audio", cleanUUID+".mp3"),
		filepath.Join(h.storageDir, "audio", lessonID+".mp3"),
		filepath.Join(h.storageDir, "audio", rawLessonID),
		filepath.Join(h.storageDir, rawLessonID),
	}
	for _, p := range candidates {
		if _, err := os.Stat(p); err == nil {
			return p
		}
	}
	return ""
}
