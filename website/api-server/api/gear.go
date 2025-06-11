package api

import (
    "database/sql"
    "encoding/json"
    "net/http"
    "strconv"
)

type GearProduct struct {
    ID             int                    `json:"id"`
    ExternalID     string                 `json:"external_id"`
    Name           string                 `json:"name"`
    Brand          string                 `json:"brand"`
    Category       string                 `json:"category"`
    Subcategory    *string                `json:"subcategory"`
    Price          float64                `json:"price"`
    SalePrice      *float64               `json:"sale_price"`
    Currency       string                 `json:"currency"`
    Description    string                 `json:"description"`
    Features       []string               `json:"features"`
    Specifications map[string]interface{} `json:"specifications"`
    Rating         *float64               `json:"rating"`
    ReviewCount    *int                   `json:"review_count"`
    Images         []string               `json:"images"`
    LocalImagePath *string                `json:"local_image_path"`
    Sizes          []map[string]interface{} `json:"sizes"`
    URL            string                 `json:"url"`
    InStock        bool                   `json:"in_stock"`
}

func HandleGearProducts(db *sql.DB) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        // Set CORS headers
        w.Header().Set("Access-Control-Allow-Origin", "*")
        w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
        w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
        
        if r.Method == "OPTIONS" {
            return
        }
        
        if r.Method != "GET" {
            http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
            return
        }
        
        // Get query parameters
        category := r.URL.Query().Get("category")
        brand := r.URL.Query().Get("brand")
        search := r.URL.Query().Get("search")
        minPrice := r.URL.Query().Get("min_price")
        maxPrice := r.URL.Query().Get("max_price")
        minRating := r.URL.Query().Get("min_rating")
        limit := r.URL.Query().Get("limit")
        
        // Build query
        query := `
            SELECT id, external_id, name, brand, category, subcategory,
                   price, sale_price, currency, description, features,
                   specifications, rating, review_count, images,
                   local_image_path, sizes, url, in_stock
            FROM gear_products
            WHERE 1=1
        `
        
        var args []interface{}
        argIndex := 1
        
        if category != "" {
            query += ` AND category = $` + strconv.Itoa(argIndex)
            args = append(args, category)
            argIndex++
        }
        
        if brand != "" {
            query += ` AND brand = $` + strconv.Itoa(argIndex)
            args = append(args, brand)
            argIndex++
        }
        
        if search != "" {
            query += ` AND (name ILIKE $` + strconv.Itoa(argIndex) + 
                     ` OR brand ILIKE $` + strconv.Itoa(argIndex) + 
                     ` OR description ILIKE $` + strconv.Itoa(argIndex) + `)`
            args = append(args, "%"+search+"%")
            argIndex++
        }
        
        if minPrice != "" {
            if price, err := strconv.ParseFloat(minPrice, 64); err == nil {
                query += ` AND price >= $` + strconv.Itoa(argIndex)
                args = append(args, price)
                argIndex++
            }
        }
        
        if maxPrice != "" {
            if price, err := strconv.ParseFloat(maxPrice, 64); err == nil {
                query += ` AND price <= $` + strconv.Itoa(argIndex)
                args = append(args, price)
                argIndex++
            }
        }
        
        if minRating != "" {
            if rating, err := strconv.ParseFloat(minRating, 64); err == nil {
                query += ` AND rating >= $` + strconv.Itoa(argIndex)
                args = append(args, rating)
                argIndex++
            }
        }
        
        // Add ordering
        query += ` ORDER BY rating DESC NULLS LAST, review_count DESC NULLS LAST`
        
        // Add limit
        if limit != "" {
            if l, err := strconv.Atoi(limit); err == nil && l > 0 && l <= 100 {
                query += ` LIMIT $` + strconv.Itoa(argIndex)
                args = append(args, l)
            }
        } else {
            query += ` LIMIT 50` // Default limit
        }
        
        // Execute query
        rows, err := db.Query(query, args...)
        if err != nil {
            http.Error(w, "Database error", http.StatusInternalServerError)
            return
        }
        defer rows.Close()
        
        var products []GearProduct
        
        for rows.Next() {
            var p GearProduct
            var features, images string
            var specifications, sizes string
            
            err := rows.Scan(
                &p.ID, &p.ExternalID, &p.Name, &p.Brand, &p.Category,
                &p.Subcategory, &p.Price, &p.SalePrice, &p.Currency,
                &p.Description, &features, &specifications, &p.Rating,
                &p.ReviewCount, &images, &p.LocalImagePath, &sizes,
                &p.URL, &p.InStock,
            )
            if err != nil {
                continue
            }
            
            // Parse JSON fields
            if features != "" {
                json.Unmarshal([]byte(features), &p.Features)
            }
            if images != "" {
                json.Unmarshal([]byte(images), &p.Images)
            }
            if specifications != "" {
                json.Unmarshal([]byte(specifications), &p.Specifications)
            }
            if sizes != "" {
                json.Unmarshal([]byte(sizes), &p.Sizes)
            }
            
            products = append(products, p)
        }
        
        // Return JSON response
        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(products)
    }
}

func HandleGearCategories(db *sql.DB) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        // Set CORS headers
        w.Header().Set("Access-Control-Allow-Origin", "*")
        w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
        w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
        
        if r.Method == "OPTIONS" {
            return
        }
        
        query := `
            SELECT DISTINCT category, COUNT(*) as count
            FROM gear_products
            GROUP BY category
            ORDER BY category
        `
        
        rows, err := db.Query(query)
        if err != nil {
            http.Error(w, "Database error", http.StatusInternalServerError)
            return
        }
        defer rows.Close()
        
        type CategoryCount struct {
            Category string `json:"category"`
            Count    int    `json:"count"`
        }
        
        var categories []CategoryCount
        
        for rows.Next() {
            var c CategoryCount
            if err := rows.Scan(&c.Category, &c.Count); err == nil {
                categories = append(categories, c)
            }
        }
        
        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(categories)
    }
}

func HandleGearBrands(db *sql.DB) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        // Set CORS headers
        w.Header().Set("Access-Control-Allow-Origin", "*")
        w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
        w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
        
        if r.Method == "OPTIONS" {
            return
        }
        
        query := `
            SELECT DISTINCT brand, COUNT(*) as count
            FROM gear_products
            GROUP BY brand
            ORDER BY count DESC, brand
        `
        
        rows, err := db.Query(query)
        if err != nil {
            http.Error(w, "Database error", http.StatusInternalServerError)
            return
        }
        defer rows.Close()
        
        type BrandCount struct {
            Brand string `json:"brand"`
            Count int    `json:"count"`
        }
        
        var brands []BrandCount
        
        for rows.Next() {
            var b BrandCount
            if err := rows.Scan(&b.Brand, &b.Count); err == nil {
                brands = append(brands, b)
            }
        }
        
        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(brands)
    }
}