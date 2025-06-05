#!/usr/bin/env python3
"""
Get Priority Motorcycle Logos
Try multiple approaches and sources
"""

import urllib.request
import urllib.parse
import os
import subprocess
import time

def test_url(url):
    """Quick test if URL is accessible"""
    try:
        req = urllib.request.Request(url, headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
        response = urllib.request.urlopen(req, timeout=5)
        return response.getcode() == 200
    except:
        return False

def download_and_verify(brand, url, filename):
    """Download and verify it's a valid image"""
    output_path = f"/Users/kevintong/Documents/Code/bikenode.com/logos/motorcycle-brands/{filename}"
    
    try:
        print(f"  Trying: {url}")
        req = urllib.request.Request(url, headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Referer': 'https://www.google.com/'
        })
        
        response = urllib.request.urlopen(req, timeout=10)
        data = response.read()
        
        # Check if it's likely an image
        if len(data) < 1000:  # Too small
            print(f"    ❌ File too small ({len(data)} bytes)")
            return False
            
        # Save temporarily
        temp_path = output_path + '.temp'
        with open(temp_path, 'wb') as f:
            f.write(data)
        
        # Verify it's an image
        result = subprocess.run(['file', temp_path], capture_output=True, text=True)
        if 'image' in result.stdout.lower() or 'PNG' in result.stdout or 'JPEG' in result.stdout:
            # Get dimensions
            dims_result = subprocess.run(['identify', '-format', '%wx%h', temp_path], 
                                       capture_output=True, text=True)
            if dims_result.returncode == 0:
                os.rename(temp_path, output_path)
                print(f"    ✅ Success! {dims_result.stdout}")
                return True
        
        os.remove(temp_path)
        print(f"    ❌ Not a valid image")
        return False
        
    except Exception as e:
        print(f"    ❌ Error: {str(e)}")
        if os.path.exists(temp_path):
            os.remove(temp_path)
        return False

