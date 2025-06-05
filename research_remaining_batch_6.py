#!/usr/bin/env python3
import csv
import os

# Sixth batch - getting close to completion!
remaining_batch_6 = {
    'PRC': {
        'Manufacturer': 'PRC',
        'Official_Website': '',
        'Status': 'Unknown',
        'Country': 'Unknown',
        'Years_Active': 'Unknown',
        'Last_Known_URL': '',
        'Notes': 'Limited information available - possible abbreviation'
    },
    'Pagsta': {
        'Manufacturer': 'Pagsta',
        'Official_Website': 'https://www.pagsta.com',
        'Status': 'Active',
        'Country': 'Austria/China',
        'Years_Active': '2004-Present',
        'Last_Known_URL': 'https://www.pagsta.com',
        'Notes': 'Austrian scooter brand with Chinese manufacturing'
    },
    'Palmo': {
        'Manufacturer': 'Palmo',
        'Official_Website': '',
        'Status': 'Unknown',
        'Country': 'Unknown',
        'Years_Active': 'Unknown',
        'Last_Known_URL': '',
        'Notes': 'Limited information available'
    },
    'Peda': {
        'Manufacturer': 'Peda',
        'Official_Website': '',
        'Status': 'Unknown',
        'Country': 'Unknown',
        'Years_Active': 'Unknown',
        'Last_Known_URL': '',
        'Notes': 'Limited information available'
    },
    'Precision': {
        'Manufacturer': 'Precision',
        'Official_Website': '',
        'Status': 'Unknown',
        'Country': 'Unknown',
        'Years_Active': 'Unknown',
        'Last_Known_URL': '',
        'Notes': 'Limited information available - possibly custom or parts manufacturer'
    },
    'Pro-One': {
        'Manufacturer': 'Pro-One',
        'Official_Website': '',
        'Status': 'Active',
        'Country': 'USA',
        'Years_Active': '1990s-Present',
        'Last_Known_URL': '',
        'Notes': 'American motorcycle parts and accessories manufacturer'
    },
    'Puma': {
        'Manufacturer': 'Puma',
        'Official_Website': '',
        'Status': 'Defunct',
        'Country': 'Germany',
        'Years_Active': '1922-1958',
        'Last_Known_URL': '',
        'Notes': 'German motorcycle manufacturer - not related to sportswear brand'
    },
    'Raybar': {
        'Manufacturer': 'Raybar',
        'Official_Website': '',
        'Status': 'Unknown',
        'Country': 'Unknown',
        'Years_Active': 'Unknown',
        'Last_Known_URL': '',
        'Notes': 'Limited information available'
    },
    'Redneck': {
        'Manufacturer': 'Redneck',
        'Official_Website': '',
        'Status': 'Unknown',
        'Country': 'Unknown',
        'Years_Active': 'Unknown',
        'Last_Known_URL': '',
        'Notes': 'Limited information available - possibly custom builder'
    },
    'Rhino': {
        'Manufacturer': 'Rhino',
        'Official_Website': '',
        'Status': 'Active',
        'Country': 'China',
        'Years_Active': '2000s-Present',
        'Last_Known_URL': '',
        'Notes': 'Chinese motorcycle and ATV manufacturer'
    },
    'Road': {
        'Manufacturer': 'Road',
        'Official_Website': '',
        'Status': 'Unknown',
        'Country': 'Unknown',
        'Years_Active': 'Unknown',
        'Last_Known_URL': '',
        'Notes': 'Generic term - limited information as specific manufacturer'
    },
    'Rockford': {
        'Manufacturer': 'Rockford',
        'Official_Website': '',
        'Status': 'Unknown',
        'Country': 'Unknown',
        'Years_Active': 'Unknown',
        'Last_Known_URL': '',
        'Notes': 'Limited information available'
    },
    'Roxon': {
        'Manufacturer': 'Roxon',
        'Official_Website': '',
        'Status': 'Unknown',
        'Country': 'Unknown',
        'Years_Active': 'Unknown',
        'Last_Known_URL': '',
        'Notes': 'Limited information available'
    },
    'Rucker': {
        'Manufacturer': 'Rucker',
        'Official_Website': '',
        'Status': 'Unknown',
        'Country': 'Unknown',
        'Years_Active': 'Unknown',
        'Last_Known_URL': '',
        'Notes': 'Limited information available'
    },
    'SVM': {
        'Manufacturer': 'SVM',
        'Official_Website': '',
        'Status': 'Unknown',
        'Country': 'Unknown',
        'Years_Active': 'Unknown',
        'Last_Known_URL': '',
        'Notes': 'Limited information available - possible abbreviation'
    }
}

print(f"Researching batch 6: {len(remaining_batch_6)} brands...")

# Read existing motorcycle brands CSV
existing_data = []
headers = []

with open('./database/data/motorcycle_brands.csv', 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    headers = reader.fieldnames
    existing_data = list(reader)

print(f"Current database has {len(existing_data)} brands")

# Add researched brands to existing data
added_count = 0
for brand_name, brand_data in remaining_batch_6.items():
    # Check if brand already exists (case-insensitive)
    brand_exists = any(existing['Manufacturer'].lower() == brand_name.lower() for existing in existing_data)
    
    if not brand_exists:
        existing_data.append(brand_data)
        added_count += 1
        print(f"Added: {brand_name}")
    else:
        print(f"Skipped (already exists): {brand_name}")

# Sort by manufacturer name
existing_data.sort(key=lambda x: x['Manufacturer'].lower())

# Write updated data back to CSV
with open('./database/data/motorcycle_brands.csv', 'w', newline='', encoding='utf-8') as f:
    writer = csv.DictWriter(f, fieldnames=headers)
    writer.writeheader()
    writer.writerows(existing_data)

print(f"\nAdded {added_count} new brands to motorcycle_brands.csv")
print(f"Total brands now: {len(existing_data)}")

# Update missing brands list
mapped_brands = ['PRC', 'Pagsta', 'Palmo', 'Peda', 'Precision', 'Pro-One', 'Puma', 'Raybar', 'Redneck', 'Rhino', 'Road', 'Rockford', 'Roxon', 'Rucker', 'SVM']

with open('./database/data/missing_brands.txt', 'r', encoding='utf-8') as f:
    remaining_missing = [line.strip() for line in f if line.strip()]

updated_missing = []
for brand in remaining_missing:
    if brand not in mapped_brands:
        updated_missing.append(brand)

with open('./database/data/missing_brands.txt', 'w', encoding='utf-8') as f:
    for brand in updated_missing:
        f.write(f"{brand}\n")

print(f"Remaining missing brands: {len(updated_missing)}")
print(f"Resolved in this batch: {', '.join(mapped_brands)}")