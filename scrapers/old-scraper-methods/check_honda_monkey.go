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
    
    fmt.Println("🏍️  Checking Honda Monkey motorcycles...")
    fmt.Println("=====================================\n")
    
    // Check motorcycles table
    fmt.Println("1. Honda Monkey in motorcycles table:")
    rows, err := db.Query(`
        SELECT id, year, make, model, package, spec_id 
        FROM motorcycles 
        WHERE LOWER(model) LIKE '%monkey%' AND LOWER(make) = 'honda'
        ORDER BY year DESC
    `)
    if err != nil {
        panic(err)
    }
    defer rows.Close()
    
    monkeyCount := 0
    for rows.Next() {
        var id, make, model string
        var year int
        var pkg sql.NullString
        var specID sql.NullInt64
        
        err := rows.Scan(&id, &year, &make, &model, &pkg, &specID)
        if err != nil {
            continue
        }
        
        monkeyCount++
        fmt.Printf("ID: %s\n", id)
        fmt.Printf("Year: %d, Make: %s, Model: %s\n", year, make, model)
        if pkg.Valid {
            fmt.Printf("Package: %s\n", pkg.String)
        }
        if specID.Valid {
            fmt.Printf("✅ HAS SPEC ID: %d\n", specID.Int64)
        } else {
            fmt.Printf("❌ NO SPEC ID\n")
        }
        fmt.Println("---")
    }
    
    if monkeyCount == 0 {
        fmt.Println("❌ No Honda Monkey motorcycles found in motorcycles table")
    }
    
    // Check motorcycle_specs table
    fmt.Println("\n\n2. Checking motorcycle_specs table for Monkey:")
    rows2, err := db.Query(`
        SELECT id, manufacturer, model 
        FROM motorcycle_specs 
        WHERE LOWER(model) LIKE '%monkey%' AND LOWER(manufacturer) = 'honda'
        ORDER BY id
    `)
    if err != nil {
        panic(err)
    }
    defer rows2.Close()
    
    specCount := 0
    for rows2.Next() {
        var id int
        var manufacturer, model string
        
        err := rows2.Scan(&id, &manufacturer, &model)
        if err != nil {
            continue
        }
        
        specCount++
        fmt.Printf("Spec ID: %d\n", id)
        fmt.Printf("Manufacturer: %s, Model: %s\n", manufacturer, model)
        fmt.Println("---")
    }
    
    if specCount == 0 {
        fmt.Println("❌ No Honda Monkey found in motorcycle_specs table")
    }
    
    // Try broader search in specs
    fmt.Println("\n\n3. Broader search in motorcycle_specs for '125' models:")
    rows3, err := db.Query(`
        SELECT id, manufacturer, model 
        FROM motorcycle_specs 
        WHERE LOWER(manufacturer) = 'honda' 
        AND model LIKE '%125%'
        ORDER BY 
            CASE WHEN LOWER(model) LIKE '%monkey%' THEN 0 ELSE 1 END,
            id
        LIMIT 10
    `)
    if err != nil {
        panic(err)
    }
    defer rows3.Close()
    
    for rows3.Next() {
        var id int
        var manufacturer, model string
        
        err := rows3.Scan(&id, &manufacturer, &model)
        if err != nil {
            continue
        }
        
        fmt.Printf("Spec ID: %d - %s %s\n", id, manufacturer, model)
    }
}