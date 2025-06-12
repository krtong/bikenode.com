package api

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
	
	"github.com/gorilla/mux"
)

// ErrorResponse represents a structured error response
type ErrorResponse struct {
	Code    string                 `json:"code"`
	Message string                 `json:"message"`
	Details map[string]interface{} `json:"details,omitempty"`
}

// Error codes
const (
	ErrCodeDatabase       = "DATABASE_ERROR"
	ErrCodeNotFound       = "NOT_FOUND"
	ErrCodeInvalidInput   = "INVALID_INPUT"
	ErrCodeInternalServer = "INTERNAL_SERVER_ERROR"
	ErrCodeConnectionPool = "CONNECTION_POOL_ERROR"
)

// sendErrorResponse sends a structured error response
func sendErrorResponse(w http.ResponseWriter, statusCode int, errCode string, message string, details map[string]interface{}) {
	log.Printf("Error [%s]: %s - Details: %+v", errCode, message, details)
	
	response := ErrorResponse{
		Code:    errCode,
		Message: message,
		Details: details,
	}
	
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	json.NewEncoder(w).Encode(response)
}

// validatePaginationParams validates and returns pagination parameters with error details
func validatePaginationParams(pageStr, limitStr string) (page, limit int, err error) {
	page = 1
	limit = DefaultLimit
	
	if pageStr != "" {
		p, parseErr := strconv.Atoi(pageStr)
		if parseErr != nil {
			return 0, 0, fmt.Errorf("invalid page parameter: must be a number")
		}
		if p < 1 {
			return 0, 0, fmt.Errorf("invalid page parameter: must be greater than 0")
		}
		page = p
	}
	
	if limitStr != "" {
		l, parseErr := strconv.Atoi(limitStr)
		if parseErr != nil {
			return 0, 0, fmt.Errorf("invalid limit parameter: must be a number")
		}
		if l < 1 {
			return 0, 0, fmt.Errorf("invalid limit parameter: must be greater than 0")
		}
		if l > MaxLimit {
			limit = MaxLimit
		} else {
			limit = l
		}
	}
	
	return page, limit, nil
}

// validateYearParam validates year parameters
func validateYearParam(yearStr string, paramName string) (int, error) {
	if yearStr == "" {
		return 0, nil
	}
	
	year, err := strconv.Atoi(yearStr)
	if err != nil {
		return 0, fmt.Errorf("invalid %s: must be a number", paramName)
	}
	
	currentYear := 2025 // You might want to make this dynamic
	if year < 1900 || year > currentYear+1 {
		return 0, fmt.Errorf("invalid %s: must be between 1900 and %d", paramName, currentYear+1)
	}
	
	return year, nil
}

// CabinMotorcycle represents a cabin motorcycle with specifications
type CabinMotorcycle struct {
	ID            string                 `json:"id"`
	Year          int                    `json:"year"`
	Make          string                 `json:"make"`
	Model         string                 `json:"model"`
	Package       *string                `json:"package,omitempty"`
	Category      string                 `json:"category"`
	Subcategory   string                 `json:"subcategory,omitempty"`
	Specifications map[string]interface{} `json:"specifications,omitempty"`
}

// PaginationInfo contains pagination metadata
type PaginationInfo struct {
	Page       int `json:"page"`
	Limit      int `json:"limit"`
	Total      int `json:"total"`
	TotalPages int `json:"totalPages"`
}

// PaginatedResponse wraps data with pagination info
type PaginatedResponse struct {
	Data       interface{}    `json:"data"`
	Pagination PaginationInfo `json:"pagination"`
}

// Constants for pagination
const (
	DefaultLimit = 20
	MaxLimit     = 100
)

// parsePaginationParams extracts and validates pagination parameters from request
func parsePaginationParams(r *http.Request) (page, limit int, err error) {
	pageStr := r.URL.Query().Get("page")
	limitStr := r.URL.Query().Get("limit")
	
	return validatePaginationParams(pageStr, limitStr)
}

