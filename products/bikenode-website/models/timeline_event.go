package models

import (
	"time"

	"github.com/google/uuid"
)

// EventType defines the type of timeline event
type EventType string

const (
	EventTypePhoto        EventType = "PHOTO"
	EventTypeMaintenance  EventType = "MAINTENANCE"
	EventTypeModification EventType = "MODIFICATION"
	EventTypeRepair       EventType = "REPAIR"
	EventTypeTrip         EventType = "TRIP"
	EventTypeMilestone    EventType = "MILESTONE"
)

// TimelineEvent represents an event in the motorcycle's timeline
type TimelineEvent struct {
	ID          uuid.UUID `db:"id" json:"id"`
	OwnershipID uuid.UUID `db:"ownership_id" json:"ownership_id"`
	Type        string    `db:"type" json:"type"`
	Date        time.Time `db:"date" json:"date"`
	Title       string    `db:"title" json:"title"`
	Description string    `db:"description" json:"description"`
	MediaURL    string    `db:"media_url" json:"media_url"`
	IsPublic    bool      `db:"is_public" json:"is_public"`
	CreatedAt   time.Time `db:"created_at" json:"created_at"`
	UpdatedAt   time.Time `db:"updated_at" json:"updated_at"`

	// Joined fields (not stored in db)
	Ownership       *Ownership  `db:"-" json:"ownership,omitempty"`
	SharedToServers []uuid.UUID `db:"-" json:"shared_to_servers,omitempty"`
}

// TimelineEventShare represents which servers a timeline event is shared with
type TimelineEventShare struct {
	EventID   uuid.UUID `db:"event_id" json:"event_id"`
	ServerID  uuid.UUID `db:"server_id" json:"server_id"`
	MessageID string    `db:"discord_message_id" json:"discord_message_id"`
}
