#!/usr/bin/env python3
"""
Simple Motorcycle Data Consolidator (no pandas dependency)
Consolidates CSV variants and JSON specs into a unified database
"""

import json
import sqlite3
import csv
import re
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional

class SimpleMotorcycleConsolidator:
    def __init__(self, output_db_path="comprehensive_motorcycles.db"):
        self.output_db_path = output_db_path
        
        # Data paths
        self.csv_path = "../database/data/motorcycles.csv"
        self.specs_json_path = "scraped_data/motorcycles/cleaned_motorcycle_data_2025-06-05T12-17-36-410Z.json"
        self.schema_path = "comprehensive_motorcycle_database_schema.sql"
        
        # Caches for performance
        self.manufacturer_cache = {}
        self.model_cache = {}
        
    def normalize_name(self, name: str) -> str:
        """Normalize names for consistent matching"""
        if not name:
            return ""
        
        # Convert to lowercase, remove special chars, normalize spaces
        normalized = str(name).lower()
        normalized = re.sub(r'[^\w\s-]', ' ', normalized)
        normalized = re.sub(r'\s+', ' ', normalized).strip()
        normalized = re.sub(r'-+', '-', normalized)
        
        return normalized
    
    def extract_displacement(self, engine_text: str) -> Optional[int]:
        """Extract displacement in cc from engine description"""
        if not engine_text:
            return None
            
        # Look for patterns like "652 cc", "600cc", "1000 ccm"
        cc_match = re.search(r'(\d+(?:\.\d+)?)\s*cc[m]?', str(engine_text), re.IGNORECASE)
        if cc_match:
            return int(float(cc_match.group(1)))
            
        return None
    
    def create_database(self):
        """Create the comprehensive database with schema"""
        print("Creating comprehensive motorcycle database...")
        
        # Remove existing database
        if Path(self.output_db_path).exists():
            Path(self.output_db_path).unlink()
            
        # Read and execute schema
        with open(self.schema_path, 'r') as f:
            schema_sql = f.read()
            
        conn = sqlite3.connect(self.output_db_path)
        cursor = conn.cursor()
        
        # Execute schema (split by semicolons and execute separately)
        statements = schema_sql.split(';')
        for statement in statements:
            statement = statement.strip()
            if statement:
                try:
                    cursor.execute(statement)
                except Exception as e:
                    print(f"Schema statement failed: {e}")
                    
        conn.commit()
        conn.close()
        print("✅ Database schema created successfully")
    
    def get_or_create_manufacturer(self, conn: sqlite3.Connection, name: str) -> int:
        """Get or create manufacturer, return ID"""
        if not name:
            name = "Unknown"
            
        normalized = self.normalize_name(name)
        
        # Check cache first
        if normalized in self.manufacturer_cache:
            return self.manufacturer_cache[normalized]
            
        cursor = conn.cursor()
        
        # Try to find existing
        cursor.execute("SELECT id FROM manufacturers WHERE normalized_name = ?", (normalized,))
        result = cursor.fetchone()
        
        if result:
            manufacturer_id = result[0]
        else:
            # Create new
            cursor.execute("""
                INSERT INTO manufacturers (name, normalized_name) 
                VALUES (?, ?)
            """, (name, normalized))
            manufacturer_id = cursor.lastrowid
            
        # Cache the result
        self.manufacturer_cache[normalized] = manufacturer_id
        
        return manufacturer_id
    
    def get_or_create_model(self, conn: sqlite3.Connection, manufacturer_id: int, name: str, category: str = None) -> int:
        """Get or create motorcycle model, return ID"""
        if not name:
            name = "Unknown Model"
            
        normalized = self.normalize_name(name)
        
        # Check cache
        cache_key = f"{manufacturer_id}_{normalized}"
        if cache_key in self.model_cache:
            return self.model_cache[cache_key]
            
        cursor = conn.cursor()
        
        # Try to find existing
        cursor.execute("""
            SELECT id FROM motorcycle_models 
            WHERE manufacturer_id = ? AND normalized_name = ?
        """, (manufacturer_id, normalized))
        result = cursor.fetchone()
        
        if result:
            model_id = result[0]
        else:
            # Create new
            cursor.execute("""
                INSERT INTO motorcycle_models (manufacturer_id, name, normalized_name, category) 
                VALUES (?, ?, ?, ?)
            """, (manufacturer_id, name, normalized, category))
            model_id = cursor.lastrowid
            
        # Cache the result
        self.model_cache[cache_key] = model_id
        
        return model_id
    
    def process_csv_data(self, conn: sqlite3.Connection):
        """Process CSV data"""
        print("📊 Processing CSV variants...")
        
        cursor = conn.cursor()
        processed = 0
        errors = 0
        
        with open(self.csv_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            
            for row in reader:
                try:
                    # Extract data
                    year = int(row.get('Year', 0))
                    make = str(row.get('Make', '')).strip()
                    model = str(row.get('Model', '')).strip()
                    package = str(row.get('Package', '')).strip() or None
                    category = str(row.get('Category', '')).strip() or None
                    engine = str(row.get('Engine', '')).strip() or None
                    
                    if year < 1800 or not make or not model:
                        continue
                        
                    # Get or create manufacturer and model
                    manufacturer_id = self.get_or_create_manufacturer(conn, make)
                    model_id = self.get_or_create_model(conn, manufacturer_id, model, category)
                    
                    # Extract displacement
                    displacement_cc = self.extract_displacement(engine)
                    
                    # Insert variant
                    cursor.execute("""
                        INSERT OR IGNORE INTO motorcycle_variants 
                        (model_id, year, package, category, displacement_cc, engine_description, source, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, 'csv', ?)
                    """, (model_id, year, package, category, displacement_cc, engine, datetime.now()))
                    
                    processed += 1
                    
                    if processed % 5000 == 0:
                        print(f"   Processed {processed} CSV variants...")
                        conn.commit()
                        
                except Exception as e:
                    errors += 1
                    if errors < 10:  # Only show first 10 errors
                        print(f"   Warning: Error processing CSV row: {e}")
                    continue
        
        conn.commit()
        print(f"✅ CSV processing complete: {processed:,} processed, {errors} errors")
        return processed
    
    def process_specs_sample(self, conn: sqlite3.Connection, limit=1000):
        """Process a sample of detailed specs (to avoid memory issues)"""
        print("🔧 Processing detailed specifications sample...")
        
        cursor = conn.cursor()
        processed = 0
        
        # Read JSON file incrementally
        with open(self.specs_json_path, 'r') as f:
            data = json.load(f)
            
        motorcycles = data.get('motorcycles', [])[:limit]  # Limit for demo
        
        for spec in motorcycles:
            try:
                # Extract basic info
                make = str(spec.get('manufacturer', '')).strip()
                model = str(spec.get('model', '')).strip()
                year_str = str(spec.get('year', ''))
                category = str(spec.get('category', '')).strip() or None
                
                if not make or not model:
                    continue
                    
                # Parse year
                try:
                    year = int(year_str)
                except:
                    continue
                    
                if year < 1800:
                    continue
                
                # Get or create manufacturer and model
                manufacturer_id = self.get_or_create_manufacturer(conn, make)
                model_id = self.get_or_create_model(conn, manufacturer_id, model, category)
                
                # Find or create variant
                cursor.execute("""
                    SELECT id FROM motorcycle_variants 
                    WHERE model_id = ? AND year = ? 
                    ORDER BY (CASE WHEN package IS NULL THEN 0 ELSE 1 END)
                    LIMIT 1
                """, (model_id, year))
                
                variant_result = cursor.fetchone()
                
                if variant_result:
                    variant_id = variant_result[0]
                    # Update to mark as having detailed specs
                    cursor.execute("""
                        UPDATE motorcycle_variants 
                        SET has_detailed_specs = 1, data_quality_score = 90
                        WHERE id = ?
                    """, (variant_id,))
                else:
                    # Create new variant
                    cursor.execute("""
                        INSERT INTO motorcycle_variants 
                        (model_id, year, category, has_detailed_specs, data_quality_score, source, created_at)
                        VALUES (?, ?, ?, 1, 90, 'scraped_detailed', ?)
                    """, (model_id, year, category, datetime.now()))
                    variant_id = cursor.lastrowid
                
                processed += 1
                
            except Exception as e:
                print(f"   Warning: Error processing spec: {e}")
                continue
        
        conn.commit()
        print(f"✅ Specs processing complete: {processed:,} processed")
        return processed
    
    def generate_report(self, conn: sqlite3.Connection):
        """Generate summary report"""
        cursor = conn.cursor()
        
        # Basic counts
        cursor.execute("SELECT COUNT(*) FROM manufacturers")
        manufacturers = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM motorcycle_models")
        models = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM motorcycle_variants")
        variants = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM motorcycle_variants WHERE has_detailed_specs = 1")
        detailed = cursor.fetchone()[0]
        
        # Top manufacturers
        cursor.execute("""
            SELECT m.name, COUNT(mv.id) as count
            FROM manufacturers m
            JOIN motorcycle_models mm ON m.id = mm.manufacturer_id
            JOIN motorcycle_variants mv ON mm.id = mv.model_id
            GROUP BY m.id, m.name
            ORDER BY count DESC
            LIMIT 5
        """)
        top_makes = cursor.fetchall()
        
        print("\\n📊 CONSOLIDATION REPORT")
        print("=" * 50)
        print(f"Manufacturers: {manufacturers:,}")
        print(f"Models: {models:,}")
        print(f"Variants: {variants:,}")
        print(f"With detailed specs: {detailed:,} ({detailed/variants*100:.1f}%)")
        
        print("\\n🏆 Top Manufacturers:")
        for make, count in top_makes:
            print(f"   {make}: {count:,} variants")
        
        db_size = Path(self.output_db_path).stat().st_size / 1024 / 1024
        print(f"\\n💾 Database size: {db_size:.1f} MB")
    
    def run_consolidation(self):
        """Run the consolidation process"""
        print("🏍️  COMPREHENSIVE MOTORCYCLE DATABASE CONSOLIDATION")
        print("=" * 60)
        
        start_time = datetime.now()
        
        try:
            # Create database
            self.create_database()
            
            # Process data
            conn = sqlite3.connect(self.output_db_path)
            
            csv_count = self.process_csv_data(conn)
            specs_count = self.process_specs_sample(conn, limit=2000)  # Process 2000 detailed specs
            
            # Generate report
            self.generate_report(conn)
            
            conn.close()
            
            duration = datetime.now() - start_time
            print(f"\\n⏱️  Duration: {duration}")
            print(f"💾 Output: {self.output_db_path}")
            
        except Exception as e:
            print(f"❌ Error: {e}")
            raise

if __name__ == "__main__":
    consolidator = SimpleMotorcycleConsolidator()
    consolidator.run_consolidation()