#!/usr/bin/env python3
"""
Populate PostgreSQL database with motorcycle data from CSV and JSON specs
"""

import os
import json
import csv
import psycopg2
from psycopg2.extras import Json, execute_batch
import uuid
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv

class PostgreSQLMotorcyclePopulator:
    def __init__(self):
        # Load environment variables
        env_path = Path('../website/.env')
        if env_path.exists():
            load_dotenv(env_path)
        else:
            load_dotenv()
        
        # Database connection parameters
        self.db_params = {
            'host': os.getenv('DB_HOST', 'localhost'),
            'port': os.getenv('DB_PORT', '5432'),
            'database': os.getenv('DB_NAME', 'bikenode'),
            'user': os.getenv('DB_USER', 'postgres'),
            'password': os.getenv('DB_PASSWORD', 'postgres')
        }
        
        # Data paths
        self.csv_path = "../database/data/motorcycles.csv"
        self.specs_json_path = "scraped_data/motorcycles/cleaned_motorcycle_data_2025-06-05T12-17-36-410Z.json"
        
    def get_connection(self):
        """Get PostgreSQL connection"""
        try:
            return psycopg2.connect(**self.db_params)
        except Exception as e:
            print(f"Error connecting to PostgreSQL: {e}")
            print("Make sure PostgreSQL is running and credentials are correct")
            raise
    
    def load_specs_to_postgres(self, conn):
        """Load motorcycle specs from JSON into PostgreSQL"""
        print("Loading motorcycle specs from JSON...")
        
        cur = conn.cursor()
        loaded = 0
        
        # Load JSON file
        with open(self.specs_json_path, 'r') as f:
            data = json.load(f)
        
        motorcycles = data.get('motorcycles', [])
        print(f"Found {len(motorcycles)} motorcycles in JSON")
        
        # Prepare batch insert
        insert_query = """
            INSERT INTO motorcycle_specs 
            (id, manufacturer, model, year, category, package, title, source, 
             scraped_at, specifications, images, content, url, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO NOTHING
        """
        
        batch_data = []
        
        for moto in motorcycles:
            try:
                # Only process if we have actual specifications
                specifications = moto.get('specifications', {})
                if not specifications or len(specifications) == 0:
                    continue
                
                # Generate UUID
                spec_id = str(uuid.uuid4())
                
                # Prepare data
                manufacturer = moto.get('manufacturer', '')
                model = moto.get('model', '')
                year = str(moto.get('year', ''))
                
                if not manufacturer or not model:
                    continue
                
                # Clean up model name (remove newlines/tabs)
                model = model.replace('\n', ' ').replace('\t', ' ').strip()
                
                now = datetime.now()
                
                batch_data.append((
                    spec_id,
                    manufacturer,
                    model,
                    year,
                    moto.get('category'),
                    moto.get('package'),
                    moto.get('title'),
                    moto.get('source'),
                    moto.get('scraped_at'),
                    Json(specifications),  # JSONB
                    Json(moto.get('images', [])),  # JSONB
                    moto.get('content'),
                    moto.get('url'),
                    now,
                    now
                ))
                
                loaded += 1
                
                # Insert in batches of 100
                if len(batch_data) >= 100:
                    execute_batch(cur, insert_query, batch_data)
                    conn.commit()
                    print(f"  Loaded {loaded} specs...")
                    batch_data = []
                    
            except Exception as e:
                print(f"  Error loading spec: {e}")
                continue
        
        # Insert remaining data
        if batch_data:
            execute_batch(cur, insert_query, batch_data)
            conn.commit()
        
        print(f"✅ Loaded {loaded} motorcycle specs into PostgreSQL")
        return loaded
    
    def match_motorcycles_to_specs(self, conn):
        """Match existing motorcycles to their specs"""
        print("Matching motorcycles to specs...")
        
        cur = conn.cursor()
        
        # Get all specs
        cur.execute("""
            SELECT id, manufacturer, model, year 
            FROM motorcycle_specs
        """)
        
        specs = cur.fetchall()
        print(f"Processing {len(specs)} specs for matching...")
        
        matched = 0
        
        for spec_id, manufacturer, model, year in specs:
            try:
                # Try to parse year as integer
                try:
                    year_int = int(year)
                except:
                    continue
                
                # Update matching motorcycles
                cur.execute("""
                    UPDATE motorcycles 
                    SET spec_id = %s,
                        updated_at = NOW()
                    WHERE make = %s 
                    AND model = %s 
                    AND year = %s
                    AND spec_id IS NULL
                """, (spec_id, manufacturer, model, year_int))
                
                rows_updated = cur.rowcount
                if rows_updated > 0:
                    matched += rows_updated
                
                # Also try case-insensitive match
                cur.execute("""
                    UPDATE motorcycles 
                    SET spec_id = %s,
                        updated_at = NOW()
                    WHERE LOWER(make) = LOWER(%s)
                    AND LOWER(model) = LOWER(%s)
                    AND year = %s
                    AND spec_id IS NULL
                """, (spec_id, manufacturer, model, year_int))
                
                rows_updated = cur.rowcount
                if rows_updated > 0:
                    matched += rows_updated
                    
            except Exception as e:
                print(f"  Error matching: {e}")
                continue
        
        conn.commit()
        print(f"✅ Matched {matched} motorcycles to specs")
        return matched
    
    def check_existing_data(self, conn):
        """Check what data already exists"""
        cur = conn.cursor()
        
        # Check motorcycles count
        cur.execute("SELECT COUNT(*) FROM motorcycles")
        motorcycle_count = cur.fetchone()[0]
        
        # Check if spec_id column exists
        cur.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'motorcycles' 
            AND column_name = 'spec_id'
        """)
        has_spec_column = cur.fetchone() is not None
        
        # Check if motorcycle_specs table exists
        cur.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'motorcycle_specs'
            )
        """)
        has_specs_table = cur.fetchone()[0]
        
        return {
            'motorcycle_count': motorcycle_count,
            'has_spec_column': has_spec_column,
            'has_specs_table': has_specs_table
        }
    
    def generate_report(self, conn):
        """Generate a report of the database state"""
        cur = conn.cursor()
        
        print("\n📊 DATABASE REPORT")
        print("=" * 60)
        
        # Total counts
        cur.execute("SELECT COUNT(*) FROM motorcycles")
        total_motorcycles = cur.fetchone()[0]
        print(f"Total motorcycles: {total_motorcycles:,}")
        
        cur.execute("SELECT COUNT(*) FROM motorcycle_specs")
        total_specs = cur.fetchone()[0]
        print(f"Total specs: {total_specs:,}")
        
        cur.execute("SELECT COUNT(*) FROM motorcycles WHERE spec_id IS NOT NULL")
        matched_motorcycles = cur.fetchone()[0]
        print(f"Matched motorcycles: {matched_motorcycles:,} ({matched_motorcycles/total_motorcycles*100:.1f}%)")
        
        # Sample matched motorcycles
        print("\n✅ Sample Matched Motorcycles:")
        cur.execute("""
            SELECT m.year, m.make, m.model, m.category, s.id::text
            FROM motorcycles m
            JOIN motorcycle_specs s ON m.spec_id = s.id
            LIMIT 10
        """)
        
        for row in cur.fetchall():
            print(f"  {row[0]} {row[1]} {row[2]} ({row[3]}) -> spec_id: {row[4][:8]}...")
        
        # Top makes with unmatched motorcycles
        print("\n❌ Top Makes with Unmatched Motorcycles:")
        cur.execute("""
            SELECT make, COUNT(*) as unmatched_count
            FROM motorcycles
            WHERE spec_id IS NULL
            GROUP BY make
            ORDER BY unmatched_count DESC
            LIMIT 10
        """)
        
        for row in cur.fetchall():
            print(f"  {row[0]}: {row[1]:,} unmatched")
    
    def run(self):
        """Run the population process"""
        print("🏍️  POPULATING POSTGRESQL MOTORCYCLE DATABASE")
        print("=" * 60)
        
        try:
            # Connect to PostgreSQL
            conn = self.get_connection()
            print("✅ Connected to PostgreSQL")
            
            # Check existing data
            existing = self.check_existing_data(conn)
            print(f"\n📊 Existing data:")
            print(f"  Motorcycles in database: {existing['motorcycle_count']:,}")
            print(f"  Has spec_id column: {existing['has_spec_column']}")
            print(f"  Has motorcycle_specs table: {existing['has_specs_table']}")
            
            if not existing['has_specs_table']:
                print("\n❌ motorcycle_specs table doesn't exist!")
                print("Please run the migration first:")
                print("  psql -h localhost -U postgres -d bikenode < database/migrations/000003_create_motorcycle_specs_table.up.sql")
                return
            
            if not existing['has_spec_column']:
                print("\n❌ spec_id column doesn't exist in motorcycles table!")
                print("Please run the migration first.")
                return
            
            # Load specs
            specs_loaded = self.load_specs_to_postgres(conn)
            
            # Match motorcycles to specs
            matched = self.match_motorcycles_to_specs(conn)
            
            # Generate report
            self.generate_report(conn)
            
            conn.close()
            print("\n✅ Population complete!")
            
        except Exception as e:
            print(f"\n❌ Error: {e}")
            raise

if __name__ == "__main__":
    populator = PostgreSQLMotorcyclePopulator()
    populator.run()