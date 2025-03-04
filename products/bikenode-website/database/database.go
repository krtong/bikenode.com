package database

import (
	"encoding/csv"
	"fmt"
	"os"
	"strconv"
	"strings"

	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"
)

// Connect establishes a connection to the database
func Connect(dbURL string) (*sqlx.DB, error) {
	db, err := sqlx.Connect("postgres", dbURL)
	if err != nil {
		return nil, err
	}

	// Test the connection
	if err := db.Ping(); err != nil {
		return nil, err
	}

	return db, nil
}

// RunMigrations applies database migrations
func RunMigrations(db *sqlx.DB) error {
	// Create the tables if they don't exist
	schema := `
	CREATE TABLE IF NOT EXISTS users (
		id SERIAL PRIMARY KEY,
		discord_id TEXT UNIQUE NOT NULL,
		username TEXT NOT NULL,
		avatar TEXT,
		created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
		updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
	);

	CREATE TABLE IF NOT EXISTS motorcycles (
		id SERIAL PRIMARY KEY,
		year INTEGER NOT NULL,
		make TEXT NOT NULL,
		model TEXT NOT NULL,
		package TEXT,
		category TEXT,
		engine TEXT,
		created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
		updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
		UNIQUE(year, make, model, package)
	);

	CREATE TABLE IF NOT EXISTS ownerships (
		id SERIAL PRIMARY KEY,
		user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
		motorcycle_id INTEGER REFERENCES motorcycles(id) ON DELETE CASCADE,
		purchase_date DATE NOT NULL,
		end_date DATE,
		end_reason TEXT CHECK (end_reason IN ('sold', 'stolen', 'totaled', NULL)),
		notes TEXT,
		created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
		updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
	);

	CREATE TABLE IF NOT EXISTS timeline_events (
		id SERIAL PRIMARY KEY,
		ownership_id INTEGER REFERENCES ownerships(id) ON DELETE CASCADE,
		event_date DATE NOT NULL,
		event_type TEXT NOT NULL CHECK (event_type IN ('purchase', 'sale', 'photo', 'story', 'video', 'maintenance', 'other')),
		title TEXT NOT NULL,
		description TEXT,
		media_url TEXT,
		created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
		updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
	);

	CREATE TABLE IF NOT EXISTS servers (
		id SERIAL PRIMARY KEY,
		discord_server_id TEXT UNIQUE NOT NULL,
		name TEXT NOT NULL,
		icon TEXT,
		create_brand_roles BOOLEAN DEFAULT false,
		create_category_roles BOOLEAN DEFAULT false,
		create_model_roles BOOLEAN DEFAULT false,
		story_feed_channel_id TEXT,
		created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
		updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
	);

	CREATE TABLE IF NOT EXISTS user_servers (
		id SERIAL PRIMARY KEY,
		user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
		server_id INTEGER REFERENCES servers(id) ON DELETE CASCADE,
		is_admin BOOLEAN DEFAULT false,
		shared_profile BOOLEAN DEFAULT true,
		created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
		updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
		UNIQUE(user_id, server_id)
	);

	CREATE TABLE IF NOT EXISTS user_roles (
		id SERIAL PRIMARY KEY,
		user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
		server_id INTEGER REFERENCES servers(id) ON DELETE CASCADE,
		role_id TEXT NOT NULL,
		role_name TEXT NOT NULL,
		created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
		UNIQUE(user_id, server_id, role_id)
	);
	`

	_, err := db.Exec(schema)
	return err
}

// SeedMotorcycles imports motorcycle data from CSV
func SeedMotorcycles(db *sqlx.DB, filePath string) error {
	// Open the CSV file
	file, err := os.Open(filePath)
	if err != nil {
		return fmt.Errorf("error opening CSV file: %w", err)
	}
	defer file.Close()

	// Parse the CSV file
	reader := csv.NewReader(file)
	records, err := reader.ReadAll()
	if err != nil {
		return fmt.Errorf("error reading CSV: %w", err)
	}

	// Skip the header row
	tx, err := db.Beginx()
	if err != nil {
		return fmt.Errorf("error starting transaction: %w", err)
	}

	// Insert each record
	stmt, err := tx.Prepare("INSERT INTO motorcycles (year, make, model, package, category, engine) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (year, make, model, package) DO NOTHING")
	if err != nil {
		tx.Rollback()
		return fmt.Errorf("error preparing statement: %w", err)
	}

	for i, record := range records {
		// Skip header
		if i == 0 {
			continue
		}

		if len(record) < 6 {
			continue // Skip incomplete records
		}

		year, err := strconv.Atoi(record[0])
		if err != nil {
			continue // Skip records with invalid year
		}

		make := strings.TrimSpace(record[1])
		model := strings.TrimSpace(record[2])
		packageName := strings.TrimSpace(record[3])
		category := strings.TrimSpace(record[4])
		engine := strings.TrimSpace(record[5])

		_, err = stmt.Exec(year, make, model, packageName, category, engine)
		if err != nil {
			tx.Rollback()
			return fmt.Errorf("error inserting record: %w", err)
		}
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("error committing transaction: %w", err)
	}

	return nil
}
