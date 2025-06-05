#!/usr/bin/env python3
import pandas as pd
import os
from pathlib import Path

# Define the CSV files to merge
csv_files = [
    './database/data/motorcycle_brands.csv',
    './database/data/motorcycle_brands_alphabetized.csv',
    './database/data/motorcycle_brands_completed_fullA-J_alphabetized.csv',
    './database/data/motorcycle_brands_completed_fullA-J.csv',
    './database/data/motorcycle_brands_L.csv'
]

# Read all CSV files into dataframes
dfs = []
for file in csv_files:
    if os.path.exists(file):
        print(f"Reading {file}...")
        df = pd.read_csv(file)
        print(f"  Found {len(df)} records")
        dfs.append(df)
    else:
        print(f"File not found: {file}")

# Concatenate all dataframes
print("\nMerging all dataframes...")
merged_df = pd.concat(dfs, ignore_index=True)
print(f"Total records before deduplication: {len(merged_df)}")

# Remove duplicates based on Manufacturer column (case-insensitive)
# First, create a lowercase version for comparison
merged_df['Manufacturer_lower'] = merged_df['Manufacturer'].str.lower()

# Sort by Manufacturer to keep consistent order
merged_df = merged_df.sort_values('Manufacturer_lower')

# Remove duplicates, keeping the first occurrence
merged_df = merged_df.drop_duplicates(subset=['Manufacturer_lower'], keep='first')

# Drop the temporary lowercase column
merged_df = merged_df.drop(columns=['Manufacturer_lower'])

# Sort alphabetically by Manufacturer
merged_df = merged_df.sort_values('Manufacturer')

print(f"Total records after deduplication: {len(merged_df)}")

# Save the merged and deduplicated data
output_file = './database/data/motorcycle_brands_merged.csv'
merged_df.to_csv(output_file, index=False)
print(f"\nMerged data saved to: {output_file}")

# Print first few records as preview
print("\nPreview of merged data:")
print(merged_df.head(10))