#!/usr/bin/env python3
import csv
import os

# First batch of remaining brands research
remaining_batch_1 = {
    'MV Agusta': {  # Note: "Agusta" in list likely refers to MV Agusta
        'Manufacturer': 'MV Agusta',
        'Official_Website': 'https://www.mvagusta.com',
        'Status': 'Active',
        'Country': 'Italy',
        'Years_Active': '1945-Present',
        'Last_Known_URL': 'https://www.mvagusta.com',
        'Notes': 'Premium Italian manufacturer owned by KTM Group - already in database, Agusta refers to this brand'
    },
    'De Dion-Bouton': {  # "Dion-Bouton" refers to this historic brand
        'Manufacturer': 'De Dion-Bouton',
        'Official_Website': '',
        'Status': 'Defunct',
        'Country': 'France',
        'Years_Active': '1883-1932',
        'Last_Known_URL': '',
        'Notes': 'Historic French manufacturer - early automotive and motorcycle pioneer'
    },
    'Zero Engineering': {  # "Engineering" likely refers to this Japanese custom builder
        'Manufacturer': 'Zero Engineering',
        'Official_Website': 'https://www.zero-eng.com',
        'Status': 'Active',
        'Country': 'Japan',
        'Years_Active': '1992-Present',
        'Last_Known_URL': 'https://www.zero-eng.com',
        'Notes': 'Japanese custom motorcycle manufacturer - not to be confused with Zero Motorcycles'
    },
    'GAS GAS': {  # "GAS" refers to this Spanish brand
        'Manufacturer': 'GAS GAS',
        'Official_Website': 'https://www.gasgas.com',
        'Status': 'Active',
        'Country': 'Spain/Austria',
        'Years_Active': '1985-Present',
        'Last_Known_URL': 'https://www.gasgas.com',
        'Notes': 'Spanish trials and enduro specialist - now owned by KTM Group'
    },
    'KSR Group': {  # "KSR" refers to this German distributor/manufacturer
        'Manufacturer': 'KSR Group',
        'Official_Website': 'https://www.ksr-group.com',
        'Status': 'Active',
        'Country': 'Germany',
        'Years_Active': '1992-Present',
        'Last_Known_URL': 'https://www.ksr-group.com',
        'Notes': 'German motorcycle distributor and manufacturer - owns Malaguti, Brixton, and other brands'
    },
    'Kayo': {
        'Manufacturer': 'Kayo',
        'Official_Website': 'https://www.kayomotorsports.com',
        'Status': 'Active',
        'Country': 'China/USA',
        'Years_Active': '2007-Present',
        'Last_Known_URL': 'https://www.kayomotorsports.com',
        'Notes': 'Chinese manufacturer with US distribution - dirt bikes and pit bikes'
    },
    'Kinetic': {
        'Manufacturer': 'Kinetic',
        'Official_Website': 'https://www.kineticgreen.com',
        'Status': 'Active',
        'Country': 'India',
        'Years_Active': '1972-Present',
        'Last_Known_URL': 'https://www.kineticgreen.com',
        'Notes': 'Indian manufacturer - Kinetic Honda partnership era, now Kinetic Green electric vehicles'
    },
    'Kinroad': {
        'Manufacturer': 'Kinroad',
        'Official_Website': 'https://www.kinroad.com',
        'Status': 'Active',
        'Country': 'China',
        'Years_Active': '1996-Present',
        'Last_Known_URL': 'https://www.kinroad.com',
        'Notes': 'Chinese manufacturer of ATVs, UTVs, and motorcycles'
    },
    'Kove': {
        'Manufacturer': 'Kove',
        'Official_Website': 'https://www.kovemoto.com',
        'Status': 'Active',
        'Country': 'China',
        'Years_Active': '2018-Present',
        'Last_Known_URL': 'https://www.kovemoto.com',
        'Notes': 'Chinese premium motorcycle manufacturer - adventure and sport bikes'
    },
    'Kuberg': {
        'Manufacturer': 'Kuberg',
        'Official_Website': 'https://www.kuberg.com',
        'Status': 'Active',
        'Country': 'Estonia',
        'Years_Active': '2009-Present',
        'Last_Known_URL': 'https://www.kuberg.com',
        'Notes': 'Estonian electric motorcycle manufacturer - specializes in electric dirt bikes for children and adults'
    },
    'Kumpan': {
        'Manufacturer': 'Kumpan Electric',
        'Official_Website': 'https://www.kumpan-electric.com',
        'Status': 'Active',
        'Country': 'Germany',
        'Years_Active': '2016-Present',
        'Last_Known_URL': 'https://www.kumpan-electric.com',
        'Notes': 'German electric scooter manufacturer'
    }
}

print(f"Researching first batch: {len(remaining_batch_1)} brands...")

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
for brand_name, brand_data in remaining_batch_1.items():
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
mapped_brands = ['Agusta', 'Dion-Bouton', 'Engineering', 'GAS', 'KSR', 'Kayo', 'Kinetic', 'Kinroad', 'Kove', 'Kuberg', 'Kumpan']

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
resolved_brands = ['Agusta', 'Dion-Bouton', 'Engineering', 'GAS', 'KSR', 'Kayo', 'Kinetic', 'Kinroad', 'Kove', 'Kuberg', 'Kumpan']
print(f"\nResolved from todo list: {', '.join(resolved_brands)}")