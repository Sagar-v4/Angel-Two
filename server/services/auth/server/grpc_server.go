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

// Generate handles the Generate RPC call.
func (s *AuthServer) Generate(ctx context.Context, req *pb.GenerateRequest) (*pb.GenerateResponse, error) {
	log.Printf("Received Generate request: JWT(%.10s...), Feed(%.10s...), Refresh(%.10s...)",
		req.JwtToken, req.FeedToken, req.RefreshToken)

	if req.JwtToken == "" || req.FeedToken == "" {
		log.Println("Error: Missing required tokens in GenerateRequest")
		// For gRPC, it's better to return an error that can be translated to a status code
		// return nil, status.Errorf(codes.InvalidArgument, "Missing required tokens: jwt_token and feed_token")
		// For now, sticking to the previous simple error in response, but consider gRPC status errors.
		return &pb.GenerateResponse{UserToken: "" /* Error can be added to GenerateResponse if needed */}, nil
	}

	storedID, err := s.tokenStore.Store(req.JwtToken, req.FeedToken, req.RefreshToken)
	if err != nil {
		log.Printf("Error storing tokens: %v", err)
		// return nil, status.Errorf(codes.Internal, "Failed to store tokens: %v", err)
		return &pb.GenerateResponse{UserToken: ""}, err // Or return an error directly
	}
	log.Printf("Tokens stored with ID (JTI value): %s", storedID)

	// Pass the storedID as the jtiValue to the JWT manager
	userTokenString, err := s.jwtManager.Generate(storedID)
	if err != nil {
		log.Printf("Error generating user_token: %v", err)
		// Important: If user_token generation fails, consider cleaning up the recently stored tokens
		s.tokenStore.Delete(storedID)
		// return nil, status.Errorf(codes.Internal, "Failed to generate user token: %v", err)
		return &pb.GenerateResponse{UserToken: ""}, err
	}
	log.Printf("Generated user_token: %.10s...", userTokenString)

	return &pb.GenerateResponse{UserToken: userTokenString}, nil
}

// Verify handles the Verify RPC call.
func (s *AuthServer) Verify(ctx context.Context, req *pb.VerifyRequest) (*pb.VerifyResponse, error) {
	log.Printf("Received Verify request for user_token: %.10s...", req.UserToken)

	// Default failure response
	failureResponse := &pb.VerifyResponse{
		Success: false,
		Tokens:  []string{}, // Explicitly an empty slice, though default is nil which marshals similarly
	}

	if req.UserToken == "" {
		log.Println("Error: Empty user_token in VerifyRequest")
		// return nil, status.Errorf(codes.InvalidArgument, "user_token cannot be empty")
		return failureResponse, nil // Return the specified failure structure
	}

	// Verify the user_token
	claims, err := s.jwtManager.Verify(req.UserToken)
	if err != nil {
		log.Printf("User_token verification failed: %v", err)
		// return nil, status.Errorf(codes.Unauthenticated, "Invalid user_token: %v", err)
		return failureResponse, nil // Return the specified failure structure
	}

	// If verification is successful, retrieve the original tokens from the store
	storedTokenSet, err := s.tokenStore.Get(claims.JTI)
	if err != nil {
		log.Printf("Failed to retrieve stored tokens for JTI %s (from claims): %v. This could be due to logout or data loss.", claims.JTI, err)
		// This case means the JWT was valid, but the associated session data is gone.
		// return nil, status.Errorf(codes.NotFound, "Session data not found for token JTI: %s", claims.JTI)
		return failureResponse, nil // Return the specified failure structure
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
