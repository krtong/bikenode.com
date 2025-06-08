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

    // Query to list all tables
    query := `
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        ORDER BY tablename
    `

    rows, err := db.Query(query)
    if err != nil {
        log.Fatal("Failed to query tables:", err)
    }
    defer rows.Close()

    fmt.Println("Tables in bikenode database:")
    fmt.Println("============================")
    
    for rows.Next() {
        var tableName string
        if err := rows.Scan(&tableName); err != nil {
            log.Printf("Error scanning row: %v", err)
            continue
        }
        fmt.Println(tableName)
    }

    // Check ALL tables with row counts to find the real ones
    fmt.Println("\nChecking all tables with row counts:")
    fmt.Println("=====================================")
    
    // Get all tables with counts
    tableQuery := `
        SELECT 
            t.tablename,
            (SELECT COUNT(*) FROM ` + "`\" || t.tablename || \"`" + `) as row_count
        FROM pg_tables t
        WHERE t.schemaname = 'public'
        ORDER BY row_count DESC, t.tablename
    `
    
    rows2, err := db.Query(tableQuery)
    if err != nil {
        // Fallback to checking each table individually
        fmt.Println("Checking tables individually...")
        checkTables := []string{"bikes_data_2", "cleaned_bikes_data", "bike_raw_data", "bicycles", "bikes", "manufacturers"}
        for _, table := range checkTables {
        var exists bool
        err := db.QueryRow("SELECT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = $1)", table).Scan(&exists)
        if err != nil {
            log.Printf("Error checking table %s: %v", table, err)
            continue
        }
        if exists {
            fmt.Printf("✓ %s table exists\n", table)
            
            // Get row count
            var count int
            err := db.QueryRow(fmt.Sprintf("SELECT COUNT(*) FROM %s", table)).Scan(&count)
            if err == nil {
                fmt.Printf("  - %d rows\n", count)
            }
        } else {
            fmt.Printf("✗ %s table does not exist\n", table)
        }
    }
}
}