// GetCabinMotorcycles returns all cabin motorcycles with optional filtering and pagination
func GetCabinMotorcycles(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Log API access for monitoring
		log.Printf("Cabin motorcycles API accessed - IP: %s, User-Agent: %s", 
			r.Header.Get("X-Forwarded-For"), r.Header.Get("User-Agent"))
		
		// Check database connection
		if db == nil {
			sendErrorResponse(w, http.StatusInternalServerError, ErrCodeConnectionPool, 
				"Database connection not available", nil)
			return
		}
		
		// Get query parameters
		subcategory := r.URL.Query().Get("subcategory") // fully_enclosed, semi_enclosed
		make := r.URL.Query().Get("make")
		yearFromStr := r.URL.Query().Get("year_from")
		yearToStr := r.URL.Query().Get("year_to")
		
		// Parse pagination parameters
		page, limit, err := parsePaginationParams(r)
		if err != nil {
			sendErrorResponse(w, http.StatusBadRequest, ErrCodeInvalidInput,
				"Invalid pagination parameters", map[string]interface{}{
					"error": err.Error(),
				})
			return
		}
		
		// Validate year parameters
		yearFrom, err := validateYearParam(yearFromStr, "year_from")
		if err != nil {
			sendErrorResponse(w, http.StatusBadRequest, ErrCodeInvalidInput,
				"Invalid year parameter", map[string]interface{}{
					"error": err.Error(),
				})
			return
		}
		
		yearTo, err := validateYearParam(yearToStr, "year_to")
		if err != nil {
			sendErrorResponse(w, http.StatusBadRequest, ErrCodeInvalidInput,
				"Invalid year parameter", map[string]interface{}{
					"error": err.Error(),
				})
			return
		}
		
		// Validate year range
		if yearFrom > 0 && yearTo > 0 && yearFrom > yearTo {
			sendErrorResponse(w, http.StatusBadRequest, ErrCodeInvalidInput,
				"Invalid year range", map[string]interface{}{
					"error": "year_from cannot be greater than year_to",
				})
			return
		}
		
		// Validate subcategory if provided
		if subcategory != "" && subcategory != "fully_enclosed" && subcategory != "semi_enclosed" {
			sendErrorResponse(w, http.StatusBadRequest, ErrCodeInvalidInput,
				"Invalid subcategory", map[string]interface{}{
					"error": "subcategory must be 'fully_enclosed' or 'semi_enclosed'",
					"provided": subcategory,
				})
			return
		}
		
		// Build WHERE clause
		whereClause := " WHERE m.category = 'cabin'"
		var args []interface{}
		argCount := 1
		
		// Add filters
		if subcategory != "" {
			whereClause += ` AND s.specifications->>'subcategory' = $` + strconv.Itoa(argCount)
			args = append(args, subcategory)
			argCount++
		}
		
		if make != "" {
			whereClause += ` AND LOWER(m.make) = LOWER($` + strconv.Itoa(argCount) + `)`
			args = append(args, make)
			argCount++
		}
		
		if yearFrom > 0 {
			whereClause += ` AND m.year >= $` + strconv.Itoa(argCount)
			args = append(args, yearFrom)
			argCount++
		}
		
		if yearTo > 0 {
			whereClause += ` AND m.year <= $` + strconv.Itoa(argCount)
			args = append(args, yearTo)
			argCount++
		}
		
		// First, get the total count
		countQuery := `
			SELECT COUNT(*)
			FROM motorcycle_data_make_model_year m
			LEFT JOIN motorcycle_data_specs s ON m.spec_id = s.id
		` + whereClause
		
		var totalCount int
		err = db.QueryRow(countQuery, args...).Scan(&totalCount)
		if err != nil {
			sendErrorResponse(w, http.StatusInternalServerError, ErrCodeDatabase,
				"Failed to count cabin motorcycles", map[string]interface{}{
					"query": "count query",
					"error": err.Error(),
				})
			return
		}
		
		// Calculate pagination values
		offset := (page - 1) * limit
		totalPages := (totalCount + limit - 1) / limit
		
		// Main query with pagination
		query := `
			SELECT 
				m.id, m.year, m.make, m.model, m.package,
				m.category, s.specifications
			FROM motorcycle_data_make_model_year m
			LEFT JOIN motorcycle_data_specs s ON m.spec_id = s.id
		` + whereClause + `
			ORDER BY m.make, m.model, m.year
			LIMIT $` + strconv.Itoa(argCount) + ` OFFSET $` + strconv.Itoa(argCount+1)
		
		args = append(args, limit, offset)
		
		rows, err := db.Query(query, args...)
		if err != nil {
			sendErrorResponse(w, http.StatusInternalServerError, ErrCodeDatabase,
				"Failed to fetch cabin motorcycles", map[string]interface{}{
					"query": "main query",
					"error": err.Error(),
				})
			return
		}
		defer func() {
			if closeErr := rows.Close(); closeErr != nil {
				log.Printf("Error closing rows: %v", closeErr)
			}
		}()
		
		var motorcycles []CabinMotorcycle
		for rows.Next() {
			var cm CabinMotorcycle
			var specsJSON sql.NullString
			
			err := rows.Scan(&cm.ID, &cm.Year, &cm.Make, &cm.Model, &cm.Package,
				&cm.Category, &specsJSON)
			if err != nil {
				log.Printf("Error scanning row: %v", err)
				continue
			}
			
			// Parse specifications if available
			if specsJSON.Valid {
				var specs map[string]interface{}
				if err := json.Unmarshal([]byte(specsJSON.String), &specs); err == nil {
					cm.Specifications = specs
					// Extract subcategory if available
					if subcat, ok := specs["subcategory"].(string); ok {
						cm.Subcategory = subcat
					}
				} else {
					log.Printf("Error parsing specifications for motorcycle %s: %v", cm.ID, err)
				}
			}
			
			motorcycles = append(motorcycles, cm)
		}
		
		// Check for errors from iterating over rows
		if err = rows.Err(); err != nil {
			sendErrorResponse(w, http.StatusInternalServerError, ErrCodeDatabase,
				"Error processing query results", map[string]interface{}{
					"error": err.Error(),
				})
			return
		}
		
		// Create paginated response
		response := PaginatedResponse{
			Data: motorcycles,
			Pagination: PaginationInfo{
				Page:       page,
				Limit:      limit,
				Total:      totalCount,
				TotalPages: totalPages,
			},
		}
		
		// Ensure motorcycles is not nil
		if motorcycles == nil {
			response.Data = []CabinMotorcycle{}
		}
		
		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(response); err != nil {
			log.Printf("Error encoding response: %v", err)
			sendErrorResponse(w, http.StatusInternalServerError, ErrCodeInternalServer,
				"Failed to encode response", map[string]interface{}{
					"error": err.Error(),
				})
		}
	}
}

