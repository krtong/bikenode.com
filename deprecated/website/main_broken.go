package main

import (
	"context"
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

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	// Logger is automatically initialized

	// Connect to database
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
	motorcycleRepo := repositories.NewMotorcycleRepository(db)
	bicycleRepo := repositories.NewBicycleRepository(db)
	ownershipRepo := repositories.NewOwnershipRepository(db)
	timelineRepo := repositories.NewTimelineEventRepository(db)
	serverRepo := repositories.NewServerRepository(db)

	// Initialize services
	bikeDataService := services.NewBikeDataService()
	authService := services.NewAuthService(
		userRepo,
		os.Getenv("DISCORD_CLIENT_ID"),
		os.Getenv("DISCORD_CLIENT_SECRET"),
		os.Getenv("DISCORD_REDIRECT_URI"),
	)
	profileService := services.NewProfileService(
		userRepo, motorcycleRepo, ownershipRepo, timelineRepo, serverRepo,
		os.Getenv("BOT_API_URL"), os.Getenv("DISCORD_BOT_TOKEN"),
	)
	serverService := services.NewServerService(
		serverRepo, userRepo,
		os.Getenv("BOT_API_URL"), os.Getenv("DISCORD_BOT_TOKEN"),
	)

	// Initialize handlers
	apiHandler := handlers.NewAPIHandler()
	authHandler := handlers.NewAuthHandler(authService)
	profileHandler := handlers.NewProfileHandler(profileService)
	serverHandler := handlers.NewServerHandler(serverService)
	bicycleHandler := handlers.NewBicycleHandler(bicycleRepo, userRepo, bikeDataService)

	// Setup routes
	router := setupRoutes(apiHandler, authHandler, profileHandler, serverHandler, bicycleHandler)

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

func setupRoutes(
	apiHandler *handlers.APIHandler,
	authHandler *handlers.AuthHandler,
	profileHandler *handlers.ProfileHandler,
	serverHandler *handlers.ServerHandler,
	bicycleHandler *handlers.BicycleHandler,
) *mux.Router {
	router := mux.NewRouter()

	// Enable CORS middleware
	router.Use(handlers.CORSMiddleware)

	// API routes
	api := router.PathPrefix("/api").Subrouter()

	// Health check
	api.HandleFunc("/health", apiHandler.HealthCheck).Methods("GET")

	// Auth routes (note: these would need Gin integration)
	// For now, commenting out until we can properly integrate with Gin
	// auth := api.PathPrefix("/auth").Subrouter()
	// auth.HandleFunc("/discord", authHandler.Login).Methods("GET")
	// auth.HandleFunc("/discord/callback", authHandler.Callback).Methods("GET")
	// auth.HandleFunc("/logout", authHandler.Logout).Methods("POST")

	// Bicycle routes
	bicycles := api.PathPrefix("/bicycles").Subrouter()
	bicycles.HandleFunc("/search", bicycleHandler.SearchBicycles).Methods("GET")
	bicycles.HandleFunc("/manufacturers", bicycleHandler.GetManufacturers).Methods("GET")
	bicycles.HandleFunc("/years", bicycleHandler.GetYears).Methods("GET")
	bicycles.HandleFunc("/{id}", bicycleHandler.GetBicycle).Methods("GET")

	// Bike data search routes (for bike search component)
	bikes := api.PathPrefix("/bikes").Subrouter()
	bikes.HandleFunc("/search", bicycleHandler.SearchBikeData).Methods("GET")

	// User bicycle routes (authenticated)
	userBicycles := api.PathPrefix("/user/bicycles").Subrouter()
	userBicycles.Use(handlers.AuthMiddleware) // Add auth middleware
	userBicycles.HandleFunc("", bicycleHandler.GetUserBicycles).Methods("GET")
	userBicycles.HandleFunc("", bicycleHandler.AddUserBicycle).Methods("POST")
	userBicycles.HandleFunc("/{bicycle_id}", bicycleHandler.RemoveUserBicycle).Methods("DELETE")

	// Discord integration routes
	discord := api.PathPrefix("/discord").Subrouter()
	discord.HandleFunc("/user/{discord_id}", profileHandler.GetDiscordUser).Methods("GET")
	discord.HandleFunc("/user/{discord_id}/bikes", profileHandler.GetDiscordUserBikes).Methods("GET")
	discord.HandleFunc("/link-request", profileHandler.CreateLinkRequest).Methods("POST")
	discord.HandleFunc("/user/{discord_id}/unlink", profileHandler.UnlinkDiscordAccount).Methods("POST")

	// Server management routes (authenticated)
	servers := api.PathPrefix("/servers").Subrouter()
	servers.Use(handlers.AuthMiddleware)
	servers.HandleFunc("", serverHandler.GetUserServers).Methods("GET")
	servers.HandleFunc("/{server_id}/config", serverHandler.GetServerConfig).Methods("GET")
	servers.HandleFunc("/{server_id}/config", serverHandler.UpdateServerConfig).Methods("PUT")
	servers.HandleFunc("/{server_id}/channels", serverHandler.GetServerChannels).Methods("GET")

	// Static file server
	fileServer := http.FileServer(http.Dir("./static/"))
	router.PathPrefix("/static/").Handler(http.StripPrefix("/static/", fileServer))

	// Serve index.html for root path with template rendering
	router.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		tmpl, err := template.ParseFiles("./templates/index.html")
		if err != nil {
			http.Error(w, "Template error", http.StatusInternalServerError)
			return
		}
		
		data := map[string]interface{}{
			"title":       "BikeNode - Connect Your Motorcycle Journey",
			"user":        nil, // TODO: Get from session
			"currentYear": time.Now().Year(),
		}
		
		if err := tmpl.Execute(w, data); err != nil {
			http.Error(w, "Template execution error", http.StatusInternalServerError)
			return
		}
	}).Methods("GET")

	// Bike search page
	router.HandleFunc("/bikes", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, "./templates/bike_search.html")
	}).Methods("GET")

	// Login page (placeholder)
	router.HandleFunc("/login", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/html")
		w.Write([]byte(`<!DOCTYPE html>
<html>
<head>
    <title>Login - BikeNode</title>
    <link rel="stylesheet" href="/static/css/style.css">
</head>
<body>
    <div style="text-align: center; padding: 2rem;">
        <h1>BikeNode Login</h1>
        <p>Authentication system coming soon!</p>
        <a href="/" class="btn">Back to Home</a>
    </div>
</body>
</html>`))
	}).Methods("GET")

	// Profile page (placeholder)
	router.HandleFunc("/profile", func(w http.ResponseWriter, r *http.Request) {
		tmpl, err := template.ParseFiles("./templates/profile.html")
		if err != nil {
			http.Error(w, "Template error", http.StatusInternalServerError)
			return
		}
		
		data := map[string]interface{}{
			"title": "Profile - BikeNode",
			"user":  nil, // TODO: Get from session
		}
		
		if err := tmpl.Execute(w, data); err != nil {
			http.Error(w, "Template execution error", http.StatusInternalServerError)
			return
		}
	}).Methods("GET")

	return router
}
