package models

import (
	"time"

	"github.com/google/uuid"
)

// EndReasonType defines the reason a motorcycle ownership ended
type EndReasonType string

const (
	EndReasonSold    EndReasonType = "SOLD"
	EndReasonStolen  EndReasonType = "STOLEN"
	EndReasonTotaled EndReasonType = "TOTALED"
)

// Ownership represents a user's ownership of a motorcycle
type Ownership struct {
	ID           uuid.UUID      `db:"id" json:"id"`
	UserID       uuid.UUID      `db:"user_id" json:"user_id"`
	MotorcycleID uuid.UUID      `db:"motorcycle_id" json:"motorcycle_id"`
	PurchaseDate time.Time      `db:"purchase_date" json:"purchase_date"`
	EndDate      *time.Time     `db:"end_date" json:"end_date"`
	EndReason    *EndReasonType `db:"end_reason" json:"end_reason"`
	Notes        string         `db:"notes" json:"notes"`
	CreatedAt    time.Time      `db:"created_at" json:"created_at"`
	UpdatedAt    time.Time      `db:"updated_at" json:"updated_at"`

	// Joined fields (not stored in db)
	Motorcycle     *Motorcycle     `db:"-" json:"motorcycle,omitempty"`
	TimelineEvents []TimelineEvent `db:"-" json:"timeline_events,omitempty"`
}
