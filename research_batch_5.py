#!/usr/bin/env python3
import csv
import os

# Fifth batch - Historic brands and specialized manufacturers
batch_5_brands = {
    'Scott': {
        'Manufacturer': 'Scott',
        'Official_Website': 'https://www.scott-sports.com',
        'Status': 'Defunct (motorcycles)',
        'Country': 'United Kingdom',
        'Years_Active': '1908-1978',
        'Last_Known_URL': 'https://www.scott-sports.com',
        'Notes': 'Historic British motorcycle manufacturer - company now focuses on bicycles and winter sports'
    },
    'Rudge': {
        'Manufacturer': 'Rudge',
        'Official_Website': '',
        'Status': 'Defunct',
        'Country': 'United Kingdom',
        'Years_Active': '1911-1946',
        'Last_Known_URL': '',
        'Notes': 'British manufacturer known for innovative valve gear and racing success'
    },
    'Nimbus': {
        'Manufacturer': 'Nimbus',
        'Official_Website': '',
        'Status': 'Defunct',
        'Country': 'Denmark',
        'Years_Active': '1919-1960',
        'Last_Known_URL': '',
        'Notes': 'Danish motorcycle manufacturer famous for inline-four cylinder engines'
    },
    'Terrot': {
        'Manufacturer': 'Terrot',
        'Official_Website': '',
        'Status': 'Defunct',
        'Country': 'France',
        'Years_Active': '1901-1961',
        'Last_Known_URL': '',
        'Notes': 'Historic French motorcycle manufacturer'
    },
    'Panther': {
        'Manufacturer': 'Panther',
        'Official_Website': '',
        'Status': 'Defunct',
        'Country': 'United Kingdom',
        'Years_Active': '1904-1966',
        'Last_Known_URL': '',
        'Notes': 'British manufacturer known for large single-cylinder motorcycles'
    },
    'Cotton': {
        'Manufacturer': 'Cotton',
        'Official_Website': '',
        'Status': 'Defunct',
        'Country': 'United Kingdom',
        'Years_Active': '1918-1980',
        'Last_Known_URL': '',
        'Notes': 'British manufacturer known for triangulated frame design'
    },
    'Silk': {
        'Manufacturer': 'Silk',
        'Official_Website': '',
        'Status': 'Defunct',
        'Country': 'United Kingdom',
        'Years_Active': '1975-1979',
        'Last_Known_URL': '',
        'Notes': 'British manufacturer of Scott-engined motorcycles'
    },
    'Greeves': {
        'Manufacturer': 'Greeves',
        'Official_Website': '',
        'Status': 'Defunct',
        'Country': 'United Kingdom',
        'Years_Active': '1952-1977',
        'Last_Known_URL': '',
        'Notes': 'British manufacturer known for trials and motocross bikes'
    },
    'Thumpstar': {
        'Manufacturer': 'Thumpstar',
        'Official_Website': 'https://www.thumpstar.com.au',
        'Status': 'Active',
        'Country': 'Australia/China',
        'Years_Active': '2004-Present',
        'Last_Known_URL': 'https://www.thumpstar.com.au',
        'Notes': 'Australian brand specializing in pit bikes and mini motorcycles'
    },
    'TRS': {
        'Manufacturer': 'TRS',
        'Official_Website': 'https://www.trsmotorcycles.com',
        'Status': 'Active',
        'Country': 'Spain',
        'Years_Active': '2013-Present',
        'Last_Known_URL': 'https://www.trsmotorcycles.com',
        'Notes': 'Spanish trials motorcycle specialist'
    },
    'Scorpa': {
        'Manufacturer': 'Scorpa',
        'Official_Website': 'https://www.scorpa.fr',
        'Status': 'Active',
        'Country': 'France',
        'Years_Active': '1993-Present',
        'Last_Known_URL': 'https://www.scorpa.fr',
        'Notes': 'French trials motorcycle manufacturer'
    },
    'Oset': {
        'Manufacturer': 'Oset',
        'Official_Website': 'https://www.osetbikes.com',
        'Status': 'Active',
        'Country': 'Spain',
        'Years_Active': '2004-Present',
        'Last_Known_URL': 'https://www.osetbikes.com',
        'Notes': 'Spanish manufacturer of electric trials bikes for children and adults'
    },
    'Vertigo': {
        'Manufacturer': 'Vertigo',
        'Official_Website': 'https://www.vertigo.com',
        'Status': 'Active',
        'Country': 'Spain',
        'Years_Active': '2017-Present',
        'Last_Known_URL': 'https://www.vertigo.com',
        'Notes': 'Spanish trials and enduro motorcycle manufacturer'
    },
    'Simson': {
        'Manufacturer': 'Simson',
        'Official_Website': '',
        'Status': 'Defunct',
        'Country': 'East Germany',
        'Years_Active': '1950-2002',
        'Last_Known_URL': '',
        'Notes': 'East German manufacturer of small motorcycles and mopeds'
    },
    'WSK': {
        'Manufacturer': 'WSK',
        'Official_Website': '',
        'Status': 'Defunct',
        'Country': 'Poland',
        'Years_Active': '1946-1985',
        'Last_Known_URL': '',
        'Notes': 'Polish motorcycle manufacturer - Wytwórnia Sprzętu Komunikacyjnego'
    }
}

print(f"Researching batch 5: {len(batch_5_brands)} brands...")

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
for brand_name, brand_data in batch_5_brands.items():
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
with open('./database/data/missing_brands.txt', 'r', encoding='utf-8') as f:
    remaining_missing = [line.strip() for line in f if line.strip()]

updated_missing = []
for brand in remaining_missing:
    if brand not in batch_5_brands:
        updated_missing.append(brand)

with open('./database/data/missing_brands.txt', 'w', encoding='utf-8') as f:
    for brand in updated_missing:
        f.write(f"{brand}\n")

print(f"Remaining missing brands: {len(updated_missing)}")