package main

import (
	"encoding/csv"
	"encoding/json"
	"io"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"sort"
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

// BikeData structures for the JSON format
type BikeVariant struct {
	Name      string `json:"name"`
	URL       string `json:"url"`
	VariantID string `json:"variantId"`
}

type BikeFamily struct {
	Name     string        `json:"name"`
	URL      string        `json:"url"`
	FamilyID string        `json:"familyId"`
	Variants []BikeVariant `json:"variants"`
}

type BikeBrand struct {
	MakerID  string       `json:"makerId"`
	Year     string       `json:"year"`
	URL      string       `json:"url"`
	Families []BikeFamily `json:"families"`
}

// In-memory data store
var motorcycles []Motorcycle
var bikeBrands map[string]BikeBrand

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
	motorcyclesAPI.HandleFunc("/search", searchMotorcyclesHandler).Methods("GET")

	// Get port
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("🚴‍♂️ BikeNode Real Data API Server starting on port %s", port)
	log.Printf("🌐 Available at: http://localhost:%s", port)
	log.Printf("📊 Loaded %d motorcycles and %d bicycle brands", len(motorcycles), len(bikeBrands))

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
	reader.FieldsPerRecord = -1 // Allow variable number of fields
	
	// Skip header
	_, err = reader.Read()
	if err != nil {
		log.Printf("Error reading header: %v", err)
		return
	}

	for {
		record, err := reader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			continue // Skip bad records
		}
		
		if len(record) >= 6 {
			year, _ := strconv.Atoi(record[0])
			motorcycles = append(motorcycles, Motorcycle{
				Year:     year,
				Make:     record[1],
				Model:    record[2],
				Package:  record[3],
				Category: record[4],
				Engine:   record[5],
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

	bikeBrands = make(map[string]BikeBrand)
	err = json.Unmarshal(file, &bikeBrands)
	if err != nil {
		log.Printf("Error parsing bike variants JSON: %v", err)
		return
	}
	log.Printf("Loaded %d bicycle brand entries", len(bikeBrands))
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
			"bicycles":    len(bikeBrands),
		},
	})
}

func getBicycleManufacturersHandler(w http.ResponseWriter, r *http.Request) {
	manufacturerMap := make(map[string]bool)
	for _, brand := range bikeBrands {
		// Extract manufacturer name from makerId
		manufacturerMap[strings.Title(brand.MakerID)] = true
	}
	
	manufacturers := make([]string, 0, len(manufacturerMap))
	for m := range manufacturerMap {
		manufacturers = append(manufacturers, m)
	}
	sort.Strings(manufacturers)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"manufacturers": manufacturers,
		"count":         len(manufacturers),
	})
}

func getBicycleYearsHandler(w http.ResponseWriter, r *http.Request) {
	yearMap := make(map[string]bool)
	for _, brand := range bikeBrands {
		yearMap[brand.Year] = true
	}
	
	years := make([]int, 0, len(yearMap))
	for y := range yearMap {
		if year, err := strconv.Atoi(y); err == nil {
			years = append(years, year)
		}
	}
	sort.Sort(sort.Reverse(sort.IntSlice(years)))

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"years": years,
		"count": len(years),
	})
}

func getBicycleYearsByManufacturerHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	manufacturer := strings.ToLower(vars["manufacturer"])

	yearMap := make(map[string]bool)
	for key, brand := range bikeBrands {
		if strings.Contains(key, manufacturer) {
			yearMap[brand.Year] = true
		}
	}
	
	years := make([]int, 0, len(yearMap))
	for y := range yearMap {
		if year, err := strconv.Atoi(y); err == nil {
			years = append(years, year)
		}
	}
	sort.Sort(sort.Reverse(sort.IntSlice(years)))

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"manufacturer": vars["manufacturer"],
		"years":        years,
		"count":        len(years),
	})
}

func getBicycleModelsByManufacturerYearHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	manufacturer := strings.ToLower(vars["manufacturer"])
	yearStr := vars["year"]

	// Find the right brand entry
	var targetBrand *BikeBrand
	for key, brand := range bikeBrands {
		if strings.Contains(key, manufacturer) && brand.Year == yearStr {
			targetBrand = &brand
			break
		}
	}

	models := []string{}
	if targetBrand != nil {
		for _, family := range targetBrand.Families {
			// Extract clean model name from family name
			parts := strings.Split(family.Name, "$")
			if len(parts) > 0 {
				modelName := strings.TrimSpace(parts[0])
				// Remove year and manufacturer prefix
				modelName = strings.Replace(modelName, yearStr+" ", "", 1)
				modelName = strings.Replace(modelName, strings.Title(manufacturer), "", 1)
				modelName = strings.TrimSpace(modelName)
				if modelName != "" {
					models = append(models, modelName)
				}
			}
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"manufacturer": vars["manufacturer"],
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
	
	for _, brand := range bikeBrands {
		if count >= limit {
			break
		}
		
		manufacturer := strings.Title(brand.MakerID)
		if query == "" || strings.Contains(strings.ToLower(manufacturer), query) {
			for _, family := range brand.Families {
				if count >= limit {
					break
				}
				for _, variant := range family.Variants {
					if count >= limit {
						break
					}
					if query == "" || strings.Contains(strings.ToLower(variant.Name), query) {
						results = append(results, map[string]interface{}{
							"brand":      manufacturer,
							"year":       brand.Year,
							"model":      variant.Name,
							"variant_id": variant.VariantID,
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
	sort.Strings(makes)

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
	sort.Sort(sort.Reverse(sort.IntSlice(years)))

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"years": years,
		"count": len(years),
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