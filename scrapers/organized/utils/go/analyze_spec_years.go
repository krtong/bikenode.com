package main

import (
    "encoding/json"
    "fmt"
    "io/ioutil"
    "sort"
)

type SpecsData struct {
    Motorcycles []struct {
        Title         string            `json:"title"`
        Specifications map[string]string `json:"specifications"`
    } `json:"motorcycles"`
}

type ModelYears struct {
    Model string
    Years []string
}

func main() {
    // Read the JSON file
    data, err := ioutil.ReadFile("scraped_data/motorcycles/motorcyclespecs_2025-06-05T10-29-11-191Z.json")
    if err != nil {
        panic(err)
    }
    
    var specs SpecsData
    err = json.Unmarshal(data, &specs)
    if err != nil {
        panic(err)
    }
    
    fmt.Printf("Total specs in file: %d\n\n", len(specs.Motorcycles))
    
    // Track models and their years
    modelYearMap := make(map[string]map[string]bool)
    yearCount := make(map[string]int)
    
    for _, moto := range specs.Motorcycles {
        model := moto.Title
        year := moto.Specifications["Year"]
        
        if year == "" {
            continue
        }
        
        if modelYearMap[model] == nil {
            modelYearMap[model] = make(map[string]bool)
        }
        modelYearMap[model][year] = true
        yearCount[year]++
    }
    
    // Find models with multiple years
    fmt.Println("Models with specs for multiple years:")
    fmt.Println("=====================================")
    
    multiYearModels := []ModelYears{}
    for model, years := range modelYearMap {
        if len(years) > 1 {
            yearList := []string{}
            for year := range years {
                yearList = append(yearList, year)
            }
            sort.Strings(yearList)
            multiYearModels = append(multiYearModels, ModelYears{Model: model, Years: yearList})
        }
    }
    
    // Sort by number of years (descending)
    sort.Slice(multiYearModels, func(i, j int) bool {
        return len(multiYearModels[i].Years) > len(multiYearModels[j].Years)
    })
    
    // Show top 20 models with most years
    for i, m := range multiYearModels {
        if i >= 20 {
            break
        }
        fmt.Printf("%-40s: %d years %v\n", m.Model, len(m.Years), m.Years)
    }
    
    fmt.Printf("\nTotal models with multiple years: %d\n", len(multiYearModels))
    fmt.Printf("Total unique models: %d\n", len(modelYearMap))
    
    // Show year distribution
    fmt.Println("\nYear distribution:")
    fmt.Println("==================")
    
    years := []string{}
    for year := range yearCount {
        years = append(years, year)
    }
    sort.Strings(years)
    
    // Show last 10 years
    start := len(years) - 10
    if start < 0 {
        start = 0
    }
    
    for _, year := range years[start:] {
        fmt.Printf("%s: %d motorcycles\n", year, yearCount[year])
    }
}