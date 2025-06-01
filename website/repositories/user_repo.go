package repositories

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"

	"bikenode-website/models"
)

// userRepositoryImpl handles database operations for users
type userRepositoryImpl struct {
	db *sqlx.DB
}

// NewUserRepository creates a new user repository
func NewUserRepository(db *sqlx.DB) UserRepository {
	return &userRepositoryImpl{db: db}
}

// Get retrieves a user by ID (implementing the interface)
func (r *userRepositoryImpl) Get(ctx context.Context, id uuid.UUID) (*models.User, error) {
	user := &models.User{}
	err := r.db.Get(user, "SELECT * FROM users WHERE id = $1", id)
	return user, err
}

// GetByDiscordID retrieves a user by Discord ID
func (r *userRepositoryImpl) GetByDiscordID(ctx context.Context, discordID string) (*models.User, error) {
	user := &models.User{}
	err := r.db.Get(user, "SELECT * FROM users WHERE discord_id = $1", discordID)
	if err != nil {
		// Check if it's a "no rows" error, meaning user doesn't exist
		if err.Error() == "sql: no rows in result set" {
			return nil, nil
		}
		return nil, err
	}
	return user, nil
}

// Create inserts a new user
func (r *userRepositoryImpl) Create(ctx context.Context, user *models.User) error {
	// Set timestamps if not already set
	if user.CreatedAt.IsZero() {
		user.CreatedAt = time.Now()
	}
	if user.UpdatedAt.IsZero() {
		user.UpdatedAt = time.Now()
	}

	_, err := r.db.NamedExec(`
		INSERT INTO users (id, discord_id, username, discriminator, avatar, email, created_at, updated_at)
		VALUES (:id, :discord_id, :username, :discriminator, :avatar, :email, :created_at, :updated_at)
	`, user)
	return err
}

// Update updates an existing user
func (r *userRepositoryImpl) Update(ctx context.Context, user *models.User) error {
	user.UpdatedAt = time.Now()

	_, err := r.db.NamedExec(`
		UPDATE users SET 
		username = :username, 
		discriminator = :discriminator, 
		avatar = :avatar, 
		email = :email,
		updated_at = :updated_at
		WHERE id = :id
	`, user)
	return err
}

// Delete removes a user
func (r *userRepositoryImpl) Delete(ctx context.Context, id uuid.UUID) error {
	_, err := r.db.Exec("DELETE FROM users WHERE id = $1", id)
	return err
}

// GetUserRoles retrieves all roles for a user across all servers
func (r *userRepositoryImpl) GetUserRoles(userID uuid.UUID) ([]models.UserRole, error) {
	var roles []models.UserRole
	err := r.db.Select(&roles, `
		SELECT ur.* 
		FROM user_roles ur
		WHERE ur.user_id = $1
	`, userID)
	return roles, err
}

// GetUserRolesByServer retrieves all roles for a user on a specific server
func (r *userRepositoryImpl) GetUserRolesByServer(userID uuid.UUID, serverID uuid.UUID) ([]models.UserRole, error) {
	var roles []models.UserRole
	err := r.db.Select(&roles, `
		SELECT ur.* 
		FROM user_roles ur
		WHERE ur.user_id = $1 AND ur.server_id = $2
	`, userID, serverID)
	return roles, err
}

// SaveUserRole creates or updates a user role
func (r *userRepositoryImpl) SaveUserRole(role *models.UserRole) error {
	// Check if role exists
	var exists bool
	err := r.db.Get(&exists, `
		SELECT EXISTS(
			SELECT 1 FROM user_roles 
			WHERE user_id = $1 AND server_id = $2 AND role_id = $3
		)
	`, role.UserID, role.ServerID, role.RoleID)

	if err != nil {
		return err
	}

	if exists {
		// Update
		_, err = r.db.NamedExec(`
			UPDATE user_roles SET
			role_name = :role_name,
			role_color = :role_color,
			updated_at = :updated_at
			WHERE user_id = :user_id AND server_id = :server_id AND role_id = :role_id
		`, role)
	} else {
		// Insert
		role.ID = uuid.New()
		role.CreatedAt = time.Now()
		role.UpdatedAt = time.Now()

		_, err = r.db.NamedExec(`
			INSERT INTO user_roles (id, user_id, server_id, role_id, role_name, role_color, created_at, updated_at)
			VALUES (:id, :user_id, :server_id, :role_id, :role_name, :role_color, :created_at, :updated_at)
		`, role)
	}

	return err
}

// DeleteUserRole removes a role from a user
func (r *userRepositoryImpl) DeleteUserRole(userID, serverID uuid.UUID, roleID string) error {
	_, err := r.db.Exec(`
		DELETE FROM user_roles 
		WHERE user_id = $1 AND server_id = $2 AND role_id = $3
	`, userID, serverID, roleID)
	return err
}

// SetServerVisibility sets whether a user's profile is visible on a server
func (r *userRepositoryImpl) SetServerVisibility(userID, serverID uuid.UUID, isVisible bool) error {
	// Check if record exists
	var exists bool
	err := r.db.Get(&exists, `
		SELECT EXISTS(
			SELECT 1 FROM user_server_visibility 
			WHERE user_id = $1 AND server_id = $2
		)
	`, userID, serverID)

	if err != nil {
		return err
	}

	if exists {
		// Update
		_, err = r.db.Exec(`
			UPDATE user_server_visibility SET
			is_visible = $3
			WHERE user_id = $1 AND server_id = $2
		`, userID, serverID, isVisible)
	} else {
		// Insert
		_, err = r.db.Exec(`
			INSERT INTO user_server_visibility (user_id, server_id, is_visible)
			VALUES ($1, $2, $3)
		`, userID, serverID, isVisible)
	}

	return err
}
