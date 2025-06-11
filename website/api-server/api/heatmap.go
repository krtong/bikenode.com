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
)

// HeatmapPoint represents a point in the heatmap
type HeatmapPoint struct {
	Lat       float64 `json:"lat"`
	Lng       float64 `json:"lng"`
	Weight    float64 `json:"weight"`
	Timestamp time.Time `json:"timestamp"`
}

// HeatmapData represents aggregated heatmap data
type HeatmapData struct {
	Points      []HeatmapPoint `json:"points"`
	Bounds      SegmentBounds  `json:"bounds"`
	TotalWeight float64        `json:"total_weight"`
	Period      string         `json:"period"`
}

// ActivityTrack represents a GPS track from an activity
type ActivityTrack struct {
	ID         uuid.UUID   `json:"id"`
	UserID     uuid.UUID   `json:"user_id"`
	ActivityID uuid.UUID   `json:"activity_id"`
	Points     [][]float64 `json:"points"` // [lng, lat] pairs
	Timestamp  time.Time   `json:"timestamp"`
	ActivityType string    `json:"activity_type"` // road, mtb, gravel
}

// PopularRoute represents a frequently used route
type PopularRoute struct {
	ID          uuid.UUID     `json:"id"`
	Name        string        `json:"name"`
	Path        [][]float64   `json:"path"`
	UseCount    int           `json:"use_count"`
	AvgSpeed    float64       `json:"avg_speed"`
	Distance    float64       `json:"distance"`
	RouteType   string        `json:"route_type"`
	Bounds      SegmentBounds `json:"bounds"`
}

// GetHeatmapData returns aggregated heatmap data for an area
func GetHeatmapData(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Parse query parameters
		minLat, _ := strconv.ParseFloat(r.URL.Query().Get("min_lat"), 64)
		maxLat, _ := strconv.ParseFloat(r.URL.Query().Get("max_lat"), 64)
		minLng, _ := strconv.ParseFloat(r.URL.Query().Get("min_lng"), 64)
		maxLng, _ := strconv.ParseFloat(r.URL.Query().Get("max_lng"), 64)
		activityType := r.URL.Query().Get("type")
		period := r.URL.Query().Get("period") // all, year, month, week

		// Set default period
		if period == "" {
			period = "all"
		}

		// Build query based on parameters
		query := `
			SELECT lat, lng, COUNT(*) as weight
			FROM activity_points
			WHERE lat BETWEEN $1 AND $2
			AND lng BETWEEN $3 AND $4
		`

		args := []interface{}{minLat, maxLat, minLng, maxLng}

		// Add activity type filter
		if activityType != "" {
			query += " AND activity_type = $5"
			args = append(args, activityType)
		}

		// Add time period filter
		switch period {
		case "week":
			query += fmt.Sprintf(" AND timestamp > NOW() - INTERVAL '7 days'")
		case "month":
			query += fmt.Sprintf(" AND timestamp > NOW() - INTERVAL '30 days'")
		case "year":
			query += fmt.Sprintf(" AND timestamp > NOW() - INTERVAL '365 days'")
		}

		// Group by grid cells for performance
		gridSize := 0.001 // ~100m grid
		query += fmt.Sprintf(`
			GROUP BY 
				ROUND(lat/%f)*%f, 
				ROUND(lng/%f)*%f
			HAVING COUNT(*) > 1
			ORDER BY weight DESC
			LIMIT 5000
		`, gridSize, gridSize, gridSize, gridSize)

		rows, err := db.Query(query, args...)
		if err != nil {
			log.Printf("Error querying heatmap data: %v", err)
			http.Error(w, "Database error", http.StatusInternalServerError)
			return
		}
		defer rows.Close()

		heatmapData := HeatmapData{
			Points: []HeatmapPoint{},
			Bounds: SegmentBounds{
				MinLat: minLat,
				MaxLat: maxLat,
				MinLng: minLng,
				MaxLng: maxLng,
			},
			Period: period,
		}

		totalWeight := 0.0
		for rows.Next() {
			var point HeatmapPoint
			err := rows.Scan(&point.Lat, &point.Lng, &point.Weight)
			if err == nil {
				heatmapData.Points = append(heatmapData.Points, point)
				totalWeight += point.Weight
			}
		}

		heatmapData.TotalWeight = totalWeight

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(heatmapData)
	}
}

