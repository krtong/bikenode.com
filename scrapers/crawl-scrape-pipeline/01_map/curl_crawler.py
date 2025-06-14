#!/usr/bin/env python3
"""
Universal crawler using curl user agent.
Automatically tries curl when other methods fail, without site-specific logic.
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


class CurlCrawler:
    """Universal crawler that uses curl user agent when needed."""
    
    def __init__(self, domain: str):
        self.domain = domain
        self.logger = setup_logging('curl_crawler', Path(__file__).parent / 'curl_crawl.log')
        self.output_file = Path(__file__).parent / 'dump.csv'
        self.session = None
        self.user_agents = [
            # Try common user agents first
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            # Then try bot user agents
            'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
            # Finally try curl as last resort
            'curl/7.64.1',
            'curl/7.68.0',
            'curl/8.0.1',
        ]
        self.current_ua_index = 0
        
    def _setup_session(self, user_agent: str) -> requests.Session:
        """Set up requests session with specified user agent."""
        session = requests.Session()
        
        # Adjust headers based on user agent type
        if 'curl' in user_agent.lower():
            # Minimal headers for curl
            headers = {
                'User-Agent': user_agent,
                'Accept': '*/*',
            }
        else:
            # Full browser headers
            headers = {
                'User-Agent': user_agent,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Cache-Control': 'no-cache',
            }
        
        session.headers.update(headers)
        
        # Configure retries
        from requests.adapters import HTTPAdapter
        from requests.packages.urllib3.util.retry import Retry
        
        retry_strategy = Retry(
            total=3,
            backoff_factor=1,
            status_forcelist=[500, 502, 503, 504],
        )
        adapter = HTTPAdapter(max_retries=retry_strategy)
        session.mount("http://", adapter)
        session.mount("https://", adapter)
        
        return session
    
    def try_next_user_agent(self) -> bool:
        """Try the next user agent in the list."""
        if self.current_ua_index < len(self.user_agents) - 1:
            self.current_ua_index += 1
            user_agent = self.user_agents[self.current_ua_index]
            self.logger.info(f"Switching to user agent: {user_agent}")
            self.session = self._setup_session(user_agent)
            return True
        return False
    
    def fetch_content(self, url: str) -> Optional[str]:
        """Fetch content, automatically trying different user agents if blocked."""
        # Initialize with first user agent if not set
        if self.session is None:
            self.session = self._setup_session(self.user_agents[0])
        
        while True:
            try:
                self.logger.info(f"Fetching: {url} with UA: {self.user_agents[self.current_ua_index]}")
                
                # Add small delay to be polite
                time.sleep(random.uniform(0.5, 1.0))
                
                response = self.session.get(url, timeout=30)
                
                # Check if we're blocked
                if response.status_code == 403:
                    self.logger.warning(f"Got 403 with {self.user_agents[self.current_ua_index]}")
                    if self.try_next_user_agent():
                        continue  # Try again with new UA
                    else:
                        self.logger.error("All user agents exhausted")
                        return None
                
                response.raise_for_status()
                
                # Check for bot detection patterns in content
                content_lower = response.text.lower()
                bot_indicators = ['access denied', 'captcha', 'cf-browser-verification']
                
                if any(indicator in content_lower for indicator in bot_indicators):
                    self.logger.warning(f"Bot detection suspected with {self.user_agents[self.current_ua_index]}")
                    if self.try_next_user_agent():
                        continue
                    else:
                        return None
                
                # Success!
                self.logger.info(f"Successfully fetched with {self.user_agents[self.current_ua_index]}")
                return response.text
                
            except requests.exceptions.HTTPError as e:
                if e.response.status_code == 404:
                    self.logger.warning(f"404 Not Found: {url}")
                    return None
                else:
                    self.logger.error(f"HTTP Error {e.response.status_code}: {url}")
                    if self.try_next_user_agent():
                        continue
                    return None
                    
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
        """Crawl using sitemap with automatic user agent adaptation."""
        self.logger.info(f"Starting curl-based crawl for {self.domain}")
        
        # Try to find sitemap
        sitemap_urls = [
            f"https://www.{self.domain}/sitemap.xml",
            f"https://{self.domain}/sitemap.xml",
        ]
        
        # First, try robots.txt to find sitemap
        robots_urls = [
            f"https://www.{self.domain}/robots.txt",
            f"https://{self.domain}/robots.txt",
        ]
        
        for robots_url in robots_urls:
            robots_content = self.fetch_content(robots_url)
            if robots_content:
                self.logger.info("Successfully fetched robots.txt")
                # Extract sitemap URL from robots.txt
                for line in robots_content.split('\n'):
                    if line.lower().startswith('sitemap:'):
                        sitemap_url = line.split(':', 1)[1].strip()
                        if sitemap_url not in sitemap_urls:
                            sitemap_urls.insert(0, sitemap_url)  # Prioritize
                            self.logger.info(f"Found sitemap URL in robots.txt: {sitemap_url}")
        
        all_urls = {}
        
        # Try to fetch sitemaps
        for sitemap_url in sitemap_urls:
            sitemap_content = self.fetch_content(sitemap_url)
            
            if not sitemap_content:
                continue
                
            self.logger.info(f"Successfully fetched sitemap from {sitemap_url}")
            
            # Check if it's a sitemap index
            if '<sitemapindex' in sitemap_content:
                self.logger.info("Found sitemap index")
                sub_sitemaps = self.parse_sitemap_index(sitemap_content)
                
                for i, sub_sitemap in enumerate(sub_sitemaps[:max_sitemaps]):
                    sub_content = self.fetch_content(sub_sitemap)
                    if sub_content:
                        urls = self.parse_sitemap(sub_content)
                        self.logger.info(f"Found {len(urls)} URLs in {sub_sitemap}")
                        
                        for url_data in urls:
                            all_urls[url_data['url']] = url_data
            else:
                # Regular sitemap
                urls = self.parse_sitemap(sitemap_content)
                self.logger.info(f"Found {len(urls)} URLs in {sitemap_url}")
                
                for url_data in urls:
                    all_urls[url_data['url']] = url_data
                    
            if all_urls:
                break  # Found URLs, stop trying
        
        self.logger.info(f"Total unique URLs found: {len(all_urls)}")
        self.logger.info(f"Final successful user agent: {self.user_agents[self.current_ua_index]}")
        
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


def main():
    """Main entry point."""
    if len(sys.argv) < 2:
        print("Usage: python curl_crawler.py <domain>")
        sys.exit(1)
    
    domain = sys.argv[1].replace('https://', '').replace('http://', '').rstrip('/')
    
    crawler = CurlCrawler(domain)
    url_metadata = crawler.crawl()
    
    if url_metadata:
        crawler.save_dump_csv(url_metadata)
        print(f"\nCrawl complete! Found {len(url_metadata)} URLs")
        print(f"Results saved to: {crawler.output_file}")
    else:
        print("\nCrawl failed - no URLs found with any user agent")
        sys.exit(1)


if __name__ == '__main__':
    main()