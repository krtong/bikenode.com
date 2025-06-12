#!/usr/bin/env python3
"""
Get SVG Logos from Wikimedia Commons
SVG files are infinitely scalable and perfect for logos
"""

import urllib.request
import os
import subprocess
import time

def download_svg(brand, url, filename):
    """Download SVG file and convert to high-res PNG"""
    svg_path = f"/Users/kevintong/Documents/Code/bikenode.com/logos/motorcycle-brands/{filename}.svg"
    png_path = f"/Users/kevintong/Documents/Code/bikenode.com/logos/motorcycle-brands/{filename}.png"
    
    try:
        print(f"  Downloading SVG: {url}")
        req = urllib.request.Request(url, headers={
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        })
        
        response = urllib.request.urlopen(req, timeout=10)
        data = response.read()
        
        # Check if it's SVG
        if b'<svg' in data[:1000] or b'<?xml' in data[:100]:
            # Save SVG
            with open(svg_path, 'wb') as f:
                f.write(data)
            print(f"    ✅ SVG downloaded successfully")
            
            # Convert to high-res PNG (2048px)
            print(f"    Converting to 2048px PNG...")
            convert_cmd = [
                'convert', 
                '-background', 'none',
                '-density', '300',
                svg_path,
                '-resize', '2048x2048>',
                png_path
            ]
            
            result = subprocess.run(convert_cmd, capture_output=True)
            if result.returncode == 0:
                # Check resulting PNG
                dims_result = subprocess.run(['identify', '-format', '%wx%h', png_path], 
                                           capture_output=True, text=True)
                if dims_result.returncode == 0:
                    print(f"    ✅ Converted to PNG: {dims_result.stdout}")
                    # Keep SVG as backup
                    svg_backup = svg_path.replace('.svg', '_original.svg')
                    os.rename(svg_path, svg_backup)
                    return True
            else:
                print(f"    ❌ Conversion failed: {result.stderr.decode()}")
                os.remove(svg_path)
        else:
            print(f"    ❌ Not a valid SVG file")
            
    except Exception as e:
        print(f"    ❌ Error: {str(e)}")
    
    return False

# Priority brands with direct SVG URLs from Wikimedia Commons
svg_logos = {
    'Ducati': [
        ('ducati', 'https://upload.wikimedia.org/wikipedia/commons/6/66/Ducati_logo.svg'),
        ('ducati', 'https://upload.wikimedia.org/wikipedia/commons/8/8e/Ducati_Corse_logo.svg'),
        ('ducati', 'https://upload.wikimedia.org/wikipedia/commons/5/56/Ducati_red_logo.svg'),
    ],
    
    'Norton': [
        ('norton', 'https://upload.wikimedia.org/wikipedia/commons/9/92/Norton_logo.svg'),
        ('norton', 'https://upload.wikimedia.org/wikipedia/commons/8/8a/Norton_Motorcycles_logo.svg'),
    ],
    
    'Indian': [
        ('indian', 'https://upload.wikimedia.org/wikipedia/commons/b/b9/Indian_Motorcycle_logo.svg'),
        ('indian', 'https://upload.wikimedia.org/wikipedia/commons/8/82/Indian_Motorcycle_logo.svg'),
    ],
    
    'Zero Motorcycles': [
        ('zero', 'https://upload.wikimedia.org/wikipedia/commons/8/8e/Zero_Motorcycles_logo.svg'),
        ('zero', 'https://upload.wikimedia.org/wikipedia/commons/6/60/Zero_Motorcycles_logo.svg'),
    ],
    
    'Bimota': [
        ('bimota', 'https://upload.wikimedia.org/wikipedia/commons/b/be/Logo_della_Bimota.svg'),
        ('bimota', 'https://upload.wikimedia.org/wikipedia/commons/5/5e/Bimota_logo.svg'),
    ],
    
    'Cagiva': [
        ('cagiva', 'https://upload.wikimedia.org/wikipedia/commons/4/44/Cagiva_logo.svg'),
        ('cagiva', 'https://upload.wikimedia.org/wikipedia/commons/a/a6/Cagiva_logo.svg'),
    ],
    
    'Sherco': [
        ('sherco', 'https://upload.wikimedia.org/wikipedia/commons/8/83/Sherco_logo.svg'),
        ('sherco', 'https://upload.wikimedia.org/wikipedia/commons/1/16/Sherco_logo.svg'),
    ],
    
    'Jawa': [
        ('jawa', 'https://upload.wikimedia.org/wikipedia/commons/5/53/Logo_JAWA.svg'),
        ('jawa', 'https://upload.wikimedia.org/wikipedia/commons/6/69/Jawa_Moto.svg'),
    ],
    
    'GasGas': [
        ('gasgas', 'https://upload.wikimedia.org/wikipedia/commons/6/66/GasGas-logo.svg'),
        ('gasgas', 'https://upload.wikimedia.org/wikipedia/commons/4/49/Gas_Gas_logo.svg'),
    ],
    
    'Bajaj': [
        ('bajaj', 'https://upload.wikimedia.org/wikipedia/commons/9/96/Bajaj_logo.svg'),
        ('bajaj', 'https://upload.wikimedia.org/wikipedia/commons/2/20/Bajaj_Auto_Logo.svg'),
    ],
    
    'Hero': [
        ('hero', 'https://upload.wikimedia.org/wikipedia/commons/1/14/Hero_MotoCorp_Logo.svg'),
        ('hero', 'https://upload.wikimedia.org/wikipedia/commons/e/e8/Hero_MotoCorp_Logo.svg'),
    ],
    
    'TVS': [
        ('tvs', 'https://upload.wikimedia.org/wikipedia/commons/1/1e/TVS_logo.svg'),
        ('tvs', 'https://upload.wikimedia.org/wikipedia/commons/8/81/TVS_Motor_Company_Logo.svg'),
    ],
    
    'Polaris': [
        ('polaris', 'https://upload.wikimedia.org/wikipedia/commons/7/70/Polaris_Industries_logo.svg'),
        ('polaris', 'https://upload.wikimedia.org/wikipedia/commons/5/57/Polaris_Inc._logo.svg'),
    ],
    
    'Can-Am': [
        ('can_am', 'https://upload.wikimedia.org/wikipedia/commons/3/3d/Can-Am_logo.svg'),
        ('can_am', 'https://upload.wikimedia.org/wikipedia/commons/8/82/Can-Am_logo.svg'),
    ],
    
    'Ural': [
        ('ural', 'https://upload.wikimedia.org/wikipedia/commons/4/4f/URAL_logo.svg'),
    ],
    
    'Buell': [
        ('buell', 'https://upload.wikimedia.org/wikipedia/commons/f/f8/Logo_Buell.svg'),
        ('buell', 'https://upload.wikimedia.org/wikipedia/commons/a/ae/Buell_logo.svg'),
    ],
    
    'BSA': [
        ('bsa', 'https://upload.wikimedia.org/wikipedia/commons/4/4f/Birmingham_Small_Arms_Company_logo.svg'),
        ('bsa', 'https://upload.wikimedia.org/wikipedia/commons/2/2d/BSA_motorcycles_logo.svg'),
    ],
    
    'Victory': [
        ('victory', 'https://upload.wikimedia.org/wikipedia/commons/d/d0/Victory_Motorcycles_logo.svg'),
        ('victory', 'https://upload.wikimedia.org/wikipedia/commons/9/90/Victory-motorcycles-vector-logo.svg'),
    ]
}

