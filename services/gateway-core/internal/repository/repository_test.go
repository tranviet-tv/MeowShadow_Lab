package repository

import (
	"context"
	"testing"

	"github.com/jackc/pgx/v5/pgtype"
	"meowshadow/gateway-core/internal/repository/db"
)

// MockUserRepository verifies interface compliance.
type MockUserRepository struct {
	Users map[string]*db.User
}

func (m *MockUserRepository) CreateUser(ctx context.Context, email, passwordHash, fullName string) (*db.CreateUserRow, error) {
	return &db.CreateUserRow{
		Email:    email,
		FullName: pgtype.Text{String: fullName, Valid: true},
	}, nil
}

func (m *MockUserRepository) GetUserByEmail(ctx context.Context, email string) (*db.User, error) {
	if u, ok := m.Users[email]; ok {
		return u, nil
	}
	return nil, nil
}

func (m *MockUserRepository) GetUserByID(ctx context.Context, id pgtype.UUID) (*db.User, error) {
	return nil, nil
}

func (m *MockUserRepository) ListDevicesByUserID(ctx context.Context, userID pgtype.UUID) ([]db.UserDevice, error) {
	return nil, nil
}

func (m *MockUserRepository) UpsertUserDevice(ctx context.Context, userID pgtype.UUID, deviceType, pushToken string) error {
	return nil
}

// MockLessonRepository verifies interface compliance.
type MockLessonRepository struct {
	Lessons []db.ListAllLessonsRow
}

func (m *MockLessonRepository) CreateLesson(ctx context.Context, params db.CreateLessonParams) (*db.CreateLessonRow, error) {
	return &db.CreateLessonRow{
		Title:  params.Title,
		Status: params.Status,
	}, nil
}

func (m *MockLessonRepository) GetLessonByID(ctx context.Context, id pgtype.UUID) (*db.GetLessonByIDRow, error) {
	return &db.GetLessonByIDRow{
		Title:  "Mock Lesson",
		Status: "READY",
	}, nil
}

func (m *MockLessonRepository) ListLessonsByUserID(ctx context.Context, userID pgtype.UUID, limit, offset int32) ([]db.ListLessonsByUserIDRow, error) {
	return []db.ListLessonsByUserIDRow{}, nil
}

func (m *MockLessonRepository) CountLessonsByUserID(ctx context.Context, userID pgtype.UUID) (int64, error) {
	return 0, nil
}

func (m *MockLessonRepository) ListAllLessons(ctx context.Context, limit, offset int32) ([]db.ListAllLessonsRow, error) {
	return m.Lessons, nil
}

func (m *MockLessonRepository) CountAllLessons(ctx context.Context) (int64, error) {
	return int64(len(m.Lessons)), nil
}

func (m *MockLessonRepository) UpdateLessonStatus(ctx context.Context, id pgtype.UUID, status string) error {
	return nil
}

func (m *MockLessonRepository) UpdateLessonRenderResult(ctx context.Context, params db.UpdateLessonRenderResultParams) (*db.UpdateLessonRenderResultRow, error) {
	return &db.UpdateLessonRenderResultRow{
		ID:            params.ID,
		Status:        params.Status,
		AudioFilePath: params.AudioFilePath,
		SrtFilePath:   params.SrtFilePath,
		DurationSec:   params.DurationSec,
	}, nil
}

func (m *MockLessonRepository) DeleteLesson(ctx context.Context, id pgtype.UUID) error {
	return nil
}

func (m *MockLessonRepository) GetLearningProgress(ctx context.Context, userID, lessonID pgtype.UUID) (*db.GetLearningProgressRow, error) {
	return &db.GetLearningProgressRow{
		UserID:   userID,
		LessonID: lessonID,
	}, nil
}

func (m *MockLessonRepository) UpsertLearningProgress(ctx context.Context, params db.UpsertLearningProgressParams) error {
	return nil
}

func TestRepositoryInterfaces(t *testing.T) {
	// Verify that mock types implement interfaces
	var userRepo UserRepository = &MockUserRepository{
		Users: make(map[string]*db.User),
	}
	if userRepo == nil {
		t.Fatal("Expected non-nil user repository")
	}

	var lessonRepo LessonRepository = &MockLessonRepository{
		Lessons: []db.ListAllLessonsRow{
			{Title: "Shadowing Unit 1", Status: "READY"},
		},
	}
	if lessonRepo == nil {
		t.Fatal("Expected non-nil lesson repository")
	}

	ctx := context.Background()
	total, err := lessonRepo.CountAllLessons(ctx)
	if err != nil {
		t.Fatalf("CountAllLessons returned error: %v", err)
	}
	if total != 1 {
		t.Errorf("Expected 1 lesson, got %d", total)
	}
}
