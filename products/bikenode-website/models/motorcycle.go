package models

import (
	"fmt"
	"time"

	"github.com/google/uuid"
)

// Motorcycle represents a motorcycle from the dataset
type Motorcycle struct {
	ID        uuid.UUID `db:"id" json:"id"`
	Year      int       `db:"year" json:"year"`
	Make      string    `db:"make" json:"make"`
	Model     string    `db:"model" json:"model"`
	Package   *string   `db:"package" json:"package"`
	Category  *string   `db:"category" json:"category"`
	Engine    *string   `db:"engine" json:"engine"`
	CreatedAt time.Time `db:"created_at" json:"created_at"`
	UpdatedAt time.Time `db:"updated_at" json:"updated_at"`
}

// MotorcycleSummary is a simplified view of a motorcycle
type MotorcycleSummary struct {
	ID      int    `db:"id" json:"id"`
	Year    int    `db:"year" json:"year"`
	Make    string `db:"make" json:"make"`
	Model   string `db:"model" json:"model"`
	Package string `db:"package" json:"package"`
}

// MotorcycleSearch represents search parameters for motorcycles
type MotorcycleSearch struct {
	Year     int    `form:"year"`
	Make     string `form:"make"`
	Model    string `form:"model"`
	Package  string `form:"package"`
	Category string `form:"category"`
	Query    string `form:"query"` // General search term
	Page     int    `form:"page"`
	PageSize int    `form:"pageSize"`
}

// FormatName returns a formatted name of the motorcycle
func (m *Motorcycle) FormatName() string {
	if m.Package != nil && *m.Package != "" {
		return fmt.Sprintf("%d %s %s %s", m.Year, m.Make, m.Model, *m.Package)
	}
	return fmt.Sprintf("%d %s %s", m.Year, m.Make, m.Model)
}