// GetCabinMotorcycleMakes returns all manufacturers that make cabin motorcycles
func GetCabinMotorcycleMakes(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Check database connection
		if db == nil {
			sendErrorResponse(w, http.StatusInternalServerError, ErrCodeConnectionPool,
				"Database connection not available", nil)
			return
		}
		
		query := `
			SELECT DISTINCT make, COUNT(*) as model_count
			FROM motorcycle_data_make_model_year
			WHERE category = 'cabin'
			GROUP BY make
			ORDER BY make
		`
		
		rows, err := db.Query(query)
		if err != nil {
			sendErrorResponse(w, http.StatusInternalServerError, ErrCodeDatabase,
				"Failed to fetch cabin motorcycle manufacturers", map[string]interface{}{
					"error": err.Error(),
				})
			return
		}
		defer func() {
			if closeErr := rows.Close(); closeErr != nil {
				log.Printf("Error closing rows: %v", closeErr)
			}
		}()
		
		type MakeInfo struct {
			Make       string `json:"make"`
			ModelCount int    `json:"model_count"`
		}
		
		var makes []MakeInfo
		for rows.Next() {
			var mi MakeInfo
			err := rows.Scan(&mi.Make, &mi.ModelCount)
			if err != nil {
				log.Printf("Error scanning make info: %v", err)
				continue
			}
			makes = append(makes, mi)
		}
		
		// Check for errors from iterating over rows
		if err = rows.Err(); err != nil {
			sendErrorResponse(w, http.StatusInternalServerError, ErrCodeDatabase,
				"Error processing query results", map[string]interface{}{
					"error": err.Error(),
				})
			return
		}
		
		// Ensure makes is not nil
		if makes == nil {
			makes = []MakeInfo{}
		}
		
		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(makes); err != nil {
			log.Printf("Error encoding response: %v", err)
			sendErrorResponse(w, http.StatusInternalServerError, ErrCodeInternalServer,
				"Failed to encode response", map[string]interface{}{
					"error": err.Error(),
				})
		}
	}
}

