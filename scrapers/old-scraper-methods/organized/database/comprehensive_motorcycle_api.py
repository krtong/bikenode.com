#!/usr/bin/env python3
"""
Comprehensive Motorcycle Database API
Provides advanced search and data access for the motorcycle database
"""

import sqlite3
import json
from typing import Dict, List, Optional, Tuple
from pathlib import Path

class ComprehensiveMotorcycleAPI:
    def __init__(self, db_path="comprehensive_motorcycles.db"):
        self.db_path = db_path
        
    def get_connection(self):
        """Get database connection"""
        if not Path(self.db_path).exists():
            raise FileNotFoundError(f"Database not found: {self.db_path}")
        return sqlite3.connect(self.db_path)
    
    def search_motorcycles(self, 
                          query: str = None,
                          manufacturer: str = None, 
                          year_min: int = None,
                          year_max: int = None,
                          category: str = None,
                          min_displacement: int = None,
                          max_displacement: int = None,
                          detailed_specs_only: bool = False,
                          limit: int = 50) -> List[Dict]:
        """Advanced motorcycle search"""
        
        conn = self.get_connection()
        cursor = conn.cursor()
        
        # Build dynamic query
        where_clauses = []
        params = []
        
        base_query = """
            SELECT 
                mv.id as variant_id,
                m.name as manufacturer,
                mm.name as model,
                mv.year,
                mv.package,
                mv.category,
                mv.displacement_cc,
                mv.has_detailed_specs,
                mv.data_quality_score,
                es.max_power_hp,
                es.max_torque_nm,
                ps.dry_weight_kg,
                ps.fuel_capacity_l
            FROM motorcycle_variants mv
            JOIN motorcycle_models mm ON mv.model_id = mm.id
            JOIN manufacturers m ON mm.manufacturer_id = m.id
            LEFT JOIN engine_specs es ON mv.id = es.variant_id
            LEFT JOIN physical_specs ps ON mv.id = ps.variant_id
        """
        
        # Add search conditions
        if query:
            where_clauses.append("(m.name LIKE ? OR mm.name LIKE ?)")
            params.extend([f"%{query}%", f"%{query}%"])
            
        if manufacturer:
            where_clauses.append("m.normalized_name LIKE ?")
            params.append(f"%{manufacturer.lower()}%")
            
        if year_min:
            where_clauses.append("mv.year >= ?")
            params.append(year_min)
            
        if year_max:
            where_clauses.append("mv.year <= ?")
            params.append(year_max)
            
        if category:
            where_clauses.append("mv.category LIKE ?")
            params.append(f"%{category}%")
            
        if min_displacement:
            where_clauses.append("mv.displacement_cc >= ?")
            params.append(min_displacement)
            
        if max_displacement:
            where_clauses.append("mv.displacement_cc <= ?")
            params.append(max_displacement)
            
        if detailed_specs_only:
            where_clauses.append("mv.has_detailed_specs = 1")
        
        # Combine query
        if where_clauses:
            base_query += " WHERE " + " AND ".join(where_clauses)
            
        base_query += " ORDER BY mv.year DESC, m.name, mm.name LIMIT ?"
        params.append(limit)
        
        cursor.execute(base_query, params)
        
        results = []
        for row in cursor.fetchall():
            results.append({
                'variant_id': row[0],
                'manufacturer': row[1],
                'model': row[2],
                'year': row[3],
                'package': row[4],
                'category': row[5],
                'displacement_cc': row[6],
                'has_detailed_specs': bool(row[7]),
                'data_quality_score': row[8],
                'max_power_hp': row[9],
                'max_torque_nm': row[10],
                'dry_weight_kg': row[11],
                'fuel_capacity_l': row[12]
            })
        
        conn.close()
        return results
    
    def get_motorcycle_details(self, variant_id: int) -> Dict:
        """Get complete details for a specific motorcycle variant"""
        
        conn = self.get_connection()
        cursor = conn.cursor()
        
        # Basic info
        cursor.execute("""
            SELECT 
                mv.id, mv.year, mv.package, mv.category,
                mm.name as model, m.name as manufacturer,
                mv.displacement_cc, mv.engine_description,
                mv.has_detailed_specs, mv.data_quality_score,
                mv.source, mv.created_at
            FROM motorcycle_variants mv
            JOIN motorcycle_models mm ON mv.model_id = mm.id
            JOIN manufacturers m ON mm.manufacturer_id = m.id
            WHERE mv.id = ?
        """, (variant_id,))
        
        basic_info = cursor.fetchone()
        if not basic_info:
            conn.close()
            return {}
        
        result = {
            'variant_id': basic_info[0],
            'year': basic_info[1],
            'package': basic_info[2],
            'category': basic_info[3],
            'model': basic_info[4],
            'manufacturer': basic_info[5],
            'displacement_cc': basic_info[6],
            'engine_description': basic_info[7],
            'has_detailed_specs': bool(basic_info[8]),
            'data_quality_score': basic_info[9],
            'source': basic_info[10],
            'created_at': basic_info[11]
        }
        
        # Engine specs
        cursor.execute("""
            SELECT type, displacement_cc, max_power_hp, max_power_kw, max_power_rpm,
                   max_torque_nm, max_torque_rpm, compression_ratio, cooling_system,
                   fuel_system, ignition_system, starting_system
            FROM engine_specs WHERE variant_id = ?
        """, (variant_id,))
        
        engine_spec = cursor.fetchone()
        if engine_spec:
            result['engine'] = {
                'type': engine_spec[0],
                'displacement_cc': engine_spec[1],
                'max_power_hp': engine_spec[2],
                'max_power_kw': engine_spec[3],
                'max_power_rpm': engine_spec[4],
                'max_torque_nm': engine_spec[5],
                'max_torque_rpm': engine_spec[6],
                'compression_ratio': engine_spec[7],
                'cooling_system': engine_spec[8],
                'fuel_system': engine_spec[9],
                'ignition_system': engine_spec[10],
                'starting_system': engine_spec[11]
            }
        
        # Physical specs
        cursor.execute("""
            SELECT dry_weight_kg, wet_weight_kg, length_mm, width_mm, height_mm,
                   wheelbase_mm, seat_height_mm, ground_clearance_mm,
                   fuel_capacity_l, fuel_capacity_gal
            FROM physical_specs WHERE variant_id = ?
        """, (variant_id,))
        
        physical_spec = cursor.fetchone()
        if physical_spec:
            result['physical'] = {
                'dry_weight_kg': physical_spec[0],
                'wet_weight_kg': physical_spec[1],
                'length_mm': physical_spec[2],
                'width_mm': physical_spec[3],
                'height_mm': physical_spec[4],
                'wheelbase_mm': physical_spec[5],
                'seat_height_mm': physical_spec[6],
                'ground_clearance_mm': physical_spec[7],
                'fuel_capacity_l': physical_spec[8],
                'fuel_capacity_gal': physical_spec[9]
            }
        
        # Transmission specs
        cursor.execute("""
            SELECT type, gears, final_drive, clutch_type
            FROM transmission_specs WHERE variant_id = ?
        """, (variant_id,))
        
        transmission_spec = cursor.fetchone()
        if transmission_spec:
            result['transmission'] = {
                'type': transmission_spec[0],
                'gears': transmission_spec[1],
                'final_drive': transmission_spec[2],
                'clutch_type': transmission_spec[3]
            }
        
        # Images
        cursor.execute("""
            SELECT url, alt_text, image_type, width, height, is_primary
            FROM motorcycle_images 
            WHERE variant_id = ?
            ORDER BY is_primary DESC, display_order
        """, (variant_id,))
        
        images = []
        for img_row in cursor.fetchall():
            images.append({
                'url': img_row[0],
                'alt_text': img_row[1],
                'image_type': img_row[2],
                'width': img_row[3],
                'height': img_row[4],
                'is_primary': bool(img_row[5])
            })
        
        result['images'] = images
        
        conn.close()
        return result
    
    def get_model_variants(self, manufacturer: str, model: str) -> List[Dict]:
        """Get all variants for a specific model"""
        
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT 
                mv.id, mv.year, mv.package, mv.category,
                mv.displacement_cc, mv.has_detailed_specs,
                es.max_power_hp, ps.dry_weight_kg
            FROM motorcycle_variants mv
            JOIN motorcycle_models mm ON mv.model_id = mm.id
            JOIN manufacturers m ON mm.manufacturer_id = m.id
            LEFT JOIN engine_specs es ON mv.id = es.variant_id
            LEFT JOIN physical_specs ps ON mv.id = ps.variant_id
            WHERE m.normalized_name LIKE ? AND mm.normalized_name LIKE ?
            ORDER BY mv.year DESC, mv.package
        """, (f"%{manufacturer.lower()}%", f"%{model.lower()}%"))
        
        variants = []
        for row in cursor.fetchall():
            variants.append({
                'variant_id': row[0],
                'year': row[1],
                'package': row[2],
                'category': row[3],
                'displacement_cc': row[4],
                'has_detailed_specs': bool(row[5]),
                'max_power_hp': row[6],
                'dry_weight_kg': row[7]
            })
        
        conn.close()
        return variants
    
    def get_database_stats(self) -> Dict:
        """Get comprehensive database statistics"""
        
        conn = self.get_connection()
        cursor = conn.cursor()
        
        # Basic counts
        cursor.execute("SELECT COUNT(*) FROM manufacturers")
        manufacturer_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM motorcycle_models")
        model_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM motorcycle_variants")
        variant_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM motorcycle_variants WHERE has_detailed_specs = 1")
        detailed_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM motorcycle_images")
        image_count = cursor.fetchone()[0]
        
        # Year range
        cursor.execute("SELECT MIN(year), MAX(year) FROM motorcycle_variants")
        year_range = cursor.fetchone()
        
        # Top manufacturers by variant count
        cursor.execute("""
            SELECT m.name, COUNT(mv.id) as count
            FROM manufacturers m
            JOIN motorcycle_models mm ON m.id = mm.manufacturer_id
            JOIN motorcycle_variants mv ON mm.id = mv.model_id
            GROUP BY m.id, m.name
            ORDER BY count DESC
            LIMIT 10
        """)
        top_manufacturers = [{'name': row[0], 'count': row[1]} for row in cursor.fetchall()]
        
        # Category distribution
        cursor.execute("""
            SELECT category, COUNT(*) as count
            FROM motorcycle_variants
            WHERE category IS NOT NULL
            GROUP BY category
            ORDER BY count DESC
            LIMIT 10
        """)
        categories = [{'category': row[0], 'count': row[1]} for row in cursor.fetchall()]
        
        # Displacement distribution
        cursor.execute("""
            SELECT 
                CASE 
                    WHEN displacement_cc <= 125 THEN '≤125cc'
                    WHEN displacement_cc <= 250 THEN '126-250cc'
                    WHEN displacement_cc <= 500 THEN '251-500cc'
                    WHEN displacement_cc <= 750 THEN '501-750cc'
                    WHEN displacement_cc <= 1000 THEN '751-1000cc'
                    WHEN displacement_cc > 1000 THEN '>1000cc'
                    ELSE 'Unknown'
                END as displacement_range,
                COUNT(*) as count
            FROM motorcycle_variants
            GROUP BY displacement_range
            ORDER BY count DESC
        """)
        displacement_dist = [{'range': row[0], 'count': row[1]} for row in cursor.fetchall()]
        
        conn.close()
        
        return {
            'total_manufacturers': manufacturer_count,
            'total_models': model_count,
            'total_variants': variant_count,
            'detailed_specs': detailed_count,
            'total_images': image_count,
            'detailed_percentage': round(detailed_count / variant_count * 100, 1) if variant_count > 0 else 0,
            'year_range': {'min': year_range[0], 'max': year_range[1]},
            'top_manufacturers': top_manufacturers,
            'categories': categories,
            'displacement_distribution': displacement_dist,
            'database_size_mb': round(Path(self.db_path).stat().st_size / 1024 / 1024, 1)
        }
    
    def add_custom_specification(self, variant_id: int, category: str, name: str, value: str, unit: str = None):
        """Add custom specification for future extensibility"""
        
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT OR REPLACE INTO custom_specs 
            (variant_id, spec_category, spec_name, spec_value, spec_unit, data_type)
            VALUES (?, ?, ?, ?, ?, 'string')
        """, (variant_id, category, name, value, unit))
        
        conn.commit()
        conn.close()
        
        return True

