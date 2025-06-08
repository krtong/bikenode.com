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
    
    fmt.Println("🏍️  Finding motorcycles with linked specifications...")
    fmt.Println("================================================\n")
    
    rows, err := db.Query(`
        SELECT m.id, m.year, m.make, m.model, m.spec_id, 
               s.specifications->>'Engine' as engine,
               s.specifications->>'Capacity' as capacity,
               s.specifications->>'Max Power' as power
        FROM motorcycles m
        JOIN motorcycle_specs s ON m.spec_id = s.id
        WHERE s.specifications->>'Engine' IS NOT NULL
        ORDER BY m.make, m.model
        LIMIT 10
    `)
    if err != nil {
        panic(err)
    }
    defer rows.Close()
    
    fmt.Println("Motorcycles with specifications:")
    for rows.Next() {
        var id, make, model string
        var year, specID int
        var engine, capacity, power sql.NullString
        
        err := rows.Scan(&id, &year, &make, &model, &specID, &engine, &capacity, &power)
        if err != nil {
            continue
        }
        
        fmt.Printf("\nID: %s\n", id)
        fmt.Printf("Bike: %d %s %s\n", year, make, model)
        fmt.Printf("Spec ID: %d\n", specID)
        if engine.Valid {
            fmt.Printf("Engine: %s\n", engine.String)
        }
        if capacity.Valid {
            fmt.Printf("Capacity: %s\n", capacity.String)
        }
        if power.Valid {
            fmt.Printf("Power: %s\n", power.String)
        }
        fmt.Println("---")
    }
    
    // Count total
    var total int
    db.QueryRow("SELECT COUNT(*) FROM motorcycles WHERE spec_id IS NOT NULL").Scan(&total)
    fmt.Printf("\nTotal motorcycles with specs: %d\n", total)
}