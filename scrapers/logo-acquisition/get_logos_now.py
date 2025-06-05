#!/usr/bin/env python3
"""
Direct Logo Downloader - Get logos NOW
Uses Wikipedia page scraping to find actual logo URLs
"""

import urllib.request
import urllib.parse
import re
import os
from datetime import datetime

def download_logo_from_url(brand_name, url, filename):
    """Download logo from URL with validation"""
    try:
        req = urllib.request.Request(url, headers={
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        })
        response = urllib.request.urlopen(req, timeout=10)
        data = response.read()
        
        # Check if it's actually an image
        if len(data) > 1000 and (data[:4] == b'\x89PNG' or data[:2] == b'\xff\xd8' or b'<svg' in data[:100]):
            filepath = f"/Users/kevintong/Documents/Code/bikenode.com/logos/motorcycle-brands/{filename}"
            with open(filepath, 'wb') as f:
                f.write(data)
            print(f"✅ {brand_name}: Downloaded from {url}")
            return True
        else:
            print(f"❌ {brand_name}: Not an image file")
            return False
    except Exception as e:
        print(f"❌ {brand_name}: Failed - {e}")
        return False

def get_wikipedia_logo_urls(page_name):
    """Scrape Wikipedia page for logo URLs"""
    try:
        url = f"https://en.wikipedia.org/wiki/{page_name}"
        req = urllib.request.Request(url, headers={
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        })
        response = urllib.request.urlopen(req, timeout=10)
        content = response.read().decode('utf-8')
        
        # Find infobox logo
        logo_patterns = [
            r'src="(//upload\.wikimedia\.org/wikipedia/[^"]*\.(?:png|svg|jpg))"',
            r'href="(//upload\.wikimedia\.org/wikipedia/[^"]*\.(?:png|svg|jpg))"',
            r'"(https://upload\.wikimedia\.org/wikipedia/[^"]*\.(?:png|svg|jpg))"',
        ]
        
        urls = []
        for pattern in logo_patterns:
            matches = re.findall(pattern, content)
            for match in matches:
                if match.startswith('//'):
                    match = 'https:' + match
                if 'logo' in match.lower() or 'Logo' in match:
                    urls.append(match)
        
        return list(set(urls))  # Remove duplicates
    except:
        return []

# Priority brands to download
brands = {
    'Kawasaki': ['Kawasaki_Heavy_Industries', 'Kawasaki_Motorcycles'],
    'Ducati': ['Ducati'],
    'KTM': ['KTM'],
    'Triumph': ['Triumph_Motorcycles', 'Triumph_Engineering'],
    'Aprilia': ['Aprilia'],
    'Norton': ['Norton_Motorcycle_Company', 'Norton_Motorcycles'],
    'MV Agusta': ['MV_Agusta'],
    'Moto Guzzi': ['Moto_Guzzi'],
    'Royal Enfield': ['Royal_Enfield'],
    'Indian': ['Indian_Motocycle_Manufacturing_Company', 'Indian_Motorcycle'],
    'Vespa': ['Vespa'],
    'Piaggio': ['Piaggio'],
    'Zero': ['Zero_Motorcycles'],
    'Husqvarna': ['Husqvarna_Motorcycles'],
    'Benelli': ['Benelli_(motorcycles)'],
    'Bimota': ['Bimota'],
    'Beta': ['Beta_(motorcycle_manufacturer)'],
    'Sherco': ['Sherco'],
    'Jawa': ['Jawa_Motors'],
    'Can-Am': ['Can-Am'],
}

print("🏍️  Downloading Priority Motorcycle Logos")
print("=" * 50)

for brand_name, pages in brands.items():
    print(f"\n🔍 Getting {brand_name}...")
    
    # Check if we already have this logo
    existing_files = [
        f"{brand_name.lower().replace(' ', '_')}.png",
        f"{brand_name.lower().replace(' ', '-')}.png",
        f"{brand_name.lower()}.png"
    ]
    
    has_logo = False
    for filename in existing_files:
        filepath = f"/Users/kevintong/Documents/Code/bikenode.com/logos/motorcycle-brands/{filename}"
        if os.path.exists(filepath):
            print(f"  ✓ Already have {filename}")
            has_logo = True
            break
    
    if has_logo:
        continue
    
    # Try to find logo URLs from Wikipedia pages
    logo_urls = []
    for page in pages:
        urls = get_wikipedia_logo_urls(page)
        logo_urls.extend(urls)
    
    if not logo_urls:
        print(f"  ❌ No logo URLs found")
        continue
    
    # Try downloading from the URLs
    filename = f"{brand_name.lower().replace(' ', '_').replace('-', '_')}.png"
    
    for url in logo_urls[:3]:  # Try first 3 URLs
        if download_logo_from_url(brand_name, url, filename):
            break
    else:
        print(f"  ❌ All download attempts failed")

print(f"\n✅ Logo download complete!")

# Show current count
logo_dir = "/Users/kevintong/Documents/Code/bikenode.com/logos/motorcycle-brands"
png_files = [f for f in os.listdir(logo_dir) if f.endswith('.png')]
print(f"📊 Total logos: {len(png_files)}")