# Example usage and demonstration
if __name__ == "__main__":
    api = ComprehensiveMotorcycleAPI()
    
    print("🏍️  COMPREHENSIVE MOTORCYCLE DATABASE API")
    print("=" * 60)
    
    try:
        # Get database stats
        stats = api.get_database_stats()
        print("\\n📊 Database Statistics:")
        print(f"   Manufacturers: {stats['total_manufacturers']:,}")
        print(f"   Models: {stats['total_models']:,}")
        print(f"   Variants: {stats['total_variants']:,}")
        print(f"   With detailed specs: {stats['detailed_specs']:,} ({stats['detailed_percentage']}%)")
        print(f"   Images: {stats['total_images']:,}")
        print(f"   Year range: {stats['year_range']['min']}-{stats['year_range']['max']}")
        print(f"   Database size: {stats['database_size_mb']} MB")
        
        print("\\n🏆 Top 5 Manufacturers:")
        for mfg in stats['top_manufacturers'][:5]:
            print(f"   {mfg['name']}: {mfg['count']:,} variants")
        
        print("\\n📱 Top Categories:")
        for cat in stats['categories'][:5]:
            print(f"   {cat['category']}: {cat['count']:,} variants")
        
        # Search examples
        print("\\n🔍 Search Examples:")
        
        # Search Honda motorcycles
        honda_results = api.search_motorcycles(manufacturer="Honda", limit=5)
        print(f"\\n   Honda motorcycles (showing 5 of many):")
        for bike in honda_results:
            specs = f"{bike['displacement_cc']}cc" if bike['displacement_cc'] else "Unknown cc"
            if bike['max_power_hp']:
                specs += f", {bike['max_power_hp']}hp"
            print(f"   • {bike['year']} {bike['manufacturer']} {bike['model']} - {specs}")
        
        # Search sport bikes
        sport_results = api.search_motorcycles(category="sport", limit=5)
        print(f"\\n   Sport motorcycles (showing 5):")
        for bike in sport_results:
            specs = f"{bike['displacement_cc']}cc" if bike['displacement_cc'] else "Unknown cc"
            print(f"   • {bike['year']} {bike['manufacturer']} {bike['model']} - {specs}")
        
        # Search by displacement
        big_bikes = api.search_motorcycles(min_displacement=1000, limit=5)
        print(f"\\n   Motorcycles 1000cc+ (showing 5):")
        for bike in big_bikes:
            print(f"   • {bike['year']} {bike['manufacturer']} {bike['model']} - {bike['displacement_cc']}cc")
        
        # Get detailed specs for first Honda
        if honda_results:
            first_honda = honda_results[0]
            details = api.get_motorcycle_details(first_honda['variant_id'])
            print(f"\\n📋 Detailed specs for {details['manufacturer']} {details['model']} ({details['year']}):")
            
            if 'engine' in details:
                engine = details['engine']
                print(f"   Engine: {engine.get('type', 'N/A')}")
                if engine.get('max_power_hp'):
                    print(f"   Power: {engine['max_power_hp']} hp")
                if engine.get('max_torque_nm'):
                    print(f"   Torque: {engine['max_torque_nm']} Nm")
            
            if 'physical' in details:
                physical = details['physical']
                if physical.get('dry_weight_kg'):
                    print(f"   Weight: {physical['dry_weight_kg']} kg")
                if physical.get('fuel_capacity_l'):
                    print(f"   Fuel: {physical['fuel_capacity_l']} L")
            
            if details['images']:
                print(f"   Images: {len(details['images'])} available")
        
        print("\\n✅ API demonstration complete!")
        
    except FileNotFoundError:
        print("❌ Database not found. Run the consolidator first.")
    except Exception as e:
        print(f"❌ Error: {e}")