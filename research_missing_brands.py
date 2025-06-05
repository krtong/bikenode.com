#!/usr/bin/env python3
import csv
import os

# Priority brands to research first (well-known manufacturers)
priority_brands = [
    'Mahindra', 'Sym', 'TVS', 'Zontes', 'Zundapp', 'TGB', 'Royal', 'SWM', 
    'Rieju', 'Sherco', 'TM', 'Montesa', 'Stark', 'Surron', 'Zero Engineering',
    'Niu', 'Revolt', 'Ola', 'Silence', 'Savic', 'Verge', 'Voge', 'Zongshen'
]

# Read missing brands
missing_brands = []
with open('./database/data/missing_brands.txt', 'r', encoding='utf-8') as f:
    missing_brands = [line.strip() for line in f if line.strip()]

print(f"Found {len(missing_brands)} missing brands")
print(f"Priority brands to research: {len(priority_brands)}")

# Create a research template for each priority brand
research_data = {
    'Mahindra': {
        'Manufacturer': 'Mahindra',
        'Official_Website': 'https://www.mahindra.com',
        'Status': 'Active',
        'Country': 'India',
        'Years_Active': '1945-Present',
        'Last_Known_URL': 'https://www.mahindra.com',
        'Notes': 'Major Indian conglomerate - Mahindra Two Wheelers produces scooters and electric vehicles'
    },
    'Sym': {
        'Manufacturer': 'SYM',
        'Official_Website': 'https://www.sym-global.com',
        'Status': 'Active',
        'Country': 'Taiwan',
        'Years_Active': '1954-Present',
        'Last_Known_URL': 'https://www.sym-global.com',
        'Notes': 'Sanyang Motor Co - major Taiwanese scooter and motorcycle manufacturer'
    },
    'TVS': {
        'Manufacturer': 'TVS',
        'Official_Website': 'https://www.tvsmotor.com',
        'Status': 'Active',
        'Country': 'India',
        'Years_Active': '1978-Present',
        'Last_Known_URL': 'https://www.tvsmotor.com',
        'Notes': 'TVS Motor Company - major Indian manufacturer of motorcycles and scooters'
    },
    'Zontes': {
        'Manufacturer': 'Zontes',
        'Official_Website': 'https://www.zontes.com',
        'Status': 'Active',
        'Country': 'China',
        'Years_Active': '2003-Present',
        'Last_Known_URL': 'https://www.zontes.com',
        'Notes': 'Chinese manufacturer known for mid-displacement motorcycles and adventure bikes'
    },
    'Zündapp': {
        'Manufacturer': 'Zündapp',
        'Official_Website': '',
        'Status': 'Defunct',
        'Country': 'Germany',
        'Years_Active': '1917-1984',
        'Last_Known_URL': '',
        'Notes': 'Historic German manufacturer - famous for military motorcycles and two-stroke engines'
    },
    'TGB': {
        'Manufacturer': 'TGB',
        'Official_Website': 'https://www.tgb.com.tw',
        'Status': 'Active',
        'Country': 'Taiwan',
        'Years_Active': '1978-Present',
        'Last_Known_URL': 'https://www.tgb.com.tw',
        'Notes': 'Taiwan Golden Bee - manufacturer of scooters and ATVs'
    },
    'Royal': {
        'Manufacturer': 'Royal Enfield',
        'Official_Website': 'https://www.royalenfield.com',
        'Status': 'Active',
        'Country': 'India/UK',
        'Years_Active': '1901-Present',
        'Last_Known_URL': 'https://www.royalenfield.com',
        'Notes': 'Historic British brand now owned by Eicher Motors India - classic motorcycle designs'
    },
    'SWM': {
        'Manufacturer': 'SWM',
        'Official_Website': 'https://www.swm-motorcycles.com',
        'Status': 'Active',
        'Country': 'Italy',
        'Years_Active': '1971-1984; 2014-Present',
        'Last_Known_URL': 'https://www.swm-motorcycles.com',
        'Notes': 'SWM Motorcycles revived by Shineray Group - Italian design with Chinese manufacturing'
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
    'Sherco': {
        'Manufacturer': 'Sherco',
        'Official_Website': 'https://www.sherco.com',
        'Status': 'Active',
        'Country': 'France',
        'Years_Active': '1998-Present',
        'Last_Known_URL': 'https://www.sherco.com',
        'Notes': 'French manufacturer specializing in trials and enduro motorcycles'
    },
    'TM': {
        'Manufacturer': 'TM Racing',
        'Official_Website': 'https://www.tmracing.it',
        'Status': 'Active',
        'Country': 'Italy',
        'Years_Active': '1976-Present',
        'Last_Known_URL': 'https://www.tmracing.it',
        'Notes': 'Italian manufacturer of motocross and enduro motorcycles - hand-built racing machines'
    },
    'Montesa': {
        'Manufacturer': 'Montesa',
        'Official_Website': 'https://www.montesa.com',
        'Status': 'Active',
        'Country': 'Spain',
        'Years_Active': '1944-Present',
        'Last_Known_URL': 'https://www.montesa.com',
        'Notes': 'Spanish trials specialist owned by Honda since 1986 - famous for Cota trials bikes'
    },
    'Stark': {
        'Manufacturer': 'Stark Future',
        'Official_Website': 'https://starkfuture.com',
        'Status': 'Active',
        'Country': 'Spain',
        'Years_Active': '2019-Present',
        'Last_Known_URL': 'https://starkfuture.com',
        'Notes': 'Electric motocross bike manufacturer - VARG electric dirt bike'
    },
    'Surron': {
        'Manufacturer': 'Sur-Ron',
        'Official_Website': 'https://www.sur-ron.com',
        'Status': 'Active',
        'Country': 'China',
        'Years_Active': '2014-Present',
        'Last_Known_URL': 'https://www.sur-ron.com',
        'Notes': 'Chinese electric bike manufacturer - Light Bee electric dirt bike popular globally'
    },
    'Niu': {
        'Manufacturer': 'Niu',
        'Official_Website': 'https://www.niu.com',
        'Status': 'Active',
        'Country': 'China',
        'Years_Active': '2014-Present',
        'Last_Known_URL': 'https://www.niu.com',
        'Notes': 'Chinese electric scooter manufacturer - smart connected electric vehicles'
    }
}

print("\nResearched priority brands:")
for brand, data in research_data.items():
    print(f"- {brand}: {data['Status']} from {data['Country']}")

# Read existing motorcycle brands CSV
existing_data = []
headers = []

with open('./database/data/motorcycle_brands.csv', 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    headers = reader.fieldnames
    existing_data = list(reader)

print(f"\nCurrent database has {len(existing_data)} brands")

# Add researched brands to existing data
added_count = 0
for brand_name, brand_data in research_data.items():
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
remaining_missing = []
for brand in missing_brands:
    if brand not in research_data:
        remaining_missing.append(brand)

with open('./database/data/missing_brands.txt', 'w', encoding='utf-8') as f:
    for brand in remaining_missing:
        f.write(f"{brand}\n")

print(f"Remaining missing brands: {len(remaining_missing)}")