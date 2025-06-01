package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	"bikenode.com/database"
	"bikenode.com/logger"
	"bikenode.com/models"
	"bikenode.com/repositories"
	"bikenode.com/services"
	"github.com/gorilla/mux"
	"github.com/joho/godotenv"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	// Connect to database
	db, err := database.GetConnection()
	if err != nil {
		logger.Fatal("Failed to connect to database", err, nil)
	}
	defer db.Close()

	// Initialize repositories
	userRepo := repositories.NewUserRepository(db)
	bicycleRepo := repositories.NewBicycleRepository(db)

	// Initialize services
	authService := services.NewAuthService(
		userRepo,
		os.Getenv("DISCORD_CLIENT_ID"),
		os.Getenv("DISCORD_CLIENT_SECRET"),
		os.Getenv("DISCORD_REDIRECT_URI"),
	)

	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = "insecure-jwt-secret-replace-in-production"
		logger.Warn("JWT_SECRET not set, using insecure default", nil)
	}
	sessionService := services.NewSessionService(db, userRepo, jwtSecret)

	// Setup routes
	router := setupSimpleAuthRoutes(authService, sessionService, bicycleRepo, userRepo)

	// Get port from environment
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	// Create server
	srv := &http.Server{
		Addr:         ":" + port,
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Start server in a goroutine
	go func() {
		logger.Info("Starting BikeNode Auth Server", logger.Fields{
			"port":    port,
			"address": fmt.Sprintf("http://localhost:%s", port),
		})

		fmt.Printf("\n🔶 BikeNode.com - Authentication Server\n")
		fmt.Printf("🌐 Website: http://localhost:%s\n", port)
		fmt.Printf("🔐 Login: http://localhost:%s/login\n", port)
		fmt.Printf("📝 Register: http://localhost:%s/register\n", port)
		fmt.Printf("👤 Dashboard: http://localhost:%s/dashboard\n", port)
		fmt.Printf("🏥 Health: http://localhost:%s/api/health\n\n", port)

		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Fatal("Failed to start server", err, nil)
		}
	}()

	// Wait for interrupt signal to gracefully shutdown the server
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	logger.Info("Shutting down server...", nil)

	// Give outstanding requests a 30 second deadline to complete
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		logger.Fatal("Server forced to shutdown", err, nil)
	}

	logger.Info("Server exited", nil)
}

