package clients

import (
	"log"

	// This import path depends on the go_package in your auth.proto
	// and where the generated code lands relative to this module.
	// If go_package is "github.com/Sagar-v4/Angel-Two/auth"
	// and you've generated it into services/api/protos/gen/auth,
	// and your services/api module is github.com/Sagar-v4/Angel-Two/services/api
	// then the path would be:
	authpb "github.com/Sagar-v4/Angel-Two/protobuf/gen/auth"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure" // For local dev
	"google.golang.org/grpc/status"
	"google.golang.org/grpc/codes"
)

type AuthServiceClientWrapper struct {
	Client authpb.AuthClient
	Conn   *grpc.ClientConn
}

func NewAuthServiceClient(addr string) (*AuthServiceClientWrapper, error) {
	// For local development, using insecure credentials.
	// In production, you'd use TLS.
	conn, err := grpc.Dial(addr, grpc.WithTransportCredentials(insecure.NewCredentials()), grpc.WithBlock())
	if err != nil {
		log.Printf("Failed to connect to Auth Service at %s: %v", addr, err)
		return nil, status.Errorf(codes.Unavailable, "failed to connect to auth service: %v", err)
	}
	log.Printf("Successfully connected to Auth Service at %s", addr)
	client := authpb.NewAuthClient(conn)
	return &AuthServiceClientWrapper{Client: client, Conn: conn}, nil
}

func (c *AuthServiceClientWrapper) Close() {
	if c.Conn != nil {
		c.Conn.Close()
	}
}