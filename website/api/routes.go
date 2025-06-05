package api

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"math"
	"net/http"
	"strconv"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
)

// Route represents a cycling route
type Route struct {
	ID          uuid.UUID      `json:"id"`
	UserID      uuid.UUID      `json:"user_id"`
	Name        string         `json:"name"`
	Description string         `json:"description"`
	Distance    float64        `json:"distance"` // in meters
	Elevation   float64        `json:"elevation"` // in meters
	RouteType   string         `json:"route_type"` // road, mtb, gravel
	Waypoints   []Waypoint     `json:"waypoints"`
	Path        [][]float64    `json:"path"` // Array of [lng, lat] coordinates
	Stats       RouteStats     `json:"stats"`
	Preferences RoutePrefs     `json:"preferences"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
}

// Waypoint represents a point on the route
type Waypoint struct {
	ID       uuid.UUID   `json:"id"`
	Position int         `json:"position"`
	Lat      float64     `json:"lat"`
	Lng      float64     `json:"lng"`
	Name     string      `json:"name"`
	Type     string      `json:"type"` // start, end, waypoint
	Address  string      `json:"address"`
}

// RouteStats contains calculated statistics
type RouteStats struct {
	TotalDistance   float64        `json:"total_distance"`
	TotalElevation  float64        `json:"total_elevation"`
	MaxElevation    float64        `json:"max_elevation"`
	MinElevation    float64        `json:"min_elevation"`
	EstimatedTime   int            `json:"estimated_time"` // in minutes
	Difficulty      string         `json:"difficulty"`
	SurfaceTypes    map[string]float64 `json:"surface_types"` // percentage of each surface
	PopularityScore int            `json:"popularity_score"`
}

// RoutePrefs contains user preferences for routing
type RoutePrefs struct {
	PreferBikePaths   bool `json:"prefer_bike_paths"`
	AvoidHighways     bool `json:"avoid_highways"`
	MinimizeElevation bool `json:"minimize_elevation"`
	FollowPopular     bool `json:"follow_popular"`
}

// CreateRoute creates a new route
func CreateRoute(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var route Route
		if err := json.NewDecoder(r.Body).Decode(&route); err != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		route.ID = uuid.New()
		route.CreatedAt = time.Now()
		route.UpdatedAt = time.Now()

		// Calculate route statistics
		route.Stats = calculateRouteStats(route)

		// Store route in database
		query := `
			INSERT INTO routes (id, user_id, name, description, distance, elevation, 
				route_type, path, stats, preferences, created_at, updated_at)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
			RETURNING id
		`

		statsJSON, _ := json.Marshal(route.Stats)
		prefsJSON, _ := json.Marshal(route.Preferences)
		pathJSON, _ := json.Marshal(route.Path)

		err := db.QueryRow(query, route.ID, route.UserID, route.Name, route.Description,
			route.Distance, route.Elevation, route.RouteType, pathJSON, statsJSON, prefsJSON,
			route.CreatedAt, route.UpdatedAt).Scan(&route.ID)

		if err != nil {
			log.Printf("Error creating route: %v", err)
			http.Error(w, "Failed to create route", http.StatusInternalServerError)
			return
		}

		// Store waypoints
		for _, waypoint := range route.Waypoints {
			waypoint.ID = uuid.New()
			waypointQuery := `
				INSERT INTO route_waypoints (id, route_id, position, lat, lng, name, type, address)
				VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
			`
			_, err = db.Exec(waypointQuery, waypoint.ID, route.ID, waypoint.Position,
				waypoint.Lat, waypoint.Lng, waypoint.Name, waypoint.Type, waypoint.Address)
			if err != nil {
				log.Printf("Error creating waypoint: %v", err)
			}
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(route)
	}
}

// GetRoute retrieves a route by ID
func GetRoute(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		vars := mux.Vars(r)
		routeID := vars["id"]

		var route Route
		var pathJSON, statsJSON, prefsJSON []byte

		query := `
			SELECT id, user_id, name, description, distance, elevation, 
				route_type, path, stats, preferences, created_at, updated_at
			FROM routes WHERE id = $1
		`

		err := db.QueryRow(query, routeID).Scan(&route.ID, &route.UserID, &route.Name,
			&route.Description, &route.Distance, &route.Elevation, &route.RouteType,
			&pathJSON, &statsJSON, &prefsJSON, &route.CreatedAt, &route.UpdatedAt)

		if err != nil {
			if err == sql.ErrNoRows {
				http.Error(w, "Route not found", http.StatusNotFound)
			} else {
				http.Error(w, "Database error", http.StatusInternalServerError)
			}
			return
		}

		json.Unmarshal(pathJSON, &route.Path)
		json.Unmarshal(statsJSON, &route.Stats)
		json.Unmarshal(prefsJSON, &route.Preferences)

		// Load waypoints
		waypointQuery := `
			SELECT id, position, lat, lng, name, type, address
			FROM route_waypoints WHERE route_id = $1 ORDER BY position
		`
		rows, _ := db.Query(waypointQuery, routeID)
		defer rows.Close()

		for rows.Next() {
			var wp Waypoint
			rows.Scan(&wp.ID, &wp.Position, &wp.Lat, &wp.Lng, &wp.Name, &wp.Type, &wp.Address)
			route.Waypoints = append(route.Waypoints, wp)
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(route)
	}
}

// GetNearbyRoutes returns routes near a location
func GetNearbyRoutes(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		lat, _ := strconv.ParseFloat(r.URL.Query().Get("lat"), 64)
		lng, _ := strconv.ParseFloat(r.URL.Query().Get("lng"), 64)
		radius, _ := strconv.ParseFloat(r.URL.Query().Get("radius"), 64)
		if radius == 0 {
			radius = 10000 // 10km default
		}

		query := `
			SELECT id, name, description, distance, elevation, route_type, stats
			FROM routes
			WHERE ST_DWithin(
				ST_MakePoint($1, $2)::geography,
				ST_GeomFromGeoJSON(path)::geography,
				$3
			)
			ORDER BY created_at DESC
			LIMIT 20
		`

		rows, err := db.Query(query, lng, lat, radius)
		if err != nil {
			log.Printf("Error querying nearby routes: %v", err)
			http.Error(w, "Database error", http.StatusInternalServerError)
			return
		}
		defer rows.Close()

		var routes []Route
		for rows.Next() {
			var route Route
			var statsJSON []byte
			err := rows.Scan(&route.ID, &route.Name, &route.Description,
				&route.Distance, &route.Elevation, &route.RouteType, &statsJSON)
			if err == nil {
				json.Unmarshal(statsJSON, &route.Stats)
				routes = append(routes, route)
			}
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(routes)
	}
}

// CalculateRoute calculates optimal route based on waypoints and preferences
func CalculateRoute(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var request struct {
			Waypoints   []Waypoint `json:"waypoints"`
			RouteType   string     `json:"route_type"`
			Preferences RoutePrefs `json:"preferences"`
		}

		if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		// Calculate route using routing algorithm
		route := calculateOptimalRoute(request.Waypoints, request.RouteType, request.Preferences, db)

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(route)
	}
}

// Helper function to calculate route statistics
func calculateRouteStats(route Route) RouteStats {
	stats := RouteStats{
		TotalDistance:  route.Distance,
		TotalElevation: route.Elevation,
		SurfaceTypes:   make(map[string]float64),
	}

	// Calculate estimated time based on average speeds
	avgSpeed := 20.0 // km/h default
	switch route.RouteType {
	case "road":
		avgSpeed = 25.0
	case "mtb":
		avgSpeed = 15.0
	case "gravel":
		avgSpeed = 20.0
	}

	stats.EstimatedTime = int((route.Distance / 1000) / avgSpeed * 60)

	// Calculate difficulty based on distance and elevation
	elevationPerKm := route.Elevation / (route.Distance / 1000)
	if elevationPerKm < 10 {
		stats.Difficulty = "Easy"
	} else if elevationPerKm < 20 {
		stats.Difficulty = "Moderate"
	} else if elevationPerKm < 30 {
		stats.Difficulty = "Hard"
	} else {
		stats.Difficulty = "Expert"
	}

	// Mock surface type distribution
	switch route.RouteType {
	case "road":
		stats.SurfaceTypes["paved"] = 95.0
		stats.SurfaceTypes["gravel"] = 5.0
	case "mtb":
		stats.SurfaceTypes["singletrack"] = 60.0
		stats.SurfaceTypes["doubletrack"] = 30.0
		stats.SurfaceTypes["gravel"] = 10.0
	case "gravel":
		stats.SurfaceTypes["gravel"] = 70.0
		stats.SurfaceTypes["paved"] = 20.0
		stats.SurfaceTypes["dirt"] = 10.0
	}

	return stats
}

// Calculate optimal route based on preferences
func calculateOptimalRoute(waypoints []Waypoint, routeType string, prefs RoutePrefs, db *sql.DB) Route {
	route := Route{
		ID:          uuid.New(),
		RouteType:   routeType,
		Preferences: prefs,
		Waypoints:   waypoints,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	// Generate path coordinates (simplified version)
	route.Path = generateRoutePath(waypoints, prefs, db)
	
	// Calculate distance and elevation
	route.Distance = calculateTotalDistance(route.Path)
	route.Elevation = calculateTotalElevation(route.Path)

	// Calculate statistics
	route.Stats = calculateRouteStats(route)

	return route
}

// Generate route path based on waypoints and preferences
func generateRoutePath(waypoints []Waypoint, prefs RoutePrefs, db *sql.DB) [][]float64 {
	var path [][]float64

	// For now, create a simple direct path between waypoints
	// In a real implementation, this would use a routing service
	for i := 0; i < len(waypoints)-1; i++ {
		start := waypoints[i]
		end := waypoints[i+1]

		// Add intermediate points
		steps := 10
		for j := 0; j <= steps; j++ {
			t := float64(j) / float64(steps)
			lng := start.Lng + (end.Lng-start.Lng)*t
			lat := start.Lat + (end.Lat-start.Lat)*t
			path = append(path, []float64{lng, lat})
		}
	}

	// If following popular routes, adjust path based on heatmap data
	if prefs.FollowPopular {
		path = adjustForPopularRoutes(path, db)
	}

	return path
}

// Adjust path to follow popular routes
func adjustForPopularRoutes(path [][]float64, db *sql.DB) [][]float64 {
	// This would query heatmap data and adjust the path
	// For now, return the original path
	return path
}

// Calculate total distance from path coordinates
func calculateTotalDistance(path [][]float64) float64 {
	if len(path) < 2 {
		return 0
	}

	totalDistance := 0.0
	for i := 1; i < len(path); i++ {
		dist := haversineDistance(path[i-1][1], path[i-1][0], path[i][1], path[i][0])
		totalDistance += dist
	}

	return totalDistance
}

// Haversine formula for distance between two points
func haversineDistance(lat1, lng1, lat2, lng2 float64) float64 {
	const earthRadius = 6371000 // meters

	lat1Rad := lat1 * math.Pi / 180
	lat2Rad := lat2 * math.Pi / 180
	deltaLat := (lat2 - lat1) * math.Pi / 180
	deltaLng := (lng2 - lng1) * math.Pi / 180

	a := math.Sin(deltaLat/2)*math.Sin(deltaLat/2) +
		math.Cos(lat1Rad)*math.Cos(lat2Rad)*
			math.Sin(deltaLng/2)*math.Sin(deltaLng/2)
	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))

	return earthRadius * c
}

// Calculate total elevation gain
func calculateTotalElevation(path [][]float64) float64 {
	// This would use elevation API data
	// For now, return a mock value based on path length
	return float64(len(path)) * 2.5
}

// InitializeRouteTables creates the necessary database tables
func InitializeRouteTables(db *sql.DB) error {
	queries := []string{
		`CREATE EXTENSION IF NOT EXISTS postgis`,
		`CREATE TABLE IF NOT EXISTS routes (
			id UUID PRIMARY KEY,
			user_id UUID,
			name VARCHAR(255) NOT NULL,
			description TEXT,
			distance FLOAT,
			elevation FLOAT,
			route_type VARCHAR(50),
			path JSONB,
			stats JSONB,
			preferences JSONB,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS route_waypoints (
			id UUID PRIMARY KEY,
			route_id UUID REFERENCES routes(id) ON DELETE CASCADE,
			position INT,
			lat FLOAT,
			lng FLOAT,
			name VARCHAR(255),
			type VARCHAR(50),
			address TEXT
		)`,
		`CREATE INDEX IF NOT EXISTS idx_routes_user_id ON routes(user_id)`,
		`CREATE INDEX IF NOT EXISTS idx_waypoints_route_id ON route_waypoints(route_id)`,
	}

	for _, query := range queries {
		if _, err := db.Exec(query); err != nil {
			return fmt.Errorf("error creating table: %v", err)
		}
	}

	return nil
}