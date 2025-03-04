package repositories

import (
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"

	"bikenode-website/models"
)

// ServerRepository handles database operations for Discord servers
type ServerRepository struct {
	db *sqlx.DB
}

// NewServerRepository creates a new server repository
func NewServerRepository(db *sqlx.DB) *ServerRepository {
	return &ServerRepository{db: db}
}

// GetByID retrieves a server by ID
func (r *ServerRepository) GetByID(id uuid.UUID) (*models.Server, error) {
	server := &models.Server{}
	err := r.db.Get(server, "SELECT * FROM servers WHERE id = $1", id)
	if err != nil {
		return nil, err
	}

	// Load config
	config, err := r.GetServerConfig(id)
	if err == nil { // It's ok if this fails (no config yet)
		server.Config = config
	}

	return server, nil
}

// GetByDiscordID retrieves a server by Discord ID
func (r *ServerRepository) GetByDiscordID(discordID string) (*models.Server, error) {
	server := &models.Server{}
	err := r.db.Get(server, "SELECT * FROM servers WHERE discord_id = $1", discordID)
	if err != nil {
		return nil, err
	}

	// Load config
	config, err := r.GetServerConfig(server.ID)
	if err == nil { // It's ok if this fails (no config yet)
		server.Config = config
	}

	return server, nil
}

// GetAll retrieves all servers
func (r *ServerRepository) GetAll() ([]models.Server, error) {
	var servers []models.Server
	err := r.db.Select(&servers, "SELECT * FROM servers ORDER BY name")
	return servers, err
}

// GetUserServers retrieves all servers a user belongs to
func (r *ServerRepository) GetUserServers(userID uuid.UUID) ([]models.Server, error) {
	var servers []models.Server
	query := `
		SELECT s.*, us.is_admin, us.is_shared
		FROM servers s
		JOIN user_servers us ON s.id = us.server_id
		WHERE us.user_id = $1
		ORDER BY s.name
	`
	err := r.db.Select(&servers, query, userID)
	if err != nil {
		return nil, err
	}

	// Load configs for each server
	for i := range servers {
		config, err := r.GetServerConfig(servers[i].ID)
		if err == nil { // It's ok if this fails (no config yet)
			servers[i].Config = config
		}
	}

	return servers, nil
}

// CreateOrUpdate creates or updates a server
func (r *ServerRepository) CreateOrUpdate(server *models.Server) error {
	// Check if server exists
	var exists bool
	err := r.db.Get(&exists, "SELECT EXISTS(SELECT 1 FROM servers WHERE discord_id = $1)", server.DiscordID)
	if err != nil {
		return err
	}

	if exists {
		// Update
		server.UpdatedAt = time.Now()
		_, err = r.db.NamedExec(`
			UPDATE servers SET
			name = :name,
			icon = :icon,
			owner_id = :owner_id,
			member_count = :member_count,
			updated_at = :updated_at
			WHERE discord_id = :discord_id
		`, server)
	} else {
		// Insert
		if server.ID == uuid.Nil {
			server.ID = uuid.New()
		}
		if server.CreatedAt.IsZero() {
			server.CreatedAt = time.Now()
		}
		if server.UpdatedAt.IsZero() {
			server.UpdatedAt = time.Now()
		}

		_, err = r.db.NamedExec(`
			INSERT INTO servers (
				id, discord_id, name, icon, owner_id,
				joined_at, member_count, created_at, updated_at
			) VALUES (
				:id, :discord_id, :name, :icon, :owner_id,
				:joined_at, :member_count, :created_at, :updated_at
			)
		`, server)
	}

	return err
}

// GetServerConfig gets the configuration for a server
func (r *ServerRepository) GetServerConfig(serverID uuid.UUID) (*models.ServerConfig, error) {
	config := &models.ServerConfig{}
	err := r.db.Get(config, "SELECT * FROM server_configs WHERE server_id = $1", serverID)
	return config, err
}

