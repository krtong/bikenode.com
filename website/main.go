package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"bikenode.com/api"
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

func listSpecsSubmissions(w http.ResponseWriter, r *http.Request) {
	// Read the log file
	logFile := "specs_submissions.log"
	content, err := os.ReadFile(logFile)
	
	if err != nil {
		if os.IsNotExist(err) {
			// File doesn't exist yet
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]interface{}{
				"submissions": []interface{}{},
			})
			return
		}
		http.Error(w, "Failed to read submissions", http.StatusInternalServerError)
		return
	}
	
	// Parse the log file content
	// This is a simple parser - in production you might want to use a more robust format
	lines := strings.Split(string(content), "\n---\n")
	var submissions []map[string]interface{}
	
	for _, entry := range lines {
		if strings.TrimSpace(entry) == "" {
			continue
		}
		
		// Basic parsing - extract key information
		submission := make(map[string]interface{})
		lines := strings.Split(entry, "\n")
		
		for _, line := range lines {
			if strings.Contains(line, "URL:") {
				submission["url"] = strings.TrimSpace(strings.TrimPrefix(line, "URL:"))
			} else if strings.Contains(line, "Vehicle:") {
				parts := strings.Fields(strings.TrimPrefix(line, "Vehicle:"))
				if len(parts) >= 5 {
					submission["vehicle"] = map[string]string{
						"category": parts[0],
						"brand":    parts[1],
						"year":     parts[2],
						"model":    parts[3],
						"variant":  strings.Join(parts[4:], " "),
					}
				}
			} else if strings.Contains(line, "Notes:") {
				submission["notes"] = strings.TrimSpace(strings.TrimPrefix(line, "Notes:"))
			} else if strings.Contains(line, "User-Agent:") {
				submission["userAgent"] = strings.TrimSpace(strings.TrimPrefix(line, "User-Agent:"))
			} else if strings.HasPrefix(line, "[") && strings.Contains(line, "]") {
				// Extract timestamp
				end := strings.Index(line, "]")
				if end > 0 {
					if vehicleMap, ok := submission["vehicle"].(map[string]string); ok {
						vehicleMap["timestamp"] = line[1:end]
					}
				}
			}
		}
		
		if len(submission) > 0 {
			submissions = append(submissions, submission)
		}
	}
	
	// Reverse to show newest first
	for i, j := 0, len(submissions)-1; i < j; i, j = i+1, j-1 {
		submissions[i], submissions[j] = submissions[j], submissions[i]
	}
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"submissions": submissions,
	})
}

func handleSpecsSubmission(w http.ResponseWriter, r *http.Request) {
	// Parse JSON body
	var submission struct {
		URL     string `json:"url"`
		Notes   string `json:"notes"`
		Vehicle struct {
			Category  string `json:"category"`
			Brand     string `json:"brand"`
			Year      string `json:"year"`
			Model     string `json:"model"`
			Variant   string `json:"variant"`
			Timestamp string `json:"timestamp"`
		} `json:"vehicle"`
		UserAgent string `json:"userAgent"`
	}

	if err := json.NewDecoder(r.Body).Decode(&submission); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Create log entry
	logEntry := fmt.Sprintf(
		"[%s] Specs Submission:\n"+
			"URL: %s\n"+
			"Vehicle: %s %s %s %s %s\n"+
			"Notes: %s\n"+
			"User-Agent: %s\n"+
			"---\n",
		submission.Vehicle.Timestamp,
		submission.URL,
		submission.Vehicle.Category,
		submission.Vehicle.Brand,
		submission.Vehicle.Year,
		submission.Vehicle.Model,
		submission.Vehicle.Variant,
		submission.Notes,
		submission.UserAgent,
	)

	// Write to log file
	logFile := "specs_submissions.log"
	f, err := os.OpenFile(logFile, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		log.Printf("Error opening log file: %v", err)
		http.Error(w, "Failed to log submission", http.StatusInternalServerError)
		return
	}
	defer f.Close()

	if _, err := f.WriteString(logEntry); err != nil {
		log.Printf("Error writing to log file: %v", err)
		http.Error(w, "Failed to log submission", http.StatusInternalServerError)
		return
	}

	// Log to console as well
	log.Printf("New specs submission for %s %s %s from %s",
		submission.Vehicle.Brand,
		submission.Vehicle.Year,
		submission.Vehicle.Model,
		submission.URL)

	// Send success response
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"status": "success",
		"message": "Specs submission received",
	})
}

