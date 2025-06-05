#!/usr/bin/env python3
import csv
import os
from collections import OrderedDict

# Define the CSV files to merge
csv_files = [
    './database/data/motorcycle_brands.csv',
    './database/data/motorcycle_brands_alphabetized.csv',
    './database/data/motorcycle_brands_completed_fullA-J_alphabetized.csv',
    './database/data/motorcycle_brands_completed_fullA-J.csv',
    './database/data/motorcycle_brands_L.csv'
]

# Dictionary to store unique records (using manufacturer name as key)
unique_records = OrderedDict()
headers = None

# Read all CSV files
for file in csv_files:
    if os.path.exists(file):
        print(f"Reading {file}...")
        with open(file, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            if headers is None:
                headers = reader.fieldnames
            
            count = 0
            for row in reader:
                # Use manufacturer name (case-insensitive) as unique key
                manufacturer_key = row['Manufacturer'].lower().strip()
                
                # Only add if we haven't seen this manufacturer before
                if manufacturer_key not in unique_records:
                    unique_records[manufacturer_key] = row
                    count += 1
            
            print(f"  Added {count} unique records")
    else:
        print(f"File not found: {file}")

print(f"\nTotal unique records: {len(unique_records)}")

# Sort by manufacturer name (case-insensitive)
sorted_records = sorted(unique_records.values(), key=lambda x: x['Manufacturer'].lower())

# Write the merged and deduplicated data
output_file = './database/data/motorcycle_brands_merged.csv'
with open(output_file, 'w', newline='', encoding='utf-8') as f:
    writer = csv.DictWriter(f, fieldnames=headers)
    writer.writeheader()
    writer.writerows(sorted_records)

print(f"\nMerged data saved to: {output_file}")

# Print first 10 records as preview
print("\nPreview of merged data:")
for i, record in enumerate(sorted_records[:10]):
    print(f"{i+1}. {record['Manufacturer']} - {record['Status']} - {record['Country']}")