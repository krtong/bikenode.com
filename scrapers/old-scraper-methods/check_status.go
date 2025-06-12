package main

import (
    "database/sql"
    "encoding/json"
    "fmt"
    "log"
    _ "github.com/lib/pq"
)

func main() {
    db, err := sql.Open("postgres", "postgres://postgres:@localhost/bikenode?sslmode=disable")
    if err != nil {
        log.Fatal(err)
    }
    defer db.Close()
    
    // Total count
    var count int
    db.QueryRow("SELECT COUNT(*) FROM motorcycle_specs").Scan(&count)
    fmt.Printf("📊 Total motorcycles: %d\n", count)
    
    // Top manufacturers
    fmt.Println("\n🏭 Top 5 manufacturers:")
    rows, _ := db.Query("SELECT manufacturer, COUNT(*) FROM motorcycle_specs GROUP BY manufacturer ORDER BY COUNT(*) DESC LIMIT 5")
    defer rows.Close()
    for rows.Next() {
        var mfg string
        var cnt int
        rows.Scan(&mfg, &cnt)
        fmt.Printf("  %s: %d models\n", mfg, cnt)
    }
    
    // Sample JSONB data to see all spec fields
    fmt.Println("\n🔍 Checking JSONB spec fields for one motorcycle:")
    var allSpecs string
    err = db.QueryRow("SELECT all_specifications FROM motorcycle_specs WHERE all_specifications IS NOT NULL LIMIT 1").Scan(&allSpecs)
    if err == nil {
        var specs map[string]interface{}
        json.Unmarshal([]byte(allSpecs), &specs)
        fmt.Printf("  Total spec fields in this motorcycle: %d\n", len(specs))
        
        // Show first 10 fields
        fmt.Println("  Sample fields:")
        count := 0
        for field := range specs {
            if count < 10 {
                fmt.Printf("    - %s\n", field)
                count++
            }
        }
    }
    
    // Check structured columns
    fmt.Println("\n📋 Checking structured data:")
    var engine, capacity, maxPower string
    db.QueryRow("SELECT engine, capacity, max_power FROM motorcycle_specs WHERE engine IS NOT NULL LIMIT 1").Scan(&engine, &capacity, &maxPower)
    fmt.Printf("  Sample Engine: %s\n", engine)
    fmt.Printf("  Sample Capacity: %s\n", capacity)
    fmt.Printf("  Sample Max Power: %s\n", maxPower)
}