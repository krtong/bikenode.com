package repositories

import (
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"

	"bikenode-website/models"
)

// MotorcycleRepository handles database operations for motorcycles
type MotorcycleRepository struct {
	db *sqlx.DB
}

// NewMotorcycleRepository creates a new motorcycle repository
func NewMotorcycleRepository(db *sqlx.DB) *MotorcycleRepository {
	return &MotorcycleRepository{db: db}
}

// GetByID retrieves a motorcycle by ID
func (r *MotorcycleRepository) GetByID(id uuid.UUID) (*models.Motorcycle, error) {
	motorcycle := &models.Motorcycle{}
	err := r.db.Get(motorcycle, "SELECT * FROM motorcycles WHERE id = $1", id)
	return motorcycle, err
}

// Search searches for motorcycles by criteria
func (r *MotorcycleRepository) Search(search models.MotorcycleSearch) ([]models.Motorcycle, error) {
	var motorcycles []models.Motorcycle
	var conditions []string
	var args []interface{}
	var argCount int = 1

	// Build query conditions
	if search.Year > 0 {
		conditions = append(conditions, fmt.Sprintf("year = $%d", argCount))
		args = append(args, search.Year)
		argCount++
	}

	if search.Make != "" {
		conditions = append(conditions, fmt.Sprintf("make ILIKE $%d", argCount))
		args = append(args, "%"+search.Make+"%")
		argCount++
	}

	if search.Model != "" {
		conditions = append(conditions, fmt.Sprintf("model ILIKE $%d", argCount))
		args = append(args, "%"+search.Model+"%")
		argCount++
	}

	if search.Package != "" {
		conditions = append(conditions, fmt.Sprintf("package ILIKE $%d", argCount))
		args = append(args, "%"+search.Package+"%")
		argCount++
	}

	if search.Category != "" {
		conditions = append(conditions, fmt.Sprintf("category ILIKE $%d", argCount))
		args = append(args, "%"+search.Category+"%")
		argCount++
	}

	if search.Query != "" {
		conditions = append(conditions, fmt.Sprintf("(make ILIKE $%d OR model ILIKE $%d OR category ILIKE $%d)", argCount, argCount, argCount))
		args = append(args, "%"+search.Query+"%")
		argCount++
	}

	// Build SQL query
	sql := "SELECT * FROM motorcycles"
	if len(conditions) > 0 {
		sql += " WHERE " + strings.Join(conditions, " AND ")
	}

	// Add ordering
	sql += " ORDER BY year DESC, make, model"

	// Add pagination
	if search.PageSize <= 0 {
		search.PageSize = 20 // Default page size
	}
	if search.Page <= 0 {
		search.Page = 1 // Default page
	}

	offset := (search.Page - 1) * search.PageSize
	sql += fmt.Sprintf(" LIMIT %d OFFSET %d", search.PageSize, offset)

	// Execute query
	err := r.db.Select(&motorcycles, sql, args...)
	return motorcycles, err
}

// GetMakes gets all unique motorcycle makes
func (r *MotorcycleRepository) GetMakes() ([]string, error) {
	var makes []string
	err := r.db.Select(&makes, "SELECT DISTINCT make FROM motorcycles ORDER BY make")
	return makes, err
}

// GetModelsByMake gets all models for a specific make
func (r *MotorcycleRepository) GetModelsByMake(make string) ([]string, error) {
	var models []string
	err := r.db.Select(&models, "SELECT DISTINCT model FROM motorcycles WHERE make = $1 ORDER BY model", make)
	return models, err
}

// GetYearsByMakeAndModel gets all years for a specific make and model
func (r *MotorcycleRepository) GetYearsByMakeAndModel(make, model string) ([]int, error) {
	var years []int
	err := r.db.Select(&years, "SELECT DISTINCT year FROM motorcycles WHERE make = $1 AND model = $2 ORDER BY year DESC", make, model)
	return years, err
}

// GetCategories gets all unique motorcycle categories
func (r *MotorcycleRepository) GetCategories() ([]string, error) {
	var categories []string
	err := r.db.Select(&categories, "SELECT DISTINCT category FROM motorcycles WHERE category != '' ORDER BY category")
	return categories, err
}
