#!/usr/bin/env python3
"""
Check which brands are still missing
"""

import os

# Priority 40 brands list
priority_brands = [
    'Honda', 'Yamaha', 'Suzuki', 'Kawasaki',  # Japanese Big 4
    'Harley-Davidson', 'Indian', 'Victory', 'Buell',  # American
    'BMW', 'KTM', 'Husqvarna',  # European 
    'Ducati', 'MV Agusta', 'Aprilia', 'Moto Guzzi', 'Benelli', 'Bimota', 'Cagiva',  # Italian
    'Triumph', 'Norton', 'BSA', 'Royal Enfield',  # British
    'Vespa', 'Piaggio',  # Scooters
    'Zero Motorcycles', 'Bajaj', 'Hero', 'TVS', 'KYMCO', 'SYM',  # Electric/Asian
    'GasGas', 'Beta', 'Sherco',  # Off-road
    'CFMoto', 'Ural', 'Jawa', 'Polaris', 'Can-Am'  # Others
]

# Check what we have
logo_dir = "/Users/kevintong/Documents/Code/bikenode.com/logos/motorcycle-brands"
existing_files = os.listdir(logo_dir)
existing_brands = set()

# Map filenames to brands
filename_to_brand = {
    'honda.png': 'Honda',
    'yamaha.png': 'Yamaha', 
    'suzuki.png': 'Suzuki',
    'kawasaki.png': 'Kawasaki',
    'harley_davidson.png': 'Harley-Davidson',
    'indian.png': 'Indian',
    'victory.png': 'Victory',
    'buell.png': 'Buell',
    'bmw.png': 'BMW',
    'ktm.png': 'KTM',
    'husqvarna.png': 'Husqvarna',
    'ducati.png': 'Ducati',
    'mv_agusta.png': 'MV Agusta',
    'aprilia.png': 'Aprilia',
    'moto_guzzi.png': 'Moto Guzzi',
    'benelli.png': 'Benelli',
    'bimota.png': 'Bimota',
    'cagiva.png': 'Cagiva',
    'triumph.png': 'Triumph',
    'norton.png': 'Norton',
    'bsa.png': 'BSA',
    'royal_enfield.png': 'Royal Enfield',
    'vespa.png': 'Vespa',
    'piaggio.png': 'Piaggio',
    'zero.png': 'Zero Motorcycles',
    'bajaj.png': 'Bajaj',
    'hero.png': 'Hero',
    'tvs.png': 'TVS',
    'kymco.png': 'KYMCO',
    'sym.png': 'SYM',
    'gasgas.png': 'GasGas',
    'beta.png': 'Beta',
    'sherco.png': 'Sherco',
    'cfmoto.png': 'CFMoto',
    'ural.png': 'Ural',
    'jawa.png': 'Jawa',
    'polaris.png': 'Polaris',
    'can_am.png': 'Can-Am'
}

for filename, brand in filename_to_brand.items():
    if filename in existing_files:
        existing_brands.add(brand)

missing_brands = []
for brand in priority_brands:
    if brand not in existing_brands:
        missing_brands.append(brand)

print(f"🔍 Analysis of 40 Priority Brands:")
print(f"✅ Have: {len(existing_brands)}/40 ({len(existing_brands)/40*100:.1f}%)")
print(f"❌ Missing: {len(missing_brands)}/40")
print()

if missing_brands:
    print("📋 Still Missing:")
    for i, brand in enumerate(missing_brands, 1):
        print(f"  {i}. {brand}")
else:
    print("🎉 100% COMPLETE!")