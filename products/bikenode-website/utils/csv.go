package utils

import (
	"encoding/csv"
	"fmt"
	"os"
	"strconv"
	"strings"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"

	"bikenode-website/models"
)

// SeedMotorcycleData imports motorcycle data from the provided CSV file
func SeedMotorcycleData(db *sqlx.DB, filePath string) error {
	file, err := os.Open(filePath)
	if err != nil {
		return fmt.Errorf("failed to open file: %w", err)
	}
	defer file.Close()

	// Create a CSV reader
	reader := csv.NewReader(file)
	records, err := reader.ReadAll()
	if err != nil {
		return fmt.Errorf("failed to read CSV: %w", err)
	}

	// Skip header
	if len(records) > 0 {
		records = records[1:]
	}

	// Begin transaction
	tx, err := db.Beginx()
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	// Check if the motorcycles table is empty
	var count int
	if err := tx.Get(&count, "SELECT COUNT(*) FROM motorcycles"); err != nil {
		return fmt.Errorf("failed to check if motorcycles table is empty: %w", err)
	}

	// If table is not empty, don't seed
	if count > 0 {
		return fmt.Errorf("motorcycles table is not empty, skipping seed")
	}

	// Process records
	for i, record := range records {
		if len(record) < 6 {
			return fmt.Errorf("record %d has insufficient fields", i+1)
		}

		// Parse year
		year, err := strconv.Atoi(record[0])
		if err != nil {
			return fmt.Errorf("invalid year in record %d: %w", i+1, err)
		}

		// Create motorcycle
		motorcycle := models.Motorcycle{
			ID:       uuid.New(),
			Year:     year,
			Make:     strings.TrimSpace(record[1]),
			Model:    strings.TrimSpace(record[2]),
			Package:  strings.TrimSpace(record[3]),
			Category: strings.TrimSpace(record[4]),
			Engine:   strings.TrimSpace(record[5]),
		}

		// Insert into database
		_, err = tx.NamedExec(`
			INSERT INTO motorcycles (id, year, make, model, package, category, engine) 
			VALUES (:id, :year, :make, :model, :package, :category, :engine)
		`, motorcycle)
		if err != nil {
			return fmt.Errorf("failed to insert motorcycle %d: %w", i+1, err)
		}
	}

	// Commit transaction
	if err := tx.Commit(); err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	return nil
}
