package handlers

import (
	"context"
	"log"
	"net/http"
	"time"

	"github.com/Sagar-v4/Angel-Two/services/api/clients"
	"github.com/Sagar-v4/Angel-Two/services/api/config"
	authpb "github.com/Sagar-v4/Angel-Two/protobuf/gen/auth"
	"github.com/Sagar-v4/Angel-Two/services/api/middleware"

	"github.com/gin-gonic/gin"
	"google.golang.org/grpc/status"
)

type APIAuthHandler struct {
	authClient *clients.AuthServiceClientWrapper
	cfg        *config.Config
}

func NewAPIAuthHandler(authClient *clients.AuthServiceClientWrapper, cfg *config.Config) *APIAuthHandler {
	return &APIAuthHandler{authClient: authClient, cfg: cfg}
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

	loginResp, err := h.authClient.Client.Generate(ctx, &authpb.GenerateRequest{
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
	c.SetCookie(
		h.cfg.UserTokenCookieName,
		loginResp.UserToken,
		h.cfg.CookieMaxAge,
		h.cfg.CookiePath,
		h.cfg.CookieDomain,
		h.cfg.CookieSecure,
		h.cfg.CookieHTTPOnly,
	)

	log.Printf("API Login: Login successful. User token cookie set.")
	c.JSON(http.StatusOK, gin.H{"message": "Login successful", "user_token_status": "set"})
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
