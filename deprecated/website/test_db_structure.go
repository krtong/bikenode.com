package main

import (
	"fmt"
	"log"

	"bikenode.com/database"
	"github.com/joho/godotenv"
)

func main() {
	// Load environment
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found")
	}

	// Connect to database
	db, err := database.GetConnection()
	if err != nil {
		log.Fatal("Failed to connect:", err)
	}
	defer db.Close()

	fmt.Println("=== DATABASE STRUCTURE CHECK ===")

	// Get sample bike data
	fmt.Println("1. Sample bike data:")
	rows, err := db.Query("SELECT name, manufacturer, year, variant_id, price FROM bicycles LIMIT 2")
	if err != nil {
		log.Fatal("Query failed:", err)
	}
	defer rows.Close()

	for rows.Next() {
		var name, manufacturer, variantID, price *string
		var year *int
		err := rows.Scan(&name, &manufacturer, &year, &variantID, &price)
		if err != nil {
			log.Fatal("Scan failed:", err)
		}

		nameStr := "NULL"
		if name != nil {
			nameStr = *name
		}
		mfgStr := "NULL"
		if manufacturer != nil {
			mfgStr = *manufacturer
		}
		yearStr := "NULL"
		if year != nil {
			yearStr = fmt.Sprintf("%d", *year)
		}
		varStr := "NULL"
		if variantID != nil {
			varStr = *variantID
		}
		priceStr := "NULL"
		if price != nil {
			priceStr = *price
		}

		fmt.Printf("  • %s - %s (%s) [%s] Price: %s\n", nameStr, mfgStr, yearStr, varStr, priceStr)
	}

	// Test simple search
	fmt.Println("\n2. Testing simple search:")
	var count int
	err = db.Get(&count, "SELECT COUNT(*) FROM bicycles WHERE manufacturer ILIKE $1", "%canyon%")
	if err != nil {
		log.Fatal("Count failed:", err)
	}
	fmt.Printf("  • Bikes with 'canyon' in manufacturer: %d\n", count)
}
