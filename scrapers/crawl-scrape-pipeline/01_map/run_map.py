#!/usr/bin/env python3
"""
Step 01: Site Mapping
Discovers all URLs on a website and collects HTTP metadata.
Outputs: dump.csv with columns: url,status_code,content_type,size,last_modified
"""

import argparse
import csv
import subprocess
import sys
from pathlib import Path
from typing import List, Dict, Optional
from urllib.parse import urlparse, urljoin
from datetime import datetime

import scrapy
from scrapy.crawler import CrawlerProcess
from scrapy.spiders import CrawlSpider, Rule
from scrapy.linkextractors import LinkExtractor

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent / '00_env'))

from config import config
from utils import setup_logging, normalize_url, is_valid_url, ensure_dir


class MetadataSpider(scrapy.Spider):
    """Spider to crawl website and collect URL metadata."""
    
    name = 'metadata_spider'
    custom_settings = {
        'ROBOTSTXT_OBEY': True,
        'CONCURRENT_REQUESTS': 16,
        'DOWNLOAD_DELAY': 0.5,
    }
    
    def __init__(self, domain: str, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.domain = domain
        self.allowed_domains = [domain]
        self.start_urls = [f'https://{domain}/']
        self.url_metadata = {}
        
    def parse(self, response):
        """Process each response to collect metadata."""
        # Collect metadata for current URL
        url = normalize_url(response.url)
        
        # Get content type from headers
        content_type = response.headers.get('Content-Type', b'').decode('utf-8').split(';')[0].strip()
        
        # Get content length
        content_length = response.headers.get('Content-Length', b'0').decode('utf-8')
        try:
            size = int(content_length)
        except ValueError:
            size = len(response.body) if response.body else 0
            
        # Get last modified
        last_modified = response.headers.get('Last-Modified', b'').decode('utf-8')
        
        # Store metadata
        self.url_metadata[url] = {
            'url': url,
            'status_code': response.status,
            'content_type': content_type,
            'size': size,
            'last_modified': last_modified
        }
        
        # Follow links only from HTML pages
        if 'text/html' in content_type:
            # Extract all links
            links = response.css('a::attr(href)').getall()
            for link in links:
                absolute_url = urljoin(response.url, link)
                parsed = urlparse(absolute_url)
                
                # Only follow links on same domain
                if parsed.netloc == self.domain:
                    yield response.follow(absolute_url, self.parse)




class SiteMapper:
    """Main site mapping orchestrator."""
    
    def __init__(self, domain: str):
        """Initialize site mapper."""
        self.domain = domain
        self.logger = setup_logging('site_mapper', Path(__file__).parent / 'mapping.log')
        self.output_file = Path(__file__).parent / 'dump.csv'
        self.url_metadata: Dict[str, Dict] = {}
    
    def try_screaming_frog(self) -> bool:
        """Try to use Screaming Frog if available."""
        sf_path = Path(config.screaming_frog_path)
        
        if not sf_path.exists():
            self.logger.info("Screaming Frog not found, skipping")
            return False
        
        try:
            # Prepare Screaming Frog command
            output_dir = ensure_dir(Path(__file__).parent / 'screaming_frog')
            cmd = [
                'java', '-jar', str(sf_path),
                '--crawl', f'https://{self.domain}/',
                '--headless',
                '--save-crawl', str(output_dir / f'{self.domain}.seospider'),
                '--export-tabs', 'Internal:All',
                '--output-folder', str(output_dir),
            ]
            
            self.logger.info("Running Screaming Frog crawler...")
            result = subprocess.run(cmd, capture_output=True, text=True)
            
            if result.returncode == 0:
                # Parse exported CSV to get metadata
                csv_file = output_dir / 'internal_all.csv'
                if csv_file.exists():
                    with open(csv_file, 'r', newline='', encoding='utf-8') as f:
                        reader = csv.DictReader(f)
                        for row in reader:
                            if 'Address' in row and is_valid_url(row.get('Address', '')):
                                url = normalize_url(row['Address'])
                                self.url_metadata[url] = {
                                    'url': url,
                                    'status_code': int(row.get('Status Code', 0)),
                                    'content_type': row.get('Content Type', ''),
                                    'size': int(row.get('Size (Bytes)', 0)),
                                    'last_modified': row.get('Last Modified', '')
                                }
                    self.logger.info(f"Found {len(self.url_metadata)} URLs with Screaming Frog")
                    return True
            else:
                self.logger.warning(f"Screaming Frog failed: {result.stderr}")
                
        except Exception as e:
            self.logger.error(f"Error running Screaming Frog: {e}")
        
        return False
    
    def crawl_with_scrapy(self) -> None:
        """Crawl website using Scrapy to collect metadata."""
        self.logger.info("Crawling website with Scrapy...")
        
        # Create and run metadata spider
        process = CrawlerProcess(config.get_scrapy_settings())
        process.crawl(MetadataSpider, domain=self.domain)
        process.start()
        
        # Get metadata from spider
        for crawler in process.crawlers:
            if hasattr(crawler.spider, 'url_metadata'):
                self.url_metadata.update(crawler.spider.url_metadata)
                self.logger.info(f"Found {len(crawler.spider.url_metadata)} URLs with metadata")
    
    def save_dump_csv(self) -> None:
        """Save URL metadata to dump.csv."""
        if not self.url_metadata:
            self.logger.error("No URLs found!")
            return
        
        # Sort URLs
        sorted_urls = sorted(self.url_metadata.keys())
        
        # Write CSV
        with open(self.output_file, 'w', newline='', encoding='utf-8') as f:
            fieldnames = ['url', 'status_code', 'content_type', 'size', 'last_modified']
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            
            for url in sorted_urls:
                writer.writerow(self.url_metadata[url])
        
        self.logger.info(f"Saved {len(sorted_urls)} URLs to {self.output_file}")
    
    def run(self, methods: List[str] = None) -> Dict[str, Dict]:
        """Run site mapping using specified methods."""
        if methods is None:
            methods = ['screaming_frog', 'scrapy']
        
        self.logger.info(f"Starting site mapping for {self.domain}")
        self.logger.info(f"Methods: {', '.join(methods)}")
        
        # Try different methods
        if 'screaming_frog' in methods:
            if self.try_screaming_frog():
                # If Screaming Frog worked, we're done
                self.save_dump_csv()
                return self.url_metadata
        
        if 'scrapy' in methods:
            self.crawl_with_scrapy()
        
        # Save results
        self.save_dump_csv()
        
        return self.url_metadata


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description='Map all URLs on a website and collect HTTP metadata',
        epilog='Output: dump.csv with columns: url,status_code,content_type,size,last_modified'
    )
    parser.add_argument('domain', help='Domain to map (e.g., example.com)')
    parser.add_argument('--methods', nargs='+', 
                       choices=['screaming_frog', 'scrapy'],
                       default=['scrapy'],
                       help='Methods to use for mapping (default: scrapy)')
    
    args = parser.parse_args()
    
    # Clean domain (remove protocol if provided)
    domain = args.domain.replace('https://', '').replace('http://', '').rstrip('/')
    
    # Run site mapper
    mapper = SiteMapper(domain)
    metadata = mapper.run(methods=args.methods)
    
    if metadata:
        print(f"\nMapping complete! Found {len(metadata)} URLs with metadata")
        print(f"Results saved to: {mapper.output_file}")
    else:
        print("\nMapping failed - no URLs found")
        sys.exit(1)


if __name__ == '__main__':
    main()