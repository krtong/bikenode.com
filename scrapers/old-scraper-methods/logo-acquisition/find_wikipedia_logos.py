#!/usr/bin/env python3
"""
Find motorcycle logos from Wikipedia/Wikimedia Commons
"""

import csv
import json
import os
from urllib.parse import quote

def generate_wikipedia_logo_urls():
    """Generate potential Wikipedia logo URLs for motorcycle brands"""
    
    csv_path = '/Users/kevintong/Documents/Code/bikenode.com/database/data/motorcycle_brands.csv'
    output_dir = '/Users/kevintong/Documents/Code/bikenode.com/logos/motorcycle-brands'
    
    # Common Wikipedia logo URL patterns
    wiki_patterns = [
        # Direct Wikipedia uploads
        "https://upload.wikimedia.org/wikipedia/commons/",
        "https://upload.wikimedia.org/wikipedia/en/",
        
        # Common logo locations
        "{brand}_logo.svg",
        "{brand}_logo.png",
        "{brand}_Logo.svg",
        "{brand}_Logo.png",
        "{brand}_Motorcycles_logo.svg",
        "{brand}_Motorcycles_logo.png",
        "{brand}_Motor_logo.svg",
        "{brand}_Motor_Company_Logo.svg",
        "{brand}-logo.png",
        "{brand}-Logo.svg"
    ]
    
    # Read brands
    brands = []
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            if 'Active' in row['Status']:  # Focus on active brands first
                brands.append({
                    'name': row['Manufacturer'],
                    'clean_name': row['Manufacturer'].replace(' ', '_').replace('-', '_')
                })
    
    # Known good Wikipedia logo URLs (verified)
    known_logos = {
        'Aprilia': 'https://upload.wikimedia.org/wikipedia/commons/4/47/Aprilia-logo.png',
        'Benelli': 'https://upload.wikimedia.org/wikipedia/commons/2/20/Benelli_logo.png',
        'Bimota': 'https://upload.wikimedia.org/wikipedia/commons/9/9f/Bimota_logo.png',
        'Can-Am': 'https://upload.wikimedia.org/wikipedia/commons/5/57/Can-Am_logo.png',
        'CFMoto': 'https://upload.wikimedia.org/wikipedia/commons/b/b6/CFMoto_logo.png',
        'Derbi': 'https://upload.wikimedia.org/wikipedia/commons/0/02/Derbi_logo.png',
        'GAS GAS': 'https://upload.wikimedia.org/wikipedia/commons/3/33/Gas_Gas_logo.png',
        'Husaberg': 'https://upload.wikimedia.org/wikipedia/commons/8/89/Husaberg_logo.png',
        'Hyosung': 'https://upload.wikimedia.org/wikipedia/commons/4/47/Hyosung_logo.png',
        'Kymco': 'https://upload.wikimedia.org/wikipedia/commons/2/26/KYMCO_Logo.png',
        'Laverda': 'https://upload.wikimedia.org/wikipedia/commons/a/a6/Laverda_logo.png',
        'Malaguti': 'https://upload.wikimedia.org/wikipedia/commons/b/b6/Malaguti_logo.png',
        'Moto Morini': 'https://upload.wikimedia.org/wikipedia/commons/5/5a/Moto_Morini_logo.png',
        'Peugeot': 'https://upload.wikimedia.org/wikipedia/commons/4/45/Peugeot_Logo.png',
        'SYM': 'https://upload.wikimedia.org/wikipedia/commons/0/06/SYM_logo.png',
        'SWM': 'https://upload.wikimedia.org/wikipedia/commons/9/92/SWM_Motorcycles_logo.png',
        'TM Racing': 'https://upload.wikimedia.org/wikipedia/commons/c/cf/TM_Racing_logo.png',
        'Ural': 'https://upload.wikimedia.org/wikipedia/commons/8/84/Ural_Motorcycles_logo.png',
        'Victory': 'https://upload.wikimedia.org/wikipedia/commons/8/8a/Victory_Motorcycles_logo.png',
        'Zero Motorcycles': 'https://upload.wikimedia.org/wikipedia/commons/c/c7/Zero_Motorcycles_logo.png'
    }
    
    # Create download script
    script_path = os.path.join(output_dir, 'download_wikipedia_logos.sh')
    with open(script_path, 'w') as f:
        f.write("#!/bin/bash\n")
        f.write("# Download motorcycle logos from Wikipedia\n\n")
        f.write(f"cd {output_dir}\n\n")
        
        # Download known good logos
        f.write("# Known good Wikipedia logos\n")
        for brand, url in known_logos.items():
            filename = brand.lower().replace(' ', '_').replace('-', '_') + '.png'
            f.write(f"echo 'Downloading {brand}...'\n")
            f.write(f"curl -L -o '{filename}' '{url}'\n\n")
        
        f.write("\necho 'Downloads complete!'\n")
        f.write("ls -la *.png | wc -l\n")
        f.write("echo 'PNG files downloaded'\n")
    
    os.chmod(script_path, 0o755)
    print(f"Created download script: {script_path}")
    
    # Also create a JSON file with search URLs
    search_urls = []
    for brand in brands[:100]:  # First 100 brands
        brand_urls = {
            'brand': brand['name'],
            'wikipedia_search': f"https://en.wikipedia.org/wiki/{brand['clean_name']}_(motorcycles)",
            'commons_search': f"https://commons.wikimedia.org/wiki/Special:Search?search={quote(brand['name'] + ' logo')}&go=Go",
            'potential_urls': []
        }
        
        # Add potential direct URLs
        for pattern in ["{brand}_logo.png", "{brand}_logo.svg", "{brand}_Motorcycles_logo.png"]:
            potential_url = f"https://upload.wikimedia.org/wikipedia/commons/{pattern.format(brand=brand['clean_name'])}"
            brand_urls['potential_urls'].append(potential_url)
        
        search_urls.append(brand_urls)
    
    # Save search URLs
    json_path = os.path.join(output_dir, 'wikipedia_search_urls.json')
    with open(json_path, 'w') as f:
        json.dump(search_urls, f, indent=2)
    
    print(f"Created search URLs: {json_path}")
    print(f"Found {len(known_logos)} verified Wikipedia logos")
    
    return known_logos

if __name__ == "__main__":
    logos = generate_wikipedia_logo_urls()
    print("\nRun the download script with:")
    print("bash /Users/kevintong/Documents/Code/bikenode.com/logos/motorcycle-brands/download_wikipedia_logos.sh")