#!/usr/bin/env python3
"""
Get more logos from GitHub repositories
Many open source projects maintain logo collections
"""

import urllib.request
import os
import subprocess
import json
import time

def download_and_convert(brand, url, filename_base):
    """Download and convert SVG to PNG if needed"""
    try:
        print(f"  Trying: {url}")
        req = urllib.request.Request(url, headers={
            'User-Agent': 'Mozilla/5.0',
            'Accept': '*/*'
        })
        response = urllib.request.urlopen(req, timeout=10)
        data = response.read()
        
        if len(data) < 100:
            return False
            
        # Determine file type
        if b'<svg' in data[:1000] or b'<?xml' in data[:100]:
            # SVG file
            svg_path = f"/Users/kevintong/Documents/Code/bikenode.com/logos/motorcycle-brands/{filename_base}.svg"
            png_path = f"/Users/kevintong/Documents/Code/bikenode.com/logos/motorcycle-brands/{filename_base}.png"
            
            # Check if PNG already exists
            if os.path.exists(png_path):
                print(f"    ✓ Already have {filename_base}.png")
                return True
            
            with open(svg_path, 'wb') as f:
                f.write(data)
            
            # Convert to PNG
            convert_cmd = [
                'convert', '-background', 'none', '-density', '300',
                svg_path, '-resize', '1024x1024>', png_path
            ]
            
            result = subprocess.run(convert_cmd, capture_output=True)
            if result.returncode == 0:
                dims = subprocess.run(['identify', '-format', '%wx%h', png_path], 
                                    capture_output=True, text=True).stdout
                print(f"    ✅ Success! Converted to PNG ({dims})")
                os.remove(svg_path)  # Clean up SVG
                return True
            else:
                os.remove(svg_path)
                return False
                
        elif data[:4] == b'\x89PNG' or data[:2] == b'\xff\xd8':
            # PNG or JPEG
            ext = 'png' if data[:4] == b'\x89PNG' else 'jpg'
            filepath = f"/Users/kevintong/Documents/Code/bikenode.com/logos/motorcycle-brands/{filename_base}.{ext}"
            
            with open(filepath, 'wb') as f:
                f.write(data)
            
            # Verify it's valid
            result = subprocess.run(['file', filepath], capture_output=True, text=True)
            if 'image' in result.stdout.lower():
                dims = subprocess.run(['identify', '-format', '%wx%h', filepath], 
                                    capture_output=True, text=True).stdout
                print(f"    ✅ Success! Downloaded PNG/JPG ({dims})")
                return True
            else:
                os.remove(filepath)
                return False
                
    except Exception as e:
        print(f"    ❌ Error: {str(e)}")
        return False

