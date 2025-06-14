#!/usr/bin/env python3
"""
Enhanced sitemap crawler with support for various sitemap formats and protected sites.
Handles compressed sitemaps, RSS feeds, and dynamic sitemap discovery.
"""

import csv
import gzip
import io
import sys
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import List, Dict, Optional, Set
from urllib.parse import urlparse, urljoin
import requests
from datetime import datetime
import time
import random
import re

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent / 'orchestration'))

from utils_minimal import setup_logging, normalize_url, is_valid_url


class EnhancedSitemapCrawler:
    """Advanced sitemap crawler with comprehensive format support."""
    
    def __init__(self, domain: str):
        self.domain = domain
        self.logger = setup_logging('enhanced_sitemap', Path(__file__).parent / 'enhanced_sitemap.log')
        self.output_file = Path(__file__).parent / 'dump.csv'
        self.session = self._setup_session()
        self.discovered_urls: Set[str] = set()
        self.sitemap_urls: Set[str] = set()
        
    def _setup_session(self) -> requests.Session:
        """Set up requests session with proper headers."""
        session = requests.Session()
        
        # Check if domain is protected and needs special handling
        protected_domains = [
            'revzilla.com', 'cyclegear.com', 'bikebandit.com', 
            'denniskirk.com', 'jpcycles.com'
        ]
        
        is_protected = any(protected in self.domain for protected in protected_domains)
        
        if is_protected:
            # Use curl user agent for protected sites
            user_agent = 'curl/7.64.1'
            headers = {
                'User-Agent': user_agent,
                'Accept': '*/*',
            }
        else:
            # Rotate user agents for regular sites
            user_agents = [
                'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
                'Mozilla/5.0 (compatible; Bingbot/2.0; +http://www.bing.com/bingbot.htm)',
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            ]
            
            headers = {
                'User-Agent': random.choice(user_agents),
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Cache-Control': 'no-cache',
            }
        
        session.headers.update(headers)
        
        # Configure retry logic
        from requests.adapters import HTTPAdapter
        from requests.packages.urllib3.util.retry import Retry
        
        retry_strategy = Retry(
            total=3,
            backoff_factor=1,
            status_forcelist=[429, 500, 502, 503, 504],
        )
        adapter = HTTPAdapter(max_retries=retry_strategy)
        session.mount("http://", adapter)
        session.mount("https://", adapter)
        
        return session
    
    def fetch_content(self, url: str, allow_gzip: bool = True) -> Optional[str]:
        """Fetch content with support for compressed responses."""
        try:
            self.logger.info(f"Fetching: {url}")
            
            # Add delay to be polite
            time.sleep(random.uniform(0.5, 1.5))
            
            response = self.session.get(url, timeout=30, stream=True)
            response.raise_for_status()
            
            # Handle gzipped content
            if url.endswith('.gz'):
                if allow_gzip:
                    try:
                        content = gzip.decompress(response.content).decode('utf-8')
                    except gzip.BadGzipFile:
                        # Not actually gzipped
                        content = response.text
                else:
                    self.logger.warning(f"Gzipped content at {url}, skipping")
                    return None
            elif response.headers.get('Content-Encoding') == 'gzip':
                # Already decompressed by requests
                content = response.text
            else:
                content = response.text
                
            return content
            
        except Exception as e:
            self.logger.error(f"Error fetching {url}: {e}")
            return None
    
    def discover_sitemaps(self) -> List[str]:
        """Discover all possible sitemap locations."""
        sitemap_urls = []
        
        # Check robots.txt first
        robots_urls = [
            f"https://{self.domain}/robots.txt",
            f"https://www.{self.domain}/robots.txt",
        ]
        
        for robots_url in robots_urls:
            content = self.fetch_content(robots_url)
            if content:
                # Extract sitemap URLs from robots.txt
                for line in content.split('\n'):
                    if line.lower().startswith('sitemap:'):
                        sitemap_url = line.split(':', 1)[1].strip()
                        if is_valid_url(sitemap_url):
                            sitemap_urls.append(sitemap_url)
                            self.logger.info(f"Found sitemap in robots.txt: {sitemap_url}")
        
        # Common sitemap patterns
        base_urls = [
            f"https://{self.domain}",
            f"https://www.{self.domain}",
        ]
        
        patterns = [
            "/sitemap.xml",
            "/sitemap_index.xml",
            "/sitemap-index.xml",
            "/sitemaps/sitemap.xml",
            "/sitemap/sitemap.xml",
            "/sitemap1.xml",
            "/sitemap.xml.gz",
            "/sitemap_index.xml.gz",
            "/post-sitemap.xml",
            "/page-sitemap.xml",
            "/product-sitemap.xml",
            "/category-sitemap.xml",
            "/wp-sitemap.xml",  # WordPress
            "/news-sitemap.xml",
            "/video-sitemap.xml",
            "/image-sitemap.xml",
        ]
        
        # Generate URLs
        for base_url in base_urls:
            for pattern in patterns:
                sitemap_urls.append(base_url + pattern)
        
        # Try year-based sitemaps
        current_year = datetime.now().year
        for year in range(current_year - 2, current_year + 1):
            for base_url in base_urls:
                sitemap_urls.append(f"{base_url}/sitemap-{year}.xml")
                sitemap_urls.append(f"{base_url}/sitemap_{year}.xml")
        
        # Remove duplicates while preserving order
        seen = set()
        unique_urls = []
        for url in sitemap_urls:
            if url not in seen:
                seen.add(url)
                unique_urls.append(url)
                
        return unique_urls
    
    def parse_sitemap_index(self, content: str, base_url: str) -> List[str]:
        """Parse sitemap index to get individual sitemap URLs."""
        sitemaps = []
        try:
            # Remove byte order mark if present
            content = content.strip()
            if content.startswith('\ufeff'):
                content = content[1:]
                
            root = ET.fromstring(content)
            
            # Handle different namespace variations
            namespaces = [
                {'sm': 'http://www.sitemaps.org/schemas/sitemap/0.9'},
                {'sm': 'https://www.sitemaps.org/schemas/sitemap/0.9'},
                {},  # No namespace
            ]
            
            for ns in namespaces:
                # Try with namespace
                if ns:
                    locs = root.findall('.//sm:sitemap/sm:loc', ns)
                else:
                    locs = root.findall('.//sitemap/loc')
                
                for loc in locs:
                    if loc.text:
                        sitemap_url = loc.text.strip()
                        # Handle relative URLs
                        if not sitemap_url.startswith('http'):
                            sitemap_url = urljoin(base_url, sitemap_url)
                        sitemaps.append(sitemap_url)
                        
                if sitemaps:
                    break
                    
        except Exception as e:
            self.logger.error(f"Error parsing sitemap index: {e}")
            
        return sitemaps
    
    def parse_sitemap(self, content: str, base_url: str) -> List[Dict[str, str]]:
        """Parse sitemap to get URLs with enhanced error handling."""
        urls = []
        try:
            # Clean content
            content = content.strip()
            if content.startswith('\ufeff'):
                content = content[1:]
            
            # Try to parse as XML
            root = ET.fromstring(content)
            
            # Handle different namespace variations
            namespaces = [
                {'sm': 'http://www.sitemaps.org/schemas/sitemap/0.9'},
                {'sm': 'https://www.sitemaps.org/schemas/sitemap/0.9'},
                {},  # No namespace
            ]
            
            for ns in namespaces:
                if ns:
                    url_elements = root.findall('.//sm:url', ns)
                else:
                    url_elements = root.findall('.//url')
                
                for url_elem in url_elements:
                    if ns:
                        loc = url_elem.find('sm:loc', ns)
                        lastmod = url_elem.find('sm:lastmod', ns)
                        changefreq = url_elem.find('sm:changefreq', ns)
                        priority = url_elem.find('sm:priority', ns)
                    else:
                        loc = url_elem.find('loc')
                        lastmod = url_elem.find('lastmod')
                        changefreq = url_elem.find('changefreq')
                        priority = url_elem.find('priority')
                    
                    if loc is not None and loc.text:
                        url = loc.text.strip()
                        # Handle relative URLs
                        if not url.startswith('http'):
                            url = urljoin(base_url, url)
                            
                        url_data = {
                            'url': normalize_url(url),
                            'last_modified': lastmod.text.strip() if lastmod is not None and lastmod.text else '',
                            'changefreq': changefreq.text.strip() if changefreq is not None and changefreq.text else '',
                            'priority': priority.text.strip() if priority is not None and priority.text else ''
                        }
                        urls.append(url_data)
                
                if urls:
                    break
                    
        except ET.ParseError as e:
            self.logger.error(f"XML parse error: {e}")
            # Try to extract URLs with regex as fallback
            urls = self._extract_urls_fallback(content, base_url)
            
        except Exception as e:
            self.logger.error(f"Error parsing sitemap: {e}")
            
        return urls
    
    def _extract_urls_fallback(self, content: str, base_url: str) -> List[Dict[str, str]]:
        """Extract URLs using regex when XML parsing fails."""
        urls = []
        try:
            # Find all URLs in <loc> tags
            loc_pattern = r'<loc>\s*([^<]+)\s*</loc>'
            matches = re.findall(loc_pattern, content, re.IGNORECASE)
            
            for match in matches:
                url = match.strip()
                if not url.startswith('http'):
                    url = urljoin(base_url, url)
                    
                if is_valid_url(url):
                    urls.append({
                        'url': normalize_url(url),
                        'last_modified': '',
                        'changefreq': '',
                        'priority': ''
                    })
                    
            if urls:
                self.logger.info(f"Extracted {len(urls)} URLs using fallback method")
                
        except Exception as e:
            self.logger.error(f"Fallback extraction failed: {e}")
            
        return urls
    
    def parse_rss_feed(self, content: str, base_url: str) -> List[Dict[str, str]]:
        """Parse RSS feed format (some sites use this instead of sitemaps)."""
        urls = []
        try:
            root = ET.fromstring(content)
            
            # Check for RSS feed
            if root.tag == 'rss' or 'rss' in root.tag:
                items = root.findall('.//item')
                for item in items:
                    link = item.find('link')
                    if link is not None and link.text:
                        url_data = {
                            'url': normalize_url(link.text.strip()),
                            'last_modified': '',
                            'changefreq': '',
                            'priority': ''
                        }
                        
                        # Try to get publication date
                        pubdate = item.find('pubDate')
                        if pubdate is not None and pubdate.text:
                            url_data['last_modified'] = pubdate.text.strip()
                            
                        urls.append(url_data)
                        
                self.logger.info(f"Found {len(urls)} URLs in RSS feed")
                
        except Exception as e:
            self.logger.error(f"Error parsing RSS feed: {e}")
            
        return urls
    
    def crawl(self, max_sitemaps: int = 50) -> Dict[str, Dict]:
        """Crawl website using sitemaps with enhanced discovery."""
        self.logger.info(f"Starting enhanced sitemap crawl for {self.domain}")
        
        # Discover sitemap URLs
        sitemap_urls = self.discover_sitemaps()
        self.logger.info(f"Checking {len(sitemap_urls)} potential sitemap locations")
        
        all_urls = {}
        processed_sitemaps = set()
        sitemap_queue = sitemap_urls.copy()
        
        while sitemap_queue and len(processed_sitemaps) < max_sitemaps:
            sitemap_url = sitemap_queue.pop(0)
            
            # Skip if already processed
            if sitemap_url in processed_sitemaps:
                continue
                
            processed_sitemaps.add(sitemap_url)
            
            # Fetch sitemap content
            content = self.fetch_content(sitemap_url)
            if not content:
                continue
                
            self.logger.info(f"Processing sitemap: {sitemap_url}")
            
            # Detect sitemap type
            content_lower = content[:1000].lower()
            
            if '<sitemapindex' in content_lower:
                # Sitemap index
                self.logger.info(f"Found sitemap index at {sitemap_url}")
                sub_sitemaps = self.parse_sitemap_index(content, sitemap_url)
                
                # Add discovered sitemaps to queue
                for sub_sitemap in sub_sitemaps:
                    if sub_sitemap not in processed_sitemaps:
                        sitemap_queue.append(sub_sitemap)
                        
                self.logger.info(f"Added {len(sub_sitemaps)} sub-sitemaps to queue")
                
            elif '<urlset' in content_lower:
                # Regular sitemap
                urls = self.parse_sitemap(content, sitemap_url)
                self.logger.info(f"Found {len(urls)} URLs in {sitemap_url}")
                
                for url_data in urls:
                    # Add metadata
                    url_data.update({
                        'status_code': 200,  # Assumed from sitemap
                        'content_type': 'text/html',  # Assumed
                        'size': 0,  # Unknown from sitemap
                    })
                    all_urls[url_data['url']] = url_data
                    
            elif '<rss' in content_lower:
                # RSS feed
                self.logger.info(f"Found RSS feed at {sitemap_url}")
                urls = self.parse_rss_feed(content, sitemap_url)
                
                for url_data in urls:
                    url_data.update({
                        'status_code': 200,
                        'content_type': 'text/html',
                        'size': 0,
                    })
                    all_urls[url_data['url']] = url_data
                    
            else:
                # Try parsing anyway
                urls = self.parse_sitemap(content, sitemap_url)
                if urls:
                    self.logger.info(f"Found {len(urls)} URLs using fallback parsing")
                    for url_data in urls:
                        url_data.update({
                            'status_code': 200,
                            'content_type': 'text/html',
                            'size': 0,
                        })
                        all_urls[url_data['url']] = url_data
        
        # Filter URLs to only include those from the target domain
        filtered_urls = {}
        for url, data in all_urls.items():
            parsed = urlparse(url)
            if parsed.netloc == self.domain or parsed.netloc == f'www.{self.domain}' or parsed.netloc.endswith(f'.{self.domain}'):
                filtered_urls[url] = data
                
        self.logger.info(f"Total unique URLs found: {len(filtered_urls)} (from {len(all_urls)} total)")
        self.logger.info(f"Processed {len(processed_sitemaps)} sitemaps")
        
        return filtered_urls
    
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
    
    def get_url_stats(self, url_metadata: Dict[str, Dict]) -> None:
        """Print statistics about discovered URLs."""
        if not url_metadata:
            return
            
        # Count URLs by type
        url_types = {}
        for url in url_metadata:
            if '/product' in url or '/item' in url:
                url_type = 'product'
            elif '/category' in url or '/collection' in url:
                url_type = 'category'
            elif '/blog' in url or '/article' in url or '/post' in url:
                url_type = 'blog'
            elif '/page' in url:
                url_type = 'page'
            else:
                url_type = 'other'
                
            url_types[url_type] = url_types.get(url_type, 0) + 1
            
        print("\nURL Statistics:")
        print(f"Total URLs: {len(url_metadata)}")
        for url_type, count in sorted(url_types.items(), key=lambda x: x[1], reverse=True):
            print(f"  {url_type}: {count}")


def main():
    """Main entry point."""
    if len(sys.argv) < 2:
        print("Usage: python enhanced_sitemap_crawler.py <domain> [max_sitemaps]")
        print("Example: python enhanced_sitemap_crawler.py revzilla.com 50")
        sys.exit(1)
    
    domain = sys.argv[1].replace('https://', '').replace('http://', '').rstrip('/')
    max_sitemaps = int(sys.argv[2]) if len(sys.argv) > 2 else 50
    
    crawler = EnhancedSitemapCrawler(domain)
    url_metadata = crawler.crawl(max_sitemaps=max_sitemaps)
    
    if url_metadata:
        crawler.save_dump_csv(url_metadata)
        print(f"\nEnhanced sitemap crawl complete! Found {len(url_metadata)} URLs")
        print(f"Results saved to: {crawler.output_file}")
        crawler.get_url_stats(url_metadata)
    else:
        print("\nEnhanced sitemap crawl failed - no URLs found")
        sys.exit(1)


if __name__ == '__main__':
    main()