package handlers

import (
	"net/http"
	"strconv"
	"time"
	"path/filepath"	"strings"
	"strings"

	"github.com/gin-contrib/sessions"sessions"
	"github.com/gin-gonic/gin"	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"bikenode-website/models""bikenode-website/models"
	"bikenode-website/services"	"bikenode-website/services"
)

// ProfileHandler handles profile-related routesd routes
type ProfileHandler struct {ype ProfileHandler struct {
	profileService *services.ProfileService	profileService *services.ProfileService
}

// NewProfileHandler creates a new profile handler
func NewProfileHandler(profileService *services.ProfileService) *ProfileHandler {unc NewProfileHandler(profileService *services.ProfileService) *ProfileHandler {
	return &ProfileHandler{profileService: profileService}	return &ProfileHandler{profileService: profileService}
}

func (h *ProfileHandler) RegisterRoutes(r *gin.Engine) {Routes(r *gin.Engine) {
	authorized := r.Group("/")uthorized := r.Group("/")
	authorized.Use(AuthMiddleware())
	{
		authorized.GET("/profile", h.GetProfile)
		authorized.POST("/profile/bikes/add", h.AddBike)
		authorized.POST("/profile/bikes/:id/remove", h.RemoveBike)
		authorized.POST("/profile/timeline/add", h.AddTimelineEvent)
		authorized.DELETE("/profile/timeline/:id", h.RemoveTimelineEvent)authorized.DELETE("/profile/timeline/:id", h.RemoveTimelineEvent)
		authorized.PUT("/profile/servers/:id/visibility", h.ToggleServerVisibility)	authorized.PUT("/profile/servers/:id/visibility", h.ToggleServerVisibility)
	}	}
}

// GetProfile displays the user's profileser's profile
func (h *ProfileHandler) GetProfile(c *gin.Context) {file(c *gin.Context) {
	// Get user ID from session
	session := sessions.Default(c)	session := sessions.Default(c)
	userID := session.Get("user_id").(uuid.UUID)et("user_id").(uuid.UUID)

	// Get user profilefile
	profile, err := h.profileService.GetUserProfile(userID)
	if err != nil {
		c.HTML(http.StatusInternalServerError, "error.html", gin.H{HTML(http.StatusInternalServerError, "error.html", gin.H{
			"error": "Failed to load profile: " + err.Error(),r": "Failed to load profile: " + err.Error(),
		})})
		return		return
	}

	// Get user's motorcycles with ownership detailsotorcycles with ownership details
	ownerships, err := h.profileService.GetUserOwnerships(userID))
	if err != nil {
		c.HTML(http.StatusInternalServerError, "error.html", gin.H{HTML(http.StatusInternalServerError, "error.html", gin.H{
			"error": "Failed to load motorcycles: " + err.Error(),r": "Failed to load motorcycles: " + err.Error(),
		})})
		return		return
	}

	c.HTML(http.StatusOK, "profile.html", gin.H{file.html", gin.H{
		"profile":    profile,profile":    profile,
		"ownerships": ownerships,	"ownerships": ownerships,
	})	})
}

// AddBike adds a new motorcycle to the user's profileycle to the user's profile
func (h *ProfileHandler) AddBike(c *gin.Context) {e(c *gin.Context) {
	// Get user ID from session
	session := sessions.Default(c)	session := sessions.Default(c)
	userID := session.Get("user_id").(uuid.UUID)Get("user_id").(uuid.UUID)

	// Parse form dataata
	motorcycleID, err := uuid.Parse(c.PostForm("motorcycle_id"))
	if err != nil {!= nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid motorcycle ID"})c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid motorcycle ID"})
		return		return
	}

	purchaseDateStr := c.PostForm("purchase_date") := c.PostForm("purchase_date")
	purchaseDate, err := time.Parse("2006-01-02", purchaseDateStr)
	if err != nil {!= nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid purchase date format"})c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid purchase date format"})
		return		return
	}

	notes := c.PostForm("notes")rm("notes")

	// Add motorcyclele
	ownership, err := h.profileService.AddMotorcycle(userID, motorcycleID, purchaseDate, notes)
	if err != nil {!= nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add motorcycle: " + err.Error()})c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add motorcycle: " + err.Error()})
		return		return
	}

	c.Redirect(http.StatusFound, "/profile")	c.Redirect(http.StatusFound, "/profile")
}

// RemoveBike removes a motorcycle from the user's profilercycle from the user's profile
func (h *ProfileHandler) RemoveBike(c *gin.Context) {Bike(c *gin.Context) {
	// Get user ID from session
	session := sessions.Default(c)	session := sessions.Default(c)
	userID := session.Get("user_id").(uuid.UUID)("user_id").(uuid.UUID)

	// Parse ownership IDhip ID
	ownershipID, err := uuid.Parse(c.Param("id"))
	if err != nil {!= nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ownership ID"})c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ownership ID"})
		return		return
	}

	// Remove motorcyclecycle
	err = h.profileService.RemoveMotorcycle(ownershipID, userID)
	if err != nil {!= nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to remove motorcycle: " + err.Error()})c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to remove motorcycle: " + err.Error()})
		return		return
	}

	c.Redirect(http.StatusFound, "/profile")	c.Redirect(http.StatusFound, "/profile")
}

