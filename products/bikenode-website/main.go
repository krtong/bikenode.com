package main

import (
	"flag"
	"log"
	"net/http"
	"os"

	"github.com/gin-contrib/sessions"
	"github.com/gin-contrib/sessions/cookie"
	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
	"github.com/joho/godotenv"
	_ "github.com/lib/pq"

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
		log.Println("No .env file found")
	}

	// Database connection
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgres://postgres:postgres@localhost:5432/bikenode?sslmode=disable"
	}

	db, err := sqlx.Connect("postgres", dbURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	// Seed database if flag is set
	if *seedDB {
		log.Println("Seeding database with motorcycle data...")
		if err := utils.SeedMotorcycleData(db, "data/bikedata/motorcycle_data_with_packages.csv"); err != nil {
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
	authService := services.NewAuthService(userRepo)
	profileService := services.NewProfileService(userRepo, motorcycleRepo, ownershipRepo, timelineRepo, serverRepo)
	serverService := services.NewServerService(serverRepo, userRepo)

	// Initialize handlers
	authHandler := handlers.NewAuthHandler(authService)
	profileHandler := handlers.NewProfileHandler(profileService)
	serverHandler := handlers.NewServerHandler(serverService)
	apiHandler := handlers.NewAPIHandler(motorcycleRepo, ownershipRepo, timelineRepo)

	// Set up Gin
	r := gin.Default()

	// Configure session middleware
	store := cookie.NewStore([]byte(os.Getenv("SESSION_SECRET")))
	r.Use(sessions.Sessions("bikenode_session", store))

	// Load templates
	r.LoadHTMLGlob("templates/*")

	// Static files
	r.Static("/static", "./static")

	// Routes
	r.GET("/", func(c *gin.Context) {
		c.HTML(http.StatusOK, "index.html", gin.H{
			"title": "BikeNode - Connect Your Motorcycle Journey",
		})
	})

	// Auth routes
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
		authorized.POST("/profile/timeline/add", profileHandler.AddTimelineEvent)

		// Server config routes
		authorized.GET("/servers/:id/config", serverHandler.GetServerConfig)
		authorized.POST("/servers/:id/config", serverHandler.UpdateServerConfig)
	}

	// API routes
	api := r.Group("/api")
	api.GET("/motorcycles", apiHandler.SearchMotorcycles)

	authorized.Group("/api")
	{
		authorized.POST("/ownerships", apiHandler.AddOwnership)
		authorized.DELETE("/ownerships/:id", apiHandler.RemoveOwnership)
		authorized.POST("/timeline", apiHandler.AddTimelineEvent)
		authorized.DELETE("/timeline/:id", apiHandler.DeleteTimelineEvent)
		authorized.PUT("/servers/:id/share", apiHandler.ToggleServerShare)
	}

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server starting on port %s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
