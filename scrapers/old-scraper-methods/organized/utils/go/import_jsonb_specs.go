package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"os"
	"regexp"
	"strconv"
	"time"

	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
)

type MotorcycleSpec struct {
	Title          string            `json:"title"`
	Description    string            `json:"description"`
	Specifications map[string]string `json:"specifications"`
	Content        string            `json:"content"`
	Manufacturer   string            `json:"manufacturer"`
	Model          string            `json:"model"`
	URL            string            `json:"url"`
	ScrapedAt      string            `json:"scraped_at"`
}

type ScrapedData struct {
	ScrapedAt        string           `json:"scraped_at"`
	TotalMotorcycles int              `json:"total_motorcycles"`
	Motorcycles      []MotorcycleSpec `json:"motorcycles"`
}

func main() {
	// Load environment variables
	if err := godotenv.Load("../.env"); err != nil {
		log.Println("No .env file found, using system environment")
	}

	// Database connection - use environment variable or default
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgres://postgres:@localhost/bikenode?sslmode=disable"
	}
	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	defer db.Close()

	fmt.Println("✅ Connected to PostgreSQL database")

	// Create table
	if err := createTable(db); err != nil {
		log.Fatal("Failed to create table:", err)
	}

	// Import specs
	if err := importSpecs(db); err != nil {
		log.Fatal("Failed to import specs:", err)
	}

	// Verify and show sample queries
	if err := verifyAndDemo(db); err != nil {
		log.Fatal("Failed to verify:", err)
	}

	fmt.Println("\n🎉 JSONB-based motorcycle specs import completed!")
}

func createTable(db *sql.DB) error {
	fmt.Println("📋 Creating JSONB-based motorcycle specifications table...")

	// Drop existing tables
	db.Exec("DROP TABLE IF EXISTS motorcycle_catalog_specs_mapping CASCADE")
	db.Exec("DROP TABLE IF EXISTS motorcycle_specs CASCADE")
	db.Exec("DROP TABLE IF EXISTS motorcycle_specs_complete CASCADE")

	// Read and execute SQL
	sqlBytes, err := ioutil.ReadFile("create_jsonb_specs_table.sql")
	if err != nil {
		return fmt.Errorf("error reading SQL file: %v", err)
	}

	_, err = db.Exec(string(sqlBytes))
	if err != nil {
		return fmt.Errorf("error creating table: %v", err)
	}

	fmt.Println("✅ Created optimized JSONB table structure")
	return nil
}

func extractYear(specs map[string]string) *int {
	// Try common year fields
	yearFields := []string{"Year", "Model Year", "year", "model_year"}
	
	for _, field := range yearFields {
		if value, exists := specs[field]; exists {
			// Extract 4-digit year
			re := regexp.MustCompile(`\b(19|20)\d{2}\b`)
			match := re.FindString(value)
			if match != "" {
				if year, err := strconv.Atoi(match); err == nil {
					return &year
				}
			}
		}
	}
	return nil
}

