#!/usr/bin/env python3
import csv
import os

# Second batch of remaining brands research
remaining_batch_2 = {
    'Kasinski': {
        'Manufacturer': 'Kasinski',
        'Official_Website': 'https://www.kasinski.com.br',
        'Status': 'Active',
        'Country': 'Brazil',
        'Years_Active': '1998-Present',
        'Last_Known_URL': 'https://www.kasinski.com.br',
        'Notes': 'Brazilian motorcycle manufacturer and importer'
    },
    'Kanuni': {
        'Manufacturer': 'Kanuni',
        'Official_Website': 'https://www.kanuni.com.tr',
        'Status': 'Active',
        'Country': 'Turkey',
        'Years_Active': '2004-Present',
        'Last_Known_URL': 'https://www.kanuni.com.tr',
        'Notes': 'Turkish motorcycle manufacturer'
    },
    'Kikker': {
        'Manufacturer': 'Kikker 5150',
        'Official_Website': 'https://www.kikker5150.com',
        'Status': 'Active',
        'Country': 'Netherlands',
        'Years_Active': '2008-Present',
        'Last_Known_URL': 'https://www.kikker5150.com',
        'Notes': 'Dutch hardtail bobber motorcycle manufacturer'
    },
    'Kollter': {
        'Manufacturer': 'Kollter',
        'Official_Website': 'https://www.kollter.com',
        'Status': 'Active',
        'Country': 'Estonia',
        'Years_Active': '2018-Present',
        'Last_Known_URL': 'https://www.kollter.com',
        'Notes': 'Estonian electric scooter manufacturer'
    },
    'Kuba': {
        'Manufacturer': 'Kuba',
        'Official_Website': '',
        'Status': 'Defunct',
        'Country': 'Germany/Czech Republic',
        'Years_Active': '2000s-2010s',
        'Last_Known_URL': '',
        'Notes': 'German brand with Czech manufacturing - small motorcycles and scooters'
    },
    'Magnat': {
        'Manufacturer': 'Magnat',
        'Official_Website': '',
        'Status': 'Defunct',
        'Country': 'France',
        'Years_Active': '1931-1962',
        'Last_Known_URL': '',
        'Notes': 'Historic French motorcycle manufacturer - Magnat-Debon'
    },
    'Magni': {
        'Manufacturer': 'Magni',
        'Official_Website': 'https://www.magnimotorcycles.it',
        'Status': 'Active',
        'Country': 'Italy',
        'Years_Active': '1977-Present',
        'Last_Known_URL': 'https://www.magnimotorcycles.it',
        'Notes': 'Italian custom motorcycle manufacturer founded by Arturo Magni'
    },
    'Malanca': {
        'Manufacturer': 'Malanca',
        'Official_Website': '',
        'Status': 'Defunct',
        'Country': 'Italy',
        'Years_Active': '1956-1986',
        'Last_Known_URL': '',
        'Notes': 'Italian motorcycle manufacturer'
    },
    'Marusho': {
        'Manufacturer': 'Marusho',
        'Official_Website': '',
        'Status': 'Defunct',
        'Country': 'Japan',
        'Years_Active': '1951-1967',
        'Last_Known_URL': '',
        'Notes': 'Japanese motorcycle manufacturer - Marusho Motor Co.'
    },
    'Midual': {
        'Manufacturer': 'Midual',
        'Official_Website': 'https://www.midual.com',
        'Status': 'Defunct',
        'Country': 'France',
        'Years_Active': '2012-2018',
        'Last_Known_URL': 'https://www.midual.com',
        'Notes': 'French luxury motorcycle manufacturer - Type 1 model'
    },
    'Motobi': {
        'Manufacturer': 'Motobi',
        'Official_Website': 'https://www.motobi.it',
        'Status': 'Active',
        'Country': 'Italy',
        'Years_Active': '2008-Present',
        'Last_Known_URL': 'https://www.motobi.it',
        'Notes': 'Italian scooter manufacturer - owned by Benelli'
    },
    'Motorhispania': {
        'Manufacturer': 'Motorhispania',
        'Official_Website': 'https://www.motorhispania.com',
        'Status': 'Active',
        'Country': 'Spain',
        'Years_Active': '1985-Present',
        'Last_Known_URL': 'https://www.motorhispania.com',
        'Notes': 'Spanish manufacturer of small motorcycles and scooters'
    },
    'Motowell': {
        'Manufacturer': 'Motowell',
        'Official_Website': 'https://www.motowell.com',
        'Status': 'Active',
        'Country': 'Hungary',
        'Years_Active': '2008-Present',
        'Last_Known_URL': 'https://www.motowell.com',
        'Notes': 'Hungarian scooter manufacturer'
    },
    'Mustang': {
        'Manufacturer': 'Mustang Motorcycles',
        'Official_Website': '',
        'Status': 'Defunct',
        'Country': 'USA',
        'Years_Active': '1946-1964',
        'Last_Known_URL': '',
        'Notes': 'American motorcycle manufacturer - Gladden Products'
    }
}

print(f"Researching second batch: {len(remaining_batch_2)} brands...")

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
for brand_name, brand_data in remaining_batch_2.items():
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
mapped_brands = ['Kasinski', 'Kanuni', 'Kikker', 'Kollter', 'Kuba', 'Magnat', 'Magni', 'Malanca', 'Marusho', 'Midual', 'Motobi', 'Motorhispania', 'Motowell', 'Mustang']

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

# Show which brands from the todo list were resolved
resolved_brands = ['Kasinski', 'Kanuni', 'Kikker', 'Kollter', 'Kuba', 'Magnat', 'Magni', 'Malanca', 'Marusho', 'Midual', 'Motobi', 'Motorhispania', 'Motowell', 'Mustang']
print(f"\nResolved from todo list: {', '.join(resolved_brands)}")