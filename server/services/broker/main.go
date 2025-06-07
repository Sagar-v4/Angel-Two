package main

import (
	"fmt"
	"log"
	"net"
	"os"
	"os/signal"
	"syscall"

	pb "github.com/Sagar-v4/Angel-Two/protobuf/gen/broker"
	angelone "github.com/Sagar-v4/Angel-Two/services/broker/angel-one"
	"github.com/Sagar-v4/Angel-Two/services/broker/config"
	brokerservice "github.com/Sagar-v4/Angel-Two/services/broker/service"

	"github.com/joho/godotenv"
	"google.golang.org/grpc"
	"google.golang.org/grpc/reflection"
)

func main() {
	errEnv := godotenv.Load()
	if errEnv != nil {
		log.Println("Broker Service: Warning: Error loading .env file:", errEnv)
	}

	cfg := config.Load()
	if cfg.AngelOneAPIKey == "YOUR_ANGELONE_PRIVATE_API_KEY" || cfg.AngelOneAPIKey == "" {
		log.Fatalf("FATAL: AngelOneAPIKey is not set or is using the default placeholder. Please set ANGELONE_API_KEY environment variable.")
	}

	lis, err := net.Listen("tcp", fmt.Sprintf(":%s", cfg.GRPCPort))
	if err != nil {
		log.Fatalf("Failed to listen on port %s: %v", cfg.GRPCPort, err)
	}

	angelClient := angelone.NewClient(cfg.AngelOneAPIKey, cfg.AngelOneUserType, cfg.AngelOneSourceID)
	brokerServer := brokerservice.NewBrokerServer(angelClient)

	s := grpc.NewServer()
	pb.RegisterBrokerServiceServer(s, brokerServer)
	reflection.Register(s)

	log.Printf("Broker gRPC Service listening on :%s", cfg.GRPCPort)

	go func() {
		if err := s.Serve(lis); err != nil {
			log.Fatalf("Failed to serve Broker gRPC: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down Broker gRPC Service...")
	s.GracefulStop()
	log.Println("Broker gRPC Service stopped.")
}
