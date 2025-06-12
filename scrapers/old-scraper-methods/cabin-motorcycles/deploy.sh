#!/bin/bash

# Cabin Motorcycles Production Deployment Script
# This script handles zero-downtime deployment

set -e  # Exit on error

# Configuration
DEPLOYMENT_ENV=${1:-production}
BACKUP_BEFORE_DEPLOY=${BACKUP_BEFORE_DEPLOY:-true}
RUN_MIGRATIONS=${RUN_MIGRATIONS:-true}
RUN_TESTS=${RUN_TESTS:-true}

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Functions
print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
    exit 1
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[i]${NC} $1"
}

# Header
echo "======================================"
echo "Cabin Motorcycles Deployment"
echo "Environment: $DEPLOYMENT_ENV"
echo "======================================"
echo ""

# Pre-deployment checks
print_info "Running pre-deployment checks..."

# Check if .env exists
if [ ! -f ".env" ]; then
    print_error ".env file not found. Run setup.sh first."
fi

# Load environment variables
export $(cat .env | grep -v '^#' | xargs)

# Validate environment
if ! node validate-env.js; then
    print_error "Environment validation failed"
fi

# Run tests if enabled
if [ "$RUN_TESTS" = "true" ]; then
    print_info "Running tests..."
    if npm test; then
        print_status "All tests passed"
    else
        print_error "Tests failed. Deployment aborted."
    fi
fi

# Create backup if enabled
if [ "$BACKUP_BEFORE_DEPLOY" = "true" ]; then
    print_info "Creating backup..."
    BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$BACKUP_DIR"
    
    # Backup database
    if [ -n "$DB_HOST" ]; then
        PGPASSWORD=$DB_PASSWORD pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME > "$BACKUP_DIR/database.sql"
        print_status "Database backed up to $BACKUP_DIR/database.sql"
    fi
    
    # Backup data files
    if [ -d "data" ]; then
        cp -r data "$BACKUP_DIR/"
        print_status "Data files backed up"
    fi
fi

# Build Docker image
print_info "Building Docker image..."
docker build -t cabin-motorcycles:latest .
docker tag cabin-motorcycles:latest cabin-motorcycles:$DEPLOYMENT_ENV
print_status "Docker image built"

# Run database migrations if enabled
if [ "$RUN_MIGRATIONS" = "true" ]; then
    print_info "Running database migrations..."
    docker-compose run --rm scrapers node database/migrate.js
    print_status "Migrations completed"
fi

# Deploy based on environment
case $DEPLOYMENT_ENV in
    "production")
        print_info "Deploying to production..."
        
        # Start new containers with zero-downtime
        docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --no-deps --scale scrapers=2
        
        # Wait for health checks
        print_info "Waiting for services to be healthy..."
        sleep 10
        
        # Check health
        if docker-compose ps | grep -q "unhealthy"; then
            print_error "Services are unhealthy. Rolling back..."
            docker-compose down
            docker-compose up -d
            exit 1
        fi
        
        # Remove old containers
        docker-compose rm -f -s -v
        
        print_status "Production deployment complete"
        ;;
        
    "staging")
        print_info "Deploying to staging..."
        docker-compose -f docker-compose.yml -f docker-compose.staging.yml up -d
        print_status "Staging deployment complete"
        ;;
        
    "development")
        print_info "Deploying to development..."
        docker-compose up -d
        print_status "Development deployment complete"
        ;;
        
    *)
        print_error "Unknown environment: $DEPLOYMENT_ENV"
        ;;
esac

# Post-deployment tasks
print_info "Running post-deployment tasks..."

# Clear caches
docker-compose exec -T redis redis-cli FLUSHALL
print_status "Caches cleared"

# Run health checks
print_info "Running health checks..."
if node health-check.js; then
    print_status "Health checks passed"
else
    print_warning "Health checks failed - please investigate"
fi

# Send deployment notification (if configured)
if [ -n "$SLACK_WEBHOOK_URL" ]; then
    curl -X POST -H 'Content-type: application/json' \
        --data "{\"text\":\"Cabin Motorcycles deployed to $DEPLOYMENT_ENV successfully\"}" \
        "$SLACK_WEBHOOK_URL" 2>/dev/null || print_warning "Failed to send Slack notification"
fi

# Show deployment summary
echo ""
echo "======================================"
echo "Deployment Summary"
echo "======================================"
echo "Environment: $DEPLOYMENT_ENV"
echo "Version: $(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')"
echo "Time: $(date)"
echo ""

# Show running services
docker-compose ps

echo ""
print_status "Deployment completed successfully!"
echo ""
echo "Post-deployment checklist:"
echo "- [ ] Check application logs: docker-compose logs -f"
echo "- [ ] Verify API endpoints are responding"
echo "- [ ] Check monitoring dashboards"
echo "- [ ] Test critical user flows"
echo ""