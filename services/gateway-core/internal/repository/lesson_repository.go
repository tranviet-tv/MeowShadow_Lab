package repository

import (
	"context"

	"github.com/jackc/pgx/v5/pgtype"
	"meowshadow/gateway-core/internal/repository/db"
)

// LessonRepository specifies persistence operations for shadowing lessons.
type LessonRepository interface {
	CreateLesson(ctx context.Context, params db.CreateLessonParams) (*db.CreateLessonRow, error)
	GetLessonByID(ctx context.Context, id pgtype.UUID) (*db.GetLessonByIDRow, error)
	ListLessonsByUserID(ctx context.Context, userID pgtype.UUID, limit, offset int32) ([]db.ListLessonsByUserIDRow, error)
	CountLessonsByUserID(ctx context.Context, userID pgtype.UUID) (int64, error)
	ListAllLessons(ctx context.Context, limit, offset int32) ([]db.ListAllLessonsRow, error)
	CountAllLessons(ctx context.Context) (int64, error)
	UpdateLessonStatus(ctx context.Context, id pgtype.UUID, status string) error
	UpdateLessonRenderResult(ctx context.Context, params db.UpdateLessonRenderResultParams) (*db.UpdateLessonRenderResultRow, error)
	DeleteLesson(ctx context.Context, id pgtype.UUID) error
}

type pgxLessonRepository struct {
	queries *db.Queries
}

// NewLessonRepository constructs a new LessonRepository instance using sqlc Queries.
func NewLessonRepository(queries *db.Queries) LessonRepository {
	return &pgxLessonRepository{
		queries: queries,
	}
}

func (r *pgxLessonRepository) CreateLesson(ctx context.Context, params db.CreateLessonParams) (*db.CreateLessonRow, error) {
	row, err := r.queries.CreateLesson(ctx, params)
	if err != nil {
		return nil, err
	}
	return &row, nil
}

func (r *pgxLessonRepository) GetLessonByID(ctx context.Context, id pgtype.UUID) (*db.GetLessonByIDRow, error) {
	row, err := r.queries.GetLessonByID(ctx, id)
	if err != nil {
		return nil, err
	}
	return &row, nil
}

func (r *pgxLessonRepository) ListLessonsByUserID(ctx context.Context, userID pgtype.UUID, limit, offset int32) ([]db.ListLessonsByUserIDRow, error) {
	return r.queries.ListLessonsByUserID(ctx, db.ListLessonsByUserIDParams{
		UserID: userID,
		Limit:  limit,
		Offset: offset,
	})
}

func (r *pgxLessonRepository) CountLessonsByUserID(ctx context.Context, userID pgtype.UUID) (int64, error) {
	return r.queries.CountLessonsByUserID(ctx, userID)
}

func (r *pgxLessonRepository) ListAllLessons(ctx context.Context, limit, offset int32) ([]db.ListAllLessonsRow, error) {
	return r.queries.ListAllLessons(ctx, db.ListAllLessonsParams{
		Limit:  limit,
		Offset: offset,
	})
}

func (r *pgxLessonRepository) CountAllLessons(ctx context.Context) (int64, error) {
	return r.queries.CountAllLessons(ctx)
}

func (r *pgxLessonRepository) UpdateLessonStatus(ctx context.Context, id pgtype.UUID, status string) error {
	return r.queries.UpdateLessonStatus(ctx, db.UpdateLessonStatusParams{
		ID:     id,
		Status: status,
	})
}

func (r *pgxLessonRepository) UpdateLessonRenderResult(ctx context.Context, params db.UpdateLessonRenderResultParams) (*db.UpdateLessonRenderResultRow, error) {
	row, err := r.queries.UpdateLessonRenderResult(ctx, params)
	if err != nil {
		return nil, err
	}
	return &row, nil
}

func (r *pgxLessonRepository) DeleteLesson(ctx context.Context, id pgtype.UUID) error {
	return r.queries.DeleteLesson(ctx, id)
}
