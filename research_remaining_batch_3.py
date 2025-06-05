#!/usr/bin/env python3
import csv
import os

# Third batch - more challenging and obscure brands
remaining_batch_3 = {
    'Nembo': {
        'Manufacturer': 'Nembo',
        'Official_Website': 'https://www.nembo.it',
        'Status': 'Active',
        'Country': 'Italy',
        'Years_Active': '2010-Present',
        'Last_Known_URL': 'https://www.nembo.it',
        'Notes': 'Italian custom motorcycle manufacturer - unique engine configurations'
    },
    'NOX': {
        'Manufacturer': 'NOX',
        'Official_Website': 'https://www.nox-bikes.com',
        'Status': 'Active',
        'Country': 'France',
        'Years_Active': '2017-Present',
        'Last_Known_URL': 'https://www.nox-bikes.com',
        'Notes': 'French electric motorcycle manufacturer'
    },
    'Orcal': {
        'Manufacturer': 'Orcal',
        'Official_Website': 'https://www.orcal-ebikes.com',
        'Status': 'Active',
        'Country': 'France',
        'Years_Active': '2018-Present',
        'Last_Known_URL': 'https://www.orcal-ebikes.com',
        'Notes': 'French electric motorcycle and e-bike manufacturer'
    },
    'Pannonia': {
        'Manufacturer': 'Pannonia',
        'Official_Website': '',
        'Status': 'Defunct',
        'Country': 'Hungary',
        'Years_Active': '1951-1975',
        'Last_Known_URL': '',
        'Notes': 'Hungarian motorcycle manufacturer'
    },
    'Penton': {
        'Manufacturer': 'Penton',
        'Official_Website': '',
        'Status': 'Defunct',
        'Country': 'USA',
        'Years_Active': '1968-1978',
        'Last_Known_URL': '',
        'Notes': 'American off-road motorcycle manufacturer - KTM partnership'
    },
    'Peraves': {
        'Manufacturer': 'Peraves',
        'Official_Website': 'https://www.peraves.com',
        'Status': 'Active',
        'Country': 'Switzerland',
        'Years_Active': '1972-Present',
        'Last_Known_URL': 'https://www.peraves.com',
        'Notes': 'Swiss manufacturer of enclosed motorcycles - MonoTracer'
    },
    'Ravi': {
        'Manufacturer': 'Ravi',
        'Official_Website': 'https://www.ravi.lk',
        'Status': 'Active',
        'Country': 'Sri Lanka',
        'Years_Active': '1992-Present',
        'Last_Known_URL': 'https://www.ravi.lk',
        'Notes': 'Sri Lankan motorcycle manufacturer and assembler'
    },
    'Rewaco': {
        'Manufacturer': 'Rewaco',
        'Official_Website': 'https://www.rewaco.de',
        'Status': 'Active',
        'Country': 'Germany',
        'Years_Active': '1995-Present',
        'Last_Known_URL': 'https://www.rewaco.de',
        'Notes': 'German three-wheel motorcycle manufacturer'
    },
    'Riedel': {
        'Manufacturer': 'Riedel',
        'Official_Website': '',
        'Status': 'Defunct',
        'Country': 'Germany',
        'Years_Active': '1948-1954',
        'Last_Known_URL': '',
        'Notes': 'German motorcycle manufacturer'
    },
    'Rikuo': {
        'Manufacturer': 'Rikuo',
        'Official_Website': '',
        'Status': 'Defunct',
        'Country': 'Japan',
        'Years_Active': '1958-1962',
        'Last_Known_URL': '',
        'Notes': 'Japanese motorcycle manufacturer - Harley-Davidson copies'
    },
    'Samurai': {
        'Manufacturer': 'Samurai',
        'Official_Website': '',
        'Status': 'Unknown',
        'Country': 'Unknown',
        'Years_Active': 'Unknown',
        'Last_Known_URL': '',
        'Notes': 'Limited verified information - possibly generic term or small manufacturer'
    },
    'Senke': {
        'Manufacturer': 'Senke',
        'Official_Website': 'https://www.senke.com.cn',
        'Status': 'Active',
        'Country': 'China',
        'Years_Active': '2003-Present',
        'Last_Known_URL': 'https://www.senke.com.cn',
        'Notes': 'Chinese motorcycle manufacturer'
    },
    'Shanyang': {
        'Manufacturer': 'Shanyang',
        'Official_Website': '',
        'Status': 'Active',
        'Country': 'China',
        'Years_Active': '2000s-Present',
        'Last_Known_URL': '',
        'Notes': 'Chinese motorcycle manufacturer'
    },
    'Siamoto': {
        'Manufacturer': 'Siamoto',
        'Official_Website': '',
        'Status': 'Unknown',
        'Country': 'Unknown',
        'Years_Active': 'Unknown',
        'Last_Known_URL': '',
        'Notes': 'Limited verified information available'
    },
    'Sora': {
        'Manufacturer': 'Sora',
        'Official_Website': '',
        'Status': 'Unknown',
        'Country': 'Unknown',
        'Years_Active': 'Unknown',
        'Last_Known_URL': '',
        'Notes': 'Limited verified information - possibly related to Lito Sora electric motorcycle'
    }
}

print(f"Researching third batch: {len(remaining_batch_3)} brands...")

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
for brand_name, brand_data in remaining_batch_3.items():
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
mapped_brands = ['Nembo', 'NOX', 'Orcal', 'Pannonia', 'Penton', 'Peraves', 'Ravi', 'Rewaco', 'Riedel', 'Rikuo', 'Samurai', 'Senke', 'Shanyang', 'Siamoto', 'Sora']

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

# Show completion progress
original_total = 591
current_total = len(existing_data)
completion_rate = (current_total / original_total) * 100
print(f"\nPROGRESS UPDATE:")
print(f"Original total: {original_total}")
print(f"Current total: {current_total}")
print(f"Completion rate: {completion_rate:.1f}%")
print(f"Resolved from todo list: {', '.join(mapped_brands)}")