print("🏍️ Downloading SVG Logos from Wikimedia Commons")
print("=" * 50)
print("\nSVG files are infinitely scalable - perfect for logos!\n")

# Check if ImageMagick is installed
convert_check = subprocess.run(['which', 'convert'], capture_output=True)
if convert_check.returncode != 0:
    print("⚠️  ImageMagick not found. Installing...")
    subprocess.run(['brew', 'install', 'imagemagick'])

success_count = 0
for brand, urls in svg_logos.items():
    print(f"\n🔍 {brand}:")
    
    # Check if PNG already exists
    png_exists = False
    for filename, _ in urls:
        if os.path.exists(f"/Users/kevintong/Documents/Code/bikenode.com/logos/motorcycle-brands/{filename}.png"):
            dims_result = subprocess.run(
                ['identify', '-format', '%wx%h', 
                 f"/Users/kevintong/Documents/Code/bikenode.com/logos/motorcycle-brands/{filename}.png"],
                capture_output=True, text=True
            )
            if dims_result.returncode == 0:
                print(f"  ✓ Already have PNG ({dims_result.stdout})")
                png_exists = True
                success_count += 1
                break
    
    if png_exists:
        continue
    
    # Try each SVG URL
    downloaded = False
    for filename, url in urls:
        if download_svg(brand, url, filename):
            success_count += 1
            downloaded = True
            break
        time.sleep(0.5)
    
    if not downloaded:
        print(f"  ❌ All SVG attempts failed")

print("\n" + "=" * 50)
print(f"✅ Successfully processed: {success_count}/{len(svg_logos)} brands")

# Final count
logo_dir = "/Users/kevintong/Documents/Code/bikenode.com/logos/motorcycle-brands"
total_png = len([f for f in os.listdir(logo_dir) if f.endswith('.png')])
total_svg = len([f for f in os.listdir(logo_dir) if f.endswith('.svg')])
high_res = sum(1 for f in os.listdir(logo_dir) 
               if f.endswith('.png') and 
               int(subprocess.run(['identify', '-format', '%w', os.path.join(logo_dir, f)], 
                                capture_output=True, text=True).stdout or '0') >= 512)

print(f"\n📊 Collection Status:")
print(f"  Total PNG logos: {total_png}")
print(f"  Total SVG files: {total_svg}")
print(f"  High-resolution (512px+): {high_res}")
print(f"  Coverage: {high_res/40*100:.1f}% of priority brands")