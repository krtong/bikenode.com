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
	AccessToken   string    `db:"access_token" json:"-"`
	RefreshToken  string    `db:"refresh_token" json:"-"`
	TokenExpiry   time.Time `db:"token_expiry" json:"-"`
	YouTubeURL    string    `db:"youtube_url" json:"youtube_url"`
	CreatedAt     time.Time `db:"created_at" json:"created_at"`
	UpdatedAt     time.Time `db:"updated_at" json:"updated_at"`
}

// UserWithServers represents a user with their Discord servers
type UserWithServers struct {
	User
	Servers []ServerWithSharing `json:"servers"`
}

// UserWithServerRoles represents a user with their roles on a server
type UserWithServerRoles struct {
	User
	Roles []UserRole `json:"roles"`
}

// UserServer represents the relationship between a user and a Discord server
type UserServer struct {
	ID          uuid.UUID `db:"id" json:"id"`
	UserID      uuid.UUID `db:"user_id" json:"user_id"`
	ServerID    uuid.UUID `db:"server_id" json:"server_id"`
	IsShared    bool      `db:"is_shared" json:"is_shared"`
	IsAdmin     bool      `db:"is_admin" json:"is_admin"`
	IsModerator bool      `db:"is_moderator" json:"is_moderator"`
}

// UserRole represents a Discord role that a user has
type UserRole struct {
	ID        uuid.UUID `db:"id" json:"id"`
	UserID    uuid.UUID `db:"user_id" json:"user_id"`
	ServerID  uuid.UUID `db:"server_id" json:"server_id"`
	RoleID    string    `db:"role_id" json:"role_id"`
	RoleName  string    `db:"role_name" json:"role_name"`
	RoleColor string    `db:"role_color" json:"role_color"`
}
