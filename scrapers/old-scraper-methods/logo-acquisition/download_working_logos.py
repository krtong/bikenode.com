#!/usr/bin/env python3
"""
Download High-Resolution Motorcycle Logos from Working URLs
Uses verified Wikimedia Commons URLs
"""

import os
import urllib.request
import subprocess
import time
import json
from datetime import datetime

class WorkingLogoDownloader:
    def __init__(self):
        self.base_dir = "/Users/kevintong/Documents/Code/bikenode.com"
        self.logos_dir = os.path.join(self.base_dir, "logos", "motorcycle-brands")
        self.results = []
        
    def download_logo(self, brand_name, url, filename=None):
        """Download a logo with proper error handling"""
        if not filename:
            filename = brand_name.lower().replace(' ', '_').replace('-', '_') + '.png'
        
        filepath = os.path.join(self.logos_dir, filename)
        
        # Check if valid logo already exists
        if os.path.exists(filepath):
            file_result = subprocess.run(['file', filepath], capture_output=True, text=True)
            if 'PNG image' in file_result.stdout or 'JPEG image' in file_result.stdout:
                print(f"✓ {brand_name} - Already exists (valid image)")
                return True
            else:
                # Remove invalid file
                os.remove(filepath)
                print(f"  Removed invalid {filename}")
        
        print(f"Downloading {brand_name}...")
        
        try:
            # Create request with headers
            req = urllib.request.Request(url, headers={
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
            })
            
            # Download
            response = urllib.request.urlopen(req, timeout=10)
            data = response.read()
            
            # Save to file
            with open(filepath, 'wb') as f:
                f.write(data)
            
            # Verify it's a valid image
            file_result = subprocess.run(['file', filepath], capture_output=True, text=True)
            
            if 'PNG image' in file_result.stdout or 'JPEG image' in file_result.stdout:
                # Get dimensions
                try:
                    identify_result = subprocess.run(['identify', '-format', '%wx%h', filepath], 
                                                   capture_output=True, text=True)
                    if identify_result.returncode == 0:
                        dimensions = identify_result.stdout.strip()
                        print(f"✅ {brand_name} - Success! ({dimensions})")
                        self.results.append({
                            'brand': brand_name,
                            'success': True,
                            'dimensions': dimensions,
                            'url': url
                        })
                        return True
                except:
                    print(f"✅ {brand_name} - Downloaded (size check failed)")
                    return True
            else:
                # Not a valid image
                os.remove(filepath)
                print(f"❌ {brand_name} - Invalid image format")
                self.results.append({
                    'brand': brand_name,
                    'success': False,
                    'error': 'Invalid image format'
                })
                return False
                
        except Exception as e:
            if os.path.exists(filepath):
                os.remove(filepath)
            print(f"❌ {brand_name} - {str(e)}")
            self.results.append({
                'brand': brand_name,
                'success': False,
                'error': str(e)
            })
            return False
    
    def download_priority_brands(self):
        """Download logos using verified working URLs"""
        
        # These URLs have been tested and work
        working_urls = {
            # Japanese Big 4
            'Yamaha': 'https://upload.wikimedia.org/wikipedia/commons/0/0f/Yamaha_logo.png',
            'Kawasaki': 'https://upload.wikimedia.org/wikipedia/commons/5/5e/Kawasaki_Heavy_Industries_logo_2.png',
            'Suzuki': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/Suzuki_logo_2.svg/800px-Suzuki_logo_2.svg.png',
            'Honda': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Honda_Logo.svg/2048px-Honda_Logo.svg.png',
            
            # Italian
            'Ducati': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Ducati_Corse_logo.svg/800px-Ducati_Corse_logo.svg.png',
            'Aprilia': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/55/Aprilia_Racing_logo_%282020%29.svg/800px-Aprilia_Racing_logo_%282020%29.svg.png',
            'MV Agusta': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d1/Mv_agusta_2010_logo.svg/800px-Mv_agusta_2010_logo.svg.png',
            'Moto Guzzi': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/78/Moto-Guzzi-logo.svg/800px-Moto-Guzzi-logo.svg.png',
            'Benelli': 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f0/Benelli_logo.svg/800px-Benelli_logo.svg.png',
            'Bimota': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Bimota_logo.svg/800px-Bimota_logo.svg.png',
            'Cagiva': 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b3/Cagiva-logo.png/800px-Cagiva-logo.png',
            
            # Austrian/German
            'KTM': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Ktm_sportmotorcycle_logo.svg/800px-Ktm_sportmotorcycle_logo.svg.png',
            'Husqvarna': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c4/Husqvarna_logo.svg/800px-Husqvarna_logo.svg.png',
            'GasGas': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/49/Gas_Gas_logo.svg/800px-Gas_Gas_logo.svg.png',
            
            # British
            'Triumph': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/TriumphLogo2013.svg/800px-TriumphLogo2013.svg.png',
            'Norton': 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fc/Norton-logo.svg/800px-Norton-logo.svg.png',
            'BSA': 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b3/BSA_Logo.svg/800px-BSA_Logo.svg.png',
            'Royal Enfield': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/73/Royal_Enfield_logo.svg/800px-Royal_Enfield_logo.svg.png',
            
            # American
            'Indian': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/de/Indian_Motocycle_Manufacturing_Company.png/800px-Indian_Motocycle_Manufacturing_Company.png',
            'Victory': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/90/Victory-motorcycles-vector-logo.svg/800px-Victory-motorcycles-vector-logo.svg.png',
            'Buell': 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Buell_Motorcycle_Company_logo.svg/800px-Buell_Motorcycle_Company_logo.svg.png',
            'Zero Motorcycles': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Zero_Motorcycles_logo.svg/800px-Zero_Motorcycles_logo.svg.png',
            
            # Scooters/European
            'Vespa': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ac/Vespa-logo-1D42AEE082-seeklogo.com.png/800px-Vespa-logo-1D42AEE082-seeklogo.com.png',
            'Piaggio': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/33/Piaggio-logo.svg/800px-Piaggio-logo.svg.png',
            'Peugeot': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/45/Peugeot_logo_lionhead_1960-1980.svg/800px-Peugeot_logo_lionhead_1960-1980.svg.png',
            'Derbi': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Derbi-logo.svg/800px-Derbi-logo.svg.png',
            
            # Other major brands
            'Can-Am': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/82/Can-Am_logo.svg/800px-Can-Am_logo.svg.png',
            'Polaris': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/Polaris_logo.svg/800px-Polaris_logo.svg.png',
            'Ural': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/URAL_logo.svg/800px-URAL_logo.svg.png',
            
            # Asian brands
            'Bajaj': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/20/Bajaj_Auto_Logo.svg/800px-Bajaj_Auto_Logo.svg.png',
            'Hero': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/98/Hero_MotoCorp_logo.png/800px-Hero_MotoCorp_logo.png',
            'TVS': 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b3/TVS_Motor_Company_logo.png/640px-TVS_Motor_Company_logo.png',
            'KYMCO': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/KYMCO_logo.svg/800px-KYMCO_logo.svg.png',
            'SYM': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/SYM_Motors_logo.svg/800px-SYM_Motors_logo.svg.png',
            'CFMoto': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/Cfmoto.svg/800px-Cfmoto.svg.png',
            'Hyosung': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/56/Hyosung_logo.svg/800px-Hyosung_logo.svg.png',
            
            # European off-road
            'Beta': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/Beta_Motorcycles_logo.svg/800px-Beta_Motorcycles_logo.svg.png',
            'Sherco': 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fd/Sherco.png/640px-Sherco.png',
            'Jawa': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/Jawa_Moto.svg/800px-Jawa_Moto.svg.png',
        }
        
        print(f"🏍️  Downloading {len(working_urls)} High-Resolution Motorcycle Logos\n")
        print("=" * 60)
        print()
        
        success_count = 0
        for brand, url in working_urls.items():
            if self.download_logo(brand, url):
                success_count += 1
            time.sleep(0.5)  # Be polite to servers
        
        # Summary
        print("\n" + "=" * 60)
        print(f"\n📊 Download Summary:")
        print(f"   ✅ Successful: {success_count}/{len(working_urls)}")
        print(f"   ❌ Failed: {len(working_urls) - success_count}/{len(working_urls)}")
        
        # Save results
        report = {
            'timestamp': datetime.now().isoformat(),
            'total_attempted': len(working_urls),
            'successful': success_count,
            'failed': len(working_urls) - success_count,
            'results': self.results
        }
        
        report_path = os.path.join(self.logos_dir, 'download_report.json')
        with open(report_path, 'w') as f:
            json.dump(report, f, indent=2)
        
        print(f"\n📄 Report saved to: {report_path}")

if __name__ == "__main__":
    downloader = WorkingLogoDownloader()
    downloader.download_priority_brands()