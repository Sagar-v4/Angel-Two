package handlers

import (
	"context"
	"log"
	"net/http"
	"time"

	brokerpb "github.com/Sagar-v4/Angel-Two/protobuf/gen/broker"
	"github.com/Sagar-v4/Angel-Two/services/api/clients"
	"github.com/Sagar-v4/Angel-Two/services/api/middleware"

	"github.com/gin-gonic/gin"
)

type PortfolioHandler struct {
	brokerClient *clients.BrokerServiceClientWrapper
}

func NewPortfolioHandler(brokerClient *clients.BrokerServiceClientWrapper) *PortfolioHandler {
	return &PortfolioHandler{brokerClient: brokerClient}
}

// GET /api/portfolio/holdings
func (h *PortfolioHandler) GetHoldings(c *gin.Context) {
	authStatus, _ := c.Get(middleware.AuthStatusKey)
	if authStatus != "verified" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}
	angelTokensVal, _ := c.Get(middleware.VerifiedAngelTokensKey)
	angelTokens, _ := angelTokensVal.([]string)
	if len(angelTokens) == 0 {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Session token error"})
		return
	}

	req := brokerpb.GetHoldingsRequest{
		AngelOneJwt:    angelTokens[0],
		ClientLocalIp:  c.ClientIP(),
		ClientPublicIp: c.GetHeader("X-Forwarded-For"),
	}
	if req.ClientPublicIp == "" {
		req.ClientPublicIp = c.ClientIP()
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 15*time.Second)
	defer cancel()

	resp, err := h.brokerClient.Client.GetHoldings(ctx, &req)
	if err != nil {
		log.Printf("GetHoldings: gRPC error from Broker: %v", err)
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Failed to get holdings via broker service"})
		return
	}
	c.JSON(http.StatusOK, resp)
}
