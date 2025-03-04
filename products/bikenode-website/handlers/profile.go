package handlers

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-contrib/sessions"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"bikenode-website/models"
	"bikenode-website/services"
)

// ProfileHandler handles profile-related routes
type ProfileHandler struct {
	profileService *services.ProfileService
}

// NewProfileHandler creates a new profile handler
func NewProfileHandler(profileService *services.ProfileService) *ProfileHandler {
	return &ProfileHandler{profileService: profileService}
}

func (h *ProfileHandler) RegisterRoutes(r *gin.Engine) {
	authorized := r.Group("/")
	authorized.Use(AuthMiddleware())
	{
		authorized.GET("/profile", h.GetProfile)
		authorized.POST("/profile/bikes/add", h.AddBike)
		authorized.POST("/profile/bikes/:id/remove", h.RemoveBike)
		authorized.POST("/profile/timeline/add", h.AddTimelineEvent)
		authorized.DELETE("/profile/timeline/:id", h.RemoveTimelineEvent)
		authorized.PUT("/profile/servers/:id/visibility", h.ToggleServerVisibility)
	}
}

// GetProfile displays the user's profile
func (h *ProfileHandler) GetProfile(c *gin.Context) {
	// Get user ID from session
	session := sessions.Default(c)
	userID := session.Get("user_id").(uuid.UUID)

	// Get user profile
	profile, err := h.profileService.GetUserProfile(userID)
	if err != nil {
		c.HTML(http.StatusInternalServerError, "error.html", gin.H{
			"error": "Failed to load profile: " + err.Error(),
		})
		return
	}

	// Get user's motorcycles with ownership details
	ownerships, err := h.profileService.GetUserOwnerships(userID)
	if err != nil {
		c.HTML(http.StatusInternalServerError, "error.html", gin.H{
			"error": "Failed to load motorcycles: " + err.Error(),
		})
		return
	}

	c.HTML(http.StatusOK, "profile.html", gin.H{
		"profile":    profile,
		"ownerships": ownerships,
	})
}

// AddBike adds a new motorcycle to the user's profile
func (h *ProfileHandler) AddBike(c *gin.Context) {
	// Get user ID from session
	session := sessions.Default(c)
	userID := session.Get("user_id").(uuid.UUID)

	// Parse form data
	motorcycleID, err := uuid.Parse(c.PostForm("motorcycle_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid motorcycle ID"})
		return
	}

	purchaseDateStr := c.PostForm("purchase_date")
	purchaseDate, err := time.Parse("2006-01-02", purchaseDateStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid purchase date format"})
		return
	}

	notes := c.PostForm("notes")

	// Add motorcycle
	ownership, err := h.profileService.AddMotorcycle(userID, motorcycleID, purchaseDate, notes)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add motorcycle: " + err.Error()})
		return
	}

	c.Redirect(http.StatusFound, "/profile")
}

// RemoveBike removes a motorcycle from the user's profile
func (h *ProfileHandler) RemoveBike(c *gin.Context) {
	// Get user ID from session
	session := sessions.Default(c)
	userID := session.Get("user_id").(uuid.UUID)

	// Parse ownership ID
	ownershipID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ownership ID"})
		return
	}

	// Remove motorcycle
	err = h.profileService.RemoveMotorcycle(ownershipID, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to remove motorcycle: " + err.Error()})
		return
	}

	c.Redirect(http.StatusFound, "/profile")
}

// AddTimelineEvent adds a new timeline event
func (h *ProfileHandler) AddTimelineEvent(c *gin.Context) {
	// Get user ID from session
	session := sessions.Default(c)
	userID := session.Get("user_id").(uuid.UUID)

	// Parse form data
	ownershipID, err := uuid.Parse(c.PostForm("ownership_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ownership ID"})
		return
	}

	eventDate, err := time.Parse("2006-01-02", c.PostForm("date"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid event date format"})
		return
	}

	// Process uploaded image if any
	var mediaURL string
	file, err := c.FormFile("media")
	if err == nil && file != nil {
		// Generate unique filename
		filename := uuid.New().String() + "_" + file.Filename
		if err := c.SaveUploadedFile(file, "static/uploads/"+filename); err == nil {
			mediaURL = "/static/uploads/" + filename
		}
	}

	// Create timeline event
	event := &models.TimelineEvent{
		OwnershipID: ownershipID,
		Type:        c.PostForm("type"),
		Date:        eventDate,
		Title:       c.PostForm("title"),
		Description: c.PostForm("description"),
		MediaURL:    mediaURL,
		IsPublic:    c.PostForm("is_public") == "true",
	}

	// Parse selected servers to share with
	var serverIDs []uuid.UUID
	for _, idStr := range c.PostFormArray("share_servers") {
		id, err := uuid.Parse(idStr)
		if err == nil {
			serverIDs = append(serverIDs, id)
		}
	}
	event.SharedToServers = serverIDs

	// Add event
	err = h.profileService.AddTimelineEvent(event, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add timeline event: " + err.Error()})
		return
	}

	c.Redirect(http.StatusFound, "/profile")
}

// RemoveTimelineEvent removes an event from a motorcycle's timeline
func (h *ProfileHandler) RemoveTimelineEvent(c *gin.Context) {
	userID := getUserIDFromContext(c)

	eventID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid event ID"})
		return
	}

	if err := h.profileService.RemoveTimelineEvent(userID, eventID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to remove event"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

// ToggleServerVisibility toggles the visibility of the user's profile on a Discord server
func (h *ProfileHandler) ToggleServerVisibility(c *gin.Context) {
	userID := getUserIDFromContext(c)

	serverID := c.Param("id")
	visible := c.PostForm("visible") == "true"

	if err := h.profileService.SetServerVisibility(userID, serverID, visible); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update server visibility"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

// Helper function to get user ID from context (set by middleware)
func getUserIDFromContext(c *gin.Context) string {
	return c.GetString("userID")
}
