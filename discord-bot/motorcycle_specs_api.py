#!/usr/bin/env python3
"""
Motorcycle Specs API
Provides access to the matched motorcycle specifications database
"""

import sqlite3
import json
from typing import Dict, List, Optional

class MotorcycleSpecsAPI:
    def __init__(self, db_path="motorcycle_specs.db"):
        self.db_path = db_path
    
    def get_connection(self):
        """Get database connection"""
        return sqlite3.connect(self.db_path)
    
    def search_motorcycles(self, query: str, limit: int = 10) -> List[Dict]:
        """Search motorcycles by make, model, or year"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        # Search in both variants and specs
        cursor.execute('''
            SELECT DISTINCT v.year, v.make, v.model, v.package, v.category,
                   s.max_power_hp, s.displacement_cc, s.engine_type,
                   s.max_torque_raw, s.dry_weight_kg
            FROM motorcycle_variants v
            LEFT JOIN motorcycle_specs s ON v.specs_id = s.id
            WHERE v.make LIKE ? OR v.model LIKE ? OR CAST(v.year AS TEXT) LIKE ?
            ORDER BY v.year DESC, v.make, v.model
            LIMIT ?
        ''', (f'%{query}%', f'%{query}%', f'%{query}%', limit))
        
        results = []
        for row in cursor.fetchall():
            results.append({
                'year': row[0],
                'make': row[1],
                'model': row[2],
                'package': row[3],
                'category': row[4],
                'power_hp': row[5],
                'displacement_cc': row[6],
                'engine_type': row[7],
                'torque': row[8],
                'weight_kg': row[9]
            })
        
        conn.close()
        return results
    
    def get_motorcycle_details(self, make: str, model: str, year: int) -> Dict:
        """Get detailed specs for a specific motorcycle"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        # Get specs
        cursor.execute('''
            SELECT * FROM motorcycle_specs 
            WHERE make = ? AND model = ? AND year = ?
        ''', (make, model, year))
        
        spec_row = cursor.fetchone()
        if not spec_row:
            conn.close()
            return {}
        
        # Get column names
        columns = [description[0] for description in cursor.description]
        specs = dict(zip(columns, spec_row))
        
        # Get all variants for this make/model/year
        cursor.execute('''
            SELECT * FROM motorcycle_variants 
            WHERE make = ? AND model = ? AND year = ?
        ''', (make, model, year))
        
        variants = []
        variant_columns = None
        for row in cursor.fetchall():
            if not variant_columns:
                variant_columns = [description[0] for description in cursor.description]
            variants.append(dict(zip(variant_columns, row)))
        
        # Parse full specs JSON if available
        full_specs = {}
        if specs.get('full_specs_json'):
            try:
                full_specs = json.loads(specs['full_specs_json'])
            except:
                pass
        
        conn.close()
        
        return {
            'basic_info': {
                'make': specs['make'],
                'model': specs['model'],
                'year': specs['year'],
                'category': specs['category']
            },
            'engine': {
                'type': specs['engine_type'],
                'displacement_cc': specs['displacement_cc'],
                'bore_stroke': specs['bore_stroke'],
                'compression_ratio': specs['compression_ratio'],
                'cooling_system': specs['cooling_system']
            },
            'performance': {
                'max_power_hp': specs['max_power_hp'],
                'max_power_raw': specs['max_power_raw'],
                'max_torque_raw': specs['max_torque_raw'],
                'top_speed_kmh': specs['top_speed_kmh']
            },
            'physical': {
                'dry_weight_kg': specs['dry_weight_kg'],
                'wet_weight_kg': specs['wet_weight_kg'],
                'seat_height_mm': specs['seat_height_mm'],
                'fuel_capacity_l': specs['fuel_capacity_l'],
                'wheelbase_mm': specs['wheelbase_mm']
            },
            'transmission': {
                'type': specs['transmission'],
                'gears': specs['gears']
            },
            'variants': variants,
            'full_specifications': full_specs,
            'source': {
                'spec_source': specs['spec_source'],
                'scraped_at': specs['scraped_at']
            }
        }
    
    def get_variants_for_model(self, make: str, model: str) -> List[Dict]:
        """Get all variants for a specific make/model across years"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT v.year, v.package, v.category, v.engine_raw,
                   s.max_power_hp, s.displacement_cc,
                   v.has_custom_power, v.custom_power_hp,
                   v.has_custom_displacement, v.custom_displacement_cc,
                   v.variant_notes
            FROM motorcycle_variants v
            LEFT JOIN motorcycle_specs s ON v.specs_id = s.id
            WHERE v.make = ? AND v.model = ?
            ORDER BY v.year DESC
        ''', (make, model))
        
        variants = []
        for row in cursor.fetchall():
            # Use custom specs if available, otherwise base specs
            power_hp = row[7] if row[6] else row[4]  # custom_power_hp if has_custom_power else max_power_hp
            displacement_cc = row[9] if row[8] else row[5]  # custom_displacement_cc if has_custom_displacement else displacement_cc
            
            variants.append({
                'year': row[0],
                'package': row[1],
                'category': row[2],
                'engine_raw': row[3],
                'power_hp': power_hp,
                'displacement_cc': displacement_cc,
                'has_custom_specs': row[6] or row[8],  # has_custom_power or has_custom_displacement
                'variant_notes': row[10]
            })
        
        conn.close()
        return variants
    
    def add_variant_exception(self, make: str, model: str, year: int, package: str, 
                            custom_power_hp: Optional[float] = None, 
                            custom_displacement_cc: Optional[int] = None,
                            notes: str = ""):
        """Add custom specs for a specific variant"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        updates = []
        params = []
        
        if custom_power_hp is not None:
            updates.extend(["has_custom_power = ?", "custom_power_hp = ?"])
            params.extend([True, custom_power_hp])
        
        if custom_displacement_cc is not None:
            updates.extend(["has_custom_displacement = ?", "custom_displacement_cc = ?"])
            params.extend([True, custom_displacement_cc])
        
        if notes:
            updates.append("variant_notes = ?")
            params.append(notes)
        
        if not updates:
            conn.close()
            return False
        
        # Build UPDATE query
        update_sql = f'''
            UPDATE motorcycle_variants 
            SET {", ".join(updates)}
            WHERE make = ? AND model = ? AND year = ? AND package = ?
        '''
        params.extend([make, model, year, package])
        
        cursor.execute(update_sql, params)
        
        success = cursor.rowcount > 0
        conn.commit()
        conn.close()
        
        return success
    
    def get_database_stats(self) -> Dict:
        """Get database statistics"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        # Basic counts
        cursor.execute("SELECT COUNT(*) FROM motorcycle_specs")
        specs_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM motorcycle_variants")
        variants_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM motorcycle_variants WHERE specs_id IS NOT NULL")
        matched_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM motorcycle_variants WHERE has_custom_power = 1 OR has_custom_displacement = 1")
        custom_count = cursor.fetchone()[0]
        
        # Top manufacturers
        cursor.execute('''
            SELECT make, COUNT(*) as count 
            FROM motorcycle_variants 
            GROUP BY make 
            ORDER BY count DESC 
            LIMIT 10
        ''')
        top_makes = [{'make': row[0], 'count': row[1]} for row in cursor.fetchall()]
        
        # Coverage by year
        cursor.execute('''
            SELECT year, COUNT(*) as variants, 
                   SUM(CASE WHEN specs_id IS NOT NULL THEN 1 ELSE 0 END) as with_specs
            FROM motorcycle_variants 
            WHERE year >= 2020
            GROUP BY year 
            ORDER BY year DESC
        ''')
        recent_coverage = [{'year': row[0], 'variants': row[1], 'with_specs': row[2]} for row in cursor.fetchall()]
        
        conn.close()
        
        return {
            'total_specs': specs_count,
            'total_variants': variants_count,
            'matched_variants': matched_count,
            'match_rate': round(matched_count / variants_count * 100, 1),
            'custom_variants': custom_count,
            'top_manufacturers': top_makes,
            'recent_coverage': recent_coverage
        }

# Example usage and testing
if __name__ == "__main__":
    api = MotorcycleSpecsAPI()
    
    print("🏍️  Motorcycle Specs Database API")
    print("=" * 50)
    
    # Get stats
    stats = api.get_database_stats()
    print(f"📊 Database Stats:")
    print(f"   - Total specs: {stats['total_specs']}")
    print(f"   - Total variants: {stats['total_variants']}")
    print(f"   - Match rate: {stats['match_rate']}%")
    print(f"   - Custom variants: {stats['custom_variants']}")
    
    # Search example
    print(f"\n🔍 Search Results for 'Honda':")
    results = api.search_motorcycles("Honda", limit=5)
    for result in results:
        print(f"   {result['year']} {result['make']} {result['model']} - {result['power_hp']}hp")
    
    # Detail example
    if results:
        first = results[0]
        print(f"\n📋 Details for {first['year']} {first['make']} {first['model']}:")
        details = api.get_motorcycle_details(first['make'], first['model'], first['year'])
        print(f"   Engine: {details['engine']['type']}")
        print(f"   Power: {details['performance']['max_power_hp']}hp")
        print(f"   Displacement: {details['engine']['displacement_cc']}cc")
        print(f"   Variants: {len(details['variants'])}")