package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/Sagar-v4/Angel-Two/services/api/clients"
	"github.com/Sagar-v4/Angel-Two/services/api/config"
	"github.com/Sagar-v4/Angel-Two/services/api/handlers"
	"github.com/Sagar-v4/Angel-Two/services/api/middleware"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	errEnv := godotenv.Load()
	if errEnv != nil {
		log.Println("Broker Service: Warning: Error loading .env file:", errEnv)
	}

	cfg := config.Load()

	// Initialize gRPC Client for Auth Service
	authClientWrapper, err := clients.NewAuthServiceClient(cfg.AuthServiceAddr)
	if err != nil {
		log.Fatalf("Could not initialize Auth Service client: %v", err)
	}
	defer authClientWrapper.Close()

	// Initialize gRPC Client for Broker Service
	brokerClientWrapper, err := clients.NewBrokerServiceClient(cfg.BrokerServiceAddr)
	if err != nil {
		log.Fatalf("Could not initialize Broker Service client: %v", err)
	}
	defer brokerClientWrapper.Close()

	// Initialize Gin router
	// gin.SetMode(gin.ReleaseMode) // For production
	router := gin.Default()

	// CORS Middleware - Adjust origins as necessary
	corsConfig := cors.DefaultConfig()
	// Allow your frontend's origin
	corsConfig.AllowOrigins = []string{"http://localhost:3000", "http://your-frontend-domain.com"}
	corsConfig.AllowMethods = []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"}
	corsConfig.AllowHeaders = []string{"Origin", "Content-Type", "Accept", "Authorization", "X-Requested-With"}
	corsConfig.AllowCredentials = true // Crucial for cookies to be sent and received
	router.Use(cors.New(corsConfig))

	// Apply AuthMiddleware to all /api routes
	// This middleware will run on every request to /api/*
	// It will check for the cookie and verify it, setting context values.
	apiGroup := router.Group("/api")
	apiGroup.Use(middleware.AuthMiddleware(authClientWrapper, cfg)) // Global for /api group

	// Initialize Handlers
	apiAuthHandler := handlers.NewAPIAuthHandler(authClientWrapper, brokerClientWrapper, cfg) // Pass both clients
	profileHandler := handlers.NewProfileHandler(brokerClientWrapper, cfg)

	// API Routes
	apiGroup.POST("/login", apiAuthHandler.Login)
	apiGroup.GET("/auth_status", apiAuthHandler.AuthStatus)
	apiGroup.POST("/logout", apiAuthHandler.Logout)
	apiGroup.GET("/profile", profileHandler.GetProfile)

	// You can add other routes here that will also have the AuthMiddleware applied
	// e.g., apiGroup.GET("/profile", profileHandler.GetProfile)

	// HTTP Server
	srv := &http.Server{
		Addr:    ":" + cfg.HTTPPort,
		Handler: router,
	}

	// Graceful shutdown
	go func() {
		log.Printf("API Service listening on HTTP port %s", cfg.HTTPPort)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("API Service ListenAndServe error: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("Shutting down API Service...")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("API Service forced to shutdown: %v", err)
	}

	log.Println("API Service exited properly.")
}
