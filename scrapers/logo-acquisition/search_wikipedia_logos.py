#!/usr/bin/env python3
"""
Search for Motorcycle Brand Logos on Wikipedia
Finds actual working URLs by parsing Wikipedia pages
"""

import urllib.request
import urllib.parse
import re
import json
from datetime import datetime

class WikipediaLogoFinder:
    def __init__(self):
        self.base_url = "https://en.wikipedia.org/wiki/"
        self.commons_base = "https://upload.wikimedia.org/wikipedia/commons/"
        self.found_logos = {}
        
    def get_wikipedia_page(self, brand_name):
        """Fetch Wikipedia page content"""
        # Common Wikipedia page name patterns for motorcycle brands
        page_names = [
            brand_name.replace(' ', '_'),
            brand_name.replace(' ', '_') + '_Motor_Company',
            brand_name.replace(' ', '_') + '_Motorcycles',
            brand_name.replace(' ', '_') + '_(motorcycles)',
            brand_name.replace(' ', '_') + '_Motor_Corporation',
        ]
        
        for page_name in page_names:
            try:
                url = self.base_url + urllib.parse.quote(page_name)
                req = urllib.request.Request(url, headers={
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
                })
                response = urllib.request.urlopen(req, timeout=10)
                content = response.read().decode('utf-8')
                print(f"  ✓ Found Wikipedia page: {page_name}")
                return content, url
            except:
                continue
        
        return None, None
    
    def extract_logo_urls(self, content):
        """Extract logo URLs from Wikipedia page content"""
        logo_urls = []
        
        # Pattern 1: Direct commons URLs in the page
        commons_pattern = r'//upload\.wikimedia\.org/wikipedia/commons/[^"\s]+\.(?:png|svg|jpg|jpeg)'
        commons_matches = re.findall(commons_pattern, content)
        
        # Pattern 2: Thumbnail URLs that we can modify
        thumb_pattern = r'//upload\.wikimedia\.org/wikipedia/commons/thumb/[^/]+/[^/]+/([^/]+)/(\d+)px-[^"\s]+\.(?:png|jpg|jpeg)'
        thumb_matches = re.findall(thumb_pattern, content)
        
        # Convert to full URLs
        for match in commons_matches:
            url = 'https:' + match
            # Skip thumbnails, we want originals
            if '/thumb/' not in url:
                logo_urls.append(url)
            else:
                # Extract original from thumbnail URL
                # Example: /thumb/4/47/Logo.svg/200px-Logo.svg.png -> /4/47/Logo.svg
                parts = url.split('/thumb/')
                if len(parts) > 1:
                    thumb_parts = parts[1].split('/')
                    if len(thumb_parts) >= 3:
                        # Reconstruct original URL
                        original = parts[0] + '/' + '/'.join(thumb_parts[:3])
                        # If it's an SVG rendered as PNG, get the larger version
                        if original.endswith('.svg') and url.endswith('.png'):
                            # Get 1200px version
                            large_url = url.replace('/200px-', '/1200px-').replace('/300px-', '/1200px-').replace('/400px-', '/1200px-').replace('/500px-', '/1200px-').replace('/600px-', '/1200px-').replace('/800px-', '/1200px-')
                            logo_urls.append(large_url)
                        else:
                            logo_urls.append(original)
        
        # Look specifically for logo in infobox
        infobox_pattern = r'logo\s*=\s*\[\[File:([^\]|]+)'
        infobox_matches = re.findall(infobox_pattern, content, re.IGNORECASE)
        
        return list(set(logo_urls))  # Remove duplicates
    
    def test_and_select_best_url(self, urls):
        """Test URLs and select the highest resolution one"""
        working_urls = []
        
        for url in urls:
            try:
                req = urllib.request.Request(url, headers={
                    'User-Agent': 'Mozilla/5.0'
                })
                response = urllib.request.urlopen(req, timeout=5)
                content_type = response.headers.get('content-type', '').lower()
                content_length = int(response.headers.get('content-length', 0))
                
                if 'image' in content_type and content_length > 1000:  # At least 1KB
                    # Extract resolution from URL if possible
                    res_match = re.search(r'/(\d+)px-', url)
                    resolution = int(res_match.group(1)) if res_match else 0
                    
                    working_urls.append({
                        'url': url,
                        'size': content_length,
                        'resolution': resolution,
                        'type': content_type
                    })
                    print(f"    ✓ Valid logo URL: {url} ({content_length//1024}KB)")
            except Exception as e:
                pass
        
        # Sort by resolution (highest first), then by file size
        working_urls.sort(key=lambda x: (x['resolution'], x['size']), reverse=True)
        
        return working_urls[0]['url'] if working_urls else None
    
    def search_brand(self, brand_name):
        """Search for a brand's logo on Wikipedia"""
        print(f"\n🔍 Searching for {brand_name}...")
        
        # Get Wikipedia page
        content, wiki_url = self.get_wikipedia_page(brand_name)
        if not content:
            print(f"  ✗ No Wikipedia page found")
            return None
        
        # Extract logo URLs
        logo_urls = self.extract_logo_urls(content)
        if not logo_urls:
            print(f"  ✗ No logo URLs found on page")
            return None
        
        print(f"  📎 Found {len(logo_urls)} potential logo URLs")
        
        # Test and select best URL
        best_url = self.test_and_select_best_url(logo_urls)
        if best_url:
            self.found_logos[brand_name] = {
                'url': best_url,
                'wikipedia_page': wiki_url
            }
            return best_url
        else:
            print(f"  ✗ No working logo URLs")
            return None
    
    def search_priority_brands(self):
        """Search for all priority motorcycle brands"""
        priority_brands = [
            # Japanese Big 4
            'Yamaha Motor Company', 'Kawasaki', 'Suzuki', 'Honda',
            # Italian
            'Ducati', 'Aprilia', 'MV Agusta', 'Moto Guzzi', 'Benelli', 'Bimota',
            # European
            'KTM', 'Husqvarna Motorcycles', 'Triumph Motorcycles', 'BMW Motorrad',
            'Norton Motorcycle Company', 'BSA motorcycles', 'Royal Enfield',
            # American
            'Harley-Davidson', 'Indian Motorcycle', 'Victory Motorcycles', 
            'Buell Motorcycle Company', 'Zero Motorcycles',
            # Others
            'Vespa', 'Piaggio', 'Can-Am motorcycles', 'Polaris Industries',
            'Bajaj Auto', 'Hero MotoCorp', 'TVS Motor Company',
            'Kymco', 'SYM Motors', 'CFMoto',
            # Off-road
            'Beta motorcycles', 'Sherco', 'Gas Gas', 'Jawa',
        ]
        
        print("🏍️  Wikipedia Motorcycle Logo Search")
        print("=" * 60)
        
        for brand in priority_brands:
            self.search_brand(brand)
        
        # Save results
        results = {
            'timestamp': datetime.now().isoformat(),
            'total_searched': len(priority_brands),
            'found': len(self.found_logos),
            'logos': self.found_logos
        }
        
        with open('wikipedia_logo_urls.json', 'w') as f:
            json.dump(results, f, indent=2)
        
        print("\n" + "=" * 60)
        print(f"\n📊 Search Results:")
        print(f"   Brands searched: {len(priority_brands)}")
        print(f"   Logos found: {len(self.found_logos)}")
        print(f"\n💾 Results saved to: wikipedia_logo_urls.json")
        
        # Print found URLs for easy copying
        if self.found_logos:
            print("\n📋 Found Logo URLs:")
            print("-" * 60)
            for brand, data in self.found_logos.items():
                print(f"\n{brand}:")
                print(f"  URL: {data['url']}")
                print(f"  Wiki: {data['wikipedia_page']}")

if __name__ == "__main__":
    finder = WikipediaLogoFinder()
    finder.search_priority_brands()