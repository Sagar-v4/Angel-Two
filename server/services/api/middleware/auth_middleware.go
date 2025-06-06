package middleware

import (
	"context"
	"log"
	"time"

	"github.com/Sagar-v4/Angel-Two/services/api/clients" // For AuthServiceClientWrapper
	"github.com/Sagar-v4/Angel-Two/services/api/config"
	authpb "github.com/Sagar-v4/Angel-Two/protobuf/gen/auth"

	"github.com/gin-gonic/gin"
)

const (
	UserTokenContextKey = "userToken"
	AuthStatusKey       = "authStatus" // "verified", "not_verified", "no_token"
	UserIDContextKey    = "userID"     // Stores the JTI from a verified token
)

// AuthMiddleware checks for user_token cookie and verifies it.
// It sets context values for downstream handlers.
func AuthMiddleware(authClient *clients.AuthServiceClientWrapper, cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		userToken, err := c.Cookie(cfg.UserTokenCookieName)

		if err != nil || userToken == "" {
			log.Printf("AuthMiddleware: No '%s' cookie found.", cfg.UserTokenCookieName)
			c.Set(AuthStatusKey, "no_token")
			c.Next() // Allow request to proceed, Login handler will check AuthStatusKey
			return
		}

		c.Set(UserTokenContextKey, userToken) // Store token for potential use by handlers

		ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
		defer cancel()

		verifyResp, verifyErr := authClient.Client.Verify(ctx, &authpb.VerifyRequest{UserToken: userToken})

		if verifyErr != nil {
			log.Printf("AuthMiddleware: Error verifying token with Auth Service: %v", verifyErr)
			// This is a gRPC communication error or an error returned by Auth service (e.g., codes.Unauthenticated)
			c.Set(AuthStatusKey, "verification_failed_rpc_error")
			// Optionally clear a potentially bad cookie
			// c.SetCookie(cfg.UserTokenCookieName, "", -1, cfg.CookiePath, cfg.CookieDomain, cfg.CookieSecure, cfg.CookieHTTPOnly)
			c.Next()
			return
		}

		if verifyResp != nil && verifyResp.Success {
			log.Printf("AuthMiddleware: Token verified successfully. JTI: (not directly available from VerifyResponse in this design)")
			c.Set(AuthStatusKey, "verified")
			// We don't get JTI directly from current VerifyResponse, but we know it's valid.
			// If you need JTI, Auth service's VerifyResponse would need to return it.
			// For now, we'll just mark as verified.
		} else {
			log.Printf("AuthMiddleware: Token verification by Auth Service returned Success=false.")
			c.Set(AuthStatusKey, "not_verified")
			// Clear the invalid cookie
			c.SetCookie(cfg.UserTokenCookieName, "", -1, cfg.CookiePath, cfg.CookieDomain, cfg.CookieSecure, cfg.CookieHTTPOnly)
		}

		c.Next()
	}
}
