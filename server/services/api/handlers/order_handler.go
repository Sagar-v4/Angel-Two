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

type OrderHandler struct {
	brokerClient *clients.BrokerServiceClientWrapper
}

func NewOrderHandler(brokerClient *clients.BrokerServiceClientWrapper) *OrderHandler {
	return &OrderHandler{brokerClient: brokerClient}
}

// POST /api/orders/place
func (h *OrderHandler) PlaceOrder(c *gin.Context) {
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

	var payload brokerpb.PlaceOrderRequest // Use proto directly for binding if fields match JSON
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid order payload", "details": err.Error()})
		return
	}
	payload.AngelOneJwt = angelTokens[0] // Set JWT from middleware

	// Set IP/MAC from request if needed for broker service
	payload.ClientLocalIp = c.ClientIP()
	payload.ClientPublicIp = c.GetHeader("X-Forwarded-For") // Or other relevant header
	if payload.ClientPublicIp == "" {
		payload.ClientPublicIp = c.ClientIP()
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 20*time.Second)
	defer cancel()

	resp, err := h.brokerClient.Client.PlaceOrder(ctx, &payload)
	if err != nil {
		// Handle gRPC error
		log.Printf("PlaceOrder: gRPC error from Broker: %v", err)
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Failed to place order via broker service"})
		return
	}
	c.JSON(http.StatusOK, resp)
}

// POST /api/orders/cancel
func (h *OrderHandler) CancelOrder(c *gin.Context) {
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

	var payload brokerpb.CancelOrderRequest
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid cancel order payload", "details": err.Error()})
		return
	}
	payload.AngelOneJwt = angelTokens[0]
	payload.ClientLocalIp = c.ClientIP()
	payload.ClientPublicIp = c.GetHeader("X-Forwarded-For")
	if payload.ClientPublicIp == "" {
		payload.ClientPublicIp = c.ClientIP()
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	resp, err := h.brokerClient.Client.CancelOrder(ctx, &payload)
	if err != nil {
		log.Printf("CancelOrder: gRPC error from Broker: %v", err)
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Failed to cancel order via broker service"})
		return
	}
	c.JSON(http.StatusOK, resp)
}

// GET /api/orders/book
func (h *OrderHandler) GetOrderBook(c *gin.Context) {
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

	req := brokerpb.GetOrderBookRequest{
		AngelOneJwt:    angelTokens[0], // Use the primary JWT
		ClientLocalIp:  c.ClientIP(),
		ClientPublicIp: c.GetHeader("X-Forwarded-For"), // Or other relevant header
	}
	if req.ClientPublicIp == "" {
		req.ClientPublicIp = c.ClientIP()
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 15*time.Second)
	defer cancel()

	resp, err := h.brokerClient.Client.GetOrderBook(ctx, &req)
	if err != nil {
		log.Printf("GetOrderBook: gRPC error from Broker: %v", err)
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Failed to get order book via broker service"})
		return
	}
	c.JSON(http.StatusOK, resp)
}
