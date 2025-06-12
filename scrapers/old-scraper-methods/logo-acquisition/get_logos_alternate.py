#!/usr/bin/env python3
"""
Alternative Logo Download Methods
Try different sources and approaches
"""

import urllib.request
import os
import subprocess
import base64
import json

def download_from_base64(brand, base64_data, filename):
    """Some sites embed logos as base64"""
    try:
        # Decode base64
        image_data = base64.b64decode(base64_data)
        filepath = f"/Users/kevintong/Documents/Code/bikenode.com/logos/motorcycle-brands/{filename}"
        
        with open(filepath, 'wb') as f:
            f.write(image_data)
        
        # Verify it's an image
        result = subprocess.run(['file', filepath], capture_output=True, text=True)
        if 'image' in result.stdout.lower():
            dims = subprocess.run(['identify', '-format', '%wx%h', filepath], 
                                capture_output=True, text=True).stdout
            print(f"  ✅ {brand}: Decoded from base64 ({dims})")
            return True
        else:
            os.remove(filepath)
            return False
    except:
        return False

def try_direct_brand_sites():
    """Try downloading from brand websites directly"""
    print("🌐 Trying direct brand websites...")
    print("-" * 40)
    
    direct_urls = {
        # Try brand CDNs and media servers
        'Ducati': [
            ('ducati.png', 'https://media.ducati.com/brand_logo.png'),
            ('ducati.png', 'https://assets.ducati.com/logo.png'),
            ('ducati.png', 'https://www.ducati.com/images/logo.png'),
        ],
        'Norton': [
            ('norton.png', 'https://www.nortonmotorcycles.com/images/norton-logo.png'),
            ('norton.png', 'https://norton-motorcycles.com/assets/logo.png'),
        ],
        'Indian': [
            ('indian.png', 'https://www.indianmotorcycle.com/images/logo.png'),
            ('indian.png', 'https://cdn.indianmotorcycle.com/brand/logo.png'),
        ],
        'Zero': [
            ('zero.png', 'https://www.zeromotorcycles.com/images/logo.png'),
            ('zero.png', 'https://assets.zeromotorcycles.com/logo.png'),
        ]
    }
    
    for brand, urls in direct_urls.items():
        print(f"\n🔍 {brand}:")
        for filename, url in urls:
            try:
                print(f"  Trying: {url}")
                req = urllib.request.Request(url, headers={
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                    'Referer': url.split('/')[2]
                })
                response = urllib.request.urlopen(req, timeout=5)
                data = response.read()
                
                if len(data) > 1000:
                    filepath = f"/Users/kevintong/Documents/Code/bikenode.com/logos/motorcycle-brands/{filename}"
                    with open(filepath, 'wb') as f:
                        f.write(data)
                    
                    # Check if valid
                    result = subprocess.run(['file', filepath], capture_output=True, text=True)
                    if 'image' in result.stdout.lower():
                        dims = subprocess.run(['identify', '-format', '%wx%h', filepath], 
                                            capture_output=True, text=True).stdout
                        print(f"    ✅ Success! ({dims})")
                        break
                    else:
                        os.remove(filepath)
                        
            except Exception as e:
                continue

def try_google_cached_versions():
    """Try Google's cached image versions"""
    print("\n🔍 Trying Google cached images...")
    print("-" * 40)
    
    # Google often caches Wikipedia images
    cached_patterns = [
        # Try different Google cache patterns
        'https://www.google.com/s2/favicons?domain=ducati.com&sz=256',
        'https://www.google.com/s2/favicons?domain=nortonmotorcycles.com&sz=256',
        'https://www.google.com/s2/favicons?domain=indianmotorcycle.com&sz=256',
    ]
    
    for url in cached_patterns:
        domain = url.split('domain=')[1].split('&')[0]
        brand = domain.split('.')[0].title()
        filename = f"{brand.lower()}_favicon.png"
        
        try:
            print(f"  Getting {brand} favicon...")
            req = urllib.request.Request(url)
            response = urllib.request.urlopen(req, timeout=5)
            data = response.read()
            
            if len(data) > 100:
                filepath = f"/Users/kevintong/Documents/Code/bikenode.com/logos/motorcycle-brands/{filename}"
                with open(filepath, 'wb') as f:
                    f.write(data)
                print(f"    ✅ Got favicon (256x256)")
        except:
            continue