# GitHub repositories with motorcycle logos
github_sources = {
    # Various logo collections
    'Indian': [
        ('indian', 'https://raw.githubusercontent.com/detain/svg-logos/master/svg/i/indian-motorcycles.svg'),
        ('indian', 'https://raw.githubusercontent.com/detain/svg-logos/master/svg/i/indian-motorcycle-2.svg'),
        ('indian', 'https://raw.githubusercontent.com/gilbarbara/logos/master/logos/indian-motorcycle.svg'),
    ],
    
    'Zero Motorcycles': [
        ('zero', 'https://raw.githubusercontent.com/detain/svg-logos/master/svg/z/zero-motorcycles.svg'),
        ('zero', 'https://raw.githubusercontent.com/simple-icons/simple-icons/develop/icons/zero.svg'),
    ],
    
    'Bajaj': [
        ('bajaj', 'https://raw.githubusercontent.com/detain/svg-logos/master/svg/b/bajaj.svg'),
        ('bajaj', 'https://raw.githubusercontent.com/gilbarbara/logos/master/logos/bajaj.svg'),
    ],
    
    'Hero': [
        ('hero', 'https://raw.githubusercontent.com/detain/svg-logos/master/svg/h/hero-motocorp.svg'),
        ('hero', 'https://raw.githubusercontent.com/detain/svg-logos/master/svg/h/hero.svg'),
    ],
    
    'TVS': [
        ('tvs', 'https://raw.githubusercontent.com/detain/svg-logos/master/svg/t/tvs.svg'),
        ('tvs', 'https://raw.githubusercontent.com/detain/svg-logos/master/svg/t/tvs-motor.svg'),
    ],
    
    'BSA': [
        ('bsa', 'https://raw.githubusercontent.com/detain/svg-logos/master/svg/b/bsa.svg'),
        ('bsa', 'https://raw.githubusercontent.com/detain/svg-logos/master/svg/b/bsa-motorcycles.svg'),
    ],
    
    'Buell': [
        ('buell', 'https://raw.githubusercontent.com/detain/svg-logos/master/svg/b/buell.svg'),
        ('buell', 'https://raw.githubusercontent.com/detain/svg-logos/master/svg/b/buell-motorcycles.svg'),
    ],
    
    'Victory': [
        ('victory', 'https://raw.githubusercontent.com/detain/svg-logos/master/svg/v/victory-motorcycles.svg'),
        ('victory', 'https://raw.githubusercontent.com/detain/svg-logos/master/svg/v/victory.svg'),
    ],
    
    'Bimota': [
        ('bimota', 'https://raw.githubusercontent.com/detain/svg-logos/master/svg/b/bimota.svg'),
    ],
    
    'Cagiva': [
        ('cagiva', 'https://raw.githubusercontent.com/detain/svg-logos/master/svg/c/cagiva.svg'),
    ],
    
    'GasGas': [
        ('gasgas', 'https://raw.githubusercontent.com/detain/svg-logos/master/svg/g/gas-gas.svg'),
        ('gasgas', 'https://raw.githubusercontent.com/detain/svg-logos/master/svg/g/gasgas.svg'),
    ],
    
    'Polaris': [
        ('polaris', 'https://raw.githubusercontent.com/detain/svg-logos/master/svg/p/polaris.svg'),
        ('polaris', 'https://raw.githubusercontent.com/simple-icons/simple-icons/develop/icons/polaris.svg'),
    ],
    
    'KYMCO': [
        ('kymco', 'https://raw.githubusercontent.com/detain/svg-logos/master/svg/k/kymco.svg'),
    ],
    
    'SYM': [
        ('sym', 'https://raw.githubusercontent.com/detain/svg-logos/master/svg/s/sym.svg'),
    ],
    
    'CFMoto': [
        ('cfmoto', 'https://raw.githubusercontent.com/detain/svg-logos/master/svg/c/cfmoto.svg'),
        ('cfmoto', 'https://raw.githubusercontent.com/detain/svg-logos/master/svg/c/cf-moto.svg'),
    ],
    
    'Ural': [
        ('ural', 'https://raw.githubusercontent.com/detain/svg-logos/master/svg/u/ural.svg'),
        ('ural', 'https://raw.githubusercontent.com/detain/svg-logos/master/svg/u/ural-motorcycles.svg'),
    ],
    
    'Sherco': [
        ('sherco', 'https://raw.githubusercontent.com/detain/svg-logos/master/svg/s/sherco.svg'),
    ],
    
    'Jawa': [
        ('jawa', 'https://raw.githubusercontent.com/detain/svg-logos/master/svg/j/jawa.svg'),
        ('jawa', 'https://raw.githubusercontent.com/detain/svg-logos/master/svg/j/jawa-motorcycles.svg'),
    ]
}

print("🏍️ Searching GitHub Logo Repositories")
print("=" * 50)
print()

success_count = 0
for brand, urls in github_sources.items():
    print(f"\n🔍 {brand}:")
    
    downloaded = False
    for filename_base, url in urls:
        if download_and_convert(brand, url, filename_base):
            success_count += 1
            downloaded = True
            break
        time.sleep(0.5)  # Be polite
    
    if not downloaded:
        print(f"  ❌ No valid sources found")

print("\n" + "=" * 50)
print(f"✅ Successfully downloaded: {success_count}/{len(github_sources)} brands")

# Show current stats
logo_dir = "/Users/kevintong/Documents/Code/bikenode.com/logos/motorcycle-brands"
total = len([f for f in os.listdir(logo_dir) if f.endswith('.png')])
high_res = 0

for f in os.listdir(logo_dir):
    if f.endswith('.png'):
        filepath = os.path.join(logo_dir, f)
        result = subprocess.run(['identify', '-format', '%w', filepath], 
                              capture_output=True, text=True)
        if result.returncode == 0:
            try:
                width = int(result.stdout.strip())
                if width >= 512:
                    high_res += 1
            except:
                pass

print(f"\n📊 Collection Status:")
print(f"  Total PNG logos: {total}")
print(f"  High-resolution (512px+): {high_res}")
print(f"  Coverage: {high_res/40*100:.1f}% of priority brands")