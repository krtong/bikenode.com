#!/usr/bin/env python3
"""
Create SQL file to load motorcycle specs into PostgreSQL
"""

import json
import uuid
from datetime import datetime

def generate_sql_inserts():
    """Generate SQL INSERT statements for motorcycle specs"""
    
    specs_json_path = "scraped_data/motorcycles/cleaned_motorcycle_data_2025-06-05T12-17-36-410Z.json"
    
    print("Loading motorcycle specs from JSON...")
    
    # Load JSON file
    with open(specs_json_path, 'r') as f:
        data = json.load(f)
    
    motorcycles = data.get('motorcycles', [])
    print(f"Found {len(motorcycles)} motorcycles in JSON")
    
    sql_statements = []
    loaded = 0
    
    for moto in motorcycles:
        try:
            # Only process if we have actual specifications
            specifications = moto.get('specifications', {})
            if not specifications or len(specifications) == 0:
                continue
            
            # Generate UUID
            spec_id = str(uuid.uuid4())
            
            # Extract data
            manufacturer = moto.get('manufacturer', '').replace("'", "''")
            model = moto.get('model', '').replace("'", "''").replace('\n', ' ').replace('\t', ' ').strip()
            year = str(moto.get('year', ''))
            category = moto.get('category', '')
            if category:
                category = category.replace("'", "''")
            package = moto.get('package')
            if package:
                package = package.replace("'", "''")
            title = moto.get('title', '')
            if title:
                title = title.replace("'", "''")
            source = moto.get('source', '')
            content = moto.get('content', '')
            if content:
                content = content.replace("'", "''")
            url = moto.get('url', '')
            
            if not manufacturer or not model:
                continue
            
            # Convert to JSON strings for PostgreSQL
            specs_json = json.dumps(specifications).replace("'", "''")
            images_json = json.dumps(moto.get('images', [])).replace("'", "''")
            
            # Create INSERT statement
            sql = f"""INSERT INTO motorcycle_specs 
(id, manufacturer, model, year, category, package, title, source, 
 specifications, images, content, url, created_at, updated_at)
VALUES ('{spec_id}', '{manufacturer}', '{model}', '{year}', 
        {f"'{category}'" if category else 'NULL'}, 
        {f"'{package}'" if package else 'NULL'}, 
        {f"'{title}'" if title else 'NULL'}, 
        '{source}', 
        '{specs_json}'::jsonb, 
        '{images_json}'::jsonb, 
        {f"'{content}'" if content else 'NULL'}, 
        '{url}', 
        NOW(), NOW());"""
            
            sql_statements.append(sql)
            loaded += 1
            
        except Exception as e:
            print(f"Error processing: {e}")
            continue
    
    print(f"Generated {loaded} SQL statements")
    
    # Write to SQL file
    with open('motorcycle_specs_insert.sql', 'w') as f:
        f.write("-- Insert motorcycle specs\n")
        f.write("BEGIN;\n\n")
        
        for sql in sql_statements:
            f.write(sql + "\n\n")
        
        f.write("COMMIT;\n")
    
    print(f"✅ SQL file created: motorcycle_specs_insert.sql")
    return loaded

def generate_matching_sql():
    """Generate SQL to match motorcycles to specs"""
    
    sql = """
-- Match motorcycles to specs
BEGIN;

-- First, try exact matches
UPDATE motorcycles 
SET spec_id = ms.id,
    updated_at = NOW()
FROM motorcycle_specs ms
WHERE motorcycles.make = ms.manufacturer 
AND motorcycles.model = ms.model 
AND motorcycles.year = ms.year::integer
AND motorcycles.spec_id IS NULL;

-- Then try case-insensitive matches
UPDATE motorcycles 
SET spec_id = ms.id,
    updated_at = NOW()
FROM motorcycle_specs ms
WHERE LOWER(motorcycles.make) = LOWER(ms.manufacturer)
AND LOWER(motorcycles.model) = LOWER(ms.model)
AND motorcycles.year = ms.year::integer
AND motorcycles.spec_id IS NULL;

-- Report results
SELECT 
    COUNT(*) as total_motorcycles,
    SUM(CASE WHEN spec_id IS NOT NULL THEN 1 ELSE 0 END) as with_specs,
    ROUND(SUM(CASE WHEN spec_id IS NOT NULL THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as percentage
FROM motorcycles;

COMMIT;
"""
    
    with open('match_motorcycles_to_specs.sql', 'w') as f:
        f.write(sql)
    
    print("✅ Matching SQL file created: match_motorcycles_to_specs.sql")

if __name__ == "__main__":
    print("🏍️  GENERATING POSTGRESQL SQL FILES")
    print("=" * 50)
    
    # Generate insert statements
    loaded = generate_sql_inserts()
    
    # Generate matching statements
    generate_matching_sql()
    
    print(f"\n📊 Summary:")
    print(f"  Specs to load: {loaded}")
    print(f"\n🚀 Next steps:")
    print("  1. Load specs: psql -h localhost -U postgres -d bikenode < motorcycle_specs_insert.sql")
    print("  2. Match data: psql -h localhost -U postgres -d bikenode < match_motorcycles_to_specs.sql")