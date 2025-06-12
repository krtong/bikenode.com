#!/usr/bin/env python3
"""
WorldVectorLogo Scraper for Motorcycle Brands
Automatically searches and downloads logos from WorldVectorLogo.com
"""

import os
import subprocess
import json
import time
import csv
import urllib.request
import urllib.parse
from datetime import datetime

class WorldVectorLogoScraper:
    def __init__(self):
        self.base_dir = "/Users/kevintong/Documents/Code/bikenode.com"
        self.logos_dir = os.path.join(self.base_dir, "logos", "motorcycle-brands")
        self.csv_file = os.path.join(self.base_dir, "database", "data", "motorcycle_brands.csv")
        self.results_file = os.path.join(self.logos_dir, "worldvectorlogo_results.json")
        self.brands = []
        self.successful_downloads = []
        self.failed_downloads = []
        
    def load_brands(self):
        """Load all brands from CSV file"""
        with open(self.csv_file, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                self.brands.append({
                    'name': row['Manufacturer'],
                    'status': row['Status']
                })
        print(f"Loaded {len(self.brands)} brands")
        
    def get_existing_logos(self):
        """Get list of brands that already have logos"""
        existing = set()
        for f in os.listdir(self.logos_dir):
            if f.endswith('.png'):
                # Try to match filename to brand name
                clean_name = f.replace('.png', '').replace('_', ' ').title()
                existing.add(clean_name)
                
                # Also try exact match
                for brand in self.brands:
                    brand_clean = brand['name'].lower().replace(' ', '_').replace('-', '_')
                    if f.replace('.png', '') == brand_clean:
                        existing.add(brand['name'])
        return existing
        
    def generate_possible_urls(self, brand_name):
        """Generate possible WorldVectorLogo URLs for a brand"""
        # Clean brand name for URL
        clean_variants = [
            brand_name.lower().replace(' ', '-').replace('&', '').replace('.', ''),
            brand_name.lower().replace(' ', '-').replace('&', 'and').replace('.', ''),
            brand_name.lower().replace(' ', '').replace('&', '').replace('.', ''),
            brand_name.lower().replace(' ', '_').replace('&', '').replace('.', ''),
            brand_name.split()[0].lower() if ' ' in brand_name else brand_name.lower(),
            brand_name.replace(' Motorcycles', '').lower().replace(' ', '-'),
            brand_name.replace(' Motor', '').lower().replace(' ', '-'),
            brand_name.replace(' Motors', '').lower().replace(' ', '-'),
        ]
        
        # Remove duplicates while preserving order
        seen = set()
        unique_variants = []
        for variant in clean_variants:
            if variant not in seen:
                seen.add(variant)
                unique_variants.append(variant)
        
        # Generate URLs
        urls = []
        for variant in unique_variants:
            urls.append(f"https://cdn.worldvectorlogo.com/logos/{variant}.svg")
            
        return urls
        
    def test_url(self, url):
        """Test if a URL returns a valid SVG file"""
        try:
            req = urllib.request.Request(url)
            req.add_header('User-Agent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36')
            response = urllib.request.urlopen(req, timeout=5)
            content = response.read(512)  # Read first 512 bytes
            
            # Check if it looks like SVG
            if b'<svg' in content or b'SVG' in content:
                return True
            return False
        except:
            return False
            
    def download_and_convert(self, brand_name, url):
        """Download SVG and convert to PNG"""
        # Generate filename
        filename_base = brand_name.lower().replace(' ', '_').replace('-', '_').replace('&', 'and')
        svg_path = os.path.join(self.logos_dir, f"{filename_base}.svg")
        png_path = os.path.join(self.logos_dir, f"{filename_base}.png")
        
        # Skip if PNG already exists
        if os.path.exists(png_path):
            return True
            
        try:
            # Download SVG
            req = urllib.request.Request(url)
            req.add_header('User-Agent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36')
            response = urllib.request.urlopen(req, timeout=10)
            
            with open(svg_path, 'wb') as f:
                f.write(response.read())
            
            # Convert to PNG using sips
            cmd = ['sips', '-s', 'format', 'png', '-Z', '500', svg_path, '--out', png_path]
            result = subprocess.run(cmd, capture_output=True)
            
            if result.returncode == 0 and os.path.exists(png_path):
                # Verify it's a valid PNG
                file_cmd = ['file', png_path]
                file_result = subprocess.run(file_cmd, capture_output=True, text=True)
                
                if 'PNG image' in file_result.stdout:
                    # Clean up SVG
                    os.remove(svg_path)
                    self.successful_downloads.append({
                        'brand': brand_name,
                        'url': url,
                        'filename': f"{filename_base}.png",
                        'timestamp': datetime.now().isoformat()
                    })
                    print(f"✓ {brand_name}")
                    return True
                else:
                    # Invalid PNG, clean up
                    if os.path.exists(png_path):
                        os.remove(png_path)
                    if os.path.exists(svg_path):
                        os.remove(svg_path)
            else:
                # Conversion failed, clean up
                if os.path.exists(svg_path):
                    os.remove(svg_path)
                    
        except Exception as e:
            # Clean up on any error
            if os.path.exists(svg_path):
                os.remove(svg_path)
            if os.path.exists(png_path):
                os.remove(png_path)
                
        self.failed_downloads.append(brand_name)
        return False
        
    def scrape_all_brands(self, limit=None):
        """Scrape logos for all brands"""
        existing_logos = self.get_existing_logos()
        print(f"Found {len(existing_logos)} existing logos")
        
        # Filter out brands that already have logos
        brands_to_scrape = []
        for brand in self.brands:
            if brand['name'] not in existing_logos:
                brands_to_scrape.append(brand)
                
        print(f"Brands to scrape: {len(brands_to_scrape)}")
        
        if limit:
            brands_to_scrape = brands_to_scrape[:limit]
            print(f"Limited to first {limit} brands")
            
        for i, brand in enumerate(brands_to_scrape):
            brand_name = brand['name']
            print(f"[{i+1}/{len(brands_to_scrape)}] Searching {brand_name}...")
            
            # Generate possible URLs
            possible_urls = self.generate_possible_urls(brand_name)
            
            # Test each URL
            success = False
            for url in possible_urls:
                if self.test_url(url):
                    if self.download_and_convert(brand_name, url):
                        success = True
                        break
                        
            if not success:
                self.failed_downloads.append(brand_name)
                print(f"✗ {brand_name}")
                
            # Be polite to the server
            time.sleep(0.5)
            
        self.save_results()
        
    def save_results(self):
        """Save scraping results"""
        results = {
            'timestamp': datetime.now().isoformat(),
            'successful': self.successful_downloads,
            'failed': self.failed_downloads,
            'total_success': len(self.successful_downloads),
            'total_failed': len(self.failed_downloads)
        }
        
        with open(self.results_file, 'w') as f:
            json.dump(results, f, indent=2)
            
        print(f"\n=== SCRAPING SUMMARY ===")
        print(f"Successful: {len(self.successful_downloads)}")
        print(f"Failed: {len(self.failed_downloads)}")
        print(f"Results saved to: {self.results_file}")

if __name__ == "__main__":
    scraper = WorldVectorLogoScraper()
    scraper.load_brands()
    
    # Continue with next 50 brands
    scraper.scrape_all_brands(limit=100)
    
    # Update tracking
    print("\nUpdating logo tracker...")
    os.system("cd /Users/kevintong/Documents/Code/bikenode.com && python logo-acquisition/motorcycle_logo_tracker.py")