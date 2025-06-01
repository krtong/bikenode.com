package main

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"bikenode.com/database"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/joho/godotenv"
)

type BikeVariant struct {
	Name              string                 `json:"name"`
	URL               string                 `json:"url"`
	VariantID         string                 `json:"variantId"`
	MakerYear         string                 `json:"makerYear"`
	FamilyID          string                 `json:"familyId"`
	ComprehensiveData map[string]interface{} `json:"comprehensiveData"`
}

func main() {
	fmt.Println("🚴‍♂️ BikeNode Database Import Tool")
	fmt.Println("==================================")

	// Load environment
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	// Connect to database
	db, err := database.GetConnection()
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	defer db.Close()

	// Run migrations first
	if err := database.RunMigrations(db); err != nil {
		log.Fatal("Failed to run migrations:", err)
	}

	// Clear existing bikes
	fmt.Println("🗑️  Clearing existing bike data...")
	_, err = db.Exec("DELETE FROM bicycles")
	if err != nil {
		log.Fatal("Failed to clear existing bikes:", err)
	}

	// Find all JSON files
	dataDir := "/Users/kevintong/Documents/Code/bikenode.com/products/data_and_scrapers/stage_hands_project"
	pattern := filepath.Join(dataDir, "comprehensive_bike_specs_chunk_*.json")
	files, err := filepath.Glob(pattern)
	if err != nil {
		log.Fatal("Failed to find JSON files:", err)
	}

	fmt.Printf("📁 Found %d JSON files to process\n", len(files))

	// Process only first file for testing
	if len(files) > 0 {
		fmt.Printf("🧪 Processing first file for testing: %s\n", filepath.Base(files[0]))
		imported, errors := processFile(db, files[0])
		fmt.Printf("✅ Imported: %d bikes\n", imported)
		if errors > 0 {
			fmt.Printf("❌ Errors: %d bikes\n", errors)
		}
	}

	// Verify import
	var count int
	err = db.Get(&count, "SELECT COUNT(*) FROM bicycles")
	if err != nil {
		log.Fatal("Failed to count bikes:", err)
	}
	fmt.Printf("🗄️  Database now contains: %d bikes\n", count)
}

func processFile(db *sqlx.DB, filename string) (imported int, errors int) {
	// Read file
	data, err := ioutil.ReadFile(filename)
	if err != nil {
		log.Printf("❌ Failed to read file %s: %v", filename, err)
		return 0, 1
	}

	// Parse JSON
	var bikes map[string]BikeVariant
	err = json.Unmarshal(data, &bikes)
	if err != nil {
		log.Printf("❌ Failed to parse JSON in %s: %v", filename, err)
		return 0, 1
	}

	fmt.Printf("  📦 Found %d bikes in file\n", len(bikes))

	// Process only first 10 bikes for testing
	count := 0
	for _, bike := range bikes {
		if count >= 10 {
			break
		}

		err := importBike(db, bike)
		if err != nil {
			log.Printf("❌ Failed to import bike %s: %v", bike.VariantID, err)
			errors++
		} else {
			imported++
		}
		count++
	}

	return imported, errors
}

func importBike(db *sqlx.DB, bike BikeVariant) error {
	// Generate UUID
	id := uuid.New()
	now := time.Now()

	// Extract basic info
	name := extractName(bike)
	manufacturer, year := parseMakerYear(bike.MakerYear)
	model := extractModel(bike.Name, manufacturer)

	// Extract additional data
	var price, imageURL, suspension *string
	isElectric := false

	if bike.ComprehensiveData != nil {
		// Extract pricing
		if pricing, ok := bike.ComprehensiveData["pricing"].(map[string]interface{}); ok {
			if msrp, ok := pricing["msrp"].(string); ok && msrp != "" {
				price = &msrp
			}
		}

		// Extract bike details
		if bikeDetails, ok := bike.ComprehensiveData["bikeDetails"].(map[string]interface{}); ok {
			if electric, ok := bikeDetails["isElectric"].(bool); ok {
				isElectric = electric
			}
		}

		// Extract primary image
		if images, ok := bike.ComprehensiveData["images"].([]interface{}); ok && len(images) > 0 {
			if img, ok := images[0].(map[string]interface{}); ok {
				if url, ok := img["url"].(string); ok && url != "" {
					imageURL = &url
				}
			}
		}
	}

	// Set default suspension
	suspensionValue := "rigid" // Default for road bikes
	suspension = &suspensionValue

	// Prepare nullable values
	var familyID, makerYear, url *string
	if bike.FamilyID != "" {
		familyID = &bike.FamilyID
	}
	if bike.MakerYear != "" {
		makerYear = &bike.MakerYear
	}
	if bike.URL != "" {
		url = &bike.URL
	}

	// Insert into database
	query := `
		INSERT INTO bicycles (
			id, variant_id, name, manufacturer, year, model, family_id, maker_year, url,
			frame_material, wheel_size, drivetrain, groupset, weight, suspension, price,
			is_electric, motor_specs, battery_specs, image_url,
			specs_json, geometry_json, components_json,
			created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9,
			$10, $11, $12, $13, $14, $15, $16,
			$17, $18, $19, $20,
			$21, $22, $23,
			$24, $25
		)
	`

	_, err := db.Exec(query,
		id, bike.VariantID, name, manufacturer, year, model, familyID, makerYear, url,
		nil, nil, nil, nil, nil, suspension, price, // frame_material through price
		isElectric, nil, nil, imageURL, // is_electric through image_url
		nil, nil, nil, // specs_json through components_json
		now, now, // created_at, updated_at
	)

	return err
}

func extractName(bike BikeVariant) string {
	if bike.Name != "" {
		// Clean up the name (remove price if present)
		name := bike.Name
		if strings.Contains(name, "$") {
			parts := strings.Split(name, "$")
			name = strings.TrimSpace(parts[0])
		}
		return name
	}
	return bike.VariantID
}

func parseMakerYear(makerYear string) (string, *int) {
	parts := strings.Split(makerYear, "_")
	if len(parts) >= 2 {
		manufacturer := strings.Title(parts[0])
		if yearStr := parts[1]; yearStr != "" {
			if year, err := strconv.Atoi(yearStr); err == nil {
				return manufacturer, &year
			}
		}
		return manufacturer, nil
	}
	return "Unknown", nil
}

func extractModel(name, manufacturer string) string {
	// Remove manufacturer from name to get model
	name = strings.TrimSpace(name)
	manufacturer = strings.TrimSpace(manufacturer)

	// Remove year prefix if present (e.g., "2024 Trek Fuel EX" -> "Fuel EX")
	parts := strings.Fields(name)
	var modelParts []string

	for _, part := range parts {
		// Skip year (4 digits)
		if len(part) == 4 {
			if _, err := strconv.Atoi(part); err == nil {
				continue
			}
		}
		// Skip manufacturer name
		if strings.EqualFold(part, manufacturer) {
			continue
		}
		// Skip price
		if strings.HasPrefix(part, "$") {
			break
		}
		modelParts = append(modelParts, part)
	}

	return strings.Join(modelParts, " ")
}
