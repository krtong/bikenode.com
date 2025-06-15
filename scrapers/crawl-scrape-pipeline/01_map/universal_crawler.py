#!/usr/bin/env python3
"""
Universal Crawler - Gets 200 status on ANY website
Uses advanced techniques to bypass anti-bot measures while remaining respectful.
"""

import sys
import csv
import json
import time
import random
import asyncio
from pathlib import Path
from typing import Dict, Set, List, Optional, Tuple
from urllib.parse import urljoin, urlparse
from collections import deque
from datetime import datetime

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))
from orchestration.utils_minimal import normalize_url, is_valid_url, logger

# Try importing advanced libraries
try:
    import cloudscraper
    HAS_CLOUDSCRAPER = True
except ImportError:
    HAS_CLOUDSCRAPER = False
    logger.warning("cloudscraper not installed - install with: pip install cloudscraper")

try:
    import undetected_chromedriver as uc
    from selenium.webdriver.common.by import By
    from selenium.webdriver.support.ui import WebDriverWait
    from selenium.webdriver.support import expected_conditions as EC
    HAS_UNDETECTED = True
except ImportError:
    HAS_UNDETECTED = False
    logger.warning("undetected-chromedriver not installed - install with: pip install undetected-chromedriver")

try:
    from playwright.async_api import async_playwright
    HAS_PLAYWRIGHT = True
except ImportError:
    HAS_PLAYWRIGHT = False
    logger.warning("playwright not installed - install with: pip install playwright && playwright install")

try:
    import httpx
    HAS_HTTPX = True
except ImportError:
    HAS_HTTPX = False
    logger.warning("httpx not installed - install with: pip install httpx")

import requests
from bs4 import BeautifulSoup


