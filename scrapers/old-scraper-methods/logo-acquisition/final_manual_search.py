#!/usr/bin/env python3
"""
Final manual search for the last 4 logos using multiple strategies
"""

import urllib.request
import os
import subprocess
import json
import time

def try_download(brand, filename, url):
    """Try to download and validate a logo"""
    try:
        print(f"    Trying: {url}")
        req = urllib.request.Request(url, headers={
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        })
        response = urllib.request.urlopen(req, timeout=15)
        data = response.read()
        
        if len(data) < 200:
            return False
        
        temp_path = f"/Users/kevintong/Documents/Code/bikenode.com/logos/motorcycle-brands/{filename}_temp"
        with open(temp_path, 'wb') as f:
            f.write(data)
        
        # Check if it's an image
        result = subprocess.run(['file', temp_path], capture_output=True, text=True)
        if 'image' not in result.stdout.lower():
            os.remove(temp_path)
            return False
        
        # Get dimensions
        dims_result = subprocess.run(['identify', '-format', '%wx%h', temp_path], 
                                   capture_output=True, text=True)
        if dims_result.returncode != 0:
            os.remove(temp_path)
            return False
        
        dims = dims_result.stdout.strip()
        try:
            width = int(dims.split('x')[0])
            if width < 512:
                os.remove(temp_path)
                print(f"      ❌ Too small ({dims})")
                return False
        except:
            os.remove(temp_path)
            return False
        
        # Convert to PNG
        png_path = f"/Users/kevintong/Documents/Code/bikenode.com/logos/motorcycle-brands/{filename}.png"
        if 'PNG' in result.stdout:
            os.rename(temp_path, png_path)
        else:
            convert_result = subprocess.run(['convert', temp_path, png_path], capture_output=True)
            os.remove(temp_path)
            if convert_result.returncode != 0:
                return False
        
        print(f"      ✅ SUCCESS! ({dims})")
        return True
        
    except Exception as e:
        print(f"      ❌ Error: {str(e)}")
        return False

# Comprehensive URL list for the final 4 brands
final_four = {
    'Bajaj': {
        'filename': 'bajaj',
        'urls': [
            'https://upload.wikimedia.org/wikipedia/commons/f/f4/Bajaj_Auto_logo.png',
            'https://logos-download.com/wp-content/uploads/2016/09/Bajaj_logo.png',
            'https://companieslogo.com/img/orig/BJAUT.NS_BIG-a32cd2e3.png',
            'https://static.seekingalpha.com/uploads/2018/4/26/saupload_bajaj-auto-logo.png',
            'https://www.carlogos.org/logo/Bajaj-logo-1920x1080.png',
            'https://1000logos.net/wp-content/uploads/2021/07/Bajaj-Logo.png',
        ]
    },
    'CFMoto': {
        'filename': 'cfmoto', 
        'urls': [
            'https://upload.wikimedia.org/wikipedia/commons/8/8c/CFMoto_logo.png',
            'https://logos-download.com/wp-content/uploads/2019/01/CFMoto_logo.png',
            'https://www.carlogos.org/logo/CFMoto-logo-1920x1080.png',
            'https://1000logos.net/wp-content/uploads/2021/07/CFMoto-Logo.png',
            'https://companieslogo.com/img/orig/cfmoto.png',
        ]
    },
    'Ural': {
        'filename': 'ural',
        'urls': [
            'https://upload.wikimedia.org/wikipedia/commons/5/57/Ural_logo.png',
            'https://logos-download.com/wp-content/uploads/2019/01/Ural_logo.png', 
            'https://www.carlogos.org/logo/Ural-logo-1920x1080.png',
            'https://1000logos.net/wp-content/uploads/2021/07/Ural-Logo.png',
            'https://companieslogo.com/img/orig/ural.png',
        ]
    },
    'Jawa': {
        'filename': 'jawa',
        'urls': [
            'https://upload.wikimedia.org/wikipedia/commons/4/44/Jawa_logo.png',
            'https://logos-download.com/wp-content/uploads/2019/01/Jawa_logo.png',
            'https://www.carlogos.org/logo/Jawa-logo-1920x1080.png', 
            'https://1000logos.net/wp-content/uploads/2021/07/Jawa-Logo.png',
            'https://companieslogo.com/img/orig/jawa.png',
        ]
    }
}

print("🎯 FINAL PUSH: Getting Last 4 Logos")
print("=" * 50)

success_count = 0

for brand, info in final_four.items():
    print(f"\n🔍 {brand}:")
    
    # Check if we already have it
    existing_path = f"/Users/kevintong/Documents/Code/bikenode.com/logos/motorcycle-brands/{info['filename']}.png"
    if os.path.exists(existing_path):
        print(f"  ✓ Already have {info['filename']}.png")
        success_count += 1
        continue
    
    # Try each URL
    found = False
    for url in info['urls']:
        if try_download(brand, info['filename'], url):
            success_count += 1
            found = True
            break
        time.sleep(1)
    
    if not found:
        print(f"  ❌ Could not find valid logo for {brand}")

print("\n" + "=" * 50)
print(f"✅ Successfully found: {success_count}/4 final logos")

# Final status check
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

print(f"\n📊 FINAL COLLECTION STATUS:")
print(f"  Total PNG logos: {total}")
print(f"  High-resolution (512px+): {high_res}")
print(f"  Coverage: {high_res/40*100:.1f}% of priority brands")

if high_res >= 40:
    print("\n🎉🎉🎉 100% COVERAGE ACHIEVED! 🎉🎉🎉")
    print("🏆 MOTORCYCLE LOGO MISSION COMPLETE!")
else:
    remaining = 40 - high_res
    print(f"\n📋 Just {remaining} more logos needed for 100% coverage")