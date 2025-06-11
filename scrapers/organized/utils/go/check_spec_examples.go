package main

import (
    "database/sql"
    "fmt"
    _ "github.com/lib/pq"
)

func main() {
    db, _ := sql.Open("postgres", "postgres://postgres:@localhost/bikenode?sslmode=disable")
    defer db.Close()
    
    fmt.Println("🏍️  Motorcycles WITH Specifications Examples:")
    fmt.Println("===========================================\n")
    
    // Show some bikes that have specs
    rows, _ := db.Query(`
        SELECT m.year, m.make, m.model, 
               s.specifications->>'Engine' as engine, 
               s.specifications->>'Capacity' as capacity,
               s.specifications->>'Max Power' as power
        FROM motorcycles m
        JOIN motorcycle_specs s ON m.spec_id = s.id
        WHERE s.specifications->>'Engine' IS NOT NULL
        ORDER BY m.make, m.model, m.year DESC
        LIMIT 20
    `)
    defer rows.Close()
    
    for rows.Next() {
        var year int
        var make, model string
        var engine, capacity, power sql.NullString
        rows.Scan(&year, &make, &model, &engine, &capacity, &power)
        
        fmt.Printf("✅ %d %s %s\n", year, make, model)
        if engine.Valid && engine.String != "" {
            fmt.Printf("   Engine: %s\n", engine.String)
        }
        if capacity.Valid && capacity.String != "" {
            fmt.Printf("   Capacity: %s\n", capacity.String)
        }
        if power.Valid && power.String != "" {
            fmt.Printf("   Power: %s\n", power.String)
        }
        fmt.Println()
    }
    
    // Show summary by year range
    fmt.Println("\n📊 Spec Coverage by Year Range:")
    rows2, _ := db.Query(`
        SELECT 
            CASE 
                WHEN m.year < 2000 THEN 'Pre-2000'
                WHEN m.year BETWEEN 2000 AND 2009 THEN '2000-2009'
                WHEN m.year BETWEEN 2010 AND 2019 THEN '2010-2019'
                ELSE '2020+'
            END as year_range,
            COUNT(*) as total,
            COUNT(m.spec_id) as with_specs,
            ROUND(100.0 * COUNT(m.spec_id) / COUNT(*), 1) as percentage
        FROM motorcycles m
        GROUP BY year_range
        ORDER BY year_range
    `)
    defer rows2.Close()
    
    for rows2.Next() {
        var yearRange string
        var total, withSpecs int
        var percentage float64
        rows2.Scan(&yearRange, &total, &withSpecs, &percentage)
        fmt.Printf("  %s: %d/%d have specs (%.1f%%)\n", yearRange, withSpecs, total, percentage)
    }
}