package services

import (
	"fmt"
	"time"

	"github.com/google/uuid"

	"bikenode-website/models"
	"bikenode-website/repositories"
)

// ProfileService handles profile-related operations
type ProfileService struct {
	userRepo       *repositories.UserRepository
	motorcycleRepo *repositories.MotorcycleRepository
	ownershipRepo  *repositories.OwnershipRepository
	timelineRepo   *repositories.TimelineEventRepository
	serverRepo     *repositories.ServerRepository
}

// NewProfileService creates a new profile service
func NewProfileService(
	userRepo *repositories.UserRepository,
	motorcycleRepo *repositories.MotorcycleRepository,
	ownershipRepo *repositories.OwnershipRepository,
	timelineRepo *repositories.TimelineEventRepository,
	serverRepo *repositories.ServerRepository,
) *ProfileService {
	return &ProfileService{
		userRepo:       userRepo,
		motorcycleRepo: motorcycleRepo,
		ownershipRepo:  ownershipRepo,
		timelineRepo:   timelineRepo,
		serverRepo:     serverRepo,
	}
}

// GetUserProfile retrieves a user's profile data
func (s *ProfileService) GetUserProfile(userID uuid.UUID) (*models.User, error) {
	user, err := s.userRepo.GetByID(userID)
	if err != nil {
		return nil, err
	}

	// Load user's roles for badge display
	roles, err := s.userRepo.GetUserRoles(userID)
	if err != nil {
		return nil, err
	}
	user.UserRoles = roles

	return user, nil
}

// GetUserOwnerships retrieves a user's motorcycle ownerships
func (s *ProfileService) GetUserOwnerships(userID uuid.UUID) ([]models.Ownership, error) {
	ownerships, err := s.ownershipRepo.GetByUserID(userID, true)
	if err != nil {
		return nil, err
	}

	// Load timeline events for each ownership
	for i := range ownerships {
		events, err := s.timelineRepo.GetByOwnershipID(ownerships[i].ID)
		if err != nil {
			return nil, err
		}
		ownerships[i].TimelineEvents = events
	}

	return ownerships, nil
}

// AddMotorcycle adds a motorcycle to a user's profile
func (s *ProfileService) AddMotorcycle(userID, motorcycleID uuid.UUID, purchaseDate time.Time, notes string) (*models.Ownership, error) {
	// Verify motorcycle exists
	motorcycle, err := s.motorcycleRepo.GetByID(motorcycleID)
	if err != nil {
		return nil, fmt.Errorf("motorcycle not found: %w", err)
	}

	// Check if user already owns this motorcycle
	existing, err := s.ownershipRepo.GetForMotorcycleAndUser(motorcycleID, userID)
	if err == nil {
		return nil, fmt.Errorf("you already own this motorcycle")
	}

	// Create new ownership
	ownership := &models.Ownership{
		ID:           uuid.New(),
		UserID:       userID,
		MotorcycleID: motorcycleID,
		PurchaseDate: purchaseDate,
		Notes:        notes,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
		Motorcycle:   motorcycle,
	}

	if err := s.ownershipRepo.Create(ownership); err != nil {
		return nil, err
	}

	return ownership, nil
}

// RemoveMotorcycle removes a motorcycle from a user's profile
func (s *ProfileService) RemoveMotorcycle(ownershipID, userID uuid.UUID) error {
	// Verify ownership exists and belongs to user
	ownership, err := s.ownershipRepo.GetByID(ownershipID)
	if err != nil {
		return fmt.Errorf("ownership not found: %w", err)
	}

	if ownership.UserID != userID {
		return fmt.Errorf("unauthorized: ownership does not belong to user")
	}

	// Delete ownership (cascade deletes timeline events)
	return s.ownershipRepo.Delete(ownershipID)
}

// AddTimelineEvent adds a new timeline event
func (s *ProfileService) AddTimelineEvent(event *models.TimelineEvent, userID uuid.UUID) error {
	// Verify ownership exists and belongs to user
	isOwner, err := s.ownershipRepo.EnsureOwnership(event.OwnershipID, userID)
	if err != nil {
		return fmt.Errorf("failed to verify ownership: %w", err)
	}

	if !isOwner {
		return fmt.Errorf("unauthorized: ownership does not belong to user")
	}

	// Set event ID and timestamps
	event.ID = uuid.New()
	now := time.Now()
	event.CreatedAt = now
	event.UpdatedAt = now

	// Create the event
	if err := s.timelineRepo.Create(event); err != nil {
		return err
	}

	return nil
}

