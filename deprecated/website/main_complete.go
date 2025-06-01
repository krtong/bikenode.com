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
	bicycleRepo := repositories.NewBicycleRepository(db)
	discordRepo := repositories.NewDiscordRepository(db)
	collectionRepo := repositories.NewUserCollectionRepository(db)

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

	// Initialize handlers
	authHandler := handlers.NewCompleteAuthHandler(
		db, authService, sessionService, userRepo, discordRepo, collectionRepo,
	)

	// Setup routes
	router := setupCompleteRoutes(authHandler, bicycleRepo, collectionRepo)

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
		logger.Info("Starting BikeNode Complete Server", logger.Fields{
			"port":    port,
			"address": fmt.Sprintf("http://localhost:%s", port),
		})

		fmt.Printf("\n🚴‍♂️ BikeNode.com - Complete User Platform\n")
		fmt.Printf("🌐 Website: http://localhost:%s\n", port)
		fmt.Printf("🔐 Login: http://localhost:%s/login\n", port)
		fmt.Printf("📝 Register: http://localhost:%s/register\n", port)
		fmt.Printf("👤 Dashboard: http://localhost:%s/dashboard\n", port)
		fmt.Printf("🔍 Bike Search: http://localhost:%s/bikes\n", port)
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

func setupCompleteRoutes(
	authHandler *handlers.CompleteAuthHandler,
	bicycleRepo *repositories.BicycleRepository,
	collectionRepo *repositories.UserCollectionRepository,
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
			"version": "2.0.0",
			"service": "bikenode-complete-api",
			"features": ["auth", "discord", "collections", "profiles"]
		}`))
	}).Methods("GET")

	// Authentication routes
	authHandler.SetupAuthRoutes(api)

	// Bicycle search routes (existing)
	bicycles := api.PathPrefix("/bicycles").Subrouter()
	bicycles.HandleFunc("/search", func(w http.ResponseWriter, r *http.Request) {
		// Use the existing search implementation
		handleBicycleSearch(w, r, bicycleRepo)
	}).Methods("GET")

	bicycles.HandleFunc("/manufacturers", func(w http.ResponseWriter, r *http.Request) {
		handleManufacturers(w, r, bicycleRepo)
	}).Methods("GET")

	bicycles.HandleFunc("/years", func(w http.ResponseWriter, r *http.Request) {
		handleYears(w, r, bicycleRepo)
	}).Methods("GET")

	// User collection routes (protected)
	collections := api.PathPrefix("/collections").Subrouter()
	collections.Use(func(next http.Handler) http.Handler {
		return http.HandlerFunc(authHandler.AuthMiddleware(func(w http.ResponseWriter, r *http.Request) {
			next.ServeHTTP(w, r)
		}))
	})

	collections.HandleFunc("/bicycles", func(w http.ResponseWriter, r *http.Request) {
		handleAddBicycleToCollection(w, r, authHandler, collectionRepo)
	}).Methods("POST")

	collections.HandleFunc("/motorcycles", func(w http.ResponseWriter, r *http.Request) {
		// TODO: Implement motorcycle collections
		w.WriteHeader(http.StatusNotImplemented)
		w.Write([]byte(`{"error": "Motorcycle collections not yet implemented"}`))
	}).Methods("POST")

	collections.HandleFunc("", func(w http.ResponseWriter, r *http.Request) {
		handleGetUserCollection(w, r, authHandler, collectionRepo)
	}).Methods("GET")

	// Serve static files
	fileServer := http.FileServer(http.Dir("./static/"))
	router.PathPrefix("/static/").Handler(http.StripPrefix("/static/", fileServer))

	// Serve assets for marketing homepage
	assetsServer := http.FileServer(http.Dir("../../assets/"))
	router.PathPrefix("/assets/").Handler(http.StripPrefix("/assets/", assetsServer))

	// Web routes
	router.HandleFunc("/", serveHomepage).Methods("GET")
	router.HandleFunc("/login", serveLoginPage).Methods("GET")
	router.HandleFunc("/register", serveRegisterPage).Methods("GET")
	router.HandleFunc("/dashboard", serveDashboardPage).Methods("GET")
	router.HandleFunc("/profile", serveProfilePage).Methods("GET")
	router.HandleFunc("/bikes", serveBikeSearch).Methods("GET")

	return router
}

// Web page handlers
func serveHomepage(w http.ResponseWriter, r *http.Request) {
	http.ServeFile(w, r, "../../index.html")
}

func serveLoginPage(w http.ResponseWriter, r *http.Request) {
	tmpl := `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login - BikeNode</title>
    <link href="/static/css/style.css" rel="stylesheet">
    <style>
        .auth-container {
            max-width: 400px;
            margin: 2rem auto;
            padding: 2rem;
            background: white;
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }
        .auth-form input {
            width: 100%;
            padding: 0.75rem;
            margin: 0.5rem 0;
            border: 1px solid #ddd;
            border-radius: 6px;
        }
        .auth-form button {
            width: 100%;
            padding: 0.75rem;
            margin: 0.5rem 0;
            border: none;
            border-radius: 6px;
            cursor: pointer;
        }
        .btn-primary { background: #667eea; color: white; }
        .btn-discord { background: #5865f2; color: white; }
        .divider { text-align: center; margin: 1rem 0; color: #666; }
    </style>
</head>
<body>
    <div class="auth-container">
        <h1>Login to BikeNode</h1>
        
        <a href="/api/auth/discord" class="btn-discord" style="display: block; text-align: center; text-decoration: none;">
            🎮 Login with Discord
        </a>
        
        <div class="divider">OR</div>
        
        <form class="auth-form" onsubmit="handleEmailLogin(event)">
            <input type="email" name="email" placeholder="Email" required>
            <input type="password" name="password" placeholder="Password" required>
            <button type="submit" class="btn-primary">Login</button>
        </form>
        
        <p style="text-align: center; margin-top: 1rem;">
            Don't have an account? <a href="/register">Register here</a>
        </p>
    </div>

    <script>
        async function handleEmailLogin(event) {
            event.preventDefault();
            const form = event.target;
            const formData = new FormData(form);
            
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
                    alert('Login failed: ' + result.error);
                }
            } catch (error) {
                alert('Login failed: ' + error.message);
            }
        }
    </script>
</body>
</html>`

	w.Header().Set("Content-Type", "text/html")
	w.Write([]byte(tmpl))
}

func serveRegisterPage(w http.ResponseWriter, r *http.Request) {
	tmpl := `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Register - BikeNode</title>
    <link href="/static/css/style.css" rel="stylesheet">
    <style>
        .auth-container {
            max-width: 400px;
            margin: 2rem auto;
            padding: 2rem;
            background: white;
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }
        .auth-form input {
            width: 100%;
            padding: 0.75rem;
            margin: 0.5rem 0;
            border: 1px solid #ddd;
            border-radius: 6px;
        }
        .auth-form button {
            width: 100%;
            padding: 0.75rem;
            margin: 0.5rem 0;
            border: none;
            border-radius: 6px;
            cursor: pointer;
        }
        .btn-primary { background: #667eea; color: white; }
        .btn-discord { background: #5865f2; color: white; }
        .divider { text-align: center; margin: 1rem 0; color: #666; }
    </style>
</head>
<body>
    <div class="auth-container">
        <h1>Join BikeNode</h1>
        
        <a href="/api/auth/discord" class="btn-discord" style="display: block; text-align: center; text-decoration: none;">
            🎮 Sign up with Discord
        </a>
        
        <div class="divider">OR</div>
        
        <form class="auth-form" onsubmit="handleEmailRegister(event)">
            <input type="text" name="username" placeholder="Username" required minlength="3">
            <input type="email" name="email" placeholder="Email" required>
            <input type="password" name="password" placeholder="Password" required minlength="8">
            <input type="password" name="confirm_password" placeholder="Confirm Password" required>
            <button type="submit" class="btn-primary">Create Account</button>
        </form>
        
        <p style="text-align: center; margin-top: 1rem;">
            Already have an account? <a href="/login">Login here</a>
        </p>
    </div>

    <script>
        async function handleEmailRegister(event) {
            event.preventDefault();
            const form = event.target;
            const formData = new FormData(form);
            
            if (formData.get('password') !== formData.get('confirm_password')) {
                alert('Passwords do not match!');
                return;
            }
            
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
                    alert('Registration failed: ' + result.error);
                }
            } catch (error) {
                alert('Registration failed: ' + error.message);
            }
        }
    </script>
</body>
</html>`

	w.Header().Set("Content-Type", "text/html")
	w.Write([]byte(tmpl))
}

func serveDashboardPage(w http.ResponseWriter, r *http.Request) {
	// Simple dashboard for now - in production this would check authentication
	tmpl := `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard - BikeNode</title>
    <link href="/static/css/style.css" rel="stylesheet">
    <style>
        .dashboard {
            max-width: 1200px;
            margin: 2rem auto;
            padding: 0 1rem;
        }
        .profile-card, .stats-card {
            background: white;
            border-radius: 12px;
            padding: 1.5rem;
            margin: 1rem 0;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
            margin: 1rem 0;
        }
        .stat-item {
            text-align: center;
            padding: 1rem;
            background: #f8f9fa;
            border-radius: 8px;
        }
        .nav-links {
            display: flex;
            gap: 1rem;
            margin: 1rem 0;
        }
        .nav-links a {
            padding: 0.5rem 1rem;
            background: #667eea;
            color: white;
            text-decoration: none;
            border-radius: 6px;
        }
    </style>
</head>
<body>
    <div class="dashboard">
        <div class="nav-links">
            <a href="/bikes">🔍 Search Bikes</a>
            <a href="/profile">👤 Profile</a>
            <a href="#" onclick="logout()">🚪 Logout</a>
        </div>
        
        <div class="profile-card">
            <h1>Welcome to BikeNode!</h1>
            <div id="user-info">Loading user info...</div>
        </div>
        
        <div class="stats-card">
            <h2>Your Collection</h2>
            <div class="stats-grid" id="stats-grid">
                <div class="stat-item">
                    <h3 id="bicycle-count">0</h3>
                    <p>Bicycles</p>
                </div>
                <div class="stat-item">
                    <h3 id="motorcycle-count">0</h3>
                    <p>Motorcycles</p>
                </div>
                <div class="stat-item">
                    <h3 id="total-count">0</h3>
                    <p>Total Vehicles</p>
                </div>
            </div>
        </div>
        
        <div class="stats-card">
            <h2>Quick Actions</h2>
            <div class="nav-links">
                <a href="/bikes">Add New Bike</a>
                <a href="/profile">Manage Profile</a>
                <a href="#" onclick="loadCollection()">View Collection</a>
            </div>
        </div>
        
        <div class="stats-card" id="collection-preview" style="display: none;">
            <h2>Recent Additions</h2>
            <div id="collection-items"></div>
        </div>
    </div>

    <script>
        async function loadUserInfo() {
            try {
                const response = await fetch('/api/auth/me');
                if (response.ok) {
                    const user = await response.json();
                    document.getElementById('user-info').innerHTML = 
                        '<h2>' + user.username + '</h2>' +
                        '<p>Email: ' + (user.email || 'Not provided') + '</p>' +
                        '<p>Account Type: ' + (user.is_discord_user ? 'Discord' : 'Email') + '</p>' +
                        '<p>Discord Connected: ' + (user.discord_connected ? 'Yes' : 'No') + '</p>';
                    
                    if (user.stats) {
                        document.getElementById('bicycle-count').textContent = user.stats.bicycles || 0;
                        document.getElementById('motorcycle-count').textContent = user.stats.motorcycles || 0;
                        document.getElementById('total-count').textContent = user.stats.total || 0;
                    }
                } else {
                    document.getElementById('user-info').innerHTML = '<p><a href="/login">Please login</a></p>';
                }
            } catch (error) {
                document.getElementById('user-info').innerHTML = '<p>Error loading user info</p>';
            }
        }

        async function loadCollection() {
            try {
                const response = await fetch('/api/collections');
                if (response.ok) {
                    const collection = await response.json();
                    const preview = document.getElementById('collection-preview');
                    const items = document.getElementById('collection-items');
                    
                    if (collection.length > 0) {
                        items.innerHTML = collection.slice(0, 3).map(item => 
                            '<div style="border: 1px solid #ddd; padding: 1rem; margin: 0.5rem 0; border-radius: 6px;">' +
                            '<h4>' + (item.custom_name || item.bicycle?.name || item.motorcycle?.name || 'Unknown') + '</h4>' +
                            '<p>' + (item.bicycle ? 'Bicycle' : 'Motorcycle') + ' • Added: ' + new Date(item.added_at).toLocaleDateString() + '</p>' +
                            '</div>'
                        ).join('');
                        preview.style.display = 'block';
                    } else {
                        items.innerHTML = '<p>No vehicles in your collection yet. <a href="/bikes">Add some bikes!</a></p>';
                        preview.style.display = 'block';
                    }
                }
            } catch (error) {
                console.error('Error loading collection:', error);
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
        loadUserInfo();
    </script>
</body>
</html>`

	w.Header().Set("Content-Type", "text/html")
	w.Write([]byte(tmpl))
}

func serveProfilePage(w http.ResponseWriter, r *http.Request) {
	// Simple profile page
	w.Header().Set("Content-Type", "text/html")
	w.Write([]byte(`<!DOCTYPE html>
<html>
<head><title>Profile - BikeNode</title></head>
<body>
<h1>User Profile</h1>
<p>Profile page coming soon! For now, check out your <a href="/dashboard">dashboard</a>.</p>
</body>
</html>`))
}

func serveBikeSearch(w http.ResponseWriter, r *http.Request) {
	// Use existing bike search template logic
	tmpl, err := template.ParseFiles("templates/bike_search.html")
	if err != nil {
		w.Header().Set("Content-Type", "text/html")
		w.Write([]byte(`<!DOCTYPE html>
<html>
<head><title>Bike Search - BikeNode</title></head>
<body>
<h1>Bike Search</h1>
<p>Bike search template not found. Using simple fallback.</p>
<div id="search-results"></div>
<script>
// Simple search implementation
fetch('/api/bicycles/search')
  .then(response => response.json())
  .then(data => {
    const results = document.getElementById('search-results');
    results.innerHTML = '<h2>Available Bikes:</h2>' + 
      data.bicycles.map(bike => 
        '<div style="border: 1px solid #ddd; padding: 1rem; margin: 0.5rem;">' +
        '<h3>' + bike.name + '</h3>' +
        '<p>Manufacturer: ' + bike.manufacturer + '</p>' +
        '<p>Year: ' + (bike.year || 'Unknown') + '</p>' +
        '<p>Price: ' + (bike.price || 'N/A') + '</p>' +
        '</div>'
      ).join('');
  });
</script>
</body>
</html>`))
		return
	}

	data := map[string]interface{}{
		"title":        "Bike Search - BikeNode",
		"current_year": time.Now().Year(),
	}

	w.Header().Set("Content-Type", "text/html")
	if err := tmpl.Execute(w, data); err != nil {
		http.Error(w, fmt.Sprintf("Template execution error: %v", err), http.StatusInternalServerError)
	}
}

// API handlers (reusing existing logic)
func handleBicycleSearch(w http.ResponseWriter, r *http.Request, bicycleRepo *repositories.BicycleRepository) {
	// ... (reuse existing search logic)
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(`{"bicycles": [], "total": 0, "message": "Search implementation needed"}`))
}

func handleManufacturers(w http.ResponseWriter, r *http.Request, bicycleRepo *repositories.BicycleRepository) {
	// ... (reuse existing logic)
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(`{"manufacturers": []}`))
}

func handleYears(w http.ResponseWriter, r *http.Request, bicycleRepo *repositories.BicycleRepository) {
	// ... (reuse existing logic)
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(`{"years": []}`))
}

func handleAddBicycleToCollection(w http.ResponseWriter, r *http.Request, authHandler *handlers.CompleteAuthHandler, collectionRepo *repositories.UserCollectionRepository) {
	// TODO: Implement
	w.WriteHeader(http.StatusNotImplemented)
	w.Write([]byte(`{"error": "Add to collection not yet implemented"}`))
}

func handleGetUserCollection(w http.ResponseWriter, r *http.Request, authHandler *handlers.CompleteAuthHandler, collectionRepo *repositories.UserCollectionRepository) {
	// TODO: Implement
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(`[]`))
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
