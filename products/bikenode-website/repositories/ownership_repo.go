package repositories

import (
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"

	"bikenode-website/models"
)

// OwnershipRepository handles database operations for motorcycle ownerships
type OwnershipRepository struct {
	db *sqlx.DB
}

// NewOwnershipRepository creates a new ownership repository
func NewOwnershipRepository(db *sqlx.DB) *OwnershipRepository {
	return &OwnershipRepository{db: db}
}

// GetByID retrieves an ownership by ID
func (r *OwnershipRepository) GetByID(id uuid.UUID) (*models.Ownership, error) {
	ownership := &models.Ownership{}
	err := r.db.Get(ownership, "SELECT * FROM ownerships WHERE id = $1", id)
	return ownership, err
}

// GetByUserID retrieves all ownerships for a user
func (r *OwnershipRepository) GetByUserID(userID uuid.UUID, includeInactive bool) ([]models.Ownership, error) {
	var ownerships []models.Ownership

	var query string
	if includeInactive {
		query = `
			SELECT o.* FROM ownerships o
			WHERE o.user_id = $1
			ORDER BY 
			    CASE WHEN o.end_date IS NULL THEN 0 ELSE 1 END,
			    o.purchase_date DESC
		`
	} else {
		query = `
			SELECT o.* FROM ownerships o
			WHERE o.user_id = $1 AND o.end_date IS NULL
			ORDER BY o.purchase_date DESC
		`
	}

	err := r.db.Select(&ownerships, query, userID)
	if err != nil {
		return nil, err
	}

	// Load motorcycle details for each ownership
	for i := range ownerships {
		motorcycle := &models.Motorcycle{}
		err := r.db.Get(motorcycle, "SELECT * FROM motorcycles WHERE id = $1", ownerships[i].MotorcycleID)
		if err != nil {
			return nil, err
		}
		ownerships[i].Motorcycle = motorcycle
	}

	return ownerships, nil
}

// Create inserts a new ownership
func (r *OwnershipRepository) Create(ownership *models.Ownership) error {
	if ownership.ID == uuid.Nil {
		ownership.ID = uuid.New()
	}
	if ownership.CreatedAt.IsZero() {
		ownership.CreatedAt = time.Now()
	}
	if ownership.UpdatedAt.IsZero() {
		ownership.UpdatedAt = time.Now()
	}

	_, err := r.db.NamedExec(`
		INSERT INTO ownerships (id, user_id, motorcycle_id, purchase_date, end_date, end_reason, notes, created_at, updated_at)
		VALUES (:id, :user_id, :motorcycle_id, :purchase_date, :end_date, :end_reason, :notes, :created_at, :updated_at)
	`, ownership)
	return err
}

// Update updates an existing ownership
func (r *OwnershipRepository) Update(ownership *models.Ownership) error {
	ownership.UpdatedAt = time.Now()

	_, err := r.db.NamedExec(`
		UPDATE ownerships SET
		purchase_date = :purchase_date,
		end_date = :end_date,
		end_reason = :end_reason,
		notes = :notes,
		updated_at = :updated_at
		WHERE id = :id
	`, ownership)
	return err
}

// MarkAsEnded marks an ownership as ended
func (r *OwnershipRepository) MarkAsEnded(id uuid.UUID, endDate time.Time, endReason string) error {
	_, err := r.db.Exec(`
		UPDATE ownerships SET
		end_date = $1,
		end_reason = $2,
		updated_at = $3
		WHERE id = $4
	`, endDate, endReason, time.Now(), id)
	return err
}

// Delete deletes an ownership
func (r *OwnershipRepository) Delete(id uuid.UUID) error {
	// First delete all timeline events associated with this ownership
	_, err := r.db.Exec(`
		WITH event_ids AS (
			SELECT id FROM timeline_events WHERE ownership_id = $1
		)
		DELETE FROM event_server_shares WHERE event_id IN (SELECT id FROM event_ids)
	`, id)

	if err != nil {
		return err
	}

	_, err = r.db.Exec("DELETE FROM timeline_events WHERE ownership_id = $1", id)
	if err != nil {
		return err
	}

	_, err = r.db.Exec("DELETE FROM ownerships WHERE id = $1", id)
	return err
}

// GetForMotorcycleAndUser retrieves an ownership by motorcycle ID and user ID
func (r *OwnershipRepository) GetForMotorcycleAndUser(motorcycleID, userID uuid.UUID) (*models.Ownership, error) {
	ownership := &models.Ownership{}
	err := r.db.Get(ownership, `
		SELECT * FROM ownerships 
		WHERE motorcycle_id = $1 AND user_id = $2 AND end_date IS NULL
	`, motorcycleID, userID)
	return ownership, err
}

// EnsureOwnership ensures the user owns the motorcycle associated with an ownership
func (r *OwnershipRepository) EnsureOwnership(ownershipID, userID uuid.UUID) (bool, error) {
	var count int
	err := r.db.Get(&count, `
		SELECT COUNT(*) FROM ownerships 
		WHERE id = $1 AND user_id = $2
	`, ownershipID, userID)

	return count > 0, err
}
