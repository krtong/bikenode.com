#!/usr/bin/env python3
"""
Comprehensive analysis of year data patterns in motorcycle specs database
"""

import psycopg2
import json
import re
from collections import defaultdict, Counter

def connect_db():
    """Connect to PostgreSQL database"""
    return psycopg2.connect(
        host="localhost",
        database="bikenode",
        user="postgres",
        password=""
    )

def analyze_year_patterns(conn):
    """Analyze various year patterns in the data"""
    cursor = conn.cursor()
    
    print("🔍 COMPREHENSIVE YEAR DATA PATTERN ANALYSIS")
    print("=" * 60)
    
    # 1. Check table schemas
    print("\n1. TABLE SCHEMAS")
    print("-" * 40)
    
    # Check motorcycles table schema
    cursor.execute("""
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'motorcycles'
        AND column_name IN ('year', 'model_year', 'production_year')
        ORDER BY column_name
    """)
    
    print("Motorcycles table year columns:")
    for row in cursor.fetchall():
        print(f"  {row[0]}: {row[1]} (nullable: {row[2]})")
    
    # Check motorcycle_specs table schema
    cursor.execute("""
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'motorcycle_specs'
        AND (column_name LIKE '%year%' OR data_type = 'jsonb')
        ORDER BY column_name
    """)
    
    print("\nMotorcycle_specs table year-related columns:")
    for row in cursor.fetchall():
        print(f"  {row[0]}: {row[1]}")
    
    # 2. Analyze JSONB year data
    print("\n\n2. JSONB YEAR DATA PATTERNS")
    print("-" * 40)
    
    cursor.execute("""
        SELECT id, manufacturer, model, specifications
        FROM motorcycle_specs
        WHERE specifications IS NOT NULL
        LIMIT 1000
    """)
    
    year_keys = Counter()
    year_patterns = defaultdict(list)
    year_range_examples = []
    
    for row in cursor.fetchall():
        spec_id, manufacturer, model, specs = row
        if specs:
            # Look for year-related keys
            for key in specs.keys():
                if 'year' in key.lower():
                    year_keys[key] += 1
                    value = specs[key]
                    
                    # Analyze the value pattern
                    if isinstance(value, str):
                        # Check for year ranges
                        if '-' in value and re.search(r'\d{4}', value):
                            year_patterns['range'].append((spec_id, key, value))
                            if len(year_range_examples) < 5:
                                year_range_examples.append({
                                    'id': spec_id,
                                    'manufacturer': manufacturer,
                                    'model': model,
                                    'key': key,
                                    'value': value
                                })
                        # Check for multiple years
                        elif ',' in value or '/' in value:
                            year_patterns['multiple'].append((spec_id, key, value))
                        # Check for single year
                        elif re.match(r'^\d{4}$', str(value)):
                            year_patterns['single'].append((spec_id, key, value))
                        else:
                            year_patterns['other'].append((spec_id, key, value))
    
    print("Year-related keys found in JSONB:")
    for key, count in year_keys.most_common():
        print(f"  {key}: {count} occurrences")
    
    print("\nYear value patterns:")
    for pattern, examples in year_patterns.items():
        print(f"  {pattern}: {len(examples)} cases")
    
    if year_range_examples:
        print("\nExamples of year ranges in JSONB:")
        for ex in year_range_examples:
            print(f"  Spec {ex['id']}: {ex['manufacturer']} {ex['model']}")
            print(f"    {ex['key']}: {ex['value']}")
    
    # 3. Analyze motorcycles table year distribution
    print("\n\n3. MOTORCYCLES TABLE YEAR ANALYSIS")
    print("-" * 40)
    
    cursor.execute("""
        SELECT 
            MIN(year) as min_year,
            MAX(year) as max_year,
            COUNT(DISTINCT year) as unique_years,
            COUNT(*) as total_records,
            COUNT(CASE WHEN year IS NULL THEN 1 END) as null_years
        FROM motorcycles
    """)
    
    stats = cursor.fetchone()
    print(f"Year statistics:")
    print(f"  Range: {stats[0]} to {stats[1]}")
    print(f"  Unique years: {stats[2]}")
    print(f"  Total records: {stats[3]}")
    print(f"  Records with NULL year: {stats[4]}")
    
    # 4. Find potential year range issues
    print("\n\n4. POTENTIAL YEAR RANGE ISSUES")
    print("-" * 40)
    
    # Check for specs that might cover multiple years
    cursor.execute("""
        WITH spec_year_analysis AS (
            SELECT 
                ms.id as spec_id,
                ms.manufacturer,
                ms.model as spec_model,
                COUNT(DISTINCT m.year) as year_count,
                MIN(m.year) as min_year,
                MAX(m.year) as max_year,
                ARRAY_AGG(DISTINCT m.year ORDER BY m.year) as years
            FROM motorcycle_specs ms
            JOIN motorcycles m ON m.spec_id = ms.id
            WHERE m.year IS NOT NULL
            GROUP BY ms.id, ms.manufacturer, ms.model
            HAVING COUNT(DISTINCT m.year) > 1
        )
        SELECT * FROM spec_year_analysis
        WHERE max_year - min_year > 5
        ORDER BY year_count DESC
        LIMIT 10
    """)
    
    print("Specs linked to motorcycles across wide year ranges:")
    for row in cursor.fetchall():
        spec_id, mfr, model, year_count, min_year, max_year, years = row
        print(f"\n  Spec {spec_id}: {mfr} {model}")
        print(f"    Years: {min_year}-{max_year} ({year_count} distinct years)")
        if len(years) <= 10:
            print(f"    Actual years: {years}")
        else:
            print(f"    Actual years: {years[:5]} ... {years[-5:]}")
    
    # 5. Check for year data in model names
    print("\n\n5. YEAR DATA IN MODEL NAMES")
    print("-" * 40)
    
    cursor.execute("""
        SELECT DISTINCT make, model, year
        FROM motorcycles
        WHERE model ~ '\d{4}'
        LIMIT 10
    """)
    
    print("Models with years in their names:")
    for row in cursor.fetchall():
        make, model, year = row
        print(f"  {make} {model} (DB year: {year})")
    
    # 6. Analyze spec linking strategy
    print("\n\n6. SPEC LINKING STRATEGY ANALYSIS")
    print("-" * 40)
    
    cursor.execute("""
        SELECT 
            CASE 
                WHEN spec_id IS NULL THEN 'No specs'
                ELSE 'Has specs'
            END as spec_status,
            year,
            COUNT(*) as count
        FROM motorcycles
        WHERE year >= 2020
        GROUP BY spec_status, year
        ORDER BY year DESC, spec_status
    """)
    
    print("Recent years spec coverage:")
    current_year = None
    for row in cursor.fetchall():
        status, year, count = row
        if year != current_year:
            print(f"\n  {year}:")
            current_year = year
        print(f"    {status}: {count} motorcycles")
    
    cursor.close()

