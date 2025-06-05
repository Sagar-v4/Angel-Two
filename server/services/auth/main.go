package main

import (
	"fmt"
	"log"
	"net"
	"os"
	"os/signal"
	"syscall"

	// Adjust these import paths based on your actual module path and directory structure
	cfg "github.com/Sagar-v4/Angel-Two/services/auth/config"
	pb "github.com/Sagar-v4/Angel-Two/services/auth/gen/auth" // Path to generated proto Go files
	jwtm "github.com/Sagar-v4/Angel-Two/services/auth/jwt"
	authserver "github.com/Sagar-v4/Angel-Two/services/auth/server"
	"github.com/Sagar-v4/Angel-Two/services/auth/store"

	"google.golang.org/grpc"
	"google.golang.org/grpc/reflection" // For tools like grpcurl
)

func main() {
	config := cfg.Load()

	lis, err := net.Listen("tcp", fmt.Sprintf(":%s", config.GRPCPort))
	if err != nil {
		log.Fatalf("Failed to listen on port %s: %v", config.GRPCPort, err)
	}

	// Initialize dependencies
	tokenStore := store.NewInMemoryStore()
	jwtManager := jwtm.NewManager(config.UserJWTSecretKey, config.UserJWTDuration)
	grpcServer := authserver.NewAuthServer(tokenStore, jwtManager)

	// Create and register gRPC server
	s := grpc.NewServer()
	pb.RegisterAuthServer(s, grpcServer)

	// Enable reflection for easier debugging with tools like grpcurl
	reflection.Register(s)

	log.Printf("gRPC Auth Service listening on :%s", config.GRPCPort)

	// Graceful shutdown
	go func() {
		if err := s.Serve(lis); err != nil {
			log.Fatalf("Failed to serve gRPC: %v", err)
		}
	}()

	// Wait for termination signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down gRPC server...")
	s.GracefulStop()
	log.Println("gRPC server stopped.")
}
