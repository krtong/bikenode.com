package repositories

import (
	"database/sql"
	"time"

	"github.com/bikenode/website/models"
	"github.com/jmoiron/sqlx"
)

// UserRepository handles database operations for users
type UserRepository struct {
	db *sqlx.DB
}

// NewUserRepository creates a new UserRepository
func NewUserRepository(db *sqlx.DB) *UserRepository {
	return &UserRepository{db: db}
}

// GetUserByID retrieves a user by ID
func (r *UserRepository) GetUserByID(id int) (*models.User, error) {
	var user models.User
	err := r.db.Get(&user, "SELECT * FROM users WHERE id = $1", id)
	if err != nil {
		return nil, err
	}
	return &user, nil
}

// GetUserByDiscordID retrieves a user by Discord ID
func (r *UserRepository) GetUserByDiscordID(discordID string) (*models.User, error) {
	var user models.User
	err := r.db.Get(&user, "SELECT * FROM users WHERE discord_id = $1", discordID)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &user, nil
}

// CreateUser creates a new user
func (r *UserRepository) CreateUser(discordID, username, avatar string) (*models.User, error) {
	var user models.User
	err := r.db.QueryRowx(
		"INSERT INTO users (discord_id, username, avatar) VALUES ($1, $2, $3) RETURNING *",
		discordID, username, avatar,
	).StructScan(&user)
	if err != nil {
		return nil, err
	}
	return &user, nil
}

// UpdateUser updates a user's information
func (r *UserRepository) UpdateUser(id int, username, avatar string) (*models.User, error) {
	var user models.User
	err := r.db.QueryRowx(
		"UPDATE users SET username = $1, avatar = $2, updated_at = $3 WHERE id = $4 RETURNING *",
		username, avatar, time.Now(), id,
	).StructScan(&user)
	if err != nil {
		return nil, err
	}
	return &user, nil
}

// GetUserServers retrieves all servers a user belongs to
func (r *UserRepository) GetUserServers(userID int) ([]models.ServerWithSharing, error) {
	servers := []models.ServerWithSharing{}
	query := `
		SELECT s.*, us.is_admin, us.shared_profile
		FROM servers s
		JOIN user_servers us ON s.id = us.server_id
		WHERE us.user_id = $1
		ORDER BY s.name
	`
	err := r.db.Select(&servers, query, userID)
	if err != nil {
		return nil, err
	}
	return servers, nil
}

// GetUserRolesForServer retrieves all roles a user has on a server
func (r *UserRepository) GetUserRolesForServer(userID, serverID int) ([]models.UserRole, error) {
	roles := []models.UserRole{}
	query := `
		SELECT * FROM user_roles
		WHERE user_id = $1 AND server_id = $2
		ORDER BY role_name
	`
	err := r.db.Select(&roles, query, userID, serverID)
	if err != nil {
		return nil, err
	}
	return roles, nil
}

// SetProfileSharing sets whether a user shares their profile with a server
func (r *UserRepository) SetProfileSharing(userID, serverID int, shared bool) error {
	_, err := r.db.Exec(
		"UPDATE user_servers SET shared_profile = $1 WHERE user_id = $2 AND server_id = $3",
		shared, userID, serverID,
	)
	return err
}
