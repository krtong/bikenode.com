package api

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
)

// Segment represents a route segment for leaderboards
type Segment struct {
	ID          uuid.UUID       `json:"id"`
	Name        string          `json:"name"`
	Location    string          `json:"location"`
	Distance    float64         `json:"distance"` // in meters
	Elevation   float64         `json:"elevation"` // in meters
	AvgGrade    float64         `json:"avg_grade"` // percentage
	MaxGrade    float64         `json:"max_grade"` // percentage
	Category    string          `json:"category"` // climb category (HC, 1, 2, 3, 4) or "sprint", "flat"
	Path        [][]float64     `json:"path"` // Array of [lng, lat] coordinates
	Bounds      SegmentBounds   `json:"bounds"`
	Stats       SegmentStats    `json:"stats"`
	Leaderboard []LeaderboardEntry `json:"leaderboard,omitempty"`
	CreatedAt   time.Time       `json:"created_at"`
	UpdatedAt   time.Time       `json:"updated_at"`
}

// SegmentBounds defines the geographical bounds
type SegmentBounds struct {
	MinLat float64 `json:"min_lat"`
	MaxLat float64 `json:"max_lat"`
	MinLng float64 `json:"min_lng"`
	MaxLng float64 `json:"max_lng"`
}

// SegmentStats contains aggregate statistics
type SegmentStats struct {
	TotalAttempts   int     `json:"total_attempts"`
	UniqueRiders    int     `json:"unique_riders"`
	PopularityScore int     `json:"popularity_score"`
	RecordTime      int     `json:"record_time"` // seconds
	RecordHolder    string  `json:"record_holder"`
	RecordDate      time.Time `json:"record_date"`
	AverageTime     int     `json:"average_time"` // seconds
	WeatherImpact   float64 `json:"weather_impact"` // percentage impact on times
}

// LeaderboardEntry represents a segment attempt
type LeaderboardEntry struct {
	ID         uuid.UUID `json:"id"`
	SegmentID  uuid.UUID `json:"segment_id"`
	UserID     uuid.UUID `json:"user_id"`
	UserName   string    `json:"user_name"`
	UserAvatar string    `json:"user_avatar"`
	Time       int       `json:"time"` // seconds
	Speed      float64   `json:"speed"` // km/h
	Power      *float64  `json:"power,omitempty"` // watts
	HeartRate  *int      `json:"heart_rate,omitempty"`
	Date       time.Time `json:"date"`
	Rank       int       `json:"rank"`
	IsKOM      bool      `json:"is_kom"` // King of Mountain
	Weather    string    `json:"weather,omitempty"`
}

// SegmentAttempt represents a user's attempt on a segment
type SegmentAttempt struct {
	ID        uuid.UUID `json:"id"`
	SegmentID uuid.UUID `json:"segment_id"`
	UserID    uuid.UUID `json:"user_id"`
	ActivityID uuid.UUID `json:"activity_id"`
	StartTime time.Time `json:"start_time"`
	EndTime   time.Time `json:"end_time"`
	Time      int       `json:"time"` // seconds
	IsPersonalBest bool `json:"is_personal_best"`
}

