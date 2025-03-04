package handlers

import (
	"net/http"
	"strconv"
	"time"

	"bikenode.com/bikenode-website/models"
	"bikenode.com/bikenode-website/services"
	"github.com/gin-gonic/gin"
)

type ProfileHandler struct {
	profileService *services.ProfileService
}

func NewProfileHandler(profileService *services.ProfileService) *ProfileHandler {
	return &ProfileHandler{
		profileService: profileService,
	}
}

func (h *ProfileHandler) RegisterRoutes(r *gin.Engine) {
	authorized := r.Group("/")
	authorized.Use(AuthMiddleware())
	{
		authorized.GET("/profile", h.GetProfile)
		authorized.POST("/profile/bikes/add", h.AddBike)
		authorized.POST("/profile/bikes/:id/remove", h.RemoveBike)
		authorized.POST("/profile/bikes/:id/timeline", h.AddTimelineEvent)
		authorized.DELETE("/profile/timeline/:id", h.RemoveTimelineEvent)
		authorized.PUT("/profile/servers/:id/visibility", h.ToggleServerVisibility)
	}
}

// GetProfile renders the user's profile page
func (h *ProfileHandler) GetProfile(c *gin.Context) {
	userID := getUserIDFromContext(c)

	profile, err := h.profileService.GetUserProfile(userID)
	if err != nil {
		c.HTML(http.StatusInternalServerError, "error.html", gin.H{
			"error": "Failed to load profile",
		})
		return
	}

	c.HTML(http.StatusOK, "profile.html", gin.H{
		"profile": profile,
		"title":   "My Profile",
	})
}

// AddBike adds a new motorcycle to the user's profile
func (h *ProfileHandler) AddBike(c *gin.Context) {
	userID := getUserIDFromContext(c)

	var input struct {
		MotorcycleID int       `form:"motorcycle_id" binding:"required"`
		PurchaseDate time.Time `form:"purchase_date" binding:"required" time_format:"2006-01-02"`
	}

	if err := c.ShouldBind(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ownership := models.Ownership{
		UserID:       userID,
		MotorcycleID: input.MotorcycleID,
		PurchaseDate: input.PurchaseDate,
		Active:       true,
	}

	if err := h.profileService.AddMotorcycle(ownership); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add motorcycle"})
		return
	}

	c.Redirect(http.StatusFound, "/profile")
}

// RemoveBike marks a motorcycle as no longer owned
func (h *ProfileHandler) RemoveBike(c *gin.Context) {
	userID := getUserIDFromContext(c)

	bikeID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid bike ID"})
		return
	}

	var input struct {
		EndDate   time.Time `form:"end_date" binding:"required" time_format:"2006-01-02"`
		EndReason string    `form:"end_reason" binding:"required"`
	}

	if err := c.ShouldBind(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.profileService.RemoveMotorcycle(userID, bikeID, input.EndDate, input.EndReason); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to remove motorcycle"})
		return
	}

	c.Redirect(http.StatusFound, "/profile")
}

// AddTimelineEvent adds a new event to a motorcycle's timeline
func (h *ProfileHandler) AddTimelineEvent(c *gin.Context) {
	userID := getUserIDFromContext(c)

	bikeID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid bike ID"})
		return
	}

	var input struct {
		Date        time.Time `form:"date" binding:"required" time_format:"2006-01-02"`
		Type        string    `form:"type" binding:"required"`
		Title       string    `form:"title" binding:"required"`
		Description string    `form:"description"`
		MediaURL    string    `form:"media_url"`
	}

	if err := c.ShouldBind(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	event := models.TimelineEvent{
		OwnershipID: bikeID,
		Date:        input.Date,
		Type:        input.Type,
		Title:       input.Title,
		Description: input.Description,
		MediaURL:    input.MediaURL,
	}

	if err := h.profileService.AddTimelineEvent(userID, event); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add event"})
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
