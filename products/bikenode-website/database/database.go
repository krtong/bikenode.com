package database

import (
	"fmt"
	"os"

	"github.com/golang-migrate/migrate/v4"
	"github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"

	"bikenode-website/logger"
)

// GetConnection establishes a connection to the PostgreSQL database
func GetConnection() (*sqlx.DB, error) {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgres://postgres:postgres@localhost:5432/bikenode?sslmode=disable"
		logger.Warn("DATABASE_URL not set, using default connection string", logger.Fields{
			"default_url": "postgres://postgres:postgres@localhost:5432/bikenode?sslmode=disable",
		})
	}

	db, err := sqlx.Connect("postgres", dbURL)
	if err != nil {
		logger.Error("Failed to connect to database", err, logger.Fields{
			"database_url": dbURL,
		})
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	// Test connection
	if err := db.Ping(); err != nil {
		logger.Error("Failed to ping database", err, logger.Fields{
			"database_url": dbURL,
		})
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	logger.Info("Database connection established", logger.Fields{
		"database_url": dbURL,
	})
	return db, nil
}

// RunMigrations runs the database migrations from the migrations directory
func RunMigrations(db *sqlx.DB) error {
	driver, err := postgres.WithInstance(db.DB, &postgres.Config{})
	if err != nil {
		logger.Error("Failed to create migration driver", err, nil)
		return fmt.Errorf("failed to create migration driver: %w", err)
	}

	m, err := migrate.NewWithDatabaseInstance(
		"file://migrations",
		"postgres", driver)
	if err != nil {
		logger.Error("Failed to create migration instance", err, nil)
		return fmt.Errorf("failed to create migration instance: %w", err)
	}

	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		logger.Error("Failed to run migrations", err, nil)
		return fmt.Errorf("failed to run migrations: %w", err)
	}

	logger.Info("Database migrations completed successfully", nil)
	return nil
}

// The deprecated InitSchema function has been removed
