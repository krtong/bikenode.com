#!/usr/bin/env python3
"""
Safely load motorcycle specs using proper SQL escaping
"""

import json
import uuid
import re

def clean_sql_string(text):
    """Clean string for SQL by removing problematic characters"""
    if not text:
        return None
    
    # Remove or replace problematic characters
    text = str(text)
    # Remove newlines and tabs
    text = text.replace('\n', ' ').replace('\t', ' ').strip()
    # Remove quotes and backslashes that cause issues
    text = text.replace("'", "").replace('"', '').replace('\\', '')
    # Remove other problematic characters
    text = re.sub(r'[^\w\s\-\.\,\(\)\/\:]', '', text)
    # Normalize spaces
    text = re.sub(r'\s+', ' ', text).strip()
    
    return text[:500]  # Limit length

def generate_clean_sql():
    """Generate clean SQL with properly escaped data"""
    
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
            
            # Clean all text fields
            manufacturer = clean_sql_string(moto.get('manufacturer', ''))
            model = clean_sql_string(moto.get('model', ''))
            year = str(moto.get('year', ''))
            category = clean_sql_string(moto.get('category'))
            package = clean_sql_string(moto.get('package'))
            title = clean_sql_string(moto.get('title'))
            source = clean_sql_string(moto.get('source', ''))
            content = clean_sql_string(moto.get('content', ''))
            url = clean_sql_string(moto.get('url', ''))
            
            if not manufacturer or not model:
                continue
            
            # Clean specifications JSON
            clean_specs = {}
            for key, value in specifications.items():
                clean_key = clean_sql_string(key)
                clean_value = clean_sql_string(str(value)) if value else None
                if clean_key and clean_value:
                    clean_specs[clean_key] = clean_value
            
            # Clean images JSON
            clean_images = []
            for img in moto.get('images', []):
                if isinstance(img, dict) and img.get('url'):
                    clean_img = {
                        'url': clean_sql_string(img.get('url')),
                        'alt': clean_sql_string(img.get('alt', '')),
                        'width': img.get('width'),
                        'height': img.get('height')
                    }
                    clean_images.append(clean_img)
            
            # Convert to safe JSON strings
            specs_json = json.dumps(clean_specs).replace("'", "''")
            images_json = json.dumps(clean_images).replace("'", "''")
            
            # Create safe INSERT statement using $$ quoting
            sql = f"""INSERT INTO motorcycle_specs 
(id, manufacturer, model, year, category, package, title, source, 
 specifications, images, content, url, created_at, updated_at)
VALUES (
    '{spec_id}', 
    $tag${manufacturer}$tag$, 
    $tag${model}$tag$, 
    '{year}', 
    {f"$tag${category}$tag$" if category else 'NULL'}, 
    {f"$tag${package}$tag$" if package else 'NULL'}, 
    {f"$tag${title}$tag$" if title else 'NULL'}, 
    $tag${source}$tag$, 
    '{specs_json}'::jsonb, 
    '{images_json}'::jsonb, 
    {f"$tag${content}$tag$" if content else 'NULL'}, 
    $tag${url}$tag$, 
    NOW(), 
    NOW()
);"""
            
            sql_statements.append(sql)
            loaded += 1
            
        except Exception as e:
            print(f"Error processing: {e}")
            continue
    
    print(f"Generated {loaded} clean SQL statements")
    
    # Write to SQL file
    with open('motorcycle_specs_clean.sql', 'w') as f:
        f.write("-- Clean motorcycle specs insert\n")
        f.write("BEGIN;\n\n")
        
        for i, sql in enumerate(sql_statements):
            f.write(f"-- Record {i+1}\n")
            f.write(sql + "\n\n")
        
        f.write("COMMIT;\n")
    
    print(f"✅ Clean SQL file created: motorcycle_specs_clean.sql")
    return loaded

if __name__ == "__main__":
    print("🏍️  GENERATING CLEAN POSTGRESQL SQL")
    print("=" * 50)
    
    loaded = generate_clean_sql()
    
    print(f"\n📊 Summary:")
    print(f"  Clean specs to load: {loaded}")
    print(f"\n🚀 Next step:")
    print("  Load: psql -h localhost -U postgres -d bikenode < motorcycle_specs_clean.sql")