#!/usr/bin/env python3
"""
Improved Logo Downloader with Better URL Validation
Systematically searches multiple sources and validates URLs before downloading
"""

import os
import subprocess
import json
import time
import urllib.request
import urllib.parse
from datetime import datetime

class ImprovedLogoDownloader:
    def __init__(self):
        self.base_dir = "/Users/kevintong/Documents/Code/bikenode.com"
        self.logos_dir = os.path.join(self.base_dir, "logos", "motorcycle-brands")
        self.tracking_file = os.path.join(self.logos_dir, "download_log.json")
        self.failed_downloads = []
        self.successful_downloads = []
        
    def test_url_advanced(self, url):
        """Advanced URL testing with urllib"""
        try:
            # Create a HEAD request
            req = urllib.request.Request(url, method='HEAD')
            response = urllib.request.urlopen(req, timeout=5)
            content_type = response.headers.get('content-type', '').lower()
            
            # Check if it's an image
            if any(img_type in content_type for img_type in ['image/png', 'image/jpeg', 'image/svg']):
                return True
                
            # If HEAD doesn't give content-type, try GET
            if not content_type or content_type == 'text/html':
                req = urllib.request.Request(url)
                response = urllib.request.urlopen(req, timeout=5)
                content_type = response.headers.get('content-type', '').lower()
                if any(img_type in content_type for img_type in ['image/png', 'image/jpeg', 'image/svg']):
                    return True
                    
            return False
        except:
            return False
    
    def download_with_validation(self, brand_name, url, filename=None):
        """Download and validate the file is an actual image"""
        if not filename:
            filename = brand_name.lower().replace(' ', '_').replace('-', '_') + '.png'
        
        filepath = os.path.join(self.logos_dir, filename)
        
        # Skip if already exists and is valid
        if os.path.exists(filepath):
            file_cmd = ['file', filepath]
            file_result = subprocess.run(file_cmd, capture_output=True, text=True)
            if 'PNG image' in file_result.stdout or 'JPEG image' in file_result.stdout:
                print(f"✓ {brand_name} - Already exists (valid)")
                return True
        
        print(f"Testing URL for {brand_name}...")
        
        # Test URL first
        if not self.test_url_advanced(url):
            print(f"✗ {brand_name} - URL test failed")
            return False
        
        print(f"Downloading {brand_name}...")
        
        try:
            # Download with urllib
            req = urllib.request.Request(url)
            response = urllib.request.urlopen(req, timeout=10)
            
            # Write to file
            with open(filepath, 'wb') as f:
                f.write(response.read())
            
            # Verify it's an actual image
            file_cmd = ['file', filepath]
            file_result = subprocess.run(file_cmd, capture_output=True, text=True)
            
            if 'PNG image' in file_result.stdout or 'JPEG image' in file_result.stdout:
                # If JPEG, convert to PNG
                if 'JPEG image' in file_result.stdout:
                    convert_cmd = ['sips', '-s', 'format', 'png', filepath, '--out', filepath]
                    subprocess.run(convert_cmd, capture_output=True)
                
                print(f"✓ {brand_name} - Success!")
                self.successful_downloads.append({
                    'brand': brand_name,
                    'filename': filename,
                    'url': url,
                    'timestamp': datetime.now().isoformat()
                })
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
    
    def get_wikimedia_urls(self, brand_name):
        """Generate multiple possible Wikimedia URLs for a brand"""
        # Clean brand name variations
        clean_name = brand_name.replace(' ', '_')
        clean_name_lower = brand_name.lower().replace(' ', '_')
        
        patterns = [
            # SVG patterns (converted to PNG by Wikimedia)
            f"https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/{clean_name}_logo.svg/1200px-{clean_name}_logo.svg.png",
            f"https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/{clean_name}_Motor_logo.svg/1200px-{clean_name}_Motor_logo.svg.png",
            f"https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/{clean_name}_Motorcycles_logo.svg/1200px-{clean_name}_Motorcycles_logo.svg.png",
            f"https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/{clean_name}_logo_2.svg/1200px-{clean_name}_logo_2.svg.png",
            f"https://upload.wikimedia.org/wikipedia/commons/thumb/a/aa/{clean_name}_logo.svg/1200px-{clean_name}_logo.svg.png",
            f"https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/{clean_name}_logo.svg/1200px-{clean_name}_logo.svg.png",
            f"https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/{clean_name}_logo.svg/1200px-{clean_name}_logo.svg.png",
            f"https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/{clean_name}_logo.svg/1200px-{clean_name}_logo.svg.png",
            
            # Direct PNG patterns
            f"https://upload.wikimedia.org/wikipedia/commons/4/47/{clean_name}_logo.png",
            f"https://upload.wikimedia.org/wikipedia/commons/2/20/{clean_name}_logo.png",
            f"https://upload.wikimedia.org/wikipedia/commons/9/9f/{clean_name}_logo.png",
            f"https://upload.wikimedia.org/wikipedia/commons/8/8a/{clean_name}_logo.png",
            f"https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/{clean_name}_logo.png/1200px-{clean_name}_logo.png",
            
            # English Wikipedia patterns
            f"https://upload.wikimedia.org/wikipedia/en/thumb/4/47/{clean_name}_logo.png/1200px-{clean_name}_logo.png",
            f"https://upload.wikimedia.org/wikipedia/en/4/47/{clean_name}_logo.png",
            
            # Variations with underscores and hyphens
            f"https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/{clean_name.replace('_', '-')}_logo.svg/1200px-{clean_name.replace('_', '-')}_logo.svg.png",
            f"https://upload.wikimedia.org/wikipedia/commons/4/47/{clean_name.replace('_', '-')}_logo.png",
        ]
        
        return patterns
    
    def download_priority_brands(self):
        """Download logos for priority brands with verified URLs"""
        
        # Updated URLs based on actual Wikimedia Commons structure
        priority_brands = {
            # Japanese Big 4
            'Yamaha': [
                'https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/Yamaha_Motor_logo.svg/400px-Yamaha_Motor_logo.svg.png',
                'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/Yamaha_logo.svg/400px-Yamaha_logo.svg.png'
            ],
            'Kawasaki': [
                'https://upload.wikimedia.org/wikipedia/commons/thumb/2/21/Kawasaki_motorcycles_logo.png/300px-Kawasaki_motorcycles_logo.png',
                'https://upload.wikimedia.org/wikipedia/commons/2/21/Kawasaki_Heavy_Industries_logo.svg'
            ],
            'Suzuki': [
                'https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/Suzuki_logo_2.svg/400px-Suzuki_logo_2.svg.png',
                'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Suzuki_Motor_Corporation_logo.svg/400px-Suzuki_Motor_Corporation_logo.svg.png'
            ],
            
            # Italian brands
            'Ducati': [
                'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Ducati_red_logo.png/300px-Ducati_red_logo.png',
                'https://upload.wikimedia.org/wikipedia/commons/9/9e/Ducati_red_logo_PNG.png'
            ],
            'Aprilia': [
                'https://upload.wikimedia.org/wikipedia/commons/4/47/Aprilia-logo.png',
                'https://upload.wikimedia.org/wikipedia/commons/thumb/e/eb/Aprilia_Racing_logo.svg/400px-Aprilia_Racing_logo.svg.png'
            ],
            'MV Agusta': [
                'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/MV-Agusta-Logo.svg/400px-MV-Agusta-Logo.svg.png',
                'https://upload.wikimedia.org/wikipedia/commons/a/ab/MV-Agusta-Logo.svg'
            ],
            'Moto Guzzi': [
                'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/Moto_Guzzi_logo.svg/400px-Moto_Guzzi_logo.svg.png',
                'https://upload.wikimedia.org/wikipedia/commons/e/e5/Moto_Guzzi_logo.svg'
            ],
            'Benelli': [
                'https://upload.wikimedia.org/wikipedia/commons/2/20/Benelli_logo.png',
                'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/Benelli_Q.J._logo.svg/400px-Benelli_Q.J._logo.svg.png'
            ],
            'Bimota': [
                'https://upload.wikimedia.org/wikipedia/commons/9/9f/Bimota_logo.png',
                'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Bimota_logo.svg/400px-Bimota_logo.svg.png'
            ],
            
            # Austrian/German
            'KTM': [
                'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/KTM-Sportmotorcycle_logo.svg/400px-KTM-Sportmotorcycle_logo.svg.png',
                'https://upload.wikimedia.org/wikipedia/commons/b/b8/KTM-Sportmotorcycle_logo.svg'
            ],
            'Husqvarna': [
                'https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/Husqvarna_Motorcycles_logo.svg/400px-Husqvarna_Motorcycles_logo.svg.png',
                'https://upload.wikimedia.org/wikipedia/commons/9/91/Husqvarna_Motorcycles_logo.svg'
            ],
            
            # British
            'Triumph': [
                'https://upload.wikimedia.org/wikipedia/commons/thumb/a/aa/Triumph_Motorcycles_logo.svg/400px-Triumph_Motorcycles_logo.svg.png',
                'https://upload.wikimedia.org/wikipedia/commons/a/aa/Triumph_Motorcycles_logo.svg'
            ],
            'Norton': [
                'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cc/Norton_Motorcycle_Company_logo.svg/400px-Norton_Motorcycle_Company_logo.svg.png',
                'https://upload.wikimedia.org/wikipedia/commons/c/cc/Norton_Motorcycle_Company_logo.svg'
            ],
            'BSA': [
                'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2d/BSA_motorcycles_logo.svg/400px-BSA_motorcycles_logo.svg.png',
                'https://upload.wikimedia.org/wikipedia/commons/2/2d/BSA_motorcycles_logo.svg'
            ],
            
            # American
            'Indian': [
                'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/Indian_Motorcycle_logo.svg/400px-Indian_Motorcycle_logo.svg.png',
                'https://upload.wikimedia.org/wikipedia/commons/b/b9/Indian_Motorcycle_logo.svg'
            ],
            'Victory': [
                'https://upload.wikimedia.org/wikipedia/commons/8/8a/Victory_Motorcycles_logo.png',
                'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Victory_Motorcycles_logo.png/300px-Victory_Motorcycles_logo.png'
            ],
            'Buell': [
                'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ae/Buell_logo.svg/400px-Buell_logo.svg.png',
                'https://upload.wikimedia.org/wikipedia/commons/a/ae/Buell_logo.svg'
            ],
            
            # Other major brands
            'Royal Enfield': [
                'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Royal-Enfield-Logo.png/400px-Royal-Enfield-Logo.png',
                'https://upload.wikimedia.org/wikipedia/commons/c/c3/Royal-Enfield-Logo.png'
            ],
            'Bajaj': [
                'https://upload.wikimedia.org/wikipedia/commons/d/dd/Bajaj_Auto_Logo.png',
                'https://upload.wikimedia.org/wikipedia/commons/thumb/8/81/Bajaj_Auto_logo.svg/400px-Bajaj_Auto_logo.svg.png'
            ],
            'Hero': [
                'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e8/Hero_MotoCorp_Logo.svg/400px-Hero_MotoCorp_Logo.svg.png',
                'https://upload.wikimedia.org/wikipedia/commons/e/e8/Hero_MotoCorp_Logo.svg'
            ],
            'TVS': [
                'https://upload.wikimedia.org/wikipedia/commons/thumb/8/81/TVS_Motor_Company_Logo.svg/400px-TVS_Motor_Company_Logo.svg.png',
                'https://upload.wikimedia.org/wikipedia/commons/8/81/TVS_Motor_Company_Logo.svg'
            ]
        }
        
        print(f"\nDownloading logos for {len(priority_brands)} priority brands...\n")
        
        for brand, urls in priority_brands.items():
            success = False
            for url in urls:
                if self.download_with_validation(brand, url):
                    success = True
                    break
                time.sleep(0.5)  # Be polite between attempts
            
            if not success:
                # Try generated patterns
                for pattern_url in self.get_wikimedia_urls(brand)[:3]:  # Try first 3 patterns
                    if self.download_with_validation(brand, pattern_url):
                        break
                    time.sleep(0.5)
            
            time.sleep(1)  # Be polite between brands
        
        self.save_results()
    
    def save_results(self):
        """Save download results"""
        results = {
            'timestamp': datetime.now().isoformat(),
            'successful': self.successful_downloads,
            'failed': self.failed_downloads,
            'total_success': len(self.successful_downloads),
            'total_failed': len(self.failed_downloads)
        }
        
        with open(self.tracking_file, 'w') as f:
            json.dump(results, f, indent=2)
        
        print(f"\n=== Download Summary ===")
        print(f"Successful: {len(self.successful_downloads)}")
        print(f"Failed: {len(self.failed_downloads)}")
        print(f"Results saved to: {self.tracking_file}")

if __name__ == "__main__":
    downloader = ImprovedLogoDownloader()
    downloader.download_priority_brands()
    
    # After downloading, run the tracker
    print("\nUpdating tracker...")
    os.system("cd /Users/kevintong/Documents/Code/bikenode.com && python logo-acquisition/motorcycle_logo_tracker.py")