func main() {
	// Load environment variables from root directory
	if err := godotenv.Load("../.env"); err != nil {
		log.Println("No .env file found in root directory")
	}

	// Initialize database connection
	if err := initDB(); err != nil {
		log.Fatal("Failed to initialize database:", err)
	}
	defer db.Close()


	// Initialize router
	router := mux.NewRouter()

	// API routes
	apiRouter := router.PathPrefix("/api").Subrouter()
	
	// Existing routes
	apiRouter.HandleFunc("/motorcycles/models/{make}/{year}", getMotorcycleModels).Methods("GET")
	apiRouter.HandleFunc("/motorcycles/makes", getMotorcycleMakes).Methods("GET")
	apiRouter.HandleFunc("/motorcycles/years/{make}", getMotorcycleYears).Methods("GET")
	apiRouter.HandleFunc("/motorcycles/{id}/specs", getMotorcycleSpecs).Methods("GET")
	apiRouter.HandleFunc("/bicycles/manufacturers", getBicycleManufacturers).Methods("GET")
	apiRouter.HandleFunc("/bicycles/years/{manufacturer}", getBicycleYears).Methods("GET")
	apiRouter.HandleFunc("/bicycles/models/{manufacturer}/{year}", getBicycleModels).Methods("GET")
	apiRouter.HandleFunc("/bicycles/variants/{manufacturer}/{year}/{family}", getBicycleVariants).Methods("GET")
	apiRouter.HandleFunc("/bicycles/specs/{manufacturer}/{year}/{model}", getBicycleSpecs).Methods("GET")
	
	// Electrified bike routes
	apiRouter.HandleFunc("/electrified/brands", getElectrifiedBrands).Methods("GET")
	apiRouter.HandleFunc("/electrified/years/{brand}", getElectrifiedYears).Methods("GET")
	apiRouter.HandleFunc("/electrified/models/{brand}/{year}", getElectrifiedModels).Methods("GET")
	apiRouter.HandleFunc("/electrified/variants/{brand}/{year}/{model}", getElectrifiedVariants).Methods("GET")
	apiRouter.HandleFunc("/electrified/specs/{brand}/{year}/{model}", getElectrifiedSpecs).Methods("GET")
	
	apiRouter.HandleFunc("/health", healthCheck).Methods("GET")
	apiRouter.HandleFunc("/specs-submissions", handleSpecsSubmission).Methods("POST")
	apiRouter.HandleFunc("/specs-submissions/list", listSpecsSubmissions).Methods("GET")
	
	// Route planning endpoints
	apiRouter.HandleFunc("/routes", api.CreateRoute(db)).Methods("POST")
	apiRouter.HandleFunc("/routes/{id}", api.GetRoute(db)).Methods("GET")
	apiRouter.HandleFunc("/routes/nearby", api.GetNearbyRoutes(db)).Methods("GET")
	apiRouter.HandleFunc("/routes/calculate", api.CalculateRoute(db)).Methods("POST")
	
	// Segment endpoints
	apiRouter.HandleFunc("/segments", api.CreateSegment(db)).Methods("POST")
	apiRouter.HandleFunc("/segments/{id}", api.GetSegment(db)).Methods("GET")
	apiRouter.HandleFunc("/segments/nearby", api.GetNearbySegments(db)).Methods("GET")
	apiRouter.HandleFunc("/segments/{id}/leaderboard", api.GetSegmentLeaderboard(db)).Methods("GET")
	apiRouter.HandleFunc("/segments/attempt", api.RecordSegmentAttempt(db)).Methods("POST")
	apiRouter.HandleFunc("/segments/user", api.GetUserSegments(db)).Methods("GET")
	
	// Heatmap endpoints
	apiRouter.HandleFunc("/heatmap", api.GetHeatmapData(db)).Methods("GET")
	apiRouter.HandleFunc("/heatmap/popular-routes", api.GetPopularRoutes(db)).Methods("GET")
	apiRouter.HandleFunc("/heatmap/track", api.RecordActivityTrack(db)).Methods("POST")
	apiRouter.HandleFunc("/heatmap/surface-types", api.GetSurfaceTypes(db)).Methods("POST")
	
	// Elevation endpoints
	apiRouter.HandleFunc("/elevation/profile", api.GetElevationProfile(db)).Methods("POST")
	apiRouter.HandleFunc("/elevation/point", api.GetPointElevation(db)).Methods("POST")
	apiRouter.HandleFunc("/elevation/climbs", api.AnalyzeClimbs(db)).Methods("POST")
	
	// Gear endpoints
	apiRouter.HandleFunc("/gear/products", api.HandleGearProducts(db)).Methods("GET", "OPTIONS")
	apiRouter.HandleFunc("/gear/categories", api.HandleGearCategories(db)).Methods("GET", "OPTIONS")
	apiRouter.HandleFunc("/gear/brands", api.HandleGearBrands(db)).Methods("GET", "OPTIONS")
	apiRouter.HandleFunc("/elevation/tiles", api.GetElevationTiles(db)).Methods("GET")

	// Serve static files
	router.PathPrefix("/").Handler(http.FileServer(http.Dir("./")))

	// Configure CORS
	c := cors.New(cors.Options{
		AllowedOrigins: []string{"*"},
		AllowedMethods: []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders: []string{"*"},
		AllowCredentials: true,
		Debug: true,
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
	err := db.QueryRow("SELECT COUNT(*) FROM motorcycle_data_make_model_year").Scan(&motorcycleCount)
	if err != nil {
		log.Printf("Error counting motorcycles: %v", err)
	}

	var bicycleCount int
	err = db.QueryRow("SELECT COUNT(*) FROM bicycle_data_make_model_year_specs").Scan(&bicycleCount)
	if err != nil {
		log.Printf("Error counting bicycles: %v", err)
	}

	var electrifiedCount int
	err = db.QueryRow("SELECT COUNT(*) FROM electrified_data").Scan(&electrifiedCount)
	if err != nil {
		// Table might not exist yet, that's okay
		log.Printf("Error counting electrified: %v", err)
		electrifiedCount = 0
	}

	response := map[string]interface{}{
		"status": "healthy",
		"motorcycles": motorcycleCount,
		"bicycles": bicycleCount,
		"electrified": electrifiedCount,
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
		FROM motorcycle_data_make_model_year
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

func getMotorcycleSpecs(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	motorcycleID := vars["id"]
	
	// First check if this motorcycle has a linked spec
	var specID sql.NullInt64
	err := db.QueryRow(`
		SELECT spec_id FROM motorcycle_data_make_model_year WHERE id = $1
	`, motorcycleID).Scan(&specID)
	
	if err != nil {
		if err == sql.ErrNoRows {
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]interface{}{
				"hasSpecs": false,
				"message": "Motorcycle not found",
			})
			return
		}
		http.Error(w, "Database error", http.StatusInternalServerError)
		log.Printf("Error querying motorcycle: %v", err)
		return
	}
	
	// If no spec_id, return no specs available
	if !specID.Valid {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"hasSpecs": false,
			"message": "No specifications available for this motorcycle",
		})
		return
	}
	
	// Fetch the specifications from motorcycle_data_specs table
	var specifications json.RawMessage
	err = db.QueryRow(`
		SELECT specifications FROM motorcycle_data_specs WHERE id = $1
	`, specID.Int64).Scan(&specifications)
	
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		log.Printf("Error querying specs: %v", err)
		return
	}
	
	// Parse the specifications JSON
	var specs map[string]interface{}
	if err := json.Unmarshal(specifications, &specs); err != nil {
		http.Error(w, "Error parsing specifications", http.StatusInternalServerError)
		log.Printf("Error parsing specs JSON: %v", err)
		return
	}
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"hasSpecs": true,
		"specId": specID.Int64,
		"specifications": specs,
	})
}

