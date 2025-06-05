#!/usr/bin/env python3
"""
Find Valid Logo URLs from Wikipedia/Wikimedia
Tests various URL patterns to find working high-resolution logos
"""

import urllib.request
import urllib.parse
import json
from datetime import datetime

class LogoURLFinder:
    def __init__(self):
        self.valid_urls = {}
        self.tested_urls = []
        
    def test_url(self, url):
        """Test if a URL is valid and returns an image"""
        try:
            req = urllib.request.Request(url, headers={
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
            })
            response = urllib.request.urlopen(req, timeout=5)
            content_type = response.headers.get('content-type', '').lower()
            
            if any(img_type in content_type for img_type in ['image/', 'application/octet-stream']):
                return True
            return False
        except:
            return False
    
    def find_wikimedia_logo(self, brand_name, variations):
        """Try multiple URL patterns for a brand"""
        found_urls = []
        
        # Try different hash directories (first 2 chars of MD5)
        hash_dirs = ['0/0', '1/1', '2/2', '3/3', '4/4', '5/5', '6/6', '7/7', '8/8', '9/9',
                     'a/a', 'b/b', 'c/c', 'd/d', 'e/e', 'f/f',
                     '0/01', '0/02', '0/03', '0/04', '0/05', '0/06', '0/07', '0/08', '0/09',
                     '1/10', '1/11', '1/12', '1/13', '1/14', '1/15', '1/16', '1/17', '1/18', '1/19',
                     '2/20', '2/21', '2/22', '2/23', '2/24', '2/25', '2/26', '2/27', '2/28', '2/29',
                     '3/30', '3/31', '3/32', '3/33', '3/34', '3/35', '3/36', '3/37', '3/38', '3/39',
                     '4/40', '4/41', '4/42', '4/43', '4/44', '4/45', '4/46', '4/47', '4/48', '4/49',
                     '5/50', '5/51', '5/52', '5/53', '5/54', '5/55', '5/56', '5/57', '5/58', '5/59',
                     '6/60', '6/61', '6/62', '6/63', '6/64', '6/65', '6/66', '6/67', '6/68', '6/69',
                     '7/70', '7/71', '7/72', '7/73', '7/74', '7/75', '7/76', '7/77', '7/78', '7/79',
                     '8/80', '8/81', '8/82', '8/83', '8/84', '8/85', '8/86', '8/87', '8/88', '8/89',
                     '9/90', '9/91', '9/92', '9/93', '9/94', '9/95', '9/96', '9/97', '9/98', '9/99',
                     'a/a0', 'a/a1', 'a/a2', 'a/a3', 'a/a4', 'a/a5', 'a/a6', 'a/a7', 'a/a8', 'a/a9', 'a/aa', 'a/ab', 'a/ac', 'a/ad', 'a/ae', 'a/af',
                     'b/b0', 'b/b1', 'b/b2', 'b/b3', 'b/b4', 'b/b5', 'b/b6', 'b/b7', 'b/b8', 'b/b9', 'b/ba', 'b/bb', 'b/bc', 'b/bd', 'b/be', 'b/bf',
                     'c/c0', 'c/c1', 'c/c2', 'c/c3', 'c/c4', 'c/c5', 'c/c6', 'c/c7', 'c/c8', 'c/c9', 'c/ca', 'c/cb', 'c/cc', 'c/cd', 'c/ce', 'c/cf',
                     'd/d0', 'd/d1', 'd/d2', 'd/d3', 'd/d4', 'd/d5', 'd/d6', 'd/d7', 'd/d8', 'd/d9', 'd/da', 'd/db', 'd/dc', 'd/dd', 'd/de', 'd/df',
                     'e/e0', 'e/e1', 'e/e2', 'e/e3', 'e/e4', 'e/e5', 'e/e6', 'e/e7', 'e/e8', 'e/e9', 'e/ea', 'e/eb', 'e/ec', 'e/ed', 'e/ee', 'e/ef',
                     'f/f0', 'f/f1', 'f/f2', 'f/f3', 'f/f4', 'f/f5', 'f/f6', 'f/f7', 'f/f8', 'f/f9', 'f/fa', 'f/fb', 'f/fc', 'f/fd', 'f/fe', 'f/ff']
        
        for variation in variations:
            for hash_dir in hash_dirs:
                # SVG with PNG render
                urls = [
                    f"https://upload.wikimedia.org/wikipedia/commons/thumb/{hash_dir}/{variation}.svg/1200px-{variation}.svg.png",
                    f"https://upload.wikimedia.org/wikipedia/commons/thumb/{hash_dir}/{variation}.svg/800px-{variation}.svg.png",
                    # Direct PNG
                    f"https://upload.wikimedia.org/wikipedia/commons/{hash_dir}/{variation}.png",
                    # JPG
                    f"https://upload.wikimedia.org/wikipedia/commons/{hash_dir}/{variation}.jpg",
                    f"https://upload.wikimedia.org/wikipedia/commons/{hash_dir}/{variation}.jpeg",
                    # English Wikipedia
                    f"https://upload.wikimedia.org/wikipedia/en/{hash_dir}/{variation}.png",
                    f"https://upload.wikimedia.org/wikipedia/en/thumb/{hash_dir}/{variation}.png/1200px-{variation}.png",
                ]
                
                for url in urls:
                    if url not in self.tested_urls:
                        self.tested_urls.append(url)
                        if self.test_url(url):
                            found_urls.append(url)
                            print(f"  ✓ Found: {url}")
                            return url  # Return first working URL
        
        return None
    
    def search_priority_brands(self):
        """Search for high-priority motorcycle brand logos"""
        brands = {
            'Yamaha': ['Yamaha_Motor_logo', 'Yamaha_logo', 'Yamaha_Motor_Company_logo', 'Yamaha-logo', 'Yamaha_Motorcycles_logo'],
            'Kawasaki': ['Kawasaki_motorcycles_logo', 'Kawasaki_logo', 'Kawasaki_Heavy_Industries_logo', 'Kawasaki-logo', 'Kawasaki_Motors_logo'],
            'Suzuki': ['Suzuki_logo_2', 'Suzuki_logo', 'Suzuki_Motor_Corporation_logo', 'Suzuki-logo', 'Suzuki_motorcycles_logo'],
            'Ducati': ['Ducati_red_logo', 'Ducati_logo', 'Ducati_Motor_logo', 'Ducati-logo', 'Ducati_Corse_logo', 'Ducati_red_logo_PNG'],
            'KTM': ['KTM-Sportmotorcycle_logo', 'KTM_logo', 'KTM-logo', 'KTM_Racing_logo', 'KTM_Motorcycles_logo'],
            'Triumph': ['Triumph_Motorcycles_logo', 'Triumph_logo', 'Triumph-logo', 'Triumph_Engineering_logo'],
            'Aprilia': ['Aprilia-logo', 'Aprilia_logo', 'Aprilia_Racing_logo', 'Aprilia_motorcycles_logo'],
            'MV Agusta': ['MV-Agusta-Logo', 'MV_Agusta_logo', 'MVAgusta_logo', 'MV_Agusta-logo'],
            'Harley-Davidson': ['Harley-Davidson_logo', 'Harley_Davidson_logo', 'Harley-Davidson-logo', 'HD_logo'],
            'BMW Motorrad': ['BMW', 'BMW_logo', 'BMW-logo', 'BMW_Motorrad_logo'],
            'Royal Enfield': ['Royal-Enfield-Logo', 'Royal_Enfield_logo', 'RoyalEnfield_logo', 'Royal_Enfield-logo'],
            'Norton': ['Norton_Motorcycle_Company_logo', 'Norton_logo', 'Norton-logo', 'Norton_Motorcycles_logo'],
            'Vespa': ['Vespa_logo', 'Vespa-logo', 'Piaggio_Vespa_logo'],
            'Indian': ['Indian_Motorcycle_logo', 'Indian_logo', 'Indian-logo', 'Indian_Motorcycles_logo'],
            'Zero': ['Zero_Motorcycles_logo', 'Zero_logo', 'Zero-logo', 'Zero_Electric_logo'],
            'Can-Am': ['Can-Am_logo', 'CanAm_logo', 'Can_Am_logo', 'BRP_Can-Am_logo'],
            'Husqvarna': ['Husqvarna_Motorcycles_logo', 'Husqvarna_logo', 'Husqvarna-logo'],
            'Moto Guzzi': ['Moto_Guzzi_logo', 'Moto-Guzzi_logo', 'MotoGuzzi_logo'],
            'BSA': ['BSA_motorcycles_logo', 'BSA_logo', 'BSA-logo', 'Birmingham_Small_Arms_logo'],
            'Beta': ['Beta_logo', 'Beta-logo', 'Beta_Motor_logo', 'Beta_motorcycles_logo'],
        }
        
        print("Searching for valid high-resolution logo URLs...\n")
        
        for brand, variations in brands.items():
            print(f"\nSearching for {brand}...")
            url = self.find_wikimedia_logo(brand, variations)
            if url:
                self.valid_urls[brand] = url
            else:
                print(f"  ✗ No valid URL found")
        
        # Save results
        results = {
            'timestamp': datetime.now().isoformat(),
            'total_brands': len(brands),
            'found': len(self.valid_urls),
            'urls': self.valid_urls,
            'total_tested': len(self.tested_urls)
        }
        
        with open('valid_logo_urls.json', 'w') as f:
            json.dump(results, f, indent=2)
        
        print(f"\n\n📊 Search Summary:")
        print(f"   Brands searched: {len(brands)}")
        print(f"   Valid URLs found: {len(self.valid_urls)}")
        print(f"   Total URLs tested: {len(self.tested_urls)}")
        print(f"\n   Results saved to: valid_logo_urls.json")

if __name__ == "__main__":
    finder = LogoURLFinder()
    finder.search_priority_brands()