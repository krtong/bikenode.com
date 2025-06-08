package main

import (
    "database/sql"
    "encoding/json"
    "fmt"
    "log"
    "os"
    
    "github.com/joho/godotenv"
    _ "github.com/lib/pq"
)

func main() {
    godotenv.Load()
    dbURL := os.Getenv("DATABASE_URL")
    if dbURL == "" {
        dbURL = "postgres://postgres:postgres@localhost/bikenode?sslmode=disable"
    }
    
    db, err := sql.Open("postgres", dbURL)
    if err != nil {
        log.Fatal(err)
    }
    
    // Check bikes_data_2 structure
    fmt.Println("Sample from bikes_data_2:")
    
    var keyid int
    var extractedData json.RawMessage
    
    err = db.QueryRow("SELECT keyid, extracted_data FROM bikes_data_2 WHERE extracted_data IS NOT NULL LIMIT 1").Scan(&keyid, &extractedData)
    if err != nil {
        log.Fatal(err)
    }
    
    var data map[string]interface{}
    json.Unmarshal(extractedData, &data)
    
    fmt.Printf("KeyID: %d\n", keyid)
    fmt.Printf("First few fields:\n")
    for k, v := range data {
        fmt.Printf("  %s: %v\n", k, v)
        if len(fmt.Sprintf("%v", v)) > 50 {
            break
        }
    }
    
    // Get unique manufacturers
    fmt.Println("\nGetting unique manufacturers from bikes_data_2...")
    rows, err := db.Query(`
        SELECT DISTINCT extracted_data->>'manufacturer' as manufacturer
        FROM bikes_data_2 
        WHERE extracted_data->>'manufacturer' IS NOT NULL
        ORDER BY manufacturer
        LIMIT 20
    `)
    if err != nil {
        log.Fatal(err)
    }
    
    fmt.Println("Sample manufacturers:")
    count := 0
    for rows.Next() {
        var mfr string
        rows.Scan(&mfr)
        fmt.Printf("- %s\n", mfr)
        count++
    }
    
    // Count total manufacturers
    var total int
    db.QueryRow(`
        SELECT COUNT(DISTINCT extracted_data->>'manufacturer')
        FROM bikes_data_2 
        WHERE extracted_data->>'manufacturer' IS NOT NULL
    `).Scan(&total)
    
    fmt.Printf("\nTotal unique manufacturers in bikes_data_2: %d\n", total)
}