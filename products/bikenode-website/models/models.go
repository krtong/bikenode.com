package models

import (
	"time"

	"github.com/google/uuid"
)

// User represents a user in the system
type User struct {
	ID            uuid.UUID `db:"id" json:"id"`
	DiscordID     string    `db:"discord_id" json:"discord_id"`
	Username      string    `db:"username" json:"username"`
	Discriminator string    `db:"discriminator" json:"discriminator"`
	Avatar        string    `db:"avatar" json:"avatar"`
	Email         string    `db:"email" json:"email"`
	CreatedAt     time.Time `db:"created_at" json:"created_at"`
	UpdatedAt     time.Time `db:"updated_at" json:"updated_at"`
}

// Motorcycle represents a motorcycle in the system
type Motorcycle struct {
	ID        uuid.UUID `db:"id" json:"id"`
	Year      int       `db:"year" json:"year"`
	Make      string    `db:"make" json:"make"`
	Model     string    `db:"model" json:"model"`
	Package   string    `db:"package" json:"package"`
	Category  string    `db:"category" json:"category"`
	Engine    string    `db:"engine" json:"engine"`
	CreatedAt time.Time `db:"created_at" json:"created_at"`
	UpdatedAt time.Time `db:"updated_at" json:"updated_at"`
}

// Ownership represents the relationship between a user and a motorcycle
type Ownership struct {
	ID           uuid.UUID  `db:"id" json:"id"`
	UserID       uuid.UUID  `db:"user_id" json:"user_id"`
	MotorcycleID uuid.UUID  `db:"motorcycle_id" json:"motorcycle_id"`
	PurchaseDate time.Time  `db:"purchase_date" json:"purchase_date"`
	EndDate      *time.Time `db:"end_date" json:"end_date"`
	EndReason    string     `db:"end_reason" json:"end_reason"`
	Notes        string     `db:"notes" json:"notes"`
	CreatedAt    time.Time  `db:"created_at" json:"created_at"`
	UpdatedAt    time.Time  `db:"updated_at" json:"updated_at"`
}

// TimelineEvent represents an event in a user's motorcycle timeline
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
}

// Server represents a Discord server
type Server struct {
	ID          uuid.UUID `db:"id" json:"id"`
	DiscordID   string    `db:"discord_id" json:"discord_id"`
	Name        string    `db:"name" json:"name"`
	Icon        string    `db:"icon" json:"icon"`
	OwnerID     string    `db:"owner_id" json:"owner_id"`
	JoinedAt    time.Time `db:"joined_at" json:"joined_at"`
	MemberCount int       `db:"member_count" json:"member_count"`
	CreatedAt   time.Time `db:"created_at" json:"created_at"`
	UpdatedAt   time.Time `db:"updated_at" json:"updated_at"`
}

// ServerConfig represents a server's configuration
type ServerConfig struct {
	ID                 uuid.UUID `db:"id" json:"id"`
	ServerID           uuid.UUID `db:"server_id" json:"server_id"`
	CreateBrandRoles   bool      `db:"create_brand_roles" json:"create_brand_roles"`
	CreateTypeRoles    bool      `db:"create_type_roles" json:"create_type_roles"`
	CreateModelRoles   bool      `db:"create_model_roles" json:"create_model_roles"`
	StoryFeedChannelID string    `db:"story_feed_channel_id" json:"story_feed_channel_id"`
	CreatedAt          time.Time `db:"created_at" json:"created_at"`
	UpdatedAt          time.Time `db:"updated_at" json:"updated_at"`
}

// UserRole represents a user's role in a Discord server
type UserRole struct {
	ID        uuid.UUID `db:"id" json:"id"`
	UserID    uuid.UUID `db:"user_id" json:"user_id"`
	ServerID  uuid.UUID `db:"server_id" json:"server_id"`
	RoleID    string    `db:"role_id" json:"role_id"`
	RoleName  string    `db:"role_name" json:"role_name"`
	RoleColor string    `db:"role_color" json:"role_color"`
}

// EventServerShare represents a timeline event being shared to a server
type EventServerShare struct {
	EventID  uuid.UUID `db:"event_id" json:"event_id"`
	ServerID uuid.UUID `db:"server_id" json:"server_id"`
}

// UserServerVisibility represents a user's visibility settings in a server
type UserServerVisibility struct {
	UserID    uuid.UUID `db:"user_id" json:"user_id"`
	ServerID  uuid.UUID `db:"server_id" json:"server_id"`
	IsVisible bool      `db:"is_visible" json:"is_visible"`
}
