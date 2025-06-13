#!/usr/bin/env python3
"""
Sitemap-based crawler for sites that block regular crawling.
Falls back to sitemap.xml when regular crawling fails.
"""

import csv
import sys
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import List, Dict
from urllib.parse import urlparse
import requests
from datetime import datetime

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent / 'orchestration'))

from utils_minimal import setup_logging, normalize_url


class SitemapCrawler:
    """Crawl website using sitemap.xml files."""
    
    def __init__(self, domain: str):
        self.domain = domain
        self.logger = setup_logging('sitemap_crawler', Path(__file__).parent / 'sitemap.log')
        self.output_file = Path(__file__).parent / 'dump.csv'
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
        })
    
    def fetch_sitemap(self, url: str) -> str:
        """Fetch sitemap content."""
        try:
            self.logger.info(f"Fetching sitemap: {url}")
            response = self.session.get(url, timeout=30)
            response.raise_for_status()
            return response.text
        except Exception as e:
            self.logger.error(f"Error fetching {url}: {e}")
            return ""
    
    def parse_sitemap_index(self, content: str) -> List[str]:
        """Parse sitemap index to get individual sitemap URLs."""
        sitemaps = []
        try:
            root = ET.fromstring(content)
            # Handle sitemap index
            for sitemap in root.findall('.//{http://www.sitemaps.org/schemas/sitemap/0.9}sitemap'):
                loc = sitemap.find('{http://www.sitemaps.org/schemas/sitemap/0.9}loc')
                if loc is not None and loc.text:
                    sitemaps.append(loc.text)
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
                changefreq = url.find('{http://www.sitemaps.org/schemas/sitemap/0.9}changefreq')
                priority = url.find('{http://www.sitemaps.org/schemas/sitemap/0.9}priority')
                
                if loc is not None and loc.text:
                    url_data = {
                        'url': normalize_url(loc.text),
                        'last_modified': lastmod.text if lastmod is not None else '',
                        'changefreq': changefreq.text if changefreq is not None else '',
                        'priority': priority.text if priority is not None else ''
                    }
                    urls.append(url_data)
        except Exception as e:
            self.logger.error(f"Error parsing sitemap: {e}")
        return urls
    
    def crawl(self) -> Dict[str, Dict]:
        """Crawl website using sitemaps."""
        self.logger.info(f"Starting sitemap crawl for {self.domain}")
        
        # Start with robots.txt to find sitemap
        robots_url = f"https://{self.domain}/robots.txt"
        sitemap_urls = []
        
        try:
            response = self.session.get(robots_url, timeout=10)
            if response.status_code == 200:
                for line in response.text.split('\n'):
                    if line.lower().startswith('sitemap:'):
                        sitemap_url = line.split(':', 1)[1].strip()
                        sitemap_urls.append(sitemap_url)
                        self.logger.info(f"Found sitemap in robots.txt: {sitemap_url}")
        except Exception as e:
            self.logger.warning(f"Could not fetch robots.txt: {e}")
        
        # Fallback to common sitemap locations
        if not sitemap_urls:
            sitemap_urls = [
                f"https://{self.domain}/sitemap.xml",
                f"https://www.{self.domain}/sitemap.xml",
                f"https://{self.domain}/sitemap_index.xml",
                f"https://www.{self.domain}/sitemap_index.xml",
            ]
        
        all_urls = {}
        
        for sitemap_url in sitemap_urls:
            content = self.fetch_sitemap(sitemap_url)
            if not content:
                continue
            
            # Check if it's a sitemap index
            if '<sitemapindex' in content:
                self.logger.info(f"Found sitemap index at {sitemap_url}")
                sub_sitemaps = self.parse_sitemap_index(content)
                
                # Limit to first 10 sitemaps for testing
                max_sitemaps = 10
                self.logger.info(f"Processing first {max_sitemaps} of {len(sub_sitemaps)} sitemaps")
                
                for i, sub_sitemap in enumerate(sub_sitemaps[:max_sitemaps]):
                    sub_content = self.fetch_sitemap(sub_sitemap)
                    if sub_content:
                        urls = self.parse_sitemap(sub_content)
                        self.logger.info(f"Found {len(urls)} URLs in {sub_sitemap}")
                        for url_data in urls:
                            # Add metadata
                            url_data.update({
                                'status_code': 200,  # Assumed from sitemap
                                'content_type': 'text/html',  # Assumed
                                'size': 0,  # Unknown from sitemap
                            })
                            all_urls[url_data['url']] = url_data
            else:
                # Regular sitemap
                self.logger.info(f"Found sitemap at {sitemap_url}")
                urls = self.parse_sitemap(content)
                self.logger.info(f"Found {len(urls)} URLs in {sitemap_url}")
                for url_data in urls:
                    # Add metadata
                    url_data.update({
                        'status_code': 200,  # Assumed from sitemap
                        'content_type': 'text/html',  # Assumed
                        'size': 0,  # Unknown from sitemap
                    })
                    all_urls[url_data['url']] = url_data
        
        self.logger.info(f"Total unique URLs found: {len(all_urls)}")
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
                row = {
                    'url': url,
                    'status_code': url_metadata[url].get('status_code', 200),
                    'content_type': url_metadata[url].get('content_type', 'text/html'),
                    'size': url_metadata[url].get('size', 0),
                    'last_modified': url_metadata[url].get('last_modified', '')
                }
                writer.writerow(row)
        
        self.logger.info(f"Saved {len(sorted_urls)} URLs to {self.output_file}")


def main():
    """Main entry point."""
    if len(sys.argv) < 2:
        print("Usage: python sitemap_crawler.py <domain>")
        sys.exit(1)
    
    domain = sys.argv[1].replace('https://', '').replace('http://', '').rstrip('/')
    
    crawler = SitemapCrawler(domain)
    url_metadata = crawler.crawl()
    
    if url_metadata:
        crawler.save_dump_csv(url_metadata)
        print(f"\nSitemap crawl complete! Found {len(url_metadata)} URLs")
        print(f"Results saved to: {crawler.output_file}")
    else:
        print("\nSitemap crawl failed - no URLs found")
        sys.exit(1)


if __name__ == '__main__':
    main()