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
	Email         string `json:"email"`
	Password      string `json:"password"`
	FullName      string `json:"full_name"`
	FullNameCamel string `json:"fullName,omitempty"`
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
	User         UserDTO          `json:"user"`
	Tokens       pkgJwt.TokenPair `json:"tokens"`
	AccessToken  string           `json:"accessToken,omitempty"`
	RefreshToken string           `json:"refreshToken,omitempty"`
	ExpiresInSec int64            `json:"expiresInSec,omitempty"`
}

// PopulateTokens synchronizes token fields for camelCase client compatibility.
func (r *AuthResponse) PopulateTokens() {
	r.AccessToken = r.Tokens.AccessToken
	r.RefreshToken = r.Tokens.RefreshToken
	r.ExpiresInSec = r.Tokens.ExpiresIn
}

// RefreshTokenRequest holds the refresh token payload.
type RefreshTokenRequest struct {
	RefreshToken      string `json:"refresh_token"`
	RefreshTokenCamel string `json:"refreshToken,omitempty"`
}

// RegisterDeviceRequest holds mobile/web device push token registration parameters.
type RegisterDeviceRequest struct {
	DeviceType      string `json:"device_type"`
	DeviceTypeCamel string `json:"deviceType,omitempty"`
	PushToken       string `json:"push_token"`
	PushTokenCamel  string `json:"pushToken,omitempty"`
}

// AuthService defines business operations for user authentication and session management.
type AuthService interface {
	Register(ctx context.Context, req RegisterRequest) (*AuthResponse, error)
	Login(ctx context.Context, req LoginRequest) (*AuthResponse, error)
	GuestLogin(ctx context.Context) (*AuthResponse, error)
	RefreshToken(ctx context.Context, req RefreshTokenRequest) (*pkgJwt.TokenPair, error)
	RegisterDevice(ctx context.Context, userID string, isGuest bool, req RegisterDeviceRequest) error
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

	fullName := req.FullName
	if fullName == "" && req.FullNameCamel != "" {
		fullName = req.FullNameCamel
	}

	created, err := s.userRepo.CreateUser(ctx, email, string(hashedBytes), fullName)
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

	res := &AuthResponse{
		User: UserDTO{
			ID:        userIDStr,
			Email:     created.Email,
			FullName:  created.FullName.String,
			IsGuest:   false,
			CreatedAt: created.CreatedAt.Time.Format(time.RFC3339),
		},
		Tokens: *tokens,
	}
	res.PopulateTokens()
	return res, nil
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

	res := &AuthResponse{
		User: UserDTO{
			ID:        userIDStr,
			Email:     user.Email,
			FullName:  user.FullName.String,
			IsGuest:   false,
			CreatedAt: user.CreatedAt.Time.Format(time.RFC3339),
		},
		Tokens: *tokens,
	}
	res.PopulateTokens()
	return res, nil
}

func (s *authService) GuestLogin(ctx context.Context) (*AuthResponse, error) {
	guestID := uuid.New().String()
	guestEmail := fmt.Sprintf("guest_%s@meowshadow.local", guestID[:8])
	dummyHash := "$2a$10$guest.account.not.directly.password.loggable"

	// Persist guest user so foreign key constraints (e.g. learning_progress) are satisfied
	created, err := s.userRepo.CreateUser(ctx, guestEmail, dummyHash, "Guest Explorer")
	var userIDStr string
	if err != nil {
		userIDStr = guestID
	} else {
		userIDStr = uuid.UUID(created.ID.Bytes).String()
		guestEmail = created.Email
	}

	tokens, err := pkgJwt.GenerateTokenPair(
		userIDStr,
		guestEmail,
		true,
		s.cfg.JWTSecret,
		s.cfg.JWTAccessExpMinutes,
		s.cfg.JWTRefreshExpDays,
	)
	if err != nil {
		return nil, err
	}

	res := &AuthResponse{
		User: UserDTO{
			ID:        userIDStr,
			Email:     guestEmail,
			FullName:  "Guest Explorer",
			IsGuest:   true,
			CreatedAt: time.Now().UTC().Format(time.RFC3339),
		},
		Tokens: *tokens,
	}
	res.PopulateTokens()
	return res, nil
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

func (s *authService) RefreshToken(ctx context.Context, req RefreshTokenRequest) (*pkgJwt.TokenPair, error) {
	tokenStr := req.RefreshToken
	if tokenStr == "" && req.RefreshTokenCamel != "" {
		tokenStr = req.RefreshTokenCamel
	}
	if strings.TrimSpace(tokenStr) == "" {
		return nil, errors.New("refresh token is required")
	}

	claims, err := pkgJwt.ValidateToken(tokenStr, s.cfg.JWTSecret)
	if err != nil {
		return nil, pkgJwt.ErrInvalidToken
	}

	if claims.TokenType != "" && claims.TokenType != "refresh" {
		return nil, errors.New("provided token is not a refresh token")
	}

	tokens, err := pkgJwt.GenerateTokenPair(
		claims.UserID,
		claims.Email,
		claims.IsGuest,
		s.cfg.JWTSecret,
		s.cfg.JWTAccessExpMinutes,
		s.cfg.JWTRefreshExpDays,
	)
	if err != nil {
		return nil, err
	}

	return tokens, nil
}

func (s *authService) RegisterDevice(ctx context.Context, userID string, isGuest bool, req RegisterDeviceRequest) error {
	pushToken := req.PushToken
	if pushToken == "" && req.PushTokenCamel != "" {
		pushToken = req.PushTokenCamel
	}
	deviceType := req.DeviceType
	if deviceType == "" && req.DeviceTypeCamel != "" {
		deviceType = req.DeviceTypeCamel
	}

	if strings.TrimSpace(pushToken) == "" || strings.TrimSpace(deviceType) == "" {
		return errors.New("device_type and push_token are required")
	}

	if isGuest || userID == "" {
		return nil
	}

	parsedUUID, err := uuid.Parse(userID)
	if err != nil {
		return errors.New("invalid user ID")
	}

	var pgUUID pgtype.UUID
	copy(pgUUID.Bytes[:], parsedUUID[:])
	pgUUID.Valid = true

	return s.userRepo.UpsertUserDevice(ctx, pgUUID, deviceType, pushToken)
}

