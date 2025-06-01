package services

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"os"
	"time"

	"github.com/google/uuid"
	"bikenode-website/models"
	"bikenode-website/repositories"
	"bikenode-website/logger"
)

// ServerService provides methods for managing Discord servers
type ServerService struct {
	serverRepo *repositories.ServerRepository
	userRepo   *repositories.UserRepository
	client     *http.Client
	botAPIURL  string
	botToken   string
}

// NewServerService creates a new ServerService instance
func NewServerService(serverRepo *repositories.ServerRepository, userRepo *repositories.UserRepository, botAPIURL, botToken string) *ServerService {
	return &ServerService{
		serverRepo: serverRepo,
		userRepo:   userRepo,
		client:     &http.Client{Timeout: 10 * time.Second},
		botAPIURL:  botAPIURL,
		botToken:   botToken,
	}
}

// GetServerConfig retrieves a server's configuration
func (s *ServerService) GetServerConfig(serverID, userID uuid.UUID) (*models.Server, error) {
	// Check if user has permission to view server config
	isAdmin, err := s.IsUserServerAdmin(serverID, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to check permissions: %w", err)
	}

	if !isAdmin {
		return nil, fmt.Errorf("unauthorized: user is not a server admin")
	}

	// Get server with config
	server, err := s.serverRepo.GetByID(serverID)
	if err != nil {
		return nil, fmt.Errorf("server not found: %w", err)
	}

	// If no config exists yet, create a default one
	if server.Config == nil {
		config := &models.ServerConfig{
			ID:                 uuid.New(),
			ServerID:           serverID,
			CreateBrandRoles:   false,
			CreateTypeRoles:    false,
			CreateModelRoles:   false,
			StoryFeedChannelID: "",
			CreatedAt:          time.Now(),
			UpdatedAt:          time.Now(),
		}

		if err := s.serverRepo.SaveServerConfig(config); err != nil {
			return nil, fmt.Errorf("failed to create default config: %w", err)
		}

		server.Config = config
	}

	return server, nil
}

// UpdateServerConfig updates a server's configuration
func (s *ServerService) UpdateServerConfig(config *models.ServerConfig, userID uuid.UUID) error {
	// Check if user has permission
	isAdmin, err := s.IsUserServerAdmin(config.ServerID, userID)
	if err != nil {
		return fmt.Errorf("failed to check permissions: %w", err)
	}

	if !isAdmin {
		return fmt.Errorf("unauthorized: user is not a server admin")
	}

	// Get existing config to preserve fields not updated
	existingConfig, err := s.serverRepo.GetServerConfig(config.ServerID)
	if err != nil {
		// If no config exists, use defaults for missing fields
		config.ID = uuid.New()
		config.CreatedAt = time.Now()
	} else {
		config.ID = existingConfig.ID
		config.CreatedAt = existingConfig.CreatedAt
	}

	config.UpdatedAt = time.Now()

	// Save the config
	if err := s.serverRepo.SaveServerConfig(config); err != nil {
		return fmt.Errorf("failed to update config: %w", err)
	}

	// Notify the bot of configuration changes
	if err := s.notifyBotConfigChanged(config); err != nil {
		return fmt.Errorf("failed to notify bot: %w", err)
	}

	return nil
}

// GetServerChannels retrieves a list of text channels for a server
func (s *ServerService) GetServerChannels(serverID uuid.UUID) ([]models.Channel, error) {
	// Get server to retrieve Discord ID
	server, err := s.serverRepo.GetByID(serverID)
	if err != nil {
		return nil, fmt.Errorf("server not found: %w", err)
	}

	// Get bot token from environment variable instead of hardcoding
	botToken := os.Getenv("DISCORD_BOT_TOKEN")
	if botToken == "" {
		return nil, errors.New("DISCORD_BOT_TOKEN environment variable not set")
	}

	// Call bot API to get channels
	url := fmt.Sprintf("%s/servers/%s/channels", s.botAPIURL, server.DiscordID)
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Authorization", "Bearer "+botToken)
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("failed to get channels: status %d", resp.StatusCode)
	}

	var result struct {
		Channels []models.Channel `json:"channels"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	// Filter to text channels only (type 0)
	textChannels := make([]models.Channel, 0)
	for _, channel := range result.Channels {
		if channel.Type == 0 {
			textChannels = append(textChannels, channel)
		}
	}

	return textChannels, nil
}

// IsUserServerAdmin checks if a user is an admin of a server
func (s *ServerService) IsUserServerAdmin(serverID, userID uuid.UUID) (bool, error) {
	return s.serverRepo.IsUserServerAdmin(serverID, userID)
}

// notifyBotConfigChanged notifies the bot of configuration changes
func (s *ServerService) notifyBotConfigChanged(config *models.ServerConfig) error {
	// Get server to retrieve Discord ID
	server, err := s.serverRepo.GetByID(config.ServerID)
	if err != nil {
		return fmt.Errorf("server not found: %w", err)
	}

	// Convert the config to JSON
	configJSON, err := json.Marshal(map[string]interface{}{
		"server_id":             server.DiscordID,
		"create_brand_roles":    config.CreateBrandRoles,
		"create_type_roles":     config.CreateTypeRoles,
		"create_model_roles":    config.CreateModelRoles,
		"story_feed_channel_id": config.StoryFeedChannelID,
	})
	if err != nil {
		return err
	}

	// Call bot API to update config
	url := fmt.Sprintf("%s/servers/%s/config", s.botAPIURL, server.DiscordID)
	req, err := http.NewRequest("POST", url, bytes.NewBuffer(configJSON))
	if err != nil {
		return err
	}

	req.Header.Set("Authorization", "Bot "+s.botToken)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("failed to update bot config: status %d", resp.StatusCode)
	}

	return nil
}

// SaveServerConfig saves a server configuration and notifies the Discord bot
func (s *ServerService) SaveServerConfig(serverID uuid.UUID, config models.ServerConfig) error {
	server, err := s.serverRepo.GetByID(serverID)
	if err != nil {
		return fmt.Errorf("error retrieving server: %w", err)
	}

	// Update the configuration
	server.Config = config

	if err := s.serverRepo.Update(server); err != nil {
		return fmt.Errorf("error updating server config: %w", err)
	}

	// Notify the Discord bot about the configuration change
	if err := s.notifyBotConfigChanged(server); err != nil {
		logger.Error("Failed to notify bot of config change", err, logger.Fields{
			"server_id": server.ID,
		})
		// Continue even if notification fails
	}

	return nil
}

// GetUserServers retrieves all servers for a specific user
func (s *ServerService) GetUserServers(userID uuid.UUID) ([]models.Server, error) {
	return s.serverRepo.GetByUserID(userID)
}
