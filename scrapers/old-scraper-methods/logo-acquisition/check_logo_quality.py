#!/usr/bin/env python3
"""
Check Logo Quality and Identify Missing Priority Brands
"""

import os
import subprocess
import json

logos_dir = "/Users/kevintong/Documents/Code/bikenode.com/logos/motorcycle-brands"

# Priority brands we should have
priority_brands = [
    'Honda', 'Yamaha', 'Kawasaki', 'Suzuki',  # Japanese Big 4
    'Ducati', 'Aprilia', 'MV Agusta', 'Moto Guzzi', 'Benelli', 'Bimota',  # Italian
    'KTM', 'Husqvarna', 'BMW', 'GasGas',  # Austrian/German
    'Triumph', 'Norton', 'BSA', 'Royal Enfield',  # British
    'Harley-Davidson', 'Indian', 'Victory', 'Buell', 'Zero Motorcycles',  # American
    'Vespa', 'Piaggio', 'Peugeot', 'Derbi',  # Scooters/European
    'Can-Am', 'Polaris', 'Ural',  # Other
    'Bajaj', 'Hero', 'TVS',  # Indian brands
    'KYMCO', 'SYM', 'CFMoto',  # Asian
    'Beta', 'Sherco', 'Jawa', 'Cagiva'  # European off-road
]

print("🏍️  Motorcycle Brand Logo Quality Check\n")
print("=" * 60)

# Check existing logos
existing_logos = {}
missing_brands = []

for brand in priority_brands:
    # Check various filename formats
    possible_files = [
        brand.lower().replace(' ', '_').replace('-', '_') + '.png',
        brand.lower().replace(' ', '_') + '.png',
        brand.lower().replace(' ', '-') + '.png',
        brand.lower().replace('-', '_') + '.png',
        brand.lower() + '.png'
    ]
    
    found = False
    for filename in possible_files:
        filepath = os.path.join(logos_dir, filename)
        if os.path.exists(filepath):
            # Check if it's a real image
            file_cmd = ['file', filepath]
            file_result = subprocess.run(file_cmd, capture_output=True, text=True)
            
            if 'PNG image' in file_result.stdout or 'JPEG image' in file_result.stdout:
                # Get dimensions
                try:
                    identify_cmd = ['identify', '-format', '%wx%h', filepath]
                    identify_result = subprocess.run(identify_cmd, capture_output=True, text=True)
                    if identify_result.returncode == 0:
                        dimensions = identify_result.stdout.strip()
                        width, height = map(int, dimensions.split('x'))
                        existing_logos[brand] = {
                            'filename': filename,
                            'width': width,
                            'height': height,
                            'size': min(width, height)
                        }
                        found = True
                        break
                except:
                    pass
    
    if not found:
        missing_brands.append(brand)

# Print results
print("\n✅ EXISTING LOGOS:")
print("-" * 60)

# Sort by size (largest first)
sorted_logos = sorted(existing_logos.items(), key=lambda x: x[1]['size'], reverse=True)

high_res_count = 0
med_res_count = 0
low_res_count = 0

for brand, info in sorted_logos:
    size_indicator = "🟢" if info['size'] >= 800 else "🟡" if info['size'] >= 500 else "🔴"
    print(f"{size_indicator} {brand:20} {info['width']:4}x{info['height']:<4} ({info['filename']})")
    
    if info['size'] >= 800:
        high_res_count += 1
    elif info['size'] >= 500:
        med_res_count += 1
    else:
        low_res_count += 1

print(f"\n📊 QUALITY SUMMARY:")
print(f"   🟢 High resolution (800px+): {high_res_count}")
print(f"   🟡 Medium resolution (500-799px): {med_res_count}")
print(f"   🔴 Low resolution (<500px): {low_res_count}")

print(f"\n❌ MISSING PRIORITY BRANDS ({len(missing_brands)}):")
print("-" * 60)
for brand in missing_brands:
    print(f"   - {brand}")

print(f"\n📈 COVERAGE:")
print(f"   Priority brands covered: {len(existing_logos)}/{len(priority_brands)} ({len(existing_logos)/len(priority_brands)*100:.1f}%)")

# Save report
report = {
    'existing_logos': existing_logos,
    'missing_brands': missing_brands,
    'quality_stats': {
        'high_res': high_res_count,
        'medium_res': med_res_count,
        'low_res': low_res_count
    },
    'coverage': {
        'covered': len(existing_logos),
        'total': len(priority_brands),
        'percentage': len(existing_logos)/len(priority_brands)*100
    }
}

with open('logo_quality_report.json', 'w') as f:
    json.dump(report, f, indent=2)

print(f"\n💾 Full report saved to: logo_quality_report.json")