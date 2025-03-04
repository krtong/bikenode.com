package utils

import (
	"encoding/csv"
	"fmt"
	"log"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"

	"bikenode-website/models"
)

// SeedMotorcycleData reads motorcycle data from a CSV file and inserts it into the database.
// Expected CSV columns: year, make, model, package, category, engine (case-insensitive)
func SeedMotorcycleData(db *sqlx.DB, csvFilePath string) error {
	// Open the CSV file
	file, err := os.Open(csvFilePath)
	if err != nil {
		return fmt.Errorf("failed to open CSV file: %w", err)
	}
	defer file.Close()

	reader := csv.NewReader(file)
	reader.TrimLeadingSpace = true

	// Read header row to map columns
	header, err := reader.Read()
	if err != nil {
		return fmt.Errorf("failed to read CSV header: %w", err)
	}

	colMap := make(map[string]int)
	for i, col := range header {
		colMap[strings.ToLower(col)] = i
	}

	// Ensure required columns are present
	for _, col := range []string{"year", "make", "model"} {
		if _, exists := colMap[col]; !exists {
			return fmt.Errorf("CSV missing required column: %s", col)
		}
	}

	// Begin transaction
	tx, err := db.Beginx()
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}

	inserted := 0
	now := time.Now()

	// Loop through all CSV records
	for {
		record, err := reader.Read()
		if err != nil {
			if err.Error() == "EOF" {
				break
			}
			tx.Rollback()
			return fmt.Errorf("error reading CSV record: %w", err)
		}

		yearStr := record[colMap["year"]]
		make := record[colMap["make"]]
		modelName := record[colMap["model"]]
		if strings.TrimSpace(yearStr) == "" || strings.TrimSpace(make) == "" || strings.TrimSpace(modelName) == "" {
			log.Printf("Skipping record: missing required fields")
			continue
		}

		year, err := strconv.Atoi(yearStr)
		if err != nil {
			log.Printf("Skipping record: invalid year %s", yearStr)
			continue
		}

		var packageName, category, engine string
		if idx, ok := colMap["package"]; ok && idx < len(record) {
			packageName = record[idx]
		}
		if idx, ok := colMap["category"]; ok && idx < len(record) {
			category = record[idx]
		}
		if idx, ok := colMap["engine"]; ok && idx < len(record) {
			engine = record[idx]
		}

		motorcycle := &models.Motorcycle{
			ID:        uuid.New(),
			Year:      year,
			Make:      make,
			Model:     modelName,
			Package:   packageName,
			Category:  category,
			Engine:    engine,
			CreatedAt: now,
			UpdatedAt: now,
		}

		_, err = tx.NamedExec(`
			INSERT INTO motorcycles (id, year, make, model, package, category, engine, created_at, updated_at)
			VALUES (:id, :year, :make, :model, :package, :category, :engine, :created_at, :updated_at)
			ON CONFLICT DO NOTHING
		`, motorcycle)
		if err != nil {
			tx.Rollback()
			return fmt.Errorf("failed to insert record: %w", err)
		}

		inserted++
		if inserted%500 == 0 {
			log.Printf("Inserted %d motorcycles...", inserted)
		}
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	log.Printf("Successfully inserted %d motorcycles", inserted)
	return nil
}
