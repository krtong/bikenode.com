package main

import (
    "database/sql"
    "fmt"
    "log"
    "os"
    
    "github.com/joho/godotenv"
    _ "github.com/lib/pq"
)

func main() {
    // Load .env file
    if err := godotenv.Load(); err != nil {
        log.Println("No .env file found")
    }

    // Get database URL
    dbURL := os.Getenv("DATABASE_URL")
    if dbURL == "" {
        dbURL = "postgres://postgres:postgres@localhost/bikenode?sslmode=disable"
    }

    // Connect to database
    db, err := sql.Open("postgres", dbURL)
    if err != nil {
        log.Fatal("Failed to connect to database:", err)
    }
    defer db.Close()

    fmt.Println("Finding tables with >100 rows (real data):")
    fmt.Println("==========================================")
    
    // Check specific tables that might have real bicycle data
    tables := []string{
        "bikes_data_2",
        "cleaned_bikes_data", 
        "bike_raw_data",
        "bicycles",
        "bikes",
        "bikes_data",
        "bikes_backup",
        "bikes_full_backup",
        "bicycle_brands",
    }
    
    for _, table := range tables {
        var count int
        query := fmt.Sprintf("SELECT COUNT(*) FROM %s", table)
        err := db.QueryRow(query).Scan(&count)
        if err != nil {
            fmt.Printf("✗ %s - error: %v\n", table, err)
        } else {
            if count > 100 {
                fmt.Printf("✓ %s - %d rows (REAL DATA)\n", table, count)
                
                // Show sample columns
                colQuery := fmt.Sprintf(`
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = '%s' 
                    LIMIT 5
                `, table)
                rows, err := db.Query(colQuery)
                if err == nil {
                    fmt.Print("  Columns: ")
                    cols := []string{}
                    for rows.Next() {
                        var col string
                        rows.Scan(&col)
                        cols = append(cols, col)
                    }
                    fmt.Printf("%v\n", cols)
                    rows.Close()
                }
            } else {
                fmt.Printf("- %s - %d rows (test data)\n", table, count)
            }
        }
    }
}