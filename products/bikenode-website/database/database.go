package database

import (
	"fmt"
	"log"
	"os"

	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"
)

// GetConnection establishes a connection to the PostgreSQL database
func GetConnection() (*sqlx.DB, error) {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgres://postgres:postgres@localhost:5432/bikenode?sslmode=disable"
	}

	db, err := sqlx.Connect("postgres", dbURL)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	// Test connection
	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	log.Println("Database connection established")
	return db, nil
}

// InitSchema runs the schema migrations
func InitSchema(db *sqlx.DB) error {
	schema := `
	-- Users table
	CREATE TABLE IF NOT EXISTS users (
		id UUID PRIMARY KEY,
		discord_id TEXT UNIQUE NOT NULL,
		username TEXT NOT NULL,
		discriminator TEXT NOT NULL,
		avatar TEXT,
		email TEXT,
		created_at TIMESTAMP WITH TIME ZONE NOT NULL,
		updated_at TIMESTAMP WITH TIME ZONE NOT NULL
	);

	-- Motorcycles table
	CREATE TABLE IF NOT EXISTS motorcycles (
		id UUID PRIMARY KEY,
		year INTEGER NOT NULL,
		make TEXT NOT NULL,
		model TEXT NOT NULL,
		package TEXT,
		category TEXT,
		engine TEXT,
		created_at TIMESTAMP WITH TIME ZONE NOT NULL,
		updated_at TIMESTAMP WITH TIME ZONE NOT NULL
	);

	-- Ownerships table
	CREATE TABLE IF NOT EXISTS ownerships (
		id UUID PRIMARY KEY,
		user_id UUID NOT NULL REFERENCES users(id),
		motorcycle_id UUID NOT NULL REFERENCES motorcycles(id),
		purchase_date TIMESTAMP WITH TIME ZONE NOT NULL,
		end_date TIMESTAMP WITH TIME ZONE,
		end_reason TEXT,
		notes TEXT,
		created_at TIMESTAMP WITH TIME ZONE NOT NULL,
		updated_at TIMESTAMP WITH TIME ZONE NOT NULL
	);

	-- Timeline events table
	CREATE TABLE IF NOT EXISTS timeline_events (
		id UUID PRIMARY KEY,
		ownership_id UUID NOT NULL REFERENCES ownerships(id),
		type TEXT NOT NULL,
		date TIMESTAMP WITH TIME ZONE NOT NULL,
		title TEXT NOT NULL,
		description TEXT,
		media_url TEXT,
		is_public BOOLEAN NOT NULL DEFAULT false,
		created_at TIMESTAMP WITH TIME ZONE NOT NULL,
		updated_at TIMESTAMP WITH TIME ZONE NOT NULL
	);

	-- Servers table
	CREATE TABLE IF NOT EXISTS servers (
		id UUID PRIMARY KEY,
		discord_id TEXT UNIQUE NOT NULL,
		name TEXT NOT NULL,
		icon TEXT,
		owner_id TEXT NOT NULL,
		joined_at TIMESTAMP WITH TIME ZONE NOT NULL,
		member_count INTEGER NOT NULL DEFAULT 0,
		created_at TIMESTAMP WITH TIME ZONE NOT NULL,
		updated_at TIMESTAMP WITH TIME ZONE NOT NULL
	);

	-- Server configurations table
	CREATE TABLE IF NOT EXISTS server_configs (
		id UUID PRIMARY KEY,
		server_id UUID NOT NULL REFERENCES servers(id),
		create_brand_roles BOOLEAN NOT NULL DEFAULT false,
		create_type_roles BOOLEAN NOT NULL DEFAULT false,
		create_model_roles BOOLEAN NOT NULL DEFAULT false,
		story_feed_channel_id TEXT,
		created_at TIMESTAMP WITH TIME ZONE NOT NULL,
		updated_at TIMESTAMP WITH TIME ZONE NOT NULL
	);

	-- User roles table
	CREATE TABLE IF NOT EXISTS user_roles (
		id UUID PRIMARY KEY,
		user_id UUID NOT NULL REFERENCES users(id),
		server_id UUID NOT NULL REFERENCES servers(id),
		role_id TEXT NOT NULL,
		role_name TEXT NOT NULL,
		role_color TEXT,
		UNIQUE(user_id, server_id, role_id)
	);

	-- Event server sharing table
	CREATE TABLE IF NOT EXISTS event_server_shares (
		event_id UUID NOT NULL REFERENCES timeline_events(id),
		server_id UUID NOT NULL REFERENCES servers(id),
		PRIMARY KEY (event_id, server_id)
	);

	-- Server visibility settings
	CREATE TABLE IF NOT EXISTS user_server_visibility (
		user_id UUID NOT NULL REFERENCES users(id),
		server_id UUID NOT NULL REFERENCES servers(id),
		is_visible BOOLEAN NOT NULL DEFAULT true,
		PRIMARY KEY (user_id, server_id)
	);
	`

	_, err := db.Exec(schema)
	if err != nil {
		return fmt.Errorf("failed to initialize schema: %w", err)
	}

	log.Println("Database schema initialized")
	return nil
}
