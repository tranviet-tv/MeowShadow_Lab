package services

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"meowshadow/gateway-core/internal/domain"
	"meowshadow/gateway-core/internal/repository"
	"meowshadow/gateway-core/internal/repository/db"
)

// Common lesson errors.
var (
	ErrLessonNotFound    = errors.New("lesson not found")
	ErrInvalidLessonData = errors.New("invalid lesson data")
)

// LessonService defines CRUD operations for managing shadowing lessons.
type LessonService interface {
	CreateLesson(ctx context.Context, userID string, isGuest bool, req domain.CreateLessonRequest) (*domain.LessonResponse, error)
	GetLessonByID(ctx context.Context, id string) (*domain.LessonResponse, error)
	ListLessons(ctx context.Context, userID string, isGuest bool, page, limit int64) ([]domain.LessonResponse, int64, error)
	DeleteLesson(ctx context.Context, id string) error
	GetProgress(ctx context.Context, userID, lessonID string) (*domain.LearningProgressDTO, error)
	SyncProgress(ctx context.Context, userID string, req domain.SyncProgressRequest) error
}

type lessonService struct {
	lessonRepo repository.LessonRepository
}

// NewLessonService creates a new LessonService.
func NewLessonService(lessonRepo repository.LessonRepository) LessonService {
	return &lessonService{
		lessonRepo: lessonRepo,
	}
}

