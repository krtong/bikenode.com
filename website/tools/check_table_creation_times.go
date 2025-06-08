package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found")
	}

	// Database connection parameters
	dbHost := os.Getenv("DB_HOST")
	if dbHost == "" {
		dbHost = "localhost"
	}

	dbPort := os.Getenv("DB_PORT")
	if dbPort == "" {
		dbPort = "5432"
	}

	dbUser := os.Getenv("DB_USER")
	if dbUser == "" {
		dbUser = "postgres"
	}

	dbPassword := os.Getenv("DB_PASSWORD")
	if dbPassword == "" {
		dbPassword = "postgres"
	}

	dbName := os.Getenv("DB_NAME")
	if dbName == "" {
		dbName = "bikenode"
	}

	// Connect to database
	connStr := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		dbHost, dbPort, dbUser, dbPassword, dbName)

	db, err := sql.Open("postgres", connStr)
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	defer db.Close()

	fmt.Println("=== PostgreSQL Table Creation Time Information ===\n")

	// Method 1: Check pg_stat_user_tables for statistics
	fmt.Println("1. Table Statistics (Last Vacuum/Analyze Times):")
	fmt.Println("Note: These show when tables were last maintained, not created")
	fmt.Println("----------------------------------------------------")
	
	query1 := `
		SELECT 
			schemaname,
			tablename,
			last_vacuum,
			last_autovacuum,
			last_analyze,
			last_autoanalyze
		FROM pg_stat_user_tables
		WHERE schemaname = 'public'
		ORDER BY tablename;
	`
	
	rows1, err := db.Query(query1)
	if err != nil {
		log.Printf("Error querying pg_stat_user_tables: %v", err)
	} else {
		defer rows1.Close()
		
		for rows1.Next() {
			var schemaname, tablename string
			var lastVacuum, lastAutovacuum, lastAnalyze, lastAutoanalyze sql.NullTime
			
			err := rows1.Scan(&schemaname, &tablename, &lastVacuum, &lastAutovacuum, &lastAnalyze, &lastAutoanalyze)
			if err != nil {
				log.Printf("Error scanning row: %v", err)
				continue
			}
			
			fmt.Printf("Table: %s.%s\n", schemaname, tablename)
			if lastVacuum.Valid {
				fmt.Printf("  Last Vacuum: %s\n", lastVacuum.Time.Format(time.RFC3339))
			}
			if lastAutovacuum.Valid {
				fmt.Printf("  Last Auto-vacuum: %s\n", lastAutovacuum.Time.Format(time.RFC3339))
			}
			if lastAnalyze.Valid {
				fmt.Printf("  Last Analyze: %s\n", lastAnalyze.Time.Format(time.RFC3339))
			}
			if lastAutoanalyze.Valid {
				fmt.Printf("  Last Auto-analyze: %s\n", lastAutoanalyze.Time.Format(time.RFC3339))
			}
			fmt.Println()
		}
	}

	// Method 2: Check file system creation time (requires superuser)
	fmt.Println("\n2. Table OIDs and File Paths:")
	fmt.Println("Note: File creation times require OS-level access")
	fmt.Println("----------------------------------------------------")
	
	query2 := `
		SELECT 
			c.relname AS table_name,
			c.oid AS table_oid,
			pg_relation_filepath(c.oid) AS file_path
		FROM pg_class c
		JOIN pg_namespace n ON n.oid = c.relnamespace
		WHERE c.relkind = 'r' 
		AND n.nspname = 'public'
		ORDER BY c.relname;
	`
	
	rows2, err := db.Query(query2)
	if err != nil {
		log.Printf("Error querying pg_class: %v", err)
	} else {
		defer rows2.Close()
		
		for rows2.Next() {
			var tableName string
			var tableOID int
			var filePath sql.NullString
			
			err := rows2.Scan(&tableName, &tableOID, &filePath)
			if err != nil {
				log.Printf("Error scanning row: %v", err)
				continue
			}
			
			fmt.Printf("Table: %s (OID: %d)\n", tableName, tableOID)
			if filePath.Valid {
				fmt.Printf("  File Path: %s\n", filePath.String)
			}
			fmt.Println()
		}
	}

	// Method 3: Check for timestamp columns in tables
	fmt.Println("\n3. Tables with created_at/updated_at columns:")
	fmt.Println("----------------------------------------------------")
	
	query3 := `
		SELECT 
			t.table_name,
			array_agg(c.column_name ORDER BY c.ordinal_position) AS timestamp_columns
		FROM information_schema.tables t
		JOIN information_schema.columns c ON t.table_name = c.table_name
		WHERE t.table_schema = 'public'
		AND t.table_type = 'BASE TABLE'
		AND c.column_name IN ('created_at', 'updated_at', 'created', 'updated')
		GROUP BY t.table_name
		ORDER BY t.table_name;
	`
	
	rows3, err := db.Query(query3)
	if err != nil {
		log.Printf("Error querying information_schema: %v", err)
	} else {
		defer rows3.Close()
		
		for rows3.Next() {
			var tableName string
			var timestampColumns sql.NullString
			
			err := rows3.Scan(&tableName, &timestampColumns)
			if err != nil {
				log.Printf("Error scanning row: %v", err)
				continue
			}
			
			fmt.Printf("Table: %s\n", tableName)
			if timestampColumns.Valid {
				fmt.Printf("  Timestamp columns: %s\n", timestampColumns.String)
			}
			
			// Get min created_at for this table if it exists
			minQuery := fmt.Sprintf(`
				SELECT MIN(created_at) 
				FROM %s 
				WHERE created_at IS NOT NULL
			`, tableName)
			
			var minCreated sql.NullTime
			err = db.QueryRow(minQuery).Scan(&minCreated)
			if err == nil && minCreated.Valid {
				fmt.Printf("  Earliest record: %s\n", minCreated.Time.Format(time.RFC3339))
			}
			fmt.Println()
		}
	}

	// Method 4: Check event triggers or DDL logs if available
	fmt.Println("\n4. Database Age and Creation:")
	fmt.Println("----------------------------------------------------")
	
	var dbCreated time.Time
	err = db.QueryRow(`
		SELECT (pg_stat_file('base/'||oid ||'/PG_VERSION')).modification 
		FROM pg_database 
		WHERE datname = current_database()
	`).Scan(&dbCreated)
	
	if err == nil {
		fmt.Printf("Database last modified: %s\n", dbCreated.Format(time.RFC3339))
	} else {
		// Try alternative method
		var dbAge string
		err = db.QueryRow(`SELECT age(datfrozenxid) FROM pg_database WHERE datname = current_database()`).Scan(&dbAge)
		if err == nil {
			fmt.Printf("Database transaction age: %s\n", dbAge)
		}
	}

	// Method 5: List all tables with their sizes (can indicate age)
	fmt.Println("\n5. All Tables with Sizes:")
	fmt.Println("----------------------------------------------------")
	
	query5 := `
		SELECT 
			schemaname,
			tablename,
			pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
			pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size
		FROM pg_tables
		WHERE schemaname = 'public'
		ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
	`
	
	rows5, err := db.Query(query5)
	if err != nil {
		log.Printf("Error querying table sizes: %v", err)
	} else {
		defer rows5.Close()
		
		for rows5.Next() {
			var schemaname, tablename, totalSize, tableSize string
			
			err := rows5.Scan(&schemaname, &tablename, &totalSize, &tableSize)
			if err != nil {
				log.Printf("Error scanning row: %v", err)
				continue
			}
			
			fmt.Printf("%-30s Total: %10s  Table: %10s\n", tablename, totalSize, tableSize)
		}
	}

	fmt.Println("\n=== Summary ===")
	fmt.Println("PostgreSQL doesn't track table creation times by default.")
	fmt.Println("The above information can help estimate when tables were created:")
	fmt.Println("- Statistics show recent activity")
	fmt.Println("- Timestamp columns show earliest data")
	fmt.Println("- Table sizes can indicate age")
	fmt.Println("\nFor accurate creation tracking, consider using event triggers or audit logs.")
}