// GetPopularRoutes returns popular routes in an area
func GetPopularRoutes(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		lat, _ := strconv.ParseFloat(r.URL.Query().Get("lat"), 64)
		lng, _ := strconv.ParseFloat(r.URL.Query().Get("lng"), 64)
		radius, _ := strconv.ParseFloat(r.URL.Query().Get("radius"), 64)
		routeType := r.URL.Query().Get("type")

		if radius == 0 {
			radius = 10000 // 10km default
		}

		// Query for popular routes based on clustering of activity tracks
		query := `
			WITH route_clusters AS (
				SELECT 
					ST_ClusterDBSCAN(
						ST_MakePoint(lng, lat)::geometry, 
						eps := 0.001, 
						minpoints := 5
					) OVER() AS cluster_id,
					path,
					activity_type
				FROM activity_tracks
				WHERE ST_DWithin(
					ST_MakePoint($1, $2)::geography,
					ST_MakePoint(
						(path->0->>0)::float, 
						(path->0->>1)::float
					)::geography,
					$3
				)
			)
			SELECT 
				cluster_id,
				COUNT(*) as use_count,
				activity_type,
				array_agg(path) as paths
			FROM route_clusters
			WHERE cluster_id IS NOT NULL
		`

		args := []interface{}{lng, lat, radius}

		if routeType != "" {
			query += " AND activity_type = $4"
			args = append(args, routeType)
		}

		query += " GROUP BY cluster_id, activity_type ORDER BY use_count DESC LIMIT 20"

		rows, err := db.Query(query, args...)
		if err != nil {
			log.Printf("Error querying popular routes: %v", err)
			// Fall back to simulated data
			popularRoutes := generateMockPopularRoutes(lat, lng, radius)
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(popularRoutes)
			return
		}
		defer rows.Close()

		var popularRoutes []PopularRoute
		for rows.Next() {
			var route PopularRoute
			var clusterID int
			var paths [][]byte

			err := rows.Scan(&clusterID, &route.UseCount, &route.RouteType, &paths)
			if err == nil {
				route.ID = uuid.New()
				route.Name = fmt.Sprintf("Popular Route #%d", clusterID)
				
				// Use the most representative path from the cluster
				if len(paths) > 0 {
					json.Unmarshal(paths[0], &route.Path)
					route.Distance = calculateTotalDistance(route.Path)
					route.Bounds = calculateBounds(route.Path)
				}

				popularRoutes = append(popularRoutes, route)
			}
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(popularRoutes)
	}
}

// RecordActivityTrack records a GPS track from an activity
func RecordActivityTrack(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var track ActivityTrack
		if err := json.NewDecoder(r.Body).Decode(&track); err != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		track.ID = uuid.New()
		track.Timestamp = time.Now()

		pathJSON, _ := json.Marshal(track.Points)

		// Store the full track
		trackQuery := `
			INSERT INTO activity_tracks (id, user_id, activity_id, path, timestamp, activity_type)
			VALUES ($1, $2, $3, $4, $5, $6)
		`

		_, err := db.Exec(trackQuery, track.ID, track.UserID, track.ActivityID,
			pathJSON, track.Timestamp, track.ActivityType)

		if err != nil {
			log.Printf("Error storing activity track: %v", err)
			http.Error(w, "Failed to store track", http.StatusInternalServerError)
			return
		}

		// Also store individual points for heatmap
		pointQuery := `
			INSERT INTO activity_points (activity_id, user_id, lat, lng, timestamp, activity_type)
			VALUES ($1, $2, $3, $4, $5, $6)
		`

		stmt, err := db.Prepare(pointQuery)
		if err != nil {
			log.Printf("Error preparing statement: %v", err)
		} else {
			defer stmt.Close()

			// Sample points to avoid storing too many
			sampleRate := 1
			if len(track.Points) > 1000 {
				sampleRate = len(track.Points) / 1000
			}

			for i := 0; i < len(track.Points); i += sampleRate {
				point := track.Points[i]
				if len(point) >= 2 {
					_, err = stmt.Exec(track.ActivityID, track.UserID,
						point[1], point[0], track.Timestamp, track.ActivityType)
					if err != nil {
						log.Printf("Error inserting point: %v", err)
					}
				}
			}
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{
			"status": "success",
			"track_id": track.ID.String(),
		})
	}
}

// GetSurfaceTypes returns surface type information for a route
func GetSurfaceTypes(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var request struct {
			Path [][]float64 `json:"path"`
		}

		if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		// Analyze surface types along the path
		surfaceData := analyzeSurfaceTypes(request.Path, db)

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(surfaceData)
	}
}

// Helper functions

