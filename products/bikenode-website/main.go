package main

import (
	"flag"
	"log"
	"net/http"
	"os"
	"path/filepath"

	"github.com/gin-contrib/sessions"
	"github.com/gin-contrib/sessions/cookie"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"

	"bikenode-website/database"
	"bikenode-website/handlers"
	"bikenode-website/repositories"
	"bikenode-website/services"
	"bikenode-website/utils"
)

func main() {
	// Parse command line flags
	seedDB := flag.Bool("seed", false, "Seed the database with motorcycle data")
	flag.Parse()

	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	// Setup database connection
	db, err := database.GetConnection()
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	// Initialize database schema
	if err := database.InitSchema(db); err != nil {
		log.Fatalf("Failed to initialize database schema: %v", err)
	}

	// If seed flag is set, seed the database and exit
	if *seedDB {
		log.Println("Seeding database with motorcycle data...")
		dataFile := filepath.Join("data", "bikedata", "motorcycle_data_with_packages.csv")
		if err := utils.SeedMotorcycleData(db, dataFile); err != nil {
			log.Fatalf("Failed to seed database: %v", err)
		}
		log.Println("Database seeded successfully")
		return
	}

	// Initialize repositories
	userRepo := repositories.NewUserRepository(db)
	motorcycleRepo := repositories.NewMotorcycleRepository(db)
	ownershipRepo := repositories.NewOwnershipRepository(db)
	timelineRepo := repositories.NewTimelineEventRepository(db)
	serverRepo := repositories.NewServerRepository(db)

	// Initialize services
	authService := services.NewAuthService(userRepo, os.Getenv("DISCORD_CLIENT_ID"), os.Getenv("DISCORD_CLIENT_SECRET"), os.Getenv("DISCORD_REDIRECT_URI"))
	profileService := services.NewProfileService(userRepo, motorcycleRepo, ownershipRepo, timelineRepo, serverRepo)
	serverService := services.NewServerService(serverRepo, userRepo)
	timelineService := services.NewTimelineService(timelineRepo, ownershipRepo, serverRepo)

	// Initialize handlers
	authHandler := handlers.NewAuthHandler(authService)
	profileHandler := handlers.NewProfileHandler(profileService)
	serverHandler := handlers.NewServerHandler(serverService)
	apiHandler := handlers.NewAPIHandler(profileService)

	// Setup Gin
	r := gin.Default()

	// Configure session middleware
	sessionSecret := os.Getenv("SESSION_SECRET")
	if sessionSecret == "" {
		sessionSecret = "bikenode-secret-key"
		log.Println("Warning: Using default session secret. Set SESSION_SECRET in .env for production.")
	}
	store := cookie.NewStore([]byte(sessionSecret))
	store.Options(sessions.Options{
		Path:     "/",
		MaxAge:   86400 * 7, // 7 days
		HttpOnly: true,
		Secure:   os.Getenv("GIN_MODE") == "release",
	})
	r.Use(sessions.Sessions("bikenode_session", store))

	// Setup templates and static files
	r.LoadHTMLGlob("templates/*")
	r.Static("/static", "./static")
	r.Static("/uploads", "./static/uploads")

	// Create uploads directory if it doesn't exist
	uploadsDir := "./static/uploads"
	if err := os.MkdirAll(uploadsDir, 0755); err != nil {
		log.Fatalf("Fatal error: Failed to create uploads directory: %v", err)
		// Program will exit here due to log.Fatalf
	}

	// Setup routes
	// Public routes
	r.GET("/", func(c *gin.Context) {
		c.HTML(http.StatusOK, "index.html", gin.H{
	})
	r.GET("/login", authHandler.Login)
	r.GET("/callback", authHandler.Callback)
	r.GET("/logout", authHandler.Logout)

	// Protected routes
	authorized := r.Group("/")
	authorized.Use(authHandler.AuthRequired())
	{
		// Profile routes
		authorized.GET("/profile", profileHandler.GetProfile)
		authorized.POST("/profile/bikes/add", profileHandler.AddBike)
		authorized.POST("/profile/bikes/:id/remove", profileHandler.RemoveBike)
		authorized.POST("/profile/bikes/:id/timeline", profileHandler.AddTimelineEvent)
		authorized.DELETE("/profile/timeline/:id", profileHandler.RemoveTimelineEvent)
		authorized.PUT("/profile/servers/:id/visibility", profileHandler.ToggleServerVisibility)

		// Server routes
		authorized.GET("/servers/:id/config", serverHandler.GetServerConfig)
		authorized.POST("/servers/:id/config", serverHandler.UpdateServerConfig)

		// API routes
		api := authorized.Group("/api")
		{
			api.GET("/motorcycles", apiHandler.SearchMotorcycles)
			api.GET("/motorcycles/makes", apiHandler.GetMakes)
			api.GET("/motorcycles/makes/:make/models", apiHandler.GetModelsByMake)
			api.GET("/motorcycles/makes/:make/models/:model/years", apiHandler.GetYearsByMakeAndModel)
			api.GET("/motorcycles/categories", apiHandler.GetCategories)

			api.GET("/user/servers", apiHandler.GetUserServers)
			api.GET("/user/motorcycles", apiHandler.GetUserMotorcycles)

			api.POST("/timeline", apiHandler.AddTimelineEvent)
			api.PUT("/timeline/:id", apiHandler.UpdateTimelineEvent)
			api.DELETE("/timeline/:id", apiHandler.DeleteTimelineEvent)
		}
	}

	// Start the server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server starting on http://localhost:%s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
