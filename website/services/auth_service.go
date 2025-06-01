package services

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"

	"bikenode-website/logger"
	"bikenode-website/models"
	"bikenode-website/repositories"
)

// DiscordUser represents the data returned from Discord's API
type DiscordUser struct {
	ID            string `json:"id"`
	Username      string `json:"username"`
	Discriminator string `json:"discriminator"`
	Avatar        string `json:"avatar"`
	Email         string `json:"email"`
}

// AuthService handles authentication-related operations
type AuthService struct {
	userRepo            *repositories.UserRepository
	discordClientID     string
	discordClientSecret string
	discordRedirectURI  string
	httpClient          *http.Client
}

// NewAuthService creates a new authentication service
func NewAuthService(userRepo *repositories.UserRepository, discordClientID, discordClientSecret, discordRedirectURI string) *AuthService {
	return &AuthService{
		userRepo:            userRepo,
		discordClientID:     discordClientID,
		discordClientSecret: discordClientSecret,
		discordRedirectURI:  discordRedirectURI,
		httpClient:          &http.Client{Timeout: 10 * time.Second},
	}
}

// GetDiscordAuthURL returns the URL for Discord OAuth2 authentication
func (s *AuthService) GetDiscordAuthURL() string {
	authURL := "https://discord.com/api/oauth2/authorize"
	params := url.Values{
		"client_id":     {s.discordClientID},
		"redirect_uri":  {s.discordRedirectURI},
		"response_type": {"code"},
		"scope":         {"identify email guilds"},
	}

	logger.Debug("Generated Discord auth URL", logger.Fields{
		"client_id":    s.discordClientID,
		"redirect_uri": s.discordRedirectURI,
		"scopes":       "identify email guilds",
	})

	return authURL + "?" + params.Encode()
}

