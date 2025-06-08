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
    
    fmt.Println("🏍️  Analyzing Motorcycle Year Ranges and Spec Coverage")
    fmt.Println("====================================================\n")
    
    // First, let's see how specs are distributed across years for the same model
    fmt.Println("📊 Models with specs across multiple years:")
    fmt.Println("(Shows cases where the same spec_id is used for multiple years)\n")
    
    rows, err := db.Query(`
        WITH spec_year_ranges AS (
            SELECT 
                m.make,
                m.model,
                m.spec_id,
                MIN(m.year) as first_year,
                MAX(m.year) as last_year,
                COUNT(DISTINCT m.year) as year_count,
                ARRAY_AGG(DISTINCT m.year ORDER BY m.year) as years
            FROM motorcycles m
            WHERE m.spec_id IS NOT NULL
            GROUP BY m.make, m.model, m.spec_id
            HAVING COUNT(DISTINCT m.year) > 1
        )
        SELECT * FROM spec_year_ranges
        ORDER BY year_count DESC, make, model
        LIMIT 20
    `)
    if err != nil {
        panic(err)
    }
    defer rows.Close()
    
    fmt.Println("Make/Model                                    Spec ID   Years    Count  Year Range")
    fmt.Println("--------------------------------------------------------------------------------")
    
    for rows.Next() {
        var make, model string
        var specID, firstYear, lastYear, yearCount int
        var years []int
        
        err := rows.Scan(&make, &model, &specID, &firstYear, &lastYear, &yearCount, &years)
        if err != nil {
            continue
        }
        
        fmt.Printf("%-20s %-20s %6d    %d-%d   %3d    ", 
            make, 
            truncateString(model, 20), 
            specID, 
            firstYear, 
            lastYear, 
            yearCount)
        
        // Show actual years if there are gaps
        if yearCount < (lastYear - firstYear + 1) {
            fmt.Printf("%v", years)
        } else {
            fmt.Printf("continuous")
        }
        fmt.Println()
    }
    
    // Now let's look at models that appear across multiple years but might not have specs for all years
    fmt.Println("\n\n📅 Popular models and their year coverage:")
    fmt.Println("(Shows models that exist across many years)\n")
    
    rows2, err := db.Query(`
        WITH model_years AS (
            SELECT 
                make,
                model,
                COUNT(DISTINCT year) as total_years,
                COUNT(DISTINCT CASE WHEN spec_id IS NOT NULL THEN year END) as years_with_specs,
                MIN(year) as first_year,
                MAX(year) as last_year,
                ARRAY_AGG(DISTINCT year ORDER BY year) as all_years,
                ARRAY_AGG(DISTINCT year ORDER BY year) FILTER (WHERE spec_id IS NOT NULL) as spec_years
            FROM motorcycles
            GROUP BY make, model
            HAVING COUNT(DISTINCT year) >= 5
        )
        SELECT * FROM model_years
        WHERE years_with_specs > 0
        ORDER BY total_years DESC, years_with_specs DESC
        LIMIT 20
    `)
    if err != nil {
        panic(err)
    }
    defer rows2.Close()
    
    fmt.Println("Make       Model                Total Years  With Specs  Year Range    Missing Specs")
    fmt.Println("---------------------------------------------------------------------------------")
    
    for rows2.Next() {
        var make, model string
        var totalYears, yearsWithSpecs, firstYear, lastYear int
        var allYears, specYears []sql.NullInt64
        
        err := rows2.Scan(&make, &model, &totalYears, &yearsWithSpecs, &firstYear, &lastYear, &allYears, &specYears)
        if err != nil {
            continue
        }
        
        // Convert to regular int arrays
        var allYearsInt []int
        var specYearsInt []int
        
        for _, y := range allYears {
            if y.Valid {
                allYearsInt = append(allYearsInt, int(y.Int64))
            }
        }
        
        for _, y := range specYears {
            if y.Valid {
                specYearsInt = append(specYearsInt, int(y.Int64))
            }
        }
        
        // Find missing years
        specYearMap := map[int]bool{}
        for _, y := range specYearsInt {
            specYearMap[y] = true
        }
        
        var missingYears []int
        for _, y := range allYearsInt {
            if !specYearMap[y] {
                missingYears = append(missingYears, y)
            }
        }
        
        fmt.Printf("%-10s %-20s %6d      %6d      %d-%d   ",
            truncateString(make, 10),
            truncateString(model, 20),
            totalYears,
            yearsWithSpecs,
            firstYear,
            lastYear)
        
        if len(missingYears) > 0 && len(missingYears) <= 10 {
            fmt.Printf("%v", missingYears)
        } else if len(missingYears) > 10 {
            fmt.Printf("%d years missing", len(missingYears))
        } else {
            fmt.Printf("None")
        }
        fmt.Println()
    }
    
    // Check Honda Monkey specifically
    fmt.Println("\n\n🔍 Honda Monkey Year Analysis:")
    
    rows3, err := db.Query(`
        SELECT 
            m.year,
            m.model,
            m.spec_id,
            s.model as spec_model
        FROM motorcycles m
        LEFT JOIN motorcycle_specs s ON m.spec_id = s.id
        WHERE m.make = 'Honda' 
        AND m.model LIKE '%Monkey%'
        ORDER BY m.year DESC
    `)
    if err != nil {
        panic(err)
    }
    defer rows3.Close()
    
    fmt.Println("\nYear  Model                Spec ID  Spec Model")
    fmt.Println("------------------------------------------------")
    
    for rows3.Next() {
        var year int
        var model string
        var specID sql.NullInt64
        var specModel sql.NullString
        
        err := rows3.Scan(&year, &model, &specID, &specModel)
        if err != nil {
            continue
        }
        
        specInfo := "No specs"
        if specID.Valid {
            specInfo = fmt.Sprintf("%d", specID.Int64)
            if specModel.Valid {
                specInfo += fmt.Sprintf(" (%s)", specModel.String)
            }
        }
        
        fmt.Printf("%d  %-20s %s\n", year, model, specInfo)
    }
    
    // Analyze how many unique specs we have vs how many motorcycle records
    fmt.Println("\n\n📊 Spec Reuse Analysis:")
    
    var reuseStats struct {
        totalSpecs int
        totalLinked int
        avgReuse float64
        maxReuse int
        maxReuseModel string
    }
    
    err = db.QueryRow(`
        WITH spec_usage AS (
            SELECT 
                s.id as spec_id,
                s.manufacturer || ' ' || s.model as spec_name,
                COUNT(m.id) as usage_count
            FROM motorcycle_specs s
            LEFT JOIN motorcycles m ON m.spec_id = s.id
            GROUP BY s.id, s.manufacturer, s.model
        )
        SELECT 
            COUNT(*) as total_specs,
            SUM(CASE WHEN usage_count > 0 THEN 1 ELSE 0 END) as total_linked,
            AVG(CASE WHEN usage_count > 0 THEN usage_count ELSE NULL END) as avg_reuse,
            MAX(usage_count) as max_reuse,
            (SELECT spec_name FROM spec_usage WHERE usage_count = (SELECT MAX(usage_count) FROM spec_usage) LIMIT 1) as max_reuse_model
        FROM spec_usage
    `).Scan(&reuseStats.totalSpecs, &reuseStats.totalLinked, &reuseStats.avgReuse, &reuseStats.maxReuse, &reuseStats.maxReuseModel)
    
    if err == nil {
        fmt.Printf("\nTotal spec records: %d\n", reuseStats.totalSpecs)
        fmt.Printf("Specs linked to motorcycles: %d\n", reuseStats.totalLinked)
        fmt.Printf("Average reuse per spec: %.1f motorcycles\n", reuseStats.avgReuse)
        fmt.Printf("Most reused spec: %s (%d motorcycles)\n", reuseStats.maxReuseModel, reuseStats.maxReuse)
    }
}

func truncateString(s string, maxLen int) string {
    if len(s) <= maxLen {
        return s
    }
    return s[:maxLen-3] + "..."
}