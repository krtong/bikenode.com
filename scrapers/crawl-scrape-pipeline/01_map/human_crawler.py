#!/usr/bin/env python3
"""
Human-like crawler with realistic browsing patterns.
Uses advanced techniques to avoid bot detection.
"""

import random
import time
import sys
import csv
import json
from pathlib import Path
from typing import Dict, List, Optional
from urllib.parse import urlparse, urljoin
from datetime import datetime

import scrapy
from scrapy.crawler import CrawlerProcess
from scrapy.http import Request

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent / 'orchestration'))

from config import config
from utils_minimal import setup_logging, normalize_url, is_valid_url


class HumanLikeSpider(scrapy.Spider):
    """Spider that mimics human browsing behavior."""
    
    name = 'human_spider'
    
    # Realistic browser fingerprints
    USER_AGENTS = [
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Edg/119.0.0.0',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
    ]
    
    custom_settings = {
        'ROBOTSTXT_OBEY': False,
        'CONCURRENT_REQUESTS': 2,
        'CONCURRENT_REQUESTS_PER_DOMAIN': 1,
        'DOWNLOAD_DELAY': 2,
        'RANDOMIZE_DOWNLOAD_DELAY': True,
        'COOKIES_ENABLED': True,
        'DOWNLOAD_TIMEOUT': 30,
        
        # Middlewares
        'DOWNLOADER_MIDDLEWARES': {
            'scrapy.downloadermiddlewares.useragent.UserAgentMiddleware': None,
            'scrapy.downloadermiddlewares.retry.RetryMiddleware': 90,
            'scrapy.downloadermiddlewares.httpproxy.HttpProxyMiddleware': 110,
            'scrapy.downloadermiddlewares.cookies.CookiesMiddleware': 700,
        },
        
        # Auto throttle for human-like behavior
        'AUTOTHROTTLE_ENABLED': True,
        'AUTOTHROTTLE_START_DELAY': 1,
        'AUTOTHROTTLE_MAX_DELAY': 10,
        'AUTOTHROTTLE_TARGET_CONCURRENCY': 1.0,
        
        # Retry settings
        'RETRY_TIMES': 3,
        'RETRY_HTTP_CODES': [500, 502, 503, 504, 408, 429, 403],
        
        # Redirect handling
        'REDIRECT_ENABLED': True,
        'REDIRECT_MAX_TIMES': 5,
        
        # Cache for efficiency
        'HTTPCACHE_ENABLED': True,
        'HTTPCACHE_EXPIRATION_SECS': 3600,
        'HTTPCACHE_DIR': 'httpcache',
        'HTTPCACHE_IGNORE_HTTP_CODES': [403, 429, 500, 503],
    }
    
    def __init__(self, domain: str, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.domain = domain
        self.allowed_domains = [domain, f'www.{domain}']
        # Also allow common subdomains
        for subdomain in ['shop', 'store', 'blog', 'support', 'help', 'api']:
            self.allowed_domains.append(f'{subdomain}.{domain}')
        
        self.start_urls = [f'https://{domain}/', f'https://www.{domain}/']
        self.url_metadata = {}
        self.visited_urls = set()
        self.session_start = datetime.now()
        self.request_count = 0
        
        # Simulate browser session
        self.session_id = self.generate_session_id()
        self.user_agent = random.choice(self.USER_AGENTS)
        
    def generate_session_id(self):
        """Generate a realistic session ID."""
        return ''.join(random.choices('0123456789abcdef', k=32))
    
    def get_realistic_headers(self, referer=None):
        """Generate headers that match real browser patterns."""
        headers = {
            'User-Agent': self.user_agent,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
        }
        
        # Chrome-specific headers
        if 'Chrome' in self.user_agent:
            headers.update({
                'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
                'Sec-Ch-Ua-Mobile': '?0',
                'Sec-Ch-Ua-Platform': '"macOS"' if 'Macintosh' in self.user_agent else '"Windows"',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none' if not referer else 'same-origin',
                'Sec-Fetch-User': '?1',
            })
        
        # Add referer if navigating from another page
        if referer:
            headers['Referer'] = referer
        
        # Sometimes add cache control
        if random.random() > 0.7:
            headers['Cache-Control'] = 'max-age=0'
        
        return headers
    
    def should_follow_link(self, url):
        """Decide whether to follow a link (human-like selection)."""
        # Skip obvious non-content URLs
        skip_patterns = [
            '/cdn-cgi/', '/wp-admin/', '/admin/', '/.well-known/',
            '.pdf', '.zip', '.exe', '.dmg', '#', 'javascript:',
            'mailto:', 'tel:', '/cart', '/checkout', '/account',
        ]
        
        url_lower = url.lower()
        for pattern in skip_patterns:
            if pattern in url_lower:
                return False
        
        # Random chance to explore (humans don't click every link)
        explore_chance = 0.3  # 30% chance to follow a link
        
        # Higher chance for interesting pages
        interesting_patterns = [
            '/product', '/item', '/category', '/collection',
            '/blog', '/article', '/page/', '/shop',
        ]
        
        for pattern in interesting_patterns:
            if pattern in url_lower:
                explore_chance = 0.7  # 70% chance for interesting pages
                break
        
        return random.random() < explore_chance
    
    def get_random_delay(self):
        """Get realistic delay between requests."""
        # Most humans take 2-8 seconds between clicks
        base_delay = random.uniform(2, 8)
        
        # Sometimes longer delays (reading, distracted)
        if random.random() < 0.1:  # 10% chance
            base_delay = random.uniform(10, 30)
        
        # Very rarely, quick successive clicks
        if random.random() < 0.05:  # 5% chance
            base_delay = random.uniform(0.5, 1.5)
        
        return base_delay
    
    def start_requests(self):
        """Generate initial requests."""
        for url in self.start_urls:
            yield Request(
                url,
                callback=self.parse,
                errback=self.errback,
                dont_filter=True,
                headers=self.get_realistic_headers(),
                meta={
                    'cookiejar': self.session_id,
                    'download_delay': self.get_random_delay(),
                }
            )
    
    def parse(self, response):
        """Parse response with human-like behavior."""
        url = normalize_url(response.url)
        
        # Skip if already visited
        if url in self.visited_urls:
            return
        self.visited_urls.add(url)
        
        self.request_count += 1
        
        # Collect metadata
        content_type = response.headers.get('Content-Type', b'').decode('utf-8').split(';')[0].strip()
        content_length = response.headers.get('Content-Length', b'0').decode('utf-8')
        try:
            size = int(content_length)
        except ValueError:
            size = len(response.body) if response.body else 0
        
        last_modified = response.headers.get('Last-Modified', b'').decode('utf-8')
        
        # Store metadata
        self.url_metadata[url] = {
            'url': url,
            'status_code': response.status,
            'content_type': content_type,
            'size': size,
            'last_modified': last_modified,
            'crawled_at': datetime.now().isoformat(),
        }
        
        self.logger.info(f"[{self.request_count}] Parsed {url} - Status: {response.status}")
        
        # Check for signs of bot detection
        if self.is_bot_detected(response):
            self.logger.warning(f"Bot detection suspected at {url}")
            # Back off and try different approach
            return
        
        # Extract and follow links
        if 'text/html' in content_type:
            links = response.css('a::attr(href)').getall()
            self.logger.info(f"Found {len(links)} links on {url}")
            
            # Prioritize links (human-like browsing)
            prioritized_links = self.prioritize_links(links, response.url)
            
            for link in prioritized_links:
                absolute_url = urljoin(response.url, link)
                parsed = urlparse(absolute_url)
                
                if self.is_allowed_domain(parsed.netloc) and self.should_follow_link(absolute_url):
                    # Simulate session behavior
                    if self.request_count > 50 and random.random() < 0.1:
                        # Sometimes take a longer break
                        delay = random.uniform(30, 60)
                        self.logger.info(f"Taking a break ({delay:.1f}s)")
                    else:
                        delay = self.get_random_delay()
                    
                    yield Request(
                        absolute_url,
                        callback=self.parse,
                        errback=self.errback,
                        headers=self.get_realistic_headers(referer=response.url),
                        meta={
                            'cookiejar': self.session_id,
                            'download_delay': delay,
                        },
                        priority=self.get_link_priority(absolute_url),
                    )
    
    def is_bot_detected(self, response):
        """Check for signs of bot detection."""
        indicators = [
            'captcha', 'challenge', 'cf-browser-verification',
            'access denied', 'forbidden', 'bot detected',
            'unusual traffic', 'automated', 'not a robot',
        ]
        
        body_text = response.text.lower()
        for indicator in indicators:
            if indicator in body_text:
                return True
        
        # Check for suspiciously small responses
        if len(response.body) < 500 and response.status == 200:
            return True
        
        return False
    
    def is_allowed_domain(self, netloc):
        """Check if domain is allowed."""
        if not netloc:
            return False
        
        for allowed in self.allowed_domains:
            if netloc == allowed or netloc.endswith(f'.{allowed}'):
                return True
        return False
    
    def prioritize_links(self, links, current_url):
        """Prioritize links like a human would."""
        categorized = {
            'navigation': [],
            'content': [],
            'other': [],
        }
        
        for link in links:
            if not link or link.startswith('#'):
                continue
            
            link_lower = link.lower()
            
            # Navigation links (humans often explore these)
            if any(nav in link_lower for nav in ['/category', '/collection', '/shop', '/products']):
                categorized['navigation'].append(link)
            # Content pages (high interest)
            elif any(content in link_lower for content in ['/product/', '/item/', '/article/', '/blog/']):
                categorized['content'].append(link)
            else:
                categorized['other'].append(link)
        
        # Mix them up but with preference
        prioritized = []
        
        # Take some from each category
        prioritized.extend(random.sample(categorized['content'], 
                                       min(10, len(categorized['content']))))
        prioritized.extend(random.sample(categorized['navigation'], 
                                       min(5, len(categorized['navigation']))))
        prioritized.extend(random.sample(categorized['other'], 
                                       min(5, len(categorized['other']))))
        
        return prioritized
    
    def get_link_priority(self, url):
        """Assign priority to links."""
        # Product pages get highest priority
        if '/product' in url or '/item' in url:
            return 10
        # Category pages medium priority
        elif '/category' in url or '/collection' in url:
            return 5
        # Everything else low priority
        return 1
    
    def errback(self, failure):
        """Handle request failures."""
        self.logger.error(f"Request failed: {failure.request.url} - {failure.value}")


def main():
    """Main entry point."""
    if len(sys.argv) < 2:
        print("Usage: python human_crawler.py <domain>")
        sys.exit(1)
    
    domain = sys.argv[1].replace('https://', '').replace('http://', '').rstrip('/')
    
    # Set up logging
    logger = setup_logging('human_crawler', Path(__file__).parent / 'human_crawl.log')
    logger.info(f"Starting human-like crawl for {domain}")
    
    # Configure and run crawler
    process = CrawlerProcess({
        'LOG_LEVEL': 'INFO',
        'USER_AGENT': random.choice(HumanLikeSpider.USER_AGENTS),
    })
    
    process.crawl(HumanLikeSpider, domain=domain)
    process.start()
    
    # Get results
    url_metadata = {}
    for crawler in process.crawlers:
        if hasattr(crawler.spider, 'url_metadata'):
            url_metadata.update(crawler.spider.url_metadata)
            logger.info(f"Spider visited {len(crawler.spider.visited_urls)} unique URLs")
            logger.info(f"Total requests made: {crawler.spider.request_count}")
    
    # Save results
    if url_metadata:
        output_file = Path(__file__).parent / 'dump.csv'
        sorted_urls = sorted(url_metadata.keys())
        
        with open(output_file, 'w', newline='', encoding='utf-8') as f:
            fieldnames = ['url', 'status_code', 'content_type', 'size', 'last_modified']
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            
            for url in sorted_urls:
                row = {k: v for k, v in url_metadata[url].items() if k in fieldnames}
                writer.writerow(row)
        
        print(f"\nHuman-like crawl complete!")
        print(f"Found {len(url_metadata)} unique URLs")
        print(f"Results saved to: {output_file}")
    else:
        print("\nCrawl failed - no URLs found")
        sys.exit(1)


if __name__ == '__main__':
    main()