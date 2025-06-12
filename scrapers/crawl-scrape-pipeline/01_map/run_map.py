#!/usr/bin/env python3
"""
Step 01: Site Mapping
Discovers all URLs on a website using various methods.
"""

import argparse
import subprocess
import sys
from pathlib import Path
from typing import List, Set, Optional
from urllib.parse import urlparse, urljoin

import scrapy
from scrapy.crawler import CrawlerProcess
from scrapy.spiders import CrawlSpider, Rule
from scrapy.linkextractors import LinkExtractor

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent / '00_env'))

from config import config
from utils import setup_logging, normalize_url, is_valid_url, write_urls_file, ensure_dir


class SitemapSpider(scrapy.Spider):
    """Spider to crawl XML sitemaps."""
    
    name = 'sitemap_spider'
    
    def __init__(self, domain: str, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.domain = domain
        self.start_urls = [
            f'https://{domain}/sitemap.xml',
            f'https://{domain}/sitemap_index.xml',
            f'https://{domain}/robots.txt',
        ]
        self.found_urls = set()
    
    def parse(self, response):
        """Parse sitemap or robots.txt."""
        if response.url.endswith('robots.txt'):
            # Extract sitemap URLs from robots.txt
            for line in response.text.split('\n'):
                if line.strip().lower().startswith('sitemap:'):
                    sitemap_url = line.split(':', 1)[1].strip()
                    yield response.follow(sitemap_url, self.parse_sitemap)
        else:
            # Parse as sitemap
            yield from self.parse_sitemap(response)
    
    def parse_sitemap(self, response):
        """Parse XML sitemap."""
        # Check if it's a sitemap index
        if b'<sitemapindex' in response.body:
            # Parse sitemap index
            for sitemap in response.xpath('//sitemap/loc/text()').getall():
                yield response.follow(sitemap, self.parse_sitemap)
        else:
            # Parse regular sitemap
            for url in response.xpath('//url/loc/text()').getall():
                self.found_urls.add(normalize_url(url))


class FullCrawlSpider(CrawlSpider):
    """Spider to crawl entire website following links."""
    
    name = 'full_crawl_spider'
    
    def __init__(self, domain: str, max_depth: int = 5, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.domain = domain
        self.allowed_domains = [domain]
        self.start_urls = [f'https://{domain}/']
        self.max_depth = max_depth
        self.found_urls = set()
        
        # Rules for link extraction
        self.rules = (
            Rule(
                LinkExtractor(allow_domains=[domain]),
                callback='parse_item',
                follow=True
            ),
        )
    
    def parse_item(self, response):
        """Process each page."""
        self.found_urls.add(normalize_url(response.url))
        
        # Extract all links
        for link in response.css('a::attr(href)').getall():
            absolute_url = urljoin(response.url, link)
            if is_valid_url(absolute_url) and self.domain in absolute_url:
                self.found_urls.add(normalize_url(absolute_url))


class SiteMapper:
    """Main site mapping orchestrator."""
    
    def __init__(self, domain: str):
        """Initialize site mapper."""
        self.domain = domain
        self.logger = setup_logging('site_mapper', config.dirs['map'] / 'mapping.log')
        self.output_file = config.dirs['map'] / 'all_urls.txt'
        self.urls: Set[str] = set()
    
    def try_screaming_frog(self) -> bool:
        """Try to use Screaming Frog if available."""
        sf_path = Path(config.screaming_frog_path)
        
        if not sf_path.exists():
            self.logger.info("Screaming Frog not found, skipping")
            return False
        
        try:
            # Prepare Screaming Frog command
            output_dir = ensure_dir(config.dirs['map'] / 'screaming_frog')
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
                # Parse exported CSV
                csv_file = output_dir / 'internal_all.csv'
                if csv_file.exists():
                    import pandas as pd
                    df = pd.read_csv(csv_file)
                    if 'Address' in df.columns:
                        urls = df['Address'].dropna().unique()
                        self.urls.update(normalize_url(url) for url in urls if is_valid_url(url))
                        self.logger.info(f"Found {len(urls)} URLs with Screaming Frog")
                        return True
            else:
                self.logger.warning(f"Screaming Frog failed: {result.stderr}")
                
        except Exception as e:
            self.logger.error(f"Error running Screaming Frog: {e}")
        
        return False
    
    def crawl_sitemaps(self) -> None:
        """Crawl XML sitemaps."""
        self.logger.info("Crawling sitemaps...")
        
        # Create and run sitemap spider
        process = CrawlerProcess(config.get_scrapy_settings())
        spider = SitemapSpider
        process.crawl(spider, domain=self.domain)
        process.start()
        
        # Get URLs from spider
        for crawler in process.crawlers:
            if hasattr(crawler.spider, 'found_urls'):
                sitemap_urls = crawler.spider.found_urls
                self.urls.update(sitemap_urls)
                self.logger.info(f"Found {len(sitemap_urls)} URLs in sitemaps")
    
    def crawl_website(self, max_depth: int = 3) -> None:
        """Crawl website following links."""
        self.logger.info(f"Crawling website (max depth: {max_depth})...")
        
        # Create and run full crawl spider
        process = CrawlerProcess(config.get_scrapy_settings())
        spider = FullCrawlSpider
        process.crawl(spider, domain=self.domain, max_depth=max_depth)
        process.start()
        
        # Get URLs from spider
        for crawler in process.crawlers:
            if hasattr(crawler.spider, 'found_urls'):
                crawled_urls = crawler.spider.found_urls
                self.urls.update(crawled_urls)
                self.logger.info(f"Found {len(crawled_urls)} URLs by crawling")
    
    def run(self, methods: List[str] = None) -> Set[str]:
        """Run site mapping using specified methods."""
        if methods is None:
            methods = ['screaming_frog', 'sitemap', 'crawl']
        
        self.logger.info(f"Starting site mapping for {self.domain}")
        self.logger.info(f"Methods: {', '.join(methods)}")
        
        # Try different methods
        if 'screaming_frog' in methods:
            self.try_screaming_frog()
        
        if 'sitemap' in methods and len(self.urls) < 1000:  # Skip if we already have many URLs
            self.crawl_sitemaps()
        
        if 'crawl' in methods and len(self.urls) < 100:  # Only crawl if we have few URLs
            self.crawl_website()
        
        # Save all URLs
        if self.urls:
            sorted_urls = sorted(self.urls)
            write_urls_file(sorted_urls, self.output_file)
            self.logger.info(f"Saved {len(sorted_urls)} unique URLs to {self.output_file}")
            
            # Also save to the filter step for convenience
            filter_file = config.dirs['filter'] / 'all_urls.txt'
            write_urls_file(sorted_urls, filter_file)
        else:
            self.logger.error("No URLs found!")
        
        return self.urls


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description='Map all URLs on a website')
    parser.add_argument('--domain', required=True, help='Domain to map')
    parser.add_argument('--methods', nargs='+', 
                       choices=['screaming_frog', 'sitemap', 'crawl'],
                       help='Methods to use for mapping')
    parser.add_argument('--max-depth', type=int, default=3,
                       help='Maximum crawl depth (for crawl method)')
    
    args = parser.parse_args()
    
    # Run site mapper
    mapper = SiteMapper(args.domain)
    urls = mapper.run(methods=args.methods)
    
    print(f"\nMapping complete! Found {len(urls)} unique URLs")
    print(f"Results saved to: {mapper.output_file}")


if __name__ == '__main__':
    main()