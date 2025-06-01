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

type ImportedBike struct {
	ID             uuid.UUID
	VariantID      string
	Name           string
	Manufacturer   string
	Year           *int
	Model          string
	FamilyID       *string
	MakerYear      *string
	URL            *string
	FrameMaterial  *string
	WheelSize      *string
	Drivetrain     *string
	Groupset       *string
	Weight         *string
	Suspension     *string
	Price          *string
	IsElectric     bool
	MotorSpecs     *string
	BatterySpecs   *string
	ImageURL       *string
	SpecsJSON      *string
	GeometryJSON   *string
	ComponentsJSON *string
	CreatedAt      time.Time
	UpdatedAt      time.Time
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

	totalImported := 0
	totalErrors := 0

	// Process each file
	for i, file := range files {
		fmt.Printf("\n📋 Processing file %d/%d: %s\n", i+1, len(files), filepath.Base(file))

		imported, errors := processFile(db, file)
		totalImported += imported
		totalErrors += errors

		fmt.Printf("  ✅ Imported: %d bikes\n", imported)
		if errors > 0 {
			fmt.Printf("  ❌ Errors: %d bikes\n", errors)
		}
	}

	fmt.Printf("\n🎉 Import Complete!\n")
	fmt.Printf("✅ Total bikes imported: %d\n", totalImported)
	if totalErrors > 0 {
		fmt.Printf("❌ Total errors: %d\n", totalErrors)
	}

	// Verify import
	var count int
	err = db.Get(&count, "SELECT COUNT(*) FROM bicycles")
	if err != nil {
		log.Fatal("Failed to count bikes:", err)
	}
	fmt.Printf("🗄️  Database now contains: %d bikes\n", count)
}

func processFile(db interface{}, filename string) (imported int, errors int) {
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

	// Import each bike
	for _, bike := range bikes {
		err := importBike(db, bike)
		if err != nil {
			log.Printf("❌ Failed to import bike %s: %v", bike.VariantID, err)
			errors++
		} else {
			imported++
		}
	}

	return imported, errors
}

func importBike(db interface{}, bike BikeVariant) error {
	// Extract bike details
	importedBike := ImportedBike{
		ID:        uuid.New(),
		VariantID: bike.VariantID,
		Name:      extractName(bike),
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	// Parse manufacturer and year from MakerYear (e.g., "trek_2024")
	manufacturer, year := parseMakerYear(bike.MakerYear)
	importedBike.Manufacturer = manufacturer
	importedBike.Year = year

	// Extract model from name
	importedBike.Model = extractModel(bike.Name, manufacturer)

	// Set family and other basic fields
	if bike.FamilyID != "" {
		importedBike.FamilyID = &bike.FamilyID
	}
	if bike.MakerYear != "" {
		importedBike.MakerYear = &bike.MakerYear
	}
	if bike.URL != "" {
		importedBike.URL = &bike.URL
	}

	// Extract comprehensive data
	if bike.ComprehensiveData != nil {
		extractComprehensiveData(&importedBike, bike.ComprehensiveData)
	}

	// Set default suspension for road bikes
	if importedBike.Suspension == nil || *importedBike.Suspension == "" {
		suspension := "rigid"
		importedBike.Suspension = &suspension
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

	// Use the database connection from the parameter
	dbConn := db.(*database.DBConnection) // Type assertion would be needed

	// For now, let's use a simpler approach - we'll need to modify this
	// to work with the actual database interface

	return fmt.Errorf("database insertion not implemented yet")
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

	for i, part := range parts {
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

func extractComprehensiveData(bike *ImportedBike, data map[string]interface{}) {
	// Extract bike details if available
	if bikeDetails, ok := data["bikeDetails"].(map[string]interface{}); ok {
		// Check if electric
		if isElectric, ok := bikeDetails["isElectric"].(bool); ok {
			bike.IsElectric = isElectric
		}

		// Get image from primary thumbnail
		if images, ok := data["images"].([]interface{}); ok && len(images) > 0 {
			if img, ok := images[0].(map[string]interface{}); ok {
				if url, ok := img["url"].(string); ok {
					bike.ImageURL = &url
				}
			}
		}
	}

	// Extract pricing
	if pricing, ok := data["pricing"].(map[string]interface{}); ok {
		if msrp, ok := pricing["msrp"].(string); ok {
			bike.Price = &msrp
		}
	}

	// Store complete data as JSON
	if jsonData, err := json.Marshal(data); err == nil {
		jsonStr := string(jsonData)
		bike.SpecsJSON = &jsonStr
	}
}
