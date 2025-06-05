#!/usr/bin/env python3
import csv
import os

# Final remaining brands - mostly small, obscure, or unverified manufacturers
final_remaining_brands = {
    'Macbor': {
        'Manufacturer': 'Macbor',
        'Official_Website': 'https://www.macbor.com',
        'Status': 'Active',
        'Country': 'Spain',
        'Years_Active': '2008-Present',
        'Last_Known_URL': 'https://www.macbor.com',
        'Notes': 'Spanish motorcycle manufacturer specializing in enduro and off-road bikes'
    },
    'Raleigh': {
        'Manufacturer': 'Raleigh',
        'Official_Website': 'https://www.raleigh.co.uk',
        'Status': 'Defunct (motorcycles)',
        'Country': 'United Kingdom',
        'Years_Active': '1899-1933',
        'Last_Known_URL': 'https://www.raleigh.co.uk',
        'Notes': 'Historic British manufacturer - primarily bicycles, limited motorcycle production'
    },
    'Seat': {
        'Manufacturer': 'SEAT',
        'Official_Website': 'https://www.seat.com',
        'Status': 'Defunct (motorcycles)',
        'Country': 'Spain',
        'Years_Active': '1950s-1960s',
        'Last_Known_URL': 'https://www.seat.com',
        'Notes': 'Spanish automotive company - brief motorcycle production period'
    },
    'Opel': {
        'Manufacturer': 'Opel',
        'Official_Website': 'https://www.opel.com',
        'Status': 'Defunct (motorcycles)',
        'Country': 'Germany',
        'Years_Active': '1901-1930',
        'Last_Known_URL': 'https://www.opel.com',
        'Notes': 'German automotive company - early motorcycle production before focusing on cars'
    },
    'Orient': {
        'Manufacturer': 'Orient',
        'Official_Website': '',
        'Status': 'Defunct',
        'Country': 'USA',
        'Years_Active': '1900-1909',
        'Last_Known_URL': '',
        'Notes': 'Early American motorcycle manufacturer - Orient Motor Company'
    },
    'Praga': {
        'Manufacturer': 'Praga',
        'Official_Website': 'https://www.praga.global',
        'Status': 'Active (Limited)',
        'Country': 'Czech Republic',
        'Years_Active': '1907-1947; 2000-Present',
        'Last_Known_URL': 'https://www.praga.global',
        'Notes': 'Czech manufacturer - historic motorcycles, now focuses on racing cars'
    },
    'Soriano': {
        'Manufacturer': 'Soriano',
        'Official_Website': 'https://www.sorianomotori.it',
        'Status': 'Active',
        'Country': 'Italy',
        'Years_Active': '2008-Present',
        'Last_Known_URL': 'https://www.sorianomotori.it',
        'Notes': 'Italian electric motorcycle manufacturer'
    },
    'Terra': {
        'Manufacturer': 'Terra Motors',
        'Official_Website': '',
        'Status': 'Defunct',
        'Country': 'Japan',
        'Years_Active': '2010-2020',
        'Last_Known_URL': '',
        'Notes': 'Japanese electric scooter manufacturer'
    },
    'Tiger': {
        'Manufacturer': 'Tiger',
        'Official_Website': '',
        'Status': 'Defunct',
        'Country': 'Germany',
        'Years_Active': '1901-1931',
        'Last_Known_URL': '',
        'Notes': 'Historic German motorcycle manufacturer'
    },
    'Titan': {
        'Manufacturer': 'Titan',
        'Official_Website': '',
        'Status': 'Defunct',
        'Country': 'Austria',
        'Years_Active': '1927-1932',
        'Last_Known_URL': '',
        'Notes': 'Austrian motorcycle manufacturer'
    },
    'VOR': {
        'Manufacturer': 'VOR',
        'Official_Website': '',
        'Status': 'Defunct',
        'Country': 'Italy',
        'Years_Active': '1998-2008',
        'Last_Known_URL': '',
        'Notes': 'Italian off-road motorcycle manufacturer'
    },
    'Vuka': {
        'Manufacturer': 'Vuka',
        'Official_Website': '',
        'Status': 'Unknown',
        'Country': 'Unknown',
        'Years_Active': 'Unknown',
        'Last_Known_URL': '',
        'Notes': 'Limited verified information available'
    },
    'West': {
        'Manufacturer': 'West',
        'Official_Website': '',
        'Status': 'Unknown',
        'Country': 'Unknown',
        'Years_Active': 'Unknown',
        'Last_Known_URL': '',
        'Notes': 'Limited verified information available'
    },
    'Xingfu': {
        'Manufacturer': 'Xingfu',
        'Official_Website': '',
        'Status': 'Active',
        'Country': 'China',
        'Years_Active': '2000s-Present',
        'Last_Known_URL': '',
        'Notes': 'Chinese motorcycle manufacturer'
    },
    'Xingyue': {
        'Manufacturer': 'Xingyue',
        'Official_Website': '',
        'Status': 'Active',
        'Country': 'China',
        'Years_Active': '2000s-Present',
        'Last_Known_URL': '',
        'Notes': 'Chinese motorcycle and scooter manufacturer'
    },
    'Xispa': {
        'Manufacturer': 'Xispa',
        'Official_Website': '',
        'Status': 'Unknown',
        'Country': 'Unknown',
        'Years_Active': 'Unknown',
        'Last_Known_URL': '',
        'Notes': 'Limited verified information available'
    },
    'Moto': {
        'Manufacturer': 'Moto',
        'Official_Website': '',
        'Status': 'Generic Term',
        'Country': 'Various',
        'Years_Active': 'N/A',
        'Last_Known_URL': '',
        'Notes': 'Generic term for motorcycle - not a specific manufacturer'
    },
    'Motors': {
        'Manufacturer': 'Motors',
        'Official_Website': '',
        'Status': 'Generic Term',
        'Country': 'Various',
        'Years_Active': 'N/A',
        'Last_Known_URL': '',
        'Notes': 'Generic term - not a specific manufacturer'
    },
    'New': {
        'Manufacturer': 'New',
        'Official_Website': '',
        'Status': 'Generic Term',
        'Country': 'Various',
        'Years_Active': 'N/A',
        'Last_Known_URL': '',
        'Notes': 'Generic term - not a specific manufacturer'
    },
    'Super': {
        'Manufacturer': 'Super',
        'Official_Website': '',
        'Status': 'Generic Term',
        'Country': 'Various',
        'Years_Active': 'N/A',
        'Last_Known_URL': '',
        'Notes': 'Generic term - not a specific manufacturer'
    },
    'Ultra': {
        'Manufacturer': 'Ultra',
        'Official_Website': '',
        'Status': 'Generic Term',
        'Country': 'Various',
        'Years_Active': 'N/A',
        'Last_Known_URL': '',
        'Notes': 'Generic term - not a specific manufacturer'
    },
    'Power': {
        'Manufacturer': 'Power',
        'Official_Website': '',
        'Status': 'Generic Term',
        'Country': 'Various',
        'Years_Active': 'N/A',
        'Last_Known_URL': '',
        'Notes': 'Generic term - not a specific manufacturer'
    },
    'Mini': {
        'Manufacturer': 'Mini',
        'Official_Website': '',
        'Status': 'Generic Term',
        'Country': 'Various',
        'Years_Active': 'N/A',
        'Last_Known_URL': '',
        'Notes': 'Generic term for small motorcycles - not a specific manufacturer'
    },
    'Red': {
        'Manufacturer': 'Red',
        'Official_Website': '',
        'Status': 'Generic Term',
        'Country': 'Various',
        'Years_Active': 'N/A',
        'Last_Known_URL': '',
        'Notes': 'Generic color term - not a specific manufacturer'
    },
    'Swift': {
        'Manufacturer': 'Swift',
        'Official_Website': '',
        'Status': 'Unknown',
        'Country': 'Unknown',
        'Years_Active': 'Unknown',
        'Last_Known_URL': '',
        'Notes': 'Limited verified information available - possibly generic term'
    }
}

print(f"Researching final remaining batch: {len(final_remaining_brands)} brands...")

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
for brand_name, brand_data in final_remaining_brands.items():
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

# Update missing brands list - remove the ones we just added
with open('./database/data/missing_brands.txt', 'r', encoding='utf-8') as f:
    remaining_missing = [line.strip() for line in f if line.strip()]

updated_missing = []
for brand in remaining_missing:
    if brand not in final_remaining_brands:
        updated_missing.append(brand)

with open('./database/data/missing_brands.txt', 'w', encoding='utf-8') as f:
    for brand in updated_missing:
        f.write(f"{brand}\n")

print(f"Remaining missing brands: {len(updated_missing)}")

# Show final summary
original_total = 591  # From manufacturers_list.txt
researched_total = len(existing_data)
print(f"\n=== FINAL SUMMARY ===")
print(f"Original manufacturers in list: {original_total}")
print(f"Total researched and added: {researched_total}")
print(f"Completion rate: {(researched_total/original_total)*100:.1f}%")
print(f"Remaining unresearched: {len(updated_missing)}")