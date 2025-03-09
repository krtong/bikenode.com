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
	Avatar        *string   `db:"avatar" json:"avatar"`
	Email         *string   `db:"email" json:"email"`
	CreatedAt     time.Time `db:"created_at" json:"created_at"`
	UpdatedAt     time.Time `db:"updated_at" json:"updated_at"`

	// Joined fields (not stored in db)
	Ownerships    []Ownership    `db:"-" json:"ownerships,omitempty"`
	UserRoles     []UserRole     `db:"-" json:"user_roles,omitempty"`
	ServerConfigs []ServerConfig `db:"-" json:"server_configs,omitempty"`
}

// UserRole represents a role a user has on a Discord server
type UserRole struct {
	ID        uuid.UUID `db:"id" json:"id"`
	UserID    uuid.UUID `db:"user_id" json:"user_id"`
	ServerID  uuid.UUID `db:"server_id" json:"server_id"`
	RoleID    string    `db:"role_id" json:"role_id"`
	RoleName  string    `db:"role_name" json:"role_name"`
	RoleColor string    `db:"role_color" json:"role_color"`
}

// FormatUsername returns the formatted Discord username
func (u *User) FormatUsername() string {
	return u.Username + "#" + u.Discriminator
}

// GetAvatarURL returns the Discord avatar URL
func (u *User) GetAvatarURL() string {
	if u.Avatar == nil || *u.Avatar == "" {
		return "https://cdn.discordapp.com/embed/avatars/0.png"
	}
	return "https://cdn.discordapp.com/avatars/" + u.DiscordID + "/" + *u.Avatar + ".png"
}
