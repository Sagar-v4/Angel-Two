package handlers

import (
	"context"
	"log"
	"net/http"
	"time"

	authpb "github.com/Sagar-v4/Angel-Two/protobuf/gen/auth"
	brokerpb "github.com/Sagar-v4/Angel-Two/protobuf/gen/broker"
	"github.com/Sagar-v4/Angel-Two/services/api/clients"
	"github.com/Sagar-v4/Angel-Two/services/api/config"
	"github.com/Sagar-v4/Angel-Two/services/api/middleware"

	"github.com/gin-gonic/gin"
	"google.golang.org/grpc/status"
)

type APIAuthHandler struct {
	authService   *clients.AuthServiceClientWrapper // Renamed for clarity
	brokerService *clients.BrokerServiceClientWrapper
	cfg           *config.Config
}

func NewAPIAuthHandler(
	authClient *clients.AuthServiceClientWrapper,
	brokerClient *clients.BrokerServiceClientWrapper, // Add this
	cfg *config.Config,
) *APIAuthHandler {
	return &APIAuthHandler{
		authService:   authClient,
		brokerService: brokerClient,
		cfg:           cfg,
	}
}

type LoginPayload struct {
	JWTToken     string `json:"jwt_token" binding:"required"`
	FeedToken    string `json:"feed_token" binding:"required"`
	RefreshToken string `json:"refresh_token"` // Can be optional
}

// POST /api/login
func (h *APIAuthHandler) Login(c *gin.Context) {
	authStatus, _ := c.Get(middleware.AuthStatusKey)
	log.Printf("/api/login: Auth status from middleware: %s", authStatus)

	// Even if a token exists and is verified, login means getting new tokens
	// and potentially overwriting the old session.

	var payload LoginPayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid login payload", "details": err.Error()})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	loginResp, err := h.authService.Client.Generate(ctx, &authpb.GenerateRequest{
		JwtToken:     payload.JWTToken,
		FeedToken:    payload.FeedToken,
		RefreshToken: payload.RefreshToken,
	})

	if err != nil {
		// Handle gRPC specific errors
		st, ok := status.FromError(err)
		if ok {
			log.Printf("API Login: gRPC error from Auth Service Login: code=%s, msg=%s", st.Code(), st.Message())
			c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Auth service unavailable or login failed", "detail": st.Message()})
		} else {
			log.Printf("API Login: Non-gRPC error calling Auth Service Login: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "An internal error occurred during login"})
		}
		return
	}

	if loginResp == nil || loginResp.UserToken == "" {
		log.Println("API Login: Auth Service returned nil response or empty user_token")
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication failed with auth provider"})
		return
	}

	// Set the new user_token as a cookie
	// c.SetCookie(
	// 	h.cfg.UserTokenCookieName,
	// 	loginResp.UserToken,
	// 	h.cfg.CookieMaxAge,
	// 	h.cfg.CookiePath,
	// 	h.cfg.CookieDomain,
	// 	h.cfg.CookieSecure,
	// 	h.cfg.CookieHTTPOnly,
	// )

	log.Printf("API Login: Login successful. User token cookie set.")
	c.JSON(http.StatusOK, gin.H{"message": "Login successful", "user_token": loginResp.UserToken})
}