# Priority brands with multiple URL attempts
priority_brands = {
    'Ducati': {
        'filename': 'ducati.png',
        'urls': [
            # Try Wikimedia with different paths
            'https://upload.wikimedia.org/wikipedia/commons/6/66/Ducati_logo.svg',
            'https://upload.wikimedia.org/wikipedia/commons/thumb/6/66/Ducati_logo.svg/500px-Ducati_logo.svg.png',
            'https://upload.wikimedia.org/wikipedia/commons/8/8e/Ducati_Corse_logo.svg',
            'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Ducati_Corse_logo.svg/500px-Ducati_Corse_logo.svg.png',
            'https://upload.wikimedia.org/wikipedia/commons/5/56/Ducati_red_logo.svg',
            # Try other sources
            'https://www.carlogos.org/motorcycle-logos/ducati-logo-2000x1500.png',
            'https://www.pngmart.com/files/22/Ducati-Logo-PNG-Isolated-Pic.png',
        ]
    },
    
    'Norton': {
        'filename': 'norton.png',
        'urls': [
            'https://upload.wikimedia.org/wikipedia/commons/9/92/Norton_logo.svg',
            'https://upload.wikimedia.org/wikipedia/commons/thumb/9/92/Norton_logo.svg/500px-Norton_logo.svg.png',
            'https://upload.wikimedia.org/wikipedia/commons/8/8a/Norton_Motorcycles_logo.svg',
            'https://www.carlogos.org/motorcycle-logos/norton-logo-2000x2400.png',
        ]
    },
    
    'Indian': {
        'filename': 'indian.png',
        'urls': [
            'https://upload.wikimedia.org/wikipedia/commons/d/de/Indian_Motocycle_Manufacturing_Company.png',
            'https://upload.wikimedia.org/wikipedia/commons/b/b9/Indian_Motorcycle_logo.svg',
            'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/Indian_Motorcycle_logo.svg/500px-Indian_Motorcycle_logo.svg.png',
            'https://www.carlogos.org/motorcycle-logos/indian-logo-2400x2400.png',
        ]
    },
    
    'MV Agusta': {
        'filename': 'mv_agusta.png',
        'urls': [
            'https://upload.wikimedia.org/wikipedia/commons/a/ab/MV-Agusta-Logo.svg',
            'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/MV-Agusta-Logo.svg/500px-MV-Agusta-Logo.svg.png',
            'https://upload.wikimedia.org/wikipedia/commons/d/d1/Mv_agusta_2010_logo.svg',
            'https://www.carlogos.org/motorcycle-logos/mv-agusta-logo-2000x2400.png',
        ]
    },
    
    'Zero': {
        'filename': 'zero.png',
        'urls': [
            'https://upload.wikimedia.org/wikipedia/commons/8/8e/Zero_Motorcycles_logo.svg',
            'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Zero_Motorcycles_logo.svg/500px-Zero_Motorcycles_logo.svg.png',
            'https://upload.wikimedia.org/wikipedia/commons/6/60/Zero_Motorcycles_logo.svg',
            'https://www.carlogos.org/motorcycle-logos/zero-motorcycles-logo.png',
        ]
    },
    
    # Additional brands
    'Bimota': {
        'filename': 'bimota.png',
        'urls': [
            'https://upload.wikimedia.org/wikipedia/commons/b/be/Logo_della_Bimota.svg',
            'https://upload.wikimedia.org/wikipedia/commons/5/5e/Bimota_logo.svg',
            'https://www.carlogos.org/motorcycle-logos/bimota-logo.png',
        ]
    },
    
    'Can-Am': {
        'filename': 'can_am.png',
        'urls': [
            'https://upload.wikimedia.org/wikipedia/en/e/e7/Can-Am_Logo.png',
            'https://upload.wikimedia.org/wikipedia/commons/3/3d/Can-Am_logo.svg',
            'https://www.carlogos.org/motorcycle-logos/can-am-logo.png',
        ]
    },
    
    'Bajaj': {
        'filename': 'bajaj.png',
        'urls': [
            'https://upload.wikimedia.org/wikipedia/commons/9/96/Bajaj_logo.svg',
            'https://upload.wikimedia.org/wikipedia/commons/thumb/9/96/Bajaj_logo.svg/500px-Bajaj_logo.svg.png',
            'https://upload.wikimedia.org/wikipedia/commons/2/20/Bajaj_Auto_Logo.svg',
        ]
    },
    
    'Hero': {
        'filename': 'hero.png',
        'urls': [
            'https://upload.wikimedia.org/wikipedia/commons/1/14/Hero_MotoCorp_Logo.svg',
            'https://upload.wikimedia.org/wikipedia/commons/thumb/1/14/Hero_MotoCorp_Logo.svg/500px-Hero_MotoCorp_Logo.svg.png',
            'https://upload.wikimedia.org/wikipedia/commons/e/e8/Hero_MotoCorp_Logo.svg',
        ]
    },
    
    'TVS': {
        'filename': 'tvs.png',
        'urls': [
            'https://upload.wikimedia.org/wikipedia/commons/1/1e/TVS_logo.svg',
            'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/TVS_logo.svg/500px-TVS_logo.svg.png',
            'https://upload.wikimedia.org/wikipedia/commons/8/81/TVS_Motor_Company_Logo.svg',
        ]
    }
}

print("🏍️  Getting Priority Motorcycle Logos")
print("=" * 50)
print()

# First, test which domains are accessible
print("Testing URL accessibility...")
test_domains = [
    'https://upload.wikimedia.org/wikipedia/commons/4/4c/Wikisource-logo.svg',
    'https://www.carlogos.org/favicon.ico',
]

for domain in test_domains:
    if test_url(domain):
        print(f"  ✅ {domain.split('/')[2]} is accessible")
    else:
        print(f"  ❌ {domain.split('/')[2]} is blocked")

print("\nDownloading logos...")
print("-" * 50)

success_count = 0
for brand, info in priority_brands.items():
    print(f"\n🔍 {brand}:")
    
    # Check if already exists
    if os.path.exists(f"/Users/kevintong/Documents/Code/bikenode.com/logos/motorcycle-brands/{info['filename']}"):
        print(f"  ✓ Already exists")
        success_count += 1
        continue
    
    # Try each URL
    downloaded = False
    for url in info['urls']:
        if download_and_verify(brand, url, info['filename']):
            success_count += 1
            downloaded = True
            break
        time.sleep(0.5)  # Be polite
    
    if not downloaded:
        print(f"  ❌ All attempts failed")

print("\n" + "=" * 50)
print(f"✅ Successfully downloaded: {success_count}/{len(priority_brands)}")

# Final count
logo_dir = "/Users/kevintong/Documents/Code/bikenode.com/logos/motorcycle-brands"
total = len([f for f in os.listdir(logo_dir) if f.endswith('.png')])
print(f"📊 Total logos in collection: {total}")