// GetCabinMotorcycleStats returns statistics about cabin motorcycles
func GetCabinMotorcycleStats(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Check database connection
		if db == nil {
			sendErrorResponse(w, http.StatusInternalServerError, ErrCodeConnectionPool,
				"Database connection not available", nil)
			return
		}
		
		// Try to use materialized view if available
		var stats struct {
			TotalModels      int            `json:"total_models"`
			TotalMakes       int            `json:"total_makes"`
			ByMake          []MakeStats    `json:"by_make"`
			BySubcategory   []CategoryStats `json:"by_subcategory"`
			ProductionYears struct {
				Earliest int `json:"earliest"`
				Latest   int `json:"latest"`
			} `json:"production_years"`
		}
		
		// Initialize slices to avoid nil
		stats.ByMake = []MakeStats{}
		stats.BySubcategory = []CategoryStats{}
		
		// Total counts
		err := db.QueryRow(`
			SELECT COUNT(*), COUNT(DISTINCT make)
			FROM motorcycle_data_make_model_year
			WHERE category = 'cabin'
		`).Scan(&stats.TotalModels, &stats.TotalMakes)
		
		if err != nil {
			sendErrorResponse(w, http.StatusInternalServerError, ErrCodeDatabase,
				"Failed to fetch total counts", map[string]interface{}{
					"error": err.Error(),
				})
			return
		}
		
		// By make statistics
		rows, err := db.Query(`
			SELECT make, COUNT(*) as total_models, 
				   MIN(year) as first_year, MAX(year) as last_year
			FROM motorcycle_data_make_model_year
			WHERE category = 'cabin'
			GROUP BY make
			ORDER BY COUNT(*) DESC
		`)
		if err != nil {
			log.Printf("Error fetching make statistics: %v", err)
		} else {
			defer func() {
				if closeErr := rows.Close(); closeErr != nil {
					log.Printf("Error closing rows: %v", closeErr)
				}
			}()
			
			for rows.Next() {
				var ms MakeStats
				if err := rows.Scan(&ms.Make, &ms.TotalModels, &ms.FirstYear, &ms.LastYear); err != nil {
					log.Printf("Error scanning make stats: %v", err)
					continue
				}
				stats.ByMake = append(stats.ByMake, ms)
			}
			
			if err = rows.Err(); err != nil {
				log.Printf("Error iterating make stats rows: %v", err)
			}
		}
		
		// Production year range
		err = db.QueryRow(`
			SELECT MIN(year), MAX(year)
			FROM motorcycle_data_make_model_year
			WHERE category = 'cabin'
		`).Scan(&stats.ProductionYears.Earliest, &stats.ProductionYears.Latest)
		
		if err != nil {
			log.Printf("Error fetching production year range: %v", err)
			// Set defaults to avoid zero values
			stats.ProductionYears.Earliest = 0
			stats.ProductionYears.Latest = 0
		}
		
		// By subcategory (if available in specs)
		rows, err = db.Query(`
			SELECT 
				COALESCE(s.specifications->>'subcategory', 'unspecified') as subcategory,
				COUNT(*) as count
			FROM motorcycle_data_make_model_year m
			LEFT JOIN motorcycle_data_specs s ON m.spec_id = s.id
			WHERE m.category = 'cabin'
			GROUP BY subcategory
			ORDER BY count DESC
		`)
		if err != nil {
			log.Printf("Error fetching subcategory statistics: %v", err)
		} else {
			defer func() {
				if closeErr := rows.Close(); closeErr != nil {
					log.Printf("Error closing rows: %v", closeErr)
				}
			}()
			
			for rows.Next() {
				var cs CategoryStats
				if err := rows.Scan(&cs.Category, &cs.Count); err != nil {
					log.Printf("Error scanning category stats: %v", err)
					continue
				}
				stats.BySubcategory = append(stats.BySubcategory, cs)
			}
			
			if err = rows.Err(); err != nil {
				log.Printf("Error iterating subcategory rows: %v", err)
			}
		}
		
		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(stats); err != nil {
			log.Printf("Error encoding response: %v", err)
			sendErrorResponse(w, http.StatusInternalServerError, ErrCodeInternalServer,
				"Failed to encode response", map[string]interface{}{
					"error": err.Error(),
				})
		}
	}
}

