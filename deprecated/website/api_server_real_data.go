package main

import (
	"encoding/csv"
	"encoding/json"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"

	"github.com/gorilla/mux"
)

// Motorcycle represents a motorcycle from the CSV
type Motorcycle struct {
	Year     int    `json:"year"`
	Make     string `json:"make"`
	Model    string `json:"model"`
	Package  string `json:"package,omitempty"`
	Category string `json:"category"`
	Engine   string `json:"engine"`
}

// BikeVariant represents bicycle data from JSON
type BikeVariant struct {
	Brand    string   `json:"brand"`
	Years    []string `json:"years"`
	Variants []string `json:"variants"`
}

// In-memory data store
var motorcycles []Motorcycle
var bikeVariants []BikeVariant

func main() {
	// Load data files
	log.Println("Loading real data files...")
	loadMotorcycles()
	loadBikeVariants()
	
	// Setup routes
	router := mux.NewRouter()
	router.Use(corsMiddleware)

	// API routes
	api := router.PathPrefix("/api").Subrouter()
	api.HandleFunc("/health", healthHandler).Methods("GET")
	
	// Bicycle routes
	bicycles := api.PathPrefix("/bicycles").Subrouter()
	bicycles.HandleFunc("/manufacturers", getBicycleManufacturersHandler).Methods("GET")
	bicycles.HandleFunc("/years", getBicycleYearsHandler).Methods("GET")
	bicycles.HandleFunc("/years/{manufacturer}", getBicycleYearsByManufacturerHandler).Methods("GET")
	bicycles.HandleFunc("/models/{manufacturer}/{year}", getBicycleModelsByManufacturerYearHandler).Methods("GET")
	bicycles.HandleFunc("/search", searchBicyclesHandler).Methods("GET")

	// Motorcycle routes
	motorcyclesAPI := api.PathPrefix("/motorcycles").Subrouter()
	motorcyclesAPI.HandleFunc("/manufacturers", getMotorcycleManufacturersHandler).Methods("GET")
	motorcyclesAPI.HandleFunc("/years", getMotorcycleYearsHandler).Methods("GET")
	motorcyclesAPI.HandleFunc("/years/{make}", getMotorcycleYearsByMakeHandler).Methods("GET")
	motorcyclesAPI.HandleFunc("/models/{make}/{year}", getMotorcycleModelsByMakeYearHandler).Methods("GET")
	motorcyclesAPI.HandleFunc("/search", searchMotorcyclesHandler).Methods("GET")

	// Get port
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("🚴‍♂️ BikeNode Real Data API Server starting on port %s", port)
	log.Printf("🌐 Available at: http://localhost:%s", port)
	log.Printf("📊 Loaded %d motorcycles and %d bicycle brands", len(motorcycles), len(bikeVariants))

	if err := http.ListenAndServe(":"+port, router); err != nil {
		log.Fatal("Server failed to start:", err)
	}
}

func loadMotorcycles() {
	file, err := os.Open("/Users/kevintong/Documents/Code/bikenode.com/database/data/motorcycles.csv")
	if err != nil {
		log.Printf("Error opening motorcycles CSV: %v", err)
		return
	}
	defer file.Close()

	reader := csv.NewReader(file)
	records, err := reader.ReadAll()
	if err != nil {
		log.Printf("Error reading motorcycles CSV: %v", err)
		return
	}

	// Skip header
	for i := 1; i < len(records); i++ {
		if len(records[i]) >= 6 {
			year, _ := strconv.Atoi(records[i][0])
			motorcycles = append(motorcycles, Motorcycle{
				Year:     year,
				Make:     records[i][1],
				Model:    records[i][2],
				Package:  records[i][3],
				Category: records[i][4],
				Engine:   records[i][5],
			})
		}
	}
	log.Printf("Loaded %d motorcycles", len(motorcycles))
}

func loadBikeVariants() {
	file, err := ioutil.ReadFile("/Users/kevintong/Documents/Code/bikenode.com/scrapers/bike_variants.json")
	if err != nil {
		log.Printf("Error reading bike variants JSON: %v", err)
		return
	}

	err = json.Unmarshal(file, &bikeVariants)
	if err != nil {
		log.Printf("Error parsing bike variants JSON: %v", err)
		return
	}
	log.Printf("Loaded %d bicycle brands", len(bikeVariants))
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
		"version": "2.0.0",
		"service": "bikenode-real-data-api",
		"data": map[string]int{
			"motorcycles": len(motorcycles),
			"bicycles":    len(bikeVariants),
		},
	})
}

func getBicycleManufacturersHandler(w http.ResponseWriter, r *http.Request) {
	manufacturerMap := make(map[string]bool)
	for _, variant := range bikeVariants {
		manufacturerMap[variant.Brand] = true
	}
	
	manufacturers := make([]string, 0, len(manufacturerMap))
	for m := range manufacturerMap {
		manufacturers = append(manufacturers, m)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"manufacturers": manufacturers,
		"count":         len(manufacturers),
	})
}

