#!/usr/bin/env python3
"""
Utility to merge multiple bike data files into a single dataset
"""
import os
import sys
import glob
import argparse
import csv
import json
from datetime import datetime

def load_csv_file(filepath):
    """Load bike data from a CSV file"""
    try:
        bikes = []
        with open(filepath, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                bikes.append(row)
        return bikes
    except Exception as e:
        print(f"Error loading CSV file {filepath}: {e}")
        return []

def load_json_file(filepath):
    """Load bike data from a JSON file"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading JSON file {filepath}: {e}")
        return []

def save_csv_file(bikes, filepath):
    """Save bike data to a CSV file"""
    try:
        # Get all possible fields from all bikes
        all_fields = set()
        for bike in bikes:
            all_fields.update(bike.keys())
        
        headers = sorted(list(all_fields))
        
        with open(filepath, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=headers)
            writer.writeheader()
            for bike in bikes:
                writer.writerow(bike)
        return True
    except Exception as e:
        print(f"Error saving to CSV file {filepath}: {e}")
        return False

def save_json_file(bikes, filepath):
    """Save bike data to a JSON file"""
    try:
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(bikes, f, indent=2)
        return True
    except Exception as e:
        print(f"Error saving to JSON file {filepath}: {e}")
        return False

def deduplicate_bikes(bikes, keys=['make', 'model', 'year']):
    """Remove duplicate bikes based on specific keys"""
    seen = set()
    unique_bikes = []
    
    for bike in bikes:
        # Create a tuple of the values for the specified keys
        # Use an empty string if a key is missing
        values = tuple(str(bike.get(key, '')) for key in keys)
        
        if values not in seen:
            seen.add(values)
            unique_bikes.append(bike)
    
    return unique_bikes

def main():
    parser = argparse.ArgumentParser(description="Merge multiple bike data files")
    parser.add_argument("--input", nargs='+', help="Input files to merge (CSV or JSON)")
    parser.add_argument("--input-dir", help="Input directory to scan for bike data files")
    parser.add_argument("--pattern", default="*.csv", help="File pattern to match (default: *.csv)")
    parser.add_argument("--output", default="merged_bikes.csv", help="Output file path")
    parser.add_argument("--format", choices=["csv", "json"], default="csv", help="Output format")
    parser.add_argument("--deduplicate", action="store_true", help="Remove duplicate bikes")
    parser.add_argument("--dedup-keys", default="make,model,year", 
                        help="Comma-separated keys used for deduplication (default: make,model,year)")
    
    args = parser.parse_args()
    
    # Check that we have some input
    if not args.input and not args.input_dir:
        print("Error: You must specify either --input files or --input-dir")
        return 1
    
    # Collect input files
    input_files = []
    if args.input:
        input_files.extend(args.input)
    
    if args.input_dir:
        if not os.path.isdir(args.input_dir):
            print(f"Error: Input directory '{args.input_dir}' does not exist")
            return 1
        
        # Find files matching the pattern
        pattern_path = os.path.join(args.input_dir, args.pattern)
        matching_files = glob.glob(pattern_path)
        
        if not matching_files:
            print(f"No files matching '{args.pattern}' found in '{args.input_dir}'")
            return 1
        
        input_files.extend(matching_files)
    
    if not input_files:
        print("No input files to process")
        return 1
    
    print(f"Found {len(input_files)} input files to merge")
    
    # Load all bike data
    all_bikes = []
    for input_file in input_files:
        print(f"Loading {input_file}...")
        
        if input_file.lower().endswith('.csv'):
            bikes = load_csv_file(input_file)
        elif input_file.lower().endswith('.json'):
            bikes = load_json_file(input_file)
        else:
            print(f"Skipping {input_file}: Unsupported file format")
            continue
            
        if bikes:
            print(f"  Loaded {len(bikes)} bikes")
            all_bikes.extend(bikes)
        else:
            print(f"  Failed to load any bikes from {input_file}")
    
    if not all_bikes:
        print("No bike data was loaded")
        return 1
    
    print(f"\nLoaded {len(all_bikes)} bikes total")
    
    # Deduplicate if requested
    if args.deduplicate:
        dedup_keys = args.dedup_keys.split(',')
        print(f"Deduplicating bikes based on keys: {', '.join(dedup_keys)}...")
        
        before_count = len(all_bikes)
        all_bikes = deduplicate_bikes(all_bikes, dedup_keys)
        after_count = len(all_bikes)
        
        print(f"Removed {before_count - after_count} duplicates")
    
    # Save the merged data
    print(f"\nSaving {len(all_bikes)} bikes to {args.output}...")
    
    if args.format == 'csv':
        if save_csv_file(all_bikes, args.output):
            print("✅ Successfully saved merged bikes to CSV")
        else:
            print("❌ Failed to save merged bikes")
            return 1
    else:  # json
        if save_json_file(all_bikes, args.output):
            print("✅ Successfully saved merged bikes to JSON")
        else:
            print("❌ Failed to save merged bikes")
            return 1
    
    print(f"\nDone! All {len(all_bikes)} bikes have been merged into {args.output}")
    return 0

if __name__ == "__main__":
    sys.exit(main())
