package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"os"
	"strings"
	"time"

	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
)

type MotorcycleSpec struct {
	Title         string            `json:"title"`
	Description   string            `json:"description"`
	Specifications map[string]string `json:"specifications"`
	Content       string            `json:"content"`
	Manufacturer  string            `json:"manufacturer"`
	Model         string            `json:"model"`
	URL           string            `json:"url"`
	ScrapedAt     string            `json:"scraped_at"`
}

type ScrapedData struct {
	ScrapedAt       string           `json:"scraped_at"`
	TotalMotorcycles int             `json:"total_motorcycles"`
	Motorcycles     []MotorcycleSpec `json:"motorcycles"`
}

// Top 50 specification field mappings
var topSpecFields = map[string]string{
	"Engine":             "engine",
	"Capacity":           "capacity",
	"Rear Suspension":    "rear_suspension",
	"Transmission":       "transmission",
	"Year":               "year",
	"Front Suspension":   "front_suspension",
	"Front Brakes":       "front_brakes",
	"Rear Brakes":        "rear_brakes",
	"Starting":           "starting",
	"Bore x Stroke":      "bore_x_stroke",
	"Front Tyre":         "front_tyre",
	"Rear Tyre":          "rear_tyre",
	"Fuel Capacity":      "fuel_capacity",
	"Make Model":         "make_model",
	"Cooling System":     "cooling_system",
	"Max Power":          "max_power",
	"Induction":          "induction",
	"Compression Ratio":  "compression_ratio",
	"Ignition":           "ignition",
	"Final Drive":        "final_drive",
	"Dry Weight":         "dry_weight",
	"Seat Height":        "seat_height",
	"Frame":              "frame",
	"Wheelbase":          "wheelbase",
	"Max Torque":         "max_torque",
	"Clutch":             "clutch",
	"Dimensions":         "dimensions",
	"Front Wheel Travel": "front_wheel_travel",
	"Lubrication":        "lubrication",
	"Rear Wheel Travel":  "rear_wheel_travel",
	"Ground Clearance":   "ground_clearance",
	"Top Speed":          "top_speed",
	"Exhaust":            "exhaust",
	"Wet Weight":         "wet_weight",
	"Wheels":             "wheels",
	"Rake":               "rake",
	"Trail":              "trail",
	"Battery":            "battery",
	"Rear Wheel":         "rear_wheel",
	"Front Wheel":        "front_wheel",
	"Spark Plug":         "spark_plug",
	"Gear Ratio":         "gear_ratio",
	"Colours":            "colours",
	"Oil Capacity":       "oil_capacity",
	"Rear Rim":           "rear_rim",
	"Front Rim":          "front_rim",
	"Gear Ratios":        "gear_ratios",
	"Engine Oil":         "engine_oil",
	"Cooling":            "cooling",
	"GVWR":               "gvwr",
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

	if err := db.Ping(); err != nil {
		log.Fatal("Failed to ping database:", err)
	}

	fmt.Println("✅ Connected to PostgreSQL database")

	// Create table
	if err := createTable(db); err != nil {
		log.Fatal("Failed to create table:", err)
	}

	// Import motorcycle specs
	if err := importSpecs(db); err != nil {
		log.Fatal("Failed to import specs:", err)
	}

	// Verify import
	if err := verifyImport(db); err != nil {
		log.Fatal("Failed to verify import:", err)
	}

	fmt.Println("🎉 Motorcycle specifications import completed successfully!")
}

func createTable(db *sql.DB) error {
	fmt.Println("📋 Creating motorcycle specifications table...")

	// Drop existing tables first
	_, err := db.Exec("DROP TABLE IF EXISTS motorcycle_catalog_specs_mapping CASCADE")
	if err != nil {
		fmt.Printf("⚠️ Warning dropping mapping table: %v\n", err)
	}
	
	_, err = db.Exec("DROP TABLE IF EXISTS motorcycle_specs CASCADE")
	if err != nil {
		fmt.Printf("⚠️ Warning dropping specs table: %v\n", err)
	}

	// Read the SQL file
	sqlBytes, err := ioutil.ReadFile("create_essential_specs_table.sql")
	if err != nil {
		return fmt.Errorf("error reading SQL file: %v", err)
	}

	_, err = db.Exec(string(sqlBytes))
	if err != nil {
		return fmt.Errorf("error creating table: %v", err)
	}

	fmt.Println("✅ Table created with top 50 specification fields")
	return nil
}