def extract_year_ranges(conn):
    """Extract and analyze year ranges from various fields"""
    cursor = conn.cursor()
    
    print("\n\n7. EXTRACTING YEAR RANGES")
    print("-" * 40)
    
    # Pattern to match year ranges
    year_range_pattern = re.compile(r'(\d{4})\s*[-–—]\s*(\d{4})')
    
    # Check JSONB specifications for year ranges
    cursor.execute("""
        SELECT id, manufacturer, model, specifications
        FROM motorcycle_specs
        WHERE specifications IS NOT NULL
    """)
    
    year_ranges_found = []
    
    for row in cursor.fetchall():
        spec_id, manufacturer, model, specs = row
        if specs:
            # Convert to string to search for patterns
            spec_str = json.dumps(specs)
            matches = year_range_pattern.findall(spec_str)
            if matches:
                for start_year, end_year in matches:
                    year_ranges_found.append({
                        'spec_id': spec_id,
                        'manufacturer': manufacturer,
                        'model': model,
                        'start_year': int(start_year),
                        'end_year': int(end_year),
                        'range': f"{start_year}-{end_year}"
                    })
    
    if year_ranges_found:
        print(f"Found {len(year_ranges_found)} year ranges in specifications")
        print("\nFirst 10 examples:")
        for i, yr in enumerate(year_ranges_found[:10]):
            print(f"  {yr['manufacturer']} {yr['model']}: {yr['range']}")
    
    cursor.close()
    return year_ranges_found

def generate_recommendations(conn):
    """Generate recommendations for fixing year data"""
    print("\n\n8. RECOMMENDATIONS FOR FIXING YEAR DATA")
    print("-" * 40)
    
    recommendations = []
    
    cursor = conn.cursor()
    
    # Check for specs that are linked to too many years
    cursor.execute("""
        SELECT 
            spec_id,
            COUNT(DISTINCT year) as year_count,
            MIN(year) as min_year,
            MAX(year) as max_year
        FROM motorcycles
        WHERE spec_id IS NOT NULL
        GROUP BY spec_id
        HAVING COUNT(DISTINCT year) > 10
    """)
    
    over_linked = cursor.fetchall()
    if over_linked:
        recommendations.append({
            'issue': 'Over-linked specifications',
            'description': f'{len(over_linked)} specs are linked to motorcycles across more than 10 different years',
            'action': 'Consider creating year-specific spec entries or storing year ranges properly'
        })
    
    # Check for recent motorcycles without specs
    cursor.execute("""
        SELECT year, COUNT(*) as count
        FROM motorcycles
        WHERE spec_id IS NULL AND year >= 2023
        GROUP BY year
    """)
    
    recent_without_specs = cursor.fetchall()
    if recent_without_specs:
        total = sum(row[1] for row in recent_without_specs)
        recommendations.append({
            'issue': 'Recent motorcycles without specifications',
            'description': f'{total} motorcycles from 2023+ don\'t have linked specifications',
            'action': 'Prioritize adding specifications for recent models'
        })
    
    # Check for year mismatches
    cursor.execute("""
        SELECT COUNT(*) 
        FROM motorcycles m
        JOIN motorcycle_specs ms ON m.spec_id = ms.id
        WHERE ms.specifications->>'year' IS NOT NULL
        AND ms.specifications->>'year' != m.year::text
    """)
    
    mismatches = cursor.fetchone()[0]
    if mismatches > 0:
        recommendations.append({
            'issue': 'Year mismatches between tables',
            'description': f'{mismatches} cases where motorcycle year doesn\'t match spec year',
            'action': 'Review and reconcile year data between tables'
        })
    
    cursor.close()
    
    print("\nKey recommendations:")
    for i, rec in enumerate(recommendations, 1):
        print(f"\n{i}. {rec['issue']}")
        print(f"   {rec['description']}")
        print(f"   Action: {rec['action']}")

def main():
    """Main execution function"""
    try:
        conn = connect_db()
        analyze_year_patterns(conn)
        year_ranges = extract_year_ranges(conn)
        generate_recommendations(conn)
        
        # Save detailed analysis
        if year_ranges:
            with open('year_range_analysis.json', 'w') as f:
                json.dump(year_ranges, f, indent=2)
            print(f"\n\nDetailed year range analysis saved to year_range_analysis.json")
        
        conn.close()
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()