// GetCabinMotorcycleDetails returns detailed information for a specific cabin motorcycle
func GetCabinMotorcycleDetails(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Check database connection
		if db == nil {
			sendErrorResponse(w, http.StatusInternalServerError, ErrCodeConnectionPool,
				"Database connection not available", nil)
			return
		}
		
		vars := mux.Vars(r)
		id := vars["id"]
		
		// Validate ID parameter
		if id == "" {
			sendErrorResponse(w, http.StatusBadRequest, ErrCodeInvalidInput,
				"Invalid motorcycle ID", map[string]interface{}{
					"error": "ID parameter is required",
				})
			return
		}
		
		var cm CabinMotorcycle
		var specsJSON sql.NullString
		
		err := db.QueryRow(`
			SELECT 
				m.id, m.year, m.make, m.model, m.package,
				m.category, s.specifications
			FROM motorcycle_data_make_model_year m
			LEFT JOIN motorcycle_data_specs s ON m.spec_id = s.id
			WHERE m.id = $1 AND m.category = 'cabin'
		`, id).Scan(&cm.ID, &cm.Year, &cm.Make, &cm.Model, &cm.Package,
			&cm.Category, &specsJSON)
		
		if err != nil {
			if err == sql.ErrNoRows {
				sendErrorResponse(w, http.StatusNotFound, ErrCodeNotFound,
					"Cabin motorcycle not found", map[string]interface{}{
						"id": id,
					})
			} else {
				sendErrorResponse(w, http.StatusInternalServerError, ErrCodeDatabase,
					"Failed to fetch cabin motorcycle details", map[string]interface{}{
						"id":    id,
						"error": err.Error(),
					})
			}
			return
		}
		
		// Parse specifications
		if specsJSON.Valid {
			var specs map[string]interface{}
			if err := json.Unmarshal([]byte(specsJSON.String), &specs); err == nil {
				cm.Specifications = specs
				if subcat, ok := specs["subcategory"].(string); ok {
					cm.Subcategory = subcat
				}
			} else {
				log.Printf("Error parsing specifications for motorcycle %s: %v", cm.ID, err)
			}
		}
		
		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(cm); err != nil {
			log.Printf("Error encoding response: %v", err)
			sendErrorResponse(w, http.StatusInternalServerError, ErrCodeInternalServer,
				"Failed to encode response", map[string]interface{}{
					"error": err.Error(),
				})
		}
	}
}

