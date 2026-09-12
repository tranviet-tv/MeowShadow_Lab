// Package services implements core business logic for authentication, lessons, and orchestration.
package services

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"golang.org/x/crypto/bcrypt"
	"meowshadow/gateway-core/config"
	"meowshadow/gateway-core/internal/repository"
	pkgJwt "meowshadow/gateway-core/pkg/jwt"
)

// Common authentication error messages.
var (
	ErrUserAlreadyExists = errors.New("a user with this email address already exists")
	ErrInvalidCredentials = errors.New("invalid email or password")
	ErrUserNotFound      = errors.New("user not found")
)

// RegisterRequest holds user registration parameters.
type RegisterRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	FullName string `json:"full_name"`
}

// LoginRequest holds credentials for logging in.
type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// UserDTO provides sanitized user information for responses.
type UserDTO struct {
	ID        string `json:"id"`
	Email     string `json:"email"`
	FullName  string `json:"full_name"`
	IsGuest   bool   `json:"is_guest"`
	CreatedAt string `json:"created_at"`
}

// AuthResponse packages the authenticated user profile and token pair.
type AuthResponse struct {
	User   UserDTO          `json:"user"`
	Tokens pkgJwt.TokenPair `json:"tokens"`
}

// AuthService defines business operations for user authentication and session management.
type AuthService interface {
	Register(ctx context.Context, req RegisterRequest) (*AuthResponse, error)
	Login(ctx context.Context, req LoginRequest) (*AuthResponse, error)
	GuestLogin(ctx context.Context) (*AuthResponse, error)
	GetProfile(ctx context.Context, userID string) (*UserDTO, error)
}

type authService struct {
	userRepo repository.UserRepository
	cfg      *config.Config
}

// NewAuthService creates a new AuthService instance.
func NewAuthService(userRepo repository.UserRepository, cfg *config.Config) AuthService {
	return &authService{
		userRepo: userRepo,
		cfg:      cfg,
	}
}

func (s *authService) Register(ctx context.Context, req RegisterRequest) (*AuthResponse, error) {
	email := strings.ToLower(strings.TrimSpace(req.Email))
	if email == "" || len(req.Password) < 6 {
		return nil, errors.New("email and password (min 6 chars) are required")
	}

	// Check if user already exists
	existing, _ := s.userRepo.GetUserByEmail(ctx, email)
	if existing != nil {
		return nil, ErrUserAlreadyExists
	}

	// Hash password
	hashedBytes, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("failed to hash password: %w", err)
	}

	created, err := s.userRepo.CreateUser(ctx, email, string(hashedBytes), req.FullName)
	if err != nil {
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	userIDStr := uuid.UUID(created.ID.Bytes).String()
	tokens, err := pkgJwt.GenerateTokenPair(
		userIDStr,
		created.Email,
		false,
		s.cfg.JWTSecret,
		s.cfg.JWTAccessExpMinutes,
		s.cfg.JWTRefreshExpDays,
	)
	if err != nil {
		return nil, err
	}

	return &AuthResponse{
		User: UserDTO{
			ID:        userIDStr,
			Email:     created.Email,
			FullName:  created.FullName.String,
			IsGuest:   false,
			CreatedAt: created.CreatedAt.Time.Format(time.RFC3339),
		},
		Tokens: *tokens,
	}, nil
}

func (s *authService) Login(ctx context.Context, req LoginRequest) (*AuthResponse, error) {
	email := strings.ToLower(strings.TrimSpace(req.Email))
	user, err := s.userRepo.GetUserByEmail(ctx, email)
	if err != nil || user == nil {
		return nil, ErrInvalidCredentials
	}

	// Verify bcrypt password hash
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		return nil, ErrInvalidCredentials
	}

	userIDStr := uuid.UUID(user.ID.Bytes).String()
	tokens, err := pkgJwt.GenerateTokenPair(
		userIDStr,
		user.Email,
		false,
		s.cfg.JWTSecret,
		s.cfg.JWTAccessExpMinutes,
		s.cfg.JWTRefreshExpDays,
	)
	if err != nil {
		return nil, err
	}

	return &AuthResponse{
		User: UserDTO{
			ID:        userIDStr,
			Email:     user.Email,
			FullName:  user.FullName.String,
			IsGuest:   false,
			CreatedAt: user.CreatedAt.Time.Format(time.RFC3339),
		},
		Tokens: *tokens,
	}, nil
}

func (s *authService) GuestLogin(ctx context.Context) (*AuthResponse, error) {
	guestID := uuid.New().String()
	guestEmail := fmt.Sprintf("guest_%s@meowshadow.local", guestID[:8])

	tokens, err := pkgJwt.GenerateTokenPair(
		guestID,
		guestEmail,
		true,
		s.cfg.JWTSecret,
		s.cfg.JWTAccessExpMinutes,
		s.cfg.JWTRefreshExpDays,
	)
	if err != nil {
		return nil, err
	}

	return &AuthResponse{
		User: UserDTO{
			ID:        guestID,
			Email:     guestEmail,
			FullName:  "Guest Explorer",
			IsGuest:   true,
			CreatedAt: time.Now().UTC().Format(time.RFC3339),
		},
		Tokens: *tokens,
	}, nil
}

func (s *authService) GetProfile(ctx context.Context, userID string) (*UserDTO, error) {
	parsedUUID, err := uuid.Parse(userID)
	if err != nil {
		// Treat unparseable IDs as guest profile
		return &UserDTO{
			ID:       userID,
			Email:    "guest@meowshadow.local",
			FullName: "Guest Explorer",
			IsGuest:  true,
		}, nil
	}

	var pgUUID pgtype.UUID
	copy(pgUUID.Bytes[:], parsedUUID[:])
	pgUUID.Valid = true

	user, err := s.userRepo.GetUserByID(ctx, pgUUID)
	if err != nil || user == nil {
		return nil, ErrUserNotFound
	}

	return &UserDTO{
		ID:        userID,
		Email:     user.Email,
		FullName:  user.FullName.String,
		IsGuest:   false,
		CreatedAt: user.CreatedAt.Time.Format(time.RFC3339),
	}, nil
}
