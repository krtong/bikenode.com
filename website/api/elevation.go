package api

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"math"
	"net/http"
	"strings"
)

// ElevationProfile represents elevation data along a path
type ElevationProfile struct {
	Points      []ElevationPoint `json:"points"`
	MinElevation float64         `json:"min_elevation"`
	MaxElevation float64         `json:"max_elevation"`
	TotalGain    float64         `json:"total_gain"`
	TotalLoss    float64         `json:"total_loss"`
	AvgGrade     float64         `json:"avg_grade"`
	MaxGrade     float64         `json:"max_grade"`
}

// ElevationPoint represents a single elevation measurement
type ElevationPoint struct {
	Lat       float64 `json:"lat"`
	Lng       float64 `json:"lng"`
	Elevation float64 `json:"elevation"` // meters
	Distance  float64 `json:"distance"`  // cumulative distance from start
	Grade     float64 `json:"grade"`     // percentage
}

// GetElevationProfile returns elevation data for a path
func GetElevationProfile(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var request struct {
			Path [][]float64 `json:"path"` // Array of [lng, lat] coordinates
		}

		if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		if len(request.Path) < 2 {
			http.Error(w, "Path must have at least 2 points", http.StatusBadRequest)
			return
		}

		// Get elevation data
		profile := calculateElevationProfile(request.Path)

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(profile)
	}
}

// GetPointElevation returns elevation for a single point
func GetPointElevation(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var request struct {
			Lat float64 `json:"lat"`
			Lng float64 `json:"lng"`
		}

		if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		elevation := getElevationForPoint(request.Lat, request.Lng)

		response := map[string]float64{
			"elevation": elevation,
			"lat":       request.Lat,
			"lng":       request.Lng,
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
	}
}

// AnalyzeClimbs identifies significant climbs in a route
func AnalyzeClimbs(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var request struct {
			Path          [][]float64 `json:"path"`
			MinGrade      float64     `json:"min_grade"`      // minimum grade to consider (default 3%)
			MinLength     float64     `json:"min_length"`     // minimum length in meters (default 500m)
			MinElevation  float64     `json:"min_elevation"`  // minimum elevation gain (default 30m)
		}

		if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		// Set defaults
		if request.MinGrade == 0 {
			request.MinGrade = 3.0
		}
		if request.MinLength == 0 {
			request.MinLength = 500
		}
		if request.MinElevation == 0 {
			request.MinElevation = 30
		}

		climbs := identifyClimbs(request.Path, request.MinGrade, request.MinLength, request.MinElevation)

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(climbs)
	}
}

// calculateElevationProfile generates elevation profile for a path
func calculateElevationProfile(path [][]float64) ElevationProfile {
	profile := ElevationProfile{
		Points:       make([]ElevationPoint, len(path)),
		MinElevation: math.MaxFloat64,
		MaxElevation: -math.MaxFloat64,
	}

	cumulativeDistance := 0.0

	for i, point := range path {
		lng, lat := point[0], point[1]
		elevation := getElevationForPoint(lat, lng)

		// Calculate distance from previous point
		if i > 0 {
			dist := haversineDistance(
				path[i-1][1], path[i-1][0],
				lat, lng,
			)
			cumulativeDistance += dist
		}

		// Calculate grade
		grade := 0.0
		if i > 0 && cumulativeDistance > 0 {
			elevationChange := elevation - profile.Points[i-1].Elevation
			horizontalDistance := haversineDistance(
				path[i-1][1], path[i-1][0],
				lat, lng,
			)
			if horizontalDistance > 0 {
				grade = (elevationChange / horizontalDistance) * 100
			}
		}

		profile.Points[i] = ElevationPoint{
			Lat:       lat,
			Lng:       lng,
			Elevation: elevation,
			Distance:  cumulativeDistance,
			Grade:     grade,
		}

		// Update min/max
		if elevation < profile.MinElevation {
			profile.MinElevation = elevation
		}
		if elevation > profile.MaxElevation {
			profile.MaxElevation = elevation
		}

		// Update max grade
		if math.Abs(grade) > math.Abs(profile.MaxGrade) {
			profile.MaxGrade = grade
		}

		// Calculate elevation gain/loss
		if i > 0 {
			elevationChange := elevation - profile.Points[i-1].Elevation
			if elevationChange > 0 {
				profile.TotalGain += elevationChange
			} else {
				profile.TotalLoss += math.Abs(elevationChange)
			}
		}
	}

	// Calculate average grade
	if cumulativeDistance > 0 {
		profile.AvgGrade = (profile.TotalGain / cumulativeDistance) * 100
	}

	return profile
}

// getElevationForPoint returns elevation for a single coordinate
func getElevationForPoint(lat, lng float64) float64 {
	// In a real implementation, this would query an elevation API
	// For demo purposes, generate realistic elevation based on coordinates
	
	// Base elevation with some geographic variation
	baseElevation := 100.0
	
	// Add hills based on sine waves
	hilliness := math.Sin(lat*50) * 30 + math.Cos(lng*50) * 20
	
	// Add some random variation
	variation := math.Sin(lat*lng*1000) * 5
	
	// Ensure non-negative elevation
	elevation := math.Max(0, baseElevation + hilliness + variation)
	
	return elevation
}

