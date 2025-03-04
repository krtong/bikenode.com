package models

import (
	"time"

	"github.com/google/uuid"
)

// Server represents a Discord server with the BikeNode bot
type Server struct {
	ID                 uuid.UUID `db:"id" json:"id"`
	DiscordServerID    string    `db:"discord_server_id" json:"discord_server_id"`
	Name               string    `db:"name" json:"name"`
	Icon               string    `db:"icon" json:"icon"`
	BotJoinedAt        time.Time `db:"bot_joined_at" json:"bot_joined_at"`
	CreateBrandRoles   bool      `db:"create_brand_roles" json:"create_brand_roles"`
	CreateTypeRoles    bool      `db:"create_type_roles" json:"create_type_roles"`
	CreateModelRoles   bool      `db:"create_model_roles" json:"create_model_roles"`
	StoryFeedChannelID string    `db:"story_feed_channel_id" json:"story_feed_channel_id"`
	CreatedAt          time.Time `db:"created_at" json:"created_at"`
	UpdatedAt          time.Time `db:"updated_at" json:"updated_at"`

	// Not stored in db, used for responses
	MemberCount int  `db:"-" json:"member_count,omitempty"`
	IsAdmin     bool `db:"-" json:"is_admin,omitempty"`
	IsMember    bool `db:"-" json:"is_member,omitempty"`
	IsShared    bool `db:"-" json:"is_shared,omitempty"`
}

// ServerRole represents a role created by the BikeNode bot on Discord
type ServerRole struct {
	ID            uuid.UUID `db:"id" json:"id"`
	ServerID      uuid.UUID `db:"server_id" json:"server_id"`
	DiscordRoleID string    `db:"discord_role_id" json:"discord_role_id"`
	RoleType      string    `db:"role_type" json:"role_type"` // BRAND, TYPE, MODEL, CUSTOM
	Name          string    `db:"name" json:"name"`
	MemberCount   int       `db:"member_count" json:"member_count"`
	CreatedAt     time.Time `db:"created_at" json:"created_at"`
}

// UserRole represents a Discord role for a user
type UserRole struct {
	ID        int       `db:"id" json:"id"`
	UserID    int       `db:"user_id" json:"user_id"`
	ServerID  int       `db:"server_id" json:"server_id"`
	RoleID    string    `db:"role_id" json:"role_id"`
	RoleName  string    `db:"role_name" json:"role_name"`
	CreatedAt time.Time `db:"created_at" json:"created_at"`
}
