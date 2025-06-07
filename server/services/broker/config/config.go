package config

import (
	"os"
)

type Config struct {
	GRPCPort       string
	AngelOneAPIKey string // Your X-PrivateKey for Angel One
	// Default values for other Angel One headers if they are constant
	AngelOneUserType string
	AngelOneSourceID string
}

func Load() *Config {
	return &Config{
		GRPCPort:         getEnv("GRPC_PORT", "50052"),
		AngelOneAPIKey:   getEnv("ANGELONE_API_KEY", "YOUR_ANGELONE_PRIVATE_API_KEY"), // Store securely!
		AngelOneUserType: getEnv("ANGELONE_USER_TYPE", "USER"),
		AngelOneSourceID: getEnv("ANGELONE_SOURCE_ID", "WEB"),
	}
}

func getEnv(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return fallback
}
