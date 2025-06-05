#!/usr/bin/env python3
"""
Automated Logo Finder
Searches for and documents motorcycle brand logos from various sources
"""

import os
import json
import time
from urllib.parse import quote
from datetime import datetime

class LogoFinder:
    def __init__(self, base_dir="/Users/kevintong/Documents/Code/bikenode.com"):
        self.base_dir = base_dir
        self.logos_dir = os.path.join(base_dir, "logos", "motorcycle-brands")
        self.found_logos = os.path.join(self.logos_dir, "found_logos.json")
        
    def search_logo_sources(self, brand_name, website=None):
        """Search various sources for logo URLs"""
        results = {
            'brand': brand_name,
            'searched_at': datetime.now().isoformat(),
            'potential_sources': []
        }
        
        # Clean brand name
        search_term = brand_name.replace('-', ' ').replace('_', ' ')
        
        # Seeklogo search
        seeklogo_url = f"https://seeklogo.com/search?q={quote(search_term)}"
        results['potential_sources'].append({
            'source': 'Seeklogo',
            'search_url': seeklogo_url,
            'notes': 'Usually has PNG with transparent background'
        })
        
        # Brands of the World
        botw_url = f"https://www.brandsoftheworld.com/search/logo?search_api_views_fulltext={quote(search_term)}"
        results['potential_sources'].append({
            'source': 'Brands of the World',
            'search_url': botw_url,
            'notes': 'Professional logo database, may require account'
        })
        
        # Wikipedia Commons
        wiki_url = f"https://commons.wikimedia.org/w/index.php?search={quote(search_term + ' logo')}"
        results['potential_sources'].append({
            'source': 'Wikimedia Commons',
            'search_url': wiki_url,
            'notes': 'Often has SVG versions that can be converted to PNG'
        })
        
        # Official website media kit
        if website and website != 'N/A' and website.startswith('http'):
            results['potential_sources'].append({
                'source': 'Official Website',
                'search_url': website,
                'notes': 'Check /media, /press, /about, or /downloads pages'
            })
            
        # Logo collections on GitHub
        github_searches = [
            f"https://github.com/search?q={quote(search_term + ' logo')}+extension%3Apng",
            f"https://github.com/search?q=motorcycle+logos+{quote(search_term)}"
        ]
        for gh_url in github_searches:
            results['potential_sources'].append({
                'source': 'GitHub',
                'search_url': gh_url,
                'notes': 'May find logo collections or brand assets'
            })
            
        return results
    
    def generate_wget_commands(self, brand_name, logo_url):
        """Generate wget command to download logo"""
        filename = brand_name.lower().replace(' ', '_').replace('-', '_') + '.png'
        filepath = os.path.join(self.logos_dir, filename)
        
        # Basic wget command
        wget_cmd = f'wget -O "{filepath}" "{logo_url}"'
        
        # Alternative with user agent (some sites block wget)
        wget_ua_cmd = f'wget -O "{filepath}" --user-agent="Mozilla/5.0" "{logo_url}"'
        
        # curl alternative
        curl_cmd = f'curl -L -o "{filepath}" "{logo_url}"'
        
        return {
            'filename': filename,
            'wget': wget_cmd,
            'wget_with_ua': wget_ua_cmd,
            'curl': curl_cmd
        }
    
    def create_download_script(self, brands_list):
        """Create a shell script for batch downloading"""
        script_path = os.path.join(self.logos_dir, "download_logos.sh")
        
        with open(script_path, 'w') as f:
            f.write("#!/bin/bash\n")
            f.write("# Motorcycle Brand Logo Download Script\n")
            f.write(f"# Generated: {datetime.now().isoformat()}\n\n")
            f.write("# Create logo directory if it doesn't exist\n")
            f.write(f'mkdir -p "{self.logos_dir}"\n\n')
            f.write("# Download commands will be added here as logos are found\n")
            f.write("# Format: wget -O \"brand_name.png\" \"logo_url\"\n\n")
            
            # Add example downloads for major brands
            f.write("# Example downloads (replace with actual URLs):\n")
            examples = [
                "# wget -O \"harley_davidson.png\" \"https://example.com/harley_logo.png\"",
                "# wget -O \"honda.png\" \"https://example.com/honda_logo.png\"",
                "# wget -O \"yamaha.png\" \"https://example.com/yamaha_logo.png\"",
                "# wget -O \"kawasaki.png\" \"https://example.com/kawasaki_logo.png\"",
                "# wget -O \"suzuki.png\" \"https://example.com/suzuki_logo.png\""
            ]
            for ex in examples:
                f.write(f"{ex}\n")
                
        os.chmod(script_path, 0o755)
        print(f"Download script created: {script_path}")
        
    def search_all_brands(self, csv_file):
        """Search for logos for all brands and save results"""
        import csv
        
        all_results = []
        
        with open(csv_file, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for i, row in enumerate(reader):
                brand = row['Manufacturer']
                website = row['Official_Website']
                status = row['Status']
                
                # Search for this brand
                print(f"Searching for {brand}...")
                results = self.search_logo_sources(brand, website)
                results['status'] = status
                all_results.append(results)
                
                # Save progress every 10 brands
                if (i + 1) % 10 == 0:
                    self.save_results(all_results)
                    print(f"Progress saved: {i + 1} brands searched")
                
                # Small delay to be respectful
                time.sleep(0.1)
        
        self.save_results(all_results)
        return all_results
    
    def save_results(self, results):
        """Save search results to JSON file"""
        with open(self.found_logos, 'w') as f:
            json.dump(results, f, indent=2)
        print(f"Results saved to: {self.found_logos}")
        
    def generate_manual_review_html(self):
        """Generate HTML file for manual review of found logos"""
        if not os.path.exists(self.found_logos):
            print("No search results found. Run search_all_brands first.")
            return
            
        with open(self.found_logos, 'r') as f:
            results = json.load(f)
            
        html_path = os.path.join(self.logos_dir, "logo_review.html")
        
        with open(html_path, 'w') as f:
            f.write("""<!DOCTYPE html>
<html>
<head>
    <title>Motorcycle Logo Search Results</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .brand { margin-bottom: 30px; padding: 15px; background: #f5f5f5; border-radius: 5px; }
        .brand h3 { margin-top: 0; }
        .source { margin: 10px 0; padding: 10px; background: white; border-radius: 3px; }
        .source a { color: #007bff; text-decoration: none; }
        .source a:hover { text-decoration: underline; }
        .notes { color: #666; font-size: 14px; }
        .active { border-left: 5px solid #28a745; }
        .defunct { border-left: 5px solid #dc3545; }
    </style>
</head>
<body>
    <h1>Motorcycle Logo Search Results</h1>
    <p>Review each brand's potential logo sources. Click links to verify logos are available.</p>
    <hr>
""")
            
            for result in results:
                status_class = 'active' if 'Active' in result.get('status', '') else 'defunct'
                f.write(f'<div class="brand {status_class}">\n')
                f.write(f'<h3>{result["brand"]}</h3>\n')
                f.write(f'<div class="notes">Status: {result.get("status", "Unknown")}</div>\n')
                
                for source in result['potential_sources']:
                    f.write('<div class="source">\n')
                    f.write(f'<strong>{source["source"]}:</strong> ')
                    f.write(f'<a href="{source["search_url"]}" target="_blank">{source["search_url"]}</a><br>\n')
                    f.write(f'<span class="notes">{source["notes"]}</span>\n')
                    f.write('</div>\n')
                
                f.write('</div>\n')
            
            f.write("""
</body>
</html>
""")
        
        print(f"Review HTML created: {html_path}")

if __name__ == "__main__":
    finder = LogoFinder()
    
    # Create download script template
    finder.create_download_script([])
    
    # Generate review HTML if results exist
    finder.generate_manual_review_html()
    
    print("\nNext steps:")
    print("1. Run finder.search_all_brands() to generate search URLs for all brands")
    print("2. Open logo_review.html to review potential sources")
    print("3. Add actual download URLs to download_logos.sh")
    print("4. Run the download script to batch download logos")