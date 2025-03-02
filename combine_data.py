#!/usr/bin/env python3
"""
Tool to combine multiple bike data files into a unified dataset
"""
import os
import sys
import json
import argparse
import pandas as pd
import glob
from datetime import datetime

def find_data_files(input_dir, pattern="bikes_*.csv"):
    """Find all bike data files matching the pattern"""
    files = glob.glob(os.path.join(input_dir, pattern))
    return sorted(files)

def combine_csv_files(files, output_file):
    """Combine multiple CSV files into a single CSV file"""
    if not files:
        print("No CSV files found to combine")
        return False
    
    print(f"Combining {len(files)} CSV files...")
    
    # Read and combine all CSV files
    all_dfs = []
    for file_path in files:
        try:
            df = pd.read_csv(file_path)
            print(f"  - {os.path.basename(file_path)}: {len(df)} bikes")
            all_dfs.append(df)
        except Exception as e:
            print(f"Error reading {file_path}: {e}")
    
    # Combine all dataframes
    if all_dfs:
        combined_df = pd.concat(all_dfs, ignore_index=True)
        
        # Remove duplicates based on URL if present
        if 'url' in combined_df.columns:
            before_dedup = len(combined_df)
            combined_df.drop_duplicates(subset='url', keep='first', inplace=True)
            after_dedup = len(combined_df)
            print(f"Removed {before_dedup - after_dedup} duplicate bikes")
        
        # Save combined data
        combined_df.to_csv(output_file, index=False)
        print(f"Combined data saved to {output_file} with {len(combined_df)} bikes")
        return True
    
    return False

def combine_json_files(files, output_file):
    """Combine multiple JSON files into a single JSON file"""
    if not files:
        print("No JSON files found to combine")
        return False
    
    print(f"Combining {len(files)} JSON files...")
    
    # Read and combine all JSON files
    all_bikes = []
    for file_path in files:
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # Handle both list and dict formats
            if isinstance(data, dict) and "bikes" in data:
                bikes = data["bikes"]
            elif isinstance(data, list):
                bikes = data
            else:
                bikes = []
            
            print(f"  - {os.path.basename(file_path)}: {len(bikes)} bikes")
            all_bikes.extend(bikes)
        except Exception as e:
            print(f"Error reading {file_path}: {e}")
    
    # Remove duplicates based on URL
    if all_bikes:
        unique_bikes = []
        seen_urls = set()
        
        for bike in all_bikes:
            url = bike.get('url', '')
            if url and url not in seen_urls:
                seen_urls.add(url)
                unique_bikes.append(bike)
        
        print(f"Removed {len(all_bikes) - len(unique_bikes)} duplicate bikes")
        
        # Save combined data
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(unique_bikes, f, indent=2)
        
        print(f"Combined data saved to {output_file} with {len(unique_bikes)} bikes")
        return True
    
    return False

def main():
    """Main function to combine bike data files"""
    parser = argparse.ArgumentParser(description="Combine multiple bike data files")
    parser.add_argument("--input-dir", default=".", help="Directory containing bike data files")
    parser.add_argument("--output-csv", default="all_bikes_combined.csv", help="Output CSV filename")
    parser.add_argument("--output-json", default="all_bikes_combined.json", help="Output JSON filename")
    parser.add_argument("--csv-pattern", default="bikes_*.csv", help="Pattern for CSV files to combine")
    parser.add_argument("--json-pattern", default="bikes_*.json", help="Pattern for JSON files to combine")
    args = parser.parse_args()
    
    try:
        # Process CSV files
        csv_files = find_data_files(args.input_dir, args.csv_pattern)
        if csv_files:
            combine_csv_files(csv_files, args.output_csv)
        else:
            print(f"No CSV files found matching pattern: {args.csv_pattern}")
        
        # Process JSON files
        json_files = find_data_files(args.input_dir, args.json_pattern)
        if json_files:
            combine_json_files(json_files, args.output_json)
        else:
            print(f"No JSON files found matching pattern: {args.json_pattern}")
        
    except Exception as e:
        print(f"Error combining data: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
