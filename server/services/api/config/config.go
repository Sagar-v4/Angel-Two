package config

import (
	"os"
	"strconv"
	"time"
)

type Config struct {
	HTTPPort            string
	AuthServiceAddr     string // gRPC address for the Auth service
	UserTokenCookieName string
	CookieMaxAge        int // in seconds
	CookieSecure        bool
	CookieHTTPOnly      bool
	CookieDomain        string
	CookiePath          string
}

func Load() *Config {
	// Example: default to false for local dev unless explicitly "true"
	cookieSecureStr := getEnv("COOKIE_SECURE", "false")
	cookieSecure, _ := strconv.ParseBool(cookieSecureStr)

	return &Config{
		HTTPPort:            getEnv("API_HTTP_PORT", "8080"),
		AuthServiceAddr:     getEnv("AUTH_SERVICE_ADDR", "localhost:50051"), // Adjust if auth service is elsewhere
		UserTokenCookieName: getEnv("USER_TOKEN_COOKIE_NAME", "user_session_token"),
		CookieMaxAge:        getIntEnv("COOKIE_MAX_AGE_SECONDS", int(24*time.Hour.Seconds())),
		CookieSecure:        cookieSecure,
		CookieHTTPOnly:      true,
		CookieDomain:        getEnv("COOKIE_DOMAIN", ""), // Empty for localhost, set for production
		CookiePath:          getEnv("COOKIE_PATH", "/"),
	}
}

func getEnv(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return fallback
}

func getIntEnv(key string, fallback int) int {
	if valueStr, exists := os.LookupEnv(key); exists {
		if value, err := strconv.Atoi(valueStr); err == nil {
			return value
		}
	}
	return fallback
}