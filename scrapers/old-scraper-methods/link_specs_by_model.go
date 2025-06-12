package main

import (
    "database/sql"
    "fmt"
    "log"
    "strings"
    _ "github.com/lib/pq"
)

func main() {
    db, err := sql.Open("postgres", "postgres://postgres:@localhost/bikenode?sslmode=disable")
    if err != nil {
        log.Fatal(err)
    }
    defer db.Close()
    
    fmt.Println("🔧 Linking Motorcycle Specs by Model Similarity")
    fmt.Println("==============================================\n")
    
    // Find motorcycles that should share specs based on model similarity
    fmt.Println("📊 Finding motorcycles that should share specifications...\n")
    
    // Strategy: For each spec, find all motorcycles of the same make/model that don't have specs
    rows, err := db.Query(`
        WITH spec_models AS (
            -- Get all unique make/model combinations that have specs
            SELECT DISTINCT
                m.make,
                m.model,
                m.spec_id,
                s.model as spec_model_name,
                MIN(m.year) as spec_min_year,
                MAX(m.year) as spec_max_year
            FROM motorcycles m
            JOIN motorcycle_specs s ON m.spec_id = s.id
            WHERE m.spec_id IS NOT NULL
            GROUP BY m.make, m.model, m.spec_id, s.model
        ),
        unlinked_models AS (
            -- Find motorcycles without specs that match existing spec models
            SELECT 
                m2.id,
                m2.year,
                m2.make,
                m2.model,
                sm.spec_id,
                sm.spec_model_name,
                sm.spec_min_year,
                sm.spec_max_year,
                ABS(m2.year - (sm.spec_min_year + sm.spec_max_year)/2) as year_distance
            FROM motorcycles m2
            JOIN spec_models sm ON m2.make = sm.make 
                AND (
                    m2.model = sm.model 
                    OR m2.model LIKE sm.model || '%'
                    OR sm.model LIKE m2.model || '%'
                    OR REPLACE(m2.model, ' ', '') = REPLACE(sm.model, ' ', '')
                )
            WHERE m2.spec_id IS NULL
            -- Only link if within reasonable year range (5 years from existing spec years)
            AND m2.year BETWEEN sm.spec_min_year - 5 AND sm.spec_max_year + 5
        )
        SELECT * FROM unlinked_models
        ORDER BY make, model, year
    `)
    if err != nil {
        log.Fatal("Error finding unlinked models:", err)
    }
    defer rows.Close()
    
    type linkCandidate struct {
        id              string
        year            int
        make            string
        model           string
        specID          int
        specModelName   string
        specMinYear     int
        specMaxYear     int
        yearDistance    int
    }
    
    var candidates []linkCandidate
    
    for rows.Next() {
        var c linkCandidate
        err := rows.Scan(&c.id, &c.year, &c.make, &c.model, &c.specID, 
                        &c.specModelName, &c.specMinYear, &c.specMaxYear, &c.yearDistance)
        if err != nil {
            continue
        }
        candidates = append(candidates, c)
    }
    
    fmt.Printf("Found %d motorcycles that could be linked to existing specs\n\n", len(candidates))
    
    // Group by make/model for review
    modelGroups := make(map[string][]linkCandidate)
    for _, c := range candidates {
        key := fmt.Sprintf("%s %s", c.make, c.model)
        modelGroups[key] = append(modelGroups[key], c)
    }
    
    // Show what would be linked
    fmt.Println("Proposed linkages (showing first 20 groups):")
    fmt.Println("============================================")
    
    count := 0
    for modelKey, group := range modelGroups {
        if count >= 20 {
            break
        }
        count++
        
        fmt.Printf("\n%s:\n", modelKey)
        fmt.Printf("  Spec to use: ID %d (%s) [Years %d-%d]\n", 
                  group[0].specID, group[0].specModelName, 
                  group[0].specMinYear, group[0].specMaxYear)
        fmt.Printf("  Years to link: ")
        
        years := []int{}
        for _, c := range group {
            years = append(years, c.year)
        }
        fmt.Printf("%v\n", years)
    }
    
    // Show specific examples for popular models
    fmt.Println("\n\n📋 Popular models that would benefit:")
    fmt.Println("=====================================")
    
    popularModels := []string{"Honda Monkey", "Yamaha YZF-R", "Kawasaki Ninja", "Suzuki GSX"}
    
    for _, searchModel := range popularModels {
        found := false
        for modelKey, group := range modelGroups {
            if strings.Contains(modelKey, searchModel) && !found {
                fmt.Printf("\n%s:\n", modelKey)
                fmt.Printf("  Current coverage: %d-%d (Spec ID: %d)\n", 
                          group[0].specMinYear, group[0].specMaxYear, group[0].specID)
                fmt.Printf("  Would add years: ")
                years := []int{}
                for _, c := range group {
                    years = append(years, c.year)
                }
                fmt.Printf("%v\n", years)
                found = true
            }
        }
    }
    
    // Ask for confirmation
    fmt.Printf("\n\nThis would link %d additional motorcycles to existing specs.\n", len(candidates))
    fmt.Println("This will help ensure specs are shown for all years a model was produced.")
    fmt.Println("Do you want to proceed? (yes/no): ")
    
    var response string
    fmt.Scanln(&response)
    
    if strings.ToLower(response) != "yes" {
        fmt.Println("Operation cancelled.")
        return
    }
    
    // Perform the linking
    fmt.Println("\n🔗 Linking motorcycles to specs...")
    
    tx, err := db.Begin()
    if err != nil {
        log.Fatal("Error starting transaction:", err)
    }
    
    linked := 0
    for _, c := range candidates {
        _, err := tx.Exec(`
            UPDATE motorcycles 
            SET spec_id = $1
            WHERE id = $2 AND spec_id IS NULL
        `, c.specID, c.id)
        
        if err != nil {
            fmt.Printf("Error linking %s: %v\n", c.id, err)
            continue
        }
        linked++
    }
    
    if err := tx.Commit(); err != nil {
        log.Fatal("Error committing transaction:", err)
    }
    
    fmt.Printf("\n✅ Successfully linked %d motorcycles to existing specs!\n", linked)
    
    // Show updated statistics
    var totalWithSpecs int
    err = db.QueryRow("SELECT COUNT(*) FROM motorcycles WHERE spec_id IS NOT NULL").Scan(&totalWithSpecs)
    if err == nil {
        var total int
        db.QueryRow("SELECT COUNT(*) FROM motorcycles").Scan(&total)
        coverage := float64(totalWithSpecs) / float64(total) * 100
        fmt.Printf("\n📊 New coverage: %d/%d motorcycles (%.1f%%)\n", totalWithSpecs, total, coverage)
    }
    
    // Show specific examples of what was linked
    fmt.Println("\n📋 Example linkages made:")
    
    exampleIDs := []string{}
    for i, c := range candidates {
        if i < 10 {
            exampleIDs = append(exampleIDs, c.id)
        }
    }
    
    if len(exampleIDs) > 0 {
        rows2, err := db.Query(`
            SELECT m.year, m.make, m.model, m.spec_id, s.model as spec_model
            FROM motorcycles m
            JOIN motorcycle_specs s ON m.spec_id = s.id
            WHERE m.id = ANY($1::uuid[])
            ORDER BY m.make, m.model, m.year
        `, exampleIDs)
        
        if err == nil {
            defer rows2.Close()
            for rows2.Next() {
                var year, specID int
                var make, model, specModel string
                rows2.Scan(&year, &make, &model, &specID, &specModel)
                fmt.Printf("%d %s %s → Spec %d (%s)\n", year, make, model, specID, specModel)
            }
        }
    }
    
    // Show Honda Monkey status after linking
    fmt.Println("\n\n🔍 Honda Monkey coverage after linking:")
    
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
    if err == nil {
        defer rows3.Close()
        
        fmt.Println("\nYear  Model                Spec ID  Status")
        fmt.Println("------------------------------------------")
        
        for rows3.Next() {
            var year int
            var model string
            var specID sql.NullInt64
            var specModel sql.NullString
            
            rows3.Scan(&year, &model, &specID, &specModel)
            
            status := "❌ No specs"
            if specID.Valid {
                status = fmt.Sprintf("✅ Spec %d", specID.Int64)
            }
            
            fmt.Printf("%d  %-20s %s\n", year, model, status)
        }
    }
}