func getMotorcycleMakes(w http.ResponseWriter, r *http.Request) {
	log.Println("API: Getting motorcycle makes from motorcycle_data_make_model_year table")
	query := `
		SELECT DISTINCT make
		FROM motorcycle_data_make_model_year
		ORDER BY make
	`

	rows, err := db.Query(query)
	if err != nil {
		log.Printf("Error querying motorcycle makes: %v", err)
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
		FROM motorcycle_data_make_model_year
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
	log.Println("API: Getting bicycle manufacturers from bicycle_data_make_model_year_specs table")
	// Pull from the REAL data in bicycle_data_make_model_year_specs
	query := `
		SELECT DISTINCT extracted_data->>'manufacturer' as manufacturer
		FROM bicycle_data_make_model_year_specs 
		WHERE extracted_data->>'manufacturer' IS NOT NULL
		AND extracted_data->>'manufacturer' != ''
		ORDER BY manufacturer
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

	log.Printf("API: Getting years for bicycle manufacturer: %s", manufacturer)
	
	// Use the REAL data from bicycle_data_make_model_year_specs
	query := `
		SELECT DISTINCT (extracted_data->>'year')::int as year
		FROM bicycle_data_make_model_year_specs 
		WHERE LOWER(extracted_data->>'manufacturer') = LOWER($1)
		AND extracted_data->>'year' IS NOT NULL
		AND extracted_data->>'year' ~ '^\d{4}$'
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

	log.Printf("API: Getting models (families) for %s %s", manufacturer, year)
	
	// Use the REAL data from bicycle_data_make_model_year_specs
	// The family field seems to contain JSON, so let's extract just the familyName
	query := `
		SELECT DISTINCT 
			CASE 
				WHEN extracted_data->>'family' LIKE '{%' THEN 
					(extracted_data->>'family')::jsonb->>'familyName'
				ELSE 
					extracted_data->>'family'
			END as family
		FROM bicycle_data_make_model_year_specs 
		WHERE LOWER(extracted_data->>'manufacturer') = LOWER($1)
		AND (extracted_data->>'year')::int = $2
		AND extracted_data->>'family' IS NOT NULL
		ORDER BY family
	`

	rows, err := db.Query(query, manufacturer, year)
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		log.Printf("Error querying models: %v", err)
		return
	}
	defer rows.Close()

	var models []string
	
	for rows.Next() {
		var family string
		err := rows.Scan(&family)
		if err != nil {
			log.Printf("Error scanning row: %v", err)
			continue
		}
		models = append(models, family)
	}

	response := map[string][]string{
		"models": models,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func getBicycleVariants(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	manufacturer := vars["manufacturer"]
	year := vars["year"]
	family := vars["family"]

	log.Printf("API: Getting variants for %s %s %s", manufacturer, year, family)
	
	// Get all variants for this family
	// Handle both JSON and plain text family fields
	query := `
		SELECT DISTINCT extracted_data->>'model' as model
		FROM bicycle_data_make_model_year_specs 
		WHERE LOWER(extracted_data->>'manufacturer') = LOWER($1)
		AND (extracted_data->>'year')::int = $2
		AND (
			LOWER(
				CASE 
					WHEN extracted_data->>'family' LIKE '{%' THEN 
						(extracted_data->>'family')::jsonb->>'familyName'
					ELSE 
						extracted_data->>'family'
				END
			) = LOWER($3)
		)
		AND extracted_data->>'model' IS NOT NULL
		ORDER BY model
	`

	rows, err := db.Query(query, manufacturer, year, family)
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		log.Printf("Error querying variants: %v", err)
		return
	}
	defer rows.Close()

	var variants []string
	for rows.Next() {
		var variant string
		err := rows.Scan(&variant)
		if err != nil {
			log.Printf("Error scanning row: %v", err)
			continue
		}
		variants = append(variants, variant)
	}

	response := map[string][]string{
		"variants": variants,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func getBicycleSpecs(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	manufacturer := vars["manufacturer"]
	year := vars["year"]
	model := vars["model"]

	// Query from the real bicycle data table
	// Note: This uses the JSONB data structure from bicycle_data_make_model_year_specs
	// The old query was looking at test tables that don't exist
	query := `
		SELECT id, extracted_data
		FROM bicycle_data_make_model_year_specs
		WHERE LOWER(extracted_data->>'manufacturer') = LOWER($1)
		AND (extracted_data->>'year')::int = $2
		AND LOWER(extracted_data->>'model') = LOWER($3)
		LIMIT 1
	`

	var bikeID string
	var extractedData json.RawMessage
	
	err := db.QueryRow(query, manufacturer, year, model).Scan(&bikeID, &extractedData)

	if err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "Bicycle not found", http.StatusNotFound)
			return
		}
		http.Error(w, "Database error", http.StatusInternalServerError)
		log.Printf("Error querying bicycle specs: %v", err)
		return
	}

	// Parse the JSONB data
	var bikeData map[string]interface{}
	if err := json.Unmarshal(extractedData, &bikeData); err != nil {
		http.Error(w, "Error parsing bicycle data", http.StatusInternalServerError)
		log.Printf("Error parsing JSONB: %v", err)
		return
	}

	// Extract specifications from the JSONB data
	specs := make(map[string]interface{})
	
	// Common fields in the extracted_data
	possibleFields := []string{
		"category", "type", "frame_material", "fork", "drivetrain", 
		"brakes", "wheels", "tires", "weight", "msrp", "price",
		"suspension", "suspension_travel", "wheel_size", "gears",
		"shifters", "crankset", "cassette", "chain", "pedals",
		"saddle", "seatpost", "stem", "handlebars", "grips",
		"headset", "bottom_bracket", "colors", "sizes",
		"electric_motor", "battery", "range", "top_speed",
		"motor_power", "battery_capacity", "charging_time",
	}
	
	for _, field := range possibleFields {
		if value, exists := bikeData[field]; exists && value != nil && value != "" {
			specs[field] = value
		}
	}
	
	// Also include any other fields that might be in the data
	for key, value := range bikeData {
		if value != nil && value != "" {
			// Skip the basic identification fields
			if key != "manufacturer" && key != "model" && key != "year" && key != "id" {
				specs[key] = value
			}
		}
	}

	response := map[string]interface{}{
		"hasSpecs": len(specs) > 0,
		"specifications": specs,
		"bikeInfo": map[string]interface{}{
			"id":           bikeID,
			"manufacturer": manufacturer,
			"model":        model,
			"year":         year,
		},
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// Electrified bike handlers
func getElectrifiedBrands(w http.ResponseWriter, r *http.Request) {
	log.Println("API: Getting electrified brands")
	
	// For now, return a static list of electrified brands
	// In production, this would query from a database table
	brands := []map[string]interface{}{
		{"name": "Sur-Ron", "count": 4},
		{"name": "Talaria", "count": 3},
		{"name": "Segway", "count": 2},
		{"name": "Stealth", "count": 3},
		{"name": "Monday Motorbikes", "count": 2},
		{"name": "Onyx", "count": 2},
		{"name": "Huck Cycles", "count": 2},
		{"name": "Biktrix", "count": 1},
		{"name": "Luna Cycle", "count": 2},
		{"name": "CAB Motorworks", "count": 2},
		{"name": "Delfast", "count": 1},
		{"name": "Grizzly", "count": 1},
		{"name": "Super73", "count": 3},
		{"name": "Ariel Rider", "count": 2},
		{"name": "Juiced Bikes", "count": 2},
		{"name": "RadRunner", "count": 1},
		{"name": "Sondors", "count": 1},
		{"name": "Michael Blast", "count": 2},
		{"name": "Vintage Electric", "count": 2},
		{"name": "Ristretto", "count": 2},
		{"name": "Eride Pro", "count": 1},
		{"name": "Czem", "count": 1},
		{"name": "Torp", "count": 1},
	}
	
	response := map[string]interface{}{
		"brands": brands,
	}
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func getElectrifiedYears(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	brand := vars["brand"]
	
	log.Printf("API: Getting years for electrified brand: %s", brand)
	
	// For demo purposes, return years 2020-2025
	years := []int{2025, 2024, 2023, 2022, 2021, 2020}
	
	response := map[string][]int{
		"years": years,
	}
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func getElectrifiedModels(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	brand := vars["brand"]
	year := vars["year"]
	
	log.Printf("API: Getting models for %s %s", brand, year)
	
	// Return demo models based on brand
	models := map[string][]string{
		"Sur-Ron": {"Light Bee X", "Storm Bee", "Ultra Bee"},
		"Talaria": {"Sting", "XXX", "MX4"},
		"Super73": {"S2", "RX", "ZX"},
		"Segway": {"X160", "X260"},
		"Onyx": {"RCR", "CTY2"},
	}
	
	brandModels, exists := models[brand]
	if !exists {
		brandModels = []string{"Model 1", "Model 2"}
	}
	
	response := map[string][]string{
		"models": brandModels,
	}
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func getElectrifiedVariants(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	brand := vars["brand"]
	year := vars["year"]
	model := vars["model"]
	
	log.Printf("API: Getting variants for %s %s %s", brand, year, model)
	
	// For most electrified bikes, variants are minimal
	variants := []string{model} // Often just the model itself
	
	// Some models might have variants
	if model == "Light Bee X" {
		variants = []string{"Light Bee X", "Light Bee X Sport"}
	} else if model == "RCR" {
		variants = []string{"RCR", "RCR 72V"}
	}
	
	response := map[string][]string{
		"variants": variants,
	}
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func getElectrifiedSpecs(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	brand := vars["brand"]
	year := vars["year"]
	model := vars["model"]
	
	log.Printf("API: Getting specs for %s %s %s", brand, year, model)
	
	// Demo specifications for electrified bikes
	specs := map[string]interface{}{
		"motor_power": "6000W",
		"battery": "60V 32Ah",
		"top_speed": "47 mph",
		"range": "40-60 miles",
		"weight": "110 lbs",
		"charging_time": "4-6 hours",
		"frame": "Aluminum alloy",
		"suspension_front": "DNM USD-8 Inverted Fork",
		"suspension_rear": "DNM RCP-2S",
		"brakes": "4-piston hydraulic disc",
		"tires": "19\"/19\" Off-road",
		"display": "Color LCD",
		"modes": "Eco, Sport, Turbo",
		"price": "$4,500",
	}
	
	response := map[string]interface{}{
		"hasSpecs": true,
		"specifications": specs,
		"vehicle": map[string]interface{}{
			"brand": brand,
			"model": model,
			"year":  year,
			"type":  "electrified",
		},
	}
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}
