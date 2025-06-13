#!/usr/bin/env python3
"""
Advanced stealth crawler with anti-bot evasion techniques.
Uses Playwright for JavaScript rendering and human-like behavior.
"""

import random
import time
import sys
import csv
from pathlib import Path
from typing import Dict, List, Optional
from urllib.parse import urlparse, urljoin
import asyncio

import scrapy
from scrapy.crawler import CrawlerProcess
from scrapy.http import Request

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent / 'orchestration'))

from config import config
from utils_minimal import setup_logging, normalize_url, is_valid_url


class StealthSpider(scrapy.Spider):
    """Advanced spider with anti-bot evasion techniques."""
    
    name = 'stealth_spider'
    
    custom_settings = {
        'ROBOTSTXT_OBEY': False,
        'CONCURRENT_REQUESTS': 1,  # Very low to appear human
        'DOWNLOAD_DELAY': 3,  # Base delay between requests
        'RANDOMIZE_DOWNLOAD_DELAY': True,
        'COOKIES_ENABLED': True,
        'DOWNLOAD_TIMEOUT': 30,
        
        # Playwright settings
        'DOWNLOAD_HANDLERS': {
            "http": "scrapy_playwright.handler.ScrapyPlaywrightDownloadHandler",
            "https": "scrapy_playwright.handler.ScrapyPlaywrightDownloadHandler",
        },
        'TWISTED_REACTOR': 'twisted.internet.asyncioreactor.AsyncioSelectorReactor',
        
        # Middlewares
        'DOWNLOADER_MIDDLEWARES': {
            'scrapy.downloadermiddlewares.useragent.UserAgentMiddleware': None,
            'scrapy_fake_useragent.middleware.RandomUserAgentMiddleware': 400,
            'scrapy_fake_useragent.middleware.RetryUserAgentMiddleware': 401,
            'scrapy_playwright.middleware.ScrapyPlaywrightMiddleware': 800,
        },
        
        # Fake useragent settings
        'FAKEUSERAGENT_PROVIDERS': [
            'scrapy_fake_useragent.providers.FakeUserAgentProvider',
            'scrapy_fake_useragent.providers.FakerProvider',
            'scrapy_fake_useragent.providers.FixedUserAgentProvider',
        ],
        'USER_AGENT': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        
        # Playwright browser options
        'PLAYWRIGHT_BROWSER_TYPE': 'chromium',
        'PLAYWRIGHT_LAUNCH_OPTIONS': {
            'headless': True,
            'args': [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-blink-features=AutomationControlled',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu',
                '--window-size=1920,1080',
                '--start-maximized',
                '--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            ],
        },
        
        # Default Playwright context
        'PLAYWRIGHT_DEFAULT_NAVIGATION_TIMEOUT': 30000,
        'PLAYWRIGHT_CONTEXTS': {
            'default': {
                'viewport': {'width': 1920, 'height': 1080},
                'locale': 'en-US',
                'timezone_id': 'America/New_York',
                'permissions': ['geolocation'],
                'geolocation': {'latitude': 40.7128, 'longitude': -74.0060},
                'color_scheme': 'light',
            }
        },
        
        # Auto throttle for more human-like behavior
        'AUTOTHROTTLE_ENABLED': True,
        'AUTOTHROTTLE_START_DELAY': 2,
        'AUTOTHROTTLE_MAX_DELAY': 10,
        'AUTOTHROTTLE_TARGET_CONCURRENCY': 1.0,
        'AUTOTHROTTLE_DEBUG': True,
        
        # Retry settings
        'RETRY_TIMES': 3,
        'RETRY_HTTP_CODES': [500, 502, 503, 504, 408, 429, 403],
    }
    
    def __init__(self, domain: str, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.domain = domain
        self.allowed_domains = [domain, f'www.{domain}', f'.{domain}']
        self.start_urls = [f'https://{domain}/', f'https://www.{domain}/']
        self.url_metadata = {}
        self.visited_urls = set()
        
    def start_requests(self):
        """Generate initial requests with full stealth mode."""
        for url in self.start_urls:
            yield Request(
                url,
                meta={
                    'playwright': True,
                    'playwright_include_page': True,
                    'playwright_page_methods': [
                        # Remove webdriver traces
                        PageMethod('evaluate_on_new_document', """
                            () => {
                                // Override webdriver property
                                Object.defineProperty(navigator, 'webdriver', {
                                    get: () => undefined
                                });
                                
                                // Add chrome object
                                window.chrome = {
                                    runtime: {},
                                    loadTimes: function() {},
                                    csi: function() {},
                                    app: {}
                                };
                                
                                // Override permissions
                                const originalQuery = window.navigator.permissions.query;
                                window.navigator.permissions.query = (parameters) => (
                                    parameters.name === 'notifications' ?
                                        Promise.resolve({ state: Notification.permission }) :
                                        originalQuery(parameters)
                                );
                                
                                // Override plugins
                                Object.defineProperty(navigator, 'plugins', {
                                    get: () => [
                                        {
                                            0: {type: "application/x-google-chrome-pdf", suffixes: "pdf", description: "Portable Document Format"},
                                            description: "Portable Document Format",
                                            filename: "internal-pdf-viewer",
                                            length: 1,
                                            name: "Chrome PDF Plugin"
                                        }
                                    ]
                                });
                                
                                // Override languages
                                Object.defineProperty(navigator, 'languages', {
                                    get: () => ['en-US', 'en']
                                });
                                
                                // Remove automation indicators
                                delete window.cdc_adoQpoasnfa76pfcZLmcfl_Array;
                                delete window.cdc_adoQpoasnfa76pfcZLmcfl_Promise;
                                delete window.cdc_adoQpoasnfa76pfcZLmcfl_Symbol;
                            }
                        """),
                        
                        # Random mouse movements
                        PageMethod('evaluate', """
                            async () => {
                                const mouse = { x: 0, y: 0 };
                                const updateMouse = (e) => { mouse.x = e.clientX; mouse.y = e.clientY; };
                                document.addEventListener('mousemove', updateMouse);
                                
                                // Simulate random mouse movements
                                for (let i = 0; i < 3; i++) {
                                    const x = Math.random() * window.innerWidth;
                                    const y = Math.random() * window.innerHeight;
                                    
                                    const event = new MouseEvent('mousemove', {
                                        bubbles: true,
                                        cancelable: true,
                                        clientX: x,
                                        clientY: y
                                    });
                                    document.dispatchEvent(event);
                                    
                                    await new Promise(r => setTimeout(r, Math.random() * 1000 + 500));
                                }
                            }
                        """),
                        
                        # Random scrolling
                        PageMethod('evaluate', """
                            async () => {
                                const totalHeight = document.body.scrollHeight;
                                const viewportHeight = window.innerHeight;
                                const scrollSteps = Math.floor(Math.random() * 3) + 2;
                                
                                for (let i = 0; i < scrollSteps; i++) {
                                    const scrollTo = Math.random() * (totalHeight - viewportHeight);
                                    window.scrollTo({
                                        top: scrollTo,
                                        behavior: 'smooth'
                                    });
                                    await new Promise(r => setTimeout(r, Math.random() * 2000 + 1000));
                                }
                                
                                // Scroll back to top
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                                await new Promise(r => setTimeout(r, 1000));
                            }
                        """),
                        
                        # Wait for full page load
                        PageMethod('wait_for_load_state', 'networkidle'),
                    ],
                },
                callback=self.parse,
                errback=self.errback,
                dont_filter=True,
                headers=self.get_random_headers(),
            )
    
    def get_random_headers(self):
        """Get randomized but realistic headers."""
        accept_languages = [
            'en-US,en;q=0.9',
            'en-GB,en;q=0.9',
            'en-US,en;q=0.9,es;q=0.8',
            'en-US,en;q=0.9,fr;q=0.8',
        ]
        
        referers = [
            'https://www.google.com/',
            'https://www.bing.com/',
            'https://duckduckgo.com/',
            '',  # Direct navigation
        ]
        
        return {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'Accept-Language': random.choice(accept_languages),
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none' if random.random() > 0.5 else 'same-origin',
            'Sec-Fetch-User': '?1',
            'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
            'Sec-Ch-Ua-Mobile': '?0',
            'Sec-Ch-Ua-Platform': '"macOS"',
            'Cache-Control': 'max-age=0' if random.random() > 0.7 else 'no-cache',
            'Referer': random.choice(referers),
        }
    
    async def parse(self, response):
        """Parse response with human-like delays."""
        # Add to visited URLs
        url = normalize_url(response.url)
        if url in self.visited_urls:
            return
        self.visited_urls.add(url)
        
        # Random delay to simulate reading
        await asyncio.sleep(random.uniform(0.5, 2.0))
        
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
            'last_modified': last_modified
        }
        
        self.logger.info(f"Parsed {url} - Status: {response.status}, Type: {content_type}")
        
        # Extract links with Playwright page if available
        if 'playwright_page' in response.meta:
            page = response.meta['playwright_page']
            
            # Extract all links using JavaScript
            links = await page.evaluate("""
                () => {
                    const links = [];
                    document.querySelectorAll('a[href]').forEach(a => {
                        links.push(a.href);
                    });
                    return links;
                }
            """)
            
            # Close the page
            await page.close()
            
            self.logger.info(f"Found {len(links)} links on {url}")
            
            # Follow links with human-like selection
            for link in links:
                # Random chance to skip some links (human behavior)
                if random.random() > 0.7:
                    continue
                    
                parsed = urlparse(link)
                if self.is_same_domain(parsed.netloc):
                    # Add random delay between requests
                    delay = random.uniform(2, 5)
                    
                    yield response.follow(
                        link,
                        meta={
                            'playwright': True,
                            'playwright_include_page': True,
                            'playwright_page_methods': [
                                PageMethod('wait_for_load_state', 'domcontentloaded'),
                            ],
                            'download_delay': delay,
                        },
                        callback=self.parse,
                        errback=self.errback,
                        headers=self.get_random_headers(),
                    )
        else:
            # Fallback to regular link extraction
            if 'text/html' in content_type:
                links = response.css('a::attr(href)').getall()
                self.logger.info(f"Found {len(links)} links on {url} (no Playwright)")
                
                for link in links:
                    if random.random() > 0.7:
                        continue
                        
                    absolute_url = urljoin(response.url, link)
                    parsed = urlparse(absolute_url)
                    
                    if self.is_same_domain(parsed.netloc):
                        yield response.follow(
                            absolute_url,
                            callback=self.parse,
                            errback=self.errback,
                            headers=self.get_random_headers(),
                        )
    
    def is_same_domain(self, netloc):
        """Check if netloc belongs to the same domain."""
        if not netloc:
            return False
        return netloc == self.domain or netloc.endswith(f'.{self.domain}')
    
    def errback(self, failure):
        """Handle request failures."""
        self.logger.error(f"Request failed: {failure.request.url} - {failure.value}")


class StealthCrawler:
    """Main orchestrator for stealth crawling."""
    
    def __init__(self, domain: str):
        self.domain = domain
        self.logger = setup_logging('stealth_crawler', Path(__file__).parent / 'stealth.log')
        self.output_file = Path(__file__).parent / 'dump.csv'
    
    def run(self) -> Dict[str, Dict]:
        """Run the stealth crawler."""
        self.logger.info(f"Starting stealth crawl for {self.domain}")
        
        # Configure process
        process = CrawlerProcess(settings={
            'LOG_LEVEL': 'INFO',
            'USER_AGENT': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        })
        
        # Run crawler
        process.crawl(StealthSpider, domain=self.domain)
        process.start()
        
        # Get results
        url_metadata = {}
        for crawler in process.crawlers:
            if hasattr(crawler.spider, 'url_metadata'):
                url_metadata.update(crawler.spider.url_metadata)
        
        self.logger.info(f"Found {len(url_metadata)} URLs")
        
        # Save results
        if url_metadata:
            self.save_dump_csv(url_metadata)
        
        return url_metadata
    
    def save_dump_csv(self, url_metadata: Dict[str, Dict]) -> None:
        """Save URL metadata to CSV."""
        sorted_urls = sorted(url_metadata.keys())
        
        with open(self.output_file, 'w', newline='', encoding='utf-8') as f:
            fieldnames = ['url', 'status_code', 'content_type', 'size', 'last_modified']
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            
            for url in sorted_urls:
                writer.writerow(url_metadata[url])
        
        self.logger.info(f"Saved {len(sorted_urls)} URLs to {self.output_file}")


def main():
    """Main entry point."""
    if len(sys.argv) < 2:
        print("Usage: python stealth_crawler.py <domain>")
        sys.exit(1)
    
    domain = sys.argv[1].replace('https://', '').replace('http://', '').rstrip('/')
    
    crawler = StealthCrawler(domain)
    url_metadata = crawler.run()
    
    if url_metadata:
        print(f"\nStealth crawl complete! Found {len(url_metadata)} URLs")
        print(f"Results saved to: {crawler.output_file}")
    else:
        print("\nStealth crawl failed - no URLs found")
        sys.exit(1)


if __name__ == '__main__':
    main()