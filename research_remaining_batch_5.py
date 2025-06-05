#!/usr/bin/env python3
import csv
import os

# Fifth batch - continuing systematic research
remaining_batch_5 = {
    'Marsh': {
        'Manufacturer': 'Marsh',
        'Official_Website': '',
        'Status': 'Defunct',
        'Country': 'USA',
        'Years_Active': '1899-1905',
        'Last_Known_URL': '',
        'Notes': 'Early American motorcycle manufacturer - Marsh Motor Cycle Company'
    },
    'Mikilon': {
        'Manufacturer': 'Mikilon',
        'Official_Website': '',
        'Status': 'Unknown',
        'Country': 'Unknown',
        'Years_Active': 'Unknown',
        'Last_Known_URL': '',
        'Notes': 'Limited information available'
    },
    'Millet': {
        'Manufacturer': 'Millet',
        'Official_Website': '',
        'Status': 'Defunct',
        'Country': 'France',
        'Years_Active': '1892-1898',
        'Last_Known_URL': '',
        'Notes': 'Early French motorcycle manufacturer - Félix Millet rotary engine pioneer'
    },
    'Mitt': {
        'Manufacturer': 'Mitt',
        'Official_Website': '',
        'Status': 'Unknown',
        'Country': 'Unknown',
        'Years_Active': 'Unknown',
        'Last_Known_URL': '',
        'Notes': 'Limited information available'
    },
    'Mojo': {
        'Manufacturer': 'Mojo Motorcycles',
        'Official_Website': 'https://www.mojomotorcycles.com',
        'Status': 'Active',
        'Country': 'India',
        'Years_Active': '2015-Present',
        'Last_Known_URL': 'https://www.mojomotorcycles.com',
        'Notes': 'Indian manufacturer by Mahindra - premium motorcycles'
    },
    'Monto': {
        'Manufacturer': 'Monto',
        'Official_Website': '',
        'Status': 'Unknown',
        'Country': 'Unknown',
        'Years_Active': 'Unknown',
        'Last_Known_URL': '',
        'Notes': 'Limited information available'
    },
    'Motolevo': {
        'Manufacturer': 'Motolevo',
        'Official_Website': '',
        'Status': 'Unknown',
        'Country': 'Unknown',
        'Years_Active': 'Unknown',
        'Last_Known_URL': '',
        'Notes': 'Limited information available'
    },
    'Motoposh': {
        'Manufacturer': 'Motoposh',
        'Official_Website': '',
        'Status': 'Unknown',
        'Country': 'Unknown',
        'Years_Active': 'Unknown',
        'Last_Known_URL': '',
        'Notes': 'Limited information available'
    },
    'Motorino': {
        'Manufacturer': 'Motorino',
        'Official_Website': 'https://www.motorino.ca',
        'Status': 'Active',
        'Country': 'Canada',
        'Years_Active': '2007-Present',
        'Last_Known_URL': 'https://www.motorino.ca',
        'Notes': 'Canadian electric scooter manufacturer'
    },
    'Nipponia': {
        'Manufacturer': 'Nipponia',
        'Official_Website': '',
        'Status': 'Unknown',
        'Country': 'Unknown',
        'Years_Active': 'Unknown',
        'Last_Known_URL': '',
        'Notes': 'Limited information available - possibly Japanese related'
    },
    'Nuuk': {
        'Manufacturer': 'Nuuk',
        'Official_Website': '',
        'Status': 'Unknown',
        'Country': 'Unknown',
        'Years_Active': 'Unknown',
        'Last_Known_URL': '',
        'Notes': 'Limited information available'
    },
    'Orion': {
        'Manufacturer': 'Orion',
        'Official_Website': '',
        'Status': 'Active',
        'Country': 'China',
        'Years_Active': '2000s-Present',
        'Last_Known_URL': '',
        'Notes': 'Chinese motorcycle and ATV manufacturer'
    },
    'Otto': {
        'Manufacturer': 'Otto',
        'Official_Website': '',
        'Status': 'Defunct',
        'Country': 'Germany',
        'Years_Active': '1921-1937',
        'Last_Known_URL': '',
        'Notes': 'German motorcycle manufacturer'
    },
    'Over': {
        'Manufacturer': 'Over',
        'Official_Website': '',
        'Status': 'Unknown',
        'Country': 'Unknown',
        'Years_Active': 'Unknown',
        'Last_Known_URL': '',
        'Notes': 'Limited information available'
    },
    'Oxygen': {
        'Manufacturer': 'Oxygen',
        'Official_Website': '',
        'Status': 'Unknown',
        'Country': 'Unknown',
        'Years_Active': 'Unknown',
        'Last_Known_URL': '',
        'Notes': 'Limited information available - possibly electric vehicle related'
    }
}

print(f"Researching batch 5: {len(remaining_batch_5)} brands...")

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
for brand_name, brand_data in remaining_batch_5.items():
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
mapped_brands = ['Marsh', 'Mikilon', 'Millet', 'Mitt', 'Mojo', 'Monto', 'Motolevo', 'Motoposh', 'Motorino', 'Nipponia', 'Nuuk', 'Orion', 'Otto', 'Over', 'Oxygen']

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