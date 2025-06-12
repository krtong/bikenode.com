# Cache Invalidation Example for Cabin Motorcycles API

If you need to add modification endpoints (POST, PUT, DELETE) for cabin motorcycles in the future, here's how to implement cache invalidation:

## Example: Adding a New Cabin Motorcycle

```go
// CreateCabinMotorcycle creates a new cabin motorcycle entry
func CreateCabinMotorcycle(db *sql.DB, cache *middleware.CacheMiddleware) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        // Parse request body
        var motorcycle CabinMotorcycle
        if err := json.NewDecoder(r.Body).Decode(&motorcycle); err != nil {
            sendErrorResponse(w, http.StatusBadRequest, ErrCodeInvalidInput,
                "Invalid request body", map[string]interface{}{
                    "error": err.Error(),
                })
            return
        }
        
        // Insert into database
        query := `
            INSERT INTO motorcycle_data_make_model_year 
            (year, make, model, package, category)
            VALUES ($1, $2, $3, $4, 'cabin')
            RETURNING id
        `
        
        err := db.QueryRow(query, 
            motorcycle.Year, 
            motorcycle.Make, 
            motorcycle.Model, 
            motorcycle.Package,
        ).Scan(&motorcycle.ID)
        
        if err != nil {
            sendErrorResponse(w, http.StatusInternalServerError, ErrCodeDatabase,
                "Failed to create cabin motorcycle", map[string]interface{}{
                    "error": err.Error(),
                })
            return
        }
        
        // Invalidate related caches
        // The cache middleware automatically handles this for POST requests
        // but you can also manually invalidate specific patterns:
        // cache.InvalidatePattern("/api/cabin-motorcycles")
        
        // Return created motorcycle
        w.Header().Set("Content-Type", "application/json")
        w.WriteHeader(http.StatusCreated)
        json.NewEncoder(w).Encode(motorcycle)
    }
}
```

## Example: Updating a Cabin Motorcycle

```go
// UpdateCabinMotorcycle updates an existing cabin motorcycle
func UpdateCabinMotorcycle(db *sql.DB, cache *middleware.CacheMiddleware) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        vars := mux.Vars(r)
        id := vars["id"]
        
        // Parse request body
        var updates map[string]interface{}
        if err := json.NewDecoder(r.Body).Decode(&updates); err != nil {
            sendErrorResponse(w, http.StatusBadRequest, ErrCodeInvalidInput,
                "Invalid request body", map[string]interface{}{
                    "error": err.Error(),
                })
            return
        }
        
        // Build update query dynamically
        // ... (query building logic)
        
        // Execute update
        result, err := db.Exec(query, args...)
        if err != nil {
            sendErrorResponse(w, http.StatusInternalServerError, ErrCodeDatabase,
                "Failed to update cabin motorcycle", map[string]interface{}{
                    "error": err.Error(),
                })
            return
        }
        
        // Check if motorcycle was found
        rowsAffected, _ := result.RowsAffected()
        if rowsAffected == 0 {
            sendErrorResponse(w, http.StatusNotFound, ErrCodeNotFound,
                "Cabin motorcycle not found", map[string]interface{}{
                    "id": id,
                })
            return
        }
        
        // The cache middleware automatically invalidates on PUT requests
        
        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(map[string]string{
            "status": "updated",
            "id": id,
        })
    }
}
```

## Manual Cache Invalidation

If you need more granular control over cache invalidation, you can:

1. **Invalidate specific patterns**:
```go
// In your handler
cache.InvalidateCache("/api/cabin-motorcycles")
```

2. **Invalidate by make**:
```go
// When updating a specific make
cache.InvalidateCache(fmt.Sprintf("/api/cabin-motorcycles?make=%s", make))
```

3. **Invalidate search results**:
```go
// After any modification
cache.InvalidateCache("/api/cabin-motorcycles/search")
```

## Route Registration

When adding modification endpoints, register them without the cache middleware:

```go
// In main.go
// Read operations with caching
apiRouter.Handle("/cabin-motorcycles", cacheMiddleware.CacheHandler(api.GetCabinMotorcycles(db))).Methods("GET")

// Write operations without caching (but they trigger invalidation)
apiRouter.HandleFunc("/cabin-motorcycles", api.CreateCabinMotorcycle(db)).Methods("POST")
apiRouter.HandleFunc("/cabin-motorcycles/{id}", api.UpdateCabinMotorcycle(db)).Methods("PUT")
apiRouter.HandleFunc("/cabin-motorcycles/{id}", api.DeleteCabinMotorcycle(db)).Methods("DELETE")
```

The cache middleware automatically detects POST/PUT/DELETE requests and invalidates related cache entries based on the URL path.