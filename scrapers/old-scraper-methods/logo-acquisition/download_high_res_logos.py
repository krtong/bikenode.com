#!/usr/bin/env python3
"""
High Resolution Logo Downloader
Downloads motorcycle brand logos at 1200px+ resolution
"""

import os
import subprocess
import json
import time
import urllib.request
import urllib.parse
from datetime import datetime

class HighResLogoDownloader:
    def __init__(self):
        self.base_dir = "/Users/kevintong/Documents/Code/bikenode.com"
        self.logos_dir = os.path.join(self.base_dir, "logos", "motorcycle-brands")
        self.tracking_file = os.path.join(self.logos_dir, "high_res_download_log.json")
        self.failed_downloads = []
        self.successful_downloads = []
        
    def download_logo(self, brand_name, url, filename=None):
        """Download a logo from a URL"""
        if not filename:
            filename = brand_name.lower().replace(' ', '_').replace('-', '_') + '.png'
        
        filepath = os.path.join(self.logos_dir, filename)
        
        print(f"Downloading {brand_name} at high resolution...")
        
        try:
            # Download with urllib
            req = urllib.request.Request(url, headers={
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
            })
            response = urllib.request.urlopen(req, timeout=10)
            
            # Write to file
            with open(filepath, 'wb') as f:
                f.write(response.read())
            
            # Verify it's an actual image
            file_cmd = ['file', filepath]
            file_result = subprocess.run(file_cmd, capture_output=True, text=True)
            
            if 'PNG image' in file_result.stdout or 'JPEG image' in file_result.stdout:
                # Check size
                identify_cmd = ['identify', filepath]
                identify_result = subprocess.run(identify_cmd, capture_output=True, text=True)
                
                if identify_result.returncode == 0:
                    # Extract dimensions
                    output = identify_result.stdout
                    dimensions_str = output.split()[2]  # Format: WIDTHxHEIGHT
                    width, height = map(int, dimensions_str.split('x'))
                    
                    print(f"✓ {brand_name} - Success! ({width}x{height}px)")
                    
                    if width < 512 or height < 512:
                        print(f"  ⚠️  Warning: Image is smaller than 512px ({width}x{height})")
                    
                    self.successful_downloads.append({
                        'brand': brand_name,
                        'filename': filename,
                        'url': url,
                        'width': width,
                        'height': height,
                        'timestamp': datetime.now().isoformat()
                    })
                    return True
                else:
                    print(f"✓ {brand_name} - Downloaded (size check failed)")
                    return True
            else:
                # Not an image, remove it
                os.remove(filepath)
                print(f"✗ {brand_name} - Not a valid image")
                self.failed_downloads.append(brand_name)
                return False
                
        except Exception as e:
            print(f"✗ {brand_name} - Download failed: {str(e)}")
            if os.path.exists(filepath):
                os.remove(filepath)
            self.failed_downloads.append(brand_name)
            return False
    
    def download_priority_brands(self):
        """Download high-resolution logos for priority brands"""
        
        # High-resolution URLs (1200px or original size)
        priority_brands = {
            # Japanese Big 4
            'Honda': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Honda_Logo.svg/2048px-Honda_Logo.svg.png',
            'Yamaha': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/Yamaha_Motor_logo.svg/1200px-Yamaha_Motor_logo.svg.png',
            'Kawasaki': 'https://upload.wikimedia.org/wikipedia/commons/2/21/Kawasaki_motorcycles_logo.png',  # Original PNG
            'Suzuki': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/Suzuki_logo_2.svg/1200px-Suzuki_logo_2.svg.png',
            
            # Italian brands
            'Ducati': 'https://upload.wikimedia.org/wikipedia/commons/9/9e/Ducati_red_logo_PNG.png',  # Original PNG
            'Aprilia': 'https://upload.wikimedia.org/wikipedia/commons/4/47/Aprilia-logo.png',  # Original PNG
            'MV Agusta': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/MV-Agusta-Logo.svg/1200px-MV-Agusta-Logo.svg.png',
            'Moto Guzzi': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/Moto_Guzzi_logo.svg/1200px-Moto_Guzzi_logo.svg.png',
            'Benelli': 'https://upload.wikimedia.org/wikipedia/commons/2/20/Benelli_logo.png',  # Original PNG
            'Bimota': 'https://upload.wikimedia.org/wikipedia/commons/9/9f/Bimota_logo.png',  # Original PNG
            
            # Austrian/German
            'KTM': 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/KTM-Sportmotorcycle_logo.svg/1200px-KTM-Sportmotorcycle_logo.svg.png',
            'Husqvarna': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/Husqvarna_Motorcycles_logo.svg/1200px-Husqvarna_Motorcycles_logo.svg.png',
            'BMW': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/BMW.svg/2048px-BMW.svg.png',
            
            # British
            'Triumph': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/aa/Triumph_Motorcycles_logo.svg/1200px-Triumph_Motorcycles_logo.svg.png',
            'Norton': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cc/Norton_Motorcycle_Company_logo.svg/1200px-Norton_Motorcycle_Company_logo.svg.png',
            'BSA': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2d/BSA_motorcycles_logo.svg/1200px-BSA_motorcycles_logo.svg.png',
            
            # American
            'Harley-Davidson': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/de/Harley-Davidson_logo.svg/1200px-Harley-Davidson_logo.svg.png',
            'Indian': 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/Indian_Motorcycle_logo.svg/1200px-Indian_Motorcycle_logo.svg.png',
            'Victory': 'https://upload.wikimedia.org/wikipedia/commons/8/8a/Victory_Motorcycles_logo.png',  # Original PNG
            'Buell': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ae/Buell_logo.svg/1200px-Buell_logo.svg.png',
            
            # Other major brands
            'Royal Enfield': 'https://upload.wikimedia.org/wikipedia/commons/c/c3/Royal-Enfield-Logo.png',  # Original PNG
            'Bajaj': 'https://upload.wikimedia.org/wikipedia/commons/d/dd/Bajaj_Auto_Logo.png',  # Original PNG
            'Hero': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e8/Hero_MotoCorp_Logo.svg/1200px-Hero_MotoCorp_Logo.svg.png',
            'TVS': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/81/TVS_Motor_Company_Logo.svg/1200px-TVS_Motor_Company_Logo.svg.png',
            'Vespa': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/64/Vespa_logo.svg/1200px-Vespa_logo.svg.png',
            'Piaggio': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Piaggio_logo.svg/1200px-Piaggio_logo.svg.png',
            'Can-Am': 'https://upload.wikimedia.org/wikipedia/commons/5/57/Can-Am_logo.png',  # Original PNG
            'Polaris': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/70/Polaris_Industries_logo.svg/1200px-Polaris_Industries_logo.svg.png',
            'Zero Motorcycles': 'https://upload.wikimedia.org/wikipedia/commons/c/c7/Zero_Motorcycles_logo.png',  # Original PNG
            'Ural': 'https://upload.wikimedia.org/wikipedia/commons/8/84/Ural_Motorcycles_logo.png',  # Original PNG
            
            # European brands
            'Jawa': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ef/JAWA_logo.svg/1200px-JAWA_logo.svg.png',
            'Beta': 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/Beta_logo.svg/1200px-Beta_logo.svg.png',
            'GAS GAS': 'https://upload.wikimedia.org/wikipedia/commons/3/33/Gas_Gas_logo.png',  # Original PNG
            'Sherco': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/16/Sherco_logo.svg/1200px-Sherco_logo.svg.png',
            'Peugeot': 'https://upload.wikimedia.org/wikipedia/commons/4/45/Peugeot_Logo.png',  # Original PNG
            'Derbi': 'https://upload.wikimedia.org/wikipedia/commons/0/02/Derbi_logo.png',  # Original PNG
            'Cagiva': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/Cagiva_logo.svg/1200px-Cagiva_logo.svg.png',
            
            # Asian brands
            'KYMCO': 'https://upload.wikimedia.org/wikipedia/commons/2/26/KYMCO_Logo.png',  # Original PNG
            'SYM': 'https://upload.wikimedia.org/wikipedia/commons/0/06/SYM_logo.png',  # Original PNG
            'CFMoto': 'https://upload.wikimedia.org/wikipedia/commons/b/b6/CFMoto_logo.png',  # Original PNG
            'Hyosung': 'https://upload.wikimedia.org/wikipedia/commons/4/47/Hyosung_logo.png',  # Original PNG
            'Daelim': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/08/Daelim_Motor_Company_logo.svg/1200px-Daelim_Motor_Company_logo.svg.png',
        }
        
        print(f"\nDownloading high-resolution logos for {len(priority_brands)} priority brands...\n")
        
        for brand, url in priority_brands.items():
            self.download_logo(brand, url)
            time.sleep(0.5)  # Be polite to servers
        
        # Save tracking log
        log_data = {
            'timestamp': datetime.now().isoformat(),
            'total_attempted': len(priority_brands),
            'successful': len(self.successful_downloads),
            'failed': len(self.failed_downloads),
            'downloads': self.successful_downloads,
            'failures': self.failed_downloads
        }
        
        with open(self.tracking_file, 'w') as f:
            json.dump(log_data, f, indent=2)
        
        print(f"\n\n📊 Download Summary:")
        print(f"   ✅ Successful: {len(self.successful_downloads)}")
        print(f"   ❌ Failed: {len(self.failed_downloads)}")
        
        if self.failed_downloads:
            print(f"\n   Failed brands: {', '.join(self.failed_downloads)}")
        
        # Show size statistics
        if self.successful_downloads:
            sizes = [(d['width'], d['height']) for d in self.successful_downloads if 'width' in d]
            if sizes:
                avg_width = sum(w for w, h in sizes) / len(sizes)
                avg_height = sum(h for w, h in sizes) / len(sizes)
                min_size = min(min(w, h) for w, h in sizes)
                max_size = max(max(w, h) for w, h in sizes)
                
                print(f"\n📏 Size Statistics:")
                print(f"   Average: {int(avg_width)}x{int(avg_height)}px")
                print(f"   Smallest dimension: {min_size}px")
                print(f"   Largest dimension: {max_size}px")

if __name__ == "__main__":
    downloader = HighResLogoDownloader()
    downloader.download_priority_brands()