// CreateSegment creates a new segment
func CreateSegment(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var segment Segment
		if err := json.NewDecoder(r.Body).Decode(&segment); err != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		segment.ID = uuid.New()
		segment.CreatedAt = time.Now()
		segment.UpdatedAt = time.Now()

		// Calculate segment properties
		segment.AvgGrade = calculateAverageGrade(segment.Elevation, segment.Distance)
		segment.Category = categorizeSegment(segment.Elevation, segment.Distance, segment.AvgGrade)
		segment.Bounds = calculateBounds(segment.Path)

		// Initialize stats
		segment.Stats = SegmentStats{
			TotalAttempts:   0,
			UniqueRiders:    0,
			PopularityScore: 0,
		}

		pathJSON, _ := json.Marshal(segment.Path)
		boundsJSON, _ := json.Marshal(segment.Bounds)
		statsJSON, _ := json.Marshal(segment.Stats)

		query := `
			INSERT INTO segments (id, name, location, distance, elevation, avg_grade, 
				max_grade, category, path, bounds, stats, created_at, updated_at)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
		`

		_, err := db.Exec(query, segment.ID, segment.Name, segment.Location,
			segment.Distance, segment.Elevation, segment.AvgGrade, segment.MaxGrade,
			segment.Category, pathJSON, boundsJSON, statsJSON,
			segment.CreatedAt, segment.UpdatedAt)

		if err != nil {
			log.Printf("Error creating segment: %v", err)
			http.Error(w, "Failed to create segment", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(segment)
	}
}

// GetSegment retrieves a segment by ID
func GetSegment(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		vars := mux.Vars(r)
		segmentID := vars["id"]

		var segment Segment
		var pathJSON, boundsJSON, statsJSON []byte

		query := `
			SELECT id, name, location, distance, elevation, avg_grade, max_grade,
				category, path, bounds, stats, created_at, updated_at
			FROM segments WHERE id = $1
		`

		err := db.QueryRow(query, segmentID).Scan(&segment.ID, &segment.Name,
			&segment.Location, &segment.Distance, &segment.Elevation,
			&segment.AvgGrade, &segment.MaxGrade, &segment.Category,
			&pathJSON, &boundsJSON, &statsJSON,
			&segment.CreatedAt, &segment.UpdatedAt)

		if err != nil {
			if err == sql.ErrNoRows {
				http.Error(w, "Segment not found", http.StatusNotFound)
			} else {
				http.Error(w, "Database error", http.StatusInternalServerError)
			}
			return
		}

		json.Unmarshal(pathJSON, &segment.Path)
		json.Unmarshal(boundsJSON, &segment.Bounds)
		json.Unmarshal(statsJSON, &segment.Stats)

		// Load leaderboard
		segment.Leaderboard = getSegmentLeaderboard(db, segment.ID, 10)

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(segment)
	}
}

// GetNearbySegments returns segments near a location
func GetNearbySegments(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		lat, _ := strconv.ParseFloat(r.URL.Query().Get("lat"), 64)
		lng, _ := strconv.ParseFloat(r.URL.Query().Get("lng"), 64)
		radius, _ := strconv.ParseFloat(r.URL.Query().Get("radius"), 64)
		segmentType := r.URL.Query().Get("type")

		if radius == 0 {
			radius = 16093 // 10 miles in meters
		}

		query := `
			SELECT id, name, location, distance, elevation, avg_grade, category, stats
			FROM segments
			WHERE (
				(bounds->>'min_lat')::float <= $1 + $3 AND
				(bounds->>'max_lat')::float >= $1 - $3 AND
				(bounds->>'min_lng')::float <= $2 + $3 AND
				(bounds->>'max_lng')::float >= $2 - $3
			)
		`

		args := []interface{}{lat, lng, radius / 111000} // rough degree conversion

		if segmentType != "" {
			query += " AND category = $4"
			args = append(args, segmentType)
		}

		query += " ORDER BY (stats->>'popularity_score')::int DESC LIMIT 50"

		rows, err := db.Query(query, args...)
		if err != nil {
			log.Printf("Error querying segments: %v", err)
			http.Error(w, "Database error", http.StatusInternalServerError)
			return
		}
		defer rows.Close()

		var segments []Segment
		for rows.Next() {
			var segment Segment
			var statsJSON []byte
			err := rows.Scan(&segment.ID, &segment.Name, &segment.Location,
				&segment.Distance, &segment.Elevation, &segment.AvgGrade,
				&segment.Category, &statsJSON)
			if err == nil {
				json.Unmarshal(statsJSON, &segment.Stats)
				segments = append(segments, segment)
			}
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(segments)
	}
}

// GetSegmentLeaderboard returns the leaderboard for a segment
func GetSegmentLeaderboard(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		vars := mux.Vars(r)
		segmentID := vars["id"]
		limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
		if limit == 0 {
			limit = 100
		}

		leaderboard := getSegmentLeaderboard(db, uuid.MustParse(segmentID), limit)

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(leaderboard)
	}
}

