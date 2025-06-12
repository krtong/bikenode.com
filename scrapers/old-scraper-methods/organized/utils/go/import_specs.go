package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"os"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
)

type Image struct {
	URL    string `json:"url"`
	Alt    string `json:"alt"`
	Width  int    `json:"width"`
	Height int    `json:"height"`
}

type MotorcycleSpec struct {
	Title         string            `json:"title"`
	Description   string            `json:"description"`
	Specifications map[string]string `json:"specifications"`
	Images        []Image           `json:"images"`
	Content       string            `json:"content"`
	Metadata      map[string]string `json:"metadata"`
	Manufacturer  string            `json:"manufacturer"`
	Model         string            `json:"model"`
	URL           string            `json:"url"`
	ScrapedAt     string            `json:"scraped_at"`
}

type ScrapedData struct {
	ScrapedAt       string           `json:"scraped_at"`
	TotalMotorcycles int             `json:"total_motorcycles"`
	Manufacturers   []string         `json:"manufacturers"`
	Models          []string         `json:"models"`
	Motorcycles     []MotorcycleSpec `json:"motorcycles"`
}

func main() {
	// Load environment variables
	if err := godotenv.Load("../.env"); err != nil {
		log.Println("No .env file found, using system environment")
	}

	// Database connection
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgres://postgres:@localhost/bikenode?sslmode=disable"
	}

	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		log.Fatal("Failed to ping database:", err)
	}

	fmt.Println("✅ Connected to PostgreSQL database")

	// Create tables
	if err := createTables(db); err != nil {
		log.Fatal("Failed to create tables:", err)
	}

	// Import motorcycle specs
	if err := importMotorcycleSpecs(db); err != nil {
		log.Fatal("Failed to import motorcycle specs:", err)
	}

	// Verify import
	if err := verifyImport(db); err != nil {
		log.Fatal("Failed to verify import:", err)
	}

	fmt.Println("🎉 Motorcycle specifications import completed successfully!")
}

func createTables(db *sql.DB) error {
	fmt.Println("📋 Creating database tables...")

	sqlScript := `
	-- Create PostgreSQL table for motorcycle specifications
	CREATE TABLE IF NOT EXISTS motorcycle_specs (
		id SERIAL PRIMARY KEY,
		manufacturer VARCHAR(100) NOT NULL,
		model VARCHAR(200) NOT NULL,
		title VARCHAR(300),
		description TEXT,
		content TEXT,
		url VARCHAR(500),
		scraped_at TIMESTAMP WITH TIME ZONE,
		
		-- Core specifications
		year INTEGER,
		engine VARCHAR(500),
		capacity VARCHAR(100),
		bore_stroke VARCHAR(100),
		compression_ratio VARCHAR(50),
		cooling_system VARCHAR(100),
		induction VARCHAR(200),
		ignition VARCHAR(200),
		starting VARCHAR(100),
		max_power VARCHAR(200),
		max_torque VARCHAR(200),
		transmission VARCHAR(100),
		final_drive VARCHAR(100),
		
		-- Suspension and brakes
		front_suspension VARCHAR(300),
		rear_suspension VARCHAR(300),
		front_brakes VARCHAR(300),
		rear_brakes VARCHAR(300),
		
		-- Tires and dimensions
		front_tyre VARCHAR(100),
		rear_tyre VARCHAR(100),
		wet_weight VARCHAR(100),
		dry_weight VARCHAR(100),
		fuel_capacity VARCHAR(100),
		seat_height VARCHAR(100),
		wheelbase VARCHAR(100),
		
		-- Additional specifications stored as JSONB
		all_specifications JSONB,
		
		-- Images data
		images JSONB,
		
		-- Metadata
		metadata JSONB,
		
		-- Timestamps
		created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
	);

	-- Create indexes
	CREATE INDEX IF NOT EXISTS idx_motorcycle_specs_manufacturer ON motorcycle_specs(manufacturer);
	CREATE INDEX IF NOT EXISTS idx_motorcycle_specs_model ON motorcycle_specs(model);
	CREATE INDEX IF NOT EXISTS idx_motorcycle_specs_year ON motorcycle_specs(year);
	CREATE INDEX IF NOT EXISTS idx_motorcycle_specs_manufacturer_model ON motorcycle_specs(manufacturer, model);
	CREATE INDEX IF NOT EXISTS idx_motorcycle_specs_all_specs ON motorcycle_specs USING gin(all_specifications);

	-- Create unique constraint
	CREATE UNIQUE INDEX IF NOT EXISTS idx_motorcycle_specs_unique 
	ON motorcycle_specs(manufacturer, model, COALESCE(year, 0));

	-- Create mapping table
	CREATE TABLE IF NOT EXISTS motorcycle_catalog_specs_mapping (
		id SERIAL PRIMARY KEY,
		catalog_id UUID REFERENCES motorcycles(id) ON DELETE CASCADE,
		spec_id INTEGER REFERENCES motorcycle_specs(id) ON DELETE CASCADE,
		confidence_score DECIMAL(3,2) DEFAULT 0.0,
		mapping_type VARCHAR(50) DEFAULT 'automatic',
		notes TEXT,
		created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
	);

	CREATE UNIQUE INDEX IF NOT EXISTS idx_catalog_specs_mapping_unique 
	ON motorcycle_catalog_specs_mapping(catalog_id, spec_id);
	`

	_, err := db.Exec(sqlScript)
	if err != nil {
		return fmt.Errorf("error creating tables: %v", err)
	}

	fmt.Println("✅ Database tables created/verified")
	return nil
}