func (s *lessonService) CreateLesson(
	ctx context.Context,
	userID string,
	isGuest bool,
	req domain.CreateLessonRequest,
) (*domain.LessonResponse, error) {
	if req.Title == "" || len(req.TranscriptChunks) == 0 {
		return nil, errors.New("title and transcript chunks are required")
	}

	// Marshal pacing config to JSON bytes for PostgreSQL JSONB
	pacingBytes, err := json.Marshal(req.PacingConfig)
	if err != nil {
		return nil, fmt.Errorf("failed to encode pacing config: %w", err)
	}

	// Marshal chunks array to JSON bytes for PostgreSQL JSONB
	chunksBytes, err := json.Marshal(req.TranscriptChunks)
	if err != nil {
		return nil, fmt.Errorf("failed to encode transcript chunks: %w", err)
	}

	var userUUID pgtype.UUID
	if !isGuest && userID != "" {
		if parsed, err := uuid.Parse(userID); err == nil {
			copy(userUUID.Bytes[:], parsed[:])
			userUUID.Valid = true
		}
	}

	sourceLang := req.SourceLanguage
	if sourceLang == "" {
		sourceLang = "vi"
	}

	targetLang := req.TargetLanguage
	if targetLang == "" {
		targetLang = "en"
	}

	audioPath := req.AudioFilePath
	if audioPath == "" {
		audioPath = "/app/storage/audio/placeholder.mp3"
	}
	srtPath := req.SrtFilePath
	if srtPath == "" {
		srtPath = "/app/storage/audio/placeholder.srt"
	}

	status := req.Status
	if status == "" {
		status = "READY"
	}

	var numDuration pgtype.Numeric
	_ = numDuration.Scan(fmt.Sprintf("%.2f", req.DurationSec))

	createdRow, err := s.lessonRepo.CreateLesson(ctx, db.CreateLessonParams{
		UserID:           userUUID,
		Title:            req.Title,
		TargetLanguage:   targetLang,
		SourceLanguage:   pgtype.Text{String: sourceLang, Valid: true},
		TotalWords:       pgtype.Int4{Int32: int32(req.TotalWords), Valid: true},
		DurationSec:      numDuration,
		PacingConfig:     pacingBytes,
		TranscriptChunks: chunksBytes,
		AudioFilePath:    audioPath,
		SrtFilePath:      srtPath,
		Status:           status,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to insert lesson into database: %w", err)
	}

	lessonIDStr := uuid.UUID(createdRow.ID.Bytes).String()

	resp := &domain.LessonResponse{
		ID:               lessonIDStr,
		UserID:           userID,
		Title:            createdRow.Title,
		TargetLanguage:   targetLang,
		SourceLanguage:   sourceLang,
		TotalWords:       req.TotalWords,
		DurationSec:      req.DurationSec,
		PacingConfig:     req.PacingConfig,
		TranscriptChunks: req.TranscriptChunks,
		AudioFilePath:    audioPath,
		SrtFilePath:      srtPath,
		Status:           createdRow.Status,
		CreatedAt:        createdRow.CreatedAt.Time.Format(time.RFC3339),
		UpdatedAt:        createdRow.CreatedAt.Time.Format(time.RFC3339),
	}
	resp.PopulateCamelCase()
	return resp, nil
}

func (s *lessonService) GetLessonByID(ctx context.Context, id string) (*domain.LessonResponse, error) {
	parsedID, err := uuid.Parse(id)
	if err != nil {
		return nil, ErrInvalidLessonData
	}

	var pgID pgtype.UUID
	copy(pgID.Bytes[:], parsedID[:])
	pgID.Valid = true

	row, err := s.lessonRepo.GetLessonByID(ctx, pgID)
	if err != nil || row == nil {
		return nil, ErrLessonNotFound
	}

	var pacing domain.PacingConfig
	_ = json.Unmarshal(row.PacingConfig, &pacing)

	var chunks []domain.ScriptChunk
	_ = json.Unmarshal(row.TranscriptChunks, &chunks)

	var userUUIDStr string
	if row.UserID.Valid {
		userUUIDStr = uuid.UUID(row.UserID.Bytes).String()
	}

	durationFloat, _ := row.DurationSec.Float64Value()

	resp := &domain.LessonResponse{
		ID:               uuid.UUID(row.ID.Bytes).String(),
		UserID:           userUUIDStr,
		Title:            row.Title,
		TargetLanguage:   row.TargetLanguage,
		SourceLanguage:   row.SourceLanguage.String,
		TotalWords:       int(row.TotalWords.Int32),
		DurationSec:      durationFloat.Float64,
		PacingConfig:     pacing,
		TranscriptChunks: chunks,
		AudioFilePath:    row.AudioFilePath,
		SrtFilePath:      row.SrtFilePath,
		Status:           row.Status,
		CreatedAt:        row.CreatedAt.Time.Format(time.RFC3339),
		UpdatedAt:        row.UpdatedAt.Time.Format(time.RFC3339),
	}
	resp.PopulateCamelCase()
	return resp, nil
}

func (s *lessonService) ListLessons(
	ctx context.Context,
	userID string,
	isGuest bool,
	page, limit int64,
) ([]domain.LessonResponse, int64, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 10
	}
	offset := (page - 1) * limit

	var total int64
	var lessons []domain.LessonResponse

	// If authenticated user, list their lessons; if guest or no userID, list all recent lessons
	if !isGuest && userID != "" {
		if parsed, err := uuid.Parse(userID); err == nil {
			var pgUUID pgtype.UUID
			copy(pgUUID.Bytes[:], parsed[:])
			pgUUID.Valid = true

			cnt, err := s.lessonRepo.CountLessonsByUserID(ctx, pgUUID)
			if err == nil {
				total = cnt
			}

			rows, err := s.lessonRepo.ListLessonsByUserID(ctx, pgUUID, int32(limit), int32(offset))
			if err != nil {
				return nil, 0, err
			}

			for _, r := range rows {
				var pacing domain.PacingConfig
				_ = json.Unmarshal(r.PacingConfig, &pacing)
				var chunks []domain.ScriptChunk
				_ = json.Unmarshal(r.TranscriptChunks, &chunks)
				durFloat, _ := r.DurationSec.Float64Value()

				lessons = append(lessons, domain.LessonResponse{
					ID:               uuid.UUID(r.ID.Bytes).String(),
					UserID:           userID,
					Title:            r.Title,
					TargetLanguage:   r.TargetLanguage,
					SourceLanguage:   r.SourceLanguage.String,
					TotalWords:       int(r.TotalWords.Int32),
					DurationSec:      durFloat.Float64,
					PacingConfig:     pacing,
					TranscriptChunks: chunks,
					AudioFilePath:    r.AudioFilePath,
					SrtFilePath:      r.SrtFilePath,
					Status:           r.Status,
					CreatedAt:        r.CreatedAt.Time.Format(time.RFC3339),
					UpdatedAt:        r.UpdatedAt.Time.Format(time.RFC3339),
				})
			}
			return lessons, total, nil
		}
	}

	// Fallback to ListAllLessons (for guest exploration)
	cnt, err := s.lessonRepo.CountAllLessons(ctx)
	if err == nil {
		total = cnt
	}

	rows, err := s.lessonRepo.ListAllLessons(ctx, int32(limit), int32(offset))
	if err != nil {
		return nil, 0, err
	}

	for _, r := range rows {
		var pacing domain.PacingConfig
		_ = json.Unmarshal(r.PacingConfig, &pacing)
		var chunks []domain.ScriptChunk
		_ = json.Unmarshal(r.TranscriptChunks, &chunks)
		durFloat, _ := r.DurationSec.Float64Value()

		var uID string
		if r.UserID.Valid {
			uID = uuid.UUID(r.UserID.Bytes).String()
		}

		lessons = append(lessons, domain.LessonResponse{
			ID:               uuid.UUID(r.ID.Bytes).String(),
			UserID:           uID,
			Title:            r.Title,
			TargetLanguage:   r.TargetLanguage,
			SourceLanguage:   r.SourceLanguage.String,
			TotalWords:       int(r.TotalWords.Int32),
			DurationSec:      durFloat.Float64,
			PacingConfig:     pacing,
			TranscriptChunks: chunks,
			AudioFilePath:    r.AudioFilePath,
			SrtFilePath:      r.SrtFilePath,
			Status:           r.Status,
			CreatedAt:        r.CreatedAt.Time.Format(time.RFC3339),
			UpdatedAt:        r.UpdatedAt.Time.Format(time.RFC3339),
		})
	}

	for i := range lessons {
		lessons[i].PopulateCamelCase()
	}

	return lessons, total, nil
}

