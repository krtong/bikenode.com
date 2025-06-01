package main

import (
	"context"
	"encoding/json"
	"fmt"
	"html/template"
	"log"
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

// Simple template data structures
type PageData struct {
	Title       string      `json:"title"`
	User        interface{} `json:"user,omitempty"`
	CurrentYear int         `json:"currentYear"`
}

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	// Connect to database and run migrations
	db, err := database.GetConnection()
	if err != nil {
		logger.Fatal("Failed to connect to database", err, nil)
	}
	defer db.Close()

	// Run migrations
	if err := database.RunMigrations(db); err != nil {
		logger.Fatal("Failed to run migrations", err, nil)
	}

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

	// Initialize handlers - using simple function handlers instead of complex ones
	// authHandler := handlers.NewAuthMuxHandler(authService)

	// Setup routes
	router := setupRoutes(authService, bicycleRepo)

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
		logger.Info("Starting BikeNode server", logger.Fields{
			"port":    port,
			"address": fmt.Sprintf("http://localhost:%s", port),
		})

		fmt.Printf("\n🚴‍♂️ BikeNode.com - Real Website\n")
		fmt.Printf("🌐 Website: http://localhost:%s\n", port)
		fmt.Printf("🔍 Bike Search: http://localhost:%s/bikes\n", port)
		fmt.Printf("👤 Profile: http://localhost:%s/profile\n", port)
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

func setupRoutes(authService *services.AuthService, bicycleRepo *repositories.BicycleRepository) *mux.Router {
	router := mux.NewRouter()

	// Enable CORS middleware
	router.Use(corsMiddleware)

	// API routes
	api := router.PathPrefix("/api").Subrouter()

	// Health check
	api.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{
			"status":  "healthy",
			"version": "1.0.0",
			"service": "bikenode-api",
		})
	}).Methods("GET")

	// Discord integration routes
	discord := api.PathPrefix("/discord").Subrouter()
	discord.HandleFunc("/user/{discord_id}", func(w http.ResponseWriter, r *http.Request) {
		vars := mux.Vars(r)
		discordID := vars["discord_id"]

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"discord_id": discordID,
			"linked":     false,
			"message":    "User linking system coming soon",
		})
	}).Methods("GET")

	discord.HandleFunc("/user/{discord_id}/bikes", func(w http.ResponseWriter, r *http.Request) {
		vars := mux.Vars(r)
		discordID := vars["discord_id"]

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"discord_id": discordID,
			"bicycles":   []map[string]interface{}{},
			"message":    "Bike collection feature coming soon",
		})
	}).Methods("GET")

	// Bicycles search routes with real database integration
	bicycles := api.PathPrefix("/bicycles").Subrouter()
	bicycles.HandleFunc("/search", func(w http.ResponseWriter, r *http.Request) {
		// Parse search parameters
		params := models.BicycleSearchParams{
			Query:        r.URL.Query().Get("q"),
			Manufacturer: r.URL.Query().Get("manufacturer"),
			Suspension:   r.URL.Query().Get("suspension"),
			WheelSize:    r.URL.Query().Get("wheel_size"),
			Limit:        20, // default
			Offset:       0,  // default
		}

		// Parse year
		if yearStr := r.URL.Query().Get("year"); yearStr != "" {
			if year, err := strconv.Atoi(yearStr); err == nil {
				params.Year = &year
			}
		}

		// Parse min_year
		if minYearStr := r.URL.Query().Get("min_year"); minYearStr != "" {
			if minYear, err := strconv.Atoi(minYearStr); err == nil {
				params.MinYear = &minYear
			}
		}

		// Parse max_year
		if maxYearStr := r.URL.Query().Get("max_year"); maxYearStr != "" {
			if maxYear, err := strconv.Atoi(maxYearStr); err == nil {
				params.MaxYear = &maxYear
			}
		}

		// Parse is_electric
		if electricStr := r.URL.Query().Get("is_electric"); electricStr != "" {
			if electric, err := strconv.ParseBool(electricStr); err == nil {
				params.IsElectric = &electric
			}
		}

		// Parse limit
		if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
			if limit, err := strconv.Atoi(limitStr); err == nil && limit > 0 {
				params.Limit = limit
			}
		}

		// Parse offset
		if offsetStr := r.URL.Query().Get("offset"); offsetStr != "" {
			if offset, err := strconv.Atoi(offsetStr); err == nil && offset >= 0 {
				params.Offset = offset
			}
		}

		// Search bicycles in database using simplified search
		result, err := bicycleRepo.SearchBicyclesSimple(params)
		if err != nil {
			logger.Error("Bicycle search failed", err, logger.Fields{
				"query":        params.Query,
				"manufacturer": params.Manufacturer,
			})
			http.Error(w, "Failed to search bicycles", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(result)
	}).Methods("GET")

	bicycles.HandleFunc("/manufacturers", func(w http.ResponseWriter, r *http.Request) {
		manufacturers, err := bicycleRepo.GetManufacturers()
		if err != nil {
			logger.Error("Failed to get manufacturers", err, nil)
			http.Error(w, "Failed to get manufacturers", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"manufacturers": manufacturers,
		})
	}).Methods("GET")

	bicycles.HandleFunc("/years", func(w http.ResponseWriter, r *http.Request) {
		years, err := bicycleRepo.GetYears()
		if err != nil {
			logger.Error("Failed to get years", err, nil)
			http.Error(w, "Failed to get years", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"years": years,
		})
	}).Methods("GET")

	// Authentication routes (simplified)
	auth := api.PathPrefix("/auth").Subrouter()
	auth.HandleFunc("/discord", func(w http.ResponseWriter, r *http.Request) {
		// Redirect to Discord OAuth
		authURL := authService.GetDiscordAuthURL()
		http.Redirect(w, r, authURL, http.StatusTemporaryRedirect)
	}).Methods("GET")

	// Serve static files for web app
	fileServer := http.FileServer(http.Dir("./static/"))
	router.PathPrefix("/static/").Handler(http.StripPrefix("/static/", fileServer))

	// Serve assets for marketing homepage
	assetsServer := http.FileServer(http.Dir("../../assets/"))
	router.PathPrefix("/assets/").Handler(http.StripPrefix("/assets/", assetsServer))

	// Web routes (serve real templates)
	router.HandleFunc("/", serveHomepage).Methods("GET")
	router.HandleFunc("/app", serveTemplate("index.html", "BikeNode - Connect Your Motorcycle Journey")).Methods("GET")
	router.HandleFunc("/dashboard", serveDashboard).Methods("GET")
	router.HandleFunc("/profile", serveProfile).Methods("GET")
	router.HandleFunc("/bikes", serveBikeSearch).Methods("GET")
	router.HandleFunc("/search", serveBikeSearch).Methods("GET")
	router.HandleFunc("/signup", serveSignupPage).Methods("GET")
	router.HandleFunc("/login", func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, "/api/auth/discord", http.StatusTemporaryRedirect)
	}).Methods("GET")

	return router
}

