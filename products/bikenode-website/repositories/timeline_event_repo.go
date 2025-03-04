package repositories

import (
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"

	"bikenode-website/models"
)

// TimelineEventRepository handles database operations for timeline events
type TimelineEventRepository struct {
	db *sqlx.DB
}

// NewTimelineEventRepository creates a new timeline event repository
func NewTimelineEventRepository(db *sqlx.DB) *TimelineEventRepository {
	return &TimelineEventRepository{db: db}
}

// GetByID retrieves a timeline event by ID
func (r *TimelineEventRepository) GetByID(id uuid.UUID) (*models.TimelineEvent, error) {
	event := &models.TimelineEvent{}
	err := r.db.Get(event, "SELECT * FROM timeline_events WHERE id = $1", id)
	if err != nil {
		return nil, err
	}

	// Load server sharing info
	serverIDs, err := r.GetSharedServers(id)
	if err != nil {
		return nil, err
	}

	event.SharedToServers = serverIDs
	return event, nil
}

// GetByOwnershipID retrieves timeline events for an ownership
func (r *TimelineEventRepository) GetByOwnershipID(ownershipID uuid.UUID) ([]models.TimelineEvent, error) {
	var events []models.TimelineEvent
	err := r.db.Select(&events, `
		SELECT * FROM timeline_events 
		WHERE ownership_id = $1 
		ORDER BY date DESC, created_at DESC
	`, ownershipID)

	if err != nil {
		return nil, err
	}

	// Load server sharing info for each event
	for i := range events {
		serverIDs, err := r.GetSharedServers(events[i].ID)
		if err != nil {
			return nil, err
		}
		events[i].SharedToServers = serverIDs
	}

	return events, nil
}

// Create inserts a new timeline event and its server shares
func (r *TimelineEventRepository) Create(event *models.TimelineEvent) error {
	tx, err := r.db.Beginx()
	if err != nil {
		return err
	}

	// Set ID and timestamps if not already set
	if event.ID == uuid.Nil {
		event.ID = uuid.New()
	}
	if event.CreatedAt.IsZero() {
		event.CreatedAt = time.Now()
	}
	if event.UpdatedAt.IsZero() {
		event.UpdatedAt = time.Now()
	}

	// Insert the event
	_, err = tx.NamedExec(`
		INSERT INTO timeline_events (
			id, ownership_id, type, date, title, description, 
			media_url, is_public, created_at, updated_at
		) VALUES (
			:id, :ownership_id, :type, :date, :title, :description, 
			:media_url, :is_public, :created_at, :updated_at
		)
	`, event)

	if err != nil {
		tx.Rollback()
		return err
	}

	// Insert server shares if any
	for _, serverID := range event.SharedToServers {
		_, err = tx.Exec(`
			INSERT INTO event_server_shares (event_id, server_id)
			VALUES ($1, $2)
		`, event.ID, serverID)

		if err != nil {
			tx.Rollback()
			return err
		}
	}

	return tx.Commit()
}

// Update updates an existing timeline event and its server shares
func (r *TimelineEventRepository) Update(event *models.TimelineEvent) error {
	tx, err := r.db.Beginx()
	if err != nil {
		return err
	}

	// Update timestamp
	event.UpdatedAt = time.Now()

	// Update the event
	_, err = tx.NamedExec(`
		UPDATE timeline_events SET 
		type = :type,
		date = :date,
		title = :title,
		description = :description,
		media_url = :media_url,
		is_public = :is_public,
		updated_at = :updated_at
		WHERE id = :id
	`, event)

	if err != nil {
		tx.Rollback()
		return err
	}

	// Delete existing server shares
	_, err = tx.Exec("DELETE FROM event_server_shares WHERE event_id = $1", event.ID)
	if err != nil {
		tx.Rollback()
		return err
	}

	// Insert new server shares
	for _, serverID := range event.SharedToServers {
		_, err = tx.Exec(`
			INSERT INTO event_server_shares (event_id, server_id)
			VALUES ($1, $2)
		`, event.ID, serverID)

		if err != nil {
			tx.Rollback()
			return err
		}
	}

	return tx.Commit()
}

// Delete deletes a timeline event and its server shares
func (r *TimelineEventRepository) Delete(id uuid.UUID) error {
	tx, err := r.db.Beginx()
	if err != nil {
		return err
	}

	// Delete server shares first (foreign key constraint)
	_, err = tx.Exec("DELETE FROM event_server_shares WHERE event_id = $1", id)
	if err != nil {
		tx.Rollback()
		return err
	}

	// Delete the event
	_, err = tx.Exec("DELETE FROM timeline_events WHERE id = $1", id)
	if err != nil {
		tx.Rollback()
		return err
	}

	return tx.Commit()
}

// GetSharedServers gets the server IDs an event is shared to
func (r *TimelineEventRepository) GetSharedServers(eventID uuid.UUID) ([]uuid.UUID, error) {
	var serverIDs []uuid.UUID
	err := r.db.Select(&serverIDs, `
		SELECT server_id FROM event_server_shares 
		WHERE event_id = $1
	`, eventID)
	return serverIDs, err
}

// ShareToServer shares an event to a server
func (r *TimelineEventRepository) ShareToServer(eventID, serverID uuid.UUID) error {
	// Check if already shared
	var exists bool
	err := r.db.Get(&exists, `
		SELECT EXISTS(
			SELECT 1 FROM event_server_shares 
			WHERE event_id = $1 AND server_id = $2
		)
	`, eventID, serverID)

	if err != nil {
		return err
	}

	if exists {
		return nil // Already shared, nothing to do
	}

	// Insert the share
	_, err = r.db.Exec(`
		INSERT INTO event_server_shares (event_id, server_id)
		VALUES ($1, $2)
	`, eventID, serverID)

	return err
}

// UnshareFromServer removes an event share from a server
func (r *TimelineEventRepository) UnshareFromServer(eventID, serverID uuid.UUID) error {
	_, err := r.db.Exec(`
		DELETE FROM event_server_shares 
		WHERE event_id = $1 AND server_id = $2
	`, eventID, serverID)

	return err
}

// GetServerEvents gets all events shared to a server
func (r *TimelineEventRepository) GetServerEvents(serverID uuid.UUID, limit, offset int) ([]models.TimelineEvent, error) {
	var events []models.TimelineEvent
	err := r.db.Select(&events, `
		SELECT e.* FROM timeline_events e
		JOIN event_server_shares s ON e.id = s.event_id
		WHERE s.server_id = $1 AND e.is_public = true
		ORDER BY e.date DESC
		LIMIT $2 OFFSET $3
	`, serverID, limit, offset)

	return events, err
}

// EnsureEventOwnership ensures the user owns the event via ownership
func (r *TimelineEventRepository) EnsureEventOwnership(eventID uuid.UUID, userID uuid.UUID) (bool, error) {
	var count int
	err := r.db.Get(&count, `
		SELECT COUNT(*) FROM timeline_events te
		JOIN ownerships o ON te.ownership_id = o.id
		WHERE te.id = $1 AND o.user_id = $2
	`, eventID, userID)

	return count > 0, err
}
