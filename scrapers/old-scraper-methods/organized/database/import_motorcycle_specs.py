#!/usr/bin/env python3
"""
Import motorcycle specifications from JSON file to PostgreSQL database.
Processes the 4670+ motorcycle specs from motorcyclespecs.co.za scraper.
"""

import json
import psycopg2
from psycopg2.extras import RealDictCursor, Json
import sys
import re
from datetime import datetime
from typing import Dict, Any, Optional

class MotorcycleSpecsImporter:
    def __init__(self, db_config: Dict[str, str]):
        """Initialize the importer with database configuration."""
        self.db_config = db_config
        self.conn = None
        self.cursor = None
        
    def connect(self):
        """Connect to PostgreSQL database."""
        try:
            self.conn = psycopg2.connect(
                host=self.db_config.get('host', 'localhost'),
                database=self.db_config.get('database', 'bikenode'),
                user=self.db_config.get('user', 'postgres'),
                password=self.db_config.get('password', ''),
                port=self.db_config.get('port', 5432)
            )
            self.cursor = self.conn.cursor(cursor_factory=RealDictCursor)
            print("✅ Connected to PostgreSQL database")
            return True
        except Exception as e:
            print(f"❌ Error connecting to database: {e}")
            return False
    
    def disconnect(self):
        """Close database connection."""
        if self.cursor:
            self.cursor.close()
        if self.conn:
            self.conn.close()
        print("🔄 Database connection closed")
    
    def create_tables(self):
        """Create the motorcycle_specs tables if they don't exist."""
        try:
            with open('/Users/kevintong/Documents/Code/bikenode.com/scrapers/create_motorcycle_specs_table.sql', 'r') as f:
                sql_script = f.read()
            
            self.cursor.execute(sql_script)
            self.conn.commit()
            print("✅ Database tables created/verified")
            return True
        except Exception as e:
            print(f"❌ Error creating tables: {e}")
            self.conn.rollback()
            return False
    
    def extract_year_from_specs(self, specs: Dict[str, str]) -> Optional[int]:
        """Extract year from specifications, trying multiple fields."""
        year_fields = ['Year', 'Model Year', 'year', 'model_year']
        
        for field in year_fields:
            if field in specs:
                year_str = str(specs[field]).strip()
                # Extract 4-digit year using regex
                year_match = re.search(r'\b(19|20)\d{2}\b', year_str)
                if year_match:
                    return int(year_match.group())
        
        return None
    
    def clean_specification_value(self, value: str) -> str:
        """Clean and standardize specification values."""
        if not value:
            return ""
        
        # Remove excessive whitespace
        value = re.sub(r'\s+', ' ', str(value).strip())
        
        # Remove common unwanted text
        unwanted_patterns = [
            r'\(adsbygoogle = window\.adsbygoogle \|\| \[\]\)\.push\(\{\}\);',
            r'Your personal data will be processed.*',
            r'Cookies, device or similar.*',
            r'Information about your activity.*'
        ]
        
        for pattern in unwanted_patterns:
            value = re.sub(pattern, '', value, flags=re.IGNORECASE | re.DOTALL)
        
        return value.strip()
    
    def extract_specific_specs(self, specs: Dict[str, str]) -> Dict[str, Any]:
        """Extract specific specification fields with standardized keys."""
        spec_mapping = {
            'year': ['Year', 'Model Year', 'year'],
            'engine': ['Engine', 'engine', 'Engine Type'],
            'capacity': ['Capacity', 'capacity', 'Engine Capacity', 'Displacement'],
            'bore_stroke': ['Bore x Stroke', 'bore_stroke', 'Bore & Stroke'],
            'compression_ratio': ['Compression Ratio', 'compression_ratio'],
            'cooling_system': ['Cooling System', 'cooling_system', 'Cooling'],
            'induction': ['Induction', 'induction', 'Fuel System'],
            'ignition': ['Ignition', 'ignition'],
            'starting': ['Starting', 'starting', 'Start System'],
            'max_power': ['Max Power', 'max_power', 'Power', 'Maximum Power'],
            'max_torque': ['Max Torque', 'max_torque', 'Torque', 'Maximum Torque'],
            'transmission': ['Transmission', 'transmission', 'Gearbox'],
            'final_drive': ['Final Drive', 'final_drive', 'Drive'],
            'front_suspension': ['Front Suspension', 'front_suspension'],
            'rear_suspension': ['Rear Suspension', 'rear_suspension'],
            'front_brakes': ['Front Brakes', 'front_brakes'],
            'rear_brakes': ['Rear Brakes', 'rear_brakes'],
            'front_tyre': ['Front Tyre', 'front_tyre', 'Front Tire'],
            'rear_tyre': ['Rear Tyre', 'rear_tyre', 'Rear Tire'],
            'wet_weight': ['Wet-Weight', 'wet_weight', 'Wet Weight'],
            'dry_weight': ['Dry-Weight', 'dry_weight', 'Dry Weight'],
            'fuel_capacity': ['Fuel Capacity', 'fuel_capacity'],
            'seat_height': ['Seat Height', 'seat_height'],
            'wheelbase': ['Wheelbase', 'wheelbase']
        }
        
        extracted = {}
        
        for standard_key, possible_keys in spec_mapping.items():
            for key in possible_keys:
                if key in specs and specs[key]:
                    extracted[standard_key] = self.clean_specification_value(specs[key])
                    break
        
        return extracted
    
    def process_motorcycle_data(self, motorcycle: Dict[str, Any]) -> Dict[str, Any]:
        """Process a single motorcycle entry for database insertion."""
        specs = motorcycle.get('specifications', {})
        extracted_specs = self.extract_specific_specs(specs)
        
        # Clean content and description
        content = self.clean_specification_value(motorcycle.get('content', ''))
        description = self.clean_specification_value(motorcycle.get('description', ''))
        
        # Process images - filter out logos and small images
        images = motorcycle.get('images', [])
        filtered_images = []
        
        for img in images:
            url = img.get('url', '')
            width = img.get('width', 0)
            height = img.get('height', 0)
            
            # Filter out logos, small images, and template images
            if (not any(x in url.lower() for x in ['logo', 'template', 'search.png']) and
                width > 200 and height > 150):
                filtered_images.append(img)
        
        processed_data = {
            'manufacturer': motorcycle.get('manufacturer', ''),
            'model': motorcycle.get('model', ''),
            'title': motorcycle.get('title', ''),
            'description': description,
            'content': content,
            'url': motorcycle.get('url', ''),
            'scraped_at': motorcycle.get('scraped_at'),
            'year': self.extract_year_from_specs(specs),
            'all_specifications': Json(specs),
            'images': Json(filtered_images),
            'metadata': Json(motorcycle.get('metadata', {}))
        }
        
        # Add extracted specific specifications
        processed_data.update(extracted_specs)
        
        return processed_data
    
    def import_motorcycles(self, json_file_path: str) -> bool:
        """Import motorcycles from JSON file to database."""
        try:
            print(f"📂 Loading motorcycle data from {json_file_path}")
            
            with open(json_file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            motorcycles = data.get('motorcycles', [])
            total_count = len(motorcycles)
            
            print(f"📊 Found {total_count} motorcycles to import")
            
            # Prepare the INSERT query
            insert_query = """
                INSERT INTO motorcycle_specs (
                    manufacturer, model, title, description, content, url, scraped_at,
                    year, engine, capacity, bore_stroke, compression_ratio, cooling_system,
                    induction, ignition, starting, max_power, max_torque, transmission,
                    final_drive, front_suspension, rear_suspension, front_brakes, rear_brakes,
                    front_tyre, rear_tyre, wet_weight, dry_weight, fuel_capacity, seat_height,
                    wheelbase, all_specifications, images, metadata
                ) VALUES (
                    %(manufacturer)s, %(model)s, %(title)s, %(description)s, %(content)s, 
                    %(url)s, %(scraped_at)s, %(year)s, %(engine)s, %(capacity)s, 
                    %(bore_stroke)s, %(compression_ratio)s, %(cooling_system)s, 
                    %(induction)s, %(ignition)s, %(starting)s, %(max_power)s, %(max_torque)s,
                    %(transmission)s, %(final_drive)s, %(front_suspension)s, %(rear_suspension)s,
                    %(front_brakes)s, %(rear_brakes)s, %(front_tyre)s, %(rear_tyre)s,
                    %(wet_weight)s, %(dry_weight)s, %(fuel_capacity)s, %(seat_height)s,
                    %(wheelbase)s, %(all_specifications)s, %(images)s, %(metadata)s
                )
                ON CONFLICT (manufacturer, model, COALESCE(year, 0)) 
                DO UPDATE SET
                    title = EXCLUDED.title,
                    description = EXCLUDED.description,
                    content = EXCLUDED.content,
                    url = EXCLUDED.url,
                    scraped_at = EXCLUDED.scraped_at,
                    engine = EXCLUDED.engine,
                    capacity = EXCLUDED.capacity,
                    bore_stroke = EXCLUDED.bore_stroke,
                    compression_ratio = EXCLUDED.compression_ratio,
                    cooling_system = EXCLUDED.cooling_system,
                    induction = EXCLUDED.induction,
                    ignition = EXCLUDED.ignition,
                    starting = EXCLUDED.starting,
                    max_power = EXCLUDED.max_power,
                    max_torque = EXCLUDED.max_torque,
                    transmission = EXCLUDED.transmission,
                    final_drive = EXCLUDED.final_drive,
                    front_suspension = EXCLUDED.front_suspension,
                    rear_suspension = EXCLUDED.rear_suspension,
                    front_brakes = EXCLUDED.front_brakes,
                    rear_brakes = EXCLUDED.rear_brakes,
                    front_tyre = EXCLUDED.front_tyre,
                    rear_tyre = EXCLUDED.rear_tyre,
                    wet_weight = EXCLUDED.wet_weight,
                    dry_weight = EXCLUDED.dry_weight,
                    fuel_capacity = EXCLUDED.fuel_capacity,
                    seat_height = EXCLUDED.seat_height,
                    wheelbase = EXCLUDED.wheelbase,
                    all_specifications = EXCLUDED.all_specifications,
                    images = EXCLUDED.images,
                    metadata = EXCLUDED.metadata,
                    updated_at = CURRENT_TIMESTAMP
            """
            
            successful_imports = 0
            failed_imports = 0
            
            for i, motorcycle in enumerate(motorcycles, 1):
                try:
                    processed_data = self.process_motorcycle_data(motorcycle)
                    self.cursor.execute(insert_query, processed_data)
                    successful_imports += 1
                    
                    if i % 100 == 0:
                        self.conn.commit()
                        print(f"⏳ Processed {i}/{total_count} motorcycles...")
                        
                except Exception as e:
                    failed_imports += 1
                    print(f"❌ Error importing motorcycle {i} ({motorcycle.get('manufacturer', 'unknown')} {motorcycle.get('model', 'unknown')}): {e}")
                    self.conn.rollback()
                    
                    # Continue with next motorcycle
                    continue
            
            # Final commit
            self.conn.commit()
            
            print(f"\n🎉 Import completed!")
            print(f"✅ Successfully imported: {successful_imports} motorcycles")
            print(f"❌ Failed imports: {failed_imports} motorcycles")
            
            # Get final count from database
            self.cursor.execute("SELECT COUNT(*) FROM motorcycle_specs")
            db_count = self.cursor.fetchone()[0]
            print(f"📊 Total motorcycles in database: {db_count}")
            
            return True
            
        except Exception as e:
            print(f"❌ Error during import: {e}")
            if self.conn:
                self.conn.rollback()
            return False
    
    def verify_import(self):
        """Verify the imported data with some basic statistics."""
        try:
            print("\n📈 Verifying imported data...")
            
            # Count by manufacturer
            self.cursor.execute("""
                SELECT manufacturer, COUNT(*) as count 
                FROM motorcycle_specs 
                GROUP BY manufacturer 
                ORDER BY count DESC 
                LIMIT 10
            """)
            
            print("\nTop 10 manufacturers by model count:")
            for row in self.cursor.fetchall():
                print(f"  {row['manufacturer']}: {row['count']} models")
            
            # Count by year
            self.cursor.execute("""
                SELECT year, COUNT(*) as count 
                FROM motorcycle_specs 
                WHERE year IS NOT NULL
                GROUP BY year 
                ORDER BY year DESC 
                LIMIT 10
            """)
            
            print("\nTop 10 years by model count:")
            for row in self.cursor.fetchall():
                print(f"  {row['year']}: {row['count']} models")
            
            # Count with images
            self.cursor.execute("""
                SELECT 
                    COUNT(*) as total,
                    COUNT(CASE WHEN jsonb_array_length(images) > 0 THEN 1 END) as with_images
                FROM motorcycle_specs
            """)
            
            result = self.cursor.fetchone()
            print(f"\nImage statistics:")
            print(f"  Total motorcycles: {result['total']}")
            print(f"  With images: {result['with_images']}")
            print(f"  Without images: {result['total'] - result['with_images']}")
            
        except Exception as e:
            print(f"❌ Error during verification: {e}")


def main():
    """Main function to run the import process."""
    
    # Database configuration
    db_config = {
        'host': 'localhost',
        'database': 'bikenode',
        'user': 'postgres',
        'password': '',  # Update with your password
        'port': 5432
    }
    
    # JSON file path
    json_file_path = '/Users/kevintong/Documents/Code/bikenode.com/scrapers/scraped_data/motorcycles/motorcyclespecs_2025-06-05T10-29-11-191Z.json'
    
    # Create importer instance
    importer = MotorcycleSpecsImporter(db_config)
    
    try:
        # Connect to database
        if not importer.connect():
            sys.exit(1)
        
        # Create tables
        if not importer.create_tables():
            sys.exit(1)
        
        # Import motorcycles
        if not importer.import_motorcycles(json_file_path):
            sys.exit(1)
        
        # Verify import
        importer.verify_import()
        
        print("\n🎉 Motorcycle specifications import completed successfully!")
        
    except KeyboardInterrupt:
        print("\n⏹️ Import interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n💥 Unexpected error: {e}")
        sys.exit(1)
    finally:
        importer.disconnect()


if __name__ == "__main__":
    main()