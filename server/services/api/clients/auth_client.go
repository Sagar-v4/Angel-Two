package clients

import (
	"log"

	authpb "github.com/Sagar-v4/Angel-Two/protobuf/gen/auth"

	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/credentials/insecure" // For local dev
	"google.golang.org/grpc/status"
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
