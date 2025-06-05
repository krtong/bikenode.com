#!/usr/bin/env python3
"""
Document potential logo sources for each motorcycle brand
"""

import csv
import json
from urllib.parse import quote

def document_logo_sources():
    """Create a comprehensive list of where to find each brand's logo"""
    
    # Known good sources for motorcycle logos
    logo_databases = {
        'seeklogo': 'https://seeklogo.com/search?q=',
        'brandsoftheworld': 'https://www.brandsoftheworld.com/search/logo?search_api_views_fulltext=',
        'wikipedia': 'https://en.wikipedia.org/wiki/',
        'commons': 'https://commons.wikimedia.org/w/index.php?search=',
        'logopedia': 'https://logos.fandom.com/wiki/',
        'worldvectorlogo': 'https://worldvectorlogo.com/search/',
        'freepnglogos': 'https://www.freepnglogos.com/search.php?q=',
        'cleanpng': 'https://www.cleanpng.com/search/?q='
    }
    
    # Read motorcycle brands
    brands = []
    csv_path = '/Users/kevintong/Documents/Code/bikenode.com/database/data/motorcycle_brands.csv'
    
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            brand_info = {
                'name': row['Manufacturer'],
                'status': row['Status'],
                'website': row['Official_Website'],
                'country': row['Country']
            }
            
            # Generate search URLs for this brand
            search_urls = {}
            clean_name = brand_info['name'].replace('-', ' ')
            
            for source, base_url in logo_databases.items():
                if source == 'wikipedia':
                    # Special handling for Wikipedia
                    search_urls[source] = base_url + quote(clean_name.replace(' ', '_')) + '_(motorcycles)'
                elif source == 'logopedia':
                    # Special handling for Logopedia
                    search_urls[source] = base_url + quote(clean_name.replace(' ', '_'))
                else:
                    search_urls[source] = base_url + quote(clean_name)
            
            # Add official website if available
            if brand_info['website'] and brand_info['website'] != 'N/A':
                search_urls['official'] = brand_info['website']
            
            brand_info['search_urls'] = search_urls
            brands.append(brand_info)
    
    # Save as JSON for easy access
    output_path = '/Users/kevintong/Documents/Code/bikenode.com/logo-acquisition/all_logo_sources.json'
    with open(output_path, 'w') as f:
        json.dump(brands, f, indent=2)
    
    # Create priority list (active brands with websites)
    priority_brands = [b for b in brands if 'Active' in b['status'] and b['website'] != 'N/A']
    
    # Create a markdown documentation file
    doc_path = '/Users/kevintong/Documents/Code/bikenode.com/logo-acquisition/logo_sources.md'
    with open(doc_path, 'w') as f:
        f.write("# Motorcycle Brand Logo Sources\n\n")
        f.write(f"Total brands: {len(brands)}\n")
        f.write(f"Priority brands (active with websites): {len(priority_brands)}\n\n")
        
        f.write("## Priority Brands\n\n")
        for brand in priority_brands[:50]:  # First 50 priority brands
            f.write(f"### {brand['name']}\n")
            f.write(f"- Status: {brand['status']}\n")
            f.write(f"- Country: {brand['country']}\n")
            f.write(f"- Official Website: {brand['website']}\n")
            f.write("- Search URLs:\n")
            for source, url in brand['search_urls'].items():
                f.write(f"  - [{source}]({url})\n")
            f.write("\n")
    
    print(f"Created documentation with {len(brands)} brands")
    print(f"JSON data saved to: {output_path}")
    print(f"Markdown documentation saved to: {doc_path}")
    
    return brands

def create_download_commands():
    """Create wget/curl commands for known logo URLs"""
    
    # Some known direct logo URLs for major brands
    known_logos = {
        'Harley-Davidson': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/de/Harley-Davidson_logo.svg/2048px-Harley-Davidson_logo.svg.png',
        'Honda': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Honda_Logo.svg/2048px-Honda_Logo.svg.png',
        'Yamaha': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/Yamaha_Motor_logo.svg/2048px-Yamaha_Motor_logo.svg.png',
        'Kawasaki': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Kawasaki_Heavy_Industries_logo.svg/2048px-Kawasaki_Heavy_Industries_logo.svg.png',
        'Suzuki': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/Suzuki_logo_2.svg/2048px-Suzuki_logo_2.svg.png',
        'BMW': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/BMW.svg/2048px-BMW.svg.png',
        'Ducati': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Ducati_logo.svg/2048px-Ducati_logo.svg.png',
        'KTM': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/43/KTM-Logo.svg/2048px-KTM-Logo.svg.png',
        'Triumph': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c0/Triumph_logo.svg/2048px-Triumph_logo.svg.png',
        'Royal Enfield': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/Royal_Enfield_logo.svg/2048px-Royal_Enfield_logo.svg.png'
    }
    
    logos_dir = '/Users/kevintong/Documents/Code/bikenode.com/logos/motorcycle-brands'
    
    # Create download script
    script_path = f'{logos_dir}/download_major_brands.sh'
    with open(script_path, 'w') as f:
        f.write("#!/bin/bash\n")
        f.write("# Download major motorcycle brand logos\n\n")
        f.write(f"cd {logos_dir}\n\n")
        
        for brand, url in known_logos.items():
            filename = brand.lower().replace(' ', '_').replace('-', '_') + '.png'
            f.write(f"echo 'Downloading {brand} logo...'\n")
            f.write(f"curl -L -o '{filename}' '{url}'\n\n")
    
    # Make script executable
    import os
    os.chmod(script_path, 0o755)
    
    print(f"Created download script: {script_path}")
    print("Run it with: bash " + script_path)

if __name__ == "__main__":
    # Document all logo sources
    brands = document_logo_sources()
    
    # Create download commands for known logos
    create_download_commands()
    
    print("\nYou can now:")
    print("1. Check all_logo_sources.json for comprehensive search URLs")
    print("2. Run download_major_brands.sh to get logos for major brands")
    print("3. Use the search URLs to manually find and download other logos")