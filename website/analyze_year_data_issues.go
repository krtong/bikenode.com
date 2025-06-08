package main

import (
    "database/sql"
    "fmt"
    "strings"
    _ "github.com/lib/pq"
)

func main() {
    db, err := sql.Open("postgres", "postgres://postgres:@localhost/bikenode?sslmode=disable")
    if err != nil {
        panic(err)
    }
    defer db.Close()
    
    fmt.Println("🔍 Comprehensive Year Data Analysis")
    fmt.Println("===================================\n")
    
    // 1. Check motorcycles table year data types and patterns
    fmt.Println("1. MOTORCYCLES TABLE YEAR ANALYSIS")
    fmt.Println("----------------------------------")
    
    // Check if year column exists and its type
    var yearType string
    err = db.QueryRow(`
        SELECT data_type 
        FROM information_schema.columns 
        WHERE table_name = 'motorcycles' 
        AND column_name = 'year'
    `).Scan(&yearType)
    
    if err != nil {
        fmt.Printf("Error checking year column: %v\n", err)
    } else {
        fmt.Printf("Year column data type: %s\n", yearType)
    }
    
    // Sample some year values
    fmt.Println("\nSample year values from motorcycles table:")
    rows, err := db.Query(`
        SELECT id, year, make, model 
        FROM motorcycles 
        WHERE year IS NOT NULL
        ORDER BY RANDOM() 
        LIMIT 10
    `)
    if err != nil {
        fmt.Printf("Error querying motorcycles: %v\n", err)
    } else {
        defer rows.Close()
        for rows.Next() {
            var id string
            var year int
            var make, model string
            err := rows.Scan(&id, &year, &make, &model)
            if err != nil {
                fmt.Printf("Scan error: %v\n", err)
                continue
            }
            fmt.Printf("  ID: %s, Year: %d, Make: %s, Model: %s\n", id, year, make, model)
        }
    }
    
    // Check year range
    var minYear, maxYear sql.NullInt64
    err = db.QueryRow(`
        SELECT MIN(year), MAX(year) 
        FROM motorcycles 
        WHERE year IS NOT NULL
    `).Scan(&minYear, &maxYear)
    
    if err == nil && minYear.Valid && maxYear.Valid {
        fmt.Printf("\nYear range in motorcycles table: %d to %d\n", minYear.Int64, maxYear.Int64)
    }
    
    // Check for suspicious year values
    fmt.Println("\nChecking for suspicious year values:")
    rows2, err := db.Query(`
        SELECT year, COUNT(*) as count
        FROM motorcycles
        WHERE year IS NOT NULL
        AND (year < 1900 OR year > 2026)
        GROUP BY year
        ORDER BY year
    `)
    if err == nil {
        defer rows2.Close()
        suspicious := false
        for rows2.Next() {
            var year, count int
            rows2.Scan(&year, &count)
            fmt.Printf("  Suspicious year %d: %d motorcycles\n", year, count)
            suspicious = true
        }
        if !suspicious {
            fmt.Println("  No suspicious years found (all between 1900-2026)")
        }
    }
    
    // 2. Check motorcycle_specs table
    fmt.Println("\n\n2. MOTORCYCLE_SPECS TABLE YEAR ANALYSIS")
    fmt.Println("---------------------------------------")
    
    // Check what year-related columns exist
    rows3, err := db.Query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'motorcycle_specs' 
        AND column_name LIKE '%year%'
        ORDER BY column_name
    `)
    if err == nil {
        defer rows3.Close()
        fmt.Println("Year-related columns in motorcycle_specs:")
        for rows3.Next() {
            var colName, dataType string
            rows3.Scan(&colName, &dataType)
            fmt.Printf("  %s: %s\n", colName, dataType)
        }
    }
    
    // Check if there's a year field in JSONB
    fmt.Println("\nChecking JSONB specifications for year data:")
    rows4, err := db.Query(`
        SELECT 
            id,
            manufacturer,
            model,
            specifications->>'year' as year_value,
            specifications->>'model_year' as model_year,
            specifications->>'production_years' as production_years
        FROM motorcycle_specs
        WHERE specifications IS NOT NULL
        AND (
            specifications->>'year' IS NOT NULL OR
            specifications->>'model_year' IS NOT NULL OR
            specifications->>'production_years' IS NOT NULL
        )
        LIMIT 10
    `)
    if err == nil {
        defer rows4.Close()
        count := 0
        for rows4.Next() {
            var id int
            var manufacturer, model string
            var yearValue, modelYear, productionYears sql.NullString
            err := rows4.Scan(&id, &manufacturer, &model, &yearValue, &modelYear, &productionYears)
            if err != nil {
                continue
            }
            count++
            fmt.Printf("\n  Spec ID: %d, %s %s\n", id, manufacturer, model)
            if yearValue.Valid && yearValue.String != "" {
                fmt.Printf("    year: %s\n", yearValue.String)
            }
            if modelYear.Valid && modelYear.String != "" {
                fmt.Printf("    model_year: %s\n", modelYear.String)
            }
            if productionYears.Valid && productionYears.String != "" {
                fmt.Printf("    production_years: %s\n", productionYears.String)
            }
        }
        if count == 0 {
            fmt.Println("  No year data found in JSONB specifications")
        }
    }
    
    // 3. Analyze year range patterns
    fmt.Println("\n\n3. YEAR RANGE PATTERNS ANALYSIS")
    fmt.Println("--------------------------------")
    
    // Look for entries that might have year ranges in text fields
    fmt.Println("Checking for year ranges in model names:")
    rows5, err := db.Query(`
        SELECT DISTINCT model
        FROM motorcycles
        WHERE model ~ '\d{4}-\d{4}' OR model ~ '\d{4} - \d{4}'
        LIMIT 10
    `)
    if err == nil {
        defer rows5.Close()
        for rows5.Next() {
            var model string
            rows5.Scan(&model)
            fmt.Printf("  Model with year range: %s\n", model)
        }
    }
    
    // 4. Check spec linking patterns
    fmt.Println("\n\n4. SPEC LINKING ANALYSIS")
    fmt.Println("------------------------")
    
    // How many motorcycles share the same spec_id?
    rows6, err := db.Query(`
        WITH spec_sharing AS (
            SELECT 
                spec_id,
                COUNT(*) as motorcycle_count,
                MIN(year) as min_year,
                MAX(year) as max_year,
                ARRAY_AGG(DISTINCT year ORDER BY year) as years,
                ARRAY_AGG(DISTINCT make || ' ' || model) as models
            FROM motorcycles
            WHERE spec_id IS NOT NULL
            GROUP BY spec_id
            HAVING COUNT(*) > 1
        )
        SELECT * FROM spec_sharing
        WHERE max_year - min_year > 0
        ORDER BY motorcycle_count DESC
        LIMIT 10
    `)
    if err == nil {
        defer rows6.Close()
        fmt.Println("Specs shared across multiple years:")
        for rows6.Next() {
            var specID, count, minYear, maxYear int
            var years []sql.NullInt64
            var models []sql.NullString
            
            err := rows6.Scan(&specID, &count, &minYear, &maxYear, &years, &models)
            if err != nil {
                continue
            }
            
            fmt.Printf("\n  Spec ID %d: %d motorcycles, years %d-%d\n", specID, count, minYear, maxYear)
            
            // Show first few models
            modelCount := 0
            for _, m := range models {
                if m.Valid && modelCount < 3 {
                    fmt.Printf("    - %s\n", m.String)
                    modelCount++
                }
            }
            if len(models) > 3 {
                fmt.Printf("    ... and %d more\n", len(models)-3)
            }
        }
    }
    
    // 5. Recommendations
    fmt.Println("\n\n5. DATA QUALITY RECOMMENDATIONS")
    fmt.Println("-------------------------------")
    
    // Count motorcycles without specs by year
    rows7, err := db.Query(`
        SELECT year, COUNT(*) as count
        FROM motorcycles
        WHERE spec_id IS NULL
        AND year >= 2020
        GROUP BY year
        ORDER BY year DESC
    `)
    if err == nil {
        defer rows7.Close()
        fmt.Println("\nRecent motorcycles without specs:")
        for rows7.Next() {
            var year, count int
            rows7.Scan(&year, &count)
            fmt.Printf("  %d: %d motorcycles\n", year, count)
        }
    }
    
    // Check if we need to parse year ranges
    fmt.Println("\n\nPOTENTIAL YEAR RANGE ISSUES:")
    
    // Look in specifications JSONB for year range patterns
    rows8, err := db.Query(`
        SELECT 
            id,
            manufacturer,
            model,
            specifications
        FROM motorcycle_specs
        WHERE specifications::text ~ '\d{4}-\d{4}'
        LIMIT 5
    `)
    if err == nil {
        defer rows8.Close()
        for rows8.Next() {
            var id int
            var manufacturer, model string
            var specs sql.NullString
            
            err := rows8.Scan(&id, &manufacturer, &model, &specs)
            if err != nil {
                continue
            }
            
            fmt.Printf("\n  Spec ID %d: %s %s\n", id, manufacturer, model)
            if specs.Valid {
                // Try to find year ranges in the JSON
                if strings.Contains(specs.String, "-") {
                    fmt.Printf("    Contains potential year range in specifications\n")
                }
            }
        }
    }
}