#!/usr/bin/env python3
"""
Try additional sources for the missing 6 brands
"""

import urllib.request
import os
import subprocess
import time

def download_and_convert(brand, url, filename_base):
    """Download and convert to PNG if needed"""
    try:
        print(f"  Trying: {url}")
        req = urllib.request.Request(url, headers={
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            'Accept': 'image/*,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
        })
        response = urllib.request.urlopen(req, timeout=15)
        data = response.read()
        
        if len(data) < 100:
            return False
            
        # Check if we already have this brand
        png_path = f"/Users/kevintong/Documents/Code/bikenode.com/logos/motorcycle-brands/{filename_base}.png"
        if os.path.exists(png_path):
            print(f"    ✓ Already have {filename_base}.png")
            return True
        
        # Determine file type and handle
        if b'<svg' in data[:1000] or b'<?xml' in data[:200]:
            # SVG file
            svg_path = f"/Users/kevintong/Documents/Code/bikenode.com/logos/motorcycle-brands/{filename_base}.svg"
            
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
                print(f"    ✅ Success! Converted SVG to PNG ({dims})")
                os.remove(svg_path)  # Clean up SVG
                return True
            else:
                os.remove(svg_path)
                return False
                
        elif data[:4] == b'\x89PNG' or data[:2] == b'\xff\xd8':
            # PNG or JPEG
            ext = 'png' if data[:4] == b'\x89PNG' else 'jpg'
            temp_path = f"/Users/kevintong/Documents/Code/bikenode.com/logos/motorcycle-brands/{filename_base}_temp.{ext}"
            
            with open(temp_path, 'wb') as f:
                f.write(data)
            
            # Check dimensions
            result = subprocess.run(['identify', '-format', '%wx%h', temp_path], 
                                  capture_output=True, text=True)
            if result.returncode == 0:
                dims = result.stdout.strip()
                try:
                    width = int(dims.split('x')[0])
                    if width >= 512:
                        # Convert to PNG if needed
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

# Missing brands with alternative sources
missing_brands = {
    'Zero Motorcycles': [
        ('zero', 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/Zero_Motorcycles_logo.svg/1200px-Zero_Motorcycles_logo.svg.png'),
        ('zero', 'https://zeromotorcycles.com/assets/images/logo.svg'),
        ('zero', 'https://raw.githubusercontent.com/logos/zero-motorcycles/master/logo.svg'),
        ('zero', 'https://d1yjjnpx0p53s8.cloudfront.net/styles/logo-thumbnail/s3/062013/zero_motorcycles_logo.png'),
    ],
    
    'Bajaj': [
        ('bajaj', 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/Bajaj_Auto_Logo.svg/1200px-Bajaj_Auto_Logo.svg.png'),
        ('bajaj', 'https://www.bajajauto.com/assets/images/bajaj-logo.svg'),
        ('bajaj', 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQV8VfKg_0QyVfX2nU5yVs7J8nKO7-5K9mF1Q&s'),
    ],
    
    'GasGas': [
        ('gasgas', 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/Gas_Gas_logo.svg/1200px-Gas_Gas_logo.svg.png'),
        ('gasgas', 'https://www.gasgas.com/assets/images/logo.svg'),
        ('gasgas', 'https://logo.clearbit.com/gasgas.com'),
    ],
    
    'CFMoto': [
        ('cfmoto', 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/CFMoto_logo.svg/1200px-CFMoto_logo.svg.png'),
        ('cfmoto', 'https://en.cfmoto.com/assets/images/logo.svg'),
        ('cfmoto', 'https://logo.clearbit.com/cfmoto.com'),
    ],
    
    'Ural': [
        ('ural', 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Ural_Motorcycles_logo.svg/1200px-Ural_Motorcycles_logo.svg.png'),
        ('ural', 'https://www.ural.com/assets/images/logo.svg'),
        ('ural', 'https://logo.clearbit.com/ural.com'),
    ],
    
    'Sherco': [
        ('sherco', 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/Sherco_logo.svg/1200px-Sherco_logo.svg.png'),
        ('sherco', 'https://www.sherco.com/assets/images/logo.svg'),
        ('sherco', 'https://logo.clearbit.com/sherco.com'),
    ],
    
    'Jawa': [
        ('jawa', 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Jawa_logo.svg/1200px-Jawa_logo.svg.png'),
        ('jawa', 'https://www.jawa.in/assets/images/logo.svg'),
        ('jawa', 'https://logo.clearbit.com/jawa.in'),
    ],
    
    'Can-Am': [
        ('can_am', 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1f/Can-Am_logo.svg/1200px-Can-Am_logo.svg.png'),
        ('can_am', 'https://can-am.brp.com/content/dam/global/en/can-am/my22/spyder/logo.svg'),
        ('can_am', 'https://logo.clearbit.com/brp.com'),
    ]
}

print("🎯 Getting Final Missing Logos")
print("=" * 50)
print()

success_count = 0
for brand, urls in missing_brands.items():
    print(f"\n🔍 {brand}:")
    
    downloaded = False
    for filename_base, url in urls:
        if download_and_convert(brand, url, filename_base):
            success_count += 1
            downloaded = True
            break
        time.sleep(1)  # Be polite
    
    if not downloaded:
        print(f"  ❌ No valid sources found")

print("\n" + "=" * 50)
print(f"✅ Successfully downloaded: {success_count}/{len(missing_brands)} missing brands")

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