// identifyClimbs finds significant climbs in a route
func identifyClimbs(path [][]float64, minGrade, minLength, minElevation float64) []Climb {
	profile := calculateElevationProfile(path)
	var climbs []Climb
	var currentClimb *Climb

	for i := 1; i < len(profile.Points); i++ {
		point := profile.Points[i]
		prevPoint := profile.Points[i-1]

		if point.Grade >= minGrade {
			// Start or continue climb
			if currentClimb == nil {
				currentClimb = &Climb{
					StartIndex:    i - 1,
					StartDistance: prevPoint.Distance,
					StartElevation: prevPoint.Elevation,
					Points:        []ElevationPoint{prevPoint},
				}
			}
			currentClimb.Points = append(currentClimb.Points, point)
		} else if currentClimb != nil {
			// End of climb
			finishClimb(currentClimb, i-1, profile.Points[i-1])
			
			// Check if climb meets criteria
			if currentClimb.Length >= minLength && currentClimb.ElevationGain >= minElevation {
				currentClimb.Category = categorizeClimb(currentClimb.ElevationGain, currentClimb.Length, currentClimb.AvgGrade)
				climbs = append(climbs, *currentClimb)
			}
			
			currentClimb = nil
		}
	}

	// Handle climb that extends to end of route
	if currentClimb != nil {
		lastPoint := profile.Points[len(profile.Points)-1]
		finishClimb(currentClimb, len(profile.Points)-1, lastPoint)
		
		if currentClimb.Length >= minLength && currentClimb.ElevationGain >= minElevation {
			currentClimb.Category = categorizeClimb(currentClimb.ElevationGain, currentClimb.Length, currentClimb.AvgGrade)
			climbs = append(climbs, *currentClimb)
		}
	}

	return climbs
}

// Climb represents a significant climb in a route
type Climb struct {
	StartIndex     int              `json:"start_index"`
	EndIndex       int              `json:"end_index"`
	StartDistance  float64          `json:"start_distance"`
	EndDistance    float64          `json:"end_distance"`
	Length         float64          `json:"length"`
	StartElevation float64          `json:"start_elevation"`
	EndElevation   float64          `json:"end_elevation"`
	ElevationGain  float64          `json:"elevation_gain"`
	AvgGrade       float64          `json:"avg_grade"`
	MaxGrade       float64          `json:"max_grade"`
	Category       string           `json:"category"`
	Points         []ElevationPoint `json:"points"`
}

func finishClimb(climb *Climb, endIndex int, endPoint ElevationPoint) {
	climb.EndIndex = endIndex
	climb.EndDistance = endPoint.Distance
	climb.EndElevation = endPoint.Elevation
	climb.Length = climb.EndDistance - climb.StartDistance
	climb.ElevationGain = climb.EndElevation - climb.StartElevation
	
	if climb.Length > 0 {
		climb.AvgGrade = (climb.ElevationGain / climb.Length) * 100
	}
	
	// Calculate max grade
	for _, point := range climb.Points {
		if point.Grade > climb.MaxGrade {
			climb.MaxGrade = point.Grade
		}
	}
}

func categorizeClimb(elevationGain, length, avgGrade float64) string {
	// Categorize based on combination of elevation, length, and grade
	score := elevationGain * avgGrade / 100
	
	if score > 8000 {
		return "HC" // Hors catégorie
	} else if score > 5000 {
		return "1"
	} else if score > 3000 {
		return "2"
	} else if score > 1500 {
		return "3"
	} else if score > 500 {
		return "4"
	}
	return "Uncategorized"
}

// GetElevationTiles returns elevation tile data for map rendering
func GetElevationTiles(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		z := r.URL.Query().Get("z") // zoom level
		x := r.URL.Query().Get("x") // tile x
		y := r.URL.Query().Get("y") // tile y

		// In a real implementation, this would serve elevation raster tiles
		// For now, return a simple response
		response := map[string]interface{}{
			"tile": fmt.Sprintf("%s/%s/%s", z, x, y),
			"type": "elevation",
			"format": "terrarium",
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
	}
}

// fetchOpenElevation queries Open-Elevation API (example implementation)
func fetchOpenElevation(locations [][]float64) ([]float64, error) {
	// Format locations for API
	var locationStrings []string
	for _, loc := range locations {
		locationStrings = append(locationStrings, 
			fmt.Sprintf(`{"latitude":%f,"longitude":%f}`, loc[1], loc[0]))
	}

	requestBody := fmt.Sprintf(`{"locations":[%s]}`, strings.Join(locationStrings, ","))

	// Make API request (example - would need actual API endpoint)
	resp, err := http.Post(
		"https://api.open-elevation.com/api/v1/lookup",
		"application/json",
		strings.NewReader(requestBody),
	)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var result struct {
		Results []struct {
			Elevation float64 `json:"elevation"`
		} `json:"results"`
	}

	if err := json.Unmarshal(body, &result); err != nil {
		return nil, err
	}

	elevations := make([]float64, len(result.Results))
	for i, r := range result.Results {
		elevations[i] = r.Elevation
	}

	return elevations, nil
}