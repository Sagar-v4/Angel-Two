package store

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"sync"
	"time"
)

var ErrTokenNotFound = errors.New("token data not found")

type StoredTokenSet struct {
	ID           string
	JWTToken     string
	FeedToken    string
	RefreshToken string
	CreatedAt    time.Time
}

type InMemoryStore struct {
	mu     sync.RWMutex
	tokens map[string]StoredTokenSet // Key: internal generated ID (data for user_token)
}

func NewInMemoryStore() *InMemoryStore {
	return &InMemoryStore{
		tokens: make(map[string]StoredTokenSet),
	}
}

func generateRandomID(length int) (string, error) {
	bytes := make([]byte, length)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}

// Store saves the three tokens and returns a unique ID for them.
func (s *InMemoryStore) Store(jwtToken, feedToken, refreshToken string) (string, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	id, err := generateRandomID(16) // 16 bytes -> 32 hex characters
	if err != nil {
		return "", err
	}

	s.tokens[id] = StoredTokenSet{
		ID:           id,
		JWTToken:     jwtToken,
		FeedToken:    feedToken,
		RefreshToken: refreshToken,
		CreatedAt:    time.Now(),
	}
	return id, nil
}

// Get retrieves the stored token set by the internal ID.
func (s *InMemoryStore) Get(id string) (StoredTokenSet, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	tokenSet, ok := s.tokens[id]
	if !ok {
		return StoredTokenSet{}, ErrTokenNotFound
	}
	return tokenSet, nil
}

// Delete (Optional, if you need logout functionality beyond just token expiry)
func (s *InMemoryStore) Delete(id string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.tokens, id)
}
