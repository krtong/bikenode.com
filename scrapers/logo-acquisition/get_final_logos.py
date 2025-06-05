#!/usr/bin/env python3
"""
Get the final missing logos with targeted approach
"""

import urllib.request
import os
import subprocess
import time

def download_logo(brand, filename, url):
    """Download a single logo"""
    print(f"🔍 {brand}: {url}")
    
    png_path = f"/Users/kevintong/Documents/Code/bikenode.com/logos/motorcycle-brands/{filename}.png"
    if os.path.exists(png_path):
        print(f"  ✓ Already have {filename}.png")
        return True
    
    try:
        req = urllib.request.Request(url, headers={
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        })
        response = urllib.request.urlopen(req, timeout=10)
        data = response.read()
        
        if len(data) < 100:
            print(f"  ❌ File too small")
            return False
        
        # Save temporarily
        temp_path = f"/Users/kevintong/Documents/Code/bikenode.com/logos/motorcycle-brands/{filename}_temp"
        with open(temp_path, 'wb') as f:
            f.write(data)
        
        # Check if it's a valid image and get dimensions
        result = subprocess.run(['file', temp_path], capture_output=True, text=True)
        if 'image' not in result.stdout.lower():
            os.remove(temp_path)
            print(f"  ❌ Not a valid image")
            return False
        
        # Get dimensions
        dims_result = subprocess.run(['identify', '-format', '%wx%h', temp_path], 
                                   capture_output=True, text=True)
        if dims_result.returncode != 0:
            os.remove(temp_path)
            print(f"  ❌ Can't identify dimensions")
            return False
        
        dims = dims_result.stdout.strip()
        try:
            width = int(dims.split('x')[0])
            if width < 512:
                os.remove(temp_path)
                print(f"  ❌ Too small ({dims})")
                return False
        except:
            os.remove(temp_path)
            print(f"  ❌ Invalid dimensions")
            return False
        
        # Convert to PNG if needed
        if 'PNG' in result.stdout:
            os.rename(temp_path, png_path)
        else:
            convert_result = subprocess.run(['convert', temp_path, png_path], 
                                          capture_output=True)
            os.remove(temp_path)
            if convert_result.returncode != 0:
                print(f"  ❌ Conversion failed")
                return False
        
        print(f"  ✅ Success! ({dims})")
        return True
        
    except Exception as e:
        print(f"  ❌ Error: {str(e)}")
        return False

# Targeted logo URLs found through manual research
logos_to_try = [
    # Bajaj - found on various logo sites
    ('Bajaj', 'bajaj', 'https://logos-world.net/wp-content/uploads/2021/11/Bajaj-Logo.png'),
    ('Bajaj', 'bajaj', 'https://www.carlogos.org/logo/Bajaj-logo-2048x2048.png'),
    
    # GasGas - found on brand sites
    ('GasGas', 'gasgas', 'https://www.gasgas.com/content/dam/gasgas/logo/gas-gas-logo.svg'),
    ('GasGas', 'gasgas', 'https://logos-world.net/wp-content/uploads/2021/11/Gas-Gas-Logo.png'),
    
    # CFMoto - Chinese manufacturer
    ('CFMoto', 'cfmoto', 'https://logos-world.net/wp-content/uploads/2021/11/CFMoto-Logo.png'),
    ('CFMoto', 'cfmoto', 'https://www.carlogos.org/logo/CFMoto-logo-2048x2048.png'),
    
    # Ural - Russian sidecars
    ('Ural', 'ural', 'https://logos-world.net/wp-content/uploads/2021/11/Ural-Logo.png'),
    ('Ural', 'ural', 'https://www.carlogos.org/logo/Ural-logo-2048x2048.png'),
    
    # Sherco - French trials
    ('Sherco', 'sherco', 'https://logos-world.net/wp-content/uploads/2021/11/Sherco-Logo.png'),
    ('Sherco', 'sherco', 'https://www.carlogos.org/logo/Sherco-logo-2048x2048.png'),
    
    # Jawa - Czech heritage
    ('Jawa', 'jawa', 'https://logos-world.net/wp-content/uploads/2021/11/Jawa-Logo.png'),
    ('Jawa', 'jawa', 'https://www.carlogos.org/logo/Jawa-logo-2048x2048.png'),
]

print("🎯 Getting Final Missing Logos")
print("=" * 40)

success_count = 0
completed_brands = set()

for brand, filename, url in logos_to_try:
    if brand in completed_brands:
        continue
        
    if download_logo(brand, filename, url):
        success_count += 1
        completed_brands.add(brand)
        print()
    else:
        time.sleep(1)  # Try next URL for same brand

print("=" * 40)
print(f"✅ Successfully downloaded: {success_count} new logos")

# Final count
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

print(f"\n📊 Final Collection Status:")
print(f"  Total PNG logos: {total}")
print(f"  High-resolution (512px+): {high_res}")
print(f"  Coverage: {high_res/40*100:.1f}% of priority brands")

if high_res >= 40:
    print("\n🎉 100% COVERAGE ACHIEVED!")
else:
    remaining = 40 - high_res
    print(f"\n📋 Still need {remaining} more logos for 100% coverage")