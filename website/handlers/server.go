package handlers

import (
	"net/http"

	"github.com/gin-contrib/sessions"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"bikenode-website/models"
	"bikenode-website/services"
)

// ServerHandler handles server configuration routes
type ServerHandler struct {
	serverService *services.ServerService
}

// NewServerHandler creates a new server handler
func NewServerHandler(serverService *services.ServerService) *ServerHandler {
	return &ServerHandler{serverService: serverService}
}

func (h *ServerHandler) RegisterRoutes(r *gin.Engine) {
	authorized := r.Group("/servers")
	authorized.Use(AuthMiddleware())
	{
		authorized.GET("/:id/config", h.GetServerConfig)
		authorized.POST("/:id/config", h.UpdateServerConfig)
	}
}

// GetServerConfig displays server configuration
func (h *ServerHandler) GetServerConfig(c *gin.Context) {
	// Get user ID from session
	session := sessions.Default(c)
	userID := session.Get("user_id").(uuid.UUID)

	// Parse server ID
	serverID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.HTML(http.StatusBadRequest, "error.html", gin.H{
			"error": "Invalid server ID",
		})
		return
	}

	// Check if user is server admin
	if !h.serverService.IsUserServerAdmin(serverID, userID) {
		c.HTML(http.StatusForbidden, "error.html", gin.H{
			"error": "You are not authorized to manage this server.",
		})
		return
	}

	// Get server configuration
	config, err := h.serverService.GetServerConfig(serverID, userID)
	if err != nil {
		c.HTML(http.StatusInternalServerError, "error.html", gin.H{
			"error": "Failed to load server configuration: " + err.Error(),
		})
		return
	}

	// Get list of channels for selection
	channels, err := h.serverService.GetServerChannels(serverID)
	if err != nil {
		c.HTML(http.StatusInternalServerError, "error.html", gin.H{
			"error": "Failed to load channels: " + err.Error(),
		})
		return
	}

	c.HTML(http.StatusOK, "server_config.html", gin.H{
		"server":   config,
		"channels": channels,
	})
}

// UpdateServerConfig updates server configuration
func (h *ServerHandler) UpdateServerConfig(c *gin.Context) {
	// Get user ID from session
	session := sessions.Default(c)
	userID := session.Get("user_id").(uuid.UUID)

	// Parse server ID
	serverID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid server ID",
		})
		return
	}

	// Check if user is server admin
	if !h.serverService.IsUserServerAdmin(serverID, userID) {
		c.JSON(http.StatusForbidden, gin.H{
			"error": "You are not authorized to update this server configuration.",
		})
		return
	}

	// Parse form data
	config := &models.ServerConfig{
		ServerID:           serverID,
		CreateBrandRoles:   c.PostForm("create_brand_roles") == "true",
		CreateTypeRoles:    c.PostForm("create_type_roles") == "true",
		CreateModelRoles:   c.PostForm("create_model_roles") == "true",
		StoryFeedChannelID: c.PostForm("story_feed_channel_id"),
	}

	// Update configuration
	err = h.serverService.UpdateServerConfig(config, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to update server configuration: " + err.Error(),
		})
		return
	}

	c.Redirect(http.StatusFound, "/servers/"+serverID.String()+"/config")
}