func importSpecs(db *sql.DB) error {
	fmt.Println("📂 Loading motorcycle data...")

	// Read motorcycle data
	dataBytes, err := ioutil.ReadFile("scraped_data/motorcycles/motorcyclespecs_2025-06-05T10-29-11-191Z.json")
	if err != nil {
		return fmt.Errorf("error reading motorcycle data: %v", err)
	}

	var scrapedData ScrapedData
	if err := json.Unmarshal(dataBytes, &scrapedData); err != nil {
		return fmt.Errorf("error parsing motorcycle data: %v", err)
	}

	fmt.Printf("📊 Found %d motorcycles to import\n", len(scrapedData.Motorcycles))

	// Build insert query with all top spec fields
	columns := []string{"manufacturer", "model", "title", "description", "content", "url", "scraped_at"}
	placeholders := []string{"$1", "$2", "$3", "$4", "$5", "$6", "$7"}
	
	// Add top spec field columns in consistent order
	specColumns := make([]string, 0, len(topSpecFields))
	for originalField := range topSpecFields {
		specColumns = append(specColumns, originalField)
	}
	
	paramCount := 8
	for _, originalField := range specColumns {
		sqlColumn := topSpecFields[originalField]
		columns = append(columns, sqlColumn)
		placeholders = append(placeholders, fmt.Sprintf("$%d", paramCount))
		paramCount++
	}
	
	// Add all_specifications column
	columns = append(columns, "all_specifications")
	placeholders = append(placeholders, fmt.Sprintf("$%d", paramCount))

	insertQuery := fmt.Sprintf(`
		INSERT INTO motorcycle_specs (%s) 
		VALUES (%s)
		ON CONFLICT (manufacturer, model, COALESCE(year, '')) 
		DO UPDATE SET 
			title = EXCLUDED.title,
			description = EXCLUDED.description,
			content = EXCLUDED.content,
			url = EXCLUDED.url,
			scraped_at = EXCLUDED.scraped_at,
			all_specifications = EXCLUDED.all_specifications,
			updated_at = CURRENT_TIMESTAMP
	`, strings.Join(columns, ", "), strings.Join(placeholders, ", "))

	successful := 0
	failed := 0

	for i, motorcycle := range scrapedData.Motorcycles {
		// Prepare base values
		values := []interface{}{
			motorcycle.Manufacturer,
			motorcycle.Model,
			motorcycle.Title,
			motorcycle.Description,
			motorcycle.Content,
			motorcycle.URL,
		}

		// Parse scraped_at
		var scrapedAt interface{}
		if motorcycle.ScrapedAt != "" {
			if t, err := time.Parse(time.RFC3339, motorcycle.ScrapedAt); err == nil {
				scrapedAt = t
			}
		}
		values = append(values, scrapedAt)

		// Add top specification values in consistent order
		for _, originalField := range specColumns {
			value := motorcycle.Specifications[originalField]
			if value == "" {
				values = append(values, nil)
			} else {
				values = append(values, strings.TrimSpace(value))
			}
		}

		// Add complete specifications as JSONB
		allSpecsJSON, _ := json.Marshal(motorcycle.Specifications)
		values = append(values, string(allSpecsJSON))

		// Execute insert
		_, err := db.Exec(insertQuery, values...)
		if err != nil {
			failed++
			if failed < 5 {
				fmt.Printf("❌ Error importing %s %s: %v\n", motorcycle.Manufacturer, motorcycle.Model, err)
			}
		} else {
			successful++
		}

		if (i+1)%100 == 0 {
			fmt.Printf("⏳ Processed %d/%d motorcycles...\n", i+1, len(scrapedData.Motorcycles))
		}
	}

	fmt.Printf("\n🎉 Import completed!\n")
	fmt.Printf("✅ Successfully imported: %d motorcycles\n", successful)
	fmt.Printf("❌ Failed imports: %d motorcycles\n", failed)

	return nil
}

func verifyImport(db *sql.DB) error {
	fmt.Println("\n📈 Verifying imported data...")

	// Total count
	var total int
	err := db.QueryRow("SELECT COUNT(*) FROM motorcycle_specs").Scan(&total)
	if err != nil {
		return err
	}
	fmt.Printf("📊 Total motorcycles in database: %d\n", total)

	// Top manufacturers
	rows, err := db.Query(`
		SELECT manufacturer, COUNT(*) as count 
		FROM motorcycle_specs 
		GROUP BY manufacturer 
		ORDER BY count DESC 
		LIMIT 10
	`)
	if err != nil {
		return err
	}
	defer rows.Close()

	fmt.Println("\nTop 10 manufacturers by model count:")
	for rows.Next() {
		var manufacturer string
		var count int
		if err := rows.Scan(&manufacturer, &count); err != nil {
			return err
		}
		fmt.Printf("  %s: %d models\n", manufacturer, count)
	}

	// Sample data verification
	var sampleTitle, sampleEngine, sampleCapacity string
	err = db.QueryRow(`
		SELECT title, engine, capacity 
		FROM motorcycle_specs 
		WHERE engine IS NOT NULL AND capacity IS NOT NULL 
		LIMIT 1
	`).Scan(&sampleTitle, &sampleEngine, &sampleCapacity)
	
	if err == nil {
		fmt.Printf("\nSample motorcycle data:\n")
		fmt.Printf("  Title: %s\n", sampleTitle)
		fmt.Printf("  Engine: %s\n", sampleEngine)
		fmt.Printf("  Capacity: %s\n", sampleCapacity)
	}

	return nil
}