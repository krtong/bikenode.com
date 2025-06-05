#!/usr/bin/env python3
import csv
import os

# Sixth batch - US, European and remaining significant manufacturers
batch_6_brands = {
    'Pierce': {
        'Manufacturer': 'Pierce',
        'Official_Website': '',
        'Status': 'Defunct',
        'Country': 'USA',
        'Years_Active': '1909-1913',
        'Last_Known_URL': '',
        'Notes': 'Historic American motorcycle manufacturer - Pierce Motorcycle Company'
    },
    'Pope': {
        'Manufacturer': 'Pope',
        'Official_Website': '',
        'Status': 'Defunct',
        'Country': 'USA',
        'Years_Active': '1911-1918',
        'Last_Known_URL': '',
        'Notes': 'Historic American motorcycle manufacturer - Pope Manufacturing Company'
    },
    'Reading': {
        'Manufacturer': 'Reading',
        'Official_Website': '',
        'Status': 'Defunct',
        'Country': 'USA',
        'Years_Active': '1901-1914',
        'Last_Known_URL': '',
        'Notes': 'Historic American motorcycle manufacturer - Reading Standard Corporation'
    },
    'Excelsior': {
        'Manufacturer': 'Excelsior',
        'Official_Website': '',
        'Status': 'Defunct',
        'Country': 'USA/UK',
        'Years_Active': '1896-1931',
        'Last_Known_URL': '',
        'Notes': 'Historic manufacturer - American Excelsior-Henderson and British Excelsior Motor Company'
    },
    'Henderson': {
        'Manufacturer': 'Henderson',
        'Official_Website': '',
        'Status': 'Defunct',
        'Country': 'USA',
        'Years_Active': '1911-1931',
        'Last_Known_URL': '',
        'Notes': 'Historic American manufacturer known for four-cylinder motorcycles'
    },
    'Crocker': {
        'Manufacturer': 'Crocker',
        'Official_Website': '',
        'Status': 'Defunct',
        'Country': 'USA',
        'Years_Active': '1936-1942',
        'Last_Known_URL': '',
        'Notes': 'Rare American manufacturer - Albert Crocker built high-performance V-twins'
    },
    'Douglas': {
        'Manufacturer': 'Douglas',
        'Official_Website': '',
        'Status': 'Defunct',
        'Country': 'United Kingdom',
        'Years_Active': '1907-1957',
        'Last_Known_URL': '',
        'Notes': 'British manufacturer known for horizontally-opposed twin engines'
    },
    'Ariel': {
        'Manufacturer': 'Ariel',
        'Official_Website': '',
        'Status': 'Defunct',
        'Country': 'United Kingdom',
        'Years_Active': '1870-1970',
        'Last_Known_URL': '',
        'Notes': 'Historic British manufacturer famous for Square Four and Leader models'
    },
    'Francis-Barnett': {
        'Manufacturer': 'Francis-Barnett',
        'Official_Website': '',
        'Status': 'Defunct',
        'Country': 'United Kingdom',
        'Years_Active': '1919-1966',
        'Last_Known_URL': '',
        'Notes': 'British manufacturer known for bolt-up frame construction'
    },
    'Münch': {
        'Manufacturer': 'Münch',
        'Official_Website': '',
        'Status': 'Defunct',
        'Country': 'Germany',
        'Years_Active': '1966-1980',
        'Last_Known_URL': '',
        'Notes': 'German manufacturer famous for NSU car engine-powered motorcycles'
    },
    'MuZ': {
        'Manufacturer': 'MuZ',
        'Official_Website': '',
        'Status': 'Defunct',
        'Country': 'Germany',
        'Years_Active': '1990-2008',
        'Last_Known_URL': '',
        'Notes': 'German manufacturer - successor to MZ after reunification'
    },
    'Sanglas': {
        'Manufacturer': 'Sanglas',
        'Official_Website': '',
        'Status': 'Defunct',
        'Country': 'Spain',
        'Years_Active': '1942-1981',
        'Last_Known_URL': '',
        'Notes': 'Spanish manufacturer acquired by Yamaha in 1977'
    },
    'Ossa': {
        'Manufacturer': 'Ossa',
        'Official_Website': 'https://www.ossa.es',
        'Status': 'Active',
        'Country': 'Spain', 
        'Years_Active': '1924-1982; 2010-Present',
        'Last_Known_URL': 'https://www.ossa.es',
        'Notes': 'Spanish trials and enduro specialist revived - famous for lightweight two-strokes'
    },
    'Bultaco': {
        'Manufacturer': 'Bultaco',
        'Official_Website': '',
        'Status': 'Defunct',
        'Country': 'Spain',
        'Years_Active': '1958-1983',
        'Last_Known_URL': '',
        'Notes': 'Spanish manufacturer famous for trials and motocross bikes'
    },
    'Sears': {
        'Manufacturer': 'Sears',
        'Official_Website': '',
        'Status': 'Defunct',
        'Country': 'USA',
        'Years_Active': '1912-1916; 1953-1975',
        'Last_Known_URL': '',
        'Notes': 'American retailer that sold motorcycles under Sears brand'
    },
    'Whizzer': {
        'Manufacturer': 'Whizzer',
        'Official_Website': '',
        'Status': 'Defunct',
        'Country': 'USA',
        'Years_Active': '1939-1962; 1997-2008',
        'Last_Known_URL': '',
        'Notes': 'American motorized bicycle manufacturer'
    },
    'Cushman': {
        'Manufacturer': 'Cushman',
        'Official_Website': '',
        'Status': 'Defunct',
        'Country': 'USA',
        'Years_Active': '1903-1965',
        'Last_Known_URL': '',
        'Notes': 'American manufacturer of motor scooters and utility vehicles'
    },
    'Allstate': {
        'Manufacturer': 'Allstate',
        'Official_Website': '',
        'Status': 'Defunct',
        'Country': 'USA',
        'Years_Active': '1950s-1960s',
        'Last_Known_URL': '',
        'Notes': 'Sears subsidiary brand for motorcycles and scooters'
    },
    'Simplex': {
        'Manufacturer': 'Simplex',
        'Official_Website': '',
        'Status': 'Defunct',
        'Country': 'USA',
        'Years_Active': '1935-1975',
        'Last_Known_URL': '',
        'Notes': 'American manufacturer of small motorcycles and mopeds'
    },
    'Romet': {
        'Manufacturer': 'Romet',
        'Official_Website': 'https://www.romet.pl',
        'Status': 'Active',
        'Country': 'Poland',
        'Years_Active': '1948-Present',
        'Last_Known_URL': 'https://www.romet.pl',
        'Notes': 'Polish manufacturer of bicycles and motorcycles'
    }
}

print(f"Researching batch 6: {len(batch_6_brands)} brands...")

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
for brand_name, brand_data in batch_6_brands.items():
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
    if brand not in batch_6_brands and brand != 'Francis-Barnett':  # Handle hyphenated name
        updated_missing.append(brand)

with open('./database/data/missing_brands.txt', 'w', encoding='utf-8') as f:
    for brand in updated_missing:
        f.write(f"{brand}\n")

print(f"Remaining missing brands: {len(updated_missing)}")