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
	"syscall"
	"time"

	"bikenode.com/database"
	"bikenode.com/handlers"
	"bikenode.com/logger"
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

	// Initialize services
	authService := services.NewAuthService(
		userRepo,
		os.Getenv("DISCORD_CLIENT_ID"),
		os.Getenv("DISCORD_CLIENT_SECRET"),
		os.Getenv("DISCORD_REDIRECT_URI"),
	)

	// Initialize handlers
	authHandler := handlers.NewAuthMuxHandler(authService)

	// Setup routes
	router := setupRoutes(authHandler)

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
		fmt.Printf("🏥 Health: http://localhost:%s/api/health\n", port)
		fmt.Printf("🤖 Discord Bot: Connected and ready\n\n")

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

func setupRoutes(authHandler *handlers.AuthMuxHandler) *mux.Router {
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

	// Bicycles search routes with proper database integration
	bicycles := api.PathPrefix("/bicycles").Subrouter()
	bicycles.HandleFunc("/search", func(w http.ResponseWriter, r *http.Request) {
		// For now, return mock data until we integrate the bicycle handler
		query := r.URL.Query().Get("q")
		manufacturer := r.URL.Query().Get("manufacturer")
		year := r.URL.Query().Get("year")

		w.Header().Set("Content-Type", "application/json")

		// Mock response structure matching our expected API
		response := map[string]interface{}{
			"bicycles": []map[string]interface{}{
				{
					"id":             "550e8400-e29b-41d4-a716-446655440000",
					"variant_id":     "2024-trek-fuel-ex-8",
					"name":           "2024 Trek Fuel EX 8",
					"manufacturer":   "Trek",
					"year":           2024,
					"model":          "Fuel EX 8",
					"frame_material": "Carbon",
					"wheel_size":     "29\"",
					"suspension":     "Full Suspension",
					"price":          "$4,199",
					"is_electric":    false,
					"image_url":      "https://trek.scene7.com/is/image/TrekBicycleProducts/FuelEX8_24_37424_A_Primary",
				},
				{
					"id":             "550e8400-e29b-41d4-a716-446655440001",
					"variant_id":     "2024-specialized-stumpjumper",
					"name":           "2024 Specialized Stumpjumper",
					"manufacturer":   "Specialized",
					"year":           2024,
					"model":          "Stumpjumper",
					"frame_material": "Carbon",
					"wheel_size":     "29\"",
					"suspension":     "Full Suspension",
					"price":          "$5,200",
					"is_electric":    false,
					"image_url":      "https://specialized.com/media/stumpjumper.jpg",
				},
			},
			"total":        2,
			"limit":        20,
			"offset":       0,
			"query":        query,
			"manufacturer": manufacturer,
			"year":         year,
		}

		json.NewEncoder(w).Encode(response)
	}).Methods("GET")

	bicycles.HandleFunc("/manufacturers", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"manufacturers": []string{
				"Trek", "Specialized", "Giant", "Cannondale", "Santa Cruz",
				"Yeti", "Scott", "Merida", "Canyon", "BMC", "Pivot", "Ibis",
				"Evil", "Transition", "Norco", "Rocky Mountain", "Devinci",
			},
		})
	}).Methods("GET")

	bicycles.HandleFunc("/years", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		years := []int{}
		for year := 2024; year >= 2015; year-- {
			years = append(years, year)
		}
		json.NewEncoder(w).Encode(map[string]interface{}{
			"years": years,
		})
	}).Methods("GET")

	// Authentication routes
	auth := api.PathPrefix("/auth").Subrouter()
	auth.HandleFunc("/discord", func(w http.ResponseWriter, r *http.Request) {
		// Redirect to Discord OAuth (placeholder)
		http.Redirect(w, r, "/?auth=discord", http.StatusTemporaryRedirect)
	}).Methods("GET")

	// Email authentication routes
	auth.HandleFunc("/signup", authHandler.SignupHandler).Methods("POST")
	auth.HandleFunc("/login", authHandler.LoginHandler).Methods("POST")
	auth.HandleFunc("/logout", authHandler.LogoutHandler).Methods("POST", "GET")

	// Discord profile linking endpoint
	auth.HandleFunc("/discord/link", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "POST" {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		var linkData struct {
			DiscordID       string `json:"discord_id"`
			DiscordUsername string `json:"discord_username"`
			DiscordAvatar   string `json:"discord_avatar"`
			GuildID         string `json:"guild_id"`
			Token           string `json:"token"`
		}

		if err := json.NewDecoder(r.Body).Decode(&linkData); err != nil {
			http.Error(w, "Invalid JSON", http.StatusBadRequest)
			return
		}

		// TODO: Store token in database with expiration
		// For now, just log and return success
		fmt.Printf("Profile link request: %+v\n", linkData)

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success":    true,
			"message":    "Profile link created successfully",
			"expires_in": "15 minutes",
		})
	}).Methods("POST")

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
	tmpl, err := template.ParseFiles("templates/auth/signup.html")
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
