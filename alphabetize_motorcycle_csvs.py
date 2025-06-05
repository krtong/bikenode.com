#!/usr/bin/env python3

import csv
import os

def alphabetize_csv(input_file, output_file):
    """
    Alphabetize a CSV file by the first column (Manufacturer name)
    while preserving the header row.
    """
    print(f"Processing {input_file}...")
    
    # Read the CSV file
    with open(input_file, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        header = next(reader)  # Save the header row
        rows = list(reader)    # Read all data rows
    
    # Sort rows by the first column (Manufacturer name)
    # Using case-insensitive sorting
    sorted_rows = sorted(rows, key=lambda x: x[0].lower() if x else '')
    
    # Write the sorted data back
    with open(output_file, 'w', encoding='utf-8', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(header)  # Write header first
        writer.writerows(sorted_rows)  # Write sorted data
    
    print(f"✓ Alphabetized {len(sorted_rows)} entries")
    print(f"✓ Saved to {output_file}")

def main():
    # Define file paths
    base_dir = "database/data"
    
    files_to_process = [
        {
            'input': os.path.join(base_dir, 'motorcycle_brands.csv'),
            'output': os.path.join(base_dir, 'motorcycle_brands_alphabetized.csv')
        },
        {
            'input': os.path.join(base_dir, 'motorcycle_brands_completed_fullA-J.csv'),
            'output': os.path.join(base_dir, 'motorcycle_brands_completed_fullA-J_alphabetized.csv')
        }
    ]
    
    # Process each file
    for file_info in files_to_process:
        if os.path.exists(file_info['input']):
            alphabetize_csv(file_info['input'], file_info['output'])
        else:
            print(f"❌ File not found: {file_info['input']}")
    
    print("\n✅ Alphabetization complete!")
    
    # Optional: Replace original files with alphabetized versions
    replace_originals = input("\nDo you want to replace the original files with the alphabetized versions? (yes/no): ").lower()
    
    if replace_originals == 'yes':
        for file_info in files_to_process:
            if os.path.exists(file_info['output']):
                # Backup original
                backup_file = file_info['input'] + '.backup'
                os.rename(file_info['input'], backup_file)
                # Replace with alphabetized version
                os.rename(file_info['output'], file_info['input'])
                print(f"✓ Replaced {file_info['input']} (backup saved as {backup_file})")

if __name__ == "__main__":
    main()