// RecordSegmentAttempt records a new segment attempt
func RecordSegmentAttempt(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var attempt SegmentAttempt
		if err := json.NewDecoder(r.Body).Decode(&attempt); err != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		attempt.ID = uuid.New()
		attempt.Time = int(attempt.EndTime.Sub(attempt.StartTime).Seconds())

		// Check if this is a personal best
		var bestTime sql.NullInt64
		pbQuery := `
			SELECT MIN(time) FROM segment_attempts 
			WHERE segment_id = $1 AND user_id = $2
		`
		db.QueryRow(pbQuery, attempt.SegmentID, attempt.UserID).Scan(&bestTime)
		attempt.IsPersonalBest = !bestTime.Valid || attempt.Time < int(bestTime.Int64)

		// Insert attempt
		query := `
			INSERT INTO segment_attempts (id, segment_id, user_id, activity_id, 
				start_time, end_time, time, is_personal_best)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		`

		_, err := db.Exec(query, attempt.ID, attempt.SegmentID, attempt.UserID,
			attempt.ActivityID, attempt.StartTime, attempt.EndTime,
			attempt.Time, attempt.IsPersonalBest)

		if err != nil {
			log.Printf("Error recording attempt: %v", err)
			http.Error(w, "Failed to record attempt", http.StatusInternalServerError)
			return
		}

		// Update segment statistics
		updateSegmentStats(db, attempt.SegmentID)

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(attempt)
	}
}

// GetUserSegments returns segments attempted by a user
func GetUserSegments(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID := r.URL.Query().Get("user_id")
		if userID == "" {
			http.Error(w, "User ID required", http.StatusBadRequest)
			return
		}

		query := `
			SELECT DISTINCT s.id, s.name, s.location, s.distance, s.elevation, 
				s.avg_grade, s.category, sa.time, sa.is_personal_best, sa.start_time
			FROM segments s
			INNER JOIN segment_attempts sa ON s.id = sa.segment_id
			WHERE sa.user_id = $1
			ORDER BY sa.start_time DESC
		`

		rows, err := db.Query(query, userID)
		if err != nil {
			log.Printf("Error querying user segments: %v", err)
			http.Error(w, "Database error", http.StatusInternalServerError)
			return
		}
		defer rows.Close()

		type UserSegment struct {
			Segment
			PersonalBest     int       `json:"personal_best"`
			LastAttemptTime  int       `json:"last_attempt_time"`
			LastAttemptDate  time.Time `json:"last_attempt_date"`
			IsPersonalBest   bool      `json:"is_personal_best"`
		}

		var segments []UserSegment
		for rows.Next() {
			var s UserSegment
			err := rows.Scan(&s.ID, &s.Name, &s.Location, &s.Distance,
				&s.Elevation, &s.AvgGrade, &s.Category,
				&s.LastAttemptTime, &s.IsPersonalBest, &s.LastAttemptDate)
			if err == nil {
				if s.IsPersonalBest {
					s.PersonalBest = s.LastAttemptTime
				}
				segments = append(segments, s)
			}
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(segments)
	}
}

// Helper functions

func calculateAverageGrade(elevation, distance float64) float64 {
	if distance == 0 {
		return 0
	}
	return (elevation / distance) * 100
}

func categorizeSegment(elevation, distance, avgGrade float64) string {
	// Categorize climbs based on elevation gain and grade
	if avgGrade < 1 {
		return "flat"
	} else if avgGrade > 3 && distance < 2000 {
		return "sprint"
	} else if elevation > 800 && avgGrade > 7 {
		return "hc" // Hors catégorie
	} else if elevation > 500 && avgGrade > 6 {
		return "cat1"
	} else if elevation > 300 && avgGrade > 5 {
		return "cat2"
	} else if elevation > 150 && avgGrade > 4 {
		return "cat3"
	} else if elevation > 80 && avgGrade > 3 {
		return "cat4"
	}
	return "rolling"
}

func calculateBounds(path [][]float64) SegmentBounds {
	if len(path) == 0 {
		return SegmentBounds{}
	}

	bounds := SegmentBounds{
		MinLat: path[0][1],
		MaxLat: path[0][1],
		MinLng: path[0][0],
		MaxLng: path[0][0],
	}

	for _, point := range path {
		lng, lat := point[0], point[1]
		if lat < bounds.MinLat {
			bounds.MinLat = lat
		}
		if lat > bounds.MaxLat {
			bounds.MaxLat = lat
		}
		if lng < bounds.MinLng {
			bounds.MinLng = lng
		}
		if lng > bounds.MaxLng {
			bounds.MaxLng = lng
		}
	}

	return bounds
}

