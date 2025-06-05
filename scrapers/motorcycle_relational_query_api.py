#!/usr/bin/env python3
"""
Query API for the relational motorcycle database
"""

import sqlite3
import json
from typing import Dict, List, Optional

class MotorcycleRelationalAPI:
    def __init__(self, db_path="motorcycle_relational.db"):
        self.db_path = db_path
        
    def get_connection(self):
        """Get database connection"""
        return sqlite3.connect(self.db_path)
    
    def get_motorcycle_with_specs(self, motorcycle_id: int) -> Dict:
        """Get a motorcycle with its specifications if available"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        # Get motorcycle data
        cursor.execute("""
            SELECT m.*, s.specifications, s.images
            FROM motorcycles m
            LEFT JOIN motorcycle_specs s ON m.spec_id = s.id
            WHERE m.id = ?
        """, (motorcycle_id,))
        
        row = cursor.fetchone()
        if not row:
            conn.close()
            return {}
        
        result = {
            'id': row[0],
            'year': row[1],
            'make': row[2],
            'model': row[3],
            'package': row[4],
            'category': row[5],
            'engine': row[6],
            'spec_id': row[7],
            'specifications': json.loads(row[8]) if row[8] else None,
            'images': json.loads(row[9]) if row[9] else None
        }
        
        conn.close()
        return result
    
    def search_motorcycles(self, make: str = None, model: str = None, 
                          year: int = None, with_specs_only: bool = False,
                          limit: int = 50) -> List[Dict]:
        """Search motorcycles with optional filters"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        query = """
            SELECT m.id, m.year, m.make, m.model, m.package, m.category, 
                   m.engine, m.spec_id, 
                   CASE WHEN m.spec_id IS NOT NULL THEN 1 ELSE 0 END as has_specs
            FROM motorcycles m
        """
        
        where_clauses = []
        params = []
        
        if make:
            where_clauses.append("m.make LIKE ?")
            params.append(f"%{make}%")
            
        if model:
            where_clauses.append("m.model LIKE ?")
            params.append(f"%{model}%")
            
        if year:
            where_clauses.append("m.year = ?")
            params.append(year)
            
        if with_specs_only:
            where_clauses.append("m.spec_id IS NOT NULL")
        
        if where_clauses:
            query += " WHERE " + " AND ".join(where_clauses)
            
        query += " ORDER BY m.year DESC, m.make, m.model LIMIT ?"
        params.append(limit)
        
        cursor.execute(query, params)
        
        results = []
        for row in cursor.fetchall():
            results.append({
                'id': row[0],
                'year': row[1],
                'make': row[2],
                'model': row[3],
                'package': row[4],
                'category': row[5],
                'engine': row[6],
                'spec_id': row[7],
                'has_specs': bool(row[8])
            })
        
        conn.close()
        return results
    
    def get_specs_for_motorcycle(self, make: str, model: str, year: int) -> Optional[Dict]:
        """Try to find specs for a specific motorcycle"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        # First try exact match
        cursor.execute("""
            SELECT id, specifications, images, title, url
            FROM motorcycle_specs
            WHERE manufacturer = ? AND model = ? AND year = ?
        """, (make, model, str(year)))
        
        row = cursor.fetchone()
        
        # If no exact match, try with cleaned model names
        if not row:
            cursor.execute("""
                SELECT id, specifications, images, title, url
                FROM motorcycle_specs
                WHERE manufacturer = ? 
                AND REPLACE(REPLACE(model, '\n', ''), '\t', '') = ?
                AND year = ?
            """, (make, model.replace('\n', '').replace('\t', ''), str(year)))
            
            row = cursor.fetchone()
        
        if row:
            result = {
                'spec_id': row[0],
                'specifications': json.loads(row[1]) if row[1] else {},
                'images': json.loads(row[2]) if row[2] else [],
                'title': row[3],
                'url': row[4]
            }
        else:
            result = None
            
        conn.close()
        return result
    
    def get_database_stats(self) -> Dict:
        """Get database statistics"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        # Total counts
        cursor.execute("SELECT COUNT(*) FROM motorcycles")
        total_motorcycles = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM motorcycle_specs")
        total_specs = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM motorcycles WHERE spec_id IS NOT NULL")
        matched_motorcycles = cursor.fetchone()[0]
        
        # Top manufacturers
        cursor.execute("""
            SELECT make, COUNT(*) as count
            FROM motorcycles
            GROUP BY make
            ORDER BY count DESC
            LIMIT 10
        """)
        top_manufacturers = [{'make': row[0], 'count': row[1]} for row in cursor.fetchall()]
        
        # Motorcycles with specs by year
        cursor.execute("""
            SELECT year, 
                   COUNT(*) as total,
                   SUM(CASE WHEN spec_id IS NOT NULL THEN 1 ELSE 0 END) as with_specs
            FROM motorcycles
            WHERE year >= 2020
            GROUP BY year
            ORDER BY year DESC
        """)
        recent_years = []
        for row in cursor.fetchall():
            recent_years.append({
                'year': row[0],
                'total': row[1],
                'with_specs': row[2],
                'percentage': round(row[2] / row[1] * 100, 1) if row[1] > 0 else 0
            })
        
        conn.close()
        
        return {
            'total_motorcycles': total_motorcycles,
            'total_specs': total_specs,
            'matched_motorcycles': matched_motorcycles,
            'match_percentage': round(matched_motorcycles / total_motorcycles * 100, 2),
            'top_manufacturers': top_manufacturers,
            'recent_years': recent_years
        }

# Example usage
if __name__ == "__main__":
    api = MotorcycleRelationalAPI()
    
    print("🏍️  MOTORCYCLE RELATIONAL DATABASE API")
    print("=" * 60)
    
    # Get database stats
    stats = api.get_database_stats()
    print(f"\n📊 Database Statistics:")
    print(f"Total motorcycles: {stats['total_motorcycles']:,}")
    print(f"Total specs: {stats['total_specs']:,}")
    print(f"Matched motorcycles: {stats['matched_motorcycles']:,} ({stats['match_percentage']}%)")
    
    print(f"\n🏆 Top Manufacturers:")
    for mfg in stats['top_manufacturers'][:5]:
        print(f"  {mfg['make']}: {mfg['count']:,} motorcycles")
    
    print(f"\n📅 Recent Years Coverage:")
    for year_data in stats['recent_years']:
        print(f"  {year_data['year']}: {year_data['with_specs']}/{year_data['total']} ({year_data['percentage']}%)")
    
    # Search examples
    print(f"\n🔍 Search Examples:")
    
    # Search Honda motorcycles with specs
    honda_with_specs = api.search_motorcycles(make="Honda", with_specs_only=True, limit=5)
    print(f"\nHonda motorcycles with specs:")
    for moto in honda_with_specs:
        print(f"  {moto['year']} {moto['make']} {moto['model']} (spec_id: {moto['spec_id']})")
    
    # Search all motorcycles with specs
    all_with_specs = api.search_motorcycles(with_specs_only=True, limit=10)
    print(f"\nAll motorcycles with specs (showing 10):")
    for moto in all_with_specs:
        print(f"  {moto['year']} {moto['make']} {moto['model']}")
    
    # Get detailed data for a motorcycle with specs
    if all_with_specs:
        first_with_specs = all_with_specs[0]
        detailed = api.get_motorcycle_with_specs(first_with_specs['id'])
        
        print(f"\n📋 Detailed View: {detailed['year']} {detailed['make']} {detailed['model']}")
        if detailed['specifications']:
            print("Specifications:")
            for key, value in list(detailed['specifications'].items())[:5]:
                print(f"  {key}: {value}")
            if len(detailed['specifications']) > 5:
                print(f"  ... and {len(detailed['specifications']) - 5} more specs")
        
        if detailed['images']:
            print(f"Images: {len(detailed['images'])} available")