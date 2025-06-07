package service

import (
	"context"
	"log"

	pb "github.com/Sagar-v4/Angel-Two/protobuf/gen/broker"
	angelone "github.com/Sagar-v4/Angel-Two/services/broker/angel-one"
	// "google.golang.org/grpc/codes"
	// "google.golang.org/grpc/status"
)

type BrokerServer struct {
	pb.UnimplementedBrokerServiceServer
	angelClient *angelone.Client
}

func NewBrokerServer(angelClient *angelone.Client) *BrokerServer {
	return &BrokerServer{
		angelClient: angelClient,
	}
}

func (s *BrokerServer) GetProfile(ctx context.Context, req *pb.GetProfileRequest) (*pb.GetProfileResponse, error) {
	log.Printf("Broker Service: GetProfile called with AngelOneJWT: %.10s...", req.AngelOneJwt)

	if req.AngelOneJwt == "" {
		log.Println("Broker Service: AngelOneJWT is empty in GetProfile request")
		// return nil, status.Errorf(codes.InvalidArgument, "angel_one_jwt is required")
		// For now, let AngelOne API handle this, or return specific error
		return &pb.GetProfileResponse{Status: false, Message: "Missing Angel One JWT"}, nil
	}

	profileResp, err := s.angelClient.GetUserProfile(
		req.AngelOneJwt,
		req.ClientLocalIp,
		req.ClientPublicIp,
		req.MacAddress,
	)

	if err != nil {
		log.Printf("Broker Service: Error from AngelOne client: %v", err)
		// This err is from our HTTP client layer (network, unmarshal)
		// return nil, status.Errorf(codes.Internal, "Failed to get profile from Angel One: %v", err)
		// Return a structured error within the response instead for now
		return &pb.GetProfileResponse{Status: false, Message: "Error fetching profile: " + err.Error()}, nil
	}

	// The profileResp from angelClient.GetUserProfile is already a *pb.GetProfileResponse
	return profileResp, nil
}

func (s *BrokerServer) Logout(ctx context.Context, req *pb.LogoutRequest) (*pb.LogoutResponse, error) {
	log.Printf("Broker Service: Logout called for clientCode: %s, AngelOneJWT: %.10s...", req.ClientCode, req.AngelOneJwt)

	if req.AngelOneJwt == "" || req.ClientCode == "" {
		log.Println("Broker Service: AngelOneJWT or ClientCode is empty in Logout request")
		// return nil, status.Errorf(codes.InvalidArgument, "angel_one_jwt and client_code are required")
		return &pb.LogoutResponse{Status: false, Message: "Missing Angel One JWT or Client Code"}, nil
	}

	logoutResp, err := s.angelClient.LogoutUser(
		req.AngelOneJwt,
		req.ClientCode,
		req.ClientLocalIp,
		req.ClientPublicIp,
		req.MacAddress,
	)

	if err != nil {
		// This 'err' is from our HTTP client layer (network issues, our own marshalling errors etc.)
		log.Printf("Broker Service: Error from AngelOne client during logout: %v", err)
		// return nil, status.Errorf(codes.Internal, "Failed to logout from Angel One: %v", err)
		return &pb.LogoutResponse{Status: false, Message: "Internal error during logout: " + err.Error()}, nil
	}

	// The logoutResp from angelClient.LogoutUser is already a *pb.LogoutResponse
	return logoutResp, nil
}
