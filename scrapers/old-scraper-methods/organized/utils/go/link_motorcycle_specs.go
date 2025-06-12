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

	// First, add spec_id column if it doesn't exist
	addSpecIdColumn(db)

	// Clear existing mappings
	clearExistingMappings(db)

	// Phase 1: Exact matches (make + model + year)
	exactMatchesWithYear := linkExactMatchesWithYear(db)
	
	// Phase 2: Exact matches (make + model, ignoring year)
	exactMatches := linkExactMatches(db)
	
	// Phase 3: Fuzzy matches for common patterns
	fuzzyMatches := linkFuzzyMatches(db)

	// Summary
	fmt.Println("\n📊 FINAL SUMMARY:")
	fmt.Printf("  Phase 1 - Exact matches with year: %d motorcycles linked\n", exactMatchesWithYear)
	fmt.Printf("  Phase 2 - Exact matches without year: %d motorcycles linked\n", exactMatches)
	fmt.Printf("  Phase 3 - Fuzzy matches: %d motorcycles linked\n", fuzzyMatches)
	fmt.Printf("  TOTAL: %d motorcycles linked to specs\n", exactMatchesWithYear+exactMatches+fuzzyMatches)

	// Show sample results
	showSampleResults(db)
}

func addSpecIdColumn(db *sql.DB) {
	fmt.Println("\n🔧 Checking spec_id column...")
	
	// Check if column exists
	var exists bool
	err := db.QueryRow(`
		SELECT EXISTS (
			SELECT 1 FROM information_schema.columns 
			WHERE table_name = 'motorcycles' AND column_name = 'spec_id'
		)
	`).Scan(&exists)
	
	if err != nil {
		log.Printf("Error checking column: %v", err)
		return
	}

	if !exists {
		fmt.Println("Adding spec_id column to motorcycles table...")
		_, err = db.Exec(`ALTER TABLE motorcycles ADD COLUMN spec_id INTEGER REFERENCES motorcycle_specs(id)`)
		if err != nil {
			log.Printf("Error adding column: %v", err)
		} else {
			fmt.Println("✅ spec_id column added")
		}
	} else {
		fmt.Println("✅ spec_id column already exists")
		// Change type if it's UUID to INTEGER
		_, err = db.Exec(`ALTER TABLE motorcycles ALTER COLUMN spec_id TYPE INTEGER USING NULL`)
		if err != nil {
			log.Printf("Note: Column type conversion attempted: %v", err)
		}
	}
}

func clearExistingMappings(db *sql.DB) {
	fmt.Println("\n🧹 Clearing existing mappings...")
	result, err := db.Exec(`UPDATE motorcycles SET spec_id = NULL WHERE spec_id IS NOT NULL`)
	if err != nil {
		log.Printf("Error clearing mappings: %v", err)
		return
	}
	
	affected, _ := result.RowsAffected()
	fmt.Printf("  Cleared %d existing mappings\n", affected)
}

func linkExactMatchesWithYear(db *sql.DB) int64 {
	fmt.Println("\n🔗 Phase 1: Linking exact matches with year...")
	
	result, err := db.Exec(`
		UPDATE motorcycles m
		SET spec_id = s.id
		FROM motorcycle_specs s
		WHERE LOWER(TRIM(m.make)) = LOWER(TRIM(s.manufacturer))
		  AND LOWER(TRIM(m.model)) = LOWER(TRIM(s.model))
		  AND m.year = s.year
		  AND m.spec_id IS NULL
	`)
	
	if err != nil {
		log.Printf("Error in phase 1: %v", err)
		return 0
	}
	
	affected, _ := result.RowsAffected()
	fmt.Printf("  ✅ Linked %d motorcycles with exact year matches\n", affected)
	return affected
}

