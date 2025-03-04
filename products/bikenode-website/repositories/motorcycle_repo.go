package repositories

import (
	"fmt"
	"strings"
	"time"

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

// Create inserts a new motorcycle
func (r *MotorcycleRepository) Create(motorcycle *models.Motorcycle) error {
	// Set ID and timestamps if not already set
	if motorcycle.ID == uuid.Nil {
		motorcycle.ID = uuid.New()
	}
	if motorcycle.CreatedAt.IsZero() {
		motorcycle.CreatedAt = time.Now()
	}
	if motorcycle.UpdatedAt.IsZero() {
		motorcycle.UpdatedAt = time.Now()
	}

	_, err := r.db.NamedExec(`
		INSERT INTO motorcycles (id, year, make, model, package, category, engine, created_at, updated_at)
		VALUES (:id, :year, :make, :model, :package, :category, :engine, :created_at, :updated_at)
	`, motorcycle)
	return err
}

// Search searches for motorcycles with filters
func (r *MotorcycleRepository) Search(search *models.MotorcycleSearch) ([]models.Motorcycle, int, error) {
	var where []string
	var args []interface{}
	argCount := 1

	if search.Year > 0 {
		where = append(where, fmt.Sprintf("year = $%d", argCount))
		args = append(args, search.Year)
		argCount++
	}

	if search.Make != "" {
		where = append(where, fmt.Sprintf("make ILIKE $%d", argCount))
		args = append(args, "%"+search.Make+"%")
		argCount++
	}

	if search.Model != "" {
		where = append(where, fmt.Sprintf("model ILIKE $%d", argCount))
		args = append(args, "%"+search.Model+"%")
		argCount++
	}

	if search.Package != "" {
		where = append(where, fmt.Sprintf("package ILIKE $%d", argCount))
		args = append(args, "%"+search.Package+"%")
		argCount++
	}

	if search.Category != "" {
		where = append(where, fmt.Sprintf("category ILIKE $%d", argCount))
		args = append(args, "%"+search.Category+"%")
		argCount++
	}

	if search.Query != "" {
		queryWhere := fmt.Sprintf(`(
			make ILIKE $%d OR 
			model ILIKE $%d OR 
			package ILIKE $%d OR
			category ILIKE $%d OR
			CAST(year AS TEXT) LIKE $%d
		)`, argCount, argCount, argCount, argCount, argCount)
		where = append(where, queryWhere)
		args = append(args, "%"+search.Query+"%")
		argCount++
	}

	whereClause := ""
	if len(where) > 0 {
		whereClause = "WHERE " + strings.Join(where, " AND ")
	}

	// Get total count
	var total int
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM motorcycles %s", whereClause)
	err := r.db.QueryRow(countQuery, args...).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	// Calculate pagination
	if search.Page <= 0 {
		search.Page = 1
	}
	if search.PageSize <= 0 {
		search.PageSize = 20
	}
	offset := (search.Page - 1) * search.PageSize

	// Add pagination to args
	args = append(args, search.PageSize)
	args = append(args, offset)

	// Get paginated results
	query := fmt.Sprintf(`
		SELECT * FROM motorcycles 
		%s
		ORDER BY year DESC, make, model
		LIMIT $%d OFFSET $%d
	`, whereClause, argCount, argCount+1)

	var motorcycles []models.Motorcycle
	err = r.db.Select(&motorcycles, query, args...)
	return motorcycles, total, err
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
