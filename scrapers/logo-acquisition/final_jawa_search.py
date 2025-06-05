#!/usr/bin/env python3
"""
Final comprehensive search for Jawa logo
"""

import urllib.request
import os
import subprocess
import time

def try_download(url, filename):
    """Try to download and validate a logo"""
    try:
        print(f"  Trying: {url}")
        req = urllib.request.Request(url, headers={
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'image/*,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9'
        })
        response = urllib.request.urlopen(req, timeout=10)
        data = response.read()
        
        if len(data) < 200:
            print(f"    ❌ File too small ({len(data)} bytes)")
            return False
        
        temp_path = f"/Users/kevintong/Documents/Code/bikenode.com/logos/motorcycle-brands/{filename}_temp"
        with open(temp_path, 'wb') as f:
            f.write(data)
        
        # Check if it's an image
        result = subprocess.run(['file', temp_path], capture_output=True, text=True)
        if 'image' not in result.stdout.lower():
            print(f"    ❌ Not an image: {result.stdout}")
            os.remove(temp_path)
            return False
        
        # Get dimensions
        dims_result = subprocess.run(['identify', '-format', '%wx%h', temp_path], 
                                   capture_output=True, text=True)
        if dims_result.returncode != 0:
            print(f"    ❌ Can't identify dimensions")
            os.remove(temp_path)
            return False
        
        dims = dims_result.stdout.strip()
        try:
            width = int(dims.split('x')[0])
            if width < 400:  # Lower threshold for final attempt
                print(f"    ❌ Too small ({dims})")
                os.remove(temp_path)
                return False
        except:
            print(f"    ❌ Invalid dimensions: {dims}")
            os.remove(temp_path)
            return False
        
        # Convert to PNG if needed
        png_path = f"/Users/kevintong/Documents/Code/bikenode.com/logos/motorcycle-brands/{filename}.png"
        if 'PNG' in result.stdout:
            os.rename(temp_path, png_path)
        else:
            convert_result = subprocess.run(['magick', 'convert', temp_path, png_path], capture_output=True)
            os.remove(temp_path)
            if convert_result.returncode != 0:
                print(f"    ❌ Conversion failed")
                return False
        
        print(f"    ✅ SUCCESS! ({dims})")
        return True
        
    except Exception as e:
        print(f"    ❌ Error: {str(e)}")
        return False

# Comprehensive list of Jawa logo URLs
jawa_urls = [
    # Vector sites
    'https://worldvectorlogo.com/downloaded/jawa',
    'https://seeklogo.com/images/J/jawa-logo-7E5E5D1E7A-seeklogo.com.png',
    'https://logoeps.com/wp-content/uploads/2013/03/jawa-vector-logo.png',
    'https://www.carlogos.org/car-logos/jawa-logo.png',
    'https://logos-world.net/wp-content/uploads/2020/12/Jawa-Logo.png',
    'https://1000logos.net/wp-content/uploads/2020/08/Jawa-Logo.png',
    
    # Wikipedia alternatives
    'https://upload.wikimedia.org/wikipedia/commons/4/4a/Jawa_Motorcycles_logo.png',
    'https://upload.wikimedia.org/wikipedia/en/thumb/7/70/Jawa-logo.gif/300px-Jawa-logo.gif',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Jawa_logo.svg/512px-Jawa_logo.svg.png',
    
    # Brand and dealer sites
    'https://www.jawamotorcycles.com/images/jawa-logo.png',
    'https://jawa.in/assets/images/logo.png',
    'https://jawa.in/logo.png',
    'https://classic-legends.com/jawa/logo.png',
    
    # Logo databases
    'https://logo.clearbit.com/jawa.in',
    'https://img.favpng.com/25/7/23/jawa-motorcycles-logo-png-favpng.jpg',
    'https://logovinayak.com/wp-content/uploads/2020/05/Jawa-Logo-PNG-Vector.png',
    
    # Motorcycle sites
    'https://www.motorcyclespecs.co.za/logos/jawa.png',
    'https://motorcycle-logos.com/jawa-logo.png',
    'https://bikez.com/pictures/jawa/logo.gif',
]

print("🎯 FINAL COMPREHENSIVE JAWA LOGO SEARCH")
print("=" * 60)

for i, url in enumerate(jawa_urls, 1):
    print(f"\n{i}/{len(jawa_urls)}. Searching...")
    if try_download(url, 'jawa'):
        print(f"\n✅ SUCCESS! Found Jawa logo from source {i}")
        break
    time.sleep(0.5)

else:
    print(f"\n❌ Could not find valid Jawa logo from {len(jawa_urls)} sources")

# Final check
logo_path = "/Users/kevintong/Documents/Code/bikenode.com/logos/motorcycle-brands/jawa.png"
if os.path.exists(logo_path):
    result = subprocess.run(['identify', '-format', '%wx%h', logo_path], 
                          capture_output=True, text=True)
    if result.returncode == 0:
        dims = result.stdout.strip()
        print(f"\n🎉 FINAL JAWA LOGO: {dims}")
        
        # Check if we now have 100%
        logo_dir = "/Users/kevintong/Documents/Code/bikenode.com/logos/motorcycle-brands"
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
        
        coverage = high_res / 40 * 100
        print(f"\n📊 FINAL STATUS:")
        print(f"  High-resolution logos: {high_res}/40")
        print(f"  Coverage: {coverage:.1f}%")
        
        if coverage >= 100:
            print(f"\n🎉🎉🎉 100% COVERAGE ACHIEVED! 🎉🎉🎉")
            print(f"🏆 MOTORCYCLE LOGO MISSION COMPLETE!")
        else:
            print(f"\n📋 Almost there! {40-high_res} more needed for 100%")
else:
    print(f"\n❌ Jawa logo still not found")