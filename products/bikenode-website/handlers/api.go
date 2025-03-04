package handlers

import (
	"net/http"

	"bikenode.com/bikenode-website/services"
	"github.com/gin-gonic/gin"
)

type APIHandler struct {
	profileService *services.ProfileService
}

func NewAPIHandler(profileService *services.ProfileService) *APIHandler {
	return &APIHandler{
		profileService: profileService,
	}
}

func (h *APIHandler) RegisterRoutes(r *gin.Engine) {
	api := r.Group("/api")
	api.Use(AuthMiddleware())
	{
		api.GET("/motorcycles", h.SearchMotorcycles)
		api.GET("/user/servers", h.GetUserServers)
		api.GET("/user/motorcycles", h.GetUserMotorcycles)
	}
}

// SearchMotorcycles searches for motorcycles based on query parameters
func (h *APIHandler) SearchMotorcycles(c *gin.Context) {
	var params struct {
		Year     int    `form:"year"`
		Make     string `form:"make"`
		Model    string `form:"model"`
		Package  string `form:"package"`
		Category string `form:"category"`
		Page     int    `form:"page,default=1"`
		Limit    int    `form:"limit,default=20"`
	}

	if err := c.ShouldBindQuery(&params); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Default limit if not provided or too large
	if params.Limit <= 0 || params.Limit > 100 {
		params.Limit = 20
	}

	// Default page if not provided or negative
	if params.Page <= 0 {
		params.Page = 1
	}

	results, total, err := h.profileService.SearchMotorcycles(
		params.Year,
		params.Make,
		params.Model,
		params.Package,
		params.Category,
		params.Page,
		params.Limit,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to search motorcycles"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"motorcycles": results,
		"total":       total,
		"page":        params.Page,
		"limit":       params.Limit,
	})
}

// GetUserServers gets the Discord servers where the user is a member and the bot is present
func (h *APIHandler) GetUserServers(c *gin.Context) {
	userID := c.GetString("userID")

	servers, err := h.profileService.GetUserServers(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get servers"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"servers": servers,
	})
}

// GetUserMotorcycles gets the motorcycles owned by the user
func (h *APIHandler) GetUserMotorcycles(c *gin.Context) {
	userID := c.GetString("userID")
	includeInactive := c.Query("include_inactive") == "true"

	motorcycles, err := h.profileService.GetUserMotorcycles(userID, includeInactive)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get motorcycles"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"motorcycles": motorcycles,
	})
}
