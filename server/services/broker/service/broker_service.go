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

func (s *BrokerServer) PlaceOrder(ctx context.Context, req *pb.PlaceOrderRequest) (*pb.PlaceOrderResponse, error) {
	log.Printf("Broker Service: PlaceOrder called for symbol: %s", req.Tradingsymbol)
	if req.AngelOneJwt == "" { // Basic validation
		return &pb.PlaceOrderResponse{Status: false, Message: "Missing Angel One JWT"}, nil
	}
	// Further validation of order parameters can be added here
	return s.angelClient.PlaceOrder(req)
}

func (s *BrokerServer) CancelOrder(ctx context.Context, req *pb.CancelOrderRequest) (*pb.CancelOrderResponse, error) {
	log.Printf("Broker Service: CancelOrder called for order ID: %s", req.Orderid)
	if req.AngelOneJwt == "" {
		return &pb.CancelOrderResponse{Status: false, Message: "Missing Angel One JWT"}, nil
	}
	return s.angelClient.CancelOrder(req)
}

func (s *BrokerServer) GetHoldings(ctx context.Context, req *pb.GetHoldingsRequest) (*pb.GetHoldingsResponse, error) {
	log.Printf("Broker Service: GetHoldings called with AngelOneJWT: %.10s...", req.AngelOneJwt)
	if req.AngelOneJwt == "" {
		return &pb.GetHoldingsResponse{Status: false, Message: "Missing Angel One JWT"}, nil
	}
	return s.angelClient.GetHoldings(req)
}

func (s *BrokerServer) GetLTP(ctx context.Context, req *pb.GetLTPRequest) (*pb.GetLTPResponse, error) {
	log.Printf("Broker Service: GetLTP called for %d exchange groups", len(req.ExchangeTokens))
	if req.AngelOneJwt == "" {
		return &pb.GetLTPResponse{Status: false, Message: "Missing Angel One JWT"}, nil
	}
	if len(req.ExchangeTokens) == 0 {
		return &pb.GetLTPResponse{Status: false, Message: "No exchange tokens provided for LTP"}, nil
	}
	return s.angelClient.GetLTP(req)
}

func (s *BrokerServer) GetFullQuote(ctx context.Context, req *pb.GetFullQuoteRequest) (*pb.GetFullQuoteResponse, error) {
	log.Printf("Broker Service: GetFullQuote called for %d exchange groups", len(req.ExchangeTokens))
	if req.AngelOneJwt == "" {
		return &pb.GetFullQuoteResponse{Status: false, Message: "Missing Angel One JWT"}, nil
	}
	if len(req.ExchangeTokens) == 0 {
		return &pb.GetFullQuoteResponse{Status: false, Message: "No exchange tokens provided for Full Quote"}, nil
	}
	return s.angelClient.GetFullQuote(req)
}