func linkExactMatches(db *sql.DB) int64 {
	fmt.Println("\n🔗 Phase 2: Linking exact matches without year...")
	
	// For models without year in specs, or where years don't match
	result, err := db.Exec(`
		UPDATE motorcycles m
		SET spec_id = s.id
		FROM (
			SELECT DISTINCT ON (manufacturer, model) 
				id, manufacturer, model, year
			FROM motorcycle_specs
			ORDER BY manufacturer, model, year DESC NULLS LAST
		) s
		WHERE LOWER(TRIM(m.make)) = LOWER(TRIM(s.manufacturer))
		  AND LOWER(TRIM(m.model)) = LOWER(TRIM(s.model))
		  AND m.spec_id IS NULL
	`)
	
	if err != nil {
		log.Printf("Error in phase 2: %v", err)
		return 0
	}
	
	affected, _ := result.RowsAffected()
	fmt.Printf("  ✅ Linked %d motorcycles without year match\n", affected)
	return affected
}

func linkFuzzyMatches(db *sql.DB) int64 {
	fmt.Println("\n🔗 Phase 3: Fuzzy matching for common patterns...")
	
	totalLinked := int64(0)
	
	// Pattern 1: Model contains spec model or vice versa
	fmt.Println("  Trying substring matches...")
	result, err := db.Exec(`
		UPDATE motorcycles m
		SET spec_id = s.id
		FROM (
			SELECT DISTINCT ON (manufacturer, model) 
				id, manufacturer, model
			FROM motorcycle_specs
			WHERE LENGTH(model) > 3
		) s
		WHERE LOWER(TRIM(m.make)) = LOWER(TRIM(s.manufacturer))
		  AND (
		      LOWER(m.model) LIKE '%' || LOWER(s.model) || '%'
		      OR LOWER(s.model) LIKE '%' || LOWER(m.model) || '%'
		  )
		  AND m.spec_id IS NULL
		  AND LENGTH(m.model) > 3
	`)
	
	if err == nil {
		affected, _ := result.RowsAffected()
		fmt.Printf("    Substring matches: %d\n", affected)
		totalLinked += affected
	}
	
	// Pattern 2: Remove common suffixes and try again
	fmt.Println("  Trying without common suffixes...")
	suffixes := []string{" Limited", " Special", " Edition", " Classic", " Custom", " Standard", " Deluxe", " Sport"}
	
	for _, suffix := range suffixes {
		query := fmt.Sprintf(`
			UPDATE motorcycles m
			SET spec_id = s.id
			FROM motorcycle_specs s
			WHERE LOWER(TRIM(m.make)) = LOWER(TRIM(s.manufacturer))
			  AND LOWER(REPLACE(m.model, '%s', '')) = LOWER(REPLACE(s.model, '%s', ''))
			  AND m.spec_id IS NULL
		`, suffix, suffix)
		
		result, err := db.Exec(query)
		if err == nil {
			affected, _ := result.RowsAffected()
			if affected > 0 {
				fmt.Printf("    Without '%s': %d\n", suffix, affected)
				totalLinked += affected
			}
		}
	}
	
	return totalLinked
}

func showSampleResults(db *sql.DB) {
	fmt.Println("\n📋 Sample linked motorcycles:")
	
	rows, err := db.Query(`
		SELECT m.id, m.year, m.make, m.model, m.spec_id, s.manufacturer, s.model as spec_model
		FROM motorcycles m
		JOIN motorcycle_specs s ON m.spec_id = s.id
		ORDER BY m.make, m.model
		LIMIT 20
	`)
	
	if err != nil {
		log.Printf("Error getting samples: %v", err)
		return
	}
	defer rows.Close()
	
	for rows.Next() {
		var motoID string
		var year int
		var make, model string
		var specID int
		var specMfg, specModel string
		
		rows.Scan(&motoID, &year, &make, &model, &specID, &specMfg, &specModel)
		fmt.Printf("  %d %s %s → Spec #%d: %s %s\n", year, make, model, specID, specMfg, specModel)
	}
	
	// Count total linked
	var totalLinked int
	db.QueryRow("SELECT COUNT(*) FROM motorcycles WHERE spec_id IS NOT NULL").Scan(&totalLinked)
	
	var totalCatalog int
	db.QueryRow("SELECT COUNT(*) FROM motorcycles").Scan(&totalCatalog)
	
	percentage := float64(totalLinked) / float64(totalCatalog) * 100
	fmt.Printf("\n📊 Coverage: %d of %d motorcycles have specs (%.1f%%)\n", totalLinked, totalCatalog, percentage)
}