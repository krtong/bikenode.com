#!/usr/bin/env python3
"""
Automated Logo Downloader
Systematically searches for and downloads motorcycle brand logos
"""

import os
import subprocess
import json
import time
from urllib.parse import quote, unquote
from datetime import datetime

class LogoDownloader:
    def __init__(self):
        self.base_dir = "/Users/kevintong/Documents/Code/bikenode.com"
        self.logos_dir = os.path.join(self.base_dir, "logos", "motorcycle-brands")
        self.tracking_file = os.path.join(self.logos_dir, "download_log.json")
        self.failed_downloads = []
        self.successful_downloads = []
        
    def test_url(self, url):
        """Test if a URL returns a valid image"""
        try:
            # Use curl to test the URL and get headers
            cmd = ['curl', '-I', '-s', '-L', '--max-time', '5', url]
            result = subprocess.run(cmd, capture_output=True, text=True)
            headers = result.stdout.lower()
            
            # Check if it's an image
            if 'content-type: image' in headers:
                return True
            return False
        except:
            return False
    
    def download_logo(self, brand_name, url, filename=None):
        """Download a logo from a URL"""
        if not filename:
            filename = brand_name.lower().replace(' ', '_').replace('-', '_') + '.png'
        
        filepath = os.path.join(self.logos_dir, filename)
        
        # Skip if already exists
        if os.path.exists(filepath):
            print(f"✓ {brand_name} - Already exists")
            return True
        
        print(f"Downloading {brand_name}...")
        
        # Download with curl
        cmd = ['curl', '-L', '-s', '--max-time', '10', '-o', filepath, url]
        result = subprocess.run(cmd, capture_output=True)
        
        # Verify it's an actual image
        if os.path.exists(filepath):
            file_cmd = ['file', filepath]
            file_result = subprocess.run(file_cmd, capture_output=True, text=True)
            
            if 'PNG image' in file_result.stdout or 'JPEG image' in file_result.stdout:
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
        else:
            print(f"✗ {brand_name} - Download failed")
            self.failed_downloads.append(brand_name)
            return False
    
    def search_wikipedia_logo(self, brand_name):
        """Search for logo on Wikipedia/Wikimedia"""
        # Common Wikipedia logo patterns
        patterns = [
            f"https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/{brand_name.replace(' ', '_')}_logo.svg/1200px-{brand_name.replace(' ', '_')}_logo.svg.png",
            f"https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/{brand_name.replace(' ', '_')}_logo.png/1200px-{brand_name.replace(' ', '_')}_logo.png",
            f"https://upload.wikimedia.org/wikipedia/commons/{brand_name.replace(' ', '_')}_logo.png",
            f"https://upload.wikimedia.org/wikipedia/en/thumb/4/47/{brand_name.replace(' ', '_')}_logo.png/1200px-{brand_name.replace(' ', '_')}_logo.png",
            f"https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/{brand_name}_Logo.svg/1200px-{brand_name}_Logo.svg.png",
        ]
        
        for pattern in patterns:
            if self.test_url(pattern):
                return pattern
        
        return None
    
    def download_known_logos(self):
        """Download logos from known good URLs"""
        known_logos = {
            # Japanese Big 4
            'Yamaha': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/Yamaha_Motor_logo.svg/1200px-Yamaha_Motor_logo.svg.png',
            'Kawasaki': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/21/Kawasaki_motorcycles_logo.png/1200px-Kawasaki_motorcycles_logo.png',
            'Suzuki': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/Suzuki_logo_2.svg/1200px-Suzuki_logo_2.svg.png',
            
            # Italian
            'Ducati': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Ducati_red_logo.png/1200px-Ducati_red_logo.png',
            'Aprilia': 'https://upload.wikimedia.org/wikipedia/commons/4/47/Aprilia-logo.png',
            'MV Agusta': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/MV-Agusta-Logo.svg/1200px-MV-Agusta-Logo.svg.png',
            'Moto Guzzi': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/Moto_Guzzi_logo.svg/1200px-Moto_Guzzi_logo.svg.png',
            'Benelli': 'https://upload.wikimedia.org/wikipedia/commons/2/20/Benelli_logo.png',
            'Bimota': 'https://upload.wikimedia.org/wikipedia/commons/9/9f/Bimota_logo.png',
            
            # Austrian/German
            'KTM': 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/KTM-Sportmotorcycle_logo.svg/1200px-KTM-Sportmotorcycle_logo.svg.png',
            'Husqvarna': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/Husqvarna_Motorcycles_logo.svg/1200px-Husqvarna_Motorcycles_logo.svg.png',
            
            # British
            'Triumph': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/aa/Triumph_Motorcycles_logo.svg/1200px-Triumph_Motorcycles_logo.svg.png',
            'Norton': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cc/Norton_Motorcycle_Company_logo.svg/1200px-Norton_Motorcycle_Company_logo.svg.png',
            'BSA': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2d/BSA_motorcycles_logo.svg/1200px-BSA_motorcycles_logo.svg.png',
            
            # American
            'Indian': 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/Indian_Motorcycle_logo.svg/1200px-Indian_Motorcycle_logo.svg.png',
            'Victory': 'https://upload.wikimedia.org/wikipedia/commons/8/8a/Victory_Motorcycles_logo.png',
            'Buell': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ae/Buell_logo.svg/1200px-Buell_logo.svg.png',
            
            # Other major brands
            'Royal Enfield': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Royal-Enfield-Logo.png/1200px-Royal-Enfield-Logo.png',
            'Bajaj': 'https://upload.wikimedia.org/wikipedia/commons/d/dd/Bajaj_Auto_Logo.png',
            'Hero': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e8/Hero_MotoCorp_Logo.svg/1200px-Hero_MotoCorp_Logo.svg.png',
            'TVS': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/81/TVS_Motor_Company_Logo.svg/1200px-TVS_Motor_Company_Logo.svg.png',
            'Vespa': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/64/Vespa_logo.svg/1200px-Vespa_logo.svg.png',
            'Piaggio': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Piaggio_logo.svg/1200px-Piaggio_logo.svg.png',
            'KYMCO': 'https://upload.wikimedia.org/wikipedia/commons/2/26/KYMCO_Logo.png',
            'SYM': 'https://upload.wikimedia.org/wikipedia/commons/0/06/SYM_logo.png',
            'CFMoto': 'https://upload.wikimedia.org/wikipedia/commons/b/b6/CFMoto_logo.png',
            'Zero Motorcycles': 'https://upload.wikimedia.org/wikipedia/commons/c/c7/Zero_Motorcycles_logo.png',
            'Can-Am': 'https://upload.wikimedia.org/wikipedia/commons/5/57/Can-Am_logo.png',
            'Polaris': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/70/Polaris_Industries_logo.svg/1200px-Polaris_Industries_logo.svg.png',
            'Ural': 'https://upload.wikimedia.org/wikipedia/commons/8/84/Ural_Motorcycles_logo.png',
            'Jawa': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ef/JAWA_logo.svg/1200px-JAWA_logo.svg.png',
            'Beta': 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/Beta_logo.svg/1200px-Beta_logo.svg.png',
            'GAS GAS': 'https://upload.wikimedia.org/wikipedia/commons/3/33/Gas_Gas_logo.png',
            'Sherco': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/16/Sherco_logo.svg/1200px-Sherco_logo.svg.png',
            'Husaberg': 'https://upload.wikimedia.org/wikipedia/commons/8/89/Husaberg_logo.png',
            'Hyosung': 'https://upload.wikimedia.org/wikipedia/commons/4/47/Hyosung_logo.png',
            'Daelim': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/08/Daelim_Motor_Company_logo.svg/1200px-Daelim_Motor_Company_logo.svg.png',
            'Peugeot': 'https://upload.wikimedia.org/wikipedia/commons/4/45/Peugeot_Logo.png',
            'Derbi': 'https://upload.wikimedia.org/wikipedia/commons/0/02/Derbi_logo.png',
            'Cagiva': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/Cagiva_logo.svg/1200px-Cagiva_logo.svg.png',
            'Laverda': 'https://upload.wikimedia.org/wikipedia/commons/a/a6/Laverda_logo.png',
            'Gilera': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/Gilera_logo.svg/400px-Gilera_logo.svg.png',
            'Malaguti': 'https://upload.wikimedia.org/wikipedia/commons/b/b6/Malaguti_logo.png',
            'TM Racing': 'https://upload.wikimedia.org/wikipedia/commons/c/cf/TM_Racing_logo.png',
            'Montesa': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/Montesa_logo.svg/400px-Montesa_logo.svg.png',
            'OSSA': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/70/Ossa_logo.svg/400px-Ossa_logo.svg.png',
            'Bultaco': 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b0/Bultaco_logo.svg/400px-Bultaco_logo.svg.png',
            'Moto Morini': 'https://upload.wikimedia.org/wikipedia/commons/5/5a/Moto_Morini_logo.png',
            'SWM': 'https://upload.wikimedia.org/wikipedia/commons/9/92/SWM_Motorcycles_logo.png'
        }
        
        print(f"\nDownloading {len(known_logos)} known logos...\n")
        
        for brand, url in known_logos.items():
            self.download_logo(brand, url)
            time.sleep(0.5)  # Be polite
        
        # Save results
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
    downloader = LogoDownloader()
    downloader.download_known_logos()
    
    # After downloading known logos, run the tracker
    print("\nUpdating tracker...")
    os.system("cd /Users/kevintong/Documents/Code/bikenode.com && python logo-acquisition/motorcycle_logo_tracker.py")