package jwt

import (
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type Manager struct {
	secretKey     string
	tokenDuration time.Duration
}

// UserTokenClaims defines the structure of the claims for our user_token.
// It will hold the ID that points to the StoredTokenSet in our InMemoryStore.
type UserTokenClaims struct {
	JTI string `json:"jti"` // "jti" is JWT ID (StoredTokensDBID).
	jwt.RegisteredClaims
}

func NewManager(secretKey string, tokenDuration time.Duration) *Manager {
	return &Manager{
		secretKey:     secretKey,
		tokenDuration: tokenDuration,
	}
}

// Generate creates a new user_token containing the JTI (StoredTokensDBID).
func (m *Manager) Generate(jtiValue string) (string, error) {
	claims := UserTokenClaims{
		JTI: jtiValue,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(m.tokenDuration)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
			Issuer:    "angel-two-auth-service",
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(m.secretKey))
}

// Verify checks the validity of the user_token and returns its claims.
func (m *Manager) Verify(tokenString string) (*UserTokenClaims, error) {
	token, err := jwt.ParseWithClaims(
		tokenString,
		&UserTokenClaims{},
		func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
			}
			return []byte(m.secretKey), nil
		},
	)

	if err != nil {
		return nil, fmt.Errorf("invalid token: %w", err)
	}

	claims, ok := token.Claims.(*UserTokenClaims)
	if !ok || !token.Valid {
		return nil, fmt.Errorf("invalid token claims or token is not valid")
	}

	return claims, nil
}