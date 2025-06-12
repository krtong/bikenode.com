package main

import (
    "database/sql"
    "encoding/json"
    "fmt"
    "log"
    "regexp"
    "sort"
    "strings"
    
    _ "github.com/lib/pq"
)

type YearRangeExample struct {
    SpecID      int
    MakeModel   string
    FieldName   string
    FieldValue  string
    Format      string
}

func main() {
    // Connect to PostgreSQL
    connStr := "host=localhost port=5432 dbname=bikenode sslmode=disable"
    db, err := sql.Open("postgres", connStr)
    if err != nil {
        log.Fatal("Failed to connect to database:", err)
    }
    defer db.Close()
    
    fmt.Println("Connected to PostgreSQL database")
    
    // Query for all JSONB specifications
    query := `
        SELECT 
            id,
            manufacturer as make,
            model,
            specifications
        FROM motorcycle_specs
        WHERE specifications IS NOT NULL
        LIMIT 5000
    `
    
    rows, err := db.Query(query)
    if err != nil {
        log.Fatal("Query failed:", err)
    }
    defer rows.Close()
    
    examples := []YearRangeExample{}
    yearFields := []string{"Year", "Production", "Production period", "Years", "Model year", "Production years"}
    
    // Regex patterns for year ranges
    patterns := map[string]*regexp.Regexp{
        "YYYY-YYYY":     regexp.MustCompile(`^\d{4}\s*[-–—]\s*\d{4}$`),
        "YYYY-present":  regexp.MustCompile(`^\d{4}\s*[-–—]\s*(?:present|Present|PRESENT|current|Current|now|Now)$`),
        "YYYY-":         regexp.MustCompile(`^\d{4}\s*[-–—]\s*$`),
        "YYYY, YYYY":    regexp.MustCompile(`^\d{4}\s*,\s*\d{4}$`),
        "YYYY to YYYY":  regexp.MustCompile(`^\d{4}\s+(?:to|TO|To)\s+\d{4}$`),
        "Since YYYY":    regexp.MustCompile(`^(?:Since|since|SINCE|From|from|FROM)\s+\d{4}$`),
        "YYYY onwards":  regexp.MustCompile(`^\d{4}\s+(?:onwards|onward|Onwards|Onward|ONWARDS|ONWARD)$`),
        "YYYY+":         regexp.MustCompile(`^\d{4}\+$`),
        "YY-YY":         regexp.MustCompile(`^\d{2}\s*[-–—]\s*\d{2}$`),
        "Multi-year":    regexp.MustCompile(`\d{4}.*\d{4}`), // Any string with multiple years
    }
    
    rowCount := 0
    for rows.Next() {
        var id int
        var make, model string
        var specsJSON sql.NullString
        
        err := rows.Scan(&id, &make, &model, &specsJSON)
        if err != nil {
            log.Printf("Row scan error: %v", err)
            continue
        }
        
        rowCount++
        
        if !specsJSON.Valid {
            continue
        }
        
        // Parse JSONB specifications
        var specs map[string]interface{}
        err = json.Unmarshal([]byte(specsJSON.String), &specs)
        if err != nil {
            log.Printf("JSON unmarshal error for id %d: %v", id, err)
            continue
        }
        
        makeModel := fmt.Sprintf("%s %s", make, model)
        
        // Check each year-related field
        for _, field := range yearFields {
            if value, exists := specs[field]; exists {
                strValue := fmt.Sprintf("%v", value)
                strValue = strings.TrimSpace(strValue)
                
                if strValue == "" || strValue == "null" {
                    continue
                }
                
                // Check against patterns
                for format, pattern := range patterns {
                    if pattern.MatchString(strValue) {
                        examples = append(examples, YearRangeExample{
                            SpecID:     id,
                            MakeModel:  makeModel,
                            FieldName:  field,
                            FieldValue: strValue,
                            Format:     format,
                        })
                        break // Only match first pattern
                    }
                }
            }
        }
    }
    
    fmt.Printf("\nProcessed %d rows\n", rowCount)
    fmt.Printf("Found %d year range examples\n\n", len(examples))
    
    // Group by format
    formatGroups := make(map[string][]YearRangeExample)
    for _, ex := range examples {
        formatGroups[ex.Format] = append(formatGroups[ex.Format], ex)
    }
    
    // Sort formats by frequency
    formats := []string{}
    for format := range formatGroups {
        formats = append(formats, format)
    }
    sort.Slice(formats, func(i, j int) bool {
        return len(formatGroups[formats[i]]) > len(formatGroups[formats[j]])
    })
    
    // Display examples grouped by format
    for _, format := range formats {
        examples := formatGroups[format]
        fmt.Printf("\n%s FORMAT: %s (Found %d examples)\n", strings.Repeat("=", 20), format, len(examples))
        fmt.Println(strings.Repeat("=", 60))
        
        // Show up to 10 examples per format
        count := 10
        if len(examples) < count {
            count = len(examples)
        }
        
        for i := 0; i < count; i++ {
            ex := examples[i]
            fmt.Printf("ID: %d | %s | Field: %s | Value: '%s'\n", 
                ex.SpecID, ex.MakeModel, ex.FieldName, ex.FieldValue)
        }
    }
    
    // Also show unique field values that don't match any pattern
    fmt.Printf("\n%s UNMATCHED YEAR VALUES %s\n", strings.Repeat("=", 20), strings.Repeat("=", 20))
    
    // Let's use a simpler query approach
    for _, field := range yearFields {
        fieldQuery := fmt.Sprintf(`
            SELECT DISTINCT
                specifications->>'%s' as value,
                COUNT(*) as count
            FROM motorcycle_specs
            WHERE specifications->>'%s' IS NOT NULL
            AND specifications->>'%s' != ''
            GROUP BY specifications->>'%s'
            ORDER BY count DESC
            LIMIT 20
        `, field, field, field, field)
        
        fieldRows, err := db.Query(fieldQuery)
        if err != nil {
            log.Printf("Field query error for %s: %v", field, err)
            continue
        }
        
        fmt.Printf("\nTop values for field '%s':\n", field)
        fmt.Println(strings.Repeat("-", 60))
        
        for fieldRows.Next() {
            var value string
            var count int
            err := fieldRows.Scan(&value, &count)
            if err != nil {
                continue
            }
            
            // Check if it matches any pattern
            matched := false
            for _, pattern := range patterns {
                if pattern.MatchString(value) {
                    matched = true
                    break
                }
            }
            
            if !matched && strings.Contains(value, "19") || strings.Contains(value, "20") {
                fmt.Printf("  '%s' (count: %d)\n", value, count)
            }
        }
        fieldRows.Close()
    }
}