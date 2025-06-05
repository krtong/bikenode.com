package main

import (
	"database/sql"
	"encoding/csv"
	"fmt"
	"io"
	"log"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
)

func main() {
	// Load environment variables
	if err := godotenv.Load("../website/.env"); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	// Connect to database
	db, err := connectDB()
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	defer db.Close()

	// Open CSV file
	file, err := os.Open("../database/data/motorcycles.csv")
	if err != nil {
		log.Fatal("Failed to open CSV file:", err)
	}
	defer file.Close()

	// Create CSV reader
	reader := csv.NewReader(file)

	// Read header
	header, err := reader.Read()
	if err != nil {
		log.Fatal("Failed to read header:", err)
	}
	log.Printf("CSV Header: %v", header)

	// Prepare insert statement
	stmt, err := db.Prepare(`
		INSERT INTO motorcycles (id, year, make, model, package, category, engine, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		ON CONFLICT (id) DO UPDATE SET
			year = EXCLUDED.year,
			make = EXCLUDED.make,
			model = EXCLUDED.model,
			package = EXCLUDED.package,
			category = EXCLUDED.category,
			engine = EXCLUDED.engine,
			updated_at = EXCLUDED.updated_at
	`)
	if err != nil {
		log.Fatal("Failed to prepare statement:", err)
	}
	defer stmt.Close()

	// Read and insert data
	count := 0
	errorCount := 0
	for {
		record, err := reader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			log.Printf("Error reading record: %v", err)
			errorCount++
			continue
		}

		// Parse year
		year, err := strconv.Atoi(record[0])
		if err != nil {
			log.Printf("Invalid year '%s': %v", record[0], err)
			errorCount++
			continue
		}

		// Prepare nullable fields
		var packagePtr, categoryPtr, enginePtr *string
		if record[3] != "" {
			packagePtr = &record[3]
		}
		if record[4] != "" {
			categoryPtr = &record[4]
		}
		if record[5] != "" {
			enginePtr = &record[5]
		}

		// Generate UUID based on make, model, year, and package for consistency
		id := generateDeterministicUUID(record[1], record[2], year, record[3])
		now := time.Now()

		// Insert record
		_, err = stmt.Exec(id, year, record[1], record[2], packagePtr, categoryPtr, enginePtr, now, now)
		if err != nil {
			log.Printf("Failed to insert record %v: %v", record, err)
			errorCount++
			continue
		}

		count++
		if count%1000 == 0 {
			log.Printf("Imported %d records...", count)
		}
	}

	log.Printf("Import completed! Successfully imported %d records, %d errors", count, errorCount)
}

func connectDB() (*sql.DB, error) {
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
		return nil, err
	}

	// Test the connection
	if err := db.Ping(); err != nil {
		return nil, err
	}

	return db, nil
}

func generateDeterministicUUID(make, model string, year int, packageName string) uuid.UUID {
	// Create a deterministic string from the motorcycle data
	data := fmt.Sprintf("%s|%s|%d|%s", strings.ToLower(make), strings.ToLower(model), year, strings.ToLower(packageName))
	
	// Use UUID v5 with DNS namespace for deterministic generation
	return uuid.NewSHA1(uuid.NameSpaceDNS, []byte(data))
}