// UpdateTimelineEvent updates an existing timeline event
func (s *ProfileService) UpdateTimelineEvent(event *models.TimelineEvent, userID uuid.UUID) error {
	// Verify event exists and belongs to user
	isOwner, err := s.timelineRepo.EnsureEventOwnership(event.ID, userID)
	if err != nil {
		return fmt.Errorf("failed to verify event ownership: %w", err)
	}

	if !isOwner {
		return fmt.Errorf("unauthorized: event does not belong to user")
	}

	// Update the event
	event.UpdatedAt = time.Now()
	if err := s.timelineRepo.Update(event); err != nil {
		return err
	}

	return nil
}

// RemoveTimelineEvent removes a timeline event
func (s *ProfileService) RemoveTimelineEvent(userID string, eventID int) error {
	// Convert string userID to UUID
	userUUID, err := uuid.Parse(userID)
	if err != nil {
		return fmt.Errorf("invalid user ID: %w", err)
	}

	// Convert int eventID to UUID (this would need to be adjusted based on actual ID type)
	eventUUID, err := uuid.Parse(fmt.Sprintf("%d", eventID))
	if err != nil {
		return fmt.Errorf("invalid event ID: %w", err)
	}

	// Verify event exists and belongs to user
	isOwner, err := s.timelineRepo.EnsureEventOwnership(eventUUID, userUUID)
	if err != nil {
		return fmt.Errorf("failed to verify event ownership: %w", err)
	}

	if !isOwner {
		return fmt.Errorf("unauthorized: event does not belong to user")
	}

	// Delete the event
	return s.timelineRepo.Delete(eventUUID)
}

// GetUserServers retrieves servers where the user has joined
func (s *ProfileService) GetUserServers(userID string) ([]models.Server, error) {
	// Convert string userID to UUID
	userUUID, err := uuid.Parse(userID)
	if err != nil {
		return nil, fmt.Errorf("invalid user ID: %w", err)
	}

	return s.serverRepo.GetUserServers(userUUID)
}

// GetUserMotorcycles retrieves motorcycles owned by the user
func (s *ProfileService) GetUserMotorcycles(userID string, includeInactive bool) ([]models.Motorcycle, error) {
	// Convert string userID to UUID
	userUUID, err := uuid.Parse(userID)
	if err != nil {
		return nil, fmt.Errorf("invalid user ID: %w", err)
	}

	ownerships, err := s.ownershipRepo.GetByUserID(userUUID, includeInactive)
	if err != nil {
		return nil, err
	}

	motorcycles := make([]models.Motorcycle, 0, len(ownerships))
	for _, ownership := range ownerships {
		if ownership.Motorcycle != nil {
			motorcycles = append(motorcycles, *ownership.Motorcycle)
		}
	}

	return motorcycles, nil
}

// SearchMotorcycles searches for motorcycles with filters
func (s *ProfileService) SearchMotorcycles(year int, make, model, packageName, category string, page, limit int) ([]models.Motorcycle, int, error) {
	search := &models.MotorcycleSearch{
		Year:     year,
		Make:     make,
		Model:    model,
		Package:  packageName,
		Category: category,
		Page:     page,
		PageSize: limit,
	}

	return s.motorcycleRepo.Search(search)
}

// SetServerVisibility sets the visibility of a user's profile on a server
func (s *ProfileService) SetServerVisibility(userID, serverID string, visible bool) error {
	// Convert string IDs to UUIDs
	userUUID, err := uuid.Parse(userID)
	if err != nil {
		return fmt.Errorf("invalid user ID: %w", err)
	}

	serverUUID, err := uuid.Parse(serverID)
	if err != nil {
		return fmt.Errorf("invalid server ID: %w", err)
	}

	// Update visibility setting
	return s.serverRepo.SetUserServerSharing(userUUID, serverUUID, visible)
}
