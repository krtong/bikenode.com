#!/bin/bash

# Cabin Motorcycles System Setup Script
# This script initializes the environment for development or production

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

# Header
echo "======================================"
echo "Cabin Motorcycles System Setup"
echo "======================================"
echo ""

# Check if running from correct directory
if [ ! -f "package.json" ]; then
    print_error "Please run this script from the cabin-motorcycles directory"
    exit 1
fi

# Check dependencies
echo "Checking dependencies..."

# Check Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    print_status "Node.js installed: $NODE_VERSION"
else
    print_error "Node.js is not installed. Please install Node.js 16 or higher"
    exit 1
fi

# Check Docker (optional)
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version)
    print_status "Docker installed: $DOCKER_VERSION"
else
    print_warning "Docker not found. Docker is optional but recommended for production"
fi

# Check PostgreSQL client
if command -v psql &> /dev/null; then
    print_status "PostgreSQL client installed"
else
    print_warning "PostgreSQL client not found. Install for database operations"
fi

# Create directories
echo ""
echo "Creating directories..."

directories=(
    "data"
    "logs"
    "debug"
    "backups"
    "nginx/conf.d"
    "database/migrations"
)

for dir in "${directories[@]}"; do
    if [ ! -d "$dir" ]; then
        mkdir -p "$dir"
        print_status "Created directory: $dir"
    else
        print_status "Directory exists: $dir"
    fi
done

# Setup environment file
echo ""
echo "Setting up environment..."

if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        print_status "Created .env from .env.example"
        print_warning "Please edit .env with your configuration"
    else
        print_error ".env.example not found"
        exit 1
    fi
else
    print_status ".env already exists"
fi

# Install Node.js dependencies
echo ""
echo "Installing Node.js dependencies..."

if [ -f "package.json" ]; then
    npm install
    print_status "Node.js dependencies installed"
else
    print_error "package.json not found"
    exit 1
fi

# Database setup
echo ""
echo "Database setup..."

# Source environment variables
if [ -f ".env" ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Check if database is accessible
if [ -n "$DB_HOST" ] && [ -n "$DB_USER" ] && [ -n "$DB_NAME" ]; then
    echo "Checking database connection..."
    if PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c '\q' 2>/dev/null; then
        print_status "Database connection successful"
        
        # Run migrations
        echo "Running database migrations..."
        for migration in database/migrations/*.sql; do
            if [ -f "$migration" ]; then
                echo "Running migration: $(basename $migration)"
                PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f "$migration" 2>/dev/null || {
                    print_warning "Migration may have already been applied: $(basename $migration)"
                }
            fi
        done
        print_status "Database migrations complete"
    else
        print_warning "Could not connect to database. Please check your configuration"
        print_warning "You can run migrations manually later"
    fi
else
    print_warning "Database configuration not found in .env"
fi

# Docker setup (optional)
if command -v docker &> /dev/null && command -v docker-compose &> /dev/null; then
    echo ""
    echo "Docker setup..."
    
    read -p "Do you want to start Docker services? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        docker-compose up -d postgres redis
        print_status "Docker services started"
        echo "Waiting for services to be ready..."
        sleep 5
    fi
fi

# Test setup
echo ""
echo "Running validation..."

if node validate-env.js; then
    print_status "Environment validation passed"
else
    print_error "Environment validation failed"
fi

# Final instructions
echo ""
echo "======================================"
echo "Setup Complete!"
echo "======================================"
echo ""
echo "Next steps:"
echo "1. Edit .env with your configuration"
echo "2. Run 'npm run scrape:all' to start scraping"
echo "3. Run 'npm test' to run tests"
echo "4. Run 'docker-compose up' for full stack"
echo ""
echo "For production deployment, run: ./deploy.sh"
echo ""

# Make scripts executable
chmod +x deploy.sh
chmod +x setup.sh

print_status "All done!"