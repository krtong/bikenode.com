package main

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"

	"github.com/gorilla/mux"
	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
)

// Database connection
var db *sql.DB

// Bike represents a bicycle from the database
type Bike struct {
	VariantID    string  `json:"variant_id"`
	Name         string  `json:"name"`
	Manufacturer string  `json:"manufacturer"`
	Year         *int    `json:"year"`
	BikeType     string  `json:"bike_type"`
	IsElectric   bool    `json:"is_electric"`
	WheelSize    *string `json:"wheel_size"`
	Suspension   *string `json:"suspension"`
}

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	// Connect to database
	var err error
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgres://localhost/bikenode?sslmode=disable"
	}
	
	db, err = sql.Open("postgres", dbURL)
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	defer db.Close()

	// Test connection
	if err := db.Ping(); err != nil {
		log.Fatal("Failed to ping database:", err)
	}

	// Setup routes
	router := mux.NewRouter()

	// CORS middleware
	router.Use(corsMiddleware)

	// API routes
	api := router.PathPrefix("/api").Subrouter()

	// Health check
	api.HandleFunc("/health", healthHandler).Methods("GET")
	
	// Bicycle routes
	bicycles := api.PathPrefix("/bicycles").Subrouter()
	bicycles.HandleFunc("/manufacturers", getManufacturersHandler).Methods("GET")
	bicycles.HandleFunc("/years", getYearsHandler).Methods("GET")
	bicycles.HandleFunc("/years/{manufacturer}", getYearsByManufacturerHandler).Methods("GET")
	bicycles.HandleFunc("/models/{manufacturer}/{year}", getModelsByManufacturerYearHandler).Methods("GET")
	bicycles.HandleFunc("/variants/{manufacturer}/{year}/{model}", getVariantsByModelHandler).Methods("GET")
	bicycles.HandleFunc("/search", searchBicyclesHandler).Methods("GET")

	// Get port
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("🚴‍♂️ BikeNode API Server starting on port %s", port)
	log.Printf("🌐 Available at: http://localhost:%s", port)
	log.Printf("🏥 Health check: http://localhost:%s/api/health", port)
	log.Printf("🔍 Manufacturers: http://localhost:%s/api/bicycles/manufacturers", port)

	if err := http.ListenAndServe(":"+port, router); err != nil {
		log.Fatal("Server failed to start:", err)
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

func healthHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":  "healthy",
		"version": "1.0.0",
		"service": "bikenode-api",
	})
}

func getManufacturersHandler(w http.ResponseWriter, r *http.Request) {
	query := `
		SELECT DISTINCT manufacturer 
		FROM bicycles 
		WHERE manufacturer IS NOT NULL AND manufacturer != '' 
		ORDER BY manufacturer`
	
	rows, err := db.Query(query)
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		log.Printf("Error getting manufacturers: %v", err)
		return
	}
	defer rows.Close()

	var manufacturers []string
	for rows.Next() {
		var manufacturer string
		if err := rows.Scan(&manufacturer); err != nil {
			continue
		}
		manufacturers = append(manufacturers, manufacturer)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"manufacturers": manufacturers,
		"count":         len(manufacturers),
	})
}

func getYearsHandler(w http.ResponseWriter, r *http.Request) {
	query := `
		SELECT DISTINCT year 
		FROM bicycles 
		WHERE year IS NOT NULL 
		ORDER BY year DESC`
	
	rows, err := db.Query(query)
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		log.Printf("Error getting years: %v", err)
		return
	}
	defer rows.Close()

	var years []int
	for rows.Next() {
		var year int
		if err := rows.Scan(&year); err != nil {
			continue
		}
		years = append(years, year)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"years": years,
		"count": len(years),
	})
}

func getYearsByManufacturerHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	manufacturer := vars["manufacturer"]

	query := `
		SELECT DISTINCT year 
		FROM bicycles 
		WHERE manufacturer = $1 AND year IS NOT NULL 
		ORDER BY year DESC`
	
	rows, err := db.Query(query, manufacturer)
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		log.Printf("Error getting years for manufacturer: %v", err)
		return
	}
	defer rows.Close()

	var years []int
	for rows.Next() {
		var year int
		if err := rows.Scan(&year); err != nil {
			continue
		}
		years = append(years, year)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"manufacturer": manufacturer,
		"years":        years,
		"count":        len(years),
	})
}

func getModelsByManufacturerYearHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	manufacturer := vars["manufacturer"]
	yearStr := vars["year"]
	
	year, err := strconv.Atoi(yearStr)
	if err != nil {
		http.Error(w, "Invalid year", http.StatusBadRequest)
		return
	}

	query := `
		SELECT DISTINCT name 
		FROM bicycles 
		WHERE manufacturer = $1 AND year = $2 
		ORDER BY name`
	
	rows, err := db.Query(query, manufacturer, year)
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		log.Printf("Error getting models: %v", err)
		return
	}
	defer rows.Close()

	var models []string
	for rows.Next() {
		var model string
		if err := rows.Scan(&model); err != nil {
			continue
		}
		models = append(models, model)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"manufacturer": manufacturer,
		"year":         year,
		"models":       models,
		"count":        len(models),
	})
}

func getVariantsByModelHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	manufacturer := vars["manufacturer"]
	yearStr := vars["year"]
	model := vars["model"]
	
	year, err := strconv.Atoi(yearStr)
	if err != nil {
		http.Error(w, "Invalid year", http.StatusBadRequest)
		return
	}

	query := `
		SELECT variant_id, name, manufacturer, year, bike_type, is_electric, wheel_size, suspension
		FROM bicycles 
		WHERE manufacturer = $1 AND year = $2 AND name = $3
		ORDER BY variant_id`
	
	rows, err := db.Query(query, manufacturer, year, model)
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		log.Printf("Error getting variants: %v", err)
		return
	}
	defer rows.Close()

	var variants []Bike
	for rows.Next() {
		var bike Bike
		if err := rows.Scan(&bike.VariantID, &bike.Name, &bike.Manufacturer, &bike.Year, 
			&bike.BikeType, &bike.IsElectric, &bike.WheelSize, &bike.Suspension); err != nil {
			continue
		}
		variants = append(variants, bike)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"manufacturer": manufacturer,
		"year":         year,
		"model":        model,
		"variants":     variants,
		"count":        len(variants),
	})
}

func searchBicyclesHandler(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query().Get("q")
	limitStr := r.URL.Query().Get("limit")
	
	limit := 20
	if limitStr != "" {
		if parsedLimit, err := strconv.Atoi(limitStr); err == nil && parsedLimit > 0 {
			limit = parsedLimit
		}
	}

	var sqlQuery string
	var args []interface{}
	
	if query == "" {
		sqlQuery = `
			SELECT variant_id, name, manufacturer, year, bike_type, is_electric, wheel_size, suspension
			FROM bicycles 
			ORDER BY manufacturer, year DESC, name 
			LIMIT $1`
		args = []interface{}{limit}
	} else {
		sqlQuery = `
			SELECT variant_id, name, manufacturer, year, bike_type, is_electric, wheel_size, suspension
			FROM bicycles 
			WHERE LOWER(name) LIKE LOWER($1) OR LOWER(manufacturer) LIKE LOWER($1)
			ORDER BY manufacturer, year DESC, name 
			LIMIT $2`
		args = []interface{}{"%" + strings.ToLower(query) + "%", limit}
	}
	
	rows, err := db.Query(sqlQuery, args...)
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		log.Printf("Error searching bicycles: %v", err)
		return
	}
	defer rows.Close()

	var bikes []Bike
	for rows.Next() {
		var bike Bike
		if err := rows.Scan(&bike.VariantID, &bike.Name, &bike.Manufacturer, &bike.Year, 
			&bike.BikeType, &bike.IsElectric, &bike.WheelSize, &bike.Suspension); err != nil {
			continue
		}
		bikes = append(bikes, bike)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"query":   query,
		"bikes":   bikes,
		"count":   len(bikes),
		"success": true,
	})
}