// SearchCabinMotorcycles provides full-text search for cabin motorcycles with pagination
func SearchCabinMotorcycles(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		query := r.URL.Query().Get("q")
		
		// Log search API access for monitoring (important due to lower rate limits)
		log.Printf("Cabin motorcycles search API accessed - IP: %s, Query: %s, User-Agent: %s", 
			r.Header.Get("X-Forwarded-For"), query, r.Header.Get("User-Agent"))
		
		// Check database connection
		if db == nil {
			sendErrorResponse(w, http.StatusInternalServerError, ErrCodeConnectionPool,
				"Database connection not available", nil)
			return
		}
		if query == "" {
			sendErrorResponse(w, http.StatusBadRequest, ErrCodeInvalidInput,
				"Search query is required", map[string]interface{}{
					"error": "Query parameter 'q' must not be empty",
				})
			return
		}
		
		// Validate query length
		if len(query) < 2 {
			sendErrorResponse(w, http.StatusBadRequest, ErrCodeInvalidInput,
				"Search query too short", map[string]interface{}{
					"error": "Query must be at least 2 characters long",
					"provided": query,
				})
			return
		}
		
		if len(query) > 100 {
			sendErrorResponse(w, http.StatusBadRequest, ErrCodeInvalidInput,
				"Search query too long", map[string]interface{}{
					"error": "Query must not exceed 100 characters",
					"length": len(query),
				})
			return
		}
		
		// Parse pagination parameters
		page, limit, err := parsePaginationParams(r)
		if err != nil {
			sendErrorResponse(w, http.StatusBadRequest, ErrCodeInvalidInput,
				"Invalid pagination parameters", map[string]interface{}{
					"error": err.Error(),
				})
			return
		}
		
		searchTerm := "%" + strings.ToLower(query) + "%"
		
		// First, get the total count
		countQuery := `
			SELECT COUNT(*)
			FROM motorcycle_data_make_model_year m
			LEFT JOIN motorcycle_data_specs s ON m.spec_id = s.id
			WHERE m.category = 'cabin'
			AND (
				LOWER(m.make) LIKE LOWER($1) OR
				LOWER(m.model) LIKE LOWER($1) OR
				LOWER(m.package) LIKE LOWER($1) OR
				LOWER(s.specifications::text) LIKE LOWER($1)
			)
		`
		
		var totalCount int
		err = db.QueryRow(countQuery, searchTerm).Scan(&totalCount)
		if err != nil {
			sendErrorResponse(w, http.StatusInternalServerError, ErrCodeDatabase,
				"Failed to count search results", map[string]interface{}{
					"query": query,
					"error": err.Error(),
				})
			return
		}
		
		// Calculate pagination values
		offset := (page - 1) * limit
		totalPages := (totalCount + limit - 1) / limit
		
		// Main search query with pagination
		searchQuery := `
			SELECT 
				m.id, m.year, m.make, m.model, m.package,
				m.category, s.specifications
			FROM motorcycle_data_make_model_year m
			LEFT JOIN motorcycle_data_specs s ON m.spec_id = s.id
			WHERE m.category = 'cabin'
			AND (
				LOWER(m.make) LIKE LOWER($1) OR
				LOWER(m.model) LIKE LOWER($1) OR
				LOWER(m.package) LIKE LOWER($1) OR
				LOWER(s.specifications::text) LIKE LOWER($1)
			)
			ORDER BY m.make, m.model, m.year
			LIMIT $2 OFFSET $3
		`
		
		rows, err := db.Query(searchQuery, searchTerm, limit, offset)
		if err != nil {
			sendErrorResponse(w, http.StatusInternalServerError, ErrCodeDatabase,
				"Failed to search cabin motorcycles", map[string]interface{}{
					"query": query,
					"error": err.Error(),
				})
			return
		}
		defer func() {
			if closeErr := rows.Close(); closeErr != nil {
				log.Printf("Error closing rows: %v", closeErr)
			}
		}()
		
		var results []CabinMotorcycle
		for rows.Next() {
			var cm CabinMotorcycle
			var specsJSON sql.NullString
			
			err := rows.Scan(&cm.ID, &cm.Year, &cm.Make, &cm.Model, &cm.Package,
				&cm.Category, &specsJSON)
			if err != nil {
				log.Printf("Error scanning search result: %v", err)
				continue
			}
			
			if specsJSON.Valid {
				var specs map[string]interface{}
				if err := json.Unmarshal([]byte(specsJSON.String), &specs); err == nil {
					cm.Specifications = specs
					// Extract subcategory if available
					if subcat, ok := specs["subcategory"].(string); ok {
						cm.Subcategory = subcat
					}
				} else {
					log.Printf("Error parsing specifications for motorcycle %s: %v", cm.ID, err)
				}
			}
			
			results = append(results, cm)
		}
		
		// Check for errors from iterating over rows
		if err = rows.Err(); err != nil {
			sendErrorResponse(w, http.StatusInternalServerError, ErrCodeDatabase,
				"Error processing search results", map[string]interface{}{
					"error": err.Error(),
				})
			return
		}
		
		// Ensure results is not nil
		if results == nil {
			results = []CabinMotorcycle{}
		}
		
		// Create paginated response
		response := PaginatedResponse{
			Data: results,
			Pagination: PaginationInfo{
				Page:       page,
				Limit:      limit,
				Total:      totalCount,
				TotalPages: totalPages,
			},
		}
		
		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(response); err != nil {
			log.Printf("Error encoding response: %v", err)
			sendErrorResponse(w, http.StatusInternalServerError, ErrCodeInternalServer,
				"Failed to encode response", map[string]interface{}{
					"error": err.Error(),
				})
		}
	}
}

// Helper types
type MakeStats struct {
	Make        string `json:"make"`
	TotalModels int    `json:"total_models"`
	FirstYear   int    `json:"first_year"`
	LastYear    int    `json:"last_year"`
}

type CategoryStats struct {
	Category string `json:"category"`
	Count    int    `json:"count"`
}