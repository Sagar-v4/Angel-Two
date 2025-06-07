package clients

import (
	"log"

	brokerpb "github.com/Sagar-v4/Angel-Two/protobuf/gen/broker"

	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/status"
)

type BrokerServiceClientWrapper struct {
	Client brokerpb.BrokerServiceClient
	Conn   *grpc.ClientConn
}

func NewBrokerServiceClient(addr string) (*BrokerServiceClientWrapper, error) {
	conn, err := grpc.Dial(addr, grpc.WithTransportCredentials(insecure.NewCredentials()), grpc.WithBlock())
	if err != nil {
		log.Printf("Failed to connect to Broker Service at %s: %v", addr, err)
		return nil, status.Errorf(codes.Unavailable, "failed to connect to broker service: %v", err)
	}
	log.Printf("Successfully connected to Broker Service at %s", addr)
	client := brokerpb.NewBrokerServiceClient(conn)
	return &BrokerServiceClientWrapper{Client: client, Conn: conn}, nil
}

func (c *BrokerServiceClientWrapper) Close() {
	if c.Conn != nil {
		c.Conn.Close()
	}
}
