package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
)

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

	fmt.Println("✅ Connected to PostgreSQL database")

	// Analyze motorcycles table
	fmt.Println("\n📊 Analyzing existing motorcycles table...")
	analyzeMotorcyclesTable(db)

	// Analyze specs table
	fmt.Println("\n📊 Analyzing motorcycle_specs table...")
	analyzeSpecsTable(db)

	// Find matching patterns
	fmt.Println("\n🔍 Sample matching analysis...")
	findSampleMatches(db)
}

func analyzeMotorcyclesTable(db *sql.DB) {
	// Check table structure
	rows, err := db.Query(`
		SELECT column_name, data_type, is_nullable
		FROM information_schema.columns
		WHERE table_name = 'motorcycles'
		ORDER BY ordinal_position
	`)
	if err != nil {
		log.Printf("Error checking motorcycles table: %v", err)
		return
	}
	defer rows.Close()

	fmt.Println("Motorcycles table structure:")
	for rows.Next() {
		var colName, dataType, nullable string
		rows.Scan(&colName, &dataType, &nullable)
		fmt.Printf("  - %s: %s (nullable: %s)\n", colName, dataType, nullable)
	}

	// Get sample data and count
	var count int
	db.QueryRow("SELECT COUNT(*) FROM motorcycles").Scan(&count)
	fmt.Printf("\nTotal motorcycles: %d\n", count)

	// Get top manufacturers
	fmt.Println("\nTop 10 manufacturers in motorcycles table:")
	rows2, _ := db.Query(`
		SELECT make, COUNT(*) as count 
		FROM motorcycles 
		GROUP BY make 
		ORDER BY count DESC 
		LIMIT 10
	`)
	defer rows2.Close()

	for rows2.Next() {
		var make string
		var cnt int
		rows2.Scan(&make, &cnt)
		fmt.Printf("  %s: %d\n", make, cnt)
	}

	// Sample entries
	fmt.Println("\nSample motorcycles entries:")
	rows3, _ := db.Query(`
		SELECT id, year, make, model, package
		FROM motorcycles 
		LIMIT 5
	`)
	defer rows3.Close()

	for rows3.Next() {
		var id string
		var year int
		var make, model string
		var pkg sql.NullString
		rows3.Scan(&id, &year, &make, &model, &pkg)
		pkgStr := ""
		if pkg.Valid {
			pkgStr = fmt.Sprintf(" (%s)", pkg.String)
		}
		fmt.Printf("  %s: %d %s %s%s\n", id, year, make, model, pkgStr)
	}
}

func analyzeSpecsTable(db *sql.DB) {
	// Count and top manufacturers
	var count int
	db.QueryRow("SELECT COUNT(*) FROM motorcycle_specs").Scan(&count)
	fmt.Printf("Total specs: %d\n", count)

	fmt.Println("\nTop 10 manufacturers in specs table:")
	rows, _ := db.Query(`
		SELECT manufacturer, COUNT(*) as count 
		FROM motorcycle_specs 
		GROUP BY manufacturer 
		ORDER BY count DESC 
		LIMIT 10
	`)
	defer rows.Close()

	for rows.Next() {
		var manufacturer string
		var cnt int
		rows.Scan(&manufacturer, &cnt)
		fmt.Printf("  %s: %d\n", manufacturer, cnt)
	}

	// Sample entries
	fmt.Println("\nSample motorcycle_specs entries:")
	rows2, _ := db.Query(`
		SELECT id, manufacturer, model, year
		FROM motorcycle_specs 
		WHERE year IS NOT NULL
		LIMIT 5
	`)
	defer rows2.Close()

	for rows2.Next() {
		var id int
		var manufacturer, model string
		var year sql.NullInt64
		rows2.Scan(&id, &manufacturer, &model, &year)
		yearStr := "NULL"
		if year.Valid {
			yearStr = fmt.Sprintf("%d", year.Int64)
		}
		fmt.Printf("  %d: %s %s (year: %s)\n", id, manufacturer, model, yearStr)
	}
}

func findSampleMatches(db *sql.DB) {
	// Direct matches on make/manufacturer
	fmt.Println("\n1. Direct manufacturer matches:")
	rows, _ := db.Query(`
		SELECT DISTINCT m.make, COUNT(DISTINCT m.id) as catalog_count, COUNT(DISTINCT s.id) as spec_count
		FROM motorcycles m
		JOIN motorcycle_specs s ON LOWER(m.make) = LOWER(s.manufacturer)
		GROUP BY m.make
		ORDER BY catalog_count DESC
		LIMIT 10
	`)
	defer rows.Close()

	for rows.Next() {
		var make string
		var catalogCount, specCount int
		rows.Scan(&make, &catalogCount, &specCount)
		fmt.Printf("  %s: %d catalog entries, %d spec entries\n", make, catalogCount, specCount)
	}

	// Sample exact matches
	fmt.Println("\n2. Sample exact matches (make + model):")
	rows2, _ := db.Query(`
		SELECT m.id, m.year, m.make, m.model, s.id as spec_id
		FROM motorcycles m
		JOIN motorcycle_specs s ON 
			LOWER(m.make) = LOWER(s.manufacturer) AND
			LOWER(m.model) = LOWER(s.model)
		LIMIT 10
	`)
	defer rows2.Close()

	matchCount := 0
	for rows2.Next() {
		var catalogID string
		var year int
		var make, model string
		var specID int
		rows2.Scan(&catalogID, &year, &make, &model, &specID)
		fmt.Printf("  Catalog %s: %d %s %s → Spec ID %d\n", catalogID, year, make, model, specID)
		matchCount++
	}

	// Count potential matches
	var exactMatches int
	db.QueryRow(`
		SELECT COUNT(DISTINCT m.id)
		FROM motorcycles m
		JOIN motorcycle_specs s ON 
			LOWER(m.make) = LOWER(s.manufacturer) AND
			LOWER(m.model) = LOWER(s.model)
	`).Scan(&exactMatches)

	fmt.Printf("\n📊 Match Statistics:\n")
	fmt.Printf("  Exact matches (make + model): %d motorcycles\n", exactMatches)

	// Check for year matches
	var yearMatches int
	db.QueryRow(`
		SELECT COUNT(DISTINCT m.id)
		FROM motorcycles m
		JOIN motorcycle_specs s ON 
			LOWER(m.make) = LOWER(s.manufacturer) AND
			LOWER(m.model) = LOWER(s.model) AND
			m.year = s.year
	`).Scan(&yearMatches)
	fmt.Printf("  Exact matches with year: %d motorcycles\n", yearMatches)

	// Fuzzy match potential
	fmt.Println("\n3. Fuzzy match examples (partial model matches):")
	rows3, _ := db.Query(`
		SELECT m.make, m.model, s.manufacturer, s.model
		FROM motorcycles m
		JOIN motorcycle_specs s ON 
			LOWER(m.make) = LOWER(s.manufacturer) AND
			(LOWER(s.model) LIKE '%' || LOWER(m.model) || '%' OR
			 LOWER(m.model) LIKE '%' || LOWER(s.model) || '%')
		WHERE LOWER(m.model) != LOWER(s.model)
		LIMIT 5
	`)
	defer rows3.Close()

	for rows3.Next() {
		var catalogMake, catalogModel, specManufacturer, specModel string
		rows3.Scan(&catalogMake, &catalogModel, &specManufacturer, &specModel)
		fmt.Printf("  Catalog: %s %s ↔ Spec: %s %s\n", catalogMake, catalogModel, specManufacturer, specModel)
	}
}