// SaveServerConfig creates or updates a server configuration
func (r *ServerRepository) SaveServerConfig(config *models.ServerConfig) error {
	// Check if config exists
	var exists bool
	err := r.db.Get(&exists, "SELECT EXISTS(SELECT 1 FROM server_configs WHERE server_id = $1)", config.ServerID)
	if err != nil {
		return err
	}

	if exists {
		// Update
		config.UpdatedAt = time.Now()
		_, err = r.db.NamedExec(`
			UPDATE server_configs SET
			create_brand_roles = :create_brand_roles,
			create_type_roles = :create_type_roles,
			create_model_roles = :create_model_roles,
			story_feed_channel_id = :story_feed_channel_id,
			updated_at = :updated_at
			WHERE server_id = :server_id
		`, config)
	} else {
		// Insert
		if config.ID == uuid.Nil {
			config.ID = uuid.New()
		}
		if config.CreatedAt.IsZero() {
			config.CreatedAt = time.Now()
		}
		if config.UpdatedAt.IsZero() {
			config.UpdatedAt = time.Now()
		}

		_, err = r.db.NamedExec(`
			INSERT INTO server_configs (
				id, server_id, create_brand_roles, create_type_roles,
				create_model_roles, story_feed_channel_id, created_at, updated_at
			) VALUES (
				:id, :server_id, :create_brand_roles, :create_type_roles,
				:create_model_roles, :story_feed_channel_id, :created_at, :updated_at
			)
		`, config)
	}

	return err
}

// IsUserServerAdmin checks if a user is an admin of a server
func (r *ServerRepository) IsUserServerAdmin(serverID, userID uuid.UUID) (bool, error) {
	var server models.Server
	err := r.db.Get(&server, "SELECT owner_id FROM servers WHERE id = $1", serverID)
	if err != nil {
		return false, err
	}

	var user models.User
	err = r.db.Get(&user, "SELECT discord_id FROM users WHERE id = $1", userID)
	if err != nil {
		return false, err
	}

	// Check if user is server owner
	if server.OwnerID == user.DiscordID {
		return true, nil
	}

	// Check if user has an admin role
	var count int
	err = r.db.Get(&count, `
		SELECT COUNT(*) FROM user_roles 
		WHERE user_id = $1 AND server_id = $2 
		AND (role_name LIKE '%admin%' OR role_name = 'BikeNode Manager')
	`, userID, serverID)

	return count > 0, err
}

// GetUserServerVisibility checks if a user's profile is visible on a server
func (r *ServerRepository) GetUserServerVisibility(userID, serverID uuid.UUID) (bool, error) {
	var visible bool
	err := r.db.Get(&visible, `
		SELECT COALESCE(
			(SELECT is_visible FROM user_server_visibility 
			WHERE user_id = $1 AND server_id = $2),
			true  -- Default to visible if no setting exists
		)
	`, userID, serverID)

	return visible, err
}

// GetServerMembers gets users who are members of a server with their roles
func (r *ServerRepository) GetServerMembers(serverID uuid.UUID) ([]models.User, error) {
	var users []models.User
	err := r.db.Select(&users, `
		SELECT DISTINCT u.* FROM users u
		JOIN user_roles ur ON u.id = ur.user_id
		WHERE ur.server_id = $1
		ORDER BY u.username
	`, serverID)

	if err != nil {
		return nil, err
	}

	// Load roles for each user
	for i := range users {
		roles, err := r.GetUserRolesInServer(users[i].ID, serverID)
		if err != nil {
			return nil, err
		}
		users[i].UserRoles = roles
	}

	return users, nil
}

// GetUserRolesInServer gets all roles for a user in a specific server
func (r *ServerRepository) GetUserRolesInServer(userID, serverID uuid.UUID) ([]models.UserRole, error) {
	var roles []models.UserRole
	err := r.db.Select(&roles, `
		SELECT * FROM user_roles
		WHERE user_id = $1 AND server_id = $2
		ORDER BY role_name
	`, userID, serverID)

	return roles, err
}

// AddUserToServer adds a user to a server
func (r *ServerRepository) AddUserToServer(userID, serverID uuid.UUID, isAdmin bool) error {
	_, err := r.db.Exec(
		"INSERT INTO user_servers (user_id, server_id, is_admin, is_shared) VALUES ($1, $2, $3, false) ON CONFLICT DO NOTHING",
		userID, serverID, isAdmin,
	)
	return err
}

// SetUserServerSharing sets whether a user shares their profile with a server
func (r *ServerRepository) SetUserServerSharing(userID, serverID uuid.UUID, isShared bool) error {
	_, err := r.db.Exec(
		"UPDATE user_servers SET is_shared = $1 WHERE user_id = $2 AND server_id = $3",
		isShared, userID, serverID,
	)
	return err
}

// AddUserRole adds a role to a user on a server
func (r *ServerRepository) AddUserRole(userID, serverID uuid.UUID, roleID, roleName, roleColor string) error {
	_, err := r.db.Exec(
		"INSERT INTO user_roles (user_id, server_id, role_id, role_name, role_color) VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING",
		userID, serverID, roleID, roleName, roleColor,
	)
	return err
}
