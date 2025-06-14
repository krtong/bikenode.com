#!/usr/bin/env python3
"""
Special crawler for RevZilla that uses curl user agent to access sitemap.
RevZilla blocks most user agents but allows curl.
"""

import csv
import sys
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import List, Dict, Optional
import requests
from datetime import datetime
import time
import random

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent / 'orchestration'))

from utils_minimal import setup_logging, normalize_url


class RevZillaCrawler:
    """Specialized crawler for RevZilla using curl user agent."""
    
    def __init__(self):
        self.domain = 'revzilla.com'
        self.logger = setup_logging('revzilla_crawler', Path(__file__).parent / 'revzilla.log')
        self.output_file = Path(__file__).parent / 'dump.csv'
        self.session = self._setup_session()
        
    def _setup_session(self) -> requests.Session:
        """Set up requests session with curl user agent."""
        session = requests.Session()
        
        # Use curl user agent which RevZilla allows
        session.headers.update({
            'User-Agent': 'curl/7.64.1',
            'Accept': '*/*',
        })
        
        return session
    
    def fetch_content(self, url: str) -> Optional[str]:
        """Fetch content using curl user agent."""
        try:
            self.logger.info(f"Fetching: {url}")
            
            # Small delay to be polite
            time.sleep(random.uniform(0.5, 1.0))
            
            response = self.session.get(url, timeout=30)
            response.raise_for_status()
            
            return response.text
            
        except Exception as e:
            self.logger.error(f"Error fetching {url}: {e}")
            return None
    
    def parse_sitemap_index(self, content: str) -> List[str]:
        """Parse sitemap index to get individual sitemap URLs."""
        sitemaps = []
        try:
            root = ET.fromstring(content)
            
            # Handle sitemap index
            for sitemap in root.findall('.//{http://www.sitemaps.org/schemas/sitemap/0.9}sitemap'):
                loc = sitemap.find('{http://www.sitemaps.org/schemas/sitemap/0.9}loc')
                if loc is not None and loc.text:
                    sitemaps.append(loc.text.strip())
                    
        except Exception as e:
            self.logger.error(f"Error parsing sitemap index: {e}")
            
        return sitemaps
    
    def parse_sitemap(self, content: str) -> List[Dict[str, str]]:
        """Parse sitemap to get URLs."""
        urls = []
        try:
            root = ET.fromstring(content)
            
            # Handle regular sitemap
            for url in root.findall('.//{http://www.sitemaps.org/schemas/sitemap/0.9}url'):
                loc = url.find('{http://www.sitemaps.org/schemas/sitemap/0.9}loc')
                lastmod = url.find('{http://www.sitemaps.org/schemas/sitemap/0.9}lastmod')
                
                if loc is not None and loc.text:
                    url_data = {
                        'url': normalize_url(loc.text.strip()),
                        'last_modified': lastmod.text.strip() if lastmod is not None and lastmod.text else '',
                        'status_code': 200,  # Assumed from sitemap
                        'content_type': 'text/html',  # Assumed
                        'size': 0,  # Unknown from sitemap
                    }
                    urls.append(url_data)
                    
        except Exception as e:
            self.logger.error(f"Error parsing sitemap: {e}")
            
        return urls
    
    def crawl(self, max_sitemaps: int = 50) -> Dict[str, Dict]:
        """Crawl RevZilla using sitemaps."""
        self.logger.info("Starting RevZilla sitemap crawl")
        
        # First, get robots.txt to confirm sitemap location
        robots_content = self.fetch_content(f"https://www.{self.domain}/robots.txt")
        if robots_content:
            self.logger.info("Successfully fetched robots.txt")
            # Extract sitemap URL from robots.txt
            for line in robots_content.split('\n'):
                if line.lower().startswith('sitemap:'):
                    sitemap_url = line.split(':', 1)[1].strip()
                    self.logger.info(f"Found sitemap URL in robots.txt: {sitemap_url}")
        
        # Fetch the main sitemap
        sitemap_url = f"https://www.{self.domain}/sitemap.xml"
        sitemap_content = self.fetch_content(sitemap_url)
        
        if not sitemap_content:
            self.logger.error("Failed to fetch main sitemap")
            return {}
        
        self.logger.info("Successfully fetched main sitemap")
        
        # Parse the sitemap index
        sub_sitemaps = self.parse_sitemap_index(sitemap_content)
        self.logger.info(f"Found {len(sub_sitemaps)} sub-sitemaps")
        
        all_urls = {}
        processed_count = 0
        
        # Process sub-sitemaps
        for sitemap_url in sub_sitemaps:
            if processed_count >= max_sitemaps:
                self.logger.info(f"Reached max sitemap limit of {max_sitemaps}")
                break
                
            # Skip product sitemaps after the first few pages for testing
            if 'sitemap_products.xml' in sitemap_url and '?page=' in sitemap_url:
                page_num = int(sitemap_url.split('page=')[1])
                if page_num > 5:  # Only process first 5 pages of products
                    self.logger.info(f"Skipping product page {page_num}")
                    continue
                    
            content = self.fetch_content(sitemap_url)
            if content:
                urls = self.parse_sitemap(content)
                self.logger.info(f"Found {len(urls)} URLs in {sitemap_url}")
                
                for url_data in urls:
                    all_urls[url_data['url']] = url_data
                    
                processed_count += 1
            else:
                self.logger.warning(f"Failed to fetch {sitemap_url}")
        
        self.logger.info(f"Total unique URLs found: {len(all_urls)}")
        self.logger.info(f"Processed {processed_count} sitemaps")
        
        return all_urls
    
    def save_dump_csv(self, url_metadata: Dict[str, Dict]) -> None:
        """Save URL metadata to dump.csv."""
        if not url_metadata:
            self.logger.error("No URLs found!")
            return
        
        # Sort URLs
        sorted_urls = sorted(url_metadata.keys())
        
        # Write CSV
        with open(self.output_file, 'w', newline='', encoding='utf-8') as f:
            fieldnames = ['url', 'status_code', 'content_type', 'size', 'last_modified']
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            
            for url in sorted_urls:
                writer.writerow(url_metadata[url])
        
        self.logger.info(f"Saved {len(sorted_urls)} URLs to {self.output_file}")
    
    def get_url_stats(self, url_metadata: Dict[str, Dict]) -> None:
        """Print statistics about discovered URLs."""
        if not url_metadata:
            return
            
        # Count URLs by type
        url_types = {}
        brands = {}
        
        for url in url_metadata:
            # URL type classification
            if '/motorcycle-' in url and url.endswith('.html'):
                url_type = 'product'
                
                # Extract brand from URL if possible
                parts = url.split('/')
                for part in parts:
                    if '-motorcycle-' in part:
                        brand = part.split('-motorcycle-')[0].split('-')[-1]
                        brands[brand] = brands.get(brand, 0) + 1
                        break
                        
            elif any(cat in url for cat in ['/motorcycle-helmets', '/motorcycle-jackets', '/motorcycle-gloves', '/motorcycle-boots']):
                url_type = 'category'
            elif '/common-tread/' in url:
                url_type = 'blog'
            elif url.endswith('/'):
                url_type = 'navigation'
            else:
                url_type = 'other'
                
            url_types[url_type] = url_types.get(url_type, 0) + 1
        
        print("\nURL Statistics:")
        print(f"Total URLs: {len(url_metadata)}")
        print("\nBy Type:")
        for url_type, count in sorted(url_types.items(), key=lambda x: x[1], reverse=True):
            print(f"  {url_type}: {count}")
            
        if brands:
            print("\nTop Brands:")
            for brand, count in sorted(brands.items(), key=lambda x: x[1], reverse=True)[:10]:
                print(f"  {brand}: {count}")


def main():
    """Main entry point."""
    crawler = RevZillaCrawler()
    
    # Get max sitemaps from command line or use default
    max_sitemaps = int(sys.argv[1]) if len(sys.argv) > 1 else 10
    
    url_metadata = crawler.crawl(max_sitemaps=max_sitemaps)
    
    if url_metadata:
        crawler.save_dump_csv(url_metadata)
        print(f"\nRevZilla crawl complete! Found {len(url_metadata)} URLs")
        print(f"Results saved to: {crawler.output_file}")
        crawler.get_url_stats(url_metadata)
    else:
        print("\nRevZilla crawl failed - no URLs found")
        sys.exit(1)


if __name__ == '__main__':
    main()