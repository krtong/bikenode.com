#!/usr/bin/env python3
"""
Step 01: Site Mapping
Discovers all URLs on a website and collects HTTP metadata.

Primary output: dump.csv with columns: url,status_code,content_type,size,last_modified
Enhanced output: dump_enhanced.csv with additional metadata including page_title, meta_description, 
                canonical_url, response_time, redirect_count, and content statistics

Default method: requests crawler with BeautifulSoup (handles most sites including those with anti-bot measures)
"""

import argparse
import csv
import subprocess
import sys
from pathlib import Path
from typing import List, Dict, Optional
from urllib.parse import urlparse, urljoin
from datetime import datetime

# Scrapy imports are optional - we can work without them
try:
    import scrapy
    from scrapy.crawler import CrawlerProcess
    from scrapy.http import Request
    SCRAPY_AVAILABLE = True
except ImportError:
    SCRAPY_AVAILABLE = False
    print("Note: Scrapy not available, using requests-based crawler")

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from orchestration.config import CRAWLER_CONFIG, STEPS
from orchestration.utils_minimal import normalize_url, is_valid_url, logger


if SCRAPY_AVAILABLE:
    class MetadataSpider(scrapy.Spider):
        """Spider to crawl website and collect URL metadata."""
        
        name = 'metadata_spider'
    custom_settings = {
        'ROBOTSTXT_OBEY': False,  # Many sites block robots.txt crawling
        'CONCURRENT_REQUESTS': 4,  # Increased for better performance
        'DOWNLOAD_DELAY': 0.5,  # Reduced delay
        'RANDOMIZE_DOWNLOAD_DELAY': True,
        'DEPTH_LIMIT': 2,  # Limit crawl depth for testing
        'CLOSESPIDER_PAGECOUNT': 100,  # Stop after crawling 100 pages
        'USER_AGENT': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'DEFAULT_REQUEST_HEADERS': {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'Accept-Language': 'en-US,en;q=0.9',
            # Removed Accept-Encoding to avoid compression issues
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
        self.pages_crawled = 0
        
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
        content_length = response.headers.get('Content-Length', b'').decode('utf-8')
        if content_length:
            try:
                size = int(content_length)
            except ValueError:
                size = len(response.body)
        else:
            size = len(response.body)
            
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
        
        self.pages_crawled += 1
        self.logger.info(f"Parsed {url} - Status: {response.status}, Type: {content_type}, Size: {size} (Total: {self.pages_crawled})")
        
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
                    yield Request(
                        absolute_url,
                        callback=self.parse,
                        errback=self.errback
                    )
    
    def spider_closed(self, spider):
        """Called when spider is closed."""
        self.logger.info(f"Spider closed. Crawled {self.pages_crawled} pages, found {len(self.url_metadata)} URLs with metadata")




class SiteMapper:
    """Main site mapping orchestrator."""
    
    def __init__(self, domain: str, max_pages: int = 10000):
        """Initialize site mapper."""
        self.domain = domain
        self.max_pages = max_pages
        self.logger = logger
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        # Make domain safe for filename - replace dots and slashes
        safe_domain = domain.replace('.', '_').replace('/', '_')
        self.output_file = Path(__file__).parent / f'{safe_domain}_{timestamp}.csv'
        self.url_metadata: Dict[str, Dict] = {}
    
    def try_screaming_frog(self) -> bool:
        """Try to use Screaming Frog if available."""
        # Screaming Frog is optional - skip if not configured
        sf_path = Path("/Applications/Screaming Frog SEO Spider.app/Contents/Resources/app/ScreamingFrogSEOSpider.jar")
        
        if not sf_path.exists():
            self.logger.info("Screaming Frog not found, skipping")
            return False
        
        try:
            # Prepare Screaming Frog command
            output_dir = Path(__file__).parent / 'screaming_frog'
            output_dir.mkdir(exist_ok=True)
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
    
    def crawl_with_requests(self) -> None:
        """Crawl website using requests and BeautifulSoup with enhanced URL discovery."""
        self.logger.info("Crawling website with enhanced URL discovery...")
        
        import requests
        from bs4 import BeautifulSoup
        from urllib.parse import urljoin, urlparse, parse_qs
        import time
        import urllib3
        import json
        import re
        
        # Disable SSL warnings for test sites
        urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
        
        # Use a simple BFS approach instead of Scrapy
        visited_urls = set()
        # Use custom start URLs if provided, otherwise use default
        if hasattr(self, 'start_urls'):
            to_visit = self.start_urls.copy()
        else:
            to_visit = [f'https://{self.domain}/', f'https://www.{self.domain}/']
        max_pages = self.max_pages  # Use configurable limit
        pages_crawled = 0
        
        # Rate limit tracking
        rate_limit_count = 0
        consecutive_success = 0
        base_delay = 0.3  # Start with fast crawling
        
        # Track URL types for better crawling strategy
        url_types = {
            'product_pages': [],
            'category_pages': [],
            'pagination': [],
            'api_endpoints': [],
            'structured_data_urls': []
        }
        
        # User agent rotation
        user_agents = [
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
        ]
        
        session = requests.Session()
        # Use the proven headers that achieve 100% success rate
        session.headers.update({
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            # Removed Accept-Encoding to avoid compression issues with BeautifulSoup
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Cache-Control': 'max-age=0',
        })
        
        def is_same_domain(netloc):
            return (netloc == self.domain or 
                    netloc == f'www.{self.domain}' or 
                    netloc.endswith(f'.{self.domain}'))
        
        def should_crawl_url(url):
            """Filter out URLs likely to return non-200 status."""
            # Skip common non-200 patterns
            skip_patterns = [
                r'/api/',        # API endpoints often need auth
                r'/admin',       # Admin pages
                r'/wp-admin',    # WordPress admin
                r'/login',       # Login pages
                r'/logout',      # Logout endpoints
                r'/ajax/',       # AJAX endpoints
                r'/graphql',     # GraphQL endpoints
                r'\.pdf$',       # PDF files
                r'\.zip$',       # Archive files
                r'/download/',   # Downloads
            ]
            
            path = urlparse(url).path.lower()
            for pattern in skip_patterns:
                if re.search(pattern, path):
                    return False
            return True
        
        while to_visit and pages_crawled < max_pages:
            url = to_visit.pop(0)
            
            # Skip URLs with only anchor differences
            url_without_anchor = url.split('#')[0]
            if url_without_anchor in visited_urls:
                continue
            
            if url in visited_urls:
                continue
                
            visited_urls.add(url)
            visited_urls.add(url_without_anchor)  # Also mark base URL as visited
            
            try:
                self.logger.info(f"Fetching: {url}")
                
                # Implement retry logic with exponential backoff for rate limits
                max_retries = 3
                retry_count = 0
                
                while retry_count < max_retries:
                    try:
                        # Rotate user agent
                        import random
                        session.headers['User-Agent'] = random.choice(user_agents)
                        
                        response = session.get(url, timeout=30, allow_redirects=True, verify=False)
                        
                        # Handle rate limiting
                        if response.status_code == 429:
                            retry_after = int(response.headers.get('Retry-After', 2 ** retry_count))
                            self.logger.warning(f"Rate limited on {url}, waiting {retry_after} seconds (attempt {retry_count + 1}/{max_retries})")
                            time.sleep(retry_after)
                            retry_count += 1
                            continue
                        else:
                            # Success, break the retry loop
                            break
                            
                    except requests.exceptions.RequestException as e:
                        self.logger.error(f"Request error for {url}: {e}")
                        if retry_count < max_retries - 1:
                            wait_time = 2 ** retry_count
                            self.logger.info(f"Retrying after {wait_time} seconds...")
                            time.sleep(wait_time)
                            retry_count += 1
                        else:
                            raise
                
                pages_crawled += 1
                
                # Collect enhanced metadata
                content_type = response.headers.get('content-type', '').split(';')[0].strip()
                size = len(response.content)
                last_modified = response.headers.get('last-modified', '')
                
                # Collect additional headers
                etag = response.headers.get('etag', '')
                server = response.headers.get('server', '')
                cache_control = response.headers.get('cache-control', '')
                
                # Basic metadata
                metadata = {
                    'url': url,
                    'status_code': response.status_code,
                    'content_type': content_type,
                    'size': size,
                    'last_modified': last_modified,
                    'etag': etag,
                    'server': server,
                    'cache_control': cache_control,
                    'response_time': response.elapsed.total_seconds(),
                    'redirect_count': len(response.history),
                    'final_url': response.url if response.url != url else ''
                }
                
                # Extract page-level metadata if HTML
                if 'text/html' in content_type and response.status_code == 200:
                    try:
                        soup_meta = BeautifulSoup(response.content, 'html.parser')
                        
                        # Extract title
                        title_tag = soup_meta.find('title')
                        metadata['page_title'] = title_tag.text.strip() if title_tag else ''
                        
                        # Extract meta description
                        meta_desc = soup_meta.find('meta', attrs={'name': 'description'})
                        metadata['meta_description'] = meta_desc.get('content', '') if meta_desc else ''
                        
                        # Extract canonical URL
                        canonical = soup_meta.find('link', {'rel': 'canonical'})
                        metadata['canonical_url'] = canonical.get('href', '') if canonical else ''
                        
                        # Count specific content types
                        metadata['image_count'] = len(soup_meta.find_all('img'))
                        metadata['link_count'] = len(soup_meta.find_all('a'))
                        metadata['form_count'] = len(soup_meta.find_all('form'))
                        
                        # Check for structured data
                        metadata['has_json_ld'] = bool(soup_meta.find('script', type='application/ld+json'))
                        metadata['has_opengraph'] = bool(soup_meta.find('meta', property=re.compile('^og:')))
                        
                    except Exception as e:
                        self.logger.warning(f"Error extracting page metadata: {e}")
                
                self.url_metadata[url] = metadata
                
                self.logger.info(f"Parsed {url} - Status: {response.status_code}, Type: {content_type}, Size: {size}")
                
                # Debug: Check content for first page
                if url == f'https://{self.domain}/':
                    self.logger.info(f"First 200 chars of content: {response.text[:200]}")
                
                # Extract links if it's HTML
                if 'text/html' in content_type and response.status_code == 200:
                    try:
                        soup = BeautifulSoup(response.content, 'html.parser')
                        discovered_urls = set()
                        
                        # 1. Extract traditional anchor links
                        for link in soup.find_all('a', href=True):
                            href = link['href']
                            absolute_url = urljoin(url, href)
                            discovered_urls.add(absolute_url)
                        
                        # 2. Extract URLs from JavaScript (common in e-commerce sites)
                        for script in soup.find_all('script'):
                            if script.string:
                                # Find URLs in JavaScript
                                js_urls = re.findall(r'["\']/([\w\-/]+)["\']', script.string)
                                for js_url in js_urls:
                                    if not js_url.startswith(('static/', 'assets/', 'js/', 'css/')):
                                        absolute_url = urljoin(url, '/' + js_url)
                                        discovered_urls.add(absolute_url)
                        
                        # 3. Extract URLs from data attributes
                        for elem in soup.find_all(attrs={'data-url': True}):
                            data_url = elem.get('data-url')
                            if data_url:
                                absolute_url = urljoin(url, data_url)
                                discovered_urls.add(absolute_url)
                        
                        # 4. Extract pagination URLs
                        for page_link in soup.find_all(['a', 'button'], {'class': re.compile(r'page|pagination|next|prev', re.I)}):
                            if page_link.get('href'):
                                absolute_url = urljoin(url, page_link['href'])
                                discovered_urls.add(absolute_url)
                                if 'page' in absolute_url or 'p=' in absolute_url:
                                    url_types['pagination'].append(absolute_url)
                        
                        # 5. Extract JSON-LD structured data for product URLs
                        for script in soup.find_all('script', type='application/ld+json'):
                            try:
                                data = json.loads(script.string)
                                if isinstance(data, dict):
                                    # Look for product URLs in structured data
                                    if data.get('@type') == 'Product' and data.get('url'):
                                        discovered_urls.add(data['url'])
                                        url_types['structured_data_urls'].append(data['url'])
                                    # Look for BreadcrumbList
                                    elif data.get('@type') == 'BreadcrumbList':
                                        for item in data.get('itemListElement', []):
                                            if item.get('item', {}).get('@id'):
                                                discovered_urls.add(item['item']['@id'])
                            except json.JSONDecodeError:
                                pass
                        
                        # 6. Extract canonical URLs
                        canonical = soup.find('link', {'rel': 'canonical'})
                        if canonical and canonical.get('href'):
                            discovered_urls.add(canonical['href'])
                        
                        # 7. Extract meta refresh URLs
                        meta_refresh = soup.find('meta', attrs={'http-equiv': 'refresh'})
                        if meta_refresh:
                            content = meta_refresh.get('content', '')
                            match = re.search(r'url=(.+)', content, re.I)
                            if match:
                                refresh_url = match.group(1)
                                absolute_url = urljoin(url, refresh_url)
                                discovered_urls.add(absolute_url)
                        
                        # Filter and add URLs to queue
                        links_added = 0
                        for discovered_url in discovered_urls:
                            parsed = urlparse(discovered_url)
                            
                            # Classify URL type
                            if re.search(r'/product[s]?/|/item/|/p/\d+', discovered_url):
                                url_types['product_pages'].append(discovered_url)
                            elif re.search(r'/categor[y|ies]/|/collection[s]?/', discovered_url):
                                url_types['category_pages'].append(discovered_url)
                            
                            # Skip JavaScript template URLs
                            if '${' in discovered_url or '{{' in discovered_url:
                                self.logger.debug(f"Skipping JavaScript template URL: {discovered_url}")
                                continue
                            
                            # Only follow links on same domain
                            if (is_same_domain(parsed.netloc) and 
                                discovered_url not in visited_urls and 
                                discovered_url not in to_visit):
                                # Prioritize product pages by adding them to front of queue
                                if '/product/' in discovered_url or '/motorcycle/' in discovered_url:
                                    to_visit.insert(0, discovered_url)
                                else:
                                    to_visit.append(discovered_url)
                                links_added += 1
                        
                        self.logger.info(f"Found {len(discovered_urls)} URLs on {url}, added {links_added} new URLs to queue")
                        self.logger.info(f"Queue now has {len(to_visit)} URLs remaining")
                        
                        # Progress tracking for large crawls
                        if pages_crawled % 100 == 0:
                            self.logger.info(f"\n📊 Progress: {pages_crawled}/{max_pages} pages crawled")
                            self.logger.info(f"   URLs discovered: {len(visited_urls) + len(to_visit)}")
                            self.logger.info(f"   Success rate: {(pages_crawled - rate_limit_count) / pages_crawled * 100:.1f}%")
                            self.logger.info(f"   Product pages: {len(set(url_types['product_pages']))}")
                            self.logger.info(f"   Category pages: {len(set(url_types['category_pages']))}")
                        
                        # Log URL type discoveries
                        if url_types['product_pages']:
                            self.logger.info(f"Discovered {len(set(url_types['product_pages']))} product pages")
                        if url_types['pagination']:
                            self.logger.info(f"Discovered {len(set(url_types['pagination']))} pagination URLs")
                                
                    except Exception as e:
                        self.logger.warning(f"Error parsing HTML for {url}: {e}")
                
                # Dynamic rate limiting based on response
                if response.status_code == 429:
                    # Track rate limits
                    rate_limit_count += 1
                    consecutive_success = 0
                    base_delay = min(base_delay * 2, 5)  # Double delay up to 5 seconds
                    self.logger.warning(f"Rate limit count: {rate_limit_count}, new base delay: {base_delay}s")
                    time.sleep(base_delay)
                elif 200 <= response.status_code < 300:
                    # Success, track consecutive successes
                    consecutive_success += 1
                    if consecutive_success > 10 and base_delay > 0.3:
                        # Gradually speed up after consistent success
                        base_delay = max(base_delay * 0.8, 0.3)
                        self.logger.info(f"Speeding up, new base delay: {base_delay}s")
                    time.sleep(base_delay)
                else:
                    # Other errors, use standard delay
                    time.sleep(base_delay)
                
            except Exception as e:
                self.logger.error(f"Error fetching {url}: {e}")
                # Still record the failed URL
                self.url_metadata[url] = {
                    'url': url,
                    'status_code': 0,
                    'content_type': 'error',
                    'size': 0,
                    'last_modified': ''
                }
        
        self.logger.info(f"Crawl complete. Found {len(self.url_metadata)} URLs with metadata")
    
    def crawl_with_scrapy(self) -> None:
        """Crawl website using Scrapy framework."""
        if not SCRAPY_AVAILABLE:
            self.logger.error("Scrapy is not available. Install it with: pip install scrapy")
            return
            
        self.logger.info("Crawling website with Scrapy...")
        
        # Configure Scrapy settings
        process_settings = {
            'USER_AGENT': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'ROBOTSTXT_OBEY': False,
            'CONCURRENT_REQUESTS': 16,
            'DOWNLOAD_DELAY': 0.5,
            'COOKIES_ENABLED': True,
            'TELNETCONSOLE_ENABLED': False,
            'LOG_LEVEL': 'INFO',
        }
        
        # Create and configure the crawler process
        process = CrawlerProcess(process_settings)
        
        # Run the spider - pass the class, not an instance
        process.crawl(MetadataSpider, domain=self.domain)
        process.start()  # This will block until crawling is finished
        
        # Get the results from the crawlers
        for crawler in process.crawlers:
            if hasattr(crawler.spider, 'url_metadata'):
                self.url_metadata.update(crawler.spider.url_metadata)
                self.logger.info(f"Scrapy spider found {len(crawler.spider.url_metadata)} URLs")
            else:
                self.logger.error("Spider did not collect any metadata")
    
    def save_dump_csv(self) -> None:
        """Save URL metadata to dump.csv."""
        if not self.url_metadata:
            self.logger.error("No URLs found!")
            return
        
        # Sort URLs
        sorted_urls = sorted(self.url_metadata.keys())
        
        # Determine which fields to include based on available data
        basic_fields = ['url', 'status_code', 'content_type', 'size', 'last_modified']
        
        # Check if we have enhanced metadata
        sample_metadata = next(iter(self.url_metadata.values()))
        if 'page_title' in sample_metadata:
            # Save enhanced metadata CSV
            enhanced_file = self.output_file.parent / f'{self.output_file.stem}_enhanced.csv'
            with open(enhanced_file, 'w', newline='', encoding='utf-8') as f:
                all_fields = list(sample_metadata.keys())
                writer = csv.DictWriter(f, fieldnames=all_fields, extrasaction='ignore')
                writer.writeheader()
                
                for url in sorted_urls:
                    writer.writerow(self.url_metadata[url])
            
            self.logger.info(f"Saved enhanced metadata to {enhanced_file}")
        
        # Always save basic dump.csv for compatibility
        with open(self.output_file, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=basic_fields, extrasaction='ignore')
            writer.writeheader()
            
            for url in sorted_urls:
                # Extract only basic fields
                basic_data = {k: self.url_metadata[url].get(k, '') for k in basic_fields}
                writer.writerow(basic_data)
        
        self.logger.info(f"Saved {len(sorted_urls)} URLs to {self.output_file}")
    
    def run(self, methods: List[str] = None) -> Dict[str, Dict]:
        """Run site mapping using specified methods."""
        if methods is None:
            methods = ['requests', 'sitemap']
        
        self.logger.info(f"Starting site mapping for {self.domain}")
        self.logger.info(f"Methods: {', '.join(methods)}")
        
        # Try different methods in order
        for method in methods:
            if method == 'screaming_frog':
                if self.try_screaming_frog():
                    # If Screaming Frog worked, we're done
                    self.save_dump_csv()
                    return self.url_metadata
            
            elif method == 'requests':
                self.crawl_with_requests()
                
                # If requests crawler found reasonable number of URLs, continue
                if len(self.url_metadata) >= 1:
                    self.logger.info(f"Requests crawler found {len(self.url_metadata)} URLs")
                    break
                else:
                    self.logger.warning(f"Requests crawler only found {len(self.url_metadata)} URLs, trying next method")
                    self.url_metadata.clear()  # Clear potentially incomplete results
            
            elif method == 'scrapy':
                self.crawl_with_scrapy()
                
                # If Scrapy found reasonable number of URLs, continue
                if len(self.url_metadata) >= 1:
                    self.logger.info(f"Scrapy found {len(self.url_metadata)} URLs")
                    break
                else:
                    self.logger.warning(f"Scrapy only found {len(self.url_metadata)} URLs, trying next method")
                    self.url_metadata.clear()  # Clear potentially incomplete results
            
            elif method == 'sitemap':
                self.crawl_with_sitemap(enhanced=True)
                if self.url_metadata:
                    self.logger.info(f"Sitemap method found {len(self.url_metadata)} URLs")
                    break
            
            elif method == 'human':
                self.crawl_with_human_behavior()
                if self.url_metadata:
                    break
            
            elif method == 'stealth':
                self.crawl_with_stealth()
                if self.url_metadata:
                    break
            
            elif method == 'curl':
                self.crawl_with_curl()
                if self.url_metadata:
                    break
        
        # Save results
        self.save_dump_csv()
        
        return self.url_metadata
    
    def crawl_with_sitemap(self, enhanced: bool = True) -> None:
        """Crawl website using sitemap.xml."""
        self.logger.info("Using sitemap crawler")
        
        # Try enhanced sitemap crawler first
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
    
    def crawl_with_human_behavior(self) -> None:
        """Crawl website using human-like behavior patterns."""
        self.logger.info("Using human-like crawler")
        try:
            from human_crawler import HumanLikeSpider
            
            process = CrawlerProcess(CRAWLER_CONFIG)
            process.crawl(HumanLikeSpider, domain=self.domain)
            process.start()
            
            # Get results
            for crawler in process.crawlers:
                if hasattr(crawler.spider, 'url_metadata'):
                    self.url_metadata.update(crawler.spider.url_metadata)
                    self.logger.info(f"Found {len(crawler.spider.url_metadata)} URLs via human crawler")
                    
        except Exception as e:
            self.logger.error(f"Error using human crawler: {e}")
    
    def crawl_with_stealth(self) -> None:
        """Crawl website using stealth techniques with browser automation."""
        self.logger.info("Using stealth crawler")
        try:
            from stealth_crawler import StealthCrawler
            
            crawler = StealthCrawler(self.domain)
            url_metadata = crawler.run()
            
            if url_metadata:
                self.url_metadata.update(url_metadata)
                self.logger.info(f"Found {len(url_metadata)} URLs via stealth crawler")
            else:
                self.logger.warning("Stealth crawler found no URLs")
                
        except Exception as e:
            self.logger.error(f"Error using stealth crawler: {e}")
    
    def crawl_with_curl(self) -> None:
        """Crawl website using curl-based crawler with adaptive user agents."""
        self.logger.info("Using curl-based crawler")
        try:
            from curl_crawler import CurlCrawler
            
            crawler = CurlCrawler(self.domain)
            url_metadata = crawler.crawl()
            
            if url_metadata:
                self.url_metadata.update(url_metadata)
                self.logger.info(f"Found {len(url_metadata)} URLs via curl crawler")
            else:
                self.logger.warning("Curl crawler found no URLs")
                
        except Exception as e:
            self.logger.error(f"Error using curl crawler: {e}")


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description='Map all URLs on a website and collect HTTP metadata',
        epilog='Output: dump.csv with columns: url,status_code,content_type,size,last_modified'
    )
    parser.add_argument('domain', help='Domain to map (e.g., example.com)')
    parser.add_argument('--methods', nargs='+', 
                       choices=['screaming_frog', 'requests', 'scrapy', 'sitemap', 'human', 'stealth', 'curl'],
                       default=['requests', 'sitemap'],
                       help='Methods to use for mapping (default: requests, sitemap)')
    parser.add_argument('--max-pages', type=int, default=10000,
                       help='Maximum number of pages to crawl (default: 10000)')
    
    args = parser.parse_args()
    
    # Clean domain (remove protocol if provided)
    domain = args.domain.replace('https://', '').replace('http://', '').rstrip('/')
    
    # Extract just the domain part (without path) for crawler initialization
    from urllib.parse import urlparse
    if '/' in domain:
        # If domain includes a path, parse it properly
        parsed = urlparse(f'https://{domain}')
        actual_domain = parsed.netloc if parsed.netloc else domain.split('/')[0]
        start_path = parsed.path
    else:
        actual_domain = domain
        start_path = '/'
    
    # Run site mapper
    mapper = SiteMapper(domain, max_pages=args.max_pages)
    # Override the domain for proper crawling
    mapper.domain = actual_domain
    
    # Set custom start URLs if a path was provided
    if start_path != '/':
        mapper.start_urls = [f'https://{actual_domain}{start_path}']
    metadata = mapper.run(methods=args.methods)
    
    if metadata:
        print(f"\nMapping complete! Found {len(metadata)} URLs with metadata")
        print(f"Results saved to: {mapper.output_file}")
    else:
        print("\nMapping failed - no URLs found")
        sys.exit(1)


if __name__ == '__main__':
    main()