func setupSimpleAuthRoutes(
	authService *services.AuthService,
	sessionService *services.SessionService,
	bicycleRepo *repositories.BicycleRepository,
	userRepo *repositories.UserRepository,
) *mux.Router {
	router := mux.NewRouter()

	// Enable CORS middleware
	router.Use(corsMiddleware)

	// API routes
	api := router.PathPrefix("/api").Subrouter()

	// Health check
	api.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{
			"status": "healthy",
			"version": "1.0.0",
			"service": "bikenode-auth-api",
			"features": ["discord-auth", "email-auth", "sessions"]
		}`))
	}).Methods("GET")

	// Authentication routes
	auth := api.PathPrefix("/auth").Subrouter()

	// Discord OAuth
	auth.HandleFunc("/discord", func(w http.ResponseWriter, r *http.Request) {
		authURL := authService.GetDiscordAuthURL()
		http.Redirect(w, r, authURL, http.StatusTemporaryRedirect)
	}).Methods("GET")

	auth.HandleFunc("/discord/callback", func(w http.ResponseWriter, r *http.Request) {
		handleDiscordCallback(w, r, authService, sessionService)
	}).Methods("GET")

	// Email auth
	auth.HandleFunc("/register", func(w http.ResponseWriter, r *http.Request) {
		handleEmailRegister(w, r, authService, sessionService)
	}).Methods("POST")

	auth.HandleFunc("/login", func(w http.ResponseWriter, r *http.Request) {
		handleEmailLogin(w, r, authService, sessionService)
	}).Methods("POST")

	auth.HandleFunc("/logout", func(w http.ResponseWriter, r *http.Request) {
		handleLogout(w, r, sessionService)
	}).Methods("POST")

	// User info
	auth.HandleFunc("/me", func(w http.ResponseWriter, r *http.Request) {
		handleGetCurrentUser(w, r, sessionService)
	}).Methods("GET")

	// Update profile
	auth.HandleFunc("/update-profile", func(w http.ResponseWriter, r *http.Request) {
		handleUpdateProfile(w, r, sessionService, userRepo)
	}).Methods("POST")

	// Admin endpoint to delete user (temporary for development)
	auth.HandleFunc("/delete-user/{discord_id}", func(w http.ResponseWriter, r *http.Request) {
		vars := mux.Vars(r)
		discordID := vars["discord_id"]
		err := userRepo.DeleteUserByDiscordID(discordID)
		if err != nil {
			http.Error(w, "Failed to delete user", http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("User deleted successfully"))
	}).Methods("DELETE")

	// Bicycle search (existing)
	bicycles := api.PathPrefix("/bicycles").Subrouter()
	bicycles.HandleFunc("/search", func(w http.ResponseWriter, r *http.Request) {
		result, err := bicycleRepo.SearchBicyclesSimple(models.BicycleSearchParams{
			Query:  r.URL.Query().Get("q"),
			Limit:  20,
			Offset: 0,
		})
		if err != nil {
			http.Error(w, "Search failed", http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(result)
	}).Methods("GET")

	bicycles.HandleFunc("/manufacturers", func(w http.ResponseWriter, r *http.Request) {
		manufacturers, err := bicycleRepo.GetManufacturers()
		if err != nil {
			http.Error(w, "Failed to get manufacturers", http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"manufacturers": manufacturers,
		})
	}).Methods("GET")

	bicycles.HandleFunc("/models", func(w http.ResponseWriter, r *http.Request) {
		make := r.URL.Query().Get("make")
		if make == "" {
			http.Error(w, "Make parameter required", http.StatusBadRequest)
			return
		}
		models, err := bicycleRepo.GetModelsByManufacturer(make)
		if err != nil {
			http.Error(w, "Failed to get models", http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"models": models,
		})
	}).Methods("GET")

	bicycles.HandleFunc("/years", func(w http.ResponseWriter, r *http.Request) {
		make := r.URL.Query().Get("make")
		model := r.URL.Query().Get("model")
		if make == "" || model == "" {
			http.Error(w, "Make and model parameters required", http.StatusBadRequest)
			return
		}
		years, err := bicycleRepo.GetYearsByMakeModel(make, model)
		if err != nil {
			http.Error(w, "Failed to get years", http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"years": years,
		})
	}).Methods("GET")

	bicycles.HandleFunc("/variants", func(w http.ResponseWriter, r *http.Request) {
		make := r.URL.Query().Get("make")
		model := r.URL.Query().Get("model")
		yearStr := r.URL.Query().Get("year")
		if make == "" || model == "" || yearStr == "" {
			http.Error(w, "Make, model, and year parameters required", http.StatusBadRequest)
			return
		}
		year, err := strconv.Atoi(yearStr)
		if err != nil {
			http.Error(w, "Invalid year parameter", http.StatusBadRequest)
			return
		}
		variants, err := bicycleRepo.GetVariantsByMakeModelYear(make, model, year)
		if err != nil {
			http.Error(w, "Failed to get variants", http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"variants": variants,
		})
	}).Methods("GET")

	bicycles.HandleFunc("/{id}", func(w http.ResponseWriter, r *http.Request) {
		vars := mux.Vars(r)
		id := vars["id"]

		logger.Info("Fetching bike by ID", logger.Fields{"id": id})
		bike, err := bicycleRepo.GetByID(id)
		if err != nil {
			logger.Error("Failed to get bike by ID", err, logger.Fields{"id": id})
			http.Error(w, "Bike not found", http.StatusNotFound)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(bike)
	}).Methods("GET")

	// Serve static files
	fileServer := http.FileServer(http.Dir("./static/"))
	router.PathPrefix("/static/").Handler(http.StripPrefix("/static/", fileServer))

	// Serve assets from static directory (for the copied assets)
	assetsServer := http.FileServer(http.Dir("./static/assets/"))
	router.PathPrefix("/assets/").Handler(http.StripPrefix("/assets/", assetsServer))

	// Web routes
	router.HandleFunc("/", serveHomepage).Methods("GET")
	router.HandleFunc("/login", serveLoginPage).Methods("GET")
	router.HandleFunc("/register", serveRegisterPage).Methods("GET")
	router.HandleFunc("/onboarding", serveOnboardingPage).Methods("GET")
	router.HandleFunc("/dashboard", serveDashboardPage).Methods("GET")
	router.HandleFunc("/search", serveSearchPage).Methods("GET")
	router.HandleFunc("/profile", serveProfilePage).Methods("GET")
	router.HandleFunc("/settings", serveSettingsPage).Methods("GET")
	router.HandleFunc("/collection", serveCollectionPage).Methods("GET")

	return router
}

// Discord callback handler
func handleDiscordCallback(w http.ResponseWriter, r *http.Request, authService *services.AuthService, sessionService *services.SessionService) {
	code := r.URL.Query().Get("code")
	if code == "" {
		http.Error(w, "Missing authorization code", http.StatusBadRequest)
		return
	}

	// Exchange code for token and user info
	_, discordUser, err := authService.ExchangeCodeForToken(code)
	if err != nil {
		logger.Error("Discord token exchange failed", err, nil)
		http.Error(w, "Authentication failed", http.StatusInternalServerError)
		return
	}

	// Create or update user
	user, isNewUser, err := authService.CreateOrUpdateDiscordUserWithFlag(
		discordUser.ID, discordUser.Username, discordUser.Discriminator,
		discordUser.Avatar, discordUser.Email,
	)
	if err != nil {
		logger.Error("Failed to create Discord user", err, nil)
		http.Error(w, "User creation failed", http.StatusInternalServerError)
		return
	}

	// Create session
	_, jwtToken, err := sessionService.CreateSession(user.ID, getClientIP(r), r.UserAgent())
	if err != nil {
		logger.Error("Session creation failed", err, nil)
		http.Error(w, "Session creation failed", http.StatusInternalServerError)
		return
	}

	// Set cookie
	http.SetCookie(w, &http.Cookie{
		Name:     "bikenode_session",
		Value:    jwtToken,
		Path:     "/",
		MaxAge:   int(7 * 24 * time.Hour / time.Second),
		HttpOnly: true,
		Secure:   os.Getenv("ENVIRONMENT") == "production",
		SameSite: http.SameSiteLaxMode,
	})

	logger.Info("Discord login successful", logger.Fields{
		"user_id":     user.ID,
		"username":    user.Username,
		"is_new_user": isNewUser,
	})

	// Redirect new users to onboarding, existing users to dashboard
	if isNewUser {
		http.Redirect(w, r, "/onboarding", http.StatusTemporaryRedirect)
	} else {
		http.Redirect(w, r, "/dashboard", http.StatusTemporaryRedirect)
	}
}

// Email registration handler
func handleEmailRegister(w http.ResponseWriter, r *http.Request, authService *services.AuthService, sessionService *services.SessionService) {
	var req models.RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	if req.Password != req.ConfirmPassword {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Passwords do not match"})
		return
	}

	user, err := authService.CreateEmailUser(req.Email, req.Username, req.Password)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}

	_, jwtToken, err := sessionService.CreateSession(user.ID, getClientIP(r), r.UserAgent())
	if err != nil {
		http.Error(w, "Session creation failed", http.StatusInternalServerError)
		return
	}

	http.SetCookie(w, &http.Cookie{
		Name:     "bikenode_session",
		Value:    jwtToken,
		Path:     "/",
		MaxAge:   int(7 * 24 * time.Hour / time.Second),
		HttpOnly: true,
		Secure:   os.Getenv("ENVIRONMENT") == "production",
		SameSite: http.SameSiteLaxMode,
	})

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"user": map[string]interface{}{
			"id":       user.ID,
			"username": user.Username,
			"email":    user.Email,
		},
	})
}

// Email login handler
func handleEmailLogin(w http.ResponseWriter, r *http.Request, authService *services.AuthService, sessionService *services.SessionService) {
	var req models.AuthRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	user, err := authService.AuthenticateEmailUser(req.Email, req.Password)
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid credentials"})
		return
	}

	_, jwtToken, err := sessionService.CreateSession(user.ID, getClientIP(r), r.UserAgent())
	if err != nil {
		http.Error(w, "Session creation failed", http.StatusInternalServerError)
		return
	}

	http.SetCookie(w, &http.Cookie{
		Name:     "bikenode_session",
		Value:    jwtToken,
		Path:     "/",
		MaxAge:   int(7 * 24 * time.Hour / time.Second),
		HttpOnly: true,
		Secure:   os.Getenv("ENVIRONMENT") == "production",
		SameSite: http.SameSiteLaxMode,
	})

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"user": map[string]interface{}{
			"id":       user.ID,
			"username": user.Username,
			"email":    user.Email,
		},
	})
}

// Logout handler
func handleLogout(w http.ResponseWriter, r *http.Request, sessionService *services.SessionService) {
	cookie, err := r.Cookie("bikenode_session")
	if err == nil {
		if session, _, err := sessionService.ValidateSession(cookie.Value); err == nil && session != nil {
			sessionService.RevokeSession(session.ID)
		}
	}

	http.SetCookie(w, &http.Cookie{
		Name:     "bikenode_session",
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
		Secure:   os.Getenv("ENVIRONMENT") == "production",
		SameSite: http.SameSiteLaxMode,
	})

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]bool{"success": true})
}

// Update profile handler
func handleUpdateProfile(w http.ResponseWriter, r *http.Request, sessionService *services.SessionService, userRepo *repositories.UserRepository) {
	cookie, err := r.Cookie("bikenode_session")
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "Not authenticated"})
		return
	}

	session, user, err := sessionService.ValidateSession(cookie.Value)
	if err != nil || session == nil || user == nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid session"})
		return
	}

	var updateRequest struct {
		Username  string `json:"username"`
		Email     string `json:"email"`
		FirstName string `json:"first_name"`
		LastName  string `json:"last_name"`
	}

	if err := json.NewDecoder(r.Body).Decode(&updateRequest); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request"})
		return
	}

	// Update user fields
	if updateRequest.Username != "" {
		user.Username = updateRequest.Username
	}
	if updateRequest.Email != "" {
		user.Email = &updateRequest.Email
	}

	// Update user in database
	err = userRepo.Update(user)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to update profile"})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"user": map[string]interface{}{
			"id":       user.ID,
			"username": user.Username,
			"email":    user.Email,
		},
	})
}

// Get current user handler
func handleGetCurrentUser(w http.ResponseWriter, r *http.Request, sessionService *services.SessionService) {
	cookie, err := r.Cookie("bikenode_session")
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "Not authenticated"})
		return
	}

	session, user, err := sessionService.ValidateSession(cookie.Value)
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid session"})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"id":              user.ID,
		"username":        user.Username,
		"email":           user.Email,
		"avatar_url":      user.GetAvatarURL(),
		"is_discord_user": user.IsDiscordUser(),
		"session_id":      session.ID,
	})
}

// Helper functions
func getClientIP(r *http.Request) string {
	if forwarded := r.Header.Get("X-Forwarded-For"); forwarded != "" {
		return forwarded
	}
	if realIP := r.Header.Get("X-Real-IP"); realIP != "" {
		return realIP
	}

	// Extract IP from RemoteAddr which includes port (e.g., "[::1]:61345" or "127.0.0.1:61345")
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		// If splitting fails, return the original address
		return r.RemoteAddr
	}
	return host
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// Web page handlers
func serveHomepage(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/html")
	w.Write([]byte(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    
    <!-- SEO Meta Tags -->
    <title>bikenode - your portal for bike classifieds & Deals</title>
    <meta name="description" content="bikenode aggregates and compares bike listings from multiple sources (ebay, craigslist, more). sign up for updates on our upcoming chrome extension and platform!">
    <meta name="keywords" content="bikenode, cycling, bike deals, bike classifieds, craigslist bikes, ebay bikes, chrome extension, aggregator">
    
    <!-- Open Graph Meta Tags -->
    <meta property="og:title" content="bikenode - your portal for bike classifieds & Deals">
    <meta property="og:description" content="We're building the ultimate hub for comparing and tracking bike listings across multiple marketplaces. stay tuned for our chrome extension and future updates.">
    <meta property="og:image" content="https://bikenode.com/image.png">
    <meta property="og:url" content="https://bikenode.com">
    <meta property="og:type" content="website">
    
    <!-- Twitter Card Meta Tags -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="bikenode - your portal for bike classifieds & Deals">
    <meta name="twitter:description" content="Get the best bike deals from ebay, craigslist, and more—aggregated in one place. sign up for early access!">
    <meta name="twitter:image" content="https://bikenode.com/image.png">
    
    <!-- Canonical URL -->
    <link rel="canonical" href="https://bikenode.com">
    
    <!-- Favicon -->
    <link rel="icon" type="image/png" href="./assets/images/favicon-96x96 2.png">
    <link rel="apple-touch-icon" href="./assets/images/apple-touch-icon 2.png">
    
    <!-- External CSS -->
    <link rel="stylesheet" href="./assets/css/index.css">
    
    <!-- Header and Authentication CSS -->
    <style>
        .header-bar {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: rgba(26, 28, 31, 0.95);
            backdrop-filter: blur(10px);
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            padding: 12px 24px;
            z-index: 1000;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .header-logo {
            height: 40px;
            display: flex;
            align-items: center;
        }
        
        .header-logo img {
            height: 100%;
            width: auto;
            border-radius: 4px;
            transition: all 0.2s ease;
        }
        
        .header-logo:hover img {
            transform: scale(1.05);
        }
        
        .auth-buttons {
            display: flex;
            gap: 12px;
            align-items: center;
        }
        
        .auth-btn {
            padding: 10px 20px;
            border: 1px solid transparent;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            text-decoration: none;
            transition: all 0.3s ease;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            position: relative;
            overflow: hidden;
        }
        
        .auth-btn::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
            transition: left 0.5s;
        }
        
        .auth-btn:hover::before {
            left: 100%;
        }
        
        .auth-btn-primary {
            background: linear-gradient(135deg, #5865f2, #4752c4);
            color: white;
            box-shadow: 0 4px 15px rgba(88, 101, 242, 0.3);
        }
        
        .auth-btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(88, 101, 242, 0.4);
        }
        
        .auth-btn-secondary {
            background: rgba(255, 255, 255, 0.05);
            color: #ffffff;
            border: 1px solid rgba(255, 255, 255, 0.3);
            backdrop-filter: blur(10px);
        }
        
        .auth-btn-secondary:hover {
            background: rgba(255, 255, 255, 0.15);
            border-color: rgba(255, 255, 255, 0.5);
            transform: translateY(-2px);
            box-shadow: 0 4px 15px rgba(255, 255, 255, 0.1);
        }
        
        .auth-btn-dashboard {
            background: linear-gradient(135deg, #00d4aa, #00b894);
            color: white;
            box-shadow: 0 4px 15px rgba(0, 212, 170, 0.3);
        }
        
        .auth-btn-dashboard:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(0, 212, 170, 0.4);
        }
        
        /* Adjust body padding to account for fixed header */
        body {
            padding-top: 70px;
        }
        
        @media (max-width: 768px) {
            .header-bar {
                padding: 8px 16px;
            }
            
            .auth-buttons {
                gap: 8px;
            }
            
            .auth-btn {
                padding: 6px 12px;
                font-size: 12px;
            }
            
            .header-logo {
                font-size: 16px;
            }
        }
    </style>
    
    <!-- Google tag (gtag.js) -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-8E771KQFK0"></script>
    <script>
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', 'G-8E771KQFK0');
    </script>
</head>
<body>
    <!-- Background Animation Canvas -->
    <canvas id="backgroundCanvas"></canvas>
    
    <!-- Header Bar -->
    <div class="header-bar">
        <a href="/" class="header-logo">
            <img src="./assets/images/image.png" alt="bikenode Logo">
        </a>
        <div class="auth-buttons">
            <a href="/login" class="auth-btn auth-btn-secondary">
                Login
            </a>
            <a href="/register" class="auth-btn auth-btn-primary">
                Sign Up
            </a>
            <a href="/dashboard" class="auth-btn auth-btn-dashboard">
                Dashboard
            </a>
        </div>
    </div>
    
    <!-- Main Content with new layout -->
    <div class="container">
        <!-- Left section with logo -->
        <div class="left-section">
            <div class="logo">
                <img src="./assets/images/image.png" alt="bikenode Logo - Aggregator for bike classifieds">
            </div>
        </div>
        
        <!-- Vertical divider -->
        <div class="vertical-divider"></div>
        
        <!-- Right section with content -->
        <div class="right-section">
            <h2>bike node is coming soon.</h2>
            <p class="tagline">
                we're building the ultimate platform to aggregate, compare, and track bike listings from multiple marketplaces.
                Join our early community to stay updated on our chrome extension launch and other exciting features.
            </p>
            
            <div class="email-signup">
                <form class="email-form" action="https://formsubmit.co/your.actual.email@example.com" method="POST" id="signup-form">
                    <input type="hidden" name="_subject" value="New bikenode subscription!">
                    <input type="hidden" name="_next" value="https://bikenode.com/thanks.html">
                    <input type="hidden" name="_captcha" value="false">
                    <label for="email" class="screen-reader-text">Email Address</label>
                    <input type="email" id="email" name="email" class="email-input" placeholder="Enter your email for updates" required>
                    <button type="submit" class="submit-btn">Notify Me</button>
                </form>
            </div>
            
            <a class="cta" href="https://discord.gg/JMCPCcnth4" id="discord-btn">
                Join our Discord
            </a>
            
            <div class="social-links">
                <a href="https://twitter.com/bikenode" aria-label="Follow us on Twitter">Twitter</a>
                <a href="https://instagram.com/bikenode" aria-label="Follow us on Instagram">Instagram</a>
            </div>
        </div>
    </div>

    <!-- JavaScript for Interactivity -->
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            // Email Signup Form Submission
            const form = document.getElementById('signup-form');
            if (form) {
                form.addEventListener('submit', function(e) {
                    // Don't preventDefault - let the native form submission work with FormSubmit
                    
                    // Track event in Google Analytics
                    if (typeof gtag === 'function') {
                        gtag('event', 'signup', {
                            'event_category': 'engagement',
                            'event_label': 'email_signup'
                        });
                    }
                    
                    // Show submitting state
                    const submitBtn = form.querySelector('.submit-btn');
                    const originalBtnText = submitBtn.textContent;
                    submitBtn.textContent = "Submitting...";
                    submitBtn.disabled = true;
                    
                    // Let the form submit normally
                    // The form will be redirected to the _next URL by FormSubmit
                });
            }
            
            // Discord Button Click Tracking
            const discordBtn = document.getElementById('discord-btn');
            if (discordBtn) {
                discordBtn.addEventListener('click', function() {
                    if (typeof gtag === 'function') {
                        gtag('event', 'click', {
                            'event_category': 'engagement',
                            'event_label': 'discord_join'
                        });
                    }
                });
            }
        });
    </script>
    
    <!-- Background Animation Script -->
    <script src="./assets/js/background.js"></script>
</body>
</html>`))
}

