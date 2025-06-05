#!/usr/bin/env python3
import csv
import os

# Fourth batch - Chinese, Asian, and other manufacturers
batch_4_brands = {
    'Qingqi': {
        'Manufacturer': 'Qingqi',
        'Official_Website': 'https://www.qingqi.com',
        'Status': 'Active',
        'Country': 'China',
        'Years_Active': '1956-Present',
        'Last_Known_URL': 'https://www.qingqi.com',
        'Notes': 'Chinese manufacturer - Qingqi Group produces motorcycles and scooters'
    },
    'Shineray': {
        'Manufacturer': 'Shineray',
        'Official_Website': 'https://www.shineray.com',
        'Status': 'Active',
        'Country': 'China',
        'Years_Active': '1997-Present',
        'Last_Known_URL': 'https://www.shineray.com',
        'Notes': 'Major Chinese manufacturer - owns SWM brand and produces diverse vehicle range'
    },
    'Sukida': {
        'Manufacturer': 'Sukida',
        'Official_Website': 'https://www.sukida.com',
        'Status': 'Active',
        'Country': 'China',
        'Years_Active': '1999-Present',
        'Last_Known_URL': 'https://www.sukida.com',
        'Notes': 'Chinese motorcycle and scooter manufacturer'
    },
    'Skyteam': {
        'Manufacturer': 'Skyteam',
        'Official_Website': 'https://www.skyteammoto.com',
        'Status': 'Active',
        'Country': 'China',
        'Years_Active': '2004-Present',
        'Last_Known_URL': 'https://www.skyteammoto.com',
        'Notes': 'Chinese manufacturer of small displacement motorcycles and monkey bikes'
    },
    'Sinnis': {
        'Manufacturer': 'Sinnis',
        'Official_Website': 'https://www.sinnis.co.uk',
        'Status': 'Active',
        'Country': 'United Kingdom/China',
        'Years_Active': '2009-Present',
        'Last_Known_URL': 'https://www.sinnis.co.uk',
        'Notes': 'UK brand with Chinese manufacturing - affordable motorcycles and scooters'
    },
    'Tao': {
        'Manufacturer': 'Tao Motor',
        'Official_Website': 'https://www.taomotor.com',
        'Status': 'Active',
        'Country': 'China/USA',
        'Years_Active': '2003-Present',
        'Last_Known_URL': 'https://www.taomotor.com',
        'Notes': 'Chinese manufacturer with US distribution - ATVs and motorcycles'
    },
    'Tank': {
        'Manufacturer': 'Tank',
        'Official_Website': 'https://www.tankmotorcycle.com',
        'Status': 'Active',
        'Country': 'China',
        'Years_Active': '2005-Present',
        'Last_Known_URL': 'https://www.tankmotorcycle.com',
        'Notes': 'Chinese manufacturer of touring and sport motorcycles'
    },
    'Sundiro': {
        'Manufacturer': 'Sundiro',
        'Official_Website': 'https://www.sundiro.com',
        'Status': 'Active',
        'Country': 'China',
        'Years_Active': '1999-Present',
        'Last_Known_URL': 'https://www.sundiro.com',
        'Notes': 'Chinese manufacturer with Honda technology partnership'
    },
    'Xmotos': {
        'Manufacturer': 'Xmotos',
        'Official_Website': 'https://www.xmotos.com',
        'Status': 'Active',
        'Country': 'China',
        'Years_Active': '2009-Present',
        'Last_Known_URL': 'https://www.xmotos.com',
        'Notes': 'Chinese manufacturer specializing in dirt bikes and pit bikes'
    },
    'Yamasaki': {
        'Manufacturer': 'Yamasaki',
        'Official_Website': 'https://www.yamasaki.com.br',
        'Status': 'Active',
        'Country': 'Brazil/China',
        'Years_Active': '2010-Present',
        'Last_Known_URL': 'https://www.yamasaki.com.br',
        'Notes': 'Brazilian brand with Chinese manufacturing'
    },
    'Rieju': {
        'Manufacturer': 'Rieju',
        'Official_Website': 'https://www.rieju.com',
        'Status': 'Active',
        'Country': 'Spain',
        'Years_Active': '1934-Present',
        'Last_Known_URL': 'https://www.rieju.com',
        'Notes': 'Spanish manufacturer specializing in trials, enduro, and small displacement motorcycles'
    },
    'Vmoto': {
        'Manufacturer': 'Vmoto',
        'Official_Website': 'https://www.vmotosoco.com',
        'Status': 'Active',
        'Country': 'China/Australia',
        'Years_Active': '2008-Present',
        'Last_Known_URL': 'https://www.vmotosoco.com',
        'Notes': 'Chinese electric scooter manufacturer with Australian operations'
    },
    'WK': {
        'Manufacturer': 'WK Bikes',
        'Official_Website': 'https://www.wkbikes.com',
        'Status': 'Active',
        'Country': 'Czech Republic/China',
        'Years_Active': '2008-Present',
        'Last_Known_URL': 'https://www.wkbikes.com',
        'Notes': 'Czech brand with Chinese manufacturing - sport and naked bikes'
    },
    'Znen': {
        'Manufacturer': 'Znen',
        'Official_Website': 'https://www.znen.com',
        'Status': 'Active',
        'Country': 'China',
        'Years_Active': '1999-Present',
        'Last_Known_URL': 'https://www.znen.com',
        'Notes': 'Chinese scooter and motorcycle manufacturer'
    },
    'Sunbeam': {
        'Manufacturer': 'Sunbeam',
        'Official_Website': '',
        'Status': 'Defunct',
        'Country': 'United Kingdom',
        'Years_Active': '1901-1957',
        'Last_Known_URL': '',
        'Notes': 'Historic British manufacturer known for innovative engineering'
    }
}

print(f"Researching batch 4: {len(batch_4_brands)} brands...")

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
for brand_name, brand_data in batch_4_brands.items():
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
    if brand not in batch_4_brands:
        updated_missing.append(brand)

with open('./database/data/missing_brands.txt', 'w', encoding='utf-8') as f:
    for brand in updated_missing:
        f.write(f"{brand}\n")

print(f"Remaining missing brands: {len(updated_missing)}")