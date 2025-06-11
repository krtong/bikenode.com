# BikeNode API Server

This directory contains the Go-based API server for BikeNode.

## Structure

- `main.go` - Main server entry point
- `api/` - API route handlers
  - `elevation.go` - Elevation profile endpoints
  - `gear.go` - Gear management endpoints
  - `heatmap.go` - Activity heatmap endpoints
  - `routes.go` - Route planning endpoints
  - `segments.go` - Segment tracking endpoints

## Running the API

### Development
```bash
# From the website root directory
npm run dev-api

# Or directly
cd api-server
go run main.go
```

### Production Build
```bash
# From the website root directory
npm run build-api

# This creates a binary at ../bikenode-api
```

## Environment Variables

The API server uses the following environment variables:
- `DATABASE_URL` - PostgreSQL connection string
- `PORT` - Server port (default: 8080)

## API Endpoints

The API server runs on port 8080 by default and provides the following endpoints:

- `/api/bikes` - Bike data endpoints
- `/api/elevation` - Elevation profile calculations
- `/api/gear` - Gear management
- `/api/heatmap` - Activity heatmap data
- `/api/routes` - Route planning and storage
- `/api/segments` - Segment tracking