func serveLoginPage(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/html")
	w.Write([]byte(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login - BikeNode</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'gg sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: #1a1c1f;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #ffffff;
        }
        
        .auth-container {
            background: #36393f;
            border-radius: 8px;
            box-shadow: 0 8px 16px rgba(0, 0, 0, 0.24);
            padding: 32px;
            width: 100%;
            max-width: 480px;
            position: relative;
        }
        
        .logo {
            text-align: center;
            margin-bottom: 32px;
        }
        
        .logo h1 {
            color: #ffffff;
            font-size: 24px;
            font-weight: 600;
            margin-bottom: 8px;
        }
        
        .logo p {
            color: #b9bbbe;
            font-size: 16px;
        }
        
        .form-group {
            margin-bottom: 20px;
        }
        
        .form-label {
            display: block;
            font-size: 12px;
            font-weight: 600;
            color: #b9bbbe;
            text-transform: uppercase;
            letter-spacing: 0.02em;
            margin-bottom: 8px;
        }
        
        .form-input {
            width: 100%;
            background: #40444b;
            border: none;
            border-radius: 3px;
            color: #dcddde;
            font-size: 16px;
            height: 40px;
            padding: 10px;
            transition: background-color 0.15s ease;
        }
        
        .form-input:focus {
            background: #484c52;
            outline: none;
        }
        
        .form-input::placeholder {
            color: #72767d;
        }
        
        .btn {
            width: 100%;
            border: none;
            border-radius: 3px;
            font-size: 14px;
            font-weight: 500;
            height: 44px;
            cursor: pointer;
            transition: all 0.15s ease;
            text-decoration: none;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
        }
        
        .btn-primary {
            background: #5865f2;
            color: #ffffff;
        }
        
        .btn-primary:hover {
            background: #4752c4;
        }
        
        .btn-discord {
            background: #5865f2;
            color: #ffffff;
            margin-bottom: 20px;
        }
        
        .btn-discord:hover {
            background: #4752c4;
        }
        
        .divider {
            text-align: center;
            margin: 20px 0;
            position: relative;
            color: #72767d;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
        }
        
        .divider::before {
            content: '';
            position: absolute;
            top: 50%;
            left: 0;
            right: 0;
            height: 1px;
            background: #4f545c;
            z-index: 1;
        }
        
        .divider span {
            background: #36393f;
            padding: 0 16px;
            position: relative;
            z-index: 2;
        }
        
        .form-footer {
            margin-top: 20px;
            text-align: left;
        }
        
        .form-footer a {
            color: #00aff4;
            text-decoration: none;
            font-size: 14px;
        }
        
        .form-footer a:hover {
            text-decoration: underline;
        }
        
        .error-message {
            background: #ed4245;
            color: #ffffff;
            padding: 12px;
            border-radius: 3px;
            margin-bottom: 20px;
            font-size: 14px;
            display: none;
        }
        
        .loading {
            opacity: 0.6;
            cursor: not-allowed;
        }
    </style>
</head>
<body>
    <div class="auth-container">
        <div class="logo">
            <img src="./assets/images/image.png" alt="BikeNode Logo" style="height: 40px; margin-bottom: 12px;">
            <h1 style="color: #5865F2; font-weight: 700;">BikeNode</h1>
            <p>Access your BikeNode account</p>
        </div>
        
        <div id="error-message" class="error-message"></div>
        
        <a href="/api/auth/discord" class="btn btn-discord">
            <svg width="24" height="18" viewBox="0 0 24 18" fill="currentColor">
                <path d="M20.317 1.492c-1.53-.69-3.17-1.2-4.885-1.49a.075.075 0 0 0-.079.036c-.211.375-.446.865-.608 1.25a18.566 18.566 0 0 0-5.487 0 12.36 12.36 0 0 0-.617-1.25.077.077 0 0 0-.079-.036C7.933.288 6.287.798 4.758 1.492a.07.07 0 0 0-.032.027C.687 6.094-.425 10.54.134 14.922a.08.08 0 0 0 .031.055 19.9 19.9 0 0 0 5.993 2.98.078.078 0 0 0 .084-.026 13.83 13.83 0 0 0 1.226-1.963.074.074 0 0 0-.041-.104 13.201 13.201 0 0 1-1.872-.878.075.075 0 0 1-.008-.125c.126-.093.252-.19.372-.287a.075.075 0 0 1 .078-.01c3.927 1.764 8.18 1.764 12.061 0a.075.075 0 0 1 .079.009c.12.098.246.195.372.288a.075.075 0 0 1-.006.125c-.598.344-1.22.635-1.873.877a.075.075 0 0 0-.041.105c.36.687.772 1.341 1.225 1.962a.077.077 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-2.981.076.076 0 0 0 .032-.054c.667-5.062-.944-9.463-3.998-13.375a.06.06 0 0 0-.031-.028zM8.02 12.278c-1.334 0-2.415-1.209-2.415-2.691 0-1.482 1.05-2.691 2.415-2.691 1.378 0 2.436 1.222 2.415 2.691 0 1.482-1.05 2.691-2.415 2.691zm7.975 0c-1.334 0-2.415-1.209-2.415-2.691 0-1.482 1.05-2.691 2.415-2.691 1.378 0 2.436 1.222 2.415 2.691 0 1.482-1.037 2.691-2.415 2.691z"/>
            </svg>
            Continue with Discord
        </a>
        
        <div class="divider">
            <span>or</span>
        </div>
        
        <form onsubmit="handleLogin(event)">
            <div class="form-group">
                <label class="form-label">Email</label>
                <input type="email" name="email" class="form-input" required>
            </div>
            
            <div class="form-group">
                <label class="form-label">Password</label>
                <input type="password" name="password" class="form-input" required>
            </div>
            
            <button type="submit" class="btn btn-primary" id="login-btn">
                Login
            </button>
        </form>
        
        <div class="form-footer">
            <span style="color: #72767d;">Need an account? </span>
            <a href="/register">Register</a>
        </div>
    </div>

    <script>
        async function handleLogin(event) {
            event.preventDefault();
            const form = event.target;
            const formData = new FormData(form);
            const btn = document.getElementById('login-btn');
            const errorDiv = document.getElementById('error-message');
            
            // Reset error state
            errorDiv.style.display = 'none';
            btn.classList.add('loading');
            btn.textContent = 'Logging in...';
            
            try {
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: formData.get('email'),
                        password: formData.get('password')
                    })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    window.location.href = '/dashboard';
                } else {
                    errorDiv.textContent = result.error || 'Login failed';
                    errorDiv.style.display = 'block';
                }
            } catch (error) {
                errorDiv.textContent = 'Network error. Please try again.';
                errorDiv.style.display = 'block';
            } finally {
                btn.classList.remove('loading');
                btn.textContent = 'Login';
            }
        }
    </script>