// AddTimelineEvent adds a new timeline eventew timeline event
func (h *ProfileHandler) AddTimelineEvent(c *gin.Context) {elineEvent(c *gin.Context) {
	// Get user ID from session
	session := sessions.Default(c)	session := sessions.Default(c)
	userID := session.Get("user_id").(uuid.UUID)Get("user_id").(uuid.UUID)

	// Parse form dataata
	ownershipID, err := uuid.Parse(c.PostForm("ownership_id"))
	if err != nil {!= nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ownership ID"})c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ownership ID"})
		return		return
	}

	eventDate, err := time.Parse("2006-01-02", c.PostForm("date"))
	if err != nil {!= nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid event date format"})c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid event date format"})
		return		return
	}

	// Process uploaded image if any
	var mediaURL string
	file, err := c.FormFile("media")ia")
	if err == nil && file != nil {
		// Generate unique filename
		if file.Size > 5*1024*1024 {ile.Filename
			c.JSON(http.StatusBadRequest, gin.H{"error": "File too large. Maximum size is 5MB."})f err := c.SaveUploadedFile(file, "static/uploads/"+filename); err == nil {
			return	mediaURL = "/static/uploads/" + filename
		}		}

		// Validate file type by extension
		ext := strings.ToLower(filepath.Ext(file.Filename))
		allowedExts := map[string]bool{
			".jpg":  true,D,
			".jpeg": true,
			".png":  true,
			".gif":  true,m("title"),
		}
MediaURL:    mediaURL,
		if !allowedExts[ext] {		IsPublic:    c.PostForm("is_public") == "true",
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid file type. Only JPG, PNG, and GIF images are allowed."})
			return
		}

		// Generate unique filenamerange c.PostFormArray("share_servers") {
		filename := uuid.New().String() + ext
		uploadPath := filepath.Join("static", "uploads", filename)f err == nil {
			serverIDs = append(serverIDs, id)
		if err := c.SaveUploadedFile(file, uploadPath); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save uploaded file: " + err.Error()})	}
			returnToServers = serverIDs
		}
		
		mediaURL = "/static/uploads/" + filename
	}!= nil {
c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add timeline event: " + err.Error()})
	// Create timeline event		return
	event := &models.TimelineEvent{
		OwnershipID: ownershipID,
		Type:        c.PostForm("type"),	c.Redirect(http.StatusFound, "/profile")
		Date:        eventDate,
		Title:       c.PostForm("title"),
		Description: c.PostForm("description"),event from a motorcycle's timeline
		MediaURL:    mediaURL,func (h *ProfileHandler) RemoveTimelineEvent(c *gin.Context) {
		IsPublic:    c.PostForm("is_public") == "true",
	}

	// Parse selected servers to share with!= nil {
	var serverIDs []uuid.UUIDc.JSON(http.StatusBadRequest, gin.H{"error": "Invalid event ID"})
	for _, idStr := range c.PostFormArray("share_servers") {		return
		id, err := uuid.Parse(idStr)
		if err == nil {
			serverIDs = append(serverIDs, id):= h.profileService.RemoveTimelineEvent(userID, eventID); err != nil {
		}c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to remove event"})
	}		return
	event.SharedToServers = serverIDs

	// Add event	c.JSON(http.StatusOK, gin.H{"success": true})
	err = h.profileService.AddTimelineEvent(event, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add timeline event: " + err.Error()})the visibility of the user's profile on a Discord server
		returnfunc (h *ProfileHandler) ToggleServerVisibility(c *gin.Context) {
	}ntext(c)

	c.Redirect(http.StatusFound, "/profile")	serverID := c.Param("id")
}

// RemoveTimelineEvent removes an event from a motorcycle's timeline:= h.profileService.SetServerVisibility(userID, serverID, visible); err != nil {
func (h *ProfileHandler) RemoveTimelineEvent(c *gin.Context) {c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update server visibility"})
	userID := getUserIDFromContext(c)		return

	eventID, err := strconv.Atoi(c.Param("id"))
	if err != nil {	c.JSON(http.StatusOK, gin.H{"success": true})
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid event ID"})
		return
	}r ID from context (set by middleware)
unc getUserIDFromContext(c *gin.Context) string {
	if err := h.profileService.RemoveTimelineEvent(userID, eventID); err != nil {	return c.GetString("userID")



























}	return c.GetString("userID")func getUserIDFromContext(c *gin.Context) string {// Helper function to get user ID from context (set by middleware)}	c.JSON(http.StatusOK, gin.H{"success": true})	}		return		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update server visibility"})	if err := h.profileService.SetServerVisibility(userID, serverID, visible); err != nil {	visible := c.PostForm("visible") == "true"	serverID := c.Param("id")	userID := getUserIDFromContext(c)func (h *ProfileHandler) ToggleServerVisibility(c *gin.Context) {// ToggleServerVisibility toggles the visibility of the user's profile on a Discord server}	c.JSON(http.StatusOK, gin.H{"success": true})	}		return		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to remove event"})}
