#!/usr/bin/env python3
"""
Motorcycle Specs Matcher
Matches detailed specifications to motorcycle variants based on make/model/year
"""

import json
import sqlite3
import pandas as pd
import re
from pathlib import Path
from datetime import datetime

class MotorcycleSpecsMatcher:
    def __init__(self):
        self.db_path = "motorcycle_specs.db"
        self.variants_csv = "data/bikedata/motorcycles.csv"
        self.specs_json = "../scrapers/scraped_data/motorcycles/cleaned_motorcycle_data_2025-06-05T12-17-36-410Z.json"
        
    def load_specs_data(self):
        """Load the compiled motorcycle specs JSON"""
        with open(self.specs_json, 'r') as f:
            data = json.load(f)
        
        print(f"Loaded specs for {data['total_motorcycles']} motorcycles")
        print(f"Sources: {data['sources']}")
        
        return data['motorcycles']
    
    def load_variants_data(self):
        """Load the motorcycle variants CSV"""
        variants = pd.read_csv(self.variants_csv, on_bad_lines='skip')
        print(f"Loaded {len(variants)} motorcycle variants")
        return variants
    
    def normalize_name(self, text):
        """Normalize motorcycle names for matching"""
        if not text:
            return ""
        
        # Convert to lowercase, remove special chars, normalize spaces
        normalized = str(text).lower()
        normalized = re.sub(r'[^\w\s]', ' ', normalized)
        normalized = re.sub(r'\s+', ' ', normalized).strip()
        
        return normalized
    
    def extract_power_hp(self, power_str):
        """Extract horsepower from power string"""
        if not power_str:
            return None
        
        # Look for patterns like "50 hp", "37.3 kW / 50 hp"
        hp_match = re.search(r'(\d+(?:\.\d+)?)\s*hp', str(power_str), re.IGNORECASE)
        if hp_match:
            return float(hp_match.group(1))
        
        # Convert kW to hp if only kW is available
        kw_match = re.search(r'(\d+(?:\.\d+)?)\s*kW', str(power_str), re.IGNORECASE)
        if kw_match:
            return float(kw_match.group(1)) * 1.341  # kW to hp conversion
        
        return None
    
    def extract_displacement_cc(self, displacement_str):
        """Extract displacement in cc"""
        if not displacement_str:
            return None
        
        # Look for patterns like "652 cc", "600cc", "39.8 cu in"
        cc_match = re.search(r'(\d+(?:\.\d+)?)\s*cc', str(displacement_str), re.IGNORECASE)
        if cc_match:
            return int(float(cc_match.group(1)))
        
        # Convert cubic inches to cc
        ci_match = re.search(r'(\d+(?:\.\d+)?)\s*cu\s*in', str(displacement_str), re.IGNORECASE)
        if ci_match:
            return int(float(ci_match.group(1)) * 16.387)  # cu in to cc
        
        return None
    
    def create_database_schema(self):
        """Create SQLite database schema"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Specs table - one record per unique make/model/year with detailed specs
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS motorcycle_specs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                make TEXT NOT NULL,
                model TEXT NOT NULL,
                year INTEGER NOT NULL,
                category TEXT,
                
                -- Engine specs
                engine_type TEXT,
                displacement_cc INTEGER,
                bore_stroke TEXT,
                compression_ratio TEXT,
                cooling_system TEXT,
                
                -- Performance
                max_power_hp REAL,
                max_power_raw TEXT,
                max_torque_nm REAL,
                max_torque_raw TEXT,
                top_speed_kmh INTEGER,
                
                -- Physical
                dry_weight_kg REAL,
                wet_weight_kg REAL,
                seat_height_mm INTEGER,
                fuel_capacity_l REAL,
                wheelbase_mm INTEGER,
                
                -- Transmission
                transmission TEXT,
                gears INTEGER,
                
                -- Source info
                spec_source TEXT,
                scraped_at TEXT,
                full_specs_json TEXT,
                
                UNIQUE(make, model, year)
            )
        ''')
        
        # Variants table - all motorcycle variants with references to specs
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS motorcycle_variants (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                year INTEGER NOT NULL,
                make TEXT NOT NULL,
                model TEXT NOT NULL,
                package TEXT,
                category TEXT,
                engine_raw TEXT,
                
                -- Foreign key to specs
                specs_id INTEGER,
                
                -- Override flags for variants with different specs
                has_custom_power BOOLEAN DEFAULT FALSE,
                custom_power_hp REAL,
                has_custom_displacement BOOLEAN DEFAULT FALSE,
                custom_displacement_cc INTEGER,
                
                -- Notes about variant differences
                variant_notes TEXT,
                
                FOREIGN KEY (specs_id) REFERENCES motorcycle_specs (id)
            )
        ''')
        
        conn.commit()
        conn.close()
        print("Database schema created")
    
    def insert_specs_data(self, specs_data):
        """Insert specs data into database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        inserted = 0
        for spec in specs_data:
            try:
                # Extract normalized data
                make = spec.get('manufacturer', '').strip()
                model = spec.get('model', '').strip()
                year = int(spec.get('year', 0))
                
                if not make or not model or year < 1900:
                    continue
                
                specifications = spec.get('specifications', {})
                
                # Extract key specs
                power_hp = self.extract_power_hp(specifications.get('Max Power'))
                displacement_cc = self.extract_displacement_cc(specifications.get('Capacity'))
                
                cursor.execute('''
                    INSERT OR REPLACE INTO motorcycle_specs (
                        make, model, year, category,
                        engine_type, displacement_cc, bore_stroke, compression_ratio, cooling_system,
                        max_power_hp, max_power_raw, max_torque_raw,
                        transmission,
                        spec_source, scraped_at, full_specs_json
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    make, model, year, spec.get('category'),
                    specifications.get('Engine'), displacement_cc,
                    specifications.get('Bore x Stroke'), specifications.get('Compression Ratio'),
                    specifications.get('Cooling System'),
                    power_hp, specifications.get('Max Power'), specifications.get('Max Torque'),
                    specifications.get('Transmission'),
                    spec.get('source', 'unknown'), spec.get('scraped_at', ''),
                    json.dumps(specifications)
                ))
                
                inserted += 1
                
            except Exception as e:
                print(f"Error inserting spec for {make} {model} {year}: {e}")
                continue
        
        conn.commit()
        conn.close()
        print(f"Inserted {inserted} motorcycle specs")
    
    def match_variants_to_specs(self, variants_df):
        """Match variants to specs based on make/model/year"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        matched = 0
        for _, variant in variants_df.iterrows():
            try:
                year = int(variant['Year'])
                make = variant['Make'].strip()
                model = variant['Model'].strip()
                
                # Find matching spec
                cursor.execute('''
                    SELECT id FROM motorcycle_specs 
                    WHERE make = ? AND model = ? AND year = ?
                ''', (make, model, year))
                
                spec_match = cursor.fetchone()
                specs_id = spec_match[0] if spec_match else None
                
                # Insert variant
                cursor.execute('''
                    INSERT INTO motorcycle_variants (
                        year, make, model, package, category, engine_raw, specs_id
                    ) VALUES (?, ?, ?, ?, ?, ?, ?)
                ''', (
                    year, make, model, variant.get('Package'), 
                    variant.get('Category'), variant.get('Engine'), specs_id
                ))
                
                if specs_id:
                    matched += 1
                    
            except Exception as e:
                print(f"Error processing variant {variant.get('Make')} {variant.get('Model')}: {e}")
                continue
        
        conn.commit()
        conn.close()
        print(f"Processed variants, {matched} matched to specs")
    
    def run_matching_process(self):
        """Run the complete matching process"""
        print("🏍️  Starting Motorcycle Specs Matching Process")
        print("=" * 60)
        
        # Load data
        print("📊 Loading data...")
        specs_data = self.load_specs_data()
        variants_df = self.load_variants_data()
        
        # Create database
        print("🗄️  Creating database...")
        self.create_database_schema()
        
        # Insert specs
        print("📝 Inserting specifications...")
        self.insert_specs_data(specs_data)
        
        # Match variants
        print("🔗 Matching variants to specs...")
        self.match_variants_to_specs(variants_df)
        
        # Summary
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("SELECT COUNT(*) FROM motorcycle_specs")
        specs_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM motorcycle_variants")
        variants_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM motorcycle_variants WHERE specs_id IS NOT NULL")
        matched_count = cursor.fetchone()[0]
        
        conn.close()
        
        print("\n✅ Matching Process Complete!")
        print(f"📊 Specs in database: {specs_count}")
        print(f"🏍️  Variants processed: {variants_count}")
        print(f"🔗 Variants with specs: {matched_count}")
        print(f"📈 Match rate: {matched_count/variants_count*100:.1f}%")
        print(f"💾 Database saved to: {self.db_path}")

if __name__ == "__main__":
    matcher = MotorcycleSpecsMatcher()
    matcher.run_matching_process()