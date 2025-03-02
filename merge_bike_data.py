#!/usr/bin/env python3
"""
Merge multiple bike data files from different scrapers or sources
"""
import os
import sys
import json
import csv
import argparse
from collections import defaultdict

def load_file(filepath):
    """Load data from a CSV or JSON file"""
    if not os.path.exists(filepath):
        print(f"Error: File {filepath} not found")
        return None
    
    ext = os.path.splitext(filepath)[1].lower()
    
    try:
        if ext == '.json':
            with open(filepath, 'r', encoding='utf-8') as f:
                return json.load(f)
        elif ext == '.csv':
            with open(filepath, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                return list(reader)
        else:
            print(f"Unsupported file type: {ext}")
            return None
    except Exception as e:
        print(f"Error reading {filepath}: {e}")
        return None

def identify_key_fields(bikes):
    """Identify key fields for bike identification and deduplication"""
    # Check fields in the first bike
    if not bikes:
        return []
        
    important_fields = ['url', 'brand', 'model', 'year']
    
    # Find which important fields are available
    available_fields = []
    for field in important_fields:
        # Check alternative field names
        alternatives = [field]
        if field == 'brand':
            alternatives.append('make')
            
        for alt in alternatives:
            if alt in bikes[0]:
                available_fields.append(alt)
                break
    
    return available_fields
    
def generate_bike_id(bike, key_fields):
    """Generate a unique identifier for a bike"""
    if 'url' in key_fields and bike.get('url'):
        # URL is usually the best identifier
        return f"url:{bike['url']}"
    
    # Otherwise use combination of brand/make, model and year
    bike_id_parts = []
    
    if 'brand' in key_fields and bike.get('brand'):
        bike_id_parts.append(f"brand:{bike['brand'].lower()}")
    elif 'make' in key_fields and bike.get('make'):
        bike_id_parts.append(f"make:{bike['make'].lower()}")
    
    if 'model' in key_fields and bike.get('model'):
        bike_id_parts.append(f"model:{bike['model'].lower()}")
        
    if 'year' in key_fields and bike.get('year'):
        bike_id_parts.append(f"year:{bike['year']}")
    
    if bike_id_parts:
        return "|".join(bike_id_parts)
    
    # Last resort: use string representation of bike (not ideal)
    return str(sorted(bike.items()))

def merge_field(field1, field2):
    """Merge two field values, preferring non-empty values"""
    if not field1 and not field2:
        return ""
    elif not field1:
        return field2
    elif not field2:
        return field1
    
    # If both have values, prefer longer or more detailed value
    if len(str(field2)) > len(str(field1)) * 1.5:  # Field2 is significantly longer
        return field2
    return field1

def merge_bike_records(bike1, bike2):
    """Merge two bike records, keeping the most complete information"""
    # Start with all fields from bike1
    merged = dict(bike1)
    
    # Update with non-empty fields from bike2
    for field, value in bike2.items():
        if field not in merged or not merged[field]:
            # Field doesn't exist in bike1 or is empty
            merged[field] = value
        elif value:
            # Both records have a value for this field
            merged[field] = merge_field(merged[field], value)
    
    # Special handling for specifications
    if 'specifications' in bike1 and 'specifications' in bike2:
        if isinstance(bike1['specifications'], dict) and isinstance(bike2['specifications'], dict):
            merged_specs = dict(bike1['specifications'])
            
            # Add specs from bike2 that don't exist or are empty in bike1
            for spec, value in bike2['specifications'].items():
                if spec not in merged_specs or not merged_specs[spec]:
                    merged_specs[spec] = value
            
            merged['specifications'] = merged_specs
    
    # Add a note that this is a merged record
    merged['merged'] = True
    
    return merged

def merge_bike_datasets(datasets):
    """Merge multiple bike datasets with deduplication"""
    if not datasets:
        return []
    
    # Combine all bikes from all datasets
    all_bikes = []
    bike_counts_by_source = {}
    
    for i, dataset in enumerate(datasets):
        source_name = f"source_{i+1}" 
        if not dataset:
            bike_counts_by_source[source_name] = 0
            continue
            
        # Add source information to each bike
        for bike in dataset:
            bike['data_source'] = source_name
        
        bike_counts_by_source[source_name] = len(dataset)
        all_bikes.extend(dataset)
    
    print(f"Total bikes before deduplication: {len(all_bikes)}")
    for source, count in bike_counts_by_source.items():
        print(f"  - {source}: {count} bikes")
    
    # Identify key fields for deduplication
    key_fields = identify_key_fields(all_bikes)
    print(f"Using fields for deduplication: {', '.join(key_fields)}")
    
    # Group bikes by ID for deduplication
    bikes_by_id = defaultdict(list)
    for bike in all_bikes:
        bike_id = generate_bike_id(bike, key_fields)
        bikes_by_id[bike_id].append(bike)
    
    # Merge duplicate bikes
    merged_bikes = []
    duplicates = 0
    
    for bike_id, bikes in bikes_by_id.items():
        if len(bikes) == 1:
            # No duplicates
            merged_bikes.append(bikes[0])
        else:
            # Merge duplicates
            duplicates += len(bikes) - 1
            
            # Start with the first bike
            merged_bike = bikes[0]
            
            # Merge with remaining bikes
            for bike in bikes[1:]:
                merged_bike = merge_bike_records(merged_bike, bike)
                
            # Add source info
            sources = set(bike['data_source'] for bike in bikes)
            merged_bike['data_sources'] = list(sources)
            
            merged_bikes.append(merged_bike)
    
    print(f"Merged {duplicates} duplicate bikes")
    print(f"Final dataset: {len(merged_bikes)} unique bikes")
    
    return merged_bikes

def save_output(bikes, output_file):
    """Save merged bikes to output file"""
    ext = os.path.splitext(output_file)[1].lower()
    
    try:
        if ext == '.json':
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(bikes, f, indent=2)
        elif ext == '.csv':
            if not bikes:
                print("Error: No bikes to save")
                return False
                
            # Get all possible fields
            fields = set()
            for bike in bikes:
                fields.update(bike.keys())
            
            with open(output_file, 'w', newline='', encoding='utf-8') as f:
                writer = csv.DictWriter(f, fieldnames=sorted(list(fields)))
                writer.writeheader()
                for bike in bikes:
                    writer.writerow(bike)
        
        print(f"Saved {len(bikes)} bikes to {output_file}")
        return True
    except Exception as e:
        print(f"Error saving to {output_file}: {e}")
        return False

def main():
    parser = argparse.ArgumentParser(description="Merge and deduplicate bike data from multiple files")
    parser.add_argument("input_files", nargs='+', help="Input CSV or JSON files to merge")
    parser.add_argument("--output", "-o", default=f"merged_bikes_{datetime.now().strftime('%Y%m%d')}.csv",
                      help="Output file name")
    parser.add_argument("--format", "-f", choices=['csv', 'json'], default='csv',
                      help="Output file format (default: csv)")
                      
    args = parser.parse_args()
    
    print(f"\n{'='*80}")
    print("BIKE DATA MERGER")
    print(f"{'='*80}\n")
    print(f"Merging {len(args.input_files)} files:")
    for file in args.input_files:
        print(f" - {file}")
    print(f"Output: {args.output}\n")
    
    datasets = [load_file(file) for file in args.input_files]
    merged_bikes = merge_bike_datasets(datasets)
    
    if save_output(merged_bikes, args.output):
        print(f"\n✅ Successfully merged data into {args.output}")
    else:
        print(f"\n❌ Failed to merge data")
        
    return 0 if merged_bikes else 1

if __name__ == "__main__":
    sys.exit(main())
