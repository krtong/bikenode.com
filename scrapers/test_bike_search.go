package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"os"

	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
)

// BikeSearchResult represents a motorcycle with optional specs
type BikeSearchResult struct {
	ID       string          `json:"id"`
	Year     int             `json:"year"`
	Make     string          `json:"make"`
	Model    string          `json:"model"`
	Package  *string         `json:"package,omitempty"`
	HasSpecs bool            `json:"has_specs"`
	SpecID   *int            `json:"spec_id,omitempty"`
	Specs    *MotorcycleSpec `json:"specs,omitempty"`
}

type MotorcycleSpec struct {
	ID             int                    `json:"id"`
	Engine         string                 `json:"engine,omitempty"`
	Capacity       string                 `json:"capacity,omitempty"`
	MaxPower       string                 `json:"max_power,omitempty"`
	Specifications map[string]interface{} `json:"specifications"`
}

func main() {
	// Load environment variables
	if err := godotenv.Load("../.env"); err != nil {
		log.Println("No .env file found, using system environment")
	}

	// Database connection
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgres://postgres:@localhost/bikenode?sslmode=disable"
	}

	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	defer db.Close()

	fmt.Println("🏍️  Motorcycle Search with Specs Demo")
	fmt.Println("=====================================\n")

	// Demo searches
	searches := []string{"Honda CBR", "Yamaha R1", "Ducati Monster", "BMW GS"}

	for _, search := range searches {
		fmt.Printf("🔍 Searching for: %s\n", search)
		results := searchMotorcycles(db, search)
		
		fmt.Printf("Found %d motorcycles:\n", len(results))
		for _, bike := range results {
			if bike.HasSpecs {
				fmt.Printf("  ✅ %d %s %s (WITH SPECS!)\n", bike.Year, bike.Make, bike.Model)
				if bike.Specs != nil && bike.Specs.Engine != "" {
					fmt.Printf("     Engine: %s\n", bike.Specs.Engine)
					if bike.Specs.Capacity != "" {
						fmt.Printf("     Capacity: %s\n", bike.Specs.Capacity)
					}
					if bike.Specs.MaxPower != "" {
						fmt.Printf("     Power: %s\n", bike.Specs.MaxPower)
					}
				}
			} else {
				fmt.Printf("  ❌ %d %s %s (no specs)\n", bike.Year, bike.Make, bike.Model)
			}
		}
		fmt.Println()
	}

	// Show statistics
	showSpecStatistics(db)
}

func searchMotorcycles(db *sql.DB, searchTerm string) []BikeSearchResult {
	query := `
		SELECT 
			m.id, m.year, m.make, m.model, m.package, m.spec_id,
			s.id, s.specifications
		FROM motorcycles m
		LEFT JOIN motorcycle_specs s ON m.spec_id = s.id
		WHERE m.make || ' ' || m.model ILIKE '%' || $1 || '%'
		ORDER BY m.year DESC, m.make, m.model
		LIMIT 10
	`

	rows, err := db.Query(query, searchTerm)
	if err != nil {
		log.Printf("Search error: %v", err)
		return nil
	}
	defer rows.Close()

	var results []BikeSearchResult
	for rows.Next() {
		var bike BikeSearchResult
		var specID sql.NullInt64
		var specRealID sql.NullInt64
		var specifications sql.NullString

		err := rows.Scan(
			&bike.ID, &bike.Year, &bike.Make, &bike.Model, &bike.Package,
			&specID, &specRealID, &specifications,
		)
		if err != nil {
			log.Printf("Scan error: %v", err)
			continue
		}

		if specID.Valid {
			bike.HasSpecs = true
			bike.SpecID = new(int)
			*bike.SpecID = int(specID.Int64)

			// Parse specifications
			if specifications.Valid {
				bike.Specs = &MotorcycleSpec{
					ID: int(specRealID.Int64),
				}

				var specs map[string]interface{}
				if err := json.Unmarshal([]byte(specifications.String), &specs); err == nil {
					bike.Specs.Specifications = specs
					
					// Extract common fields
					if engine, ok := specs["Engine"].(string); ok {
						bike.Specs.Engine = engine
					}
					if capacity, ok := specs["Capacity"].(string); ok {
						bike.Specs.Capacity = capacity
					}
					if power, ok := specs["Max Power"].(string); ok {
						bike.Specs.MaxPower = power
					}
				}
			}
		}

		results = append(results, bike)
	}

	return results
}

func showSpecStatistics(db *sql.DB) {
	fmt.Println("\n📊 Specification Coverage Statistics:")
	fmt.Println("=====================================")

	// Top manufacturers with specs
	rows, _ := db.Query(`
		SELECT m.make, COUNT(DISTINCT m.id) as total, COUNT(DISTINCT CASE WHEN m.spec_id IS NOT NULL THEN m.id END) as with_specs
		FROM motorcycles m
		GROUP BY m.make
		HAVING COUNT(DISTINCT CASE WHEN m.spec_id IS NOT NULL THEN m.id END) > 0
		ORDER BY with_specs DESC
		LIMIT 10
	`)
	defer rows.Close()

	fmt.Println("\nTop manufacturers with specification data:")
	for rows.Next() {
		var make string
		var total, withSpecs int
		rows.Scan(&make, &total, &withSpecs)
		percentage := float64(withSpecs) / float64(total) * 100
		fmt.Printf("  %s: %d/%d motorcycles have specs (%.1f%%)\n", make, withSpecs, total, percentage)
	}

	// Sample API response
	fmt.Println("\n🌐 Sample API Response for add-bike:")
	sampleBike := searchMotorcycles(db, "Honda CBR1000RR")
	if len(sampleBike) > 0 {
		jsonData, _ := json.MarshalIndent(sampleBike[0], "", "  ")
		fmt.Println(string(jsonData))
	}
}