func serveTemplate(templateName, title string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		tmpl, err := template.ParseFiles(fmt.Sprintf("templates/%s", templateName))
		if err != nil {
			http.Error(w, fmt.Sprintf("Template error: %v", err), http.StatusInternalServerError)
			return
		}

		data := map[string]interface{}{
			"title":       title,
			"currentYear": time.Now().Year(),
			"user":        nil, // TODO: Get from session
		}

		w.Header().Set("Content-Type", "text/html")
		if err := tmpl.Execute(w, data); err != nil {
			http.Error(w, fmt.Sprintf("Template execution error: %v", err), http.StatusInternalServerError)
		}
	}
}

func serveSignupPage(w http.ResponseWriter, r *http.Request) {
	tmpl, err := template.ParseFiles("templates/signup.html")
	if err != nil {
		http.Error(w, fmt.Sprintf("Template error: %v", err), http.StatusInternalServerError)
		return
	}

	data := map[string]interface{}{
		"title":        "Join BikeNode - Connect Your Bike Journey",
		"current_year": time.Now().Year(),
		"stats": map[string]interface{}{
			"total_variants": "69,884",
			"total_brands":   "380",
		},
	}

	w.Header().Set("Content-Type", "text/html")
	if err := tmpl.Execute(w, data); err != nil {
		http.Error(w, fmt.Sprintf("Template execution error: %v", err), http.StatusInternalServerError)
	}
}

