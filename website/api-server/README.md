# BikeNode API Server

This directory contains the Go-based API server for BikeNode.

## Structure

- `main.go` - Main server entry point
- `api/` - API route handlers
  - `cabin_motorcycles.go` - Cabin motorcycles endpoints
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
- `/api/cabin-motorcycles` - Cabin motorcycles endpoints (see Cabin Motorcycles section below)
- `/api/elevation` - Elevation profile calculations
- `/api/gear` - Gear management
- `/api/heatmap` - Activity heatmap data
- `/api/routes` - Route planning and storage
- `/api/segments` - Segment tracking

### Cabin Motorcycles API

The cabin motorcycles endpoints provide access to fully and semi-enclosed motorcycles.

#### Endpoints

##### GET /api/cabin-motorcycles
Get a paginated list of cabin motorcycles with optional filtering.

**Query Parameters:**
- `page` (integer, optional) - Page number (default: 1)
- `limit` (integer, optional) - Items per page (default: 20, max: 100)
- `subcategory` (string, optional) - Filter by subcategory: "fully_enclosed" or "semi_enclosed"
- `make` (string, optional) - Filter by manufacturer name
- `year_from` (integer, optional) - Filter by minimum year
- `year_to` (integer, optional) - Filter by maximum year

**Response:**
```json
{
  "data": [
    {
      "id": "string",
      "year": 2023,
      "make": "BMW",
      "model": "C1",
      "package": "Executive",
      "category": "cabin",
      "subcategory": "fully_enclosed",
      "specifications": { ... }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

##### GET /api/cabin-motorcycles/search
Search for cabin motorcycles with pagination.

**Query Parameters:**
- `q` (string, required) - Search query
- `page` (integer, optional) - Page number (default: 1)
- `limit` (integer, optional) - Items per page (default: 20, max: 100)

**Response:** Same format as the list endpoint

##### GET /api/cabin-motorcycles/makes
Get a list of all manufacturers that produce cabin motorcycles.

##### GET /api/cabin-motorcycles/stats
Get statistics about cabin motorcycles (counts by make, subcategory, production years).

##### GET /api/cabin-motorcycles/{id}
Get detailed information for a specific cabin motorcycle by ID.