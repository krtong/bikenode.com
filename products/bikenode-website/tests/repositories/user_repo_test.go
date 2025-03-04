package repositories_test

import (
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/stretchr/testify/assert"

	"bikenode-website/models"
	"bikenode-website/repositories"
)

func TestGetByID(t *testing.T) {
	// Setup mock database
	db, mock, err := sqlmock.New()
	assert.NoError(t, err)
	defer db.Close()

	sqlxDB := sqlx.NewDb(db, "sqlmock")
	repo := repositories.NewUserRepository(sqlxDB)

	// Test data
	userID := uuid.New()
	now := time.Now()

	// Setup expectations
	rows := sqlmock.NewRows([]string{"id", "discord_id", "username", "discriminator", "avatar", "email", "created_at", "updated_at"}).
		AddRow(userID, "123456789", "testuser", "1234", "avatar_hash", "user@example.com", now, now)

	mock.ExpectQuery("SELECT \\* FROM users WHERE id = \\$1").
		WithArgs(userID).
		WillReturnRows(rows)

	// Execute
	user, err := repo.GetByID(userID)

	// Verify
	assert.NoError(t, err)
	assert.NotNil(t, user)
	assert.Equal(t, userID, user.ID)
	assert.Equal(t, "testuser", user.Username)
	assert.Equal(t, "user@example.com", user.Email)

	// Ensure all expectations were met
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestGetByDiscordID(t *testing.T) {
	// Setup mock database
	db, mock, err := sqlmock.New()
	assert.NoError(t, err)
	defer db.Close()

	sqlxDB := sqlx.NewDb(db, "sqlmock")
	repo := repositories.NewUserRepository(sqlxDB)

	// Test data
	userID := uuid.New()
	discordID := "123456789"
	now := time.Now()

	// Setup expectations
	rows := sqlmock.NewRows([]string{"id", "discord_id", "username", "discriminator", "avatar", "email", "created_at", "updated_at"}).
		AddRow(userID, discordID, "testuser", "1234", "avatar_hash", "user@example.com", now, now)

	mock.ExpectQuery("SELECT \\* FROM users WHERE discord_id = \\$1").
		WithArgs(discordID).
		WillReturnRows(rows)

	// Execute
	user, err := repo.GetByDiscordID(discordID)

	// Verify
	assert.NoError(t, err)
	assert.NotNil(t, user)
	assert.Equal(t, userID, user.ID)
	assert.Equal(t, discordID, user.DiscordID)
	assert.Equal(t, "testuser", user.Username)

	// Ensure all expectations were met
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestCreate(t *testing.T) {
	// Setup mock database
	db, mock, err := sqlmock.New()
	assert.NoError(t, err)
	defer db.Close()

	sqlxDB := sqlx.NewDb(db, "sqlmock")
	repo := repositories.NewUserRepository(sqlxDB)

	// Test data
	userID := uuid.New()
	now := time.Now()
	user := &models.User{
		ID:            userID,
		DiscordID:     "123456789",
		Username:      "testuser",
		Discriminator: "1234",
		Avatar:        "avatar_hash",
		Email:         "user@example.com",
		CreatedAt:     now,
		UpdatedAt:     now,
	}

	// Setup expectations - using a regular expression to match the INSERT statement
	mock.ExpectExec("INSERT INTO users").
		WithArgs(userID, "123456789", "testuser", "1234", "avatar_hash", "user@example.com", now, now).
		WillReturnResult(sqlmock.NewResult(1, 1))

	// Execute
	err = repo.Create(user)

	// Verify
	assert.NoError(t, err)

	// Ensure all expectations were met
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestUpdate(t *testing.T) {
	// Setup mock database
	db, mock, err := sqlmock.New()
	assert.NoError(t, err)
	defer db.Close()

	sqlxDB := sqlx.NewDb(db, "sqlmock")
	repo := repositories.NewUserRepository(sqlxDB)

	// Test data
	userID := uuid.New()
	now := time.Now()
	user := &models.User{
		ID:            userID,
		DiscordID:     "123456789",
		Username:      "updated_user",
		Discriminator: "1234",
		Avatar:        "new_avatar",
		Email:         "new@example.com",
		CreatedAt:     now.Add(-24 * time.Hour),
		UpdatedAt:     now,
	}

	// Setup expectations - using a regular expression to match the UPDATE statement
	mock.ExpectExec("UPDATE users SET").
		WithArgs("updated_user", "1234", "new_avatar", "new@example.com", now, userID).
		WillReturnResult(sqlmock.NewResult(1, 1))

	// Execute
	err = repo.Update(user)

	// Verify
	assert.NoError(t, err)

	// Ensure all expectations were met
	assert.NoError(t, mock.ExpectationsWereMet())
}

// Additional tests...
