#!/usr/bin/env python3
"""
Upgrade existing logos to higher resolution
Replace 250px versions with 800px+ versions
"""

import urllib.request
import os
import subprocess

def upgrade_logo(brand, current_file, high_res_url):
    """Download high-res version if available"""
    print(f"🔄 Upgrading {brand}...")
    
    try:
        req = urllib.request.Request(high_res_url, headers={
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        })
        response = urllib.request.urlopen(req, timeout=10)
        data = response.read()
        
        if len(data) > 5000:  # Larger than 5KB
            # Backup current version
            backup_path = f"/Users/kevintong/Documents/Code/bikenode.com/logos/motorcycle-brands/{current_file}.backup"
            current_path = f"/Users/kevintong/Documents/Code/bikenode.com/logos/motorcycle-brands/{current_file}"
            
            if os.path.exists(current_path):
                os.rename(current_path, backup_path)
            
            # Save high-res version
            with open(current_path, 'wb') as f:
                f.write(data)
            
            # Check dimensions
            result = subprocess.run(['identify', '-format', '%wx%h', current_path], 
                                 capture_output=True, text=True)
            if result.returncode == 0:
                dims = result.stdout.strip()
                print(f"  ✅ Success! {dims}")
                return True
            else:
                print(f"  ❌ Invalid image, restoring backup")
                os.rename(backup_path, current_path)
                return False
        else:
            print(f"  ❌ File too small")
            return False
            
    except Exception as e:
        print(f"  ❌ Failed: {e}")
        return False

# High-resolution URLs for brands we have
upgrades = {
    'Kawasaki': {
        'file': 'kawasaki.png',
        'urls': [
            'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f9/Kawasaki_Heavy_Industries_Logo.svg/800px-Kawasaki_Heavy_Industries_Logo.svg.png',
            'https://upload.wikimedia.org/wikipedia/commons/f/f9/Kawasaki_Heavy_Industries_Logo.svg'
        ]
    },
    'KTM': {
        'file': 'ktm.png',
        'urls': [
            'https://upload.wikimedia.org/wikipedia/commons/thumb/7/76/KTM_Logo-RGB_2C_onWhite_Vertical.jpg/800px-KTM_Logo-RGB_2C_onWhite_Vertical.jpg',
            'https://upload.wikimedia.org/wikipedia/commons/7/76/KTM_Logo-RGB_2C_onWhite_Vertical.jpg'
        ]
    },
    'Triumph': {
        'file': 'triumph.png',
        'urls': [
            'https://upload.wikimedia.org/wikipedia/en/thumb/0/01/Triumph_logotype.png/800px-Triumph_logotype.png',
            'https://upload.wikimedia.org/wikipedia/en/0/01/Triumph_logotype.png'
        ]
    },
    'Aprilia': {
        'file': 'aprilia.png',
        'urls': [
            'https://upload.wikimedia.org/wikipedia/commons/thumb/9/99/Aprilia-logo.svg/800px-Aprilia-logo.svg.png',
            'https://upload.wikimedia.org/wikipedia/commons/9/99/Aprilia-logo.svg'
        ]
    },
    'Moto Guzzi': {
        'file': 'moto_guzzi.png',
        'urls': [
            'https://upload.wikimedia.org/wikipedia/en/thumb/7/77/Moto-Guzzi-Logo-2016.svg/800px-Moto-Guzzi-Logo-2016.svg.png',
            'https://upload.wikimedia.org/wikipedia/en/7/77/Moto-Guzzi-Logo-2016.svg'
        ]
    },
    'Royal Enfield': {
        'file': 'royal_enfield.png',
        'urls': [
            'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Royal_Enfield_logo.svg/800px-Royal_Enfield_logo.svg.png',
            'https://upload.wikimedia.org/wikipedia/commons/8/8f/Royal_Enfield_logo.svg'
        ]
    },
    'Vespa': {
        'file': 'vespa.png',
        'urls': [
            'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/Vespa-logo.svg/800px-Vespa-logo.svg.png',
            'https://upload.wikimedia.org/wikipedia/commons/a/a0/Vespa-logo.svg'
        ]
    },
    'Piaggio': {
        'file': 'piaggio.png',
        'urls': [
            'https://upload.wikimedia.org/wikipedia/commons/thumb/9/98/Piaggio_Group_logo.svg/800px-Piaggio_Group_logo.svg.png',
            'https://upload.wikimedia.org/wikipedia/commons/9/98/Piaggio_Group_logo.svg'
        ]
    },
    'Husqvarna': {
        'file': 'husqvarna.png',
        'urls': [
            'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6c/Husqvarna_Logo.png/800px-Husqvarna_Logo.png',
            'https://upload.wikimedia.org/wikipedia/commons/6/6c/Husqvarna_Logo.png'
        ]
    },
    'Beta': {
        'file': 'beta.png',
        'urls': [
            'https://upload.wikimedia.org/wikipedia/commons/thumb/5/54/BetaMotor_logo.png/800px-BetaMotor_logo.png',
            'https://upload.wikimedia.org/wikipedia/commons/5/54/BetaMotor_logo.png'
        ]
    }
}

print("🚀 Upgrading logos to high resolution...")
print("=" * 50)

success_count = 0
for brand, data in upgrades.items():
    for url in data['urls']:
        if upgrade_logo(brand, data['file'], url):
            success_count += 1
            break

print(f"\n✅ Upgraded {success_count}/{len(upgrades)} logos to high resolution!")

# Show final counts
logo_dir = "/Users/kevintong/Documents/Code/bikenode.com/logos/motorcycle-brands"
png_files = [f for f in os.listdir(logo_dir) if f.endswith('.png') and not f.endswith('.backup')]
print(f"📊 Total active logos: {len(png_files)}")

# Show high-res logos
print("\n🎯 High-resolution logos (>= 512px):")
for filename in sorted(png_files):
    filepath = os.path.join(logo_dir, filename)
    result = subprocess.run(['identify', '-format', '%wx%h', filepath], 
                          capture_output=True, text=True)
    if result.returncode == 0:
        dims = result.stdout.strip()
        try:
            width, height = map(int, dims.split('x'))
            min_size = min(width, height)
            if min_size >= 512:
                print(f"  ✅ {filename}: {dims}")
            elif min_size >= 250:
                print(f"  🟡 {filename}: {dims}")
        except:
            pass