package handlers

import (
	"bikenode-website/models"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type APIHandler struct {
	profileService ProfileServiceInterface // assuming ProfileServiceInterface defines required methods
}

// ProfileServiceInterface is an interface for the profile service (for brevity)
type ProfileServiceInterface interface {
	SearchMotorcycles(year int, make, model, pkg, category string, page, limit int) (interface{}, int, error)
	GetUserServers(userID string) (interface{}, error)
	GetUserMotorcycles(userID string, includeInactive bool) (interface{}, error)
	AddOwnership(userID, motorcycleID string, purchaseDate time.Time, notes string) (interface{}, error)
	AddTimelineEvent(userID, ownershipID, eventType string, date time.Time, title, description, mediaURL string, isPublic bool, sharedToServers []string) (interface{}, error)
	UpdateTimelineEvent(userID, eventID, eventType string, date time.Time, title, description, mediaURL string, isPublic bool, sharedToServers []string) (interface{}, error)
	DeleteTimelineEvent(userID, eventID string) error
	ToggleServerShare(userID, timelineEventID, serverID string, share bool) error
}

func NewAPIHandler(profileService ProfileServiceInterface) *APIHandler {
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
		api.POST("/ownerships", h.AddOwnership)
		api.POST("/timeline", h.CreateTimelineEvent)
		api.PUT("/timeline/:id", h.UpdateTimelineEvent)
		api.DELETE("/timeline/:id", h.DeleteTimelineEvent)
		api.POST("/servers/:id/share", h.ToggleServerSharing)
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

// AddOwnership adds a new ownership for the authenticated user
func (h *APIHandler) AddOwnership(c *gin.Context) {
	userID := c.GetString("userID")

	var request struct {
		MotorcycleID string    `json:"motorcycle_id" binding:"required"`
		PurchaseDate time.Time `json:"purchase_date" binding:"required"`
		Notes        string    `json:"notes"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request: " + err.Error()})
		return
	}

	// Parse UUIDs
	userUUID, err := uuid.Parse(userID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	motorcycleUUID, err := uuid.Parse(request.MotorcycleID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid motorcycle ID"})
		return
	}

	// Create ownership through service
	ownership, err := h.profileService.AddMotorcycle(userUUID, motorcycleUUID, request.PurchaseDate, request.Notes)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add ownership: " + err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"ownership": ownership})
}

// CreateTimelineEvent creates a new timeline event
func (h *APIHandler) CreateTimelineEvent(c *gin.Context) {
	userID := c.GetString("userID")

	// Handle multipart form for file uploads
	err := c.Request.ParseMultipartForm(10 << 20) // 10 MB max
	if err != nil && err != http.ErrNotMultipart {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to parse form"})
		return
	}

	// Parse basic fields
	ownershipIDStr := c.PostForm("ownership_id")
	ownershipID, err := uuid.Parse(ownershipIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ownership ID"})
		return
	}

	eventDate, err := time.Parse("2006-01-02", c.PostForm("date"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date format. Use YYYY-MM-DD"})
		return
	}

	// Handle file upload if present
	var mediaURL string
	file, header, err := c.Request.FormFile("media")
	if err == nil && file != nil {
		defer file.Close()

		// Generate unique filename
		filename := uuid.New().String() + filepath.Ext(header.Filename)
		savePath := filepath.Join("static", "uploads", filename)

		// Create destination file
		dst, err := os.Create(savePath)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create file"})
			return
		}
		defer dst.Close()

		// Copy uploaded file to destination
		if _, err = io.Copy(dst, file); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save uploaded file"})
			return
		}

		mediaURL = "/static/uploads/" + filename
	}

	// Parse server IDs to share with
	var serverIDs []uuid.UUID
	for _, idStr := range c.PostFormArray("shared_servers") {
		id, err := uuid.Parse(idStr)
		if err == nil {
			serverIDs = append(serverIDs, id)
		}
	}

	// Create event object
	event := &models.TimelineEvent{
		ID:              uuid.New(),
		OwnershipID:     ownershipID,
		Type:            c.PostForm("type"),
		Date:            eventDate,
		Title:           c.PostForm("title"),
		Description:     c.PostForm("description"),
		MediaURL:        mediaURL,
		IsPublic:        c.PostForm("is_public") == "true",
		CreatedAt:       time.Now(),
		UpdatedAt:       time.Now(),
		SharedToServers: serverIDs,
	}

	// Parse user UUID
	userUUID, err := uuid.Parse(userID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	// Add event through service
	if err := h.profileService.AddTimelineEvent(event, userUUID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create event: " + err.Error()})
		return
	}

	// Check if we should send to Discord
	if len(serverIDs) > 0 {
		go h.profileService.ShareEventToDiscordServers(event, serverIDs)
	}

	c.JSON(http.StatusCreated, gin.H{"event": event})
}

// UpdateTimelineEvent updates an existing timeline event
func (h *APIHandler) UpdateTimelineEvent(c *gin.Context) {
	userID := c.GetString("userID")

	// Parse event ID from URL
	eventIDStr := c.Param("id")
	eventID, err := uuid.Parse(eventIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid event ID"})
		return
	}

	// Get existing event to verify ownership
	userUUID, err := uuid.Parse(userID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	// Verify user owns the event before updating
	existingEvent, err := h.profileService.GetTimelineEvent(eventID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Event not found"})
		return
	}

	// Verify ownership by checking if the ownership belongs to the user
	ownership, err := h.profileService.GetOwnership(existingEvent.OwnershipID)
	if err != nil || ownership.UserID != userUUID {
		c.JSON(http.StatusForbidden, gin.H{"error": "You don't have permission to update this event"})
		return
	}

	// Handle same parsing logic as create
	err = c.Request.ParseMultipartForm(10 << 20) // 10 MB max
	if err != nil && err != http.ErrNotMultipart {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to parse form"})
		return
	}

	// Parse date
	eventDate, err := time.Parse("2006-01-02", c.PostForm("date"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date format. Use YYYY-MM-DD"})
		return
	}

	// Handle file upload if present
	var mediaURL = existingEvent.MediaURL
	file, header, err := c.Request.FormFile("media")
	if err == nil && file != nil {
		defer file.Close()

		// Generate unique filename
		filename := uuid.New().String() + filepath.Ext(header.Filename)
		savePath := filepath.Join("static", "uploads", filename)

		// Create destination file
		dst, err := os.Create(savePath)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create file"})
			return
		}
		defer dst.Close()

		// Copy uploaded file to destination
		if _, err = io.Copy(dst, file); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save uploaded file"})
			return
		}

		mediaURL = "/static/uploads/" + filename
	}

	// Parse server IDs to share with
	var serverIDs []uuid.UUID
	for _, idStr := range c.PostFormArray("shared_servers") {
		id, err := uuid.Parse(idStr)
		if err == nil {
			serverIDs = append(serverIDs, id)
		}
	}

	// Update event fields
	existingEvent.Type = c.PostForm("type")
	existingEvent.Date = eventDate
	existingEvent.Title = c.PostForm("title")
	existingEvent.Description = c.PostForm("description")
	existingEvent.MediaURL = mediaURL
	existingEvent.IsPublic = c.PostForm("is_public") == "true"
	existingEvent.UpdatedAt = time.Now()
	existingEvent.SharedToServers = serverIDs

	// Update event in database
	if err := h.profileService.UpdateTimelineEvent(existingEvent); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update event: " + err.Error()})
		return
	}

	// Check if we should update Discord messages
	if len(serverIDs) > 0 {
		go h.profileService.UpdateEventInDiscordServers(existingEvent, serverIDs)
	}

	c.JSON(http.StatusOK, gin.H{"event": existingEvent})
}

// DeleteTimelineEvent removes a timeline event
func (h *APIHandler) DeleteTimelineEvent(c *gin.Context) {
	userID := c.GetString("userID")

	// Parse event ID from URL
	eventIDStr := c.Param("id")
	eventID, err := uuid.Parse(eventIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid event ID"})
		return
	}

	// Get existing event to verify ownership
	userUUID, err := uuid.Parse(userID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	// Verify user owns the event before deleting
	existingEvent, err := h.profileService.GetTimelineEvent(eventID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Event not found"})
		return
	}

	// Verify ownership by checking if the ownership belongs to the user
	ownership, err := h.profileService.GetOwnership(existingEvent.OwnershipID)
	if err != nil || ownership.UserID != userUUID {
		c.JSON(http.StatusForbidden, gin.H{"error": "You don't have permission to delete this event"})
		return
	}

	// Delete event
	if err := h.profileService.DeleteTimelineEvent(eventID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete event: " + err.Error()})
		return
	}

	// Delete media file if it exists
	if existingEvent.MediaURL != "" && strings.HasPrefix(existingEvent.MediaURL, "/static/uploads/") {
		filePath := "." + existingEvent.MediaURL
		os.Remove(filePath) // Ignore errors, it's just cleanup
	}

	c.JSON(http.StatusOK, gin.H{"message": "Event deleted successfully"})
}

// ToggleServerSharing toggles sharing a timeline event to a given server
func (h *APIHandler) ToggleServerSharing(c *gin.Context) {
	userID := c.GetString("userID")
	serverIDStr := c.Param("id")

	var request struct {
		EventID string `json:"event_id" binding:"required"`
		Share   bool   `json:"share" binding:"required"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request: " + err.Error()})
		return
	}

	// Parse UUIDs
	userUUID, err := uuid.Parse(userID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	eventID, err := uuid.Parse(request.EventID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid event ID"})
		return
	}

	serverID, err := uuid.Parse(serverIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid server ID"})
		return
	}

	// Verify user owns the event
	event, err := h.profileService.GetTimelineEvent(eventID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Event not found"})
		return
	}

	// Verify ownership
	ownership, err := h.profileService.GetOwnership(event.OwnershipID)
	if err != nil || ownership.UserID != userUUID {
		c.JSON(http.StatusForbidden, gin.H{"error": "You don't have permission to share this event"})
		return
	}

	// Toggle sharing
	if err := h.profileService.ToggleServerSharing(eventID, serverID, request.Share); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update sharing: " + err.Error()})
		return
	}

	// Send to Discord if we're sharing
	if request.Share {
		go h.profileService.ShareEventToDiscordServer(event, serverID)
	} else {
		go h.profileService.RemoveEventFromDiscordServer(event, serverID)
	}

	c.JSON(http.StatusOK, gin.H{
		"message":   "Server sharing updated successfully",
		"event_id":  eventID.String(),
		"server_id": serverID.String(),
		"shared":    request.Share,
	})
}