def check_github_repos():
    """Some brands have logos in GitHub repos"""
    print("\n📦 Checking GitHub repositories...")
    print("-" * 40)
    
    github_urls = {
        'Ducati': [
            'https://raw.githubusercontent.com/detain/svg-logos/master/svg/d/ducati-2.svg',
            'https://raw.githubusercontent.com/detain/svg-logos/master/svg/d/ducati.svg',
        ],
        'Norton': [
            'https://raw.githubusercontent.com/detain/svg-logos/master/svg/n/norton.svg',
        ],
        'Indian': [
            'https://raw.githubusercontent.com/detain/svg-logos/master/svg/i/indian-motorcycle.svg',
        ]
    }
    
    for brand, urls in github_urls.items():
        print(f"\n🔍 {brand}:")
        for url in urls:
            try:
                print(f"  Trying: {url}")
                req = urllib.request.Request(url)
                response = urllib.request.urlopen(req, timeout=5)
                data = response.read()
                
                if b'<svg' in data or len(data) > 1000:
                    filename = f"{brand.lower()}.svg"
                    filepath = f"/Users/kevintong/Documents/Code/bikenode.com/logos/motorcycle-brands/{filename}"
                    with open(filepath, 'wb') as f:
                        f.write(data)
                    
                    # Convert to PNG
                    png_path = filepath.replace('.svg', '.png')
                    convert_cmd = ['convert', '-background', 'none', '-density', '300',
                                 filepath, '-resize', '1024x1024>', png_path]
                    result = subprocess.run(convert_cmd, capture_output=True)
                    
                    if result.returncode == 0:
                        dims = subprocess.run(['identify', '-format', '%wx%h', png_path], 
                                            capture_output=True, text=True).stdout
                        print(f"    ✅ Success! Converted to PNG ({dims})")
                        os.remove(filepath)  # Remove SVG after conversion
                        break
                    else:
                        os.remove(filepath)
                        
            except Exception as e:
                continue

def try_alternative_cdns():
    """Try CDN services that might host logos"""
    print("\n☁️ Trying CDN services...")
    print("-" * 40)
    
    cdn_patterns = [
        # Cloudinary often hosts brand assets
        ('Ducati', 'ducati.png', [
            'https://res.cloudinary.com/demo/image/upload/ducati_logo.png',
            'https://cdn.jsdelivr.net/npm/simple-icons@v5/icons/ducati.svg',
        ]),
        ('Norton', 'norton.png', [
            'https://cdn.jsdelivr.net/npm/motorcycle-logos/norton.png',
        ]),
    ]
    
    for brand, filename, urls in cdn_patterns:
        print(f"\n🔍 {brand}:")
        for url in urls:
            try:
                print(f"  Trying: {url}")
                req = urllib.request.Request(url, headers={
                    'User-Agent': 'Mozilla/5.0'
                })
                response = urllib.request.urlopen(req, timeout=5)
                data = response.read()
                
                if len(data) > 1000:
                    filepath = f"/Users/kevintong/Documents/Code/bikenode.com/logos/motorcycle-brands/{filename}"
                    with open(filepath, 'wb') as f:
                        f.write(data)
                    
                    # Verify
                    result = subprocess.run(['file', filepath], capture_output=True, text=True)
                    if 'image' in result.stdout.lower() or 'SVG' in result.stdout:
                        print(f"    ✅ Found on CDN!")
                        break
                    else:
                        os.remove(filepath)
                        
            except:
                continue

# Main execution
print("🏍️ Alternative Logo Download Methods")
print("=" * 50)
print()

# Try each method
try_direct_brand_sites()
try_google_cached_versions()
check_github_repos()
try_alternative_cdns()

# Final count
print("\n" + "=" * 50)
logo_dir = "/Users/kevintong/Documents/Code/bikenode.com/logos/motorcycle-brands"
total = len([f for f in os.listdir(logo_dir) if f.endswith('.png')])
print(f"📊 Total logos now: {total}")

# Show any new additions
print("\nChecking for new high-res logos...")
for f in os.listdir(logo_dir):
    if f.endswith('.png'):
        filepath = os.path.join(logo_dir, f)
        # Check if it's a recent file (modified in last 5 minutes)
        if os.path.getmtime(filepath) > (os.path.getmtime(logo_dir) - 300):
            dims = subprocess.run(['identify', '-format', '%wx%h', filepath], 
                                capture_output=True, text=True).stdout
            print(f"  🆕 {f}: {dims}")