#!/usr/bin/env python3
import csv
import os

# Third batch - Historic European brands and electric manufacturers
batch_3_brands = {
    'Velocette': {
        'Manufacturer': 'Velocette',
        'Official_Website': '',
        'Status': 'Defunct',
        'Country': 'United Kingdom',
        'Years_Active': '1905-1971',
        'Last_Known_URL': '',
        'Notes': 'Historic British manufacturer known for innovative engineering and racing success'
    },
    'Victoria': {
        'Manufacturer': 'Victoria',
        'Official_Website': '',
        'Status': 'Defunct',
        'Country': 'Germany',
        'Years_Active': '1901-1966',
        'Last_Known_URL': '',
        'Notes': 'Historic German motorcycle manufacturer - merged with other brands to form Zweirad Union'
    },
    'Paton': {
        'Manufacturer': 'Paton',
        'Official_Website': 'https://www.patonmotorcycles.com',
        'Status': 'Active',
        'Country': 'Italy',
        'Years_Active': '1958-Present',
        'Last_Known_URL': 'https://www.patonmotorcycles.com',
        'Notes': 'Italian racing motorcycle manufacturer founded by Giuseppe Pattoni'
    },
    'OSSA': {
        'Manufacturer': 'OSSA',
        'Official_Website': 'https://www.ossa.es',
        'Status': 'Active',
        'Country': 'Spain',
        'Years_Active': '1924-1982; 2010-Present',
        'Last_Known_URL': 'https://www.ossa.es',
        'Notes': 'Spanish trials and enduro specialist revived - famous for lightweight two-strokes'
    },
    'Voxan': {
        'Manufacturer': 'Voxan',
        'Official_Website': '',
        'Status': 'Defunct',
        'Country': 'France',
        'Years_Active': '1995-2010',
        'Last_Known_URL': '',
        'Notes': 'French motorcycle manufacturer known for V-twin sport bikes'
    },
    'NCR': {
        'Manufacturer': 'NCR',
        'Official_Website': 'https://www.ncr.com',
        'Status': 'Active',
        'Country': 'Italy',
        'Years_Active': '1967-Present',
        'Last_Known_URL': 'https://www.ncr.com',
        'Notes': 'NCR M4 - Italian manufacturer of high-performance Ducati-based motorcycles'
    },
    'Vyrus': {
        'Manufacturer': 'Vyrus',
        'Official_Website': 'https://www.vyrus.it',
        'Status': 'Active',
        'Country': 'Italy',
        'Years_Active': '2003-Present',
        'Last_Known_URL': 'https://www.vyrus.it',
        'Notes': 'Italian manufacturer of exotic hub-center steering motorcycles'
    },
    'Energica': {
        'Manufacturer': 'Energica',
        'Official_Website': 'https://www.energicamotor.com',
        'Status': 'Active',
        'Country': 'Italy',
        'Years_Active': '2014-Present',
        'Last_Known_URL': 'https://www.energicamotor.com',
        'Notes': 'Italian electric motorcycle manufacturer - official FIM MotoE supplier'
    },
    'ZEV': {
        'Manufacturer': 'Zero Electric Vehicles',
        'Official_Website': 'https://www.zevmotorcycles.com',
        'Status': 'Active',
        'Country': 'China',
        'Years_Active': '2006-Present',
        'Last_Known_URL': 'https://www.zevmotorcycles.com',
        'Notes': 'Chinese electric motorcycle manufacturer - not to be confused with Zero Motorcycles'
    },
    'Verge': {
        'Manufacturer': 'Verge Motorcycles',
        'Official_Website': 'https://www.vergemotorcycles.com',
        'Status': 'Active',
        'Country': 'Finland',
        'Years_Active': '2019-Present',
        'Last_Known_URL': 'https://www.vergemotorcycles.com',
        'Notes': 'Finnish electric motorcycle manufacturer - hubless rim motor design'
    },
    'Tacita': {
        'Manufacturer': 'Tacita',
        'Official_Website': 'https://www.tacitamoto.com',
        'Status': 'Active',
        'Country': 'Italy',
        'Years_Active': '2009-Present',
        'Last_Known_URL': 'https://www.tacitamoto.com',
        'Notes': 'Italian electric motorcycle manufacturer specializing in enduro and trial bikes'
    },
    'Savic': {
        'Manufacturer': 'Savic Motorcycles',
        'Official_Website': 'https://www.savicmotorcycles.com',
        'Status': 'Active',
        'Country': 'Australia',
        'Years_Active': '2017-Present',
        'Last_Known_URL': 'https://www.savicmotorcycles.com',
        'Notes': 'Australian electric motorcycle manufacturer - C-Series cafe racer'
    },
    'RGNT': {
        'Manufacturer': 'RGNT',
        'Official_Website': 'https://www.rgnt.se',
        'Status': 'Active',
        'Country': 'Sweden',
        'Years_Active': '2018-Present',
        'Last_Known_URL': 'https://www.rgnt.se',
        'Notes': 'Swedish electric motorcycle manufacturer - retro-styled electric bikes'
    },
    'Silence': {
        'Manufacturer': 'Silence',
        'Official_Website': 'https://www.silence.eco',
        'Status': 'Active',
        'Country': 'Spain',
        'Years_Active': '2012-Present',
        'Last_Known_URL': 'https://www.silence.eco',
        'Notes': 'Spanish electric scooter manufacturer - removable battery technology'
    },
    'Yadea': {
        'Manufacturer': 'Yadea',
        'Official_Website': 'https://www.yadea.com',
        'Status': 'Active',
        'Country': 'China',
        'Years_Active': '2001-Present',
        'Last_Known_URL': 'https://www.yadea.com',
        'Notes': 'Major Chinese electric scooter manufacturer - global market leader'
    }
}

print(f"Researching batch 3: {len(batch_3_brands)} brands...")

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
for brand_name, brand_data in batch_3_brands.items():
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
    if brand not in batch_3_brands and brand not in ['Zero Electric Vehicles']:  # Handle alias
        updated_missing.append(brand)

with open('./database/data/missing_brands.txt', 'w', encoding='utf-8') as f:
    for brand in updated_missing:
        f.write(f"{brand}\n")

print(f"Remaining missing brands: {len(updated_missing)}")