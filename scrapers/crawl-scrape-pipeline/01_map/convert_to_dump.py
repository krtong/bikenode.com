#!/usr/bin/env python3
"""
Convert Mat Oxley full metadata to dump.csv format for pipeline.
"""

import csv
from pathlib import Path

# Read the full metadata
input_file = Path(__file__).parent / 'mat_oxley_full_metadata_20250615_030125.csv'
output_file = Path(__file__).parent / 'dump.csv'

with open(input_file, 'r', encoding='utf-8') as infile:
    reader = csv.DictReader(infile)
    
    # Write to dump.csv in expected format
    with open(output_file, 'w', newline='', encoding='utf-8') as outfile:
        fieldnames = ['url', 'status_code', 'content_type', 'size', 'last_modified']
        writer = csv.DictWriter(outfile, fieldnames=fieldnames)
        writer.writeheader()
        
        for row in reader:
            writer.writerow({
                'url': row['url'],
                'status_code': row['status_code'],
                'content_type': row['content_type'],
                'size': row['size'],
                'last_modified': row['last_modified']
            })

print(f"Created {output_file} with Mat Oxley articles")