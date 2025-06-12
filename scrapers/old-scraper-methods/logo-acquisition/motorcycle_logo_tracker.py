#!/usr/bin/env python3
"""
Motorcycle Brand Logo Tracker
Helps track which brand logos have been acquired and their sources
"""

import os
import csv
import json
from datetime import datetime

class LogoTracker:
    def __init__(self, base_dir="/Users/kevintong/Documents/Code/bikenode.com"):
        self.base_dir = base_dir
        self.logos_dir = os.path.join(base_dir, "logos", "motorcycle-brands")
        self.tracking_file = os.path.join(self.logos_dir, "logo_tracking.json")
        self.csv_file = os.path.join(base_dir, "database", "data", "motorcycle_brands.csv")
        self.brands = []
        self.tracking_data = {}
        
    def load_brands(self):
        """Load all brands from CSV file"""
        with open(self.csv_file, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                self.brands.append({
                    'name': row['Manufacturer'],
                    'website': row['Official_Website'],
                    'status': row['Status']
                })
        print(f"Loaded {len(self.brands)} brands")
        
    def load_tracking_data(self):
        """Load existing tracking data"""
        if os.path.exists(self.tracking_file):
            with open(self.tracking_file, 'r') as f:
                self.tracking_data = json.load(f)
        else:
            # Initialize tracking data
            for brand in self.brands:
                self.tracking_data[brand['name']] = {
                    'has_logo': False,
                    'logo_filename': None,
                    'source': None,
                    'quality': None,
                    'date_acquired': None,
                    'notes': None
                }
            self.save_tracking_data()
            
    def save_tracking_data(self):
        """Save tracking data to JSON file"""
        with open(self.tracking_file, 'w') as f:
            json.dump(self.tracking_data, f, indent=2)
            
    def mark_logo_acquired(self, brand_name, filename, source, quality='high', notes=None):
        """Mark a logo as acquired"""
        if brand_name in self.tracking_data:
            self.tracking_data[brand_name] = {
                'has_logo': True,
                'logo_filename': filename,
                'source': source,
                'quality': quality,
                'date_acquired': datetime.now().isoformat(),
                'notes': notes
            }
            self.save_tracking_data()
            print(f"✓ Marked {brand_name} logo as acquired")
        else:
            print(f"✗ Brand {brand_name} not found")
            
    def check_existing_logos(self):
        """Check which logos already exist in the directory"""
        import subprocess
        
        # Get list of valid PNG files
        logo_files = []
        for f in os.listdir(self.logos_dir):
            if f.endswith(('.png', '.PNG')):
                filepath = os.path.join(self.logos_dir, f)
                # Check if it's actually a PNG file
                try:
                    result = subprocess.run(['file', filepath], capture_output=True, text=True)
                    if 'PNG image' in result.stdout:
                        logo_files.append(f)
                except:
                    pass
        
        # Match filenames to brand names
        for logo_file in logo_files:
            # Clean filename
            clean_name = logo_file.replace('.png', '').replace('.PNG', '')
            
            # Try different matching strategies
            for brand_name, data in self.tracking_data.items():
                brand_clean = brand_name.lower().replace(' ', '_').replace('-', '_')
                if clean_name == brand_clean:
                    if not self.tracking_data[brand_name]['has_logo']:
                        self.tracking_data[brand_name]['has_logo'] = True
                        self.tracking_data[brand_name]['logo_filename'] = logo_file
                        self.tracking_data[brand_name]['date_acquired'] = datetime.now().isoformat()
                        self.tracking_data[brand_name]['source'] = 'Wikipedia/Commons'
                        print(f"Found logo for: {brand_name}")
                        
        self.save_tracking_data()
        print(f"Checked {len(logo_files)} valid PNG files")
        
    def generate_report(self):
        """Generate a report of logo acquisition status"""
        total_brands = len(self.tracking_data)
        acquired = sum(1 for data in self.tracking_data.values() if data['has_logo'])
        
        print("\n=== LOGO ACQUISITION REPORT ===")
        print(f"Total brands: {total_brands}")
        print(f"Logos acquired: {acquired}")
        print(f"Logos remaining: {total_brands - acquired}")
        print(f"Progress: {acquired/total_brands*100:.1f}%")
        
        # List brands without logos
        print("\n=== BRANDS WITHOUT LOGOS ===")
        missing = [brand for brand, data in self.tracking_data.items() if not data['has_logo']]
        for i, brand in enumerate(missing[:20]):  # Show first 20
            print(f"{i+1}. {brand}")
        if len(missing) > 20:
            print(f"... and {len(missing)-20} more")
            
        # Save full report
        report_file = os.path.join(self.logos_dir, "acquisition_report.txt")
        with open(report_file, 'w') as f:
            f.write(f"Logo Acquisition Report - {datetime.now().isoformat()}\n")
            f.write("="*50 + "\n\n")
            f.write(f"Total brands: {total_brands}\n")
            f.write(f"Logos acquired: {acquired}\n")
            f.write(f"Logos remaining: {total_brands - acquired}\n")
            f.write(f"Progress: {acquired/total_brands*100:.1f}%\n\n")
            
            f.write("Brands with logos:\n")
            for brand, data in sorted(self.tracking_data.items()):
                if data['has_logo']:
                    f.write(f"✓ {brand} - {data['logo_filename']} - {data['source']}\n")
                    
            f.write("\nBrands without logos:\n")
            for brand, data in sorted(self.tracking_data.items()):
                if not data['has_logo']:
                    f.write(f"✗ {brand}\n")
                    
        print(f"\nFull report saved to: {report_file}")
        
    def get_priority_brands(self, limit=50):
        """Get priority brands that need logos (active brands first)"""
        priority_list = []
        
        # First add active brands
        for brand in self.brands:
            if (brand['name'] in self.tracking_data and 
                not self.tracking_data[brand['name']]['has_logo'] and
                'Active' in brand['status']):
                priority_list.append(brand)
                
        # Then add other brands
        for brand in self.brands:
            if (brand['name'] in self.tracking_data and 
                not self.tracking_data[brand['name']]['has_logo'] and
                'Active' not in brand['status']):
                priority_list.append(brand)
                
        return priority_list[:limit]

if __name__ == "__main__":
    tracker = LogoTracker()
    tracker.load_brands()
    tracker.load_tracking_data()
    tracker.check_existing_logos()
    tracker.generate_report()
    
    print("\n=== PRIORITY BRANDS (Active) ===")
    priority = tracker.get_priority_brands(30)
    for i, brand in enumerate(priority):
        website = brand['website'] if brand['website'] != 'N/A' else 'No website'
        print(f"{i+1}. {brand['name']} - {brand['status']} - {website}")