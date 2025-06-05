# Motorcycle API Setup Guide

This guide explains how to set up and run the motorcycle API server with PostgreSQL database integration.

## Prerequisites

- Go 1.21 or higher
- PostgreSQL database
- motorcycles.csv data file (already in `/database/data/`)

## Setup Steps

### 1. Database Setup

First, create the database and run migrations:

```bash
# Create the database (if not exists)
createdb bikenode

# Run the migrations
cd database/migrations
psql -U postgres -d bikenode -f 000001_create_initial_schema.up.sql
psql -U postgres -d bikenode -f 000002_create_motorcycles_table.up.sql
```

### 2. Import Motorcycle Data

```bash
# Navigate to scripts directory
cd scripts

# Install dependencies
go mod download

# Run the import script
go run import_motorcycles.go
```

This will import all motorcycles from the CSV file into the PostgreSQL database.

### 3. Start the API Server

```bash
# Navigate to website directory
cd website

# Install dependencies
go mod download

# Start the server
go run main.go
```

The server will start on port 8080 by default.

### 4. Test the API

Open `http://localhost:8080/test-motorcycle-api.html` in your browser to test the API endpoints.

## API Endpoints

- `GET /api/health` - Health check
- `GET /api/motorcycles/makes` - Get all motorcycle manufacturers
- `GET /api/motorcycles/years/{make}` - Get available years for a manufacturer
- `GET /api/motorcycles/models/{make}/{year}` - Get models for a specific make and year

## Environment Variables

Create a `.env` file in the website directory with:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=bikenode
PORT=8080
```

## Frontend Integration

The add-bike form (`/add-bike.html`) now dynamically loads motorcycle data from the API when "Motorcycle" is selected as the bike type.

## Troubleshooting

1. **Database connection failed**: Check your PostgreSQL is running and credentials are correct
2. **No motorcycles found**: Make sure you've run the import script
3. **API not responding**: Check the server logs for errors

## Development

- The Go API server code is in `/website/main.go`
- The import script is in `/scripts/import_motorcycles.go`
- Frontend JavaScript is in `/website/assets/js/add-bike.js`
- Test page is at `/website/test-motorcycle-api.html`