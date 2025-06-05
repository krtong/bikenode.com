#!/usr/bin/env python3
import csv
import os

# Read manufacturers from manufacturers_list.txt
manufacturers_list = []
with open('./database/data/manufacturers_list.txt', 'r', encoding='utf-8') as f:
    for line in f:
        line = line.strip()
        if line and not line.isdigit():  # Skip empty lines and standalone numbers
            # Remove leading numbers and whitespace
            manufacturer = line.split(None, 1)[-1] if line.split() else line
            manufacturers_list.append(manufacturer.strip())

print(f"Found {len(manufacturers_list)} manufacturers in manufacturers_list.txt")

# Read existing brands from motorcycle_brands.csv
existing_brands = set()
with open('./database/data/motorcycle_brands.csv', 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        existing_brands.add(row['Manufacturer'].lower().strip())

print(f"Found {len(existing_brands)} existing brands in motorcycle_brands.csv")

# Find missing brands (case-insensitive comparison)
missing_brands = []
for manufacturer in manufacturers_list:
    if manufacturer.lower() not in existing_brands:
        missing_brands.append(manufacturer)

print(f"\nFound {len(missing_brands)} missing brands:")
print("=" * 50)

# Group missing brands for easier processing
for i, brand in enumerate(sorted(missing_brands), 1):
    print(f"{i:3d}. {brand}")

# Save missing brands to a file for reference
with open('./database/data/missing_brands.txt', 'w', encoding='utf-8') as f:
    for brand in sorted(missing_brands):
        f.write(f"{brand}\n")

print(f"\nMissing brands saved to: ./database/data/missing_brands.txt")