#!/usr/bin/env python3
"""
Manual Wikipedia logo search with multiple language variants
"""

import urllib.request
import os
import subprocess
import time
import json

def search_wikipedia_logo(brand_name, alt_names=[]):
    """Search Wikipedia for brand logos"""
    all_names = [brand_name] + alt_names
    languages = ['en', 'de', 'fr', 'es', 'it', 'pt', 'ru', 'ja']
    
    found_urls = []
    
    for name in all_names:
        for lang in languages:
            # Try different Wikipedia URL patterns
            patterns = [
                f"https://{lang}.wikipedia.org/wiki/{name.replace(' ', '_')}",
                f"https://{lang}.wikipedia.org/wiki/{name.replace(' ', '_')}_logo",
                f"https://{lang}.wikipedia.org/wiki/{name.replace(' ', '_')}_Logo",
            ]
            
            for pattern in patterns:
                try:
                    print(f"    Checking: {pattern}")
                    req = urllib.request.Request(pattern, headers={
                        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
                    })
                    response = urllib.request.urlopen(req, timeout=10)
                    html = response.read().decode('utf-8', errors='ignore')
                    
                    # Look for logo URLs in the page
                    import re
                    logo_patterns = [
                        r'https://upload\.wikimedia\.org/wikipedia/[^"]*\.svg',
                        r'https://upload\.wikimedia\.org/wikipedia/[^"]*\.png',
                        r'//upload\.wikimedia\.org/wikipedia/[^"]*\.svg',
                        r'//upload\.wikimedia\.org/wikipedia/[^"]*\.png'
                    ]
                    
                    for logo_pattern in logo_patterns:
                        matches = re.findall(logo_pattern, html)
                        for match in matches:
                            if match.startswith('//'):
                                match = 'https:' + match
                            if any(keyword in match.lower() for keyword in ['logo', brand_name.lower().split()[0]]):
                                found_urls.append(match)
                                print(f"      Found: {match}")
                    
                except Exception as e:
                    continue
                
                time.sleep(0.5)  # Be polite
    
    return list(set(found_urls))  # Remove duplicates

def download_and_convert(brand, url, filename_base):
    """Download and convert to PNG if needed"""
    try:
        print(f"  Downloading: {url}")
        req = urllib.request.Request(url, headers={
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            'Accept': 'image/*,*/*;q=0.8'
        })
        response = urllib.request.urlopen(req, timeout=15)
        data = response.read()
        
        if len(data) < 100:
            return False
            
        png_path = f"/Users/kevintong/Documents/Code/bikenode.com/logos/motorcycle-brands/{filename_base}.png"
        if os.path.exists(png_path):
            print(f"    ✓ Already have {filename_base}.png")
            return True
        
        # Handle SVG
        if b'<svg' in data[:1000] or b'<?xml' in data[:200]:
            svg_path = f"/Users/kevintong/Documents/Code/bikenode.com/logos/motorcycle-brands/{filename_base}.svg"
            
            with open(svg_path, 'wb') as f:
                f.write(data)
            
            convert_cmd = [
                'convert', '-background', 'none', '-density', '300',
                svg_path, '-resize', '1024x1024>', png_path
            ]
            
            result = subprocess.run(convert_cmd, capture_output=True)
            if result.returncode == 0:
                dims = subprocess.run(['identify', '-format', '%wx%h', png_path], 
                                    capture_output=True, text=True).stdout
                print(f"    ✅ Success! Converted SVG to PNG ({dims})")
                os.remove(svg_path)
                return True
            else:
                os.remove(svg_path)
                return False
                
        # Handle PNG/JPG
        elif data[:4] == b'\x89PNG' or data[:2] == b'\xff\xd8':
            ext = 'png' if data[:4] == b'\x89PNG' else 'jpg'
            temp_path = f"/Users/kevintong/Documents/Code/bikenode.com/logos/motorcycle-brands/{filename_base}_temp.{ext}"
            
            with open(temp_path, 'wb') as f:
                f.write(data)
            
            result = subprocess.run(['identify', '-format', '%wx%h', temp_path], 
                                  capture_output=True, text=True)
            if result.returncode == 0:
                dims = result.stdout.strip()
                try:
                    width = int(dims.split('x')[0])
                    if width >= 512:
                        if ext == 'jpg':
                            convert_cmd = ['convert', temp_path, png_path]
                            subprocess.run(convert_cmd, capture_output=True)
                            os.remove(temp_path)
                        else:
                            os.rename(temp_path, png_path)
                        print(f"    ✅ Success! Downloaded ({dims})")
                        return True
                    else:
                        print(f"    ❌ Too small ({dims})")
                        os.remove(temp_path)
                        return False
                except:
                    os.remove(temp_path)
                    return False
            else:
                os.remove(temp_path)
                return False
                
    except Exception as e:
        print(f"    ❌ Error: {str(e)}")
        return False

# Brands we still need
missing_brands = {
    'Zero Motorcycles': ['Zero_Motorcycles', 'Zero_Motorcycle', 'Zero'],
    'Bajaj': ['Bajaj_Auto', 'Bajaj_Motors'],
    'GasGas': ['Gas_Gas', 'GasGas_motorcycles'],
    'CFMoto': ['CFMoto', 'CF_Moto'],
    'Ural': ['Ural_motorcycles', 'Ural_Motorcycle'],
    'Sherco': ['Sherco_motorcycles'],
    'Jawa': ['Jawa_motorcycles', 'Jawa_Motors']
}

print("🔍 Deep Wikipedia Search for Missing Logos")
print("=" * 60)
print()

success_count = 0
for brand, alt_names in missing_brands.items():
    print(f"\n🎯 Searching for {brand}:")
    
    # Search Wikipedia pages
    logo_urls = search_wikipedia_logo(brand, alt_names)
    
    if logo_urls:
        print(f"  Found {len(logo_urls)} potential logo URLs")
        
        # Try each URL
        for url in logo_urls[:5]:  # Try top 5
            filename = brand.lower().replace(' ', '_').replace('-', '_')
            if download_and_convert(brand, url, filename):
                success_count += 1
                break
            time.sleep(1)
    else:
        print(f"  ❌ No logo URLs found")

print("\n" + "=" * 60)
print(f"✅ Successfully downloaded: {success_count}/{len(missing_brands)} missing brands")

# Final status
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

if high_res >= 40:
    print("\n🎉 100% COVERAGE ACHIEVED!")
else:
    remaining = 40 - high_res
    print(f"\n📋 Still need {remaining} more logos for 100% coverage")