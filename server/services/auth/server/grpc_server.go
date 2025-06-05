package server

import (
	"context"
	"log"

	// Use the correct import path based on your go.mod and gen folder
	pb "github.com/Sagar-v4/Angel-Two/services/auth/gen/auth"
	"github.com/Sagar-v4/Angel-Two/services/auth/jwt"
	"github.com/Sagar-v4/Angel-Two/services/auth/store"
)

// AuthServer implements the gRPC Auth service.
type AuthServer struct {
	pb.UnimplementedAuthServer
	tokenStore *store.InMemoryStore
	jwtManager *jwt.Manager
}

// NewAuthServer creates a new instance of the AuthServer.
func NewAuthServer(tokenStore *store.InMemoryStore, jwtManager *jwt.Manager) *AuthServer {
	return &AuthServer{
		tokenStore: tokenStore,
		jwtManager: jwtManager,
	}
}

// Login handles the Login RPC call.
func (s *AuthServer) Login(ctx context.Context, req *pb.LoginRequest) (*pb.LoginResponse, error) {
	log.Printf("Received Login request: JWT(%.10s...), Feed(%.10s...), Refresh(%.10s...)",
		req.JwtToken, req.FeedToken, req.RefreshToken)

	if req.JwtToken == "" || req.FeedToken == "" {
		log.Println("Error: Missing required tokens in LoginRequest")
		// Consider returning a gRPC error status code like codes.InvalidArgument
		return &pb.LoginResponse{}, nil // Or return an error with status code
	}

	// Store the received tokens
	storedID, err := s.tokenStore.Store(req.JwtToken, req.FeedToken, req.RefreshToken)
	if err != nil {
		log.Printf("Error storing tokens: %v", err)
		// Consider returning codes.Internal
		return &pb.LoginResponse{}, err
	}
	log.Printf("Tokens stored with ID (JTI value): %s", storedID)

	// Pass the storedID as the jtiValue to the JWT manager
	userTokenString, err := s.jwtManager.Generate(storedID)
	if err != nil {
		log.Printf("Error generating user_token: %v", err)
		// Important: If user_token generation fails, consider cleaning up the recently stored tokens
		s.tokenStore.Delete(storedID)
		return &pb.LoginResponse{}, err
	}
	log.Printf("Generated user_token: %.10s...", userTokenString)

	return &pb.LoginResponse{UserToken: userTokenString}, nil
}

// Verify handles the Verify RPC call.
func (s *AuthServer) Verify(ctx context.Context, req *pb.VerifyRequest) (*pb.VerifyResponse, error) {
	log.Printf("Received Verify request for user_token: %.10s...", req.UserToken)

	if req.UserToken == "" {
		log.Println("Error: Empty user_token in VerifyRequest")
		return &pb.VerifyResponse{Success: false}, nil
	}

	// Verify the user_token
	claims, err := s.jwtManager.Verify(req.UserToken)
	if err != nil {
		log.Printf("User_token verification failed: %v", err)
		return &pb.VerifyResponse{Success: false}, nil // Don't propagate JWT specific errors to client directly
	}

	// Use claims.JTI to retrieve the stored token set
	storedTokenSet, err := s.tokenStore.Get(claims.JTI) // Changed from claims.StoredTokensDBID
	if err != nil {
		log.Printf("Failed to retrieve stored tokens for JTI %s (from claims): %v", claims.JTI, err)
		return &pb.VerifyResponse{Success: false}, nil
	}

	log.Printf("User_token verified successfully. JTI: %s", claims.JTI)
	return &pb.VerifyResponse{
		Success: true,
		Tokens: []string{
			storedTokenSet.JWTToken,
			storedTokenSet.FeedToken,
			storedTokenSet.RefreshToken,
		},
	}, nil
}