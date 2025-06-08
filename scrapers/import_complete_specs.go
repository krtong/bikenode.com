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

	// Create complete table
	if err := createCompleteTable(db); err != nil {
		log.Fatal("Failed to create table:", err)
	}

	// Import motorcycle specs
	if err := importCompleteSpecs(db); err != nil {
		log.Fatal("Failed to import specs:", err)
	}

	fmt.Println("🎉 Complete motorcycle specifications import finished!")
}

func createCompleteTable(db *sql.DB) error {
	fmt.Println("📋 Creating complete motorcycle specifications table...")

	// Read the generated SQL file
	sqlBytes, err := ioutil.ReadFile("create_complete_motorcycle_specs_table.sql")
	if err != nil {
		return fmt.Errorf("error reading SQL file: %v", err)
	}

	_, err = db.Exec(string(sqlBytes))
	if err != nil {
		return fmt.Errorf("error creating table: %v", err)
	}

	fmt.Println("✅ Complete table created with all specification fields")
	return nil
}

func importCompleteSpecs(db *sql.DB) error {
	fmt.Println("📂 Loading motorcycle data...")

	// Read field mapping
	mappingBytes, err := ioutil.ReadFile("spec_field_mapping.json")
	if err != nil {
		return fmt.Errorf("error reading field mapping: %v", err)
	}

	var fieldMapping map[string]string
	if err := json.Unmarshal(mappingBytes, &fieldMapping); err != nil {
		return fmt.Errorf("error parsing field mapping: %v", err)
	}

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
	fmt.Printf("📋 Using %d specification field mappings\n", len(fieldMapping))

	// Build dynamic insert query
	columns := []string{"manufacturer", "model", "title", "description", "content", "url", "scraped_at"}
	placeholders := []string{"$1", "$2", "$3", "$4", "$5", "$6", "$7"}
	
	// Add all specification columns
	paramCount := 8
	for _, sqlColumn := range fieldMapping {
		columns = append(columns, sqlColumn)
		placeholders = append(placeholders, fmt.Sprintf("$%d", paramCount))
		paramCount++
	}

	insertQuery := fmt.Sprintf(`
		INSERT INTO motorcycle_specs_complete (%s) 
		VALUES (%s)
		ON CONFLICT (manufacturer, model, COALESCE(year, '')) 
		DO UPDATE SET updated_at = CURRENT_TIMESTAMP
	`, strings.Join(columns, ", "), strings.Join(placeholders, ", "))

	successful := 0
	failed := 0

	for i, motorcycle := range scrapedData.Motorcycles {
		// Prepare values array
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

		// Add all specification values in the same order as columns
		for originalField := range fieldMapping {
			value := motorcycle.Specifications[originalField]
			if value == "" {
				values = append(values, nil)
			} else {
				values = append(values, strings.TrimSpace(value))
			}
		}

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

	// Verify import
	var total int
	err = db.QueryRow("SELECT COUNT(*) FROM motorcycle_specs_complete").Scan(&total)
	if err != nil {
		return err
	}
	fmt.Printf("📊 Total motorcycles in database: %d\n", total)

	return nil
}