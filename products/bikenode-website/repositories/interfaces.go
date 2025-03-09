package repositories

import (
	"context"

	"github.com/google/uuid"

	"bikenode-website/models"
)

// UserRepository defines methods for interacting with user data
type UserRepository interface {
	Get(ctx context.Context, id uuid.UUID) (*models.User, error)
	GetByDiscordID(ctx context.Context, discordID string) (*models.User, error)
	Create(ctx context.Context, user *models.User) error
	Update(ctx context.Context, user *models.User) error
	Delete(ctx context.Context, id uuid.UUID) error
}

// MotorcycleRepository defines methods for interacting with motorcycle data
type MotorcycleRepository interface {
	Get(ctx context.Context, id uuid.UUID) (*models.Motorcycle, error)
	GetAll(ctx context.Context) ([]*models.Motorcycle, error)
	Create(ctx context.Context, motorcycle *models.Motorcycle) error
	Update(ctx context.Context, motorcycle *models.Motorcycle) error
	Delete(ctx context.Context, id uuid.UUID) error
	FindByMakeAndModel(ctx context.Context, make, model string) ([]*models.Motorcycle, error)
}

// OwnershipRepository defines methods for interacting with ownership data
type OwnershipRepository interface {
	Get(ctx context.Context, id uuid.UUID) (*models.Ownership, error)
	GetByUser(ctx context.Context, userID uuid.UUID) ([]*models.Ownership, error)
	Create(ctx context.Context, ownership *models.Ownership) error
	Update(ctx context.Context, ownership *models.Ownership) error
	Delete(ctx context.Context, id uuid.UUID) error
}

// TimelineEventRepository defines methods for interacting with timeline event data
type TimelineEventRepository interface {
	Get(ctx context.Context, id uuid.UUID) (*models.TimelineEvent, error)
	GetByOwnership(ctx context.Context, ownershipID uuid.UUID) ([]*models.TimelineEvent, error)
	GetPublic(ctx context.Context) ([]*models.TimelineEvent, error)
	Create(ctx context.Context, event *models.TimelineEvent) error
	Update(ctx context.Context, event *models.TimelineEvent) error
	Delete(ctx context.Context, id uuid.UUID) error
	ShareWithServer(ctx context.Context, eventID, serverID uuid.UUID) error
	RemoveServerShare(ctx context.Context, eventID, serverID uuid.UUID) error
}

// ServerRepository defines methods for interacting with server data
type ServerRepository interface {
	Get(ctx context.Context, id uuid.UUID) (*models.Server, error)
	GetByDiscordID(ctx context.Context, discordID string) (*models.Server, error)
	GetAll(ctx context.Context) ([]*models.Server, error)
	Create(ctx context.Context, server *models.Server) error
	Update(ctx context.Context, server *models.Server) error
	Delete(ctx context.Context, id uuid.UUID) error
	GetConfig(ctx context.Context, serverID uuid.UUID) (*models.ServerConfig, error)
	UpdateConfig(ctx context.Context, config *models.ServerConfig) error
}
