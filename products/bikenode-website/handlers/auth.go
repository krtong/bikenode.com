package handlers

import (
	"net/http"

	"github.com/gin-contrib/sessions"
	"github.com/gin-gonic/gin"

	"bikenode-website/services"
)

// AuthHandler handles authentication routes
type AuthHandler struct {
	authService *services.AuthService
}

// NewAuthHandler creates a new auth handler
func NewAuthHandler(authService *services.AuthService) *AuthHandler {
	return &AuthHandler{authService: authService}
}

// Login initiates the Discord OAuth2 flow
// This redirects the user to Discord's authorization page where they will
// grant permissions to our application
func (h *AuthHandler) Login(c *gin.Context) {
	// Generate and redirect to Discord OAuth URL
	redirectURL := h.authService.GetDiscordAuthURL()
	c.Redirect(http.StatusTemporaryRedirect, redirectURL)
}

// Callback handles the Discord OAuth2 callback
// This is where Discord redirects back to our application after user authorization
// The flow:
// 1. Get authorization code from query parameters
// 2. Exchange code for access token and user info
// 3. Create/update user in our database
// 4. Create a session to maintain user login state
// 5. Redirect to profile page
func (h *AuthHandler) Callback(c *gin.Context) {
	code := c.Query("code")
	if code == "" {
		c.HTML(http.StatusBadRequest, "error.html", gin.H{
			"error": "Missing authorization code",
		})
		return
	}

	// Get the token and Discord user
	token, discordUser, err := h.authService.ExchangeCodeForToken(code)
	if err != nil {
		c.HTML(http.StatusInternalServerError, "error.html", gin.H{
			"error": "Failed to authenticate with Discord: " + err.Error(),
		})
		return
	}

	// Create or update the user in our database
	user, err := h.authService.CreateOrUpdateUser(discordUser)
	if err != nil {
		c.HTML(http.StatusInternalServerError, "error.html", gin.H{
			"error": "Failed to create or update user: " + err.Error(),
		})
		return
	}

	// Create JWT token
	jwtToken := h.authService.CreateJWTToken(user)

	// Set session
	session := sessions.Default(c)
	session.Set("user_id", user.ID)
	session.Set("jwt_token", jwtToken)
	session.Save()

	// Redirect to profile page
	c.Redirect(http.StatusFound, "/profile")
}

// Logout clears the auth cookie
// This removes the user's session data and redirects to the home page
func (h *AuthHandler) Logout(c *gin.Context) {
	session := sessions.Default(c)
	session.Clear()
	session.Save()
	c.Redirect(http.StatusFound, "/")
}
