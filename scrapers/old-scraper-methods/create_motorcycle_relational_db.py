#!/usr/bin/env python3
"""
Create relational database from motorcycles.csv and cleaned specs JSON
- Table 1: motorcycles (from CSV) with spec_id column
- Table 2: motorcycle_specs (from JSON)
"""

import sqlite3
import csv
import json
import re
from pathlib import Path
from datetime import datetime

class MotorcycleRelationalDB:
    def __init__(self, db_path="motorcycle_relational.db"):
        self.db_path = db_path
        self.csv_path = "../database/data/motorcycles.csv"
        self.specs_json_path = "scraped_data/motorcycles/cleaned_motorcycle_data_2025-06-05T12-17-36-410Z.json"
        
    def create_database(self):
        """Create the database schema"""
        print("Creating relational database...")
        
        # Remove existing database
        if Path(self.db_path).exists():
            Path(self.db_path).unlink()
            
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Table 1: motorcycles (from CSV with added spec_id column)
        cursor.execute("""
            CREATE TABLE motorcycles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                year INTEGER,
                make TEXT,
                model TEXT,
                package TEXT,
                category TEXT,
                engine TEXT,
                spec_id INTEGER,  -- Link to motorcycle_specs table
                FOREIGN KEY (spec_id) REFERENCES motorcycle_specs (id)
            )
        """)
        
        # Table 2: motorcycle_specs (from JSON)
        cursor.execute("""
            CREATE TABLE motorcycle_specs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                manufacturer TEXT,
                model TEXT,
                year TEXT,
                category TEXT,
                package TEXT,
                title TEXT,
                source TEXT,
                scraped_at TEXT,
                specifications TEXT,  -- JSON blob of all specifications
                images TEXT,         -- JSON array of images
                content TEXT,        -- Full text content
                url TEXT
            )
        """)
        
        # Create indexes for efficient matching
        cursor.execute("CREATE INDEX idx_motorcycles_match ON motorcycles(make, model, year)")
        cursor.execute("CREATE INDEX idx_specs_match ON motorcycle_specs(manufacturer, model, year)")
        
        conn.commit()
        conn.close()
        print("✅ Database schema created")
    
    def normalize_name(self, name):
        """Normalize names for matching"""
        if not name:
            return ""
        # Convert to lowercase, remove special characters
        normalized = str(name).lower().strip()
        normalized = re.sub(r'[^\w\s-]', ' ', normalized)
        normalized = re.sub(r'\s+', ' ', normalized).strip()
        return normalized
    
    def load_csv_data(self, conn):
        """Load motorcycles.csv into the database"""
        print("Loading motorcycles.csv...")
        
        cursor = conn.cursor()
        loaded = 0
        
        with open(self.csv_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            
            for row in reader:
                try:
                    cursor.execute("""
                        INSERT INTO motorcycles (year, make, model, package, category, engine, spec_id)
                        VALUES (?, ?, ?, ?, ?, ?, NULL)
                    """, (
                        int(row.get('Year', 0)) if row.get('Year') else None,
                        row.get('Make', '').strip(),
                        row.get('Model', '').strip(),
                        row.get('Package', '').strip() or None,
                        row.get('Category', '').strip() or None,
                        row.get('Engine', '').strip() or None
                    ))
                    loaded += 1
                    
                    if loaded % 5000 == 0:
                        print(f"  Loaded {loaded} motorcycles...")
                        conn.commit()
                        
                except Exception as e:
                    print(f"  Error loading row: {e}")
                    continue
        
        conn.commit()
        print(f"✅ Loaded {loaded} motorcycles from CSV")
        return loaded
    
    def load_specs_data(self, conn):
        """Load specs from JSON into the database"""
        print("Loading motorcycle specs from JSON...")
        
        cursor = conn.cursor()
        loaded = 0
        
        # Load JSON file
        with open(self.specs_json_path, 'r') as f:
            data = json.load(f)
        
        motorcycles = data.get('motorcycles', [])
        print(f"  Found {len(motorcycles)} motorcycles in JSON")
        
        for moto in motorcycles:
            try:
                # Extract specifications that have actual content
                specifications = moto.get('specifications', {})
                
                # Only insert if we have actual specifications
                if specifications and len(specifications) > 0:
                    cursor.execute("""
                        INSERT INTO motorcycle_specs 
                        (manufacturer, model, year, category, package, title, source, 
                         scraped_at, specifications, images, content, url)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        moto.get('manufacturer', '').strip(),
                        moto.get('model', '').strip(),
                        str(moto.get('year', '')),
                        moto.get('category', '').strip() or None,
                        moto.get('package', '').strip() or None,
                        moto.get('title', '').strip() or None,
                        moto.get('source', ''),
                        moto.get('scraped_at', ''),
                        json.dumps(specifications),
                        json.dumps(moto.get('images', [])),
                        moto.get('content', ''),
                        moto.get('url', '')
                    ))
                    loaded += 1
                    
                    if loaded % 500 == 0:
                        print(f"  Loaded {loaded} specs...")
                        conn.commit()
                        
            except Exception as e:
                print(f"  Error loading spec: {e}")
                continue
        
        conn.commit()
        print(f"✅ Loaded {loaded} motorcycle specs from JSON")
        return loaded
    
    def match_specs_to_motorcycles(self, conn):
        """Match specs to motorcycles and update spec_id column"""
        print("Matching specs to motorcycles...")
        
        cursor = conn.cursor()
        matched = 0
        
        # Get all specs with normalized names for matching
        cursor.execute("""
            SELECT id, manufacturer, model, year 
            FROM motorcycle_specs 
            WHERE specifications != '{}'
        """)
        
        specs = cursor.fetchall()
        print(f"  Processing {len(specs)} specs for matching...")
        
        for spec_id, manufacturer, model, year in specs:
            # Normalize for matching
            norm_make = self.normalize_name(manufacturer)
            norm_model = self.normalize_name(model)
            
            # Try to parse year as integer
            try:
                year_int = int(year)
            except:
                continue
            
            # Update matching motorcycles
            cursor.execute("""
                UPDATE motorcycles 
                SET spec_id = ?
                WHERE LOWER(make) = ? 
                AND LOWER(model) = ? 
                AND year = ?
                AND spec_id IS NULL
            """, (spec_id, norm_make, norm_model, year_int))
            
            rows_updated = cursor.rowcount
            if rows_updated > 0:
                matched += rows_updated
                
            # Also try matching without normalized names for exact matches
            cursor.execute("""
                UPDATE motorcycles 
                SET spec_id = ?
                WHERE make = ? 
                AND model = ? 
                AND year = ?
                AND spec_id IS NULL
            """, (spec_id, manufacturer, model, year_int))
            
            rows_updated = cursor.rowcount
            if rows_updated > 0:
                matched += rows_updated
        
        conn.commit()
        print(f"✅ Matched {matched} motorcycles to specs")
        return matched
    
    def generate_report(self, conn):
        """Generate a report of the database"""
        cursor = conn.cursor()
        
        # Total counts
        cursor.execute("SELECT COUNT(*) FROM motorcycles")
        total_motorcycles = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM motorcycle_specs")
        total_specs = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM motorcycles WHERE spec_id IS NOT NULL")
        matched_motorcycles = cursor.fetchone()[0]
        
        # Sample matched motorcycles
        cursor.execute("""
            SELECT m.year, m.make, m.model, m.category, s.id as spec_id
            FROM motorcycles m
            JOIN motorcycle_specs s ON m.spec_id = s.id
            LIMIT 10
        """)
        sample_matches = cursor.fetchall()
        
        # Unmatched counts by make
        cursor.execute("""
            SELECT make, COUNT(*) as unmatched_count
            FROM motorcycles
            WHERE spec_id IS NULL
            GROUP BY make
            ORDER BY unmatched_count DESC
            LIMIT 10
        """)
        unmatched_by_make = cursor.fetchall()
        
        print("\n📊 DATABASE REPORT")
        print("=" * 60)
        print(f"Total motorcycles: {total_motorcycles:,}")
        print(f"Total specs: {total_specs:,}")
        print(f"Matched motorcycles: {matched_motorcycles:,} ({matched_motorcycles/total_motorcycles*100:.1f}%)")
        print(f"Unmatched motorcycles: {total_motorcycles - matched_motorcycles:,}")
        
        print("\n✅ Sample Matched Motorcycles:")
        for year, make, model, category, spec_id in sample_matches:
            print(f"  {year} {make} {model} ({category}) -> spec_id: {spec_id}")
        
        print("\n❌ Top Makes with Unmatched Motorcycles:")
        for make, count in unmatched_by_make:
            print(f"  {make}: {count:,} unmatched")
        
        # Database size
        db_size = Path(self.db_path).stat().st_size / 1024 / 1024
        print(f"\n💾 Database size: {db_size:.1f} MB")
    
    def run(self):
        """Run the complete process"""
        print("🏍️  CREATING MOTORCYCLE RELATIONAL DATABASE")
        print("=" * 60)
        
        start_time = datetime.now()
        
        # Create database
        self.create_database()
        
        # Connect and load data
        conn = sqlite3.connect(self.db_path)
        
        # Load data
        csv_count = self.load_csv_data(conn)
        specs_count = self.load_specs_data(conn)
        
        # Match specs to motorcycles
        matched_count = self.match_specs_to_motorcycles(conn)
        
        # Generate report
        self.generate_report(conn)
        
        conn.close()
        
        duration = datetime.now() - start_time
        print(f"\n⏱️  Total time: {duration}")
        print(f"✅ Database created: {self.db_path}")

if __name__ == "__main__":
    db_builder = MotorcycleRelationalDB()
    db_builder.run()