</body>
</html>`))
}

func serveRegisterPage(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/html")
	w.Write([]byte(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Register - BikeNode</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #ffffff;
            padding: 20px;
        }
        
        .auth-container {
            background: #36393f;
            border-radius: 8px;
            box-shadow: 0 8px 16px rgba(0, 0, 0, 0.24);
            padding: 32px;
            width: 100%;
            max-width: 480px;
            position: relative;
        }
        
        .logo {
            text-align: center;
            margin-bottom: 32px;
        }
        
        .logo h1 {
            color: #ffffff;
            font-size: 24px;
            font-weight: 600;
            margin-bottom: 8px;
        }
        
        .logo p {
            color: #b9bbbe;
            font-size: 16px;
        }
        
        .form-group {
            margin-bottom: 20px;
        }
        
        .form-label {
            display: block;
            font-size: 12px;
            font-weight: 600;
            color: #b9bbbe;
            text-transform: uppercase;
            letter-spacing: 0.02em;
            margin-bottom: 8px;
        }
        
        .form-input {
            width: 100%;
            background: #40444b;
            border: none;
            border-radius: 3px;
            color: #dcddde;
            font-size: 16px;
            height: 40px;
            padding: 10px;
            transition: background-color 0.15s ease;
        }
        
        .form-input:focus {
            background: #484c52;
            outline: none;
        }
        
        .form-input::placeholder {
            color: #72767d;
        }
        
        .btn {
            width: 100%;
            border: none;
            border-radius: 3px;
            font-size: 14px;
            font-weight: 500;
            height: 44px;
            cursor: pointer;
            transition: all 0.15s ease;
            text-decoration: none;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
        }
        
        .btn-primary {
            background: #5865f2;
            color: #ffffff;
        }
        
        .btn-primary:hover {
            background: #4752c4;
        }
        
        .btn-discord {
            background: #5865f2;
            color: #ffffff;
            margin-bottom: 20px;
        }
        
        .btn-discord:hover {
            background: #4752c4;
        }
        
        .divider {
            text-align: center;
            margin: 20px 0;
            position: relative;
            color: #72767d;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
        }
        
        .divider::before {
            content: '';
            position: absolute;
            top: 50%;
            left: 0;
            right: 0;
            height: 1px;
            background: #4f545c;
            z-index: 1;
        }
        
        .divider span {
            background: #36393f;
            padding: 0 16px;
            position: relative;
            z-index: 2;
        }
        
        .form-footer {
            margin-top: 20px;
            text-align: left;
        }
        
        .form-footer a {
            color: #00aff4;
            text-decoration: none;
            font-size: 14px;
        }
        
        .form-footer a:hover {
            text-decoration: underline;
        }
        
        .error-message {
            background: #ed4245;
            color: #ffffff;
            padding: 12px;
            border-radius: 3px;
            margin-bottom: 20px;
            font-size: 14px;
            display: none;
        }
        
        .loading {
            opacity: 0.6;
            cursor: not-allowed;
        }
        
        .password-requirements {
            background: #2f3136;
            border-radius: 3px;
            padding: 12px;
            margin-top: 8px;
            font-size: 12px;
            color: #b9bbbe;
        }
        
        .password-requirements ul {
            margin: 8px 0 0 16px;
        }
        
        .password-requirements li {
            margin-bottom: 4px;
        }
    </style>
</head>
<body>
    <div class="auth-container">
        <div class="logo">
            <img src="./assets/images/image.png" alt="BikeNode Logo" style="height: 40px; margin-bottom: 12px;">
            <h1 style="color: #5865F2; font-weight: 700;">BikeNode</h1>
            <p>Create an account</p>
        </div>
        
        <div id="error-message" class="error-message"></div>
        
        <a href="/api/auth/discord" class="btn btn-discord">
            <svg width="24" height="18" viewBox="0 0 24 18" fill="currentColor">
                <path d="M20.317 1.492c-1.53-.69-3.17-1.2-4.885-1.49a.075.075 0 0 0-.079.036c-.211.375-.446.865-.608 1.25a18.566 18.566 0 0 0-5.487 0 12.36 12.36 0 0 0-.617-1.25.077.077 0 0 0-.079-.036C7.933.288 6.287.798 4.758 1.492a.07.07 0 0 0-.032.027C.687 6.094-.425 10.54.134 14.922a.08.08 0 0 0 .031.055 19.9 19.9 0 0 0 5.993 2.98.078.078 0 0 0 .084-.026 13.83 13.83 0 0 0 1.226-1.963.074.074 0 0 0-.041-.104 13.201 13.201 0 0 1-1.872-.878.075.075 0 0 1-.008-.125c.126-.093.252-.19.372-.287a.075.075 0 0 1 .078-.01c3.927 1.764 8.18 1.764 12.061 0a.075.075 0 0 1 .079.009c.12.098.246.195.372.288a.075.075 0 0 1-.006.125c-.598.344-1.22.635-1.873.877a.075.075 0 0 0-.041.105c.36.687.772 1.341 1.225 1.962a.077.077 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-2.981.076.076 0 0 0 .032-.054c.667-5.062-.944-9.463-3.998-13.375a.06.06 0 0 0-.031-.028zM8.02 12.278c-1.334 0-2.415-1.209-2.415-2.691 0-1.482 1.05-2.691 2.415-2.691 1.378 0 2.436 1.222 2.415 2.691 0 1.482-1.05 2.691-2.415 2.691zm7.975 0c-1.334 0-2.415-1.209-2.415-2.691 0-1.482 1.05-2.691 2.415-2.691 1.378 0 2.436 1.222 2.415 2.691 0 1.482-1.037 2.691-2.415 2.691z"/>
            </svg>
            Continue with Discord
        </a>
        
        <div class="divider">
            <span>or</span>
        </div>
        
        <form onsubmit="handleRegister(event)">
            <div class="form-group">
                <label class="form-label">Username</label>
                <input type="text" name="username" class="form-input" required minlength="3" maxlength="32">
            </div>
            
            <div class="form-group">
                <label class="form-label">Email</label>
                <input type="email" name="email" class="form-input" required>
            </div>
            
            <div class="form-group">
                <label class="form-label">Password</label>
                <input type="password" name="password" class="form-input" required minlength="8" id="password">
                <div class="password-requirements">
                    <strong>Password must contain:</strong>
                    <ul>
                        <li>At least 8 characters</li>
                        <li>Mix of letters and numbers recommended</li>
                    </ul>
                </div>
            </div>
            
            <div class="form-group">
                <label class="form-label">Confirm Password</label>
                <input type="password" name="confirm_password" class="form-input" required id="confirm-password">
            </div>
            
            <button type="submit" class="btn btn-primary" id="register-btn">
                Create Account
            </button>
        </form>
        
        <div class="form-footer">
            <span style="color: #72767d;">Already have an account? </span>
            <a href="/login">Login</a>
        </div>
    </div>

    <script>
        async function handleRegister(event) {
            event.preventDefault();
            const form = event.target;
            const formData = new FormData(form);
            const btn = document.getElementById('register-btn');
            const errorDiv = document.getElementById('error-message');
            
            // Reset error state
            errorDiv.style.display = 'none';
            
            // Validate passwords match
            if (formData.get('password') !== formData.get('confirm_password')) {
                errorDiv.textContent = 'Passwords do not match';
                errorDiv.style.display = 'block';
                return;
            }
            
            btn.classList.add('loading');
            btn.textContent = 'Creating account...';
            
            try {
                const response = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        username: formData.get('username'),
                        email: formData.get('email'),
                        password: formData.get('password'),
                        confirm_password: formData.get('confirm_password')
                    })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    window.location.href = '/dashboard';
                } else {
                    errorDiv.textContent = result.error || 'Registration failed';
                    errorDiv.style.display = 'block';
                }
            } catch (error) {
                errorDiv.textContent = 'Network error. Please try again.';
                errorDiv.style.display = 'block';
            } finally {
                btn.classList.remove('loading');
                btn.textContent = 'Create Account';
            }
        }
        
        // Real-time password confirmation validation
        document.getElementById('confirm-password').addEventListener('input', function() {
            const password = document.getElementById('password').value;
            const confirmPassword = this.value;
            
            if (confirmPassword && password !== confirmPassword) {
                this.style.borderColor = '#ed4245';
            } else {
                this.style.borderColor = 'transparent';
            }
        });
    </script>
</body>
</html>`))
}

