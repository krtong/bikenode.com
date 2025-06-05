#!/usr/bin/env python3

import csv
import os
import shutil

def alphabetize_csv(file_path):
    """
    Alphabetize a CSV file by the first column (Manufacturer name)
    while preserving the header row.
    """
    print(f"\nProcessing {file_path}...")
    
    # Create backup
    backup_path = file_path + '.backup'
    shutil.copy2(file_path, backup_path)
    print(f"✓ Created backup: {backup_path}")
    
    # Read the CSV file
    with open(file_path, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        header = next(reader)  # Save the header row
        rows = list(reader)    # Read all data rows
    
    # Sort rows by the first column (Manufacturer name)
    # Using case-insensitive sorting
    sorted_rows = sorted(rows, key=lambda x: x[0].lower() if x else '')
    
    # Write the sorted data back to the original file
    with open(file_path, 'w', encoding='utf-8', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(header)  # Write header first
        writer.writerows(sorted_rows)  # Write sorted data
    
    print(f"✓ Alphabetized {len(sorted_rows)} entries")
    print(f"✓ File updated: {file_path}")

def main():
    # Define file paths
    base_dir = "database/data"
    
    files_to_process = [
        os.path.join(base_dir, 'motorcycle_brands.csv'),
        os.path.join(base_dir, 'motorcycle_brands_completed_fullA-J.csv')
    ]
    
    # Process each file
    for file_path in files_to_process:
        if os.path.exists(file_path):
            alphabetize_csv(file_path)
        else:
            print(f"❌ File not found: {file_path}")
    
    print("\n✅ All files have been alphabetized!")
    print("📁 Backup files created with .backup extension")

if __name__ == "__main__":
    main()