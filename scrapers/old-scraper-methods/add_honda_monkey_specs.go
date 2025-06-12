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
    
    fmt.Println("🏍️  Adding Honda Monkey 125 specifications...")
    fmt.Println("==========================================\n")
    
    // Honda Monkey 125 specifications
    specs := map[string]interface{}{
        "Engine": "Single cylinder, 4-stroke, air-cooled, SOHC",
        "Capacity": "124.9 cc / 7.6 cu in",
        "Bore x Stroke": "52.4 x 57.9 mm",
        "Compression Ratio": "10.0:1",
        "Max Power": "9.4 hp (6.9 kW) @ 7000 rpm",
        "Max Torque": "8.3 Ft/Lbs (11 Nm) @ 5250 rpm",
        "Fuel System": "Fuel Injection, PGM-FI",
        "Ignition": "Full transistorized",
        "Transmission": "4-Speed",
        "Final Drive": "Chain",
        "Clutch": "Wet multi-plate, centrifugal type",
        "Frame": "Steel backbone",
        "Front Suspension": "31mm inverted fork, 3.9 in travel",
        "Rear Suspension": "Twin shock, 4.1 in travel",
        "Front Brakes": "Single disc, 220mm, 2-piston caliper",
        "Rear Brakes": "Single disc, 190mm, single piston caliper",
        "Front Tyre": "120/80-12",
        "Rear Tyre": "130/80-12",
        "Wheelbase": "1155 mm / 45.5 in",
        "Seat Height": "775 mm / 30.5 in",
        "Fuel Capacity": "5.6 liters / 1.5 US gallons",
        "Wet Weight": "107 kg / 236 lbs",
        "Top Speed": "95 km/h / 59 mph",
        "Fuel Consumption": "67 km/l / 157 mpg",
        "CO2 Emissions": "35 g/km",
        "Emission Standard": "Euro 5",
        "Color Options": "Pearl Nebula Red, Banana Yellow, Pearl Glittering Blue",
    }
    
    // Convert to JSON
    specsJSON, err := json.Marshal(specs)
    if err != nil {
        log.Fatal("Error marshaling specs:", err)
    }
    
    // Insert the specification
    var specID int
    err = db.QueryRow(`
        INSERT INTO motorcycle_specs (manufacturer, model, specifications)
        VALUES ($1, $2, $3::jsonb)
        RETURNING id
    `, "Honda", "Monkey 125", specsJSON).Scan(&specID)
    
    if err != nil {
        log.Fatal("Error inserting spec:", err)
    }
    
    fmt.Printf("✅ Created spec with ID: %d\n\n", specID)
    
    // Update Honda Monkey motorcycles to link to this spec
    result, err := db.Exec(`
        UPDATE motorcycles 
        SET spec_id = $1
        WHERE make = 'Honda' 
        AND model IN ('Monkey', 'Monkey 125', 'Monkey ABS')
        AND year BETWEEN 2019 AND 2025
        AND spec_id IS NULL
    `, specID)
    
    if err != nil {
        log.Fatal("Error updating motorcycles:", err)
    }
    
    rowsAffected, _ := result.RowsAffected()
    fmt.Printf("✅ Updated %d Honda Monkey motorcycles with spec ID %d\n\n", rowsAffected, specID)
    
    // Show the updated motorcycles
    fmt.Println("Updated motorcycles:")
    fmt.Println("===================")
    
    rows, err := db.Query(`
        SELECT m.id, m.year, m.make, m.model, m.spec_id
        FROM motorcycles m
        WHERE m.make = 'Honda' 
        AND m.model LIKE '%Monkey%'
        AND m.spec_id IS NOT NULL
        ORDER BY m.year DESC
    `)
    if err != nil {
        log.Fatal("Error querying updated motorcycles:", err)
    }
    defer rows.Close()
    
    for rows.Next() {
        var id, make, model string
        var year, specID int
        
        err := rows.Scan(&id, &year, &make, &model, &specID)
        if err != nil {
            continue
        }
        
        fmt.Printf("ID: %s\n", id)
        fmt.Printf("%d %s %s - Spec ID: %d\n", year, make, model, specID)
        fmt.Println("---")
    }
    
    fmt.Println("\n🎉 Honda Monkey specs have been added successfully!")
    fmt.Println("You can now test the add-bike page with Honda Monkey motorcycles.")
}