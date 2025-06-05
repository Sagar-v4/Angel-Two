package config

import (
	"os"
	"strconv"
	"time"
)

type Config struct {
	GRPCPort         string
	UserJWTSecretKey string
	UserJWTDuration  time.Duration
}

func Load() *Config {
	port := getEnv("GRPC_PORT", "50051")
	secret := getEnv("USER_JWT_SECRET_KEY", "a-very-secure-secret-for-user-token") // CHANGE IN PRODUCTION!
	durationHours, _ := strconv.Atoi(getEnv("USER_JWT_DURATION_HOURS", "24"))

	return &Config{
		GRPCPort:         port,
		UserJWTSecretKey: secret,
		UserJWTDuration:  time.Duration(durationHours) * time.Hour,
	}
}

func getEnv(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return fallback
}
