#!/usr/bin/env python3
"""
Comprehensive Motorcycle Data Consolidator
Consolidates CSV variants and JSON specs into a unified database
"""

import json
import sqlite3
import pandas as pd
import re
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional, Tuple
import logging

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class MotorcycleDataConsolidator:
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
    
    def extract_power_hp(self, power_str: str) -> Optional[float]:
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
    
    def extract_torque_nm(self, torque_str: str) -> Optional[float]:
        """Extract torque in Nm from torque string"""
        if not torque_str:
            return None
            
        # Look for patterns like "62.3 Nm", "46 ft-lb"
        nm_match = re.search(r'(\d+(?:\.\d+)?)\s*Nm', str(torque_str), re.IGNORECASE)
        if nm_match:
            return float(nm_match.group(1))
            
        # Convert ft-lb to Nm
        ftlb_match = re.search(r'(\d+(?:\.\d+)?)\s*ft[-\s]?lb', str(torque_str), re.IGNORECASE)
        if ftlb_match:
            return float(ftlb_match.group(1)) * 1.356  # ft-lb to Nm
            
        return None
    
    def create_database(self):
        """Create the comprehensive database with schema"""
        logger.info("Creating comprehensive motorcycle database...")
        
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
                    logger.warning(f"Schema statement failed: {e}")
                    
        conn.commit()
        conn.close()
        logger.info("Database schema created successfully")
    
    def get_or_create_manufacturer(self, conn: sqlite3.Connection, name: str) -> int:
        """Get or create manufacturer, return ID"""
        if not name:
            name = "Unknown"
            
        normalized = self.normalize_name(name)
        
        # Check cache first
        cache_key = normalized
        if cache_key in self.manufacturer_cache:
            return self.manufacturer_cache[cache_key]
            
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
        self.manufacturer_cache[cache_key] = manufacturer_id
        
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
    
    def load_csv_variants(self) -> pd.DataFrame:
        """Load CSV variants data"""
        logger.info("Loading CSV variants data...")
        
        try:
            df = pd.read_csv(self.csv_path, on_bad_lines='skip')
            logger.info(f"Loaded {len(df)} CSV records")
            return df
        except Exception as e:
            logger.error(f"Failed to load CSV: {e}")
            return pd.DataFrame()
    
    def load_specs_data(self) -> List[Dict]:
        """Load detailed specs JSON data"""
        logger.info("Loading detailed specs data...")
        
        try:
            with open(self.specs_json_path, 'r') as f:
                data = json.load(f)
                
            motorcycles = data.get('motorcycles', [])
            logger.info(f"Loaded {len(motorcycles)} detailed specs")
            return motorcycles
        except Exception as e:
            logger.error(f"Failed to load specs JSON: {e}")
            return []
    
    def process_csv_variants(self, conn: sqlite3.Connection, df: pd.DataFrame):
        """Process and insert CSV variant data"""
        logger.info("Processing CSV variants...")
        
        cursor = conn.cursor()
        processed = 0
        errors = 0
        
        for _, row in df.iterrows():
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
                
                if processed % 1000 == 0:
                    logger.info(f"Processed {processed} CSV variants...")
                    conn.commit()
                    
            except Exception as e:
                errors += 1
                logger.warning(f"Error processing CSV row: {e}")
                continue
        
        conn.commit()
        logger.info(f"CSV processing complete: {processed} processed, {errors} errors")
    
    def process_detailed_specs(self, conn: sqlite3.Connection, specs_data: List[Dict]):
        """Process and insert detailed specifications"""
        logger.info("Processing detailed specifications...")
        
        cursor = conn.cursor()
        processed = 0
        errors = 0
        
        for spec in specs_data:
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
                
                # Check if variant exists, if not create it
                cursor.execute("""
                    SELECT id FROM motorcycle_variants 
                    WHERE model_id = ? AND year = ? AND (package IS NULL OR package = '')
                """, (model_id, year))
                
                variant_result = cursor.fetchone()
                
                if variant_result:
                    variant_id = variant_result[0]
                    # Update to mark as having detailed specs
                    cursor.execute("""
                        UPDATE motorcycle_variants 
                        SET has_detailed_specs = TRUE, data_quality_score = 90, source = 'scraped_detailed'
                        WHERE id = ?
                    """, (variant_id,))
                else:
                    # Create new variant
                    cursor.execute("""
                        INSERT INTO motorcycle_variants 
                        (model_id, year, category, has_detailed_specs, data_quality_score, source, created_at)
                        VALUES (?, ?, ?, TRUE, 90, 'scraped_detailed', ?)
                    """, (model_id, year, category, datetime.now()))
                    variant_id = cursor.lastrowid
                
                # Process specifications
                specifications = spec.get('specifications', {})
                
                # Engine specs
                displacement_cc = self.extract_displacement(specifications.get('Capacity'))
                max_power_hp = self.extract_power_hp(specifications.get('Max Power'))
                max_torque_nm = self.extract_torque_nm(specifications.get('Max Torque'))
                
                if any([displacement_cc, max_power_hp, max_torque_nm]):
                    cursor.execute("""
                        INSERT OR REPLACE INTO engine_specs 
                        (variant_id, type, displacement_cc, max_power_hp, max_torque_nm, 
                         compression_ratio, cooling_system, fuel_system, ignition_system, starting_system)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        variant_id,
                        specifications.get('Engine'),
                        displacement_cc,
                        max_power_hp,
                        max_torque_nm,
                        specifications.get('Compression Ratio'),
                        specifications.get('Cooling System'),
                        specifications.get('Induction'),
                        specifications.get('Ignition'),
                        specifications.get('Starting')
                    ))
                
                # Transmission specs
                transmission_type = specifications.get('Transmission')
                if transmission_type:
                    # Extract gear count
                    gear_match = re.search(r'(\d+)\s*[Ss]peed', transmission_type)
                    gears = int(gear_match.group(1)) if gear_match else None
                    
                    cursor.execute("""
                        INSERT OR REPLACE INTO transmission_specs 
                        (variant_id, type, gears, final_drive)
                        VALUES (?, ?, ?, ?)
                    """, (variant_id, transmission_type, gears, specifications.get('Final Drive')))
                
                # Physical specs
                weight_str = specifications.get('Wet-Weight') or specifications.get('Dry-Weight')
                fuel_str = specifications.get('Fuel Capacity')
                
                if weight_str or fuel_str:
                    # Extract weight in kg
                    weight_kg = None
                    if weight_str:
                        kg_match = re.search(r'(\d+(?:\.\d+)?)\s*kg', weight_str, re.IGNORECASE)
                        if kg_match:
                            weight_kg = float(kg_match.group(1))
                    
                    # Extract fuel capacity in liters
                    fuel_l = None
                    if fuel_str:
                        l_match = re.search(r'(\d+(?:\.\d+)?)\s*[Ll]itres?', fuel_str, re.IGNORECASE)
                        if l_match:
                            fuel_l = float(l_match.group(1))
                    
                    cursor.execute("""
                        INSERT OR REPLACE INTO physical_specs 
                        (variant_id, wet_weight_kg, fuel_capacity_l)
                        VALUES (?, ?, ?)
                    """, (variant_id, weight_kg, fuel_l))
                
                # Process images if available
                images = spec.get('images', [])
                for i, img in enumerate(images[:10]):  # Limit to 10 images
                    if img.get('url') and 'logo' not in img.get('url', '').lower():
                        cursor.execute("""
                            INSERT OR IGNORE INTO motorcycle_images 
                            (variant_id, url, alt_text, width, height, display_order, is_primary)
                            VALUES (?, ?, ?, ?, ?, ?, ?)
                        """, (
                            variant_id,
                            img.get('url'),
                            img.get('alt'),
                            img.get('width'),
                            img.get('height'),
                            i,
                            i == 0  # First image is primary
                        ))
                
                processed += 1
                
                if processed % 100 == 0:
                    logger.info(f"Processed {processed} detailed specs...")
                    conn.commit()
                    
            except Exception as e:
                errors += 1
                logger.warning(f"Error processing spec: {e}")
                continue
        
        conn.commit()
        logger.info(f"Detailed specs processing complete: {processed} processed, {errors} errors")
    
    def update_data_quality_scores(self, conn: sqlite3.Connection):
        """Calculate and update data quality scores"""
        logger.info("Updating data quality scores...")
        
        cursor = conn.cursor()
        
        cursor.execute("""
            UPDATE motorcycle_variants 
            SET data_quality_score = (
                CASE 
                    WHEN has_detailed_specs THEN 90
                    WHEN displacement_cc IS NOT NULL THEN 60
                    ELSE 30
                END
            ) +
            (CASE WHEN has_images THEN 10 ELSE 0 END)
        """)
        
        conn.commit()
        logger.info("Data quality scores updated")
    
    def generate_summary_report(self, conn: sqlite3.Connection) -> Dict:
        """Generate a summary report of the consolidated data"""
        cursor = conn.cursor()
        
        # Basic counts
        cursor.execute("SELECT COUNT(*) FROM manufacturers")
        manufacturer_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM motorcycle_models")
        model_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM motorcycle_variants")
        variant_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM motorcycle_variants WHERE has_detailed_specs = TRUE")
        detailed_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM motorcycle_variants WHERE has_images = TRUE")
        with_images_count = cursor.fetchone()[0]
        
        # Year distribution
        cursor.execute("""
            SELECT 
                CASE 
                    WHEN year >= 2020 THEN '2020+'
                    WHEN year >= 2010 THEN '2010-2019'
                    WHEN year >= 2000 THEN '2000-2009'
                    WHEN year >= 1990 THEN '1990-1999'
                    ELSE 'Pre-1990'
                END as era,
                COUNT(*) as count
            FROM motorcycle_variants 
            GROUP BY era
            ORDER BY era DESC
        """)
        year_distribution = dict(cursor.fetchall())
        
        # Top manufacturers
        cursor.execute("""
            SELECT m.name, COUNT(mv.id) as count
            FROM manufacturers m
            JOIN motorcycle_models mm ON m.id = mm.manufacturer_id
            JOIN motorcycle_variants mv ON mm.id = mv.model_id
            GROUP BY m.id, m.name
            ORDER BY count DESC
            LIMIT 10
        """)
        top_manufacturers = dict(cursor.fetchall())
        
        report = {
            'total_manufacturers': manufacturer_count,
            'total_models': model_count,
            'total_variants': variant_count,
            'detailed_specs': detailed_count,
            'with_images': with_images_count,
            'detailed_percentage': round(detailed_count / variant_count * 100, 1),
            'images_percentage': round(with_images_count / variant_count * 100, 1),
            'year_distribution': year_distribution,
            'top_manufacturers': top_manufacturers,
            'database_size_mb': round(Path(self.output_db_path).stat().st_size / 1024 / 1024, 1)
        }
        
        return report
    
    def run_consolidation(self):
        """Run the complete data consolidation process"""
        logger.info("🏍️  Starting Comprehensive Motorcycle Data Consolidation")
        logger.info("=" * 70)
        
        start_time = datetime.now()
        
        try:
            # Step 1: Create database
            self.create_database()
            
            # Step 2: Load data
            csv_df = self.load_csv_variants()
            specs_data = self.load_specs_data()
            
            # Step 3: Process data
            conn = sqlite3.connect(self.output_db_path)
            
            if not csv_df.empty:
                self.process_csv_variants(conn, csv_df)
            
            if specs_data:
                self.process_detailed_specs(conn, specs_data)
            
            # Step 4: Update quality scores
            self.update_data_quality_scores(conn)
            
            # Step 5: Generate report
            report = self.generate_summary_report(conn)
            
            conn.close()
            
            # Print results
            duration = datetime.now() - start_time
            
            logger.info("\\n✅ Consolidation Complete!")
            logger.info(f"⏱️  Duration: {duration}")
            logger.info(f"💾 Database: {self.output_db_path} ({report['database_size_mb']} MB)")
            logger.info("\\n📊 Summary:")
            logger.info(f"   - Manufacturers: {report['total_manufacturers']:,}")
            logger.info(f"   - Models: {report['total_models']:,}")
            logger.info(f"   - Variants: {report['total_variants']:,}")
            logger.info(f"   - With detailed specs: {report['detailed_specs']:,} ({report['detailed_percentage']}%)")
            logger.info(f"   - With images: {report['with_images']:,} ({report['images_percentage']}%)")
            
            logger.info("\\n🏆 Top Manufacturers:")
            for make, count in list(report['top_manufacturers'].items())[:5]:
                logger.info(f"   - {make}: {count:,} variants")
            
            logger.info("\\n📅 Year Distribution:")
            for era, count in report['year_distribution'].items():
                logger.info(f"   - {era}: {count:,} variants")
            
            return report
            
        except Exception as e:
            logger.error(f"Consolidation failed: {e}")
            raise

if __name__ == "__main__":
    consolidator = MotorcycleDataConsolidator()
    report = consolidator.run_consolidation()