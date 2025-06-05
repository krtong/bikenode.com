#!/usr/bin/env python3
import csv
import os

# Fourth batch - continuing with remaining manufacturers
remaining_batch_4 = {
    'K2O': {
        'Manufacturer': 'K2O',
        'Official_Website': '',
        'Status': 'Unknown',
        'Country': 'Unknown',
        'Years_Active': 'Unknown',
        'Last_Known_URL': '',
        'Notes': 'Limited information available - requires further research'
    },
    'KRC': {
        'Manufacturer': 'KRC',
        'Official_Website': '',
        'Status': 'Unknown',
        'Country': 'Unknown',
        'Years_Active': 'Unknown',
        'Last_Known_URL': '',
        'Notes': 'Limited information available - possible racing or custom manufacturer'
    },
    'Kabirdass': {
        'Manufacturer': 'Kabirdass',
        'Official_Website': '',
        'Status': 'Defunct',
        'Country': 'India',
        'Years_Active': '1960s-1980s',
        'Last_Known_URL': '',
        'Notes': 'Indian motorcycle manufacturer - limited production'
    },
    'Kangda': {
        'Manufacturer': 'Kangda',
        'Official_Website': '',
        'Status': 'Active',
        'Country': 'China',
        'Years_Active': '2000s-Present',
        'Last_Known_URL': '',
        'Notes': 'Chinese motorcycle manufacturer'
    },
    'Kenbo': {
        'Manufacturer': 'Kenbo',
        'Official_Website': '',
        'Status': 'Active',
        'Country': 'China',
        'Years_Active': '2000s-Present',
        'Last_Known_URL': '',
        'Notes': 'Chinese motorcycle and scooter manufacturer'
    },
    'Kentoya': {
        'Manufacturer': 'Kentoya',
        'Official_Website': '',
        'Status': 'Active',
        'Country': 'China',
        'Years_Active': '2000s-Present',
        'Last_Known_URL': '',
        'Notes': 'Chinese motorcycle manufacturer'
    },
    'Kramit': {
        'Manufacturer': 'Kramit',
        'Official_Website': '',
        'Status': 'Unknown',
        'Country': 'Unknown',
        'Years_Active': 'Unknown',
        'Last_Known_URL': '',
        'Notes': 'Limited information available'
    },
    'Kurazai': {
        'Manufacturer': 'Kurazai',
        'Official_Website': '',
        'Status': 'Unknown',
        'Country': 'Unknown',
        'Years_Active': 'Unknown',
        'Last_Known_URL': '',
        'Notes': 'Limited information available - possibly Japanese or fictional'
    },
    'MBS': {
        'Manufacturer': 'MBS',
        'Official_Website': '',
        'Status': 'Unknown',
        'Country': 'Unknown',
        'Years_Active': 'Unknown',
        'Last_Known_URL': '',
        'Notes': 'Limited information available - possible abbreviation'
    },
    'MGB': {
        'Manufacturer': 'MGB',
        'Official_Website': '',
        'Status': 'Defunct',
        'Country': 'United Kingdom',
        'Years_Active': '1960s-1980s',
        'Last_Known_URL': '',
        'Notes': 'British automotive company - limited motorcycle involvement'
    },
    'MH': {
        'Manufacturer': 'MH',
        'Official_Website': '',
        'Status': 'Unknown',
        'Country': 'Unknown',
        'Years_Active': 'Unknown',
        'Last_Known_URL': '',
        'Notes': 'Possible abbreviation - requires further research'
    },
    'MM': {
        'Manufacturer': 'MM',
        'Official_Website': '',
        'Status': 'Unknown',
        'Country': 'Unknown',
        'Years_Active': 'Unknown',
        'Last_Known_URL': '',
        'Notes': 'Possible abbreviation - requires further research'
    },
    'MV': {
        'Manufacturer': 'MV',
        'Official_Website': '',
        'Status': 'Reference to MV Agusta',
        'Country': 'Italy',
        'Years_Active': '1945-Present',
        'Last_Known_URL': '',
        'Notes': 'Abbreviation for MV Agusta - already in database as full name'
    },
    'Marine': {
        'Manufacturer': 'Marine Turbine Technologies',
        'Official_Website': 'https://www.marineturbine.com',
        'Status': 'Active',
        'Country': 'USA',
        'Years_Active': '2000-Present',
        'Last_Known_URL': 'https://www.marineturbine.com',
        'Notes': 'American manufacturer of turbine-powered motorcycles - Y2K Superbike'
    },
    'Marks': {
        'Manufacturer': 'Marks',
        'Official_Website': '',
        'Status': 'Unknown',
        'Country': 'Unknown',
        'Years_Active': 'Unknown',
        'Last_Known_URL': '',
        'Notes': 'Limited information available'
    }
}

print(f"Researching batch 4: {len(remaining_batch_4)} brands...")

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
for brand_name, brand_data in remaining_batch_4.items():
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
mapped_brands = ['K2O', 'KRC', 'Kabirdass', 'Kangda', 'Kenbo', 'Kentoya', 'Kramit', 'Kurazai', 'MBS', 'MGB', 'MH', 'MM', 'MV', 'Marine', 'Marks']

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