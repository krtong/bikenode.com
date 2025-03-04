package handlers

import (
	"net/http"

	"bikenode.com/bikenode-website/services"
	"github.com/gin-gonic/gin"
)

type ServerHandler struct {
	serverService *services.ServerService
}

func NewServerHandler(serverService *services.ServerService) *ServerHandler {
	return &ServerHandler{
		serverService: serverService,
	}
}

func (h *ServerHandler) RegisterRoutes(r *gin.Engine) {
	authorized := r.Group("/servers")
	authorized.Use(AuthMiddleware())
	{
		authorized.GET("/:id/config", h.GetServerConfig)
		authorized.POST("/:id/config", h.UpdateServerConfig)
	}
}

// GetServerConfig renders the server configuration page if the user is an admin
func (h *ServerHandler) GetServerConfig(c *gin.Context) {
	userID := c.GetString("userID")
	serverID := c.Param("id")

	// Check if user is admin of the server
	isAdmin, err := h.serverService.IsServerAdmin(userID, serverID)
	if err != nil {
		c.HTML(http.StatusInternalServerError, "error.html", gin.H{
			"error": "Failed to verify permissions",
		})
		return
	}

	if !isAdmin {
		c.HTML(http.StatusForbidden, "error.html", gin.H{
			"error": "You don't have permission to manage this server",
		})
		return
	}

	// Get server config
	config, err := h.serverService.GetServerConfig(serverID)
	if err != nil {
		c.HTML(http.StatusInternalServerError, "error.html", gin.H{
			"error": "Failed to load server configuration",
		})
		return
	}

	// Get available channels for story feed
	channels, err := h.serverService.GetServerChannels(serverID)
	if err != nil {
		c.HTML(http.StatusInternalServerError, "error.html", gin.H{
			"error": "Failed to load server channels",
		})
		return
	}

	c.HTML(http.StatusOK, "server_config.html", gin.H{
		"server":   config,
		"channels": channels,
	})
}

// UpdateServerConfig updates the bot configuration for a server
func (h *ServerHandler) UpdateServerConfig(c *gin.Context) {
	userID := c.GetString("userID")
	serverID := c.Param("id")

	// Check if user is admin of the server
	isAdmin, err := h.serverService.IsServerAdmin(userID, serverID)
	if err != nil {
		c.HTML(http.StatusInternalServerError, "error.html", gin.H{
			"error": "Failed to verify permissions",
		})
		return
	}

	if !isAdmin {
		c.HTML(http.StatusForbidden, "error.html", gin.H{
			"error": "You don't have permission to manage this server",
		})
		return
	}

	// Parse form data
	var config struct {
		CreateBrandRoles    bool   `form:"create_brand_roles"`
		CreateCategoryRoles bool   `form:"create_category_roles"`
		CreateModelRoles    bool   `form:"create_model_roles"`
		StoryFeedChannelID  string `form:"story_feed_channel_id"`
	}

	if err := c.ShouldBind(&config); err != nil {
		c.HTML(http.StatusBadRequest, "error.html", gin.H{
			"error": "Invalid form data",
		})
		return
	}

	// Update server config
	if err := h.serverService.UpdateServerConfig(serverID, config.CreateBrandRoles,
		config.CreateCategoryRoles, config.CreateModelRoles, config.StoryFeedChannelID); err != nil {
		c.HTML(http.StatusInternalServerError, "error.html", gin.H{
			"error": "Failed to update server configuration",
		})
		return
	}

	c.Redirect(http.StatusFound, "/servers/"+serverID+"/config")
}
