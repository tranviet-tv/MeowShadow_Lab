// Package jwt handles JSON Web Token creation, claims extraction, and validation.
package jwt

import (
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// Common JWT error definitions.
var (
	ErrInvalidToken = errors.New("invalid or expired token")
	ErrInvalidClaims = errors.New("unable to parse token claims")
)

// Claims represents the standard and custom JWT claims.
type Claims struct {
	UserID  string `json:"user_id"`
	Email   string `json:"email"`
	IsGuest bool   `json:"is_guest"`
	jwt.RegisteredClaims
}

// TokenPair bundles the generated access and refresh tokens.
type TokenPair struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int64  `json:"expires_in"` // Access token lifetime in seconds
}

// GenerateTokenPair signs and returns a new Access Token and Refresh Token.
func GenerateTokenPair(
	userID string,
	email string,
	isGuest bool,
	secret string,
	accessExpMinutes int,
	refreshExpDays int,
) (*TokenPair, error) {
	now := time.Now().UTC()
	accessDuration := time.Duration(accessExpMinutes) * time.Minute
	accessExpiresAt := now.Add(accessDuration)

	accessClaims := Claims{
		UserID:  userID,
		Email:   email,
		IsGuest: isGuest,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   userID,
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(accessExpiresAt),
			Issuer:    "meowshadow-gateway",
		},
	}

	accessTokenObj := jwt.NewWithClaims(jwt.SigningMethodHS256, accessClaims)
	accessToken, err := accessTokenObj.SignedString([]byte(secret))
	if err != nil {
		return nil, fmt.Errorf("failed to sign access token: %w", err)
	}

	// Generate refresh token
	refreshExpiresAt := now.Add(time.Duration(refreshExpDays) * 24 * time.Hour)
	refreshClaims := Claims{
		UserID:  userID,
		Email:   email,
		IsGuest: isGuest,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   userID,
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(refreshExpiresAt),
			Issuer:    "meowshadow-gateway",
		},
	}

	refreshTokenObj := jwt.NewWithClaims(jwt.SigningMethodHS256, refreshClaims)
	refreshToken, err := refreshTokenObj.SignedString([]byte(secret))
	if err != nil {
		return nil, fmt.Errorf("failed to sign refresh token: %w", err)
	}

	return &TokenPair{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresIn:    int64(accessDuration.Seconds()),
	}, nil
}

// ValidateToken parses and validates a signed JWT string.
func ValidateToken(tokenString string, secret string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(secret), nil
	})

	if err != nil {
		return nil, ErrInvalidToken
	}

	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, ErrInvalidClaims
	}

	return claims, nil
}
