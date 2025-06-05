#!/usr/bin/env python3
import requests
import json
import time
import os
from urllib.parse import quote

# Brands that need correct logos (removed wrong ones)
NEED_CORRECT_LOGOS = [
    'ABC',          # ABC Motors (British, 1913-1923)
    'Access',       # Suzuki Access scooter
    'Ace',          # Ace motorcycles
    'Adler',        # Adler motorcycles (German, historical)
    'Amazonas',     # Amazonas motorcycles
    'AMC',          # Associated Motor Cycles
    'APC',          # Motorcycle brand APC
    'Ariel',        # Ariel motorcycles (British)
    'Atlas',        # Atlas motorcycles
    'Aurora',       # Aurora motorcycles
    'Austin',       # Austin motorcycles
    'Baker',        # Baker motorcycles
    'Big',          # Big motorcycles
    'Boom',         # Boom motorcycles
    'Alldays',      # Alldays & Onions
    'Alligator',    # Alligator motorcycles
    'Allstate',     # Allstate motorcycles
    'Arco',         # Arco motorcycles
]

# Major missing brands from the 625 remaining
MAJOR_MISSING_BRANDS = [
    'Norton',
    'Royal Enfield', 
    'Husqvarna',
    'Vespa',
    'Piaggio',
    'Derbi',
    'Montesa',
    'Gas Gas',
    'Zero',
    'Polaris',
    'Can-Am',
    'Ural',
    'Victory',
    'Hyosung',
    'KYMCO',
    'SYM',
    'Peugeot',
    'Malaguti',
    'TM Racing',
    'Sherco'
]

def search_wikipedia_logo(brand_name):
    """Search for motorcycle brand logo on Wikipedia"""
    search_terms = [
        f"{brand_name} motorcycle",
        f"{brand_name} motorcycles", 
        f"{brand_name} motorbike",
        f"{brand_name} Motor Company"
    ]
    
    for term in search_terms:
        try:
            # Wikipedia search API
            url = f"https://en.wikipedia.org/w/api.php"
            params = {
                'action': 'query',
                'list': 'search',
                'srsearch': term,
                'format': 'json',
                'srlimit': 3
            }
            
            response = requests.get(url, params=params)
            data = response.json()
            
            if 'query' in data and 'search' in data['query']:
                for result in data['query']['search']:
                    title = result['title']
                    if any(word in title.lower() for word in ['motorcycle', 'motor', 'bike']):
                        print(f"Found Wikipedia page for {brand_name}: {title}")
                        return f"https://en.wikipedia.org/wiki/{quote(title)}"
            
            time.sleep(0.5)  # Rate limiting
            
        except Exception as e:
            print(f"Error searching for {brand_name}: {e}")
    
    return None

def generate_search_queries(brand_name):
    """Generate search queries to find correct motorcycle logos"""
    return [
        f'"{brand_name} motorcycle logo" filetype:png',
        f'"{brand_name} motorcycles" official logo',
        f'"{brand_name} motor company" logo vector',
        f'site:wikimedia.org "{brand_name}" motorcycle',
        f'"{brand_name}" motorcycle manufacturer logo'
    ]

def create_download_plan():
    """Create a plan for downloading missing logos"""
    plan = {
        'correct_logos_needed': [],
        'major_brands_missing': [],
        'search_suggestions': {}
    }
    
    # Add brands that need correct logos
    for brand in NEED_CORRECT_LOGOS:
        plan['correct_logos_needed'].append({
            'brand': brand,
            'reason': 'Wrong logo downloaded, need motorcycle-specific version',
            'wikipedia_url': search_wikipedia_logo(brand),
            'search_queries': generate_search_queries(brand)
        })
    
    # Add major missing brands
    for brand in MAJOR_MISSING_BRANDS:
        plan['major_brands_missing'].append({
            'brand': brand,
            'priority': 'high' if brand in ['Norton', 'Royal Enfield', 'Vespa'] else 'medium',
            'wikipedia_url': search_wikipedia_logo(brand),
            'search_queries': generate_search_queries(brand)
        })
    
    return plan

if __name__ == "__main__":
    print("Creating logo download plan...")
    plan = create_download_plan()
    
    # Save plan to file
    with open('logo_download_plan.json', 'w') as f:
        json.dump(plan, f, indent=2)
    
    print(f"\nCreated download plan:")
    print(f"- {len(plan['correct_logos_needed'])} brands need correct logos")
    print(f"- {len(plan['major_brands_missing'])} major brands missing")
    print(f"\nSaved to logo_download_plan.json")
    
    # Print some immediate action items
    print(f"\nImmediate priorities:")
    high_priority = [b for b in plan['major_brands_missing'] if b['priority'] == 'high']
    for brand in high_priority[:5]:
        print(f"- {brand['brand']}: {brand['wikipedia_url'] or 'Search needed'}")