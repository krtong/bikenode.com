package services_test

import (
	"fmt"
	"os"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	"bikenode-website/models"
	"bikenode-website/services"
)

// MockUserRepository is a mock implementation of the user repository
type MockUserRepository struct {
	mock.Mock
}

func (m *MockUserRepository) GetByID(id uuid.UUID) (*models.User, error) {
	args := m.Called(id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.User), args.Error(1)
}

func (m *MockUserRepository) GetByDiscordID(discordID string) (*models.User, error) {
	args := m.Called(discordID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.User), args.Error(1)
}

func (m *MockUserRepository) Create(user *models.User) error {
	args := m.Called(user)
	return args.Error(0)
}

func (m *MockUserRepository) Update(user *models.User) error {
	args := m.Called(user)
	return args.Error(0)
}

// Additional mock methods...

func TestCreateJWTToken(t *testing.T) {
	// Setup
	mockRepo := new(MockUserRepository)
	service := services.NewAuthService(mockRepo, "test-client-id", "test-secret", "http://localhost/callback")

	// Set environment variable for testing
	os.Setenv("JWT_SECRET", "test-jwt-secret")
	defer os.Unsetenv("JWT_SECRET")

	user := &models.User{
		ID:        uuid.New(),
		DiscordID: "123456789",
		Username:  "testuser",
	}

	// Execute
	token := service.CreateJWTToken(user)

	// Verify
	assert.NotEmpty(t, token, "Token should not be empty")

	// Parse and verify the token
	parsedToken, err := jwt.Parse(token, func(token *jwt.Token) (interface{}, error) {
		return []byte("test-jwt-secret"), nil
	})

	assert.NoError(t, err, "Token should parse without errors")
	assert.True(t, parsedToken.Valid, "Token should be valid")

	claims, ok := parsedToken.Claims.(jwt.MapClaims)
	assert.True(t, ok, "Claims should be of type MapClaims")
	assert.Equal(t, user.ID.String(), claims["sub"], "Token should contain correct user ID")

	exp, ok := claims["exp"].(float64)
	assert.True(t, ok, "Expiry should be a number")

	expTime := time.Unix(int64(exp), 0)
	weekFromNow := time.Now().Add(time.Hour * 24 * 7)

	// Allow for slight timing differences
	assert.WithinDuration(t, weekFromNow, expTime, time.Minute, "Token should expire in approximately 1 week")
}

func TestValidateJWTToken(t *testing.T) {
	// Setup
	mockRepo := new(MockUserRepository)
	service := services.NewAuthService(mockRepo, "test-client-id", "test-secret", "http://localhost/callback")

	// Set environment variable for testing
	os.Setenv("JWT_SECRET", "test-jwt-secret")
	defer os.Unsetenv("JWT_SECRET")

	userID := uuid.New()

	// Create a test token manually
	claims := jwt.MapClaims{
		"sub": userID.String(),
		"iat": time.Now().Unix(),
		"exp": time.Now().Add(time.Hour).Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, _ := token.SignedString([]byte("test-jwt-secret"))

	// Execute
	resultUserID, err := service.ValidateJWTToken(tokenString)

	// Verify
	assert.NoError(t, err, "Validation should not return an error")
	assert.Equal(t, userID.String(), resultUserID, "Returned user ID should match original")

	// Test invalid token
	_, err = service.ValidateJWTToken("invalid-token")
	assert.Error(t, err, "Invalid token should return an error")

	// Test expired token
	expiredClaims := jwt.MapClaims{
		"sub": userID.String(),
		"iat": time.Now().Add(-2 * time.Hour).Unix(),
		"exp": time.Now().Add(-1 * time.Hour).Unix(),
	}

	expiredToken := jwt.NewWithClaims(jwt.SigningMethodHS256, expiredClaims)
	expiredTokenString, _ := expiredToken.SignedString([]byte("test-jwt-secret"))

	_, err = service.ValidateJWTToken(expiredTokenString)
	assert.Error(t, err, "Expired token should return an error")
}

func TestCreateOrUpdateUser(t *testing.T) {
	// Setup
	mockRepo := new(MockUserRepository)
	service := services.NewAuthService(mockRepo, "test-client-id", "test-secret", "http://localhost/callback")

	discordUser := &services.DiscordUser{
		ID:            "123456789",
		Username:      "discord_user",
		Discriminator: "1234",
		Avatar:        "avatar_hash",
		Email:         "user@example.com",
	}

	// Test creating a new user
	mockRepo.On("GetByDiscordID", "123456789").Return(nil, fmt.Errorf("sql: no rows in result set"))
	mockRepo.On("Create", mock.AnythingOfType("*models.User")).Return(nil)

	newUser, err := service.CreateOrUpdateUser(discordUser)

	assert.NoError(t, err, "Creating user should not return error")
	assert.NotNil(t, newUser, "A new user should be returned")
	assert.Equal(t, "123456789", newUser.DiscordID, "Discord ID should match")
	assert.Equal(t, "discord_user", newUser.Username, "Username should match")

	mockRepo.AssertExpectations(t)
	mockRepo.ExpectedCalls = nil

	// Test updating an existing user
	existingUser := &models.User{
		ID:            uuid.New(),
		DiscordID:     "123456789",
		Username:      "old_username",
		Discriminator: "4321",
		Avatar:        "old_avatar",
		Email:         "old@example.com",
		CreatedAt:     time.Now().Add(-24 * time.Hour),
		UpdatedAt:     time.Now().Add(-24 * time.Hour),
	}

	mockRepo.On("GetByDiscordID", "123456789").Return(existingUser, nil)
	mockRepo.On("Update", mock.AnythingOfType("*models.User")).Return(nil)

	updatedUser, err := service.CreateOrUpdateUser(discordUser)

	assert.NoError(t, err, "Updating user should not return error")
	assert.NotNil(t, updatedUser, "An updated user should be returned")
	assert.Equal(t, existingUser.ID, updatedUser.ID, "User ID should remain the same")
	assert.Equal(t, "discord_user", updatedUser.Username, "Username should be updated")
	assert.Equal(t, "user@example.com", updatedUser.Email, "Email should be updated")
	assert.True(t, updatedUser.UpdatedAt.After(existingUser.UpdatedAt), "UpdatedAt should be newer")

	mockRepo.AssertExpectations(t)
}

// Additional tests...
