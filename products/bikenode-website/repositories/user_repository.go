package repositories

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"

	"bikenode-website/logger"
	"bikenode-website/models"
)

// PostgresUserRepository implements UserRepository using PostgreSQL
type PostgresUserRepository struct {
	db *sqlx.DB
}

// NewUserRepository creates a new PostgresUserRepository
func NewUserRepository(db *sqlx.DB) UserRepository {
	return &PostgresUserRepository{db: db}
}

// Get retrieves a user by ID
func (r *PostgresUserRepository) Get(ctx context.Context, id uuid.UUID) (*models.User, error) {
	var user models.User
	err := r.db.GetContext(ctx, &user, "SELECT * FROM users WHERE id = $1", id)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		logger.Error("Failed to get user", err, logger.Fields{
			"user_id": id.String(),
		})
		return nil, fmt.Errorf("failed to get user: %w", err)
	}
	return &user, nil
}

// GetByDiscordID retrieves a user by Discord ID
func (r *PostgresUserRepository) GetByDiscordID(ctx context.Context, discordID string) (*models.User, error) {
	var user models.User
	err := r.db.GetContext(ctx, &user, "SELECT * FROM users WHERE discord_id = $1", discordID)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		logger.Error("Failed to get user by Discord ID", err, logger.Fields{
			"discord_id": discordID,
		})
		return nil, fmt.Errorf("failed to get user by Discord ID: %w", err)
	}
	return &user, nil
}

// Create creates a new user
func (r *PostgresUserRepository) Create(ctx context.Context, user *models.User) error {
	if user.ID == uuid.Nil {
		user.ID = uuid.New()
	}

	now := time.Now()
	user.CreatedAt = now
	user.UpdatedAt = now

	query := `
		INSERT INTO users (id, discord_id, username, discriminator, avatar, email, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`

	_, err := r.db.ExecContext(
		ctx, query,
		user.ID, user.DiscordID, user.Username, user.Discriminator,
		user.Avatar, user.Email, user.CreatedAt, user.UpdatedAt,
	)

	if err != nil {
		logger.Error("Failed to create user", err, logger.Fields{
			"discord_id": user.DiscordID,
			"username":   user.Username,
		})
		return fmt.Errorf("failed to create user: %w", err)
	}

	return nil
}

// Update updates an existing user
func (r *PostgresUserRepository) Update(ctx context.Context, user *models.User) error {
	user.UpdatedAt = time.Now()

	query := `
		UPDATE users
		SET discord_id = $1, username = $2, discriminator = $3,
			avatar = $4, email = $5, updated_at = $6
		WHERE id = $7
	`

	_, err := r.db.ExecContext(
		ctx, query,
		user.DiscordID, user.Username, user.Discriminator,
		user.Avatar, user.Email, user.UpdatedAt, user.ID,
	)

	if err != nil {
		logger.Error("Failed to update user", err, logger.Fields{
			"user_id": user.ID.String(),
		})
		return fmt.Errorf("failed to update user: %w", err)
	}

	return nil
}

// Delete deletes a user by ID
func (r *PostgresUserRepository) Delete(ctx context.Context, id uuid.UUID) error {
	_, err := r.db.ExecContext(ctx, "DELETE FROM users WHERE id = $1", id)

	if err != nil {
		logger.Error("Failed to delete user", err, logger.Fields{
			"user_id": id.String(),
		})
		return fmt.Errorf("failed to delete user: %w", err)
	}

	return nil
}