// Example: GET /api/auth_status (A simple endpoint to test the middleware)
func (h *APIAuthHandler) AuthStatus(c *gin.Context) {
	authStatusVal, _ := c.Get(middleware.AuthStatusKey)
	authStatus, _ := authStatusVal.(string)

	userTokenVal, _ := c.Get(middleware.UserTokenContextKey)
	userToken, _ := userTokenVal.(string)

	response := gin.H{
		"message":            "Current authentication status",
		"middleware_verdict": authStatus,
	}
	if userToken != "" {
		response["user_token_present"] = true
		response["user_token_snippet"] = userToken[:min(10, len(userToken))] + "..."
	} else {
		response["user_token_present"] = false
	}

	c.JSON(http.StatusOK, response)
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

type LogoutPayload struct {
	ClientCode string `json:"clientcode" binding:"required"`
}

// POST /api/logout
func (h *APIAuthHandler) Logout(c *gin.Context) {
	log.Println("/api/logout: Received logout request")
	authStatusVal, _ := c.Get(middleware.AuthStatusKey)
	authStatus, _ := authStatusVal.(string)

	userTokenForAuthService, _ := c.Get(middleware.UserTokenContextKey) // This is the "user_session_token"
	userTokenStr, _ := userTokenForAuthService.(string)

	// Clear client-side cookie regardless of server-side outcomes
	// This is the primary goal for the user experience.
	c.SetCookie(
		h.cfg.UserTokenCookieName,
		"", // Empty value
		-1, // MaxAge < 0 deletes the cookie
		h.cfg.CookiePath,
		h.cfg.CookieDomain,
		h.cfg.CookieSecure,
		h.cfg.CookieHTTPOnly,
	)
	log.Println("/api/logout: User session cookie cleared from client.")

	// If there was no valid session token to begin with, we can just return success.
	if authStatus != "verified" || userTokenStr == "" {
		log.Printf("/api/logout: No active verified session or token missing. Auth status: %s. Responding as successful logout.", authStatus)
		c.JSON(http.StatusOK, gin.H{"message": "Logout successful (no active session or session already invalid)."})
		return
	}

	// Proceed with backend logout operations if there was a verified session.
	var payload LogoutPayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		log.Printf("/api/logout: Invalid request body: %v", err)
		// Cookie is already cleared, but inform client of bad request
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body", "details": err.Error()})
		return
	}

	angelTokensVal, _ := c.Get(middleware.VerifiedAngelTokensKey)
	angelTokens, ok := angelTokensVal.([]string)
	if !ok || len(angelTokens) < 1 {
		log.Println("/api/logout: Angel One tokens not found in context. Cannot proceed with Angel One logout.")
		// Still a "successful" logout from user's perspective as local cookie is cleared.
		// But we might want to log this as a server-side inconsistency.
		c.JSON(http.StatusOK, gin.H{"message": "Logout processed (session cleared), but upstream logout could not be performed due to missing tokens."})
		return
	}
	angelOneJWT := angelTokens[0]

	// Attempt to get client IP and other headers
	clientLocalIP := c.ClientIP()
	clientPublicIP := c.GetHeader("X-Forwarded-For")
	if clientPublicIP == "" {
		clientPublicIP = c.ClientIP()
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 15*time.Second)
	defer cancel()

	// 1. Call Broker Service to logout from Angel One
	brokerLogoutReq := &brokerpb.LogoutRequest{
		AngelOneJwt:    angelOneJWT,
		ClientCode:     payload.ClientCode,
		ClientLocalIp:  clientLocalIP,
		ClientPublicIp: clientPublicIP,
		MacAddress:     "e80::216e:6507:4b90:3719", // Likely not available
	}
	brokerLogoutResp, brokerErr := h.brokerService.Client.Logout(ctx, brokerLogoutReq) // Assuming authClient has BrokerClient
	// You might need to pass the brokerClient to APIAuthHandler if it's not already there.
	// For now, let's assume APIAuthHandler has access to both AuthServiceClient and BrokerServiceClient.
	// This requires changing NewAPIAuthHandler and its struct definition.

	if brokerErr != nil {
		log.Printf("/api/logout: Error calling Broker Service Logout: %v", brokerErr)
		// Log error, but don't fail the entire user logout because of this.
	} else if brokerLogoutResp != nil && !brokerLogoutResp.Status {
		log.Printf("/api/logout: Broker Service Logout from Angel One reported failure: Msg=%s, ErrCode=%s",
			brokerLogoutResp.Message, brokerLogoutResp.Errorcode)
	} else if brokerLogoutResp != nil && brokerLogoutResp.Status {
		log.Println("/api/logout: Successfully logged out from Angel One via Broker Service.")
	}

	// 2. Call Auth Service to invalidate the user_session_token (JTI)
	if userTokenStr != "" { // Only if we had a token from middleware
		_, authServiceLogoutErr := h.authService.Client.Logout(ctx, &authpb.TokenActionRequest{UserToken: userTokenStr})
		// Assuming h.authClient has distinct fields for AuthGRPCClient and BrokerGRPCClient
		if authServiceLogoutErr != nil {
			log.Printf("/api/logout: Error calling Auth Service Logout for user_session_token: %v", authServiceLogoutErr)
		} else {
			log.Println("/api/logout: Successfully invalidated user_session_token with Auth Service.")
		}
	}

	c.JSON(http.StatusOK, gin.H{"message": "Logout successful."})
}
