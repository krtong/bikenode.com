package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
)

func analyzeBicycleData() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found")
	}

	// Database connection parameters
	dbHost := os.Getenv("DB_HOST")
	if dbHost == "" {
		dbHost = "localhost"
	}
	dbPort := os.Getenv("DB_PORT")
	if dbPort == "" {
		dbPort = "5432"
	}
	dbUser := os.Getenv("DB_USER")
	if dbUser == "" {
		dbUser = "postgres"
	}
	dbPassword := os.Getenv("DB_PASSWORD")
	if dbPassword == "" {
		dbPassword = "postgres"
	}
	dbName := os.Getenv("DB_NAME")
	if dbName == "" {
		dbName = "bikenode"
	}

	connStr := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		dbHost, dbPort, dbUser, dbPassword, dbName)

	db, err := sql.Open("postgres", connStr)
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	defer db.Close()

	// Test connection
	if err := db.Ping(); err != nil {
		log.Fatal("Failed to ping database:", err)
	}

	fmt.Println("Connected to database successfully!")
	fmt.Println("================================================================================")

	// 1. First, let's see the table structure
	fmt.Println("\n1. Table structure for bicycle_data_make_model_year_specs:")
	query := `
		SELECT column_name, data_type, character_maximum_length
		FROM information_schema.columns
		WHERE table_name = 'bicycle_data_make_model_year_specs'
		ORDER BY ordinal_position;
	`
	rows, err := db.Query(query)
	if err != nil {
		log.Printf("Error querying table structure: %v", err)
	} else {
		defer rows.Close()
		for rows.Next() {
			var colName, dataType string
			var maxLength sql.NullInt64
			rows.Scan(&colName, &dataType, &maxLength)
			if maxLength.Valid {
				fmt.Printf("  - %s: %s(%d)\n", colName, dataType, maxLength.Int64)
			} else {
				fmt.Printf("  - %s: %s\n", colName, dataType)
			}
		}
	}

	// 2. Query 3T brand data
	fmt.Println("\n2. Querying 3T brand bicycles:")
	query = `
		SELECT 
			keyid,
			url,
			extracted_data
		FROM bicycle_data_make_model_year_specs
		WHERE LOWER(extracted_data->>'manufacturer') = '3t'
		ORDER BY (extracted_data->>'year')::int DESC, extracted_data->>'model'
		LIMIT 10;
	`
	
	rows, err = db.Query(query)
	if err != nil {
		log.Printf("Error querying 3T bicycles: %v", err)
		return
	}
	defer rows.Close()

	count := 0
	for rows.Next() {
		var keyid int
		var url string
		var extractedData json.RawMessage

		err := rows.Scan(&keyid, &url, &extractedData)
		if err != nil {
			log.Printf("Error scanning row: %v", err)
			continue
		}

		count++
		fmt.Printf("\n--- Entry %d ---\n", count)
		fmt.Printf("KeyID: %d\n", keyid)
		fmt.Printf("URL: %s\n", url)

		// Parse and display extracted_data
		var data map[string]interface{}
		if err := json.Unmarshal(extractedData, &data); err != nil {
			fmt.Printf("Error parsing extracted_data: %v\n", err)
		} else {
			fmt.Println("Extracted Data Fields:")
			// Show key fields
			if manufacturer, ok := data["manufacturer"]; ok {
				fmt.Printf("  - manufacturer: %v\n", manufacturer)
			}
			if modelName, ok := data["model"]; ok {
				fmt.Printf("  - model: %v\n", modelName)
			}
			if bikeYear, ok := data["year"]; ok {
				fmt.Printf("  - year: %v\n", bikeYear)
			}
			if variant, ok := data["variant"]; ok {
				fmt.Printf("  - variant: %v\n", variant)
			}
			if bikeType, ok := data["type"]; ok {
				fmt.Printf("  - type: %v\n", bikeType)
			}
			if category, ok := data["category"]; ok {
				fmt.Printf("  - category: %v\n", category)
			}
			
			// Pretty print the full JSON
			prettyJSON, _ := json.MarshalIndent(data, "  ", "  ")
			fmt.Printf("  Full extracted_data:\n%s\n", string(prettyJSON))
		}
	}

	if count == 0 {
		fmt.Println("No 3T bicycles found in the database.")
	}

	// 3. Look for patterns in model naming
	fmt.Println("\n3. Analyzing model naming patterns across different brands:")
	query = `
		SELECT 
			extracted_data->>'manufacturer' as manufacturer,
			extracted_data->>'model' as model,
			COUNT(*) as count
		FROM bicycle_data_make_model_year_specs
		WHERE extracted_data->>'manufacturer' IS NOT NULL
		AND extracted_data->>'model' IS NOT NULL
		GROUP BY extracted_data->>'manufacturer', extracted_data->>'model'
		HAVING COUNT(*) > 1
		ORDER BY COUNT(*) DESC
		LIMIT 20;
	`
	
	rows, err = db.Query(query)
	if err != nil {
		log.Printf("Error analyzing patterns: %v", err)
		return
	}
	defer rows.Close()

	fmt.Println("\nModels that appear multiple times (likely base models with variants):")
	for rows.Next() {
		var manufacturer, model string
		var count int
		rows.Scan(&manufacturer, &model, &count)
		fmt.Printf("  - %s %s: %d occurrences\n", manufacturer, model, count)
	}

	// 4. Check for variant field usage
	fmt.Println("\n4. Checking variant field usage:")
	query = `
		SELECT 
			COUNT(*) as total_records,
			COUNT(CASE WHEN extracted_data->>'variant' IS NOT NULL AND extracted_data->>'variant' != '' THEN 1 END) as records_with_variant,
			COUNT(DISTINCT extracted_data->>'variant') as unique_variants
		FROM bicycle_data_make_model_year_specs;
	`
	
	var totalRecords, recordsWithVariant, uniqueVariants int
	err = db.QueryRow(query).Scan(&totalRecords, &recordsWithVariant, &uniqueVariants)
	if err != nil {
		log.Printf("Error checking variant usage: %v", err)
	} else {
		fmt.Printf("Total records: %d\n", totalRecords)
		fmt.Printf("Records with variant field: %d (%.2f%%)\n", recordsWithVariant, float64(recordsWithVariant)/float64(totalRecords)*100)
		fmt.Printf("Unique variant values: %d\n", uniqueVariants)
	}

	// 5. Sample some variant values
	fmt.Println("\n5. Sample variant values:")
	query = `
		SELECT DISTINCT extracted_data->>'variant' as variant
		FROM bicycle_data_make_model_year_specs
		WHERE extracted_data->>'variant' IS NOT NULL 
		AND extracted_data->>'variant' != ''
		ORDER BY variant
		LIMIT 20;
	`
	
	rows, err = db.Query(query)
	if err != nil {
		log.Printf("Error sampling variants: %v", err)
		return
	}
	defer rows.Close()

	for rows.Next() {
		var variant string
		rows.Scan(&variant)
		fmt.Printf("  - %s\n", variant)
	}

	// 6. Look for naming patterns that might indicate variants
	fmt.Println("\n6. Analyzing model names for variant patterns:")
	query = `
		SELECT 
			extracted_data->>'manufacturer' as manufacturer,
			extracted_data->>'model' as model,
			extracted_data->>'year' as year
		FROM bicycle_data_make_model_year_specs
		WHERE extracted_data->>'model' ~ '(Comp|Elite|Expert|Pro|Race|Sport|Base|SL|Carbon|Alloy|Disc|Rim)'
		LIMIT 20;
	`
	
	rows, err = db.Query(query)
	if err != nil {
		log.Printf("Error analyzing model patterns: %v", err)
		return
	}
	defer rows.Close()

	fmt.Println("\nModels with common variant suffixes:")
	for rows.Next() {
		var manufacturer, model, year string
		rows.Scan(&manufacturer, &model, &year)
		fmt.Printf("  - %s %s %s\n", manufacturer, year, model)
	}
}

func main() {
	analyzeBicycleData()
}