func getBicycleYearsHandler(w http.ResponseWriter, r *http.Request) {
	yearMap := make(map[string]bool)
	for _, variant := range bikeVariants {
		for _, year := range variant.Years {
			yearMap[year] = true
		}
	}
	
	years := make([]int, 0, len(yearMap))
	for y := range yearMap {
		if year, err := strconv.Atoi(y); err == nil {
			years = append(years, year)
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"years": years,
		"count": len(years),
	})
}

func getBicycleYearsByManufacturerHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	manufacturer := vars["manufacturer"]

	yearMap := make(map[string]bool)
	for _, variant := range bikeVariants {
		if strings.EqualFold(variant.Brand, manufacturer) {
			for _, year := range variant.Years {
				yearMap[year] = true
			}
		}
	}
	
	years := make([]int, 0, len(yearMap))
	for y := range yearMap {
		if year, err := strconv.Atoi(y); err == nil {
			years = append(years, year)
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"manufacturer": manufacturer,
		"years":        years,
		"count":        len(years),
	})
}

func getBicycleModelsByManufacturerYearHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	manufacturer := vars["manufacturer"]
	yearStr := vars["year"]

	models := []string{}
	for _, variant := range bikeVariants {
		if strings.EqualFold(variant.Brand, manufacturer) {
			for _, y := range variant.Years {
				if y == yearStr {
					models = variant.Variants
					break
				}
			}
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"manufacturer": manufacturer,
		"year":         yearStr,
		"models":       models,
		"count":        len(models),
	})
}

func searchBicyclesHandler(w http.ResponseWriter, r *http.Request) {
	query := strings.ToLower(r.URL.Query().Get("q"))
	limitStr := r.URL.Query().Get("limit")
	
	limit := 20
	if limitStr != "" {
		if parsedLimit, err := strconv.Atoi(limitStr); err == nil && parsedLimit > 0 {
			limit = parsedLimit
		}
	}

	results := []map[string]interface{}{}
	count := 0
	
	for _, variant := range bikeVariants {
		if count >= limit {
			break
		}
		
		if query == "" || strings.Contains(strings.ToLower(variant.Brand), query) {
			for _, year := range variant.Years {
				if count >= limit {
					break
				}
				for _, model := range variant.Variants {
					if count >= limit {
						break
					}
					if query == "" || strings.Contains(strings.ToLower(model), query) {
						results = append(results, map[string]interface{}{
							"brand": variant.Brand,
							"year":  year,
							"model": model,
						})
						count++
					}
				}
			}
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"query":   query,
		"bikes":   results,
		"count":   len(results),
		"success": true,
	})
}

func getMotorcycleManufacturersHandler(w http.ResponseWriter, r *http.Request) {
	makeMap := make(map[string]bool)
	for _, moto := range motorcycles {
		makeMap[moto.Make] = true
	}
	
	makes := make([]string, 0, len(makeMap))
	for m := range makeMap {
		makes = append(makes, m)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"manufacturers": makes,
		"count":         len(makes),
	})
}

func getMotorcycleYearsHandler(w http.ResponseWriter, r *http.Request) {
	yearMap := make(map[int]bool)
	for _, moto := range motorcycles {
		yearMap[moto.Year] = true
	}
	
	years := make([]int, 0, len(yearMap))
	for y := range yearMap {
		years = append(years, y)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"years": years,
		"count": len(years),
	})
}

func getMotorcycleYearsByMakeHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	makeParam := vars["make"]

	yearMap := make(map[int]bool)
	for _, moto := range motorcycles {
		if strings.EqualFold(moto.Make, makeParam) {
			yearMap[moto.Year] = true
		}
	}
	
	years := make([]int, 0, len(yearMap))
	for y := range yearMap {
		years = append(years, y)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"make":  makeParam,
		"years": years,
		"count": len(years),
	})
}

func getMotorcycleModelsByMakeYearHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	makeParam := vars["make"]
	yearStr := vars["year"]
	year, _ := strconv.Atoi(yearStr)

	modelMap := make(map[string]bool)
	for _, moto := range motorcycles {
		if strings.EqualFold(moto.Make, makeParam) && moto.Year == year {
			modelMap[moto.Model] = true
		}
	}
	
	models := make([]string, 0, len(modelMap))
	for m := range modelMap {
		models = append(models, m)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"make":   makeParam,
		"year":   year,
		"models": models,
		"count":  len(models),
	})
}

func searchMotorcyclesHandler(w http.ResponseWriter, r *http.Request) {
	query := strings.ToLower(r.URL.Query().Get("q"))
	limitStr := r.URL.Query().Get("limit")
	
	limit := 20
	if limitStr != "" {
		if parsedLimit, err := strconv.Atoi(limitStr); err == nil && parsedLimit > 0 {
			limit = parsedLimit
		}
	}

	results := []Motorcycle{}
	for _, moto := range motorcycles {
		if len(results) >= limit {
			break
		}
		
		if query == "" || 
			strings.Contains(strings.ToLower(moto.Make), query) ||
			strings.Contains(strings.ToLower(moto.Model), query) {
			results = append(results, moto)
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"query":       query,
		"motorcycles": results,
		"count":       len(results),
		"success":     true,
	})
}