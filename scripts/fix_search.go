package main

import (
	"fmt"
	"log"
	"strconv"

	"bikenode.com/database"
	"bikenode.com/models"
	"github.com/joho/godotenv"
)

func main() {
	fmt.Println("🔧 Testing and fixing bike search...")

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

	// Test simple search query
	fmt.Println("1. Testing simple search query...")

	var bikes []models.Bicycle
	query := `
		SELECT id, variant_id, name, manufacturer, year, model, family_id, maker_year, url,
			   frame_material, wheel_size, drivetrain, groupset, weight, suspension, price,
			   is_electric, motor_specs, battery_specs, image_url,
			   created_at, updated_at
		FROM bicycles 
		WHERE LOWER(name) LIKE LOWER($1) OR LOWER(manufacturer) LIKE LOWER($1)
		ORDER BY year DESC, manufacturer, name
		LIMIT $2
	`

	searchTerm := "%canyon%"
	limit := 5

	err = db.Select(&bikes, query, searchTerm, limit)
	if err != nil {
		log.Fatal("Search query failed:", err)
	}

	fmt.Printf("✅ Found %d bikes matching 'canyon'\n", len(bikes))
	for _, bike := range bikes {
		yearStr := "Unknown"
		if bike.Year != nil {
			yearStr = strconv.Itoa(*bike.Year)
		}
		fmt.Printf("  • %s - %s (%s) [%s]\n", bike.Name, bike.Manufacturer, yearStr, bike.VariantID)
	}

	// Test count query
	fmt.Println("\n2. Testing count query...")
	var count int
	countQuery := `SELECT COUNT(*) FROM bicycles WHERE LOWER(name) LIKE LOWER($1) OR LOWER(manufacturer) LIKE LOWER($1)`
	err = db.Get(&count, countQuery, searchTerm)
	if err != nil {
		log.Fatal("Count query failed:", err)
	}
	fmt.Printf("✅ Total matching bikes: %d\n", count)
}
