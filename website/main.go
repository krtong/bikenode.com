package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
	"github.com/rs/cors"
)

// Motorcycle represents a motorcycle model
type Motorcycle struct {
	ID       uuid.UUID `json:"id"`
	Year     int       `json:"year"`
	Make     string    `json:"make"`
	Model    string    `json:"model"`
	Package  *string   `json:"package,omitempty"`
	Category *string   `json:"category,omitempty"`
	Engine   *string   `json:"engine,omitempty"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// Database connection
var db *sql.DB

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found")
	}

	// Initialize database connection
	if err := initDB(); err != nil {
		log.Fatal("Failed to initialize database:", err)
	}
	defer db.Close()

	// Initialize router
	router := mux.NewRouter()

	// API routes
	api := router.PathPrefix("/api").Subrouter()
	api.HandleFunc("/motorcycles/models/{make}/{year}", getMotorcycleModels).Methods("GET")
	api.HandleFunc("/motorcycles/makes", getMotorcycleMakes).Methods("GET")
	api.HandleFunc("/motorcycles/years/{make}", getMotorcycleYears).Methods("GET")
	api.HandleFunc("/bicycles/manufacturers", getBicycleManufacturers).Methods("GET")
	api.HandleFunc("/bicycles/years/{manufacturer}", getBicycleYears).Methods("GET")
	api.HandleFunc("/bicycles/models/{manufacturer}/{year}", getBicycleModels).Methods("GET")
	api.HandleFunc("/health", healthCheck).Methods("GET")

	// Serve static files
	router.PathPrefix("/").Handler(http.FileServer(http.Dir("./")))

	// Configure CORS
	c := cors.New(cors.Options{
		AllowedOrigins: []string{"*"},
		AllowedMethods: []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders: []string{"*"},
	})

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server starting on port %s", port)
	if err := http.ListenAndServe(":"+port, c.Handler(router)); err != nil {
		log.Fatal("Server failed to start:", err)
	}
}

func initDB() error {
	dbHost := os.Getenv("DB_HOST")
	if dbHost == "" {
		dbHost = "localhost"
	}

	dbPort := os.Getenv("DB_PORT")
	if dbPort == "" {
		dbPort = "5432"
	}

	dbUser := os.Getenv("DB_USER")
	if dbUser == "" {
		dbUser = "postgres"
	}

	dbPassword := os.Getenv("DB_PASSWORD")
	if dbPassword == "" {
		dbPassword = "postgres"
	}

	dbName := os.Getenv("DB_NAME")
	if dbName == "" {
		dbName = "bikenode"
	}

	connStr := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		dbHost, dbPort, dbUser, dbPassword, dbName)

	var err error
	db, err = sql.Open("postgres", connStr)
	if err != nil {
		return err
	}

	// Test the connection
	if err := db.Ping(); err != nil {
		return err
	}

	log.Println("Database connection established")
	return nil
}

func healthCheck(w http.ResponseWriter, r *http.Request) {
	var motorcycleCount int
	err := db.QueryRow("SELECT COUNT(*) FROM motorcycles").Scan(&motorcycleCount)
	if err != nil {
		log.Printf("Error counting motorcycles: %v", err)
	}

	var bicycleCount int
	err = db.QueryRow("SELECT COUNT(*) FROM bikes_catalog").Scan(&bicycleCount)
	if err != nil {
		log.Printf("Error counting bicycles: %v", err)
	}

	response := map[string]interface{}{
		"status": "healthy",
		"motorcycles": motorcycleCount,
		"bicycles": bicycleCount,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func getMotorcycleModels(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	make := vars["make"]
	year := vars["year"]

	query := `
		SELECT id, year, make, model, package, category, engine, created_at, updated_at
		FROM motorcycles
		WHERE LOWER(make) = LOWER($1) AND year = $2
		ORDER BY model
	`

	rows, err := db.Query(query, make, year)
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		log.Printf("Error querying motorcycles: %v", err)
		return
	}
	defer rows.Close()

	var motorcycles []Motorcycle
	for rows.Next() {
		var m Motorcycle
		err := rows.Scan(&m.ID, &m.Year, &m.Make, &m.Model, &m.Package, &m.Category, &m.Engine, &m.CreatedAt, &m.UpdatedAt)
		if err != nil {
			log.Printf("Error scanning row: %v", err)
			continue
		}
		motorcycles = append(motorcycles, m)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(motorcycles)
}

func getMotorcycleMakes(w http.ResponseWriter, r *http.Request) {
	query := `
		SELECT DISTINCT make
		FROM motorcycles
		ORDER BY make
	`

	rows, err := db.Query(query)
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		log.Printf("Error querying makes: %v", err)
		return
	}
	defer rows.Close()

	var makes []string
	for rows.Next() {
		var make string
		err := rows.Scan(&make)
		if err != nil {
			log.Printf("Error scanning row: %v", err)
			continue
		}
		makes = append(makes, make)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(makes)
}

func getMotorcycleYears(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	make := vars["make"]

	query := `
		SELECT DISTINCT year
		FROM motorcycles
		WHERE LOWER(make) = LOWER($1)
		ORDER BY year DESC
	`

	rows, err := db.Query(query, make)
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		log.Printf("Error querying years: %v", err)
		return
	}
	defer rows.Close()

	var years []int
	for rows.Next() {
		var year int
		err := rows.Scan(&year)
		if err != nil {
			log.Printf("Error scanning row: %v", err)
			continue
		}
		years = append(years, year)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(years)
}

// Bicycle handlers
func getBicycleManufacturers(w http.ResponseWriter, r *http.Request) {
	query := `
		SELECT DISTINCT make 
		FROM bikes_catalog 
		ORDER BY make
	`

	rows, err := db.Query(query)
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		log.Printf("Error querying manufacturers: %v", err)
		return
	}
	defer rows.Close()

	var manufacturers []string
	for rows.Next() {
		var manufacturer string
		err := rows.Scan(&manufacturer)
		if err != nil {
			log.Printf("Error scanning row: %v", err)
			continue
		}
		manufacturers = append(manufacturers, manufacturer)
	}

	response := map[string][]string{
		"manufacturers": manufacturers,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func getBicycleYears(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	manufacturer := vars["manufacturer"]

	query := `
		SELECT DISTINCT year 
		FROM bikes_catalog 
		WHERE LOWER(make) = LOWER($1)
		ORDER BY year DESC
	`

	rows, err := db.Query(query, manufacturer)
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		log.Printf("Error querying years: %v", err)
		return
	}
	defer rows.Close()

	var years []int
	for rows.Next() {
		var year int
		err := rows.Scan(&year)
		if err != nil {
			log.Printf("Error scanning row: %v", err)
			continue
		}
		years = append(years, year)
	}

	response := map[string][]int{
		"years": years,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func getBicycleModels(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	manufacturer := vars["manufacturer"]
	year := vars["year"]

	query := `
		SELECT DISTINCT model, variant
		FROM bikes_catalog 
		WHERE LOWER(make) = LOWER($1) AND year = $2
		ORDER BY model, variant
	`

	rows, err := db.Query(query, manufacturer, year)
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		log.Printf("Error querying models: %v", err)
		return
	}
	defer rows.Close()

	var models []string
	modelSet := make(map[string]bool)
	
	for rows.Next() {
		var model string
		var variant sql.NullString
		err := rows.Scan(&model, &variant)
		if err != nil {
			log.Printf("Error scanning row: %v", err)
			continue
		}
		
		// For bicycles, we'll combine model and variant
		fullModel := model
		if variant.Valid && variant.String != "" {
			fullModel = fmt.Sprintf("%s %s", model, variant.String)
		}
		
		if !modelSet[fullModel] {
			modelSet[fullModel] = true
			models = append(models, fullModel)
		}
	}

	response := map[string][]string{
		"models": models,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}