// ExchangeCodeForToken exchanges an authorization code for a Discord access token and user info
// This implements the OAuth 2.0 authorization code flow:
// 1. Exchange code for access token from Discord
// 2. Use the access token to retrieve user profile information
// 3. Return both the token and user info for session creation
func (s *AuthService) ExchangeCodeForToken(code string) (string, *DiscordUser, error) {
	// Exchange code for token
	data := url.Values{
		"client_id":     {s.discordClientID},
		"client_secret": {s.discordClientSecret},
		"grant_type":    {"authorization_code"},
		"code":          {code},
		"redirect_uri":  {s.discordRedirectURI},
	}

	req, err := http.NewRequest("POST", "https://discord.com/api/oauth2/token", strings.NewReader(data.Encode()))
	if err != nil {
		logger.Error("Failed to create Discord token request", err, nil)
		return "", nil, err
	}

	req.Header.Add("Content-Type", "application/x-www-form-urlencoded")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		logger.Error("Failed to exchange code for token", err, nil)
		return "", nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		logger.Error("Discord returned non-200 status", nil, logger.Fields{
			"status_code": resp.StatusCode,
		})
		return "", nil, fmt.Errorf("failed to exchange code for token, status: %d", resp.StatusCode)
	}

	// Parse the response
	var tokenResp struct {
		AccessToken string `json:"access_token"`
		TokenType   string `json:"token_type"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&tokenResp); err != nil {
		logger.Error("Failed to decode token response", err, nil)
		return "", nil, err
	}

	logger.Debug("Successfully exchanged code for token", logger.Fields{
		"token_type": tokenResp.TokenType,
	})

	// Get user info
	userReq, err := http.NewRequest("GET", "https://discord.com/api/users/@me", nil)
	if err != nil {
		logger.Error("Failed to create user info request", err, nil)
		return "", nil, err
	}

	userReq.Header.Add("Authorization", tokenResp.TokenType+" "+tokenResp.AccessToken)

	userResp, err := s.httpClient.Do(userReq)
	if err != nil {
		logger.Error("Failed to get user info", err, nil)
		return "", nil, err
	}
	defer userResp.Body.Close()

	if userResp.StatusCode != http.StatusOK {
		logger.Error("Discord returned non-200 status for user info", nil, logger.Fields{
			"status_code": userResp.StatusCode,
		})
		return "", nil, fmt.Errorf("failed to get user info, status: %d", userResp.StatusCode)
	}

	var discordUser DiscordUser
	if err := json.NewDecoder(userResp.Body).Decode(&discordUser); err != nil {
		logger.Error("Failed to decode user info response", err, nil)
		return "", nil, err
	}

	logger.Info("Retrieved Discord user info", logger.Fields{
		"user_id":  discordUser.ID,
		"username": discordUser.Username,
	})

	return tokenResp.AccessToken, &discordUser, nil
}

// CreateOrUpdateUser creates or updates a user in the database from Discord user info
// If the user doesn't exist (based on Discord ID), create a new one
// If the user exists, update their information with the latest from Discord
func (s *AuthService) CreateOrUpdateUser(discordUser *DiscordUser) (*models.User, error) {
	// Check if user exists
	user, err := s.userRepo.GetByDiscordID(discordUser.ID)
	if err != nil && err.Error() != "sql: no rows in result set" {
		logger.Error("Error checking for existing user", err, logger.Fields{
			"discord_id": discordUser.ID,
		})
		return nil, err
	}

	now := time.Now()

	if user == nil {
		// Create new user
		user = &models.User{
			ID:            uuid.New(),
			DiscordID:     discordUser.ID,
			Username:      discordUser.Username,
			Discriminator: discordUser.Discriminator,
			Avatar:        discordUser.Avatar,
			Email:         discordUser.Email,
			CreatedAt:     now,
			UpdatedAt:     now,
		}

		if err := s.userRepo.Create(user); err != nil {
			logger.Error("Failed to create new user", err, logger.Fields{
				"discord_id": discordUser.ID,
				"username":   discordUser.Username,
			})
			return nil, err
		}

		logger.Info("Created new user", logger.Fields{
			"user_id":    user.ID,
			"discord_id": user.DiscordID,
			"username":   user.Username,
		})
	} else {
		// Update existing user
		user.Username = discordUser.Username
		user.Discriminator = discordUser.Discriminator
		user.Avatar = discordUser.Avatar
		user.Email = discordUser.Email
		user.UpdatedAt = now

		if err := s.userRepo.Update(user); err != nil {
			logger.Error("Failed to update existing user", err, logger.Fields{
				"user_id":    user.ID,
				"discord_id": user.DiscordID,
			})
			return nil, err
		}

		logger.Info("Updated existing user", logger.Fields{
			"user_id":    user.ID,
			"discord_id": user.DiscordID,
			"username":   user.Username,
		})
	}

	return user, nil
}

// CreateJWTToken creates a JWT token for a user
// The token contains the user ID and expiration time
func (s *AuthService) CreateJWTToken(user *models.User) string {
	// Get JWT secret from environment variables
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		logger.Warn("JWT_SECRET not set, using insecure default value", nil)
		jwtSecret = "insecure-jwt-secret-replace-in-production"
	}

	claims := jwt.MapClaims{
		"sub": user.ID.String(),
		"iat": time.Now().Unix(),
		"exp": time.Now().Add(time.Hour * 24 * 7).Unix(), // 1 week
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(jwtSecret))
	if err != nil {
		logger.Error("Failed to sign JWT token", err, logger.Fields{
			"user_id": user.ID,
		})
		return ""
	}

	logger.Debug("Created JWT token for user", logger.Fields{
		"user_id": user.ID,
	})

	return tokenString
}

// ValidateJWTToken validates a JWT token and returns the user ID
// This checks the signature and expiration of the token
func (s *AuthService) ValidateJWTToken(tokenString string) (string, error) {
	// Get JWT secret from environment variables
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		logger.Warn("JWT_SECRET not set, using insecure default value", nil)
		jwtSecret = "insecure-jwt-secret-replace-in-production"
	}

	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		// Validate the alg is what we expect
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(jwtSecret), nil
	})

	if err != nil {
		return "", err
	}

	if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
		return claims["sub"].(string), nil
	}

	return "", fmt.Errorf("invalid token")
}
