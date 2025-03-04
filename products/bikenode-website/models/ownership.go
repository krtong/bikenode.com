package models

import (
	"time"

	"github.com/google/uuid"
)

type Ownership struct {
	ID           uuid.UUID `db:"id" json:"id"`
	UserID       uuid.UUID `db:"user_id" json:"user_id"`
	MotorcycleID uuid.UUID `db:"motorcycle_id" json:"motorcycle_id"`
	PurchaseDate time.Time `db:"purchase_date" json:"purchase_date"`
	EndDate      *time.Time `db:"end_date" json:"end_date,omitempty"`
	EndReason    string     `db:"end_reason" json:"end_reason,omitempty"`
	Notes        string     `db:"notes" json:"notes,omitempty"`
	CreatedAt    time.Time  `db:"created_at" json:"created_at"`
	UpdatedAt    time.Time  `db:"updated_at" json:"updated_at"`

	// Joined fields
	Motorcycle *Motorcycle `db:"-" json:"motorcycle,omitempty"`
}
