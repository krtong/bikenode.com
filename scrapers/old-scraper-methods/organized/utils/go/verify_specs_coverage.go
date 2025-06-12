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
    
    fmt.Println("🏍️  Motorcycle Specs Coverage Report")
    fmt.Println("====================================\n")
    
    // Total motorcycles
    var totalMotorcycles int
    err = db.QueryRow("SELECT COUNT(*) FROM motorcycles").Scan(&totalMotorcycles)
    if err != nil {
        panic(err)
    }
    
    // Motorcycles with specs
    var withSpecs int
    err = db.QueryRow("SELECT COUNT(*) FROM motorcycles WHERE spec_id IS NOT NULL").Scan(&withSpecs)
    if err != nil {
        panic(err)
    }
    
    // Total specs
    var totalSpecs int
    err = db.QueryRow("SELECT COUNT(*) FROM motorcycle_specs").Scan(&totalSpecs)
    if err != nil {
        panic(err)
    }
    
    coverage := float64(withSpecs) / float64(totalMotorcycles) * 100
    
    fmt.Printf("📊 Overall Statistics:\n")
    fmt.Printf("Total Motorcycles: %d\n", totalMotorcycles)
    fmt.Printf("Motorcycles with Specs: %d\n", withSpecs)
    fmt.Printf("Total Spec Records: %d\n", totalSpecs)
    fmt.Printf("Coverage: %.1f%%\n\n", coverage)
    
    // Coverage by top brands
    fmt.Println("📈 Coverage by Brand (Top 20):")
    fmt.Println("Brand                     Total    With Specs   Coverage")
    fmt.Println("--------------------------------------------------------")
    
    rows, err := db.Query(`
        SELECT 
            m.make,
            COUNT(*) as total,
            COUNT(m.spec_id) as with_specs,
            ROUND(COUNT(m.spec_id)::numeric * 100.0 / COUNT(*), 1) as coverage
        FROM motorcycles m
        GROUP BY m.make
        HAVING COUNT(*) > 10
        ORDER BY COUNT(m.spec_id) DESC, COUNT(*) DESC
        LIMIT 20
    `)
    if err != nil {
        panic(err)
    }
    defer rows.Close()
    
    for rows.Next() {
        var make string
        var total, withSpecsCount int
        var coveragePercent float64
        
        err := rows.Scan(&make, &total, &withSpecsCount, &coveragePercent)
        if err != nil {
            continue
        }
        
        fmt.Printf("%-25s %5d    %10d    %6.1f%%\n", make, total, withSpecsCount, coveragePercent)
    }
    
    // Recent motorcycles with specs
    fmt.Println("\n\n🆕 Recent Motorcycles with Specs (2020+):")
    
    rows2, err := db.Query(`
        SELECT m.year, m.make, m.model, m.id, s.id as spec_id
        FROM motorcycles m
        JOIN motorcycle_specs s ON m.spec_id = s.id
        WHERE m.year >= 2020
        ORDER BY m.year DESC, m.make, m.model
        LIMIT 15
    `)
    if err != nil {
        panic(err)
    }
    defer rows2.Close()
    
    for rows2.Next() {
        var year, specID int
        var make, model, id string
        
        err := rows2.Scan(&year, &make, &model, &id, &specID)
        if err != nil {
            continue
        }
        
        fmt.Printf("%d %-20s %-30s (Spec ID: %d)\n", year, make, model, specID)
    }
    
    // Check Honda Monkey specifically
    fmt.Println("\n\n🔍 Honda Monkey Status:")
    
    rows3, err := db.Query(`
        SELECT m.year, m.model, m.id, m.spec_id
        FROM motorcycles m
        WHERE m.make = 'Honda' AND m.model LIKE '%Monkey%'
        ORDER BY m.year DESC
    `)
    if err != nil {
        panic(err)
    }
    defer rows3.Close()
    
    for rows3.Next() {
        var year int
        var model, id string
        var specID sql.NullInt64
        
        err := rows3.Scan(&year, &model, &id, &specID)
        if err != nil {
            continue
        }
        
        specStatus := "❌ No specs"
        if specID.Valid {
            specStatus = fmt.Sprintf("✅ Spec ID: %d", specID.Int64)
        }
        
        fmt.Printf("%d %-20s %s\n", year, model, specStatus)
    }
    
    // Unlinked specs
    var unlinkedSpecs int
    err = db.QueryRow(`
        SELECT COUNT(*)
        FROM motorcycle_specs s
        WHERE NOT EXISTS (
            SELECT 1 FROM motorcycles m WHERE m.spec_id = s.id
        )
    `).Scan(&unlinkedSpecs)
    
    if err == nil && unlinkedSpecs > 0 {
        fmt.Printf("\n\n⚠️  Warning: %d spec records are not linked to any motorcycle\n", unlinkedSpecs)
    }
}