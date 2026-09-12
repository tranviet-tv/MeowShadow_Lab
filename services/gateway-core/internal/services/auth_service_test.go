package services

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"meowshadow/gateway-core/config"
	"meowshadow/gateway-core/internal/repository/db"
	pkgJwt "meowshadow/gateway-core/pkg/jwt"
)

// In-memory mock UserRepository
type memoryUserRepo struct {
	usersByEmail map[string]*db.User
	usersByID    map[string]*db.User
}

func newMemoryUserRepo() *memoryUserRepo {
	return &memoryUserRepo{
		usersByEmail: make(map[string]*db.User),
		usersByID:    make(map[string]*db.User),
	}
}

func (m *memoryUserRepo) CreateUser(ctx context.Context, email, passwordHash, fullName string) (*db.CreateUserRow, error) {
	newID := uuid.New()
	var pgUUID pgtype.UUID
	copy(pgUUID.Bytes[:], newID[:])
	pgUUID.Valid = true

	now := time.Now().UTC()
	u := &db.User{
		ID:           pgUUID,
		Email:        email,
		PasswordHash: passwordHash,
		FullName:     pgtype.Text{String: fullName, Valid: fullName != ""},
		CreatedAt:    pgtype.Timestamptz{Time: now, Valid: true},
		UpdatedAt:    pgtype.Timestamptz{Time: now, Valid: true},
	}
	m.usersByEmail[email] = u
	m.usersByID[newID.String()] = u

	return &db.CreateUserRow{
		ID:        pgUUID,
		Email:     email,
		FullName:  u.FullName,
		CreatedAt: u.CreatedAt,
	}, nil
}

func (m *memoryUserRepo) GetUserByEmail(ctx context.Context, email string) (*db.User, error) {
	if u, ok := m.usersByEmail[email]; ok {
		return u, nil
	}
	return nil, nil
}

func (m *memoryUserRepo) GetUserByID(ctx context.Context, id pgtype.UUID) (*db.User, error) {
	idStr := uuid.UUID(id.Bytes).String()
	if u, ok := m.usersByID[idStr]; ok {
		return u, nil
	}
	return nil, nil
}

func (m *memoryUserRepo) ListDevicesByUserID(ctx context.Context, userID pgtype.UUID) ([]db.UserDevice, error) {
	return nil, nil
}

func (m *memoryUserRepo) UpsertUserDevice(ctx context.Context, userID pgtype.UUID, deviceType, pushToken string) error {
	return nil
}

func TestAuthService_Flow(t *testing.T) {
	repo := newMemoryUserRepo()
	cfg := &config.Config{
		JWTSecret:           "test_jwt_secret_key_1234567890123456",
		JWTAccessExpMinutes: 15,
		JWTRefreshExpDays:   7,
	}
	svc := NewAuthService(repo, cfg)
	ctx := context.Background()

	// 1. Test Register
	regRes, err := svc.Register(ctx, RegisterRequest{
		Email:    "test@meowshadow.local",
		Password: "password123",
		FullName: "Test User",
	})
	if err != nil {
		t.Fatalf("Register failed: %v", err)
	}
	if regRes.User.Email != "test@meowshadow.local" {
		t.Errorf("Expected email test@meowshadow.local, got %s", regRes.User.Email)
	}
	if regRes.Tokens.AccessToken == "" {
		t.Error("Expected non-empty access token")
	}

	// 2. Test Duplicate Register
	_, err = svc.Register(ctx, RegisterRequest{
		Email:    "test@meowshadow.local",
		Password: "password123",
	})
	if err != ErrUserAlreadyExists {
		t.Errorf("Expected ErrUserAlreadyExists, got %v", err)
	}

	// 3. Test Login Success
	loginRes, err := svc.Login(ctx, LoginRequest{
		Email:    "test@meowshadow.local",
		Password: "password123",
	})
	if err != nil {
		t.Fatalf("Login failed: %v", err)
	}
	if loginRes.User.ID != regRes.User.ID {
		t.Errorf("Expected user ID %s, got %s", regRes.User.ID, loginRes.User.ID)
	}

	// 4. Test Login Wrong Password
	_, err = svc.Login(ctx, LoginRequest{
		Email:    "test@meowshadow.local",
		Password: "wrongpassword",
	})
	if err != ErrInvalidCredentials {
		t.Errorf("Expected ErrInvalidCredentials, got %v", err)
	}

	// 5. Test Guest Login
	guestRes, err := svc.GuestLogin(ctx)
	if err != nil {
		t.Fatalf("GuestLogin failed: %v", err)
	}
	if !guestRes.User.IsGuest {
		t.Error("Expected guest user to have IsGuest=true")
	}

	// 6. Test Token Validation
	claims, err := pkgJwt.ValidateToken(guestRes.Tokens.AccessToken, cfg.JWTSecret)
	if err != nil {
		t.Fatalf("ValidateToken failed: %v", err)
	}
	if !claims.IsGuest {
		t.Error("Expected claim IsGuest=true")
	}
}
