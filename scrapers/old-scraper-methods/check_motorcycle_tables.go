package main

import (
    "database/sql"
    "fmt"
    "log"
    "strings"
    
    _ "github.com/lib/pq"
)

func main() {
    // Connect to PostgreSQL
    connStr := "host=localhost port=5432 dbname=bikenode sslmode=disable"
    db, err := sql.Open("postgres", connStr)
    if err != nil {
        log.Fatal("Failed to connect to database:", err)
    }
    defer db.Close()
    
    fmt.Println("Connected to PostgreSQL database")
    
    // Query for motorcycle-related tables
    query := `
        SELECT table_name, column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = 'public' 
        AND table_name LIKE '%motorcycle%'
        ORDER BY table_name, ordinal_position
    `
    
    rows, err := db.Query(query)
    if err != nil {
        log.Fatal("Query failed:", err)
    }
    defer rows.Close()
    
    currentTable := ""
    for rows.Next() {
        var tableName, columnName, dataType string
        err := rows.Scan(&tableName, &columnName, &dataType)
        if err != nil {
            log.Printf("Row scan error: %v", err)
            continue
        }
        
        if tableName != currentTable {
            fmt.Printf("\n\nTable: %s\n", tableName)
            fmt.Println("=" + strings.Repeat("=", len(tableName)+7))
            currentTable = tableName
        }
        
        fmt.Printf("  %-30s %s\n", columnName, dataType)
    }
    
    // Also check for any specs tables
    fmt.Println("\n\nChecking for spec-related tables:")
    query2 := `
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public' 
        AND (table_name LIKE '%spec%' OR table_name LIKE '%bike%')
        ORDER BY table_name
    `
    
    rows2, err := db.Query(query2)
    if err != nil {
        log.Fatal("Query failed:", err)
    }
    defer rows2.Close()
    
    for rows2.Next() {
        var tableName string
        err := rows2.Scan(&tableName)
        if err != nil {
            continue
        }
        fmt.Printf("- %s\n", tableName)
    }
}