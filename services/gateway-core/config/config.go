// Package config manages application configuration loaded from environment variables.
package config

import (
	"os"
	"strconv"
)

// Config holds all runtime configuration values for gateway-core.
type Config struct {
	Port                     string
	Env                      string
	DatabaseURL              string
	RedisAddr                string
	StorageDir               string
	JWTSecret                string
	JWTAccessExpMinutes      int
	JWTRefreshExpDays        int
	CORSAllowOrigins         string
	RateLimitMaxRequests     int
	RateLimitExpirationSec   int
	TTSEngineURL             string
}

// LoadConfig reads environment variables and returns a populated Config struct with fallback defaults.
func LoadConfig() *Config {
	return &Config{
		Port:                   getEnv("PORT", "8000"),
		Env:                    getEnv("ENV", "development"),
		DatabaseURL:            getEnv("DATABASE_URL", "postgres://meowuser:meowpassword@localhost:5432/meowshadow_db?sslmode=disable"),
		RedisAddr:              getEnv("REDIS_ADDR", "localhost:6379"),
		StorageDir:             getEnv("STORAGE_DIR", "./storage"),
		JWTSecret:              getEnv("JWT_SECRET", "meowshadow_super_secret_jwt_key_2026_change_in_production!"),
		JWTAccessExpMinutes:    getEnvAsInt("JWT_ACCESS_EXP_MINUTES", 60),
		JWTRefreshExpDays:      getEnvAsInt("JWT_REFRESH_EXP_DAYS", 7),
		CORSAllowOrigins:       getEnv("CORS_ALLOW_ORIGINS", "*"),
		RateLimitMaxRequests:   getEnvAsInt("RATE_LIMIT_MAX", 100),
		RateLimitExpirationSec: getEnvAsInt("RATE_LIMIT_EXPIRATION_SEC", 60),
		TTSEngineURL:           getEnv("TTS_ENGINE_URL", "http://tts-engine-service:8002"),
	}
}

// Helper function to read an environment variable with a default value.
func getEnv(key, defaultVal string) string {
	if val, exists := os.LookupEnv(key); exists && val != "" {
		return val
	}
	return defaultVal
}

// Helper function to read an environment variable as an integer.
func getEnvAsInt(key string, defaultVal int) int {
	valStr := getEnv(key, "")
	if val, err := strconv.Atoi(valStr); err == nil {
		return val
	}
	return defaultVal
}
