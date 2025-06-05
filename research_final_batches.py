#!/usr/bin/env python3
import csv
import os

# Final comprehensive batch - remaining significant and obscure manufacturers
final_batch_brands = {
    'Ohvale': {
        'Manufacturer': 'Ohvale',
        'Official_Website': 'https://www.ohvale.com',
        'Status': 'Active',
        'Country': 'Italy',
        'Years_Active': '2012-Present',
        'Last_Known_URL': 'https://www.ohvale.com',
        'Notes': 'Italian manufacturer of small displacement racing motorcycles - GP0 and GP2 series'
    },
    'Revolt': {
        'Manufacturer': 'Revolt Motors',
        'Official_Website': 'https://www.revoltmotors.com',
        'Status': 'Active',
        'Country': 'India',
        'Years_Active': '2019-Present',
        'Last_Known_URL': 'https://www.revoltmotors.com',
        'Notes': 'Indian electric motorcycle manufacturer - RV400 AI-enabled electric bike'
    },
    'Ola': {
        'Manufacturer': 'Ola Electric',
        'Official_Website': 'https://olaelectric.com',
        'Status': 'Active',
        'Country': 'India',
        'Years_Active': '2017-Present',
        'Last_Known_URL': 'https://olaelectric.com',
        'Notes': 'Indian electric vehicle manufacturer - S1 electric scooter series'
    },
    'Okinawa': {
        'Manufacturer': 'Okinawa',
        'Official_Website': 'https://www.okinawaev.com',
        'Status': 'Active',
        'Country': 'India',
        'Years_Active': '2015-Present',
        'Last_Known_URL': 'https://www.okinawaev.com',
        'Notes': 'Indian electric scooter manufacturer'
    },
    'Tork': {
        'Manufacturer': 'Tork Motors',
        'Official_Website': 'https://torkmotors.com',
        'Status': 'Active',
        'Country': 'India',
        'Years_Active': '2009-Present',
        'Last_Known_URL': 'https://torkmotors.com',
        'Notes': 'Indian electric motorcycle manufacturer - T6X electric motorcycle'
    },
    'YObykes': {
        'Manufacturer': 'YObykes',
        'Official_Website': 'https://www.yobykes.com',
        'Status': 'Active',
        'Country': 'India',
        'Years_Active': '2007-Present',
        'Last_Known_URL': 'https://www.yobykes.com',
        'Notes': 'Indian electric vehicle manufacturer'
    },
    'Ather': {
        'Manufacturer': 'Ather Energy',
        'Official_Website': 'https://www.atherenergy.com',
        'Status': 'Active',
        'Country': 'India',
        'Years_Active': '2013-Present',
        'Last_Known_URL': 'https://www.atherenergy.com',
        'Notes': 'Indian electric scooter manufacturer - 450X intelligent electric scooter'
    },
    'Ryvid': {
        'Manufacturer': 'Ryvid',
        'Official_Website': 'https://www.ryvid.com',
        'Status': 'Active',
        'Country': 'USA',
        'Years_Active': '2020-Present',
        'Last_Known_URL': 'https://www.ryvid.com',
        'Notes': 'American electric motorcycle startup - Anthem electric motorcycle'
    },
    'Stels': {
        'Manufacturer': 'Stels',
        'Official_Website': 'https://www.stels.ru',
        'Status': 'Active',
        'Country': 'Russia',
        'Years_Active': '1996-Present',
        'Last_Known_URL': 'https://www.stels.ru',
        'Notes': 'Russian manufacturer of bicycles, motorcycles, and ATVs'
    },
    'Scomadi': {
        'Manufacturer': 'Scomadi',
        'Official_Website': 'https://www.scomadi.com',
        'Status': 'Active',
        'Country': 'United Kingdom/Thailand',
        'Years_Active': '2012-Present',
        'Last_Known_URL': 'https://www.scomadi.com',
        'Notes': 'British scooter brand with Thai manufacturing - retro-styled scooters'
    },
    'Schwinn': {
        'Manufacturer': 'Schwinn',
        'Official_Website': 'https://www.schwinn.com',
        'Status': 'Active (Limited)',
        'Country': 'USA',
        'Years_Active': '1895-Present',
        'Last_Known_URL': 'https://www.schwinn.com',
        'Notes': 'Historic American manufacturer - primarily bicycles, limited motorcycle history'
    },
    'Sarolea': {
        'Manufacturer': 'Sarolea',
        'Official_Website': 'https://www.sarolea.be',
        'Status': 'Active',
        'Country': 'Belgium',
        'Years_Active': '1850-1963; 2010-Present',
        'Last_Known_URL': 'https://www.sarolea.be',
        'Notes': 'Historic Belgian brand revived - electric superbikes'
    },
    'Neander': {
        'Manufacturer': 'Neander Motors',
        'Official_Website': 'https://www.neander-motors.com',
        'Status': 'Active',
        'Country': 'Germany',
        'Years_Active': '2005-Present',
        'Last_Known_URL': 'https://www.neander-motors.com',
        'Notes': 'German manufacturer of exotic motorcycles with unique technology'
    },
    'Motus': {
        'Manufacturer': 'Motus',
        'Official_Website': '',
        'Status': 'Defunct',
        'Country': 'USA',
        'Years_Active': '2008-2018',
        'Last_Known_URL': '',
        'Notes': 'American manufacturer of V4-powered sport touring motorcycles'
    },
    'Mission': {
        'Manufacturer': 'Mission Motors',
        'Official_Website': '',
        'Status': 'Defunct',
        'Country': 'USA',
        'Years_Active': '2007-2015',
        'Last_Known_URL': '',
        'Notes': 'American electric motorcycle manufacturer - Mission R and Mission RS'
    },
    'MotoCzysz': {
        'Manufacturer': 'MotoCzysz',
        'Official_Website': '',
        'Status': 'Defunct',
        'Country': 'USA',
        'Years_Active': '2003-2014',
        'Last_Known_URL': '',
        'Notes': 'American manufacturer known for Isle of Man TT electric racing'
    },
    'Brammo': {
        'Manufacturer': 'Brammo',
        'Official_Website': '',
        'Status': 'Defunct',
        'Country': 'USA',
        'Years_Active': '2002-2015',
        'Last_Known_URL': '',
        'Notes': 'American electric motorcycle manufacturer - acquired by Polaris'
    },
    'Confederate': {
        'Manufacturer': 'Confederate Motors',
        'Official_Website': '',
        'Status': 'Defunct',
        'Country': 'USA',
        'Years_Active': '1991-2017',
        'Last_Known_URL': '',
        'Notes': 'American manufacturer of exotic custom motorcycles - later became Curtiss'
    },
    'Curtiss': {
        'Manufacturer': 'Curtiss Motorcycles',
        'Official_Website': 'https://www.curtissmotorcycles.com',
        'Status': 'Active',
        'Country': 'USA',
        'Years_Active': '2017-Present',
        'Last_Known_URL': 'https://www.curtissmotorcycles.com',
        'Notes': 'American electric motorcycle manufacturer - successor to Confederate Motors'
    },
    'Alta': {
        'Manufacturer': 'Alta Motors',
        'Official_Website': '',
        'Status': 'Defunct',
        'Country': 'USA',
        'Years_Active': '2007-2018',
        'Last_Known_URL': '',
        'Notes': 'American electric dirt bike manufacturer - Redshift series'
    },
    'Stealth': {
        'Manufacturer': 'Stealth Electric Bikes',
        'Official_Website': 'https://www.stealthelectricbikes.com',
        'Status': 'Active',
        'Country': 'Australia',
        'Years_Active': '2008-Present',
        'Last_Known_URL': 'https://www.stealthelectricbikes.com',
        'Notes': 'Australian electric bike manufacturer - high-performance e-bikes'
    },
    'Unu': {
        'Manufacturer': 'unu',
        'Official_Website': 'https://unumotors.com',
        'Status': 'Active',
        'Country': 'Germany',
        'Years_Active': '2014-Present',
        'Last_Known_URL': 'https://unumotors.com',
        'Notes': 'German electric scooter manufacturer'
    },
    'Viarelli': {
        'Manufacturer': 'Viarelli',
        'Official_Website': 'https://www.viarelli.se',
        'Status': 'Active',
        'Country': 'Sweden',
        'Years_Active': '2009-Present',
        'Last_Known_URL': 'https://www.viarelli.se',
        'Notes': 'Swedish scooter brand with Chinese manufacturing'
    },
    'Velocifero': {
        'Manufacturer': 'Velocifero',
        'Official_Website': 'https://www.velocifero.com',
        'Status': 'Active',
        'Country': 'Italy/China',
        'Years_Active': '2008-Present',
        'Last_Known_URL': 'https://www.velocifero.com',
        'Notes': 'Italian electric scooter brand'
    },
    'Wakan': {
        'Manufacturer': 'Wakan',
        'Official_Website': '',
        'Status': 'Defunct',
        'Country': 'France',
        'Years_Active': '1997-2005',
        'Last_Known_URL': '',
        'Notes': 'French motorcycle manufacturer known for unique designs'
    }
}

print(f"Researching final batch: {len(final_batch_brands)} brands...")

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
for brand_name, brand_data in final_batch_brands.items():
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
aliases = ['Revolt Motors', 'Ola Electric', 'Ather Energy', 'Tork Motors', 'Confederate Motors', 'Curtiss Motorcycles', 'Alta Motors', 'Stealth Electric Bikes', 'Mission Motors', 'Neander Motors']

for brand in remaining_missing:
    if brand not in final_batch_brands and brand not in aliases:
        updated_missing.append(brand)

with open('./database/data/missing_brands.txt', 'w', encoding='utf-8') as f:
    for brand in updated_missing:
        f.write(f"{brand}\n")

print(f"Remaining missing brands: {len(updated_missing)}")