func extractYear(specs map[string]string) *int {
	yearFields := []string{"Year", "Model Year", "year", "model_year"}
	
	for _, field := range yearFields {
		if value, exists := specs[field]; exists {
			// Extract 4-digit year using regex
			re := regexp.MustCompile(`\b(19|20)\d{2}\b`)
			match := re.FindString(value)
			if match != "" {
				if year, err := strconv.Atoi(match); err == nil {
					return &year
				}
			}
		}
	}
	return nil
}

func cleanSpecValue(value string) string {
	if value == "" {
		return ""
	}

	// Remove excessive whitespace
	re := regexp.MustCompile(`\s+`)
	value = re.ReplaceAllString(strings.TrimSpace(value), " ")

	// Remove unwanted patterns
	unwantedPatterns := []string{
		`\(adsbygoogle = window\.adsbygoogle \|\| \[\]\)\.push\(\{\}\);`,
		`Your personal data will be processed.*`,
		`Cookies, device or similar.*`,
		`Information about your activity.*`,
	}

	for _, pattern := range unwantedPatterns {
		re := regexp.MustCompile(pattern)
		value = re.ReplaceAllString(value, "")
	}

	return strings.TrimSpace(value)
}

func extractSpecificSpecs(specs map[string]string) map[string]interface{} {
	specMapping := map[string][]string{
		"engine":             {"Engine", "engine", "Engine Type"},
		"capacity":           {"Capacity", "capacity", "Engine Capacity", "Displacement"},
		"bore_stroke":        {"Bore x Stroke", "bore_stroke", "Bore & Stroke"},
		"compression_ratio":  {"Compression Ratio", "compression_ratio"},
		"cooling_system":     {"Cooling System", "cooling_system", "Cooling"},
		"induction":          {"Induction", "induction", "Fuel System"},
		"ignition":           {"Ignition", "ignition"},
		"starting":           {"Starting", "starting", "Start System"},
		"max_power":          {"Max Power", "max_power", "Power", "Maximum Power"},
		"max_torque":         {"Max Torque", "max_torque", "Torque", "Maximum Torque"},
		"transmission":       {"Transmission", "transmission", "Gearbox"},
		"final_drive":        {"Final Drive", "final_drive", "Drive"},
		"front_suspension":   {"Front Suspension", "front_suspension"},
		"rear_suspension":    {"Rear Suspension", "rear_suspension"},
		"front_brakes":       {"Front Brakes", "front_brakes"},
		"rear_brakes":        {"Rear Brakes", "rear_brakes"},
		"front_tyre":         {"Front Tyre", "front_tyre", "Front Tire"},
		"rear_tyre":          {"Rear Tyre", "rear_tyre", "Rear Tire"},
		"wet_weight":         {"Wet-Weight", "wet_weight", "Wet Weight"},
		"dry_weight":         {"Dry-Weight", "dry_weight", "Dry Weight"},
		"fuel_capacity":      {"Fuel Capacity", "fuel_capacity"},
		"seat_height":        {"Seat Height", "seat_height"},
		"wheelbase":          {"Wheelbase", "wheelbase"},
	}

	extracted := make(map[string]interface{})

	for standardKey, possibleKeys := range specMapping {
		for _, key := range possibleKeys {
			if value, exists := specs[key]; exists && value != "" {
				extracted[standardKey] = cleanSpecValue(value)
				break
			}
		}
	}

	return extracted
}

func filterImages(images []Image) []Image {
	var filtered []Image
	
	for _, img := range images {
		url := strings.ToLower(img.URL)
		// Filter out logos, small images, and template images
		if !strings.Contains(url, "logo") && 
		   !strings.Contains(url, "template") && 
		   !strings.Contains(url, "search.png") &&
		   img.Width > 200 && img.Height > 150 {
			filtered = append(filtered, img)
		}
	}
	
	return filtered
}

