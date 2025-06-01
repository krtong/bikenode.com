package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"

	"bikenode.com/database"
	"bikenode.com/logger"
	"bikenode.com/services"
	"github.com/gorilla/mux"
	"github.com/joho/godotenv"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	// Logger is auto-initialized

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

	// Initialize bike data service
	bikeDataService := services.NewBikeDataService()

	// Setup basic routes
	router := mux.NewRouter()

	// CORS middleware
	router.Use(func(next http.Handler) http.Handler {
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
	})

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

	// Discord integration routes (placeholder for bot integration)
	discord := api.PathPrefix("/discord").Subrouter()
	discord.HandleFunc("/user/{discord_id}", func(w http.ResponseWriter, r *http.Request) {
		vars := mux.Vars(r)
		discordID := vars["discord_id"]

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"discord_id": discordID,
			"linked":     false,
			"message":    "User not linked yet - feature coming soon",
		})
	}).Methods("GET")

	discord.HandleFunc("/user/{discord_id}/bikes", func(w http.ResponseWriter, r *http.Request) {
		vars := mux.Vars(r)
		discordID := vars["discord_id"]

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"discord_id": discordID,
			"bicycles":   []map[string]interface{}{},
			"message":    "No bikes found - feature coming soon",
		})
	}).Methods("GET")

	// Bicycles search route using BikeDataService
	bicycles := api.PathPrefix("/bicycles").Subrouter()
	bicycles.HandleFunc("/search", func(w http.ResponseWriter, r *http.Request) {
		query := r.URL.Query().Get("q")
		limitStr := r.URL.Query().Get("limit")

		// Default limit
		limit := 10
		if limitStr != "" {
			if parsedLimit, err := strconv.Atoi(limitStr); err == nil && parsedLimit > 0 {
				limit = parsedLimit
			}
		}

		// Search using BikeDataService
		bikes := bikeDataService.SearchBikes(query, limit)

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"query":    query,
			"bicycles": bikes,
			"total":    len(bikes),
			"success":  true,
		})
	}).Methods("GET")

	// Add bike search route for the bike search component
	bikes := api.PathPrefix("/bikes").Subrouter()
	bikes.HandleFunc("/search", func(w http.ResponseWriter, r *http.Request) {
		query := r.URL.Query().Get("q")
		limitStr := r.URL.Query().Get("limit")

		// Default limit
		limit := 10
		if limitStr != "" {
			if parsedLimit, err := strconv.Atoi(limitStr); err == nil && parsedLimit > 0 {
				limit = parsedLimit
			}
		}

		// Search using BikeDataService
		bikes := bikeDataService.SearchBikes(query, limit)

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": true,
			"bikes":   bikes,
			"query":   query,
			"count":   len(bikes),
		})
	}).Methods("GET")

	// Serve static files
	fileServer := http.FileServer(http.Dir("./static/"))
	router.PathPrefix("/static/").Handler(http.StripPrefix("/static/", fileServer))

	// Serve basic index
	router.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/html")
		fmt.Fprintf(w, `
<!DOCTYPE html>
<html>
<head>
    <title>BikeNode.com - Development Server</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #333; border-bottom: 3px solid #007bff; padding-bottom: 10px; }
        .status { background: #d4edda; color: #155724; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .endpoint { background: #f8f9fa; padding: 10px; border-left: 4px solid #007bff; margin: 10px 0; }
        code { background: #e9ecef; padding: 2px 6px; border-radius: 3px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚴‍♂️ BikeNode.com - Development Server</h1>
        
        <div class="status">
            <strong>✅ Server Status:</strong> Running successfully!<br>
            <strong>🗄️ Database:</strong> Connected<br>
            <strong>🤖 Discord Bot:</strong> Ready for integration
        </div>

        <h3>Available API Endpoints:</h3>
        <div class="endpoint"><strong>GET</strong> <code>/api/health</code> - Server health check</div>
        <div class="endpoint"><strong>GET</strong> <code>/api/discord/user/{discord_id}</code> - Discord user info</div>
        <div class="endpoint"><strong>GET</strong> <code>/api/discord/user/{discord_id}/bikes</code> - User's bike collection</div>
        <div class="endpoint"><strong>GET</strong> <code>/api/bicycles/search?q={query}</code> - Search bicycles</div>
        <div class="endpoint"><strong>GET</strong> <code>/api/bikes/search?q={query}&limit={limit}</code> - Bike search for components</div>

        <h3>Integration Test:</h3>
        <p>🔗 Discord Bot: Configure bot to connect to <code>http://localhost:%s</code></p>
        <p>📱 Test command: Use Discord bot commands to test API integration</p>

        <p><em>This is a development server. Full features coming soon!</em></p>
    </div>
</body>
</html>`, os.Getenv("PORT"))
	}).Methods("GET")

	// Get port from environment
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	// Start server
	logger.Info("Starting BikeNode development server", logger.Fields{
		"port":    port,
		"address": fmt.Sprintf("http://localhost:%s", port),
	})

	fmt.Printf("\n🚴‍♂️ BikeNode.com Development Server\n")
	fmt.Printf("🌐 Server: http://localhost:%s\n", port)
	fmt.Printf("🏥 Health: http://localhost:%s/api/health\n", port)
	fmt.Printf("🤖 Discord Integration: Ready\n\n")

	log.Fatal(http.ListenAndServe(":"+port, router))
}
