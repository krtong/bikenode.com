package models

import (
	"time"

	"github.com/google/uuid"
)

// User holds Discord user data
type User struct {
	ID            uuid.UUID `db:"id" json:"id"`
	DiscordID     string    `db:"discord_id" json:"discord_id"`
	Username      string    `db:"username" json:"username"`
	Discriminator string    `db:"discriminator" json:"discriminator"`
	Avatar        string    `db:"avatar" json:"avatar"`
	Email         string    `db:"email" json:"email"`
	CreatedAt     time.Time `db:"created_at" json:"created_at"`
	UpdatedAt     time.Time `db:"updated_at" json:"updated_at"`

	// Joined fields
	Ownerships []Ownership   `db:"-" json:"ownerships,omitempty"`
	UserRoles  []UserRole    `db:"-" json:"user_roles,omitempty"`
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

// UserRole represents a role a user has on a Discord server
type UserRole struct {
	ID        uuid.UUID `db:"id" json:"id"`
	UserID    uuid.UUID `db:"user_id" json:"user_id"`
	ServerID  uuid.UUID `db:"server_id" json:"server_id"`
	RoleID    string    `db:"role_id" json:"role_id"`
	RoleName  string    `db:"role_name" json:"role_name"`
	RoleColor string    `db:"role_color" json:"role_color"`
	CreatedAt time.Time `db:"created_at" json:"created_at"`
	UpdatedAt time.Time `db:"updated_at" json:"updated_at"`
}

// UserProfile represents a user's profile with additional information
type UserProfile struct {
	User             *User        `json:"user"`
	ActiveOwnerships []*Ownership `json:"active_ownerships"`
	PastOwnerships   []*Ownership `json:"past_ownerships"`
	Servers          []*Server    `json:"servers"`
}

// FormatUsername returns the formatted Discord username
func (u *User) FormatUsername() string {
	return u.Username + "#" + u.Discriminator
}

// GetAvatarURL returns the Discord avatar URL
func (u *User) GetAvatarURL() string {
	if u.Avatar == "" {
		return "https://cdn.discordapp.com/embed/avatars/0.png"
	}
	return "https://cdn.discordapp.com/avatars/" + u.DiscordID + "/" + u.Avatar + ".png"
}