func serveDashboardPage(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/html")
	w.Write([]byte(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard - BikeNode</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'gg sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: #1a1c1f;
            color: #ffffff;
            min-height: 100vh;
        }
        
        .sidebar {
            position: fixed;
            left: 0;
            top: 0;
            width: 240px;
            height: 100vh;
            background: #202225;
            padding: 20px;
            border-right: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .main-content {
            margin-left: 240px;
            padding: 20px;
            min-height: 100vh;
        }
        
        .server-icon {
            width: 48px;
            height: 48px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 20px;
            cursor: pointer;
            transition: all 0.3s ease;
            border: 2px solid rgba(88, 101, 242, 0.3);
        }
        
        .server-icon:hover {
            border-color: #5865F2;
            transform: scale(1.05);
        }
        
        .nav-section {
            margin-bottom: 32px;
        }
        
        .nav-section h3 {
            color: #8e9297;
            font-size: 12px;
            text-transform: uppercase;
            font-weight: 600;
            margin-bottom: 16px;
            letter-spacing: 0.02em;
        }
        
        .nav-item {
            display: flex;
            align-items: center;
            padding: 8px 12px;
            border-radius: 4px;
            cursor: pointer;
            transition: all 0.15s ease;
            margin-bottom: 4px;
            color: #b9bbbe;
            text-decoration: none;
        }
        
        .nav-item:hover {
            background: #393c43;
            color: #dcddde;
        }
        
        .nav-item.active {
            background: #5865F2;
            color: #ffffff;
        }
        
        .nav-item svg {
            width: 20px;
            height: 20px;
            margin-right: 12px;
        }
        
        .header {
            display: flex;
            justify-content: between;
            align-items: center;
            margin-bottom: 32px;
            padding-bottom: 16px;
            border-bottom: 1px solid #4f545c;
        }
        
        .header h1 {
            color: #ffffff;
            font-size: 24px;
            font-weight: 600;
        }
        
        .user-card {
            background: #202225;
            border-radius: 8px;
            padding: 24px;
            margin-bottom: 24px;
            border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .user-avatar {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            background: #5865F2;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 32px;
            margin-bottom: 16px;
            border: 3px solid rgba(88, 101, 242, 0.3);
        }
        
        .user-name {
            font-size: 20px;
            font-weight: 600;
            color: #ffffff;
            margin-bottom: 8px;
        }
        
        .user-details {
            color: #b9bbbe;
            font-size: 14px;
            line-height: 1.5;
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
            margin-bottom: 24px;
        }
        
        .stat-card {
            background: #202225;
            border-radius: 8px;
            padding: 20px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            text-align: center;
            transition: all 0.3s ease;
        }
        
        .stat-card:hover {
            border-color: rgba(88, 101, 242, 0.3);
            transform: translateY(-2px);
        }
        
        .stat-number {
            font-size: 32px;
            font-weight: 700;
            color: #5865F2;
            margin-bottom: 8px;
        }
        
        .stat-label {
            color: #b9bbbe;
            font-size: 14px;
            text-transform: uppercase;
            font-weight: 600;
            letter-spacing: 0.02em;
        }
        
        .action-buttons {
            display: flex;
            gap: 12px;
            margin-top: 24px;
        }
        
        .btn {
            padding: 10px 16px;
            border: none;
            border-radius: 4px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.15s ease;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            gap: 8px;
        }
        
        .btn-primary {
            background: #5865f2;
            color: #ffffff;
        }
        
        .btn-primary:hover {
            background: #4752c4;
        }
        
        .btn-secondary {
            background: #4f545c;
            color: #ffffff;
        }
        
        .btn-secondary:hover {
            background: #5d6269;
        }
        
        .loading-state {
            text-align: center;
            color: #8e9297;
            font-style: italic;
        }
        
        .error-state {
            background: #ed4245;
            color: #ffffff;
            padding: 16px;
            border-radius: 4px;
            margin-bottom: 16px;
        }
        
        @media (max-width: 768px) {
            .sidebar {
                width: 0;
                transform: translateX(-100%);
            }
            
            .main-content {
                margin-left: 0;
            }
        }
    </style>
</head>
<body>
    <div class="sidebar">
        <div class="server-icon">
            <img src="./assets/images/image.png" alt="BikeNode Logo" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">
        </div>
        
        <div class="nav-section">
            <h3>Navigation</h3>
            <a href="/dashboard" class="nav-item active">
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>
                </svg>
                Dashboard
            </a>
            <a href="/search" class="nav-item">
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                </svg>
                Search Bikes
            </a>
            <a href="/collection" class="nav-item">
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
                My Collection
            </a>
        </div>
        
        <div class="nav-section">
            <h3>Account</h3>
            <a href="/profile" class="nav-item">
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                </svg>
                Profile
            </a>
            <a href="/settings" class="nav-item">
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.82,11.69,4.82,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/>
                </svg>
                Settings
            </a>
            <a href="#" class="nav-item" onclick="logout()">
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
                </svg>
                Logout
            </a>
        </div>
    </div>
    
    <div class="main-content">
        <div class="header">
            <h1>Dashboard</h1>
        </div>
        
        <div id="error-message" class="error-state" style="display: none;"></div>
        
        <div class="user-card">
            <div id="user-info" class="loading-state">Loading user information...</div>
        </div>
        
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-number" id="bicycle-count">0</div>
                <div class="stat-label">Bicycles</div>
            </div>
            <div class="stat-card">
                <div class="stat-number" id="motorcycle-count">0</div>
                <div class="stat-label">Motorcycles</div>
            </div>
            <div class="stat-card">
                <div class="stat-number" id="total-count">0</div>
                <div class="stat-label">Total Vehicles</div>
            </div>
            <div class="stat-card">
                <div class="stat-number" id="server-count">0</div>
                <div class="stat-label">Discord Servers</div>
            </div>
        </div>
        
        <div class="action-buttons">
            <a href="/search" class="btn btn-primary">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                </svg>
                Search Bikes
            </a>
            <a href="#" class="btn btn-secondary">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                </svg>
                Add Vehicle
            </a>
        </div>
    </div>

    <script>
        async function loadUser() {
            const userInfoDiv = document.getElementById('user-info');
            const errorDiv = document.getElementById('error-message');
            
            try {
                const response = await fetch('/api/auth/me');
                if (response.ok) {
                    const user = await response.json();
                    
                    userInfoDiv.innerHTML = 
                        '<div class="user-avatar">' + 
                        (user.avatar_url ? '<img src="' + user.avatar_url + '" style="width: 100%; height: 100%; border-radius: 50%;" alt="Avatar">' : '👤') +
                        '</div>' +
                        '<div class="user-name">' + user.username + '</div>' +
                        '<div class="user-details">' +
                        '<div>📧 ' + (user.email || 'No email provided') + '</div>' +
                        '<div>🔗 ' + (user.is_discord_user ? 'Discord Account' : 'Email Account') + '</div>' +
                        '<div>🛡️ ' + (user.discord_connected ? 'Discord Connected' : 'Discord Not Connected') + '</div>' +
                        '</div>';
                    
                    // Update stats if available
                    if (user.stats) {
                        document.getElementById('bicycle-count').textContent = user.stats.bicycles || 0;
                        document.getElementById('motorcycle-count').textContent = user.stats.motorcycles || 0;
                        document.getElementById('total-count').textContent = user.stats.total || 0;
                    }
                    
                } else {
                    userInfoDiv.innerHTML = '<div style="text-align: center;"><a href="/login" class="btn btn-primary">Please Login</a></div>';
                }
            } catch (error) {
                errorDiv.textContent = 'Failed to load user information. Please refresh the page.';
                errorDiv.style.display = 'block';
                userInfoDiv.innerHTML = '<div class="loading-state">Error loading user data</div>';
            }
        }
        
        async function logout() {
            try {
                await fetch('/api/auth/logout', { method: 'POST' });
                window.location.href = '/login';
            } catch (error) {
                window.location.href = '/login';
            }
        }
        
        
        // Load user info on page load
        loadUser();
    </script>
</body>
</html>`))
}

func serveSearchPage(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/html")
	w.Write([]byte(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Search Bikes - BikeNode</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'gg sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: #1a1c1f;
            color: #ffffff;
            min-height: 100vh;
            padding: 20px;
        }
        
        .search-container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 40px 20px;
        }
        
        .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 40px;
            padding-bottom: 20px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .logo {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        
        .logo img {
            height: 40px;
            width: auto;
        }
        
        .logo h1 {
            font-size: 24px;
            font-weight: 700;
            color: #5865F2;
        }
        
        .nav-links {
            display: flex;
            gap: 20px;
        }
        
        .nav-link {
            color: #ffffff;
            text-decoration: none;
            padding: 8px 16px;
            border-radius: 8px;
            transition: all 0.2s ease;
        }
        
        .nav-link:hover {
            background: rgba(88, 101, 242, 0.1);
            color: #5865F2;
        }
        
        .search-section {
            margin-bottom: 40px;
        }
        
        .search-box {
            background: linear-gradient(145deg, #1e1e1e, #2a2a2a);
            border-radius: 16px;
            padding: 32px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            margin-bottom: 32px;
        }
        
        .search-title {
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 8px;
            background: linear-gradient(135deg, #ffffff 0%, #cccccc 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        
        .search-subtitle {
            color: #999999;
            margin-bottom: 24px;
            font-size: 16px;
        }
        
        .search-form {
            display: flex;
            flex-direction: column;
            gap: 16px;
        }
        
        .dropdown-row {
            display: flex;
            gap: 16px;
        }
        
        .bike-dropdown {
            flex: 1;
            background: linear-gradient(145deg, #2a2a2a, #333333);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 8px;
            color: #ffffff;
            font-size: 16px;
            height: 52px;
            padding: 12px 16px;
            transition: all 0.3s ease;
            cursor: pointer;
        }
        
        .bike-dropdown:focus {
            border-color: #5865F2;
            outline: none;
            box-shadow: 0 0 0 3px rgba(88, 101, 242, 0.1);
        }
        
        .bike-dropdown:disabled {
            background: #1a1a1a;
            color: #666666;
            cursor: not-allowed;
            border-color: rgba(255, 255, 255, 0.05);
        }
        
        .bike-dropdown option {
            background: #2a2a2a;
            color: #ffffff;
        }
        
        .results-container {
            background: linear-gradient(145deg, #1e1e1e, #2a2a2a);
            border-radius: 16px;
            padding: 32px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            min-height: 400px;
        }
        
        .results-header {
            font-size: 20px;
            font-weight: 600;
            margin-bottom: 20px;
        }
        
        .loading {
            text-align: center;
            color: #999999;
            padding: 60px 0;
        }
        
        .bike-card {
            background: linear-gradient(145deg, #2a2a2a, #333333);
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 16px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            transition: all 0.3s ease;
        }
        
        .bike-card:hover {
            border-color: rgba(88, 101, 242, 0.3);
            transform: translateY(-2px);
        }
        
        .bike-name {
            font-size: 18px;
            font-weight: 600;
            color: #ffffff;
            margin-bottom: 8px;
        }
        
        .bike-details {
            color: #999999;
            font-size: 14px;
            line-height: 1.5;
        }
        
        .no-results {
            text-align: center;
            color: #999999;
            padding: 60px 0;
        }
        
        .add-bike-btn {
            background: #5865F2;
            color: #ffffff;
            border: none;
            border-radius: 6px;
            padding: 8px 16px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
            margin-top: 12px;
            box-shadow: 0 2px 8px rgba(88, 101, 242, 0.3);
        }
        
        .add-bike-btn:hover {
            background: #4752c4;
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(88, 101, 242, 0.4);
        }
    </style>
</head>
<body>
    <div class="search-container">
        <div class="header">
            <div class="logo">
                <img src="./assets/images/image.png" alt="BikeNode Logo">
                <h1>BikeNode</h1>
            </div>
            <div class="nav-links">
                <a href="/dashboard" class="nav-link">Dashboard</a>
                <a href="/" class="nav-link">Home</a>
            </div>
        </div>
        
        <div class="search-section">
            <div class="search-box">
                <h2 class="search-title">Find Your Bike</h2>
                <p class="search-subtitle">Search our database to find bikes you own and add them to your collection</p>
                
                <form class="search-form">
                    <div class="dropdown-row">
                        <select id="make-select" class="bike-dropdown" onchange="loadModels()">
                            <option value="">Select Make</option>
                        </select>
                        <select id="model-select" class="bike-dropdown" onchange="loadYears()" disabled>
                            <option value="">Select Model</option>
                        </select>
                    </div>
                    <div class="dropdown-row">
                        <select id="year-select" class="bike-dropdown" onchange="loadVariants()" disabled>
                            <option value="">Select Year</option>
                        </select>
                        <select id="variant-select" class="bike-dropdown" onchange="showBikeDetails()" disabled>
                            <option value="">Select Variant</option>
                        </select>
                    </div>
                </form>
            </div>
        </div>
        
        <div class="results-container">
            <div class="results-header">Search Results</div>
            <div id="results-content" class="loading">
                Enter a search term to find bikes
            </div>
        </div>
    </div>

    <script>
        // Load makes when page loads
        document.addEventListener('DOMContentLoaded', function() {
            loadMakes();
        });
        
        async function loadMakes() {
            try {
                const response = await fetch('/api/bicycles/manufacturers');
                const data = await response.json();
                
                const makeSelect = document.getElementById('make-select');
                makeSelect.innerHTML = '<option value="">Select Make</option>';
                
                if (data.manufacturers) {
                    data.manufacturers.forEach(make => {
                        const option = document.createElement('option');
                        option.value = make;
                        option.textContent = make;
                        makeSelect.appendChild(option);
                    });
                }
            } catch (error) {
                console.error('Error loading makes:', error);
            }
        }
        
        async function loadModels() {
            const make = document.getElementById('make-select').value;
            const modelSelect = document.getElementById('model-select');
            const yearSelect = document.getElementById('year-select');
            const variantSelect = document.getElementById('variant-select');
            
            // Reset dependent dropdowns
            modelSelect.innerHTML = '<option value="">Select Model</option>';
            yearSelect.innerHTML = '<option value="">Select Year</option>';
            variantSelect.innerHTML = '<option value="">Select Variant</option>';
            yearSelect.disabled = true;
            variantSelect.disabled = true;
            
            if (!make) {
                modelSelect.disabled = true;
                return;
            }
            
            try {
                const response = await fetch('/api/bicycles/models?make=' + encodeURIComponent(make));
                const data = await response.json();
                
                if (data.models) {
                    data.models.forEach(model => {
                        const option = document.createElement('option');
                        option.value = model;
                        option.textContent = model;
                        modelSelect.appendChild(option);
                    });
                    modelSelect.disabled = false;
                }
            } catch (error) {
                console.error('Error loading models:', error);
            }
        }
        
        async function loadYears() {
            const make = document.getElementById('make-select').value;
            const model = document.getElementById('model-select').value;
            const yearSelect = document.getElementById('year-select');
            const variantSelect = document.getElementById('variant-select');
            
            // Reset dependent dropdowns
            yearSelect.innerHTML = '<option value="">Select Year</option>';
            variantSelect.innerHTML = '<option value="">Select Variant</option>';
            variantSelect.disabled = true;
            
            if (!make || !model) {
                yearSelect.disabled = true;
                return;
            }
            
            try {
                const response = await fetch('/api/bicycles/years?make=' + encodeURIComponent(make) + '&model=' + encodeURIComponent(model));
                const data = await response.json();
                
                if (data.years) {
                    data.years.forEach(year => {
                        const option = document.createElement('option');
                        option.value = year;
                        option.textContent = year;
                        yearSelect.appendChild(option);
                    });
                    yearSelect.disabled = false;
                }
            } catch (error) {
                console.error('Error loading years:', error);
            }
        }
        
        async function loadVariants() {
            const make = document.getElementById('make-select').value;
            const model = document.getElementById('model-select').value;
            const year = document.getElementById('year-select').value;
            const variantSelect = document.getElementById('variant-select');
            
            // Reset variants
            variantSelect.innerHTML = '<option value="">Select Variant</option>';
            
            if (!make || !model || !year) {
                variantSelect.disabled = true;
                return;
            }
            
            try {
                const response = await fetch('/api/bicycles/variants?make=' + encodeURIComponent(make) + '&model=' + encodeURIComponent(model) + '&year=' + encodeURIComponent(year));
                const data = await response.json();
                
                if (data.variants) {
                    data.variants.forEach(variant => {
                        const option = document.createElement('option');
                        option.value = variant.id;
                        option.textContent = variant.name;
                        variantSelect.appendChild(option);
                    });
                    variantSelect.disabled = false;
                }
            } catch (error) {
                console.error('Error loading variants:', error);
            }
        }
        
        async function showBikeDetails() {
            const variantId = document.getElementById('variant-select').value;
            const resultsContent = document.getElementById('results-content');
            
            if (!variantId) {
                resultsContent.innerHTML = 'Select a bike variant to see details';
                return;
            }
            
            resultsContent.innerHTML = '<div class="loading">Loading bike details...</div>';
            
            try {
                const response = await fetch('/api/bicycles/' + variantId);
                const bike = await response.json();
                
                if (bike) {
                    resultsContent.innerHTML = 
                        '<div class="bike-card">' +
                        '<div class="bike-name">' + bike.manufacturer + ' ' + bike.model + ' (' + bike.year + ')</div>' +
                        '<div class="bike-details">' +
                        '<div><strong>Variant:</strong> ' + bike.variant_name + '</div>' +
                        '<div><strong>Type:</strong> ' + (bike.category || 'Not specified') + '</div>' +
                        '</div>' +
                        '<button class="add-bike-btn" onclick="addToCollection(\'' + bike.id + '\')">Add to My Collection</button>' +
                        '</div>';
                } else {
                    resultsContent.innerHTML = '<div class="no-results">Bike details not found.</div>';
                }
            } catch (error) {
                resultsContent.innerHTML = '<div class="no-results">Error loading bike details.</div>';
            }
        }
        
        async function addToCollection(bikeId) {
            try {
                const response = await fetch('/api/user/bikes', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ bike_id: bikeId })
                });
                
                if (response.ok) {
                    alert('Bike added to your collection!');
                } else {
                    alert('Failed to add bike to collection. Please try again.');
                }
            } catch (error) {
                alert('Error adding bike to collection. Please try again.');
            }
        }
    </script>
</body>
</html>`))
}

func serveProfilePage(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/html")
	w.Write([]byte(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Profile - BikeNode</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'gg sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #1a1c1f; color: #ffffff; min-height: 100vh; padding: 20px; }
        .container { max-width: 800px; margin: 0 auto; padding: 40px 20px; }
        h1 { color: #5865F2; margin-bottom: 20px; }
        .profile-card { background: #202225; border-radius: 8px; padding: 24px; margin-bottom: 24px; border: 1px solid rgba(255, 255, 255, 0.1); }
        .back-link { color: #5865F2; text-decoration: none; margin-bottom: 20px; display: inline-block; }
        .back-link:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <div class="container">
        <a href="/dashboard" class="back-link">← Back to Dashboard</a>
        <h1>Profile</h1>
        <div class="profile-card">
            <p>Profile page content coming soon...</p>
        </div>
    </div>
</body>
</html>`))
}

func serveSettingsPage(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/html")
	w.Write([]byte(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Settings - BikeNode</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'gg sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #1a1c1f; color: #ffffff; min-height: 100vh; padding: 20px; }
        .container { max-width: 800px; margin: 0 auto; padding: 40px 20px; }
        h1 { color: #5865F2; margin-bottom: 20px; }
        .settings-card { background: #202225; border-radius: 8px; padding: 24px; margin-bottom: 24px; border: 1px solid rgba(255, 255, 255, 0.1); }
        .back-link { color: #5865F2; text-decoration: none; margin-bottom: 20px; display: inline-block; }
        .back-link:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <div class="container">
        <a href="/dashboard" class="back-link">← Back to Dashboard</a>
        <h1>Settings</h1>
        <div class="settings-card">
            <p>Settings page content coming soon...</p>
        </div>
    </div>
</body>
</html>`))
}

func serveCollectionPage(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/html")
	w.Write([]byte(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Collection - BikeNode</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'gg sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #1a1c1f; color: #ffffff; min-height: 100vh; padding: 20px; }
        .container { max-width: 1200px; margin: 0 auto; padding: 40px 20px; }
        h1 { color: #5865F2; margin-bottom: 20px; }
        .collection-card { background: #202225; border-radius: 8px; padding: 24px; margin-bottom: 24px; border: 1px solid rgba(255, 255, 255, 0.1); }
        .back-link { color: #5865F2; text-decoration: none; margin-bottom: 20px; display: inline-block; }
        .back-link:hover { text-decoration: underline; }
        .add-bike-btn { background: #5865F2; color: #ffffff; border: none; border-radius: 6px; padding: 12px 24px; font-size: 16px; font-weight: 500; cursor: pointer; text-decoration: none; display: inline-block; margin-top: 16px; }
        .add-bike-btn:hover { background: #4752c4; }
    </style>
</head>
<body>
    <div class="container">
        <a href="/dashboard" class="back-link">← Back to Dashboard</a>
        <h1>My Collection</h1>
        <div class="collection-card">
            <p>Your bike collection will appear here.</p>
            <a href="/search" class="add-bike-btn">Add a Bike</a>
        </div>
    </div>
</body>
</html>`))
}

func serveOnboardingPage(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/html")
	w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
	w.Header().Set("Pragma", "no-cache")
	w.Header().Set("Expires", "0")
	w.Write([]byte(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Complete Your Profile - BikeNode</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%);
            color: #ffffff;
            min-height: 100vh;
            padding: 20px;
            margin: 0;
        }
        
        .onboarding-container {
            max-width: 520px;
            margin: 60px auto;
            background: linear-gradient(145deg, #1e1e1e, #2a2a2a);
            border-radius: 16px;
            padding: 48px;
            box-shadow: 
                0 20px 40px rgba(0, 0, 0, 0.3),
                0 0 0 1px rgba(255, 255, 255, 0.05);
            color: #ffffff;
            border: 1px solid rgba(255, 255, 255, 0.08);
        }
        
        .header {
            text-align: center;
            margin-bottom: 40px;
        }
        
        .header h1 {
            color: #ffffff;
            font-size: 32px;
            font-weight: 700;
            margin-bottom: 12px;
            letter-spacing: -0.02em;
            background: linear-gradient(135deg, #ffffff 0%, #cccccc 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        
        .header p {
            color: #999999;
            font-size: 16px;
            font-weight: 400;
            line-height: 1.5;
        }
        
        .profile-section {
            margin-bottom: 32px;
        }
        
        .avatar-section {
            display: flex;
            align-items: center;
            gap: 20px;
            padding: 24px;
            background: linear-gradient(145deg, #2a2a2a, #333333);
            border-radius: 12px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            transition: all 0.3s ease;
        }
        
        .avatar-section:hover {
            border-color: rgba(255, 69, 0, 0.3);
            box-shadow: 0 8px 32px rgba(255, 69, 0, 0.1);
        }
        
        .avatar-upload {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            background: linear-gradient(135deg, #ff4500 0%, #cc3600 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 32px;
            color: white;
            cursor: pointer;
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
        }
        
        .avatar-upload::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.1) 50%, transparent 70%);
            transform: translateX(-100%);
            transition: transform 0.6s ease;
        }
        
        .avatar-upload:hover::before {
            transform: translateX(100%);
        }
        
        .avatar-upload:hover {
            transform: scale(1.05);
            box-shadow: 0 8px 24px rgba(255, 69, 0, 0.3);
        }
        
        .avatar-upload img {
            width: 100%;
            height: 100%;
            border-radius: 50%;
            object-fit: cover;
        }
        
        .avatar-info h3 {
            color: #ffffff;
            font-size: 20px;
            font-weight: 600;
            margin-bottom: 6px;
            letter-spacing: -0.01em;
        }
        
        .avatar-btn {
            background: none;
            border: none;
            color: #ff4500;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            padding: 0;
            transition: all 0.2s ease;
        }
        
        .avatar-btn:hover {
            color: #ff6633;
            text-shadow: 0 0 8px rgba(255, 69, 0, 0.3);
        }
        
        .form-group {
            margin-bottom: 28px;
        }
        
        .form-label {
            display: block;
            font-size: 14px;
            font-weight: 600;
            color: #ffffff;
            margin-bottom: 8px;
            letter-spacing: -0.01em;
        }
        
        .form-input {
            width: 100%;
            background: linear-gradient(145deg, #2a2a2a, #333333);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 8px;
            color: #ffffff;
            font-size: 16px;
            height: 52px;
            padding: 16px 20px;
            transition: all 0.3s ease;
            font-weight: 500;
        }
        
        .form-input:focus {
            border-color: #ff4500;
            outline: none;
            box-shadow: 
                0 0 0 3px rgba(255, 69, 0, 0.1),
                0 4px 12px rgba(255, 69, 0, 0.15);
            background: linear-gradient(145deg, #333333, #3a3a3a);
        }
        
        .form-input:hover {
            border-color: rgba(255, 255, 255, 0.2);
        }
        
        .form-input::placeholder {
            color: #888888;
            font-weight: 400;
        }
        
        .form-help {
            font-size: 12px;
            color: #aaaaaa;
            margin-top: 6px;
            font-weight: 400;
        }
        
        .privacy-section {
            margin: 40px 0;
        }
        
        .privacy-section h3 {
            color: #ffffff;
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 20px;
            letter-spacing: -0.01em;
        }
        
        .privacy-option {
            margin-bottom: 16px;
        }
        
        .privacy-label {
            display: flex;
            align-items: flex-start;
            gap: 16px;
            cursor: pointer;
            padding: 16px;
            border-radius: 8px;
            background: linear-gradient(145deg, #2a2a2a, #333333);
            border: 1px solid rgba(255, 255, 255, 0.1);
            transition: all 0.3s ease;
        }
        
        .privacy-label:hover {
            border-color: rgba(255, 69, 0, 0.3);
            background: linear-gradient(145deg, #333333, #3a3a3a);
        }
        
        .privacy-label input[type="radio"] {
            display: none;
        }
        
        .radio-custom {
            width: 20px;
            height: 20px;
            border: 2px solid rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            position: relative;
            margin-top: 2px;
            transition: all 0.3s ease;
        }
        
        .privacy-label input[type="radio"]:checked + .radio-custom {
            border-color: #ff4500;
            background: linear-gradient(135deg, #ff4500, #cc3600);
        }
        
        .privacy-label input[type="radio"]:checked + .radio-custom::after {
            content: '';
            width: 6px;
            height: 6px;
            background: #ffffff;
            border-radius: 50%;
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
        }
        
        .privacy-desc {
            font-size: 13px;
            color: #aaaaaa;
            margin-top: 4px;
            line-height: 1.4;
        }
        
        .button-group {
            margin-top: 40px;
            display: flex;
            flex-direction: column;
            gap: 16px;
        }
        
        .btn-primary {
            padding: 16px 32px;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
            background: linear-gradient(135deg, #ff4500 0%, #cc3600 100%);
            color: #ffffff;
            box-shadow: 0 4px 16px rgba(255, 69, 0, 0.3);
        }
        
        .btn-primary::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.1) 50%, transparent 70%);
            transform: translateX(-100%);
            transition: transform 0.6s ease;
        }
        
        .btn-primary:hover::before {
            transform: translateX(100%);
        }
        
        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 24px rgba(255, 69, 0, 0.4);
        }
        
        .btn-link {
            background: none;
            color: #aaaaaa;
            text-decoration: none;
            font-size: 14px;
            font-weight: 500;
            padding: 12px;
            text-align: center;
            transition: all 0.2s ease;
            border: none;
            cursor: pointer;
        }
        
        .btn-link:hover {
            color: #ffffff;
        }
        
        .form-label {
            display: block;
            font-size: 12px;
            font-weight: 600;
            color: #b9bbbe;
            text-transform: uppercase;
            letter-spacing: 0.02em;
            margin-bottom: 8px;
        }
        
        .form-input {
            width: 100%;
            background: #40444b;
            border: none;
            border-radius: 3px;
            color: #dcddde;
            font-size: 16px;
            height: 40px;
            padding: 10px;
            transition: background-color 0.15s ease;
        }
        
        .form-input:focus {
            background: #484c52;
            outline: none;
        }
        
        .form-input::placeholder {
            color: #72767d;
        }
        
        .profile-preview {
            background: #40444b;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 24px;
            display: flex;
            align-items: center;
            gap: 16px;
        }
        
        .avatar {
            width: 60px;
            height: 60px;
            border-radius: 50%;
            background: #5865f2;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
        }
        
        .avatar img {
            width: 100%;
            height: 100%;
            border-radius: 50%;
        }
        
        .profile-info h3 {
            color: #ffffff;
            font-size: 18px;
            margin-bottom: 4px;
        }
        
        .profile-info p {
            color: #b9bbbe;
            font-size: 14px;
        }
        
        .btn {
            width: 100%;
            padding: 12px;
            border: none;
            border-radius: 4px;
            font-size: 16px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.15s ease;
            margin-top: 8px;
        }
        
        .btn-primary {
            background: #5865f2;
            color: #ffffff;
        }
        
        .btn-primary:hover {
            background: #4752c4;
        }
        
        .btn-secondary {
            background: #4f545c;
            color: #ffffff;
        }
        
        .btn-secondary:hover {
            background: #5d6269;
        }
        
        .form-row {
            display: flex;
            gap: 16px;
        }
        
        .form-row .form-group {
            flex: 1;
        }
    </style>
</head>
<body>
    <div class="onboarding-container">
        <div class="header">
            <h1>Complete your profile</h1>
            <p>Help us personalize your BikeNode experience</p>
        </div>
        
        <form onsubmit="handleOnboarding(event)">
            <div class="profile-section">
                <div class="avatar-section">
                    <div class="avatar-upload" id="avatar-display">
                        👤
                    </div>
                    <div class="avatar-info">
                        <h3 id="display-username">Loading...</h3>
                        <button type="button" class="avatar-btn">Change photo</button>
                    </div>
                </div>
            </div>
            
            <div class="form-group">
                <label class="form-label">Display name</label>
                <input type="text" name="username" class="form-input" id="username-input" required>
                <div class="form-help">This is how others will see you on BikeNode</div>
            </div>
            
            <div class="form-group">
                <label class="form-label">Location (optional)</label>
                <input type="text" name="location" class="form-input" placeholder="City, Country">
                <div class="form-help">Help others find local cycling communities</div>
            </div>
            
            <div class="privacy-section">
                <h3>Privacy</h3>
                <div class="privacy-option">
                    <label class="privacy-label">
                        <input type="radio" name="privacy" value="public" checked>
                        <span class="radio-custom"></span>
                        <div>
                            <strong>Public</strong>
                            <div class="privacy-desc">Anyone can see your profile and activities</div>
                        </div>
                    </label>
                </div>
                <div class="privacy-option">
                    <label class="privacy-label">
                        <input type="radio" name="privacy" value="followers">
                        <span class="radio-custom"></span>
                        <div>
                            <strong>Followers</strong>
                            <div class="privacy-desc">Only approved followers can see your activities</div>
                        </div>
                    </label>
                </div>
            </div>
            
            <div class="button-group">
                <button type="submit" class="btn btn-primary" id="complete-btn">
                    Complete Setup
                </button>
                <button type="button" class="btn-link" onclick="skipOnboarding()">
                    Skip for now
                </button>
            </div>
        </form>
    </div>

    <script>
        // Load current user data and pre-fill form
        async function loadUserData() {
            try {
                const response = await fetch('/api/auth/me');
                if (response.ok) {
                    const user = await response.json();
                    
                    // Update preview
                    document.getElementById('display-username').textContent = user.username;
                    document.getElementById('display-email').textContent = user.email || 'No email';
                    
                    // Update avatar if available
                    if (user.avatar_url) {
                        document.getElementById('avatar-display').innerHTML = 
                            '<img src="' + user.avatar_url + '" alt="Avatar">';
                    }
                    
                    // Pre-fill form
                    document.getElementById('username-input').value = user.username;
                    document.getElementById('email-input').value = user.email || '';
                } else {
                    // Not logged in, redirect to login
                    window.location.href = '/login';
                }
            } catch (error) {
                console.error('Failed to load user data:', error);
                window.location.href = '/login';
            }
        }
        
        async function handleOnboarding(event) {
            event.preventDefault();
            const form = event.target;
            const formData = new FormData(form);
            const btn = document.getElementById('complete-btn');
            
            btn.textContent = 'Completing...';
            btn.disabled = true;
            
            try {
                const response = await fetch('/api/auth/update-profile', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        username: formData.get('username'),
                        email: formData.get('email'),
                        first_name: formData.get('first_name'),
                        last_name: formData.get('last_name')
                    })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    window.location.href = '/dashboard';
                } else {
                    alert('Failed to update profile: ' + (result.error || 'Unknown error'));
                    btn.textContent = 'Complete Profile';
                    btn.disabled = false;
                }
            } catch (error) {
                console.error('Onboarding failed:', error);
                alert('Failed to update profile. Please try again.');
                btn.textContent = 'Complete Profile';
                btn.disabled = false;
            }
        }
        
        function skipOnboarding() {
            window.location.href = '/dashboard';
        }
        
        // Load user data on page load
        loadUserData();
    </script>
</body>
</html>`))
}