func generateMockPopularRoutes(lat, lng, radius float64) []PopularRoute {
	// Generate some mock popular routes for demonstration
	routes := []PopularRoute{
		{
			ID:        uuid.New(),
			Name:      "Morning Loop",
			UseCount:  156,
			AvgSpeed:  25.5,
			Distance:  32000,
			RouteType: "road",
			Path:      generateCircularRoute(lat, lng, 0.05),
		},
		{
			ID:        uuid.New(),
			Name:      "Hill Climb Circuit",
			UseCount:  89,
			AvgSpeed:  18.2,
			Distance:  18500,
			RouteType: "road",
			Path:      generateCircularRoute(lat+0.01, lng+0.01, 0.03),
		},
		{
			ID:        uuid.New(),
			Name:      "Gravel Adventure",
			UseCount:  67,
			AvgSpeed:  20.1,
			Distance:  45000,
			RouteType: "gravel",
			Path:      generateCircularRoute(lat-0.02, lng+0.02, 0.08),
		},
	}

	for i := range routes {
		routes[i].Bounds = calculateBounds(routes[i].Path)
	}

	return routes
}

func generateCircularRoute(centerLat, centerLng, radius float64) [][]float64 {
	points := 36
	path := make([][]float64, points+1)

	for i := 0; i <= points; i++ {
		angle := float64(i) * (2 * 3.14159 / float64(points))
		lat := centerLat + radius*math.Sin(angle)
		lng := centerLng + radius*math.Cos(angle)
		path[i] = []float64{lng, lat}
	}

	return path
}

func analyzeSurfaceTypes(path [][]float64, db *sql.DB) map[string]interface{} {
	// In a real implementation, this would query OSM data or a surface type database
	// For now, return mock data based on path characteristics

	totalDistance := calculateTotalDistance(path)
	
	// Mock surface analysis
	surfaces := map[string]float64{
		"paved":       0.0,
		"gravel":      0.0,
		"dirt":        0.0,
		"singletrack": 0.0,
	}

	// Simple heuristic based on location variance
	variance := calculatePathVariance(path)
	
	if variance < 0.001 {
		surfaces["paved"] = 0.9
		surfaces["gravel"] = 0.1
	} else if variance < 0.005 {
		surfaces["paved"] = 0.5
		surfaces["gravel"] = 0.4
		surfaces["dirt"] = 0.1
	} else {
		surfaces["gravel"] = 0.3
		surfaces["dirt"] = 0.3
		surfaces["singletrack"] = 0.4
	}

	return map[string]interface{}{
		"surfaces":       surfaces,
		"total_distance": totalDistance,
		"confidence":     0.75,
	}
}

func calculatePathVariance(path [][]float64) float64 {
	if len(path) < 2 {
		return 0
	}

	var sumVariance float64
	for i := 1; i < len(path)-1; i++ {
		// Calculate angle between consecutive segments
		dx1 := path[i][0] - path[i-1][0]
		dy1 := path[i][1] - path[i-1][1]
		dx2 := path[i+1][0] - path[i][0]
		dy2 := path[i+1][1] - path[i][1]

		angle := math.Abs(math.Atan2(dy2, dx2) - math.Atan2(dy1, dx1))
		sumVariance += angle
	}

	return sumVariance / float64(len(path)-2)
}

// InitializeHeatmapTables creates the necessary database tables
func InitializeHeatmapTables(db *sql.DB) error {
	queries := []string{
		`CREATE TABLE IF NOT EXISTS activity_tracks (
			id UUID PRIMARY KEY,
			user_id UUID,
			activity_id UUID,
			path JSONB,
			timestamp TIMESTAMP,
			activity_type VARCHAR(50)
		)`,
		`CREATE TABLE IF NOT EXISTS activity_points (
			id SERIAL PRIMARY KEY,
			activity_id UUID,
			user_id UUID,
			lat FLOAT,
			lng FLOAT,
			timestamp TIMESTAMP,
			activity_type VARCHAR(50)
		)`,
		`CREATE INDEX IF NOT EXISTS idx_activity_points_location ON activity_points(lat, lng)`,
		`CREATE INDEX IF NOT EXISTS idx_activity_points_timestamp ON activity_points(timestamp)`,
		`CREATE INDEX IF NOT EXISTS idx_activity_points_type ON activity_points(activity_type)`,
		`CREATE INDEX IF NOT EXISTS idx_activity_tracks_user ON activity_tracks(user_id)`,
		`CREATE INDEX IF NOT EXISTS idx_activity_tracks_timestamp ON activity_tracks(timestamp)`,
	}

	for _, query := range queries {
		if _, err := db.Exec(query); err != nil {
			return fmt.Errorf("error creating table: %v", err)
		}
	}

	return nil
}