package main

import (
    "database/sql"
    "fmt"
    _ "github.com/lib/pq"
)

func main() {
    db, err := sql.Open("postgres", "postgres://postgres:@localhost/bikenode?sslmode=disable")
    if err != nil {
        panic(err)
    }
    defer db.Close()
    
    fmt.Println("🏍️  Testing Spec Coverage After Linking")
    fmt.Println("=====================================\n")
    
    // Test popular models to see their spec coverage
    testModels := []struct {
        make  string
        model string
    }{
        {"Honda", "Monkey%"},
        {"Yamaha", "YZF-R1%"},
        {"Kawasaki", "Ninja%"},
        {"Suzuki", "GSX-R%"},
        {"Harley-Davidson", "Sportster%"},
    }
    
    for _, tm := range testModels {
        fmt.Printf("📊 %s %s Coverage:\n", tm.make, tm.model)
        fmt.Println("----------------------------------------")
        
        rows, err := db.Query(`
            SELECT 
                m.year,
                m.model,
                m.spec_id,
                s.model as spec_model,
                s.manufacturer || ' ' || s.model as full_spec_name
            FROM motorcycles m
            LEFT JOIN motorcycle_specs s ON m.spec_id = s.id
            WHERE m.make = $1 AND m.model LIKE $2
            ORDER BY m.year DESC
            LIMIT 15
        `, tm.make, tm.model)
        
        if err != nil {
            fmt.Printf("Error: %v\n", err)
            continue
        }
        defer rows.Close()
        
        hasSpecs := 0
        noSpecs := 0
        
        for rows.Next() {
            var year int
            var model string
            var specID sql.NullInt64
            var specModel, fullSpecName sql.NullString
            
            err := rows.Scan(&year, &model, &specID, &specModel, &fullSpecName)
            if err != nil {
                continue
            }
            
            if specID.Valid {
                fmt.Printf("✅ %d %-25s → Spec %d (%s)\n", year, model, specID.Int64, fullSpecName.String)
                hasSpecs++
            } else {
                fmt.Printf("❌ %d %-25s → No specs\n", year, model)
                noSpecs++
            }
        }
        
        if hasSpecs > 0 || noSpecs > 0 {
            coverage := float64(hasSpecs) / float64(hasSpecs + noSpecs) * 100
            fmt.Printf("\nCoverage: %d/%d (%.1f%%)\n", hasSpecs, hasSpecs+noSpecs, coverage)
        }
        
        fmt.Println()
    }
    
    // Overall statistics
    fmt.Println("\n📈 Overall Statistics:")
    fmt.Println("=====================")
    
    var stats struct {
        totalMotorcycles int
        withSpecs       int
        uniqueSpecs     int
        avgReuse        float64
    }
    
    err = db.QueryRow(`
        SELECT 
            COUNT(*) as total,
            COUNT(spec_id) as with_specs,
            COUNT(DISTINCT spec_id) as unique_specs,
            AVG(CASE WHEN spec_id IS NOT NULL THEN 1.0 ELSE NULL END) as coverage_ratio
        FROM motorcycles
    `).Scan(&stats.totalMotorcycles, &stats.withSpecs, &stats.uniqueSpecs, &stats.avgReuse)
    
    if err == nil {
        coverage := float64(stats.withSpecs) / float64(stats.totalMotorcycles) * 100
        avgMotorcyclesPerSpec := float64(stats.withSpecs) / float64(stats.uniqueSpecs)
        
        fmt.Printf("\nTotal motorcycles: %d\n", stats.totalMotorcycles)
        fmt.Printf("Motorcycles with specs: %d (%.1f%%)\n", stats.withSpecs, coverage)
        fmt.Printf("Unique spec records: %d\n", stats.uniqueSpecs)
        fmt.Printf("Average motorcycles per spec: %.1f\n", avgMotorcyclesPerSpec)
    }
    
    // Test API endpoint for specific motorcycles
    fmt.Println("\n\n🔍 Testing API Endpoints:")
    fmt.Println("========================")
    
    testCases := []struct {
        year  int
        make  string
        model string
    }{
        {2025, "Honda", "Monkey"},
        {2022, "Honda", "Monkey 125"},
        {2015, "Honda", "Monkey"},
        {2024, "Yamaha", "YZF-R1"},
        {2023, "Kawasaki", "Ninja 650"},
    }
    
    for _, tc := range testCases {
        var id string
        var specID sql.NullInt64
        
        err := db.QueryRow(`
            SELECT id, spec_id 
            FROM motorcycles 
            WHERE year = $1 AND make = $2 AND model = $3
            LIMIT 1
        `, tc.year, tc.make, tc.model).Scan(&id, &specID)
        
        if err == sql.ErrNoRows {
            fmt.Printf("\n%d %s %s: Not in database\n", tc.year, tc.make, tc.model)
        } else if err != nil {
            fmt.Printf("\n%d %s %s: Error - %v\n", tc.year, tc.make, tc.model, err)
        } else {
            if specID.Valid {
                fmt.Printf("\n%d %s %s:\n", tc.year, tc.make, tc.model)
                fmt.Printf("  ID: %s\n", id)
                fmt.Printf("  Spec ID: %d ✅\n", specID.Int64)
                fmt.Printf("  API URL: http://localhost:8080/api/motorcycles/%s/specs\n", id)
            } else {
                fmt.Printf("\n%d %s %s:\n", tc.year, tc.make, tc.model)
                fmt.Printf("  ID: %s\n", id)
                fmt.Printf("  Spec ID: None ❌\n")
            }
        }
    }
}