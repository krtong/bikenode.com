#!/usr/bin/env python3
import csv
import os

# Remaining brands - smaller manufacturers and obscure brands
remaining_batch_brands = {
    'Megelli': {
        'Manufacturer': 'Megelli',
        'Official_Website': '',
        'Status': 'Defunct',
        'Country': 'United Kingdom/China',
        'Years_Active': '2007-2015',
        'Last_Known_URL': '',
        'Notes': 'British brand with Chinese manufacturing - sport motorcycles'
    },
    'Metisse': {
        'Manufacturer': 'Metisse',
        'Official_Website': 'https://www.metissemotorcycles.co.uk',
        'Status': 'Active',
        'Country': 'United Kingdom',
        'Years_Active': '1963-Present',
        'Last_Known_URL': 'https://www.metissemotorcycles.co.uk',
        'Notes': 'British manufacturer of off-road and desert racing motorcycles'
    },
    'Rickman': {
        'Manufacturer': 'Rickman',
        'Official_Website': '',
        'Status': 'Defunct',
        'Country': 'United Kingdom',
        'Years_Active': '1960-1975',
        'Last_Known_URL': '',
        'Notes': 'British manufacturer famous for nickel-plated frames and off-road bikes'
    },
    'Roehr': {
        'Manufacturer': 'Roehr',
        'Official_Website': '',
        'Status': 'Defunct',
        'Country': 'USA',
        'Years_Active': '2007-2014',
        'Last_Known_URL': '',
        'Notes': 'American manufacturer of high-performance superbikes'
    },
    'Mavizen': {
        'Manufacturer': 'Mavizen',
        'Official_Website': '',
        'Status': 'Defunct',
        'Country': 'USA',
        'Years_Active': '2009-2012',
        'Last_Known_URL': '',
        'Notes': 'American electric motorcycle manufacturer'
    },
    'Triton': {
        'Manufacturer': 'Triton',
        'Official_Website': '',
        'Status': 'Custom/Kit',
        'Country': 'United Kingdom',
        'Years_Active': '1960s-Present',
        'Last_Known_URL': '',
        'Notes': 'British custom motorcycle - Triumph engine in Norton frame combination'
    },
    'Sucker': {
        'Manufacturer': 'Sucker Punch Sallys',
        'Official_Website': '',
        'Status': 'Defunct',
        'Country': 'USA',
        'Years_Active': '2005-2012',
        'Last_Known_URL': '',
        'Notes': 'American custom motorcycle manufacturer'
    },
    'Travertson': {
        'Manufacturer': 'Travertson',
        'Official_Website': '',
        'Status': 'Defunct',
        'Country': 'USA',
        'Years_Active': '2007-2009',
        'Last_Known_URL': '',
        'Notes': 'American luxury custom motorcycle manufacturer'
    },
    'Neco': {
        'Manufacturer': 'Neco',
        'Official_Website': 'https://www.neco.com.tw',
        'Status': 'Active',
        'Country': 'Taiwan',
        'Years_Active': '1978-Present',
        'Last_Known_URL': 'https://www.neco.com.tw',
        'Notes': 'Taiwanese scooter manufacturer'
    },
    'Polini': {
        'Manufacturer': 'Polini',
        'Official_Website': 'https://www.polini.com',
        'Status': 'Active',
        'Country': 'Italy',
        'Years_Active': '1945-Present',
        'Last_Known_URL': 'https://www.polini.com',
        'Notes': 'Italian manufacturer of performance parts and complete motorcycles'
    },
    'Pitster': {
        'Manufacturer': 'Pitster Pro',
        'Official_Website': 'https://www.pitsterpro.com',
        'Status': 'Active',
        'Country': 'USA/China',
        'Years_Active': '2004-Present',
        'Last_Known_URL': 'https://www.pitsterpro.com',
        'Notes': 'American pit bike brand with Chinese manufacturing'
    },
    'Torrot': {
        'Manufacturer': 'Torrot',
        'Official_Website': 'https://www.torrot.com',
        'Status': 'Active',
        'Country': 'Spain',
        'Years_Active': '2010-Present',
        'Last_Known_URL': 'https://www.torrot.com',
        'Notes': 'Spanish electric motorcycle and scooter manufacturer'
    },
    'Tauris': {
        'Manufacturer': 'Tauris',
        'Official_Website': 'https://www.tauris-scooter.com',
        'Status': 'Active',
        'Country': 'Germany/China',
        'Years_Active': '2008-Present',
        'Last_Known_URL': 'https://www.tauris-scooter.com',
        'Notes': 'German scooter brand with Chinese manufacturing'
    },
    'Quadro': {
        'Manufacturer': 'Quadro Vehicles',
        'Official_Website': 'https://www.quadrovehicles.com',
        'Status': 'Active',
        'Country': 'Switzerland',
        'Years_Active': '2009-Present',
        'Last_Known_URL': 'https://www.quadrovehicles.com',
        'Notes': 'Swiss manufacturer of tilting three-wheel scooters'
    },
    'Qooder': {
        'Manufacturer': 'Qooder',
        'Official_Website': 'https://www.qooder.com',
        'Status': 'Active',
        'Country': 'Switzerland',
        'Years_Active': '2016-Present',
        'Last_Known_URL': 'https://www.qooder.com',
        'Notes': 'Swiss four-wheel tilting scooter manufacturer'
    },
    'Vento': {
        'Manufacturer': 'Vento',
        'Official_Website': 'https://www.ventomotors.com',
        'Status': 'Active',
        'Country': 'Mexico',
        'Years_Active': '2011-Present',
        'Last_Known_URL': 'https://www.ventomotors.com',
        'Notes': 'Mexican motorcycle manufacturer'
    },
    'Volta': {
        'Manufacturer': 'Volta',
        'Official_Website': 'https://www.voltamotorcycles.com',
        'Status': 'Active',
        'Country': 'Spain',
        'Years_Active': '2018-Present',
        'Last_Known_URL': 'https://www.voltamotorcycles.com',
        'Notes': 'Spanish electric motorcycle manufacturer'
    },
    'Voskhod': {
        'Manufacturer': 'Voskhod',
        'Official_Website': '',
        'Status': 'Defunct',
        'Country': 'Russia/USSR',
        'Years_Active': '1965-1996',
        'Last_Known_URL': '',
        'Notes': 'Soviet/Russian motorcycle manufacturer'
    },
    'Werner': {
        'Manufacturer': 'Werner',
        'Official_Website': '',
        'Status': 'Defunct',
        'Country': 'France',
        'Years_Active': '1897-1908',
        'Last_Known_URL': '',
        'Notes': 'Early French motorcycle manufacturer - pioneered front-mounted engines'
    },
    'Yale': {
        'Manufacturer': 'Yale',
        'Official_Website': '',
        'Status': 'Defunct',
        'Country': 'USA',
        'Years_Active': '1902-1915',
        'Last_Known_URL': '',
        'Notes': 'Early American motorcycle manufacturer'
    },
    'Yangtze': {
        'Manufacturer': 'Yangtze',
        'Official_Website': '',
        'Status': 'Active',
        'Country': 'China',
        'Years_Active': '1990s-Present',
        'Last_Known_URL': '',
        'Notes': 'Chinese motorcycle manufacturer'
    },
    'Yiben': {
        'Manufacturer': 'Yiben',
        'Official_Website': '',
        'Status': 'Active',
        'Country': 'China',
        'Years_Active': '2000s-Present',
        'Last_Known_URL': '',
        'Notes': 'Chinese scooter and motorcycle manufacturer'
    },
    'Yuki': {
        'Manufacturer': 'Yuki',
        'Official_Website': '',
        'Status': 'Active',
        'Country': 'China',
        'Years_Active': '2000s-Present',
        'Last_Known_URL': '',
        'Notes': 'Chinese motorcycle manufacturer'
    },
    'Zest': {
        'Manufacturer': 'Zest',
        'Official_Website': '',
        'Status': 'Unknown',
        'Country': 'Unknown',
        'Years_Active': 'Unknown',
        'Last_Known_URL': '',
        'Notes': 'Limited information available - possibly defunct or very small manufacturer'
    },
    'Zweirad-Union': {
        'Manufacturer': 'Zweirad-Union',
        'Official_Website': '',
        'Status': 'Defunct',
        'Country': 'Germany',
        'Years_Active': '1958-1974',
        'Last_Known_URL': '',
        'Notes': 'German motorcycle conglomerate - merged DKW, Express, and Victoria brands'
    }
}

print(f"Researching remaining batch: {len(remaining_batch_brands)} brands...")

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
for brand_name, brand_data in remaining_batch_brands.items():
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
aliases = ['Sucker Punch Sallys', 'Pitster Pro', 'Quadro Vehicles']

for brand in remaining_missing:
    if brand not in remaining_batch_brands and brand not in aliases:
        updated_missing.append(brand)

with open('./database/data/missing_brands.txt', 'w', encoding='utf-8') as f:
    for brand in updated_missing:
        f.write(f"{brand}\n")

print(f"Remaining missing brands: {len(updated_missing)}")