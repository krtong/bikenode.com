#!/usr/bin/env python3
"""
Logo Search Helper
Generates search URLs and potential sources for finding motorcycle brand logos
"""

import csv
import urllib.parse
import json

def generate_search_urls(brand_name, website=None):
    """Generate various search URLs for finding logos"""
    urls = []
    
    # Clean brand name for searches
    search_term = f"{brand_name} motorcycle logo PNG transparent"
    encoded_term = urllib.parse.quote(search_term)
    
    # Google Images search
    urls.append({
        'source': 'Google Images',
        'url': f"https://www.google.com/search?q={encoded_term}&tbm=isch&tbs=ic:trans"
    })
    
    # Direct website (if available)
    if website and website != 'N/A' and website.startswith('http'):
        urls.append({
            'source': 'Official Website',
            'url': website
        })
    
    # Wikipedia
    wiki_term = urllib.parse.quote(f"{brand_name} motorcycles")
    urls.append({
        'source': 'Wikipedia',
        'url': f"https://en.wikipedia.org/wiki/{wiki_term}"
    })
    
    # Brands of the World
    botw_term = urllib.parse.quote(brand_name.lower())
    urls.append({
        'source': 'Brands of the World',
        'url': f"https://www.brandsoftheworld.com/search/logo?search_api_views_fulltext={botw_term}"
    })
    
    # Seeklogo
    seek_term = urllib.parse.quote(brand_name.lower().replace(' ', '-'))
    urls.append({
        'source': 'Seeklogo',
        'url': f"https://seeklogo.com/search?q={seek_term}"
    })
    
    # Logopedia/Fandom
    fandom_term = urllib.parse.quote(brand_name)
    urls.append({
        'source': 'Logopedia',
        'url': f"https://logos.fandom.com/wiki/Special:Search?query={fandom_term}"
    })
    
    return urls

def create_search_guide(csv_file, output_file):
    """Create a comprehensive search guide for all brands"""
    brands = []
    
    # Load brands from CSV
    with open(csv_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row['Status'] and 'Active' in row['Status']:  # Prioritize active brands
                brands.append({
                    'name': row['Manufacturer'],
                    'website': row['Official_Website'],
                    'status': row['Status'],
                    'country': row['Country']
                })
    
    # Generate search guide
    search_guide = []
    for brand in brands:
        urls = generate_search_urls(brand['name'], brand['website'])
        search_guide.append({
            'brand': brand['name'],
            'status': brand['status'],
            'country': brand['country'],
            'search_urls': urls
        })
    
    # Save as JSON
    with open(output_file, 'w') as f:
        json.dump(search_guide, f, indent=2)
    
    # Also create a simple HTML file for easy clicking
    html_file = output_file.replace('.json', '.html')
    with open(html_file, 'w') as f:
        f.write("""<!DOCTYPE html>
<html>
<head>
    <title>Motorcycle Brand Logo Search Guide</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .brand { margin-bottom: 30px; padding: 15px; background: #f5f5f5; border-radius: 5px; }
        .brand h3 { margin-top: 0; color: #333; }
        .info { color: #666; font-size: 14px; margin-bottom: 10px; }
        .links { margin-top: 10px; }
        .links a { display: inline-block; margin-right: 15px; margin-bottom: 5px; 
                   padding: 5px 10px; background: #007bff; color: white; 
                   text-decoration: none; border-radius: 3px; font-size: 14px; }
        .links a:hover { background: #0056b3; }
        .official { background: #28a745 !important; }
        .official:hover { background: #1e7e34 !important; }
    </style>
</head>
<body>
    <h1>Motorcycle Brand Logo Search Guide</h1>
    <p>Click on the links below to search for logos for each brand. Look for transparent PNG files in high resolution.</p>
    <hr>
""")
        
        for item in search_guide:
            f.write(f'<div class="brand">\n')
            f.write(f'<h3>{item["brand"]}</h3>\n')
            f.write(f'<div class="info">Status: {item["status"]} | Country: {item["country"]}</div>\n')
            f.write('<div class="links">\n')
            
            for url_info in item['search_urls']:
                class_name = 'official' if url_info['source'] == 'Official Website' else ''
                f.write(f'<a href="{url_info["url"]}" target="_blank" class="{class_name}">{url_info["source"]}</a>\n')
            
            f.write('</div>\n</div>\n')
        
        f.write("""
</body>
</html>
""")
    
    print(f"Search guide created: {output_file}")
    print(f"HTML guide created: {html_file}")
    return len(search_guide)

def create_logo_naming_guide(csv_file, output_file):
    """Create a guide for consistent logo file naming"""
    with open(output_file, 'w') as f:
        f.write("MOTORCYCLE BRAND LOGO NAMING CONVENTION\n")
        f.write("=" * 50 + "\n\n")
        f.write("Format: [brand_name].png\n")
        f.write("- Use lowercase\n")
        f.write("- Replace spaces with underscores\n")
        f.write("- Remove special characters\n")
        f.write("- Always use .png extension\n\n")
        f.write("Examples:\n")
        f.write("- Harley-Davidson → harley_davidson.png\n")
        f.write("- MV Agusta → mv_agusta.png\n")
        f.write("- Zero Motorcycles → zero_motorcycles.png\n\n")
        f.write("=" * 50 + "\n\n")
        
        # Load brands and create naming list
        with open(csv_file, 'r', encoding='utf-8') as csv_f:
            reader = csv.DictReader(csv_f)
            f.write("Brand Name → Logo Filename\n")
            f.write("-" * 50 + "\n")
            for row in reader:
                brand = row['Manufacturer']
                filename = brand.lower().replace(' ', '_').replace('-', '_')
                filename = ''.join(c for c in filename if c.isalnum() or c == '_')
                filename = filename + '.png'
                f.write(f"{brand} → {filename}\n")

if __name__ == "__main__":
    csv_file = "/Users/kevintong/Documents/Code/bikenode.com/database/data/motorcycle_brands.csv"
    
    # Create search guide
    guide_file = "/Users/kevintong/Documents/Code/bikenode.com/scrapers/logo-acquisition/search_guide.json"
    count = create_search_guide(csv_file, guide_file)
    print(f"\nCreated search guide for {count} active brands")
    
    # Create naming guide
    naming_file = "/Users/kevintong/Documents/Code/bikenode.com/scrapers/logo-acquisition/naming_guide.txt"
    create_logo_naming_guide(csv_file, naming_file)
    print(f"Created naming guide: {naming_file}")