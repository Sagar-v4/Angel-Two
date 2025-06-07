package handlers

import (
	"context"
	"log"
	"net/http"
	"time"

	brokerpb "github.com/Sagar-v4/Angel-Two/protobuf/gen/broker"
	"github.com/Sagar-v4/Angel-Two/services/api/clients"
	"github.com/Sagar-v4/Angel-Two/services/api/config"
	"github.com/Sagar-v4/Angel-Two/services/api/middleware"

	"github.com/gin-gonic/gin"
	"google.golang.org/grpc/status"
)

type ProfileHandler struct {
	brokerClient *clients.BrokerServiceClientWrapper
	cfg          *config.Config // If needed for cookie settings or other configs
}

func NewProfileHandler(brokerClient *clients.BrokerServiceClientWrapper, cfg *config.Config) *ProfileHandler {
	return &ProfileHandler{brokerClient: brokerClient, cfg: cfg}
}

// GET /api/profile
func (h *ProfileHandler) GetProfile(c *gin.Context) {
	authStatusVal, _ := c.Get(middleware.AuthStatusKey)
	authStatus, _ := authStatusVal.(string)

	if authStatus != "verified" {
		log.Printf("/api/profile: Access denied. Auth status: %s", authStatus)
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required or session invalid"})
		return
	}

	// userIDVal, _ := c.Get(middleware.VerifiedUserIDKey) // JTI, if needed by broker
	// userID, _ := userIDVal.(string)

	angelTokensVal, _ := c.Get(middleware.VerifiedAngelTokensKey)
	angelTokens, ok := angelTokensVal.([]string)
	if !ok || len(angelTokens) < 1 {
		log.Printf("/api/profile: Angel One tokens not found in context or invalid format.")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal error: session tokens missing"})
		return
	}
	angelOneJWT := angelTokens[0] // The first token is the main JWT for API calls

	// Attempt to get client IP and other headers (these can be unreliable/spoofed)
	// For a robust solution, consider how these are passed or if they are essential for AngelOne
	clientLocalIP := c.ClientIP()                    // Gin's way, might be IP of proxy if behind one
	clientPublicIP := c.GetHeader("X-Forwarded-For") // Or other headers depending on proxy setup
	if clientPublicIP == "" {
		clientPublicIP = c.ClientIP() // Fallback
	}
	// MAC address is generally not available at this layer for web requests.

	ctx, cancel := context.WithTimeout(c.Request.Context(), 15*time.Second)
	defer cancel()

	brokerReq := &brokerpb.GetProfileRequest{
		AngelOneJwt:    angelOneJWT,
		ClientLocalIp:  clientLocalIP,
		ClientPublicIp: clientPublicIP,
		MacAddress: "e80::216e:6507:4b90:3719", // Likely not available
	}

	profileResp, err := h.brokerClient.Client.GetProfile(ctx, brokerReq)

	if err != nil {
		st, ok := status.FromError(err)
		if ok {
			log.Printf("/api/profile: gRPC error from Broker Service GetProfile: code=%s, msg=%s", st.Code(), st.Message())
			c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Failed to fetch profile from broker", "detail": st.Message()})
		} else {
			log.Printf("/api/profile: Non-gRPC error calling Broker Service GetProfile: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "An internal error occurred while fetching profile"})
		}
		return
	}

	if !profileResp.Status {
		log.Printf("/api/profile: Broker service reported failure: %s, errorcode: %s", profileResp.Message, profileResp.Errorcode)
		c.JSON(http.StatusBadGateway, gin.H{ // Or another appropriate status
			"error":              "Failed to retrieve profile from provider",
			"provider_message":   profileResp.Message,
			"provider_errorcode": profileResp.Errorcode,
		})
		return
	}

	c.JSON(http.StatusOK, profileResp) // Send the whole broker response (which includes status, message, data)
}
