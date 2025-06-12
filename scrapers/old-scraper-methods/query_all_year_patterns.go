package main

import (
    "database/sql"
    "fmt"
    "log"
    "regexp"
    "sort"
    "strings"
    
    _ "github.com/lib/pq"
)

type YearPattern struct {
    Value    string
    Count    int
    Examples []string
}

func main() {
    // Connect to PostgreSQL
    connStr := "host=localhost port=5432 dbname=bikenode sslmode=disable"
    db, err := sql.Open("postgres", connStr)
    if err != nil {
        log.Fatal("Failed to connect to database:", err)
    }
    defer db.Close()
    
    fmt.Println("Analyzing all year-related patterns in motorcycle_specs...")
    fmt.Println("=" + strings.Repeat("=", 60))
    
    // Year-related fields to check
    yearFields := []string{"Year", "Production", "Production period", "Years", "Model year", "Production years"}
    
    // Patterns that indicate year ranges or special formats
    yearPatterns := []struct {
        Name    string
        Pattern *regexp.Regexp
    }{
        {"Range with dash", regexp.MustCompile(`\d{4}\s*[-–—]\s*\d{4}`)},
        {"Range with 'to'", regexp.MustCompile(`\d{4}\s+(?:to|TO|To)\s+\d{4}`)},
        {"Open-ended dash", regexp.MustCompile(`\d{4}\s*[-–—]\s*$`)},
        {"Present/current", regexp.MustCompile(`\d{4}\s*[-–—]\s*(?:present|Present|PRESENT|current|Current|now|Now)`)},
        {"Since/From", regexp.MustCompile(`(?:Since|since|SINCE|From|from|FROM)\s+\d{4}`)},
        {"Onwards", regexp.MustCompile(`\d{4}\s+(?:onwards|onward|Onwards|Onward|ONWARDS|ONWARD)`)},
        {"Plus sign", regexp.MustCompile(`\d{4}\+`)},
        {"Comma separated", regexp.MustCompile(`\d{4}\s*,\s*\d{4}`)},
        {"And/&", regexp.MustCompile(`\d{4}\s+(?:and|&)\s+\d{4}`)},
        {"Short year range", regexp.MustCompile(`\d{2}\s*[-–—]\s*\d{2}`)},
        {"Parenthetical", regexp.MustCompile(`\(\s*\d{4}\s*[-–—]\s*\d{4}\s*\)`)},
        {"Multiple ranges", regexp.MustCompile(`\d{4}.*\d{4}.*\d{4}`)},
    }
    
    allPatterns := make(map[string]*YearPattern)
    
    for _, field := range yearFields {
        fmt.Printf("\n\nAnalyzing field: %s\n", field)
        fmt.Println(strings.Repeat("-", 40))
        
        // Query distinct values and their counts
        query := fmt.Sprintf(`
            SELECT 
                specifications->>'%s' as value,
                COUNT(*) as count,
                string_agg(DISTINCT CONCAT(manufacturer, ' ', model), ', ' ORDER BY CONCAT(manufacturer, ' ', model)) as examples
            FROM motorcycle_specs
            WHERE specifications->>'%s' IS NOT NULL
            AND specifications->>'%s' != ''
            AND specifications->>'%s' != 'null'
            GROUP BY specifications->>'%s'
            HAVING COUNT(*) >= 1
            ORDER BY count DESC
        `, field, field, field, field, field)
        
        rows, err := db.Query(query)
        if err != nil {
            log.Printf("Query error for field %s: %v", field, err)
            continue
        }
        
        fieldPatterns := []YearPattern{}
        
        for rows.Next() {
            var value string
            var count int
            var examples interface{}
            
            err := rows.Scan(&value, &count, &examples)
            if err != nil {
                log.Printf("Scan error: %v", err)
                continue
            }
            
            // Convert examples to string array
            exampleList := []string{}
            if examplesStr, ok := examples.(string); ok {
                // Split by comma
                if examplesStr != "" {
                    parts := strings.Split(examplesStr, ", ")
                    for i, part := range parts {
                        if i < 3 { // Limit to 3 examples
                            exampleList = append(exampleList, part)
                        }
                    }
                }
            }
            
            // Check if value matches any year pattern
            isYearRelated := false
            matchedPattern := ""
            
            // First check if it contains any year
            if regexp.MustCompile(`\d{4}`).MatchString(value) {
                isYearRelated = true
                
                // Check which specific pattern it matches
                for _, pattern := range yearPatterns {
                    if pattern.Pattern.MatchString(value) {
                        matchedPattern = pattern.Name
                        break
                    }
                }
                
                if matchedPattern == "" && regexp.MustCompile(`^\d{4}$`).MatchString(value) {
                    matchedPattern = "Single year"
                } else if matchedPattern == "" {
                    matchedPattern = "Other year format"
                }
            }
            
            if isYearRelated {
                pattern := YearPattern{
                    Value:    value,
                    Count:    count,
                    Examples: exampleList,
                }
                
                fieldPatterns = append(fieldPatterns, pattern)
                
                // Add to overall patterns
                key := fmt.Sprintf("%s: %s", field, matchedPattern)
                if _, exists := allPatterns[key]; !exists {
                    allPatterns[key] = &YearPattern{
                        Value:    matchedPattern,
                        Count:    0,
                        Examples: []string{},
                    }
                }
                allPatterns[key].Count += count
                if len(allPatterns[key].Examples) < 5 {
                    allPatterns[key].Examples = append(allPatterns[key].Examples, fmt.Sprintf("'%s' (%d occurrences)", value, count))
                }
            }
        }
        rows.Close()
        
        // Show interesting patterns for this field
        fmt.Printf("\nFound %d unique year-related values\n", len(fieldPatterns))
        
        // Show non-single-year patterns
        fmt.Println("\nYear ranges and special formats:")
        shown := 0
        for _, pattern := range fieldPatterns {
            if !regexp.MustCompile(`^\d{4}$`).MatchString(pattern.Value) {
                fmt.Printf("  '%s' (count: %d)\n", pattern.Value, pattern.Count)
                if len(pattern.Examples) > 0 {
                    fmt.Printf("    Examples: %s\n", strings.Join(pattern.Examples[:min(2, len(pattern.Examples))], ", "))
                }
                shown++
                if shown >= 15 {
                    break
                }
            }
        }
    }
    
    // Summary of all patterns
    fmt.Printf("\n\n%s SUMMARY OF YEAR PATTERNS %s\n", strings.Repeat("=", 20), strings.Repeat("=", 20))
    
    // Sort patterns by count
    patternList := []YearPattern{}
    for key, pattern := range allPatterns {
        pattern.Value = key
        patternList = append(patternList, *pattern)
    }
    
    sort.Slice(patternList, func(i, j int) bool {
        return patternList[i].Count > patternList[j].Count
    })
    
    for _, pattern := range patternList {
        fmt.Printf("\n%s (total: %d occurrences)\n", pattern.Value, pattern.Count)
        if len(pattern.Examples) > 0 {
            fmt.Println("  Examples:")
            for _, ex := range pattern.Examples {
                fmt.Printf("    %s\n", ex)
            }
        }
    }
}

func min(a, b int) int {
    if a < b {
        return a
    }
    return b
}