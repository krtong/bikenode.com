#!/usr/bin/env python3
import csv
import os

# Second batch of well-known brands to research
batch_2_brands = {
    'NSU': {
        'Manufacturer': 'NSU',
        'Official_Website': '',
        'Status': 'Defunct',
        'Country': 'Germany',
        'Years_Active': '1873-1977',
        'Last_Known_URL': '',
        'Notes': 'Historic German manufacturer - merged with Auto Union to form Audi NSU Auto Union AG'
    },
    'MZ': {
        'Manufacturer': 'MZ',
        'Official_Website': 'https://www.mz-motorcycles.com',
        'Status': 'Active',
        'Country': 'Germany',
        'Years_Active': '1906-Present',
        'Last_Known_URL': 'https://www.mz-motorcycles.com',
        'Notes': 'Motorenwerke Zschopau - historic East German manufacturer revived'
    },
    'Malaguti': {
        'Manufacturer': 'Malaguti',
        'Official_Website': 'https://www.malaguti.com',
        'Status': 'Active',
        'Country': 'Italy',
        'Years_Active': '1930-Present',
        'Last_Known_URL': 'https://www.malaguti.com',
        'Notes': 'Italian scooter and motorcycle manufacturer - owned by KSR Group'
    },
    'Mash': {
        'Manufacturer': 'Mash',
        'Official_Website': 'https://www.mash.fr',
        'Status': 'Active',
        'Country': 'France',
        'Years_Active': '2010-Present',
        'Last_Known_URL': 'https://www.mash.fr',
        'Notes': 'French manufacturer of retro-styled motorcycles - Chinese manufacturing'
    },
    'Matchless': {
        'Manufacturer': 'Matchless',
        'Official_Website': '',
        'Status': 'Defunct',
        'Country': 'United Kingdom',
        'Years_Active': '1899-1966',
        'Last_Known_URL': '',
        'Notes': 'Historic British manufacturer - part of Associated Motor Cycles (AMC)'
    },
    'PGO': {
        'Manufacturer': 'PGO',
        'Official_Website': 'https://www.pgo.com.tw',
        'Status': 'Active',
        'Country': 'Taiwan',
        'Years_Active': '1964-Present',
        'Last_Known_URL': 'https://www.pgo.com.tw',
        'Notes': 'Taiwanese scooter manufacturer - P.G.O. Scooters'
    },
    'Zanella': {
        'Manufacturer': 'Zanella',
        'Official_Website': 'https://www.zanella.com.ar',
        'Status': 'Active',
        'Country': 'Argentina',
        'Years_Active': '1948-Present',
        'Last_Known_URL': 'https://www.zanella.com.ar',
        'Notes': 'Major Argentine motorcycle manufacturer - diverse product range'
    },
    'Tomos': {
        'Manufacturer': 'Tomos',
        'Official_Website': 'https://www.tomos.si',
        'Status': 'Active',
        'Country': 'Slovenia',
        'Years_Active': '1954-Present',
        'Last_Known_URL': 'https://www.tomos.si',
        'Notes': 'Slovenian moped and motorcycle manufacturer'
    },
    'Modenas': {
        'Manufacturer': 'Modenas',
        'Official_Website': 'https://www.modenas.com.my',
        'Status': 'Active',
        'Country': 'Malaysia',
        'Years_Active': '1995-Present',
        'Last_Known_URL': 'https://www.modenas.com.my',
        'Notes': 'Malaysian manufacturer with Kawasaki technology partnership'
    },
    'Motomel': {
        'Manufacturer': 'Motomel',
        'Official_Website': 'https://www.motomel.com.ar',
        'Status': 'Active',
        'Country': 'Argentina',
        'Years_Active': '1983-Present',
        'Last_Known_URL': 'https://www.motomel.com.ar',
        'Notes': 'Major Argentine motorcycle manufacturer - diverse range of motorcycles and scooters'
    },
    'Minsk': {
        'Manufacturer': 'Minsk',
        'Official_Website': 'https://www.minsk.by',
        'Status': 'Active',
        'Country': 'Belarus',
        'Years_Active': '1951-Present',
        'Last_Known_URL': 'https://www.minsk.by',
        'Notes': 'Belarusian manufacturer - Minsk Motorcycle and Bicycle Plant'
    },
    'UM': {
        'Manufacturer': 'UM',
        'Official_Website': 'https://www.um-global.com',
        'Status': 'Active',
        'Country': 'USA/China',
        'Years_Active': '2008-Present',
        'Last_Known_URL': 'https://www.um-global.com',
        'Notes': 'United Motors - American design with Chinese manufacturing'
    },
    'Voge': {
        'Manufacturer': 'Voge',
        'Official_Website': 'https://www.vogemoto.com',
        'Status': 'Active',
        'Country': 'China',
        'Years_Active': '2017-Present',
        'Last_Known_URL': 'https://www.vogemoto.com',
        'Notes': 'Premium Chinese motorcycle brand by Loncin Motor - European styling'
    },
    'Hanway': {
        'Manufacturer': 'Hanway',
        'Official_Website': 'https://www.hanway.com',
        'Status': 'Active',
        'Country': 'China',
        'Years_Active': '2012-Present',
        'Last_Known_URL': 'https://www.hanway.com',
        'Notes': 'Chinese manufacturer of retro and classic styled motorcycles'
    },
    'QJmotor': {
        'Manufacturer': 'QJMotor',
        'Official_Website': 'https://www.qjmotor.com',
        'Status': 'Active',
        'Country': 'China',
        'Years_Active': '2005-Present',
        'Last_Known_URL': 'https://www.qjmotor.com',
        'Notes': 'Chinese manufacturer - premium sub-brand of Qianjiang Group'
    }
}

print(f"Researching {len(batch_2_brands)} additional brands...")

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
for brand_name, brand_data in batch_2_brands.items():
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
    if brand not in batch_2_brands:
        updated_missing.append(brand)

with open('./database/data/missing_brands.txt', 'w', encoding='utf-8') as f:
    for brand in updated_missing:
        f.write(f"{brand}\n")

print(f"Remaining missing brands: {len(updated_missing)}")