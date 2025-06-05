#!/usr/bin/env python3
"""
Get final missing motorcycle brand logos
Using specific Wikipedia Commons URLs
"""

import urllib.request
import os
import subprocess

def download_and_verify(brand, url, filename):
    """Download and verify logo"""
    print(f"🔍 {brand}...")
    filepath = f"/Users/kevintong/Documents/Code/bikenode.com/logos/motorcycle-brands/{filename}"
    
    try:
        # Download with headers
        req = urllib.request.Request(url, headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
        response = urllib.request.urlopen(req, timeout=10)
        data = response.read()
        
        # Save temporarily
        temp_path = filepath + '.temp'
        with open(temp_path, 'wb') as f:
            f.write(data)
        
        # Check if it's a valid image
        result = subprocess.run(['file', temp_path], capture_output=True, text=True)
        if 'image data' in result.stdout or 'PNG' in result.stdout or 'JPEG' in result.stdout:
            # Get dimensions
            dims_result = subprocess.run(['identify', '-format', '%wx%h', temp_path], 
                                       capture_output=True, text=True)
            if dims_result.returncode == 0:
                os.rename(temp_path, filepath)
                print(f"  ✅ Success! {dims_result.stdout}")
                return True
        
        # Not valid, clean up
        os.remove(temp_path)
        print(f"  ❌ Not a valid image")
        return False
        
    except Exception as e:
        print(f"  ❌ Failed: {str(e)}")
        return False

# Try specific Wikipedia Commons files with exact URLs
logos_to_get = {
    # Ducati - from Wikipedia file page
    'Ducati': {
        'filename': 'ducati.png',
        'urls': [
            'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Ducati_Corse_logo.svg/640px-Ducati_Corse_logo.svg.png',
            'https://upload.wikimedia.org/wikipedia/commons/thumb/5/56/Ducati_red_logo.svg/640px-Ducati_red_logo.svg.png',
            'https://upload.wikimedia.org/wikipedia/commons/thumb/6/66/Ducati_logo.svg/640px-Ducati_logo.svg.png',
            'https://upload.wikimedia.org/wikipedia/en/thumb/8/8f/Ducati_Corse_logo.svg/640px-Ducati_Corse_logo.svg.png'
        ]
    },
    
    # Norton
    'Norton': {
        'filename': 'norton.png', 
        'urls': [
            'https://upload.wikimedia.org/wikipedia/commons/thumb/9/92/Norton_logo.svg/640px-Norton_logo.svg.png',
            'https://upload.wikimedia.org/wikipedia/en/thumb/c/c1/Norton_logo.svg/640px-Norton_logo.svg.png',
            'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Norton_Motorcycles_logo.svg/640px-Norton_Motorcycles_logo.svg.png'
        ]
    },
    
    # Indian
    'Indian': {
        'filename': 'indian.png',
        'urls': [
            'https://upload.wikimedia.org/wikipedia/commons/thumb/d/de/Indian_Motocycle_Manufacturing_Company.png/640px-Indian_Motocycle_Manufacturing_Company.png',
            'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/Indian_Motorcycle_logo.svg/640px-Indian_Motorcycle_logo.svg.png',
            'https://upload.wikimedia.org/wikipedia/en/thumb/1/11/Indian_Motorcycle_logo.png/640px-Indian_Motorcycle_logo.png'
        ]
    },
    
    # MV Agusta
    'MV Agusta': {
        'filename': 'mv_agusta.png',
        'urls': [
            'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/MV-Agusta-Logo.svg/640px-MV-Agusta-Logo.svg.png',
            'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d1/Mv_agusta_2010_logo.svg/640px-Mv_agusta_2010_logo.svg.png',
            'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fe/MV_Agusta_logo.svg/640px-MV_Agusta_logo.svg.png'
        ]
    },
    
    # Zero Motorcycles
    'Zero Motorcycles': {
        'filename': 'zero.png',
        'urls': [
            'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Zero_Motorcycles_logo.svg/640px-Zero_Motorcycles_logo.svg.png',
            'https://upload.wikimedia.org/wikipedia/commons/thumb/6/60/Zero_Motorcycles_logo.svg/640px-Zero_Motorcycles_logo.svg.png',
            'https://upload.wikimedia.org/wikipedia/en/thumb/9/98/Zero_Motorcycles_logo.png/640px-Zero_Motorcycles_logo.png'
        ]
    },
    
    # Also try some we might have missed
    'Bimota': {
        'filename': 'bimota.png',
        'urls': [
            'https://upload.wikimedia.org/wikipedia/commons/thumb/b/be/Logo_della_Bimota.svg/640px-Logo_della_Bimota.svg.png',
            'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Bimota_logo.svg/640px-Bimota_logo.svg.png'
        ]
    },
    
    'Cagiva': {
        'filename': 'cagiva.png',
        'urls': [
            'https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Cagiva_logo.svg/640px-Cagiva_logo.svg.png',
            'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b3/Cagiva-logo.png/640px-Cagiva-logo.png'
        ]
    },
    
    'Sherco': {
        'filename': 'sherco.png',
        'urls': [
            'https://upload.wikimedia.org/wikipedia/commons/thumb/8/83/Sherco_logo.svg/640px-Sherco_logo.svg.png',
            'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fd/Sherco.png/640px-Sherco.png'
        ]
    },
    
    'Jawa': {
        'filename': 'jawa.png',
        'urls': [
            'https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/Logo_JAWA.svg/640px-Logo_JAWA.svg.png',
            'https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/Jawa_Moto.svg/640px-Jawa_Moto.svg.png'
        ]
    }
}

print("🏍️  Getting Final Missing Motorcycle Logos")
print("=" * 50)

success_count = 0
for brand, data in logos_to_get.items():
    # Try each URL until one works
    for url in data['urls']:
        if download_and_verify(brand, url, data['filename']):
            success_count += 1
            break

print("\n" + "=" * 50)
print(f"✅ Successfully downloaded: {success_count}/{len(logos_to_get)}")

# Count final totals
logo_dir = "/Users/kevintong/Documents/Code/bikenode.com/logos/motorcycle-brands"
total_logos = len([f for f in os.listdir(logo_dir) if f.endswith('.png')])
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
print(f"  Total logos: {total_logos}")
print(f"  High-resolution (512px+): {high_res}")
print(f"  Coverage: {high_res/40*100:.1f}% of priority brands")