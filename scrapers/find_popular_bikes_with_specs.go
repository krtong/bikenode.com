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
    
    fmt.Println("🏍️  Finding popular brand motorcycles with specifications...")
    fmt.Println("========================================================\n")
    
    // Popular brands to check
    brands := []string{"Honda", "Yamaha", "Kawasaki", "Suzuki", "Harley-Davidson", "BMW", "Ducati", "Triumph"}
    
    for _, brand := range brands {
        fmt.Printf("\n🔍 %s motorcycles with specs:\n", brand)
        
        rows, err := db.Query(`
            SELECT m.id, m.year, m.make, m.model, m.spec_id, 
                   s.specifications->>'Engine' as engine,
                   s.specifications->>'Capacity' as capacity,
                   s.specifications->>'Max Power' as power
            FROM motorcycles m
            JOIN motorcycle_specs s ON m.spec_id = s.id
            WHERE m.make = $1
            ORDER BY m.year DESC, m.model
            LIMIT 5
        `, brand)
        
        if err != nil {
            fmt.Printf("Error querying %s: %v\n", brand, err)
            continue
        }
        defer rows.Close()
        
        count := 0
        for rows.Next() {
            var id, make, model string
            var year, specID int
            var engine, capacity, power sql.NullString
            
            err := rows.Scan(&id, &year, &make, &model, &specID, &engine, &capacity, &power)
            if err != nil {
                continue
            }
            
            count++
            fmt.Printf("\n   ID: %s\n", id)
            fmt.Printf("   Bike: %d %s %s\n", year, make, model)
            fmt.Printf("   Spec ID: %d\n", specID)
            if engine.Valid {
                fmt.Printf("   Engine: %s\n", engine.String)
            }
            if capacity.Valid {
                fmt.Printf("   Capacity: %s\n", capacity.String)
            }
            if power.Valid {
                fmt.Printf("   Power: %s\n", power.String)
            }
        }
        
        if count == 0 {
            fmt.Printf("   ❌ No motorcycles with specs found\n")
        }
    }
    
    // Count total by brand
    fmt.Println("\n\n📊 Summary of motorcycles with specs by brand:")
    fmt.Println("=============================================")
    
    for _, brand := range brands {
        var count int
        db.QueryRow("SELECT COUNT(*) FROM motorcycles WHERE spec_id IS NOT NULL AND make = $1", brand).Scan(&count)
        if count > 0 {
            fmt.Printf("   %-20s: %d motorcycles\n", brand, count)
        }
    }
}