func getSegmentLeaderboard(db *sql.DB, segmentID uuid.UUID, limit int) []LeaderboardEntry {
	query := `
		SELECT sa.id, sa.user_id, u.name, sa.time, sa.start_time,
			ROW_NUMBER() OVER (ORDER BY sa.time ASC) as rank
		FROM segment_attempts sa
		JOIN users u ON sa.user_id = u.id
		WHERE sa.segment_id = $1 AND sa.is_personal_best = true
		ORDER BY sa.time ASC
		LIMIT $2
	`

	rows, err := db.Query(query, segmentID, limit)
	if err != nil {
		log.Printf("Error querying leaderboard: %v", err)
		return nil
	}
	defer rows.Close()

	var entries []LeaderboardEntry
	for rows.Next() {
		var entry LeaderboardEntry
		err := rows.Scan(&entry.ID, &entry.UserID, &entry.UserName,
			&entry.Time, &entry.Date, &entry.Rank)
		if err == nil {
			entry.SegmentID = segmentID
			entry.IsKOM = entry.Rank == 1
			entries = append(entries, entry)
		}
	}

	return entries
}

func updateSegmentStats(db *sql.DB, segmentID uuid.UUID) {
	// Update total attempts and unique riders
	statsQuery := `
		UPDATE segments SET stats = jsonb_build_object(
			'total_attempts', (SELECT COUNT(*) FROM segment_attempts WHERE segment_id = $1),
			'unique_riders', (SELECT COUNT(DISTINCT user_id) FROM segment_attempts WHERE segment_id = $1),
			'record_time', (SELECT MIN(time) FROM segment_attempts WHERE segment_id = $1),
			'average_time', (SELECT AVG(time) FROM segment_attempts WHERE segment_id = $1),
			'popularity_score', (SELECT COUNT(*) FROM segment_attempts WHERE segment_id = $1 AND start_time > NOW() - INTERVAL '30 days')
		),
		updated_at = NOW()
		WHERE id = $1
	`

	_, err := db.Exec(statsQuery, segmentID)
	if err != nil {
		log.Printf("Error updating segment stats: %v", err)
	}
}

// InitializeSegmentTables creates the necessary database tables
func InitializeSegmentTables(db *sql.DB) error {
	queries := []string{
		`CREATE TABLE IF NOT EXISTS users (
			id UUID PRIMARY KEY,
			name VARCHAR(255) NOT NULL,
			email VARCHAR(255) UNIQUE,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS segments (
			id UUID PRIMARY KEY,
			name VARCHAR(255) NOT NULL,
			location VARCHAR(255),
			distance FLOAT,
			elevation FLOAT,
			avg_grade FLOAT,
			max_grade FLOAT,
			category VARCHAR(50),
			path JSONB,
			bounds JSONB,
			stats JSONB,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS segment_attempts (
			id UUID PRIMARY KEY,
			segment_id UUID REFERENCES segments(id) ON DELETE CASCADE,
			user_id UUID,
			activity_id UUID,
			start_time TIMESTAMP,
			end_time TIMESTAMP,
			time INT,
			is_personal_best BOOLEAN DEFAULT FALSE,
			UNIQUE(segment_id, user_id, activity_id)
		)`,
		`CREATE INDEX IF NOT EXISTS idx_segment_attempts_segment ON segment_attempts(segment_id)`,
		`CREATE INDEX IF NOT EXISTS idx_segment_attempts_user ON segment_attempts(user_id)`,
		`CREATE INDEX IF NOT EXISTS idx_segment_attempts_time ON segment_attempts(time)`,
		`CREATE INDEX IF NOT EXISTS idx_segments_bounds ON segments USING GIN(bounds)`,
	}

	for _, query := range queries {
		if _, err := db.Exec(query); err != nil {
			return fmt.Errorf("error creating table: %v", err)
		}
	}

	return nil
}