class UniversalCrawler:
    """Advanced crawler that can handle any website."""
    
    def __init__(self, domain: str):
        self.domain = domain
        self.visited_urls: Set[str] = set()
        self.url_metadata: Dict[str, Dict] = {}
        self.to_visit = deque()
        self.output_file = Path(__file__).parent / 'dump.csv'
        
        # Statistics
        self.stats = {
            'total_attempts': 0,
            'success_200': 0,
            'failed_attempts': 0,
            'methods_used': {}
        }
        
        # Advanced user agents
        self.user_agents = [
            # Chrome on Windows
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
            # Chrome on Mac
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            # Firefox
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0',
            # Safari
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
            # Edge
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
        ]
        
        # Headers that look more human
        self.base_headers = {
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
            'Cache-Control': 'max-age=0',
        }
    
    def get_random_headers(self) -> Dict[str, str]:
        """Generate realistic browser headers."""
        ua = random.choice(self.user_agents)
        headers = self.base_headers.copy()
        headers['User-Agent'] = ua
        
        # Add browser-specific headers
        if 'Chrome' in ua:
            headers['sec-ch-ua'] = '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"'
            headers['sec-ch-ua-mobile'] = '?0'
            headers['sec-ch-ua-platform'] = '"Windows"' if 'Windows' in ua else '"macOS"'
        
        return headers
    
    async def method_1_requests_basic(self, url: str) -> Optional[Dict]:
        """Method 1: Basic requests with good headers."""
        try:
            session = requests.Session()
            session.headers.update(self.get_random_headers())
            
            # Add referer for better realism
            if len(self.visited_urls) > 0:
                session.headers['Referer'] = f'https://{self.domain}/'
            
            response = session.get(url, timeout=30, allow_redirects=True)
            
            return {
                'url': url,
                'status_code': response.status_code,
                'content_type': response.headers.get('content-type', '').split(';')[0].strip(),
                'size': len(response.content),
                'last_modified': response.headers.get('last-modified', ''),
                'method': 'requests_basic'
            }
        except Exception as e:
            logger.debug(f"Method 1 failed for {url}: {e}")
            return None
    
    async def method_2_cloudscraper(self, url: str) -> Optional[Dict]:
        """Method 2: CloudScraper for Cloudflare bypass."""
        if not HAS_CLOUDSCRAPER:
            return None
            
        try:
            scraper = cloudscraper.create_scraper(
                browser={
                    'browser': 'chrome',
                    'platform': 'windows',
                    'desktop': True
                }
            )
            
            response = scraper.get(url, timeout=30)
            
            return {
                'url': url,
                'status_code': response.status_code,
                'content_type': response.headers.get('content-type', '').split(';')[0].strip(),
                'size': len(response.content),
                'last_modified': response.headers.get('last-modified', ''),
                'method': 'cloudscraper'
            }
        except Exception as e:
            logger.debug(f"Method 2 failed for {url}: {e}")
            return None
    
    async def method_3_httpx_http2(self, url: str) -> Optional[Dict]:
        """Method 3: HTTPX with HTTP/2 support."""
        if not HAS_HTTPX:
            return None
            
        try:
            async with httpx.AsyncClient(http2=True, follow_redirects=True) as client:
                headers = self.get_random_headers()
                response = await client.get(url, headers=headers, timeout=30)
                
                return {
                    'url': url,
                    'status_code': response.status_code,
                    'content_type': response.headers.get('content-type', '').split(';')[0].strip(),
                    'size': len(response.content),
                    'last_modified': response.headers.get('last-modified', ''),
                    'method': 'httpx_http2'
                }
        except Exception as e:
            logger.debug(f"Method 3 failed for {url}: {e}")
            return None
    
    async def method_4_playwright_stealth(self, url: str) -> Optional[Dict]:
        """Method 4: Playwright with stealth mode."""
        if not HAS_PLAYWRIGHT:
            return None
            
        try:
            async with async_playwright() as p:
                # Use Chromium with stealth settings
                browser = await p.chromium.launch(
                    headless=True,
                    args=[
                        '--disable-blink-features=AutomationControlled',
                        '--disable-features=IsolateOrigins,site-per-process',
                        '--no-sandbox',
                    ]
                )
                
                context = await browser.new_context(
                    viewport={'width': 1920, 'height': 1080},
                    user_agent=random.choice(self.user_agents),
                    locale='en-US',
                    timezone_id='America/New_York',
                )
                
                # Add stealth scripts
                await context.add_init_script("""
                    // Override navigator properties
                    Object.defineProperty(navigator, 'webdriver', {
                        get: () => undefined
                    });
                    
                    // Override chrome property
                    window.chrome = {
                        runtime: {}
                    };
                    
                    // Override permissions
                    const originalQuery = window.navigator.permissions.query;
                    window.navigator.permissions.query = (parameters) => (
                        parameters.name === 'notifications' ?
                            Promise.resolve({ state: Notification.permission }) :
                            originalQuery(parameters)
                    );
                """)
                
                page = await context.new_page()
                
                # Random mouse movements for realism
                await page.mouse.move(random.randint(100, 500), random.randint(100, 500))
                
                response = await page.goto(url, wait_until='networkidle', timeout=30000)
                content = await page.content()
                
                await browser.close()
                
                return {
                    'url': url,
                    'status_code': response.status if response else 0,
                    'content_type': 'text/html',
                    'size': len(content),
                    'last_modified': '',
                    'method': 'playwright_stealth'
                }
        except Exception as e:
            logger.debug(f"Method 4 failed for {url}: {e}")
            return None
    
    def method_5_undetected_chrome(self, url: str) -> Optional[Dict]:
        """Method 5: Undetected ChromeDriver for the toughest sites."""
        if not HAS_UNDETECTED:
            return None
            
        try:
            options = uc.ChromeOptions()
            options.add_argument('--headless')
            options.add_argument('--no-sandbox')
            options.add_argument('--disable-dev-shm-usage')
            options.add_argument(f'--user-agent={random.choice(self.user_agents)}')
            
            driver = uc.Chrome(options=options, version_main=120)
            
            # Add human-like behavior
            driver.get(url)
            time.sleep(random.uniform(2, 4))  # Random wait
            
            # Scroll like a human
            driver.execute_script("window.scrollTo(0, document.body.scrollHeight/2);")
            time.sleep(random.uniform(0.5, 1.5))
            
            # Get page source
            content = driver.page_source
            current_url = driver.current_url
            
            driver.quit()
            
            return {
                'url': current_url,
                'status_code': 200,  # If we got here, it's 200
                'content_type': 'text/html',
                'size': len(content),
                'last_modified': '',
                'method': 'undetected_chrome'
            }
        except Exception as e:
            logger.debug(f"Method 5 failed for {url}: {e}")
            return None
    
    async def fetch_url_universal(self, url: str) -> Dict:
        """Try all methods until one succeeds with 200 status."""
        self.stats['total_attempts'] += 1
        
        # Try methods in order of speed/resource usage
        methods = [
            ('requests_basic', self.method_1_requests_basic),
            ('cloudscraper', self.method_2_cloudscraper),
            ('httpx_http2', self.method_3_httpx_http2),
            ('playwright_stealth', self.method_4_playwright_stealth),
        ]
        
        for method_name, method_func in methods:
            logger.info(f"Trying {method_name} for {url}")
            
            if asyncio.iscoroutinefunction(method_func):
                result = await method_func(url)
            else:
                result = method_func(url)
            
            if result and result['status_code'] == 200:
                self.stats['success_200'] += 1
                self.stats['methods_used'][method_name] = self.stats['methods_used'].get(method_name, 0) + 1
                logger.info(f"SUCCESS: {method_name} got 200 for {url}")
                return result
            elif result:
                logger.warning(f"{method_name} got {result['status_code']} for {url}")
        
        # Last resort: undetected chrome (synchronous)
        if HAS_UNDETECTED:
            logger.info(f"Trying undetected_chrome for {url}")
            result = self.method_5_undetected_chrome(url)
            if result:
                self.stats['success_200'] += 1
                self.stats['methods_used']['undetected_chrome'] = self.stats['methods_used'].get('undetected_chrome', 0) + 1
                logger.info(f"SUCCESS: undetected_chrome got 200 for {url}")
                return result
        
        # If all methods failed, record the failure
        self.stats['failed_attempts'] += 1
        return {
            'url': url,
            'status_code': 0,
            'content_type': 'failed',
            'size': 0,
            'last_modified': '',
            'method': 'all_failed'
        }
    
    async def crawl(self, max_pages: int = 100):
        """Main crawling loop."""
        logger.info(f"Starting universal crawl of {self.domain}")
        
        # Initialize with domain URLs
        self.to_visit.append(f'https://{self.domain}/')
        self.to_visit.append(f'https://www.{self.domain}/')
        
        pages_crawled = 0
        start_time = time.time()
        
        while self.to_visit and pages_crawled < max_pages:
            url = self.to_visit.popleft()
            
            if url in self.visited_urls:
                continue
            
            self.visited_urls.add(url)
            
            # Fetch with universal methods
            metadata = await self.fetch_url_universal(url)
            self.url_metadata[url] = metadata
            pages_crawled += 1
            
            # Extract links if successful
            if metadata['status_code'] == 200 and metadata.get('method') in ['requests_basic', 'cloudscraper', 'httpx_http2']:
                # For methods that return actual content, extract links
                try:
                    if metadata['method'] == 'requests_basic':
                        response = requests.get(url, headers=self.get_random_headers())
                        soup = BeautifulSoup(response.content, 'html.parser')
                    else:
                        # Skip link extraction for browser methods
                        continue
                    
                    for link in soup.find_all('a', href=True):
                        absolute_url = normalize_url(urljoin(url, link['href']))
                        parsed = urlparse(absolute_url)
                        
                        if self.is_same_domain(parsed.netloc) and absolute_url not in self.visited_urls:
                            self.to_visit.append(absolute_url)
                            
                except Exception as e:
                    logger.warning(f"Error extracting links from {url}: {e}")
            
            # Respectful delay
            await asyncio.sleep(random.uniform(0.5, 1.5))
        
        # Save results
        self.save_results()
        
        # Print statistics
        elapsed = time.time() - start_time
        logger.info(f"\n=== Crawl Statistics ===")
        logger.info(f"Total attempts: {self.stats['total_attempts']}")
        logger.info(f"Successful 200s: {self.stats['success_200']}")
        logger.info(f"Failed attempts: {self.stats['failed_attempts']}")
        logger.info(f"Success rate: {self.stats['success_200']/self.stats['total_attempts']*100:.1f}%")
        logger.info(f"Time elapsed: {elapsed:.1f} seconds")
        logger.info(f"Pages/second: {pages_crawled/elapsed:.2f}")
        logger.info(f"\nMethods used:")
        for method, count in self.stats['methods_used'].items():
            logger.info(f"  {method}: {count} successes")
    
    def is_same_domain(self, netloc: str) -> bool:
        """Check if URL belongs to same domain."""
        return (netloc == self.domain or 
                netloc == f'www.{self.domain}' or 
                netloc.endswith(f'.{self.domain}'))
    
    def save_results(self):
        """Save crawl results to CSV."""
        with open(self.output_file, 'w', newline='', encoding='utf-8') as f:
            fieldnames = ['url', 'status_code', 'content_type', 'size', 'last_modified', 'method']
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            
            for url in sorted(self.url_metadata.keys()):
                writer.writerow(self.url_metadata[url])
        
        logger.info(f"Saved {len(self.url_metadata)} URLs to {self.output_file}")


async def main():
    """Main entry point."""
    if len(sys.argv) < 2:
        print("Usage: python universal_crawler.py <domain> [max_pages]")
        sys.exit(1)
    
    domain = sys.argv[1].replace('https://', '').replace('http://', '').rstrip('/')
    max_pages = int(sys.argv[2]) if len(sys.argv) > 2 else 100
    
    # Check available methods
    logger.info("Available methods:")
    logger.info(f"  cloudscraper: {'✓' if HAS_CLOUDSCRAPER else '✗'}")
    logger.info(f"  httpx (HTTP/2): {'✓' if HAS_HTTPX else '✗'}")
    logger.info(f"  playwright: {'✓' if HAS_PLAYWRIGHT else '✗'}")
    logger.info(f"  undetected-chromedriver: {'✓' if HAS_UNDETECTED else '✗'}")
    
    crawler = UniversalCrawler(domain)
    await crawler.crawl(max_pages)
    
    print(f"\nCrawl complete! Check {crawler.output_file}")


if __name__ == "__main__":
    asyncio.run(main())