func importSpecs(db *sql.DB) error {
	fmt.Println("\n📂 Loading motorcycle data...")

	// Read data
	dataBytes, err := ioutil.ReadFile("scraped_data/motorcycles/motorcyclespecs_2025-06-05T10-29-11-191Z.json")
	if err != nil {
		return fmt.Errorf("error reading data: %v", err)
	}

	var data ScrapedData
	if err := json.Unmarshal(dataBytes, &data); err != nil {
		return fmt.Errorf("error parsing data: %v", err)
	}

	fmt.Printf("📊 Found %d motorcycles to import\n", len(data.Motorcycles))

	insertQuery := `
		INSERT INTO motorcycle_specs (
			manufacturer, model, title, description, content, 
			url, scraped_at, year, specifications
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		ON CONFLICT (manufacturer, model, COALESCE(year, 0)) 
		DO UPDATE SET 
			specifications = EXCLUDED.specifications,
			updated_at = CURRENT_TIMESTAMP
	`

	successful := 0
	failed := 0
	emptySpecs := 0

	for i, motorcycle := range data.Motorcycles {
		// Skip if no specifications
		if len(motorcycle.Specifications) == 0 {
			emptySpecs++
			continue
		}

		// Extract year from specifications
		year := extractYear(motorcycle.Specifications)

		// Parse scraped_at
		var scrapedAt interface{}
		if motorcycle.ScrapedAt != "" {
			if t, err := time.Parse(time.RFC3339, motorcycle.ScrapedAt); err == nil {
				scrapedAt = t
			}
		}

		// Convert specifications to JSON
		specsJSON, _ := json.Marshal(motorcycle.Specifications)

		// Execute insert
		_, err := db.Exec(insertQuery,
			motorcycle.Manufacturer,
			motorcycle.Model,
			motorcycle.Title,
			motorcycle.Description,
			motorcycle.Content,
			motorcycle.URL,
			scrapedAt,
			year,
			string(specsJSON),
		)

		if err != nil {
			failed++
			if failed <= 5 {
				fmt.Printf("❌ Error: %v\n", err)
			}
		} else {
			successful++
		}

		if (i+1)%500 == 0 {
			fmt.Printf("⏳ Processed %d/%d motorcycles...\n", i+1, len(data.Motorcycles))
		}
	}

	fmt.Printf("\n📈 Import Results:\n")
	fmt.Printf("✅ Successfully imported: %d motorcycles\n", successful)
	fmt.Printf("❌ Failed imports: %d motorcycles\n", failed)
	fmt.Printf("⏭️  Skipped (no specs): %d motorcycles\n", emptySpecs)

	return nil
}

func verifyAndDemo(db *sql.DB) error {
	fmt.Println("\n🔍 Verifying import and demonstrating JSONB queries...")

	// Total count
	var total int
	db.QueryRow("SELECT COUNT(*) FROM motorcycle_specs").Scan(&total)
	fmt.Printf("\n📊 Total motorcycles in database: %d\n", total)

	// Show JSONB query examples
	fmt.Println("\n📋 Sample JSONB queries:")

	// Query 1: Find motorcycles with specific engine type
	fmt.Println("\n1. Motorcycles with V-twin engines:")
	rows, _ := db.Query(`
		SELECT manufacturer, model, specifications->>'Engine' as engine
		FROM motorcycle_specs 
		WHERE specifications->>'Engine' ILIKE '%v-twin%'
		LIMIT 5
	`)
	defer rows.Close()
	
	for rows.Next() {
		var mfg, model, engine string
		rows.Scan(&mfg, &model, &engine)
		fmt.Printf("   %s %s: %s\n", mfg, model, engine)
	}

	// Query 2: Find high-capacity motorcycles
	fmt.Println("\n2. Motorcycles with 1000cc+ capacity:")
	rows2, _ := db.Query(`
		SELECT manufacturer, model, specifications->>'Capacity' as capacity
		FROM motorcycle_specs 
		WHERE specifications->>'Capacity' LIKE '%1000 cc%' 
		   OR specifications->>'Capacity' LIKE '%1___ cc%'
		LIMIT 5
	`)
	defer rows2.Close()
	
	for rows2.Next() {
		var mfg, model, capacity string
		rows2.Scan(&mfg, &model, &capacity)
		fmt.Printf("   %s %s: %s\n", mfg, model, capacity)
	}

	// Query 3: Aggregate by specification presence
	fmt.Println("\n3. Top 10 most common specification fields:")
	var result string
	db.QueryRow(`
		SELECT jsonb_object_agg(key, count)
		FROM (
			SELECT key, COUNT(*) as count
			FROM motorcycle_specs, jsonb_each_text(specifications)
			GROUP BY key
			ORDER BY count DESC
			LIMIT 10
		) t
	`).Scan(&result)
	
	var topFields map[string]int
	json.Unmarshal([]byte(result), &topFields)
	for field, count := range topFields {
		fmt.Printf("   %s: %d motorcycles\n", field, count)
	}

	return nil
}