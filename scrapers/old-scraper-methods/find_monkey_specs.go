package main

import (
    "database/sql"
    "encoding/json"
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
    
    fmt.Println("🔍 Searching for Monkey-related specs...")
    fmt.Println("=====================================\n")
    
    // Search in specs where model might contain Monkey or specifications might mention it
    rows, err := db.Query(`
        SELECT id, manufacturer, model, specifications 
        FROM motorcycle_specs 
        WHERE LOWER(manufacturer) = 'honda' 
        AND (
            LOWER(model) LIKE '%monkey%' 
            OR specifications::text LIKE '%Monkey%'
            OR specifications::text LIKE '%monkey%'
            OR (model LIKE '%125%' AND specifications::text LIKE '%124%cc%')
        )
        LIMIT 20
    `)
    if err != nil {
        panic(err)
    }
    defer rows.Close()
    
    foundCount := 0
    for rows.Next() {
        var id int
        var manufacturer, model string
        var specifications json.RawMessage
        
        err := rows.Scan(&id, &manufacturer, &model, &specifications)
        if err != nil {
            continue
        }
        
        foundCount++
        fmt.Printf("\n✅ Found potential match!\n")
        fmt.Printf("Spec ID: %d\n", id)
        fmt.Printf("Manufacturer: %s\n", manufacturer)
        fmt.Printf("Model: %s\n", model)
        
        // Parse and show key specs
        var specs map[string]interface{}
        if err := json.Unmarshal(specifications, &specs); err == nil {
            // Show some key specs
            keySpecs := []string{"Engine", "Capacity", "Max Power", "Model", "Name"}
            fmt.Println("Key specifications:")
            for _, key := range keySpecs {
                if val, ok := specs[key]; ok {
                    fmt.Printf("  %s: %v\n", key, val)
                }
            }
            
            // Check if this might be a Monkey
            for k, v := range specs {
                if str, ok := v.(string); ok {
                    if strings.Contains(strings.ToLower(str), "monkey") {
                        fmt.Printf("  🎯 Found 'Monkey' in %s: %s\n", k, str)
                    }
                }
            }
        }
    }
    
    if foundCount == 0 {
        fmt.Println("❌ No Monkey-related specs found in motorcycle_specs table")
        
        // Let's try to find any Honda 125cc bikes that might be similar
        fmt.Println("\n\nSearching for similar Honda 125cc bikes with specs...")
        
        rows2, err := db.Query(`
            SELECT ms.id, ms.manufacturer, ms.model, 
                   ms.specifications->>'Engine' as engine,
                   ms.specifications->>'Capacity' as capacity
            FROM motorcycle_specs ms
            WHERE LOWER(ms.manufacturer) = 'honda'
            AND (
                ms.specifications->>'Capacity' LIKE '%124%'
                OR ms.specifications->>'Capacity' LIKE '%125%'
            )
            ORDER BY ms.id
            LIMIT 10
        `)
        if err != nil {
            panic(err)
        }
        defer rows2.Close()
        
        fmt.Println("\nHonda 125cc bikes with specs:")
        for rows2.Next() {
            var id int
            var manufacturer, model string
            var engine, capacity sql.NullString
            
            err := rows2.Scan(&id, &manufacturer, &model, &engine, &capacity)
            if err != nil {
                continue
            }
            
            fmt.Printf("\nSpec ID: %d - %s %s\n", id, manufacturer, model)
            if capacity.Valid {
                fmt.Printf("  Capacity: %s\n", capacity.String)
            }
            if engine.Valid {
                fmt.Printf("  Engine: %s\n", engine.String)
            }
        }
    }
    
    // Try to manually link if we find a good match
    fmt.Println("\n\n🔧 Attempting to find best match for Honda Monkey 125...")
    
    // Look for specs that might be mislabeled
    var specID int
    var specModel string
    err = db.QueryRow(`
        SELECT id, model 
        FROM motorcycle_specs 
        WHERE LOWER(manufacturer) = 'honda'
        AND specifications->>'Capacity' LIKE '%124%cc%'
        AND (
            model LIKE '%125%'
            OR specifications::text LIKE '%single cylinder%'
        )
        ORDER BY 
            CASE 
                WHEN LOWER(model) LIKE '%monkey%' THEN 0
                WHEN model LIKE '%125%' THEN 1
                ELSE 2
            END
        LIMIT 1
    `).Scan(&specID, &specModel)
    
    if err == nil {
        fmt.Printf("\nFound potential spec match: ID %d - %s\n", specID, specModel)
        fmt.Println("This could potentially be used for Honda Monkey 125")
    }
}