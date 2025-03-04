package services

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"

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
	userRepo        *repositories.UserRepository
	discordClientID string
	discordSecret   string
	redirectURI     string
	jwtSecret       string
}

// NewAuthService creates a new authentication service
func NewAuthService(userRepo *repositories.UserRepository, discordClientID, discordSecret, redirectURI string) *AuthService {
	return &AuthService{
		userRepo:        userRepo,
		discordClientID: discordClientID,
		discordSecret:   discordSecret,
		redirectURI:     redirectURI,
	}
}

// GetDiscordAuthURL returns the URL for Discord OAuth2 authentication
func (s *AuthService) GetDiscordAuthURL() string {
	scopes := []string{"identify", "email", "guilds"}

	params := url.Values{}
	params.Add("client_id", s.discordClientID)
	params.Add("redirect_uri", s.redirectURI)
	params.Add("response_type", "code")
	params.Add("scope", strings.Join(scopes, " "))

	return "https://discord.com/api/oauth2/authorize?" + params.Encode()
}

// ExchangeCodeForToken exchanges an authorization code for a Discord access token and user info
func (s *AuthService) ExchangeCodeForToken(code string) (string, *DiscordUser, error) {
	// Exchange code for token
	data := url.Values{}
	data.Set("client_id", s.discordClientID)
	data.Set("client_secret", s.discordSecret)
	data.Set("grant_type", "authorization_code")
	data.Set("code", code)
	data.Set("redirect_uri", s.redirectURI)

	req, err := http.NewRequest("POST", "https://discord.com/api/oauth2/token", strings.NewReader(data.Encode()))
	if err != nil {
		return "", nil, err
	}

	req.Header.Add("Content-Type", "application/x-www-form-urlencoded")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return "", nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", nil, fmt.Errorf("failed to exchange code for token, status: %d", resp.StatusCode)
	}

	// Parse the response
	var tokenResp struct {
		AccessToken string `json:"access_token"`
		TokenType   string `json:"token_type"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&tokenResp); err != nil {
		return "", nil, err
	}

	// Get user info
	userReq, err := http.NewRequest("GET", "https://discord.com/api/users/@me", nil)
	if err != nil {
		return "", nil, err
	}

	userReq.Header.Add("Authorization", tokenResp.TokenType+" "+tokenResp.AccessToken)

	userResp, err := client.Do(userReq)
	if err != nil {
		return "", nil, err
	}
	defer userResp.Body.Close()

	if userResp.StatusCode != http.StatusOK {
		return "", nil, fmt.Errorf("failed to get user info, status: %d", userResp.StatusCode)
	}

	var discordUser DiscordUser
	if err := json.NewDecoder(userResp.Body).Decode(&discordUser); err != nil {
		return "", nil, err
	}

	return tokenResp.AccessToken, &discordUser, nil
}

// CreateOrUpdateUser creates or updates a user in the database from Discord user info
func (s *AuthService) CreateOrUpdateUser(discordUser *DiscordUser) (*models.User, error) {
	// Check if user exists
	user, err := s.userRepo.GetByDiscordID(discordUser.ID)
	if err != nil && err.Error() != "sql: no rows in result set" {
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
			return nil, err
		}
	} else {
		// Update existing user
		user.Username = discordUser.Username
		user.Discriminator = discordUser.Discriminator
		user.Avatar = discordUser.Avatar
		user.Email = discordUser.Email
		user.UpdatedAt = now

		if err := s.userRepo.Update(user); err != nil {
			return nil, err
		}
	}

	return user, nil
}

// CreateJWTToken creates a JWT token for a user
func (s *AuthService) CreateJWTToken(user *models.User) string {
	claims := jwt.MapClaims{
		"sub": user.ID.String(),
		"iat": time.Now().Unix(),
		"exp": time.Now().Add(time.Hour * 24 * 7).Unix(), // 1 week
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, _ := token.SignedString([]byte(s.jwtSecret))

	return tokenString
}

// ValidateJWTToken validates a JWT token and returns the user ID
func (s *AuthService) ValidateJWTToken(tokenString string) (string, error) {
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		// Validate the alg is what we expect
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(s.jwtSecret), nil
	})

	if err != nil {
		return "", err
	}

	if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
		return claims["sub"].(string), nil
	}

	return "", fmt.Errorf("invalid token")
}
