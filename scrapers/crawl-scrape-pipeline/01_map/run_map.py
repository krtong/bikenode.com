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
sys.path.append(str(Path(__file__).parent.parent / 'orchestration'))

from config import config
from utils_minimal import setup_logging, normalize_url, is_valid_url, ensure_dir


class MetadataSpider(scrapy.Spider):
    """Spider to crawl website and collect URL metadata."""
    
    name = 'metadata_spider'
    custom_settings = {
        'ROBOTSTXT_OBEY': False,  # Many sites block robots.txt crawling
        'CONCURRENT_REQUESTS': 2,
        'DOWNLOAD_DELAY': 1,
        'RANDOMIZE_DOWNLOAD_DELAY': True,
        'USER_AGENT': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'DEFAULT_REQUEST_HEADERS': {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
            'Sec-Ch-Ua-Mobile': '?0',
            'Sec-Ch-Ua-Platform': '"macOS"',
            'Cache-Control': 'max-age=0',
        },
        'COOKIES_ENABLED': True,
        'DOWNLOADER_MIDDLEWARES': {
            'scrapy.downloadermiddlewares.useragent.UserAgentMiddleware': None,
            'scrapy.downloadermiddlewares.retry.RetryMiddleware': 90,
            'scrapy.downloadermiddlewares.httpproxy.HttpProxyMiddleware': 110,
        },
        'RETRY_TIMES': 3,
        'RETRY_HTTP_CODES': [500, 502, 503, 504, 408, 429, 403],
        'DOWNLOAD_TIMEOUT': 30,
        'REDIRECT_ENABLED': True,
        'REDIRECT_MAX_TIMES': 5,
    }
    
    def __init__(self, domain: str, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.domain = domain
        # Allow the main domain and all subdomains
        self.allowed_domains = [domain, f'.{domain}']
        # Try both with and without www
        self.start_urls = [f'https://{domain}/', f'https://www.{domain}/']
        self.url_metadata = {}
        
    def start_requests(self):
        """Generate initial requests."""
        for url in self.start_urls:
            yield scrapy.Request(
                url,
                callback=self.parse,
                errback=self.errback,
                dont_filter=True,
                headers={
                    'Referer': 'https://www.google.com/',
                }
            )
    
    def errback(self, failure):
        """Handle errors in requests."""
        self.logger.error(f"Request failed: {failure.request.url} - {failure.value}")
    
    def is_same_domain(self, netloc):
        """Check if a netloc belongs to the same domain (including subdomains)."""
        # Handle exact match
        if netloc == self.domain:
            return True
        # Handle www subdomain
        if netloc == f'www.{self.domain}':
            return True
        # Handle any subdomain
        if netloc.endswith(f'.{self.domain}'):
            return True
        return False
        
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
        
        self.logger.info(f"Parsed {url} - Status: {response.status}, Type: {content_type}, Size: {size}")
        
        # Debug: Check what we're getting
        if len(response.body) < 1000:
            self.logger.warning(f"Small response body ({len(response.body)} bytes): {response.body[:500]}")
        
        # Follow links only from HTML pages
        if 'text/html' in content_type:
            # Extract all links
            links = response.css('a::attr(href)').getall()
            self.logger.info(f"Found {len(links)} links on {url}")
            
            # Try different selectors if no links found
            if not links:
                links = response.xpath('//a/@href').getall()
                self.logger.info(f"Found {len(links)} links using xpath on {url}")
            
            for link in links:
                absolute_url = urljoin(response.url, link)
                parsed = urlparse(absolute_url)
                
                # Only follow links on same domain (including subdomains)
                if self.is_same_domain(parsed.netloc):
                    yield scrapy.Request(
                        absolute_url,
                        callback=self.parse,
                        errback=self.errback
                    )




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
            methods = ['scrapy', 'sitemap']
        
        self.logger.info(f"Starting site mapping for {self.domain}")
        self.logger.info(f"Methods: {', '.join(methods)}")
        
        # Check if domain is known to have bot protection
        protected_domains = [
            'revzilla.com', 'cyclegear.com', 'motorcycle.com', 
            'bikebandit.com', 'denniskirk.com', 'jpcycles.com'
        ]
        
        is_protected = any(protected in self.domain for protected in protected_domains)
        
        if is_protected:
            self.logger.info(f"Domain {self.domain} is known to have bot protection, using sitemap-first approach")
            # For protected sites, try sitemap first
            if 'sitemap' in methods:
                self.crawl_with_sitemap(enhanced=True)
                if self.url_metadata:
                    self.save_dump_csv()
                    return self.url_metadata
        
        # Try different methods
        if 'screaming_frog' in methods:
            if self.try_screaming_frog():
                # If Screaming Frog worked, we're done
                self.save_dump_csv()
                return self.url_metadata
        
        if 'scrapy' in methods and not is_protected:
            self.crawl_with_scrapy()
            
            # If scrapy found very few URLs, it might be blocked
            if len(self.url_metadata) < 10:
                self.logger.warning(f"Scrapy only found {len(self.url_metadata)} URLs, might be blocked")
                if 'sitemap' in methods:
                    self.logger.info("Falling back to sitemap crawling")
                    self.url_metadata.clear()  # Clear failed results
                    self.crawl_with_sitemap(enhanced=True)
        
        # If still no URLs and sitemap method available, try it
        if not self.url_metadata and 'sitemap' in methods:
            self.logger.info("No URLs found with other methods, trying sitemap")
            self.crawl_with_sitemap(enhanced=True)
        
        # Save results
        self.save_dump_csv()
        
        return self.url_metadata
    
    def crawl_with_sitemap(self, enhanced: bool = True) -> None:
        """Crawl website using sitemap.xml."""
        self.logger.info("Using sitemap crawler")
        
        # Check if we need specialized crawler
        if 'revzilla' in self.domain:
            try:
                from revzilla_crawler import RevZillaCrawler
                
                self.logger.info("Using specialized RevZilla crawler")
                sitemap_crawler = RevZillaCrawler()
                sitemap_urls = sitemap_crawler.crawl(max_sitemaps=50)
                
                if sitemap_urls:
                    self.url_metadata.update(sitemap_urls)
                    self.logger.info(f"Found {len(sitemap_urls)} URLs via RevZilla crawler")
                    return
                else:
                    self.logger.warning("RevZilla crawler found no URLs")
                    
            except Exception as e:
                self.logger.error(f"Error using RevZilla crawler: {e}")
        
        # Try enhanced sitemap crawler for other sites
        if enhanced:
            try:
                from enhanced_sitemap_crawler import EnhancedSitemapCrawler
                
                sitemap_crawler = EnhancedSitemapCrawler(self.domain)
                sitemap_urls = sitemap_crawler.crawl(max_sitemaps=50)
                
                if sitemap_urls:
                    self.url_metadata.update(sitemap_urls)
                    self.logger.info(f"Found {len(sitemap_urls)} URLs via enhanced sitemap crawler")
                    return
                else:
                    self.logger.warning("Enhanced sitemap crawler found no URLs, trying basic crawler")
                    
            except Exception as e:
                self.logger.error(f"Error using enhanced sitemap crawler: {e}")
        
        # Fallback to basic sitemap crawler
        try:
            from sitemap_crawler import SitemapCrawler
            
            sitemap_crawler = SitemapCrawler(self.domain)
            sitemap_urls = sitemap_crawler.crawl()
            
            if sitemap_urls:
                self.url_metadata.update(sitemap_urls)
                self.logger.info(f"Found {len(sitemap_urls)} URLs via basic sitemap crawler")
            else:
                self.logger.warning("Basic sitemap crawler found no URLs")
                
        except Exception as e:
            self.logger.error(f"Error using basic sitemap crawler: {e}")


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description='Map all URLs on a website and collect HTTP metadata',
        epilog='Output: dump.csv with columns: url,status_code,content_type,size,last_modified'
    )
    parser.add_argument('domain', help='Domain to map (e.g., example.com)')
    parser.add_argument('--methods', nargs='+', 
                       choices=['screaming_frog', 'scrapy', 'sitemap', 'human', 'stealth'],
                       default=['scrapy', 'sitemap'],
                       help='Methods to use for mapping (default: scrapy, sitemap)')
    
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