func (s *lessonService) DeleteLesson(ctx context.Context, id string) error {
	parsedID, err := uuid.Parse(id)
	if err != nil {
		return ErrInvalidLessonData
	}

	var pgID pgtype.UUID
	copy(pgID.Bytes[:], parsedID[:])
	pgID.Valid = true

	return s.lessonRepo.DeleteLesson(ctx, pgID)
}

func (s *lessonService) GetProgress(ctx context.Context, userID, lessonID string) (*domain.LearningProgressDTO, error) {
	userUUID, err := uuid.Parse(userID)
	if err != nil {
		return nil, errors.New("invalid user id")
	}
	lessUUID, err := uuid.Parse(lessonID)
	if err != nil {
		return nil, errors.New("invalid lesson id")
	}
	var pgUser, pgLesson pgtype.UUID
	copy(pgUser.Bytes[:], userUUID[:])
	pgUser.Valid = true
	copy(pgLesson.Bytes[:], lessUUID[:])
	pgLesson.Valid = true

	row, err := s.lessonRepo.GetLearningProgress(ctx, pgUser, pgLesson)
	if err != nil || row == nil {
		return nil, errors.New("progress not found")
	}

	offsetFloat, _ := row.PlaybackOffsetSec.Float64Value()

	return &domain.LearningProgressDTO{
		LessonID:             lessonID,
		UserID:               userID,
		PlaybackOffsetSec:    offsetFloat.Float64,
		ShadowingRepeatCount: int(row.ShadowingRepeatCount.Int32),
		IsCompleted:          row.IsCompleted.Bool,
		Version:              int(row.Version.Int32),
		LastListenedAt:       row.LastListenedAt.Time.Format(time.RFC3339),
	}, nil
}

func (s *lessonService) SyncProgress(ctx context.Context, userID string, req domain.SyncProgressRequest) error {
	req.Normalize()
	userUUID, err := uuid.Parse(userID)
	if err != nil {
		return errors.New("invalid user id")
	}
	lessUUID, err := uuid.Parse(req.LessonID)
	if err != nil {
		return errors.New("invalid lesson id")
	}
	var pgUser, pgLesson pgtype.UUID
	copy(pgUser.Bytes[:], userUUID[:])
	pgUser.Valid = true
	copy(pgLesson.Bytes[:], lessUUID[:])
	pgLesson.Valid = true

	var numOffset pgtype.Numeric
	_ = numOffset.Scan(fmt.Sprintf("%.2f", req.PlaybackOffsetSec))

	version := int32(req.Version)
	if version <= 0 {
		version = 1
	}

	return s.lessonRepo.UpsertLearningProgress(ctx, db.UpsertLearningProgressParams{
		UserID:               pgUser,
		LessonID:             pgLesson,
		PlaybackOffsetSec:    numOffset,
		ShadowingRepeatCount: pgtype.Int4{Int32: int32(req.ShadowingRepeatCount), Valid: true},
		IsCompleted:          pgtype.Bool{Bool: req.IsCompleted, Valid: true},
		Version:              pgtype.Int4{Int32: version, Valid: true},
	})
}
