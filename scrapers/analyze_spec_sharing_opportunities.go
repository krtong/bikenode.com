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
    
    fmt.Println("🏍️  Analyzing Spec Sharing Opportunities")
    fmt.Println("=======================================\n")
    
    // Look for models that appear across multiple years but have inconsistent spec coverage
    fmt.Println("📊 Models with partial spec coverage across years:\n")
    
    rows, err := db.Query(`
        WITH model_spec_coverage AS (
            SELECT 
                m.make,
                m.model,
                COUNT(DISTINCT m.year) as total_years,
                COUNT(DISTINCT CASE WHEN m.spec_id IS NOT NULL THEN m.year END) as years_with_specs,
                MIN(m.year) as first_year,
                MAX(m.year) as last_year,
                STRING_AGG(DISTINCT 
                    CASE WHEN m.spec_id IS NOT NULL 
                    THEN m.year::text || '(' || m.spec_id::text || ')' 
                    ELSE m.year::text 
                    END, ', ' ORDER BY 
                    CASE WHEN m.spec_id IS NOT NULL 
                    THEN m.year::text || '(' || m.spec_id::text || ')' 
                    ELSE m.year::text 
                    END
                ) as year_details,
                COUNT(DISTINCT m.spec_id) as unique_spec_ids
            FROM motorcycles m
            GROUP BY m.make, m.model
            HAVING COUNT(DISTINCT m.year) > COUNT(DISTINCT CASE WHEN m.spec_id IS NOT NULL THEN m.year END)
            AND COUNT(DISTINCT CASE WHEN m.spec_id IS NOT NULL THEN m.year END) > 0
        )
        SELECT * FROM model_spec_coverage
        WHERE total_years >= 3
        ORDER BY total_years - years_with_specs DESC, make, model
        LIMIT 30
    `)
    if err != nil {
        panic(err)
    }
    defer rows.Close()
    
    fmt.Println("Make         Model                      Total Years  With Specs  Years (spec_id)")
    fmt.Println("--------------------------------------------------------------------------------")
    
    opportunityCount := 0
    for rows.Next() {
        var make, model, yearDetails string
        var totalYears, yearsWithSpecs, firstYear, lastYear, uniqueSpecIDs int
        
        err := rows.Scan(&make, &model, &totalYears, &yearsWithSpecs, &firstYear, &lastYear, &yearDetails, &uniqueSpecIDs)
        if err != nil {
            continue
        }
        
        fmt.Printf("%-12s %-25s %5d        %5d       %s\n",
            truncateString(make, 12),
            truncateString(model, 25),
            totalYears,
            yearsWithSpecs,
            truncateString(yearDetails, 40))
        
        opportunityCount += (totalYears - yearsWithSpecs)
    }
    
    fmt.Printf("\n🎯 Total opportunity: %d motorcycle-year combinations could inherit specs\n", opportunityCount)
    
    // Look at specific case studies
    fmt.Println("\n\n📋 Case Studies - Same Model, Different Years:\n")
    
    rows2, err := db.Query(`
        WITH model_groups AS (
            SELECT 
                m1.make,
                m1.model,
                m1.year as spec_year,
                m1.spec_id,
                m2.year as missing_year,
                m2.id as missing_id
            FROM motorcycles m1
            JOIN motorcycles m2 ON m1.make = m2.make 
                AND m1.model = m2.model 
                AND m1.spec_id IS NOT NULL 
                AND m2.spec_id IS NULL
            WHERE m1.make IN ('Honda', 'Yamaha', 'Kawasaki', 'Suzuki')
        )
        SELECT * FROM model_groups
        ORDER BY make, model, spec_year, missing_year
        LIMIT 20
    `)
    if err != nil {
        panic(err)
    }
    defer rows2.Close()
    
    fmt.Println("Make       Model                 Has Spec Year  Missing Year  Action")
    fmt.Println("----------------------------------------------------------------------")
    
    for rows2.Next() {
        var make, model, missingID string
        var specYear, specID, missingYear int
        
        err := rows2.Scan(&make, &model, &specYear, &specID, &missingYear, &missingID)
        if err != nil {
            continue
        }
        
        yearDiff := abs(specYear - missingYear)
        action := "Could share spec"
        if yearDiff > 5 {
            action = "Review needed"
        }
        
        fmt.Printf("%-10s %-20s %d (ID:%d)    %d          %s\n",
            make,
            truncateString(model, 20),
            specYear,
            specID,
            missingYear,
            action)
    }
    
    // Analyze spec similarity
    fmt.Println("\n\n🔍 Analyzing spec content similarity:\n")
    
    rows3, err := db.Query(`
        SELECT 
            s1.id as spec1_id,
            s1.manufacturer || ' ' || s1.model as spec1_name,
            s2.id as spec2_id,
            s2.manufacturer || ' ' || s2.model as spec2_name,
            COUNT(*) as matching_fields
        FROM motorcycle_specs s1
        CROSS JOIN motorcycle_specs s2
        CROSS JOIN LATERAL jsonb_each_text(s1.specifications) AS kv1(key, value)
        CROSS JOIN LATERAL jsonb_each_text(s2.specifications) AS kv2(key, value)
        WHERE s1.id < s2.id
        AND s1.manufacturer = s2.manufacturer
        AND kv1.key = kv2.key
        AND kv1.value = kv2.value
        GROUP BY s1.id, s1.manufacturer, s1.model, s2.id, s2.manufacturer, s2.model
        HAVING COUNT(*) > 15
        ORDER BY COUNT(*) DESC
        LIMIT 10
    `)
    if err != nil {
        fmt.Println("Error analyzing spec similarity:", err)
    } else {
        defer rows3.Close()
        
        fmt.Println("Spec 1                          Spec 2                          Matching Fields")
        fmt.Println("------------------------------------------------------------------------------")
        
        for rows3.Next() {
            var spec1ID, spec2ID, matchingFields int
            var spec1Name, spec2Name string
            
            err := rows3.Scan(&spec1ID, &spec1Name, &spec2ID, &spec2Name, &matchingFields)
            if err != nil {
                continue
            }
            
            fmt.Printf("%-30s  %-30s  %d\n",
                truncateString(spec1Name, 30),
                truncateString(spec2Name, 30),
                matchingFields)
        }
    }
}

func truncateString(s string, maxLen int) string {
    if len(s) <= maxLen {
        return s
    }
    return s[:maxLen-3] + "..."
}

func abs(n int) int {
    if n < 0 {
        return -n
    }
    return n
}