func serveHomepage(w http.ResponseWriter, r *http.Request) {
	// Serve the root index.html file (marketing page)
	http.ServeFile(w, r, "../../index.html")
}

func serveDashboard(w http.ResponseWriter, r *http.Request) {
	tmpl, err := template.ParseFiles("templates/dashboard.html")
	if err != nil {
		http.Error(w, fmt.Sprintf("Template error: %v", err), http.StatusInternalServerError)
		return
	}

	// Mock user data - in real implementation, get from session/auth
	data := map[string]interface{}{
		"title":        "Dashboard - BikeNode",
		"current_year": time.Now().Year(),
		"user": map[string]interface{}{
			"username":         "TestUser",
			"avatar_url":       "https://cdn.discordapp.com/embed/avatars/0.png",
			"discord_avatar":   "https://cdn.discordapp.com/embed/avatars/0.png",
			"discord_username": "TestUser#1234",
		},
		"stats": map[string]interface{}{
			"motorcycles": 0,
			"bicycles":    0,
			"electric":    0,
			"stories":     0,
		},
		"recent_bikes":    []interface{}{},
		"recent_activity": []interface{}{},
		"discord_servers": 3,
		"user_roles":      []interface{}{},
	}

	w.Header().Set("Content-Type", "text/html")
	if err := tmpl.Execute(w, data); err != nil {
		http.Error(w, fmt.Sprintf("Template execution error: %v", err), http.StatusInternalServerError)
	}
}

func serveProfile(w http.ResponseWriter, r *http.Request) {
	tmpl, err := template.ParseFiles("templates/profile_enhanced.html")
	if err != nil {
		http.Error(w, fmt.Sprintf("Template error: %v", err), http.StatusInternalServerError)
		return
	}

	// Mock user data - in real implementation, get from session/auth
	data := map[string]interface{}{
		"title":        "Your Profile - BikeNode",
		"current_year": time.Now().Year(),
		"user": map[string]interface{}{
			"username":         "TestUser",
			"avatar_url":       "https://cdn.discordapp.com/embed/avatars/0.png",
			"discord_username": "TestUser#1234",
			"email":            "test@example.com",
			"created_at":       "March 2024",
			"location":         "",
			"bio":              "",
			"public_profile":   true,
			"show_collection":  true,
			"show_timeline":    true,
		},
		"stats": map[string]interface{}{
			"motorcycles": 2,
			"bicycles":    3,
			"electric":    1,
			"stories":     5,
			"total":       6,
		},
		"vehicles": []interface{}{
			map[string]interface{}{
				"name":         "2024 Trek Fuel EX 8",
				"manufacturer": "Trek",
				"year":         2024,
				"bike_type":    "Mountain Bike",
			},
			map[string]interface{}{
				"name":         "2023 Specialized Tarmac",
				"manufacturer": "Specialized",
				"year":         2023,
				"bike_type":    "Road Bike",
			},
		},
		"recent_activity": []interface{}{},
		"timeline_events": []interface{}{},
		"discord_servers": 3,
		"user_roles":      []interface{}{},
	}

	w.Header().Set("Content-Type", "text/html")
	if err := tmpl.Execute(w, data); err != nil {
		http.Error(w, fmt.Sprintf("Template execution error: %v", err), http.StatusInternalServerError)
	}
}

func serveBikeSearch(w http.ResponseWriter, r *http.Request) {
	tmpl, err := template.ParseFiles("templates/bike_search.html")
	if err != nil {
		http.Error(w, fmt.Sprintf("Template error: %v", err), http.StatusInternalServerError)
		return
	}

	data := map[string]interface{}{
		"title":        "Bike Search - BikeNode",
		"current_year": time.Now().Year(),
		// Could add user data here if available from session
	}

	w.Header().Set("Content-Type", "text/html")
	if err := tmpl.Execute(w, data); err != nil {
		http.Error(w, fmt.Sprintf("Template execution error: %v", err), http.StatusInternalServerError)
	}
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
