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

type MarketHandler struct {
	brokerClient *clients.BrokerServiceClientWrapper
}

func NewMarketHandler(brokerClient *clients.BrokerServiceClientWrapper) *MarketHandler {
	return &MarketHandler{brokerClient: brokerClient}
}

// POST /api/market/ltp
func (h *MarketHandler) GetLTP(c *gin.Context) {
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

	var payload brokerpb.GetLTPRequest                 // Use proto for binding
	if err := c.ShouldBindJSON(&payload); err != nil { // The payload from HTTP body will only contain exchange_tokens
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid LTP payload", "details": err.Error()})
		return
	}
	payload.AngelOneJwt = angelTokens[0] // Set JWT from middleware
	payload.ClientLocalIp = c.ClientIP()
	payload.ClientPublicIp = c.GetHeader("X-Forwarded-For") // Or other relevant header
	if payload.ClientPublicIp == "" {
		payload.ClientPublicIp = c.ClientIP()
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 15*time.Second)
	defer cancel()

	resp, err := h.brokerClient.Client.GetLTP(ctx, &payload)
	if err != nil {
		log.Printf("GetLTP: gRPC error from Broker: %v", err)
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Failed to get LTP data via broker service"})
		return
	}
	c.JSON(http.StatusOK, resp)
}

// POST /api/market/quote
func (h *MarketHandler) GetFullQuote(c *gin.Context) {
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

	var payload brokerpb.GetFullQuoteRequest           // Use proto for binding
	if err := c.ShouldBindJSON(&payload); err != nil { // Expects exchange_tokens in body
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid full quote payload", "details": err.Error()})
		return
	}
	payload.AngelOneJwt = angelTokens[0] // Set JWT from middleware
	payload.ClientLocalIp = c.ClientIP()
	payload.ClientPublicIp = c.GetHeader("X-Forwarded-For")
	if payload.ClientPublicIp == "" {
		payload.ClientPublicIp = c.ClientIP()
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 15*time.Second)
	defer cancel()

	resp, err := h.brokerClient.Client.GetFullQuote(ctx, &payload)
	if err != nil {
		log.Printf("GetFullQuote: gRPC error from Broker: %v", err)
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Failed to get full quote data via broker service"})
		return
	}
	c.JSON(http.StatusOK, resp)
}