func importMotorcycleSpecs(db *sql.DB) error {
	fmt.Println("📂 Loading motorcycle data...")

	// Read JSON file
	jsonFile := "scraped_data/motorcycles/motorcyclespecs_2025-06-05T10-29-11-191Z.json"
	data, err := ioutil.ReadFile(jsonFile)
	if err != nil {
		return fmt.Errorf("error reading JSON file: %v", err)
	}

	var scrapedData ScrapedData
	if err := json.Unmarshal(data, &scrapedData); err != nil {
		return fmt.Errorf("error parsing JSON: %v", err)
	}

	fmt.Printf("📊 Found %d motorcycles to import\n", len(scrapedData.Motorcycles))

	insertQuery := `
		INSERT INTO motorcycle_specs (
			manufacturer, model, title, description, content, url, scraped_at,
			year, engine, capacity, bore_stroke, compression_ratio, cooling_system,
			induction, ignition, starting, max_power, max_torque, transmission,
			final_drive, front_suspension, rear_suspension, front_brakes, rear_brakes,
			front_tyre, rear_tyre, wet_weight, dry_weight, fuel_capacity, seat_height,
			wheelbase, all_specifications, images, metadata
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 
			$17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, 
			$31, $32, $33, $34
		)
		ON CONFLICT (manufacturer, model, COALESCE(year, 0)) 
		DO UPDATE SET
			title = EXCLUDED.title,
			description = EXCLUDED.description,
			content = EXCLUDED.content,
			url = EXCLUDED.url,
			scraped_at = EXCLUDED.scraped_at,
			all_specifications = EXCLUDED.all_specifications,
			images = EXCLUDED.images,
			metadata = EXCLUDED.metadata,
			updated_at = CURRENT_TIMESTAMP
	`

	successful := 0
	failed := 0

	for i, motorcycle := range scrapedData.Motorcycles {
		// Process motorcycle data
		year := extractYear(motorcycle.Specifications)
		specificSpecs := extractSpecificSpecs(motorcycle.Specifications)
		filteredImages := filterImages(motorcycle.Images)

		// Clean content
		content := cleanSpecValue(motorcycle.Content)
		description := cleanSpecValue(motorcycle.Description)

		// Convert to JSON
		specsJSON, _ := json.Marshal(motorcycle.Specifications)
		imagesJSON, _ := json.Marshal(filteredImages)
		metadataJSON, _ := json.Marshal(motorcycle.Metadata)

		// Parse scraped_at time
		var scrapedAt *time.Time
		if motorcycle.ScrapedAt != "" {
			if t, err := time.Parse(time.RFC3339, motorcycle.ScrapedAt); err == nil {
				scrapedAt = &t
			}
		}

		// Execute insert with all parameters
		_, err := db.Exec(insertQuery,
			motorcycle.Manufacturer, motorcycle.Model, motorcycle.Title, 
			description, content, motorcycle.URL, scrapedAt, year,
			specificSpecs["engine"], specificSpecs["capacity"], specificSpecs["bore_stroke"],
			specificSpecs["compression_ratio"], specificSpecs["cooling_system"], 
			specificSpecs["induction"], specificSpecs["ignition"], specificSpecs["starting"],
			specificSpecs["max_power"], specificSpecs["max_torque"], specificSpecs["transmission"],
			specificSpecs["final_drive"], specificSpecs["front_suspension"], 
			specificSpecs["rear_suspension"], specificSpecs["front_brakes"], 
			specificSpecs["rear_brakes"], specificSpecs["front_tyre"], specificSpecs["rear_tyre"],
			specificSpecs["wet_weight"], specificSpecs["dry_weight"], specificSpecs["fuel_capacity"],
			specificSpecs["seat_height"], specificSpecs["wheelbase"],
			specsJSON, imagesJSON, metadataJSON,
		)

		if err != nil {
			failed++
			if failed < 5 { // Only log first few errors
				fmt.Printf("❌ Error importing %s %s: %v\n", motorcycle.Manufacturer, motorcycle.Model, err)
			}
		} else {
			successful++
		}

		if (i+1)%100 == 0 {
			fmt.Printf("⏳ Processed %d/%d motorcycles...\n", i+1, len(scrapedData.Motorcycles))
		}
	}

	fmt.Printf("\n🎉 Import completed!\n")
	fmt.Printf("✅ Successfully imported: %d motorcycles\n", successful)
	fmt.Printf("❌ Failed imports: %d motorcycles\n", failed)

	return nil
}

func verifyImport(db *sql.DB) error {
	fmt.Println("\n📈 Verifying imported data...")

	// Total count
	var total int
	err := db.QueryRow("SELECT COUNT(*) FROM motorcycle_specs").Scan(&total)
	if err != nil {
		return err
	}
	fmt.Printf("📊 Total motorcycles in database: %d\n", total)

	// Top manufacturers
	rows, err := db.Query(`
		SELECT manufacturer, COUNT(*) as count 
		FROM motorcycle_specs 
		GROUP BY manufacturer 
		ORDER BY count DESC 
		LIMIT 10
	`)
	if err != nil {
		return err
	}
	defer rows.Close()

	fmt.Println("\nTop 10 manufacturers by model count:")
	for rows.Next() {
		var manufacturer string
		var count int
		if err := rows.Scan(&manufacturer, &count); err != nil {
			return err
		}
		fmt.Printf("  %s: %d models\n", manufacturer, count)
	}

	// Year distribution
	rows, err = db.Query(`
		SELECT year, COUNT(*) as count 
		FROM motorcycle_specs 
		WHERE year IS NOT NULL
		GROUP BY year 
		ORDER BY year DESC 
		LIMIT 10
	`)
	if err != nil {
		return err
	}
	defer rows.Close()

	fmt.Println("\nTop 10 years by model count:")
	for rows.Next() {
		var year int
		var count int
		if err := rows.Scan(&year, &count); err != nil {
			return err
		}
		fmt.Printf("  %d: %d models\n", year, count)
	}

	return nil
}