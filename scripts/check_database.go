package main

import (
	"fmt"
	"log"

	"bikenode.com/database"
	"github.com/joho/godotenv"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	// Connect to database
	db, err := database.GetConnection()
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	defer db.Close()

	fmt.Println("🗄️ DATABASE CONTENT CHECK")
	fmt.Println("========================")

	// Check bicycles table
	var bikeCount int
	err = db.Get(&bikeCount, "SELECT COUNT(*) FROM bicycles")
	if err != nil {
		fmt.Printf("❌ Error querying bicycles: %v\n", err)
	} else {
		fmt.Printf("📊 Bicycles in database: %d\n", bikeCount)
	}

	// Check for sample bikes
	if bikeCount > 0 {
		fmt.Println("\n🚲 Sample bikes from database:")
		rows, err := db.Query(`
			SELECT name, manufacturer, year, variant_id 
			FROM bicycles 
			LIMIT 5
		`)
		if err != nil {
			fmt.Printf("❌ Error getting sample bikes: %v\n", err)
		} else {
			defer rows.Close()
			for rows.Next() {
				var name, manufacturer, variantID string
				var year *int
				err := rows.Scan(&name, &manufacturer, &year, &variantID)
				if err != nil {
					fmt.Printf("❌ Error scanning row: %v\n", err)
					continue
				}
				yearStr := "Unknown"
				if year != nil {
					yearStr = fmt.Sprintf("%d", *year)
				}
				fmt.Printf("  • %s - %s (%s) [%s]\n", name, manufacturer, yearStr, variantID)
			}
		}
	}

	// Check manufacturers
	var manufacturerCount int
	err = db.Get(&manufacturerCount, "SELECT COUNT(DISTINCT manufacturer) FROM bicycles WHERE manufacturer IS NOT NULL AND manufacturer != ''")
	if err != nil {
		fmt.Printf("❌ Error counting manufacturers: %v\n", err)
	} else {
		fmt.Printf("\n🏭 Unique manufacturers: %d\n", manufacturerCount)
	}

	// Check years
	var yearCount int
	err = db.Get(&yearCount, "SELECT COUNT(DISTINCT year) FROM bicycles WHERE year IS NOT NULL")
	if err != nil {
		fmt.Printf("❌ Error counting years: %v\n", err)
	} else {
		fmt.Printf("📅 Unique years: %d\n", yearCount)
	}

	// Check table schema
	fmt.Println("\n📋 Table structure:")
	rows, err := db.Query(`
		SELECT column_name, data_type 
		FROM information_schema.columns 
		WHERE table_name = 'bicycles' 
		ORDER BY ordinal_position
	`)
	if err != nil {
		fmt.Printf("❌ Error getting table structure: %v\n", err)
	} else {
		defer rows.Close()
		for rows.Next() {
			var columnName, dataType string
			err := rows.Scan(&columnName, &dataType)
			if err != nil {
				continue
			}
			fmt.Printf("  • %s (%s)\n", columnName, dataType)
		}
	}
}
