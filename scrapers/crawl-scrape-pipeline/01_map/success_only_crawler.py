#!/usr/bin/env python3
"""
Success-Only Crawler: Designed to get only 200 status codes on any website.
Uses advanced techniques to avoid rate limits, blocks, and errors.
"""

import csv
import time
import random
import requests
from pathlib import Path
from typing import Dict, List, Set, Optional, Tuple
from urllib.parse import urlparse, urljoin
from bs4 import BeautifulSoup
import hashlib
import re
from datetime import datetime
from collections import deque, defaultdict

class SuccessOnlyCrawler:
    """Crawler optimized to get only 200 status codes."""
    
    def __init__(self, domain: str):
        self.domain = domain
        self.output_file = Path(__file__).parent / 'dump.csv'
        self.url_metadata = {}
        
        # Advanced configuration for success
        self.config = {
            'initial_delay': 2.0,  # Start conservative
            'min_delay': 0.5,
            'max_delay': 10.0,
            'success_threshold': 10,  # Speed up after N successes
            'failure_threshold': 2,   # Slow down after N failures
            'max_pages': 200,
            'timeout': 30,
            'max_retries': 5,
            'backoff_multiplier': 2.0,
        }
        
        # Track performance metrics
        self.metrics = {
            'consecutive_200s': 0,
            'consecutive_failures': 0,
            'total_200s': 0,
            'total_non_200s': 0,
            'current_delay': self.config['initial_delay'],
            'blocked_patterns': set(),
            'successful_patterns': set(),
        }
        
        # User agent pool - diverse and legitimate
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
        
        # Session management
        self.sessions = self._create_session_pool()
        self.current_session_idx = 0
        
    def _create_session_pool(self) -> List[requests.Session]:
        """Create multiple sessions with different configurations."""
        sessions = []
        
        for ua in self.user_agents[:3]:  # Create 3 sessions
            session = requests.Session()
            
            # Configure session
            session.headers.update({
                'User-Agent': ua,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
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
            })
            
            # Configure retries
            from requests.adapters import HTTPAdapter
            from urllib3.util.retry import Retry
            
            retry_strategy = Retry(
                total=3,
                backoff_factor=1,
                status_forcelist=[500, 502, 503, 504],
            )
            adapter = HTTPAdapter(max_retries=retry_strategy)
            session.mount("http://", adapter)
            session.mount("https://", adapter)
            
            sessions.append(session)
            
        return sessions
    
    def _get_session(self) -> requests.Session:
        """Get next session from pool (round-robin)."""
        session = self.sessions[self.current_session_idx]
        self.current_session_idx = (self.current_session_idx + 1) % len(self.sessions)
        return session
    
    def _should_crawl_url(self, url: str) -> bool:
        """Determine if URL is likely to return 200."""
        parsed = urlparse(url)
        path = parsed.path.lower()
        
        # Skip URLs likely to fail
        skip_patterns = [
            r'/api/',  # API endpoints often require auth
            r'/admin',  # Admin pages
            r'/wp-admin',  # WordPress admin
            r'/checkout',  # E-commerce checkout
            r'/cart',  # Shopping cart (often requires session)
            r'/account',  # User accounts
            r'/login',  # Login pages
            r'/logout',  # Logout endpoints
            r'/download/',  # Downloads might be protected
            r'\.pdf$',  # PDF files
            r'\.zip$',  # Archive files
            r'/ajax/',  # AJAX endpoints
            r'/graphql',  # GraphQL endpoints
        ]
        
        for pattern in skip_patterns:
            if re.search(pattern, path):
                return False
        
        # Check if pattern previously failed
        url_pattern = self._get_url_pattern(url)
        if url_pattern in self.metrics['blocked_patterns']:
            return False
        
        # Prioritize patterns that worked before
        if url_pattern in self.metrics['successful_patterns']:
            return True
        
        return True
    
    def _get_url_pattern(self, url: str) -> str:
        """Extract URL pattern for learning."""
        parsed = urlparse(url)
        path = parsed.path
        
        # Replace common dynamic parts
        path = re.sub(r'/\d+', '/{id}', path)
        path = re.sub(r'/[a-f0-9]{32}', '/{hash}', path)
        path = re.sub(r'/[a-z0-9\-]+$', '/{slug}', path)
        
        return f"{parsed.scheme}://{parsed.netloc}{path}"
    
    def _smart_delay(self) -> None:
        """Implement intelligent delay based on success/failure patterns."""
        delay = self.metrics['current_delay']
        
        # Add jitter (±20%)
        jitter = delay * 0.2
        actual_delay = delay + random.uniform(-jitter, jitter)
        
        time.sleep(max(0.1, actual_delay))
    
    def _update_metrics(self, url: str, status_code: int) -> None:
        """Update performance metrics based on response."""
        if status_code == 200:
            self.metrics['consecutive_200s'] += 1
            self.metrics['consecutive_failures'] = 0
            self.metrics['total_200s'] += 1
            
            # Record successful pattern
            pattern = self._get_url_pattern(url)
            self.metrics['successful_patterns'].add(pattern)
            
            # Speed up if doing well
            if self.metrics['consecutive_200s'] >= self.config['success_threshold']:
                old_delay = self.metrics['current_delay']
                self.metrics['current_delay'] = max(
                    self.config['min_delay'],
                    self.metrics['current_delay'] * 0.8
                )
                if old_delay != self.metrics['current_delay']:
                    print(f"✓ Speeding up: {old_delay:.1f}s → {self.metrics['current_delay']:.1f}s")
        else:
            self.metrics['consecutive_200s'] = 0
            self.metrics['consecutive_failures'] += 1
            self.metrics['total_non_200s'] += 1
            
            # Record problematic pattern
            if status_code in [403, 429, 401]:
                pattern = self._get_url_pattern(url)
                self.metrics['blocked_patterns'].add(pattern)
            
            # Slow down if hitting issues
            if self.metrics['consecutive_failures'] >= self.config['failure_threshold']:
                old_delay = self.metrics['current_delay']
                self.metrics['current_delay'] = min(
                    self.config['max_delay'],
                    self.metrics['current_delay'] * self.config['backoff_multiplier']
                )
                if old_delay != self.metrics['current_delay']:
                    print(f"⚠ Slowing down: {old_delay:.1f}s → {self.metrics['current_delay']:.1f}s")
    
    def _fetch_with_fallback(self, url: str) -> Optional[requests.Response]:
        """Fetch URL with multiple fallback strategies."""
        session = self._get_session()
        
        # Strategy 1: Direct request
        try:
            response = session.get(url, timeout=self.config['timeout'], allow_redirects=True)
            if response.status_code == 200:
                return response
        except:
            pass
        
        # Strategy 2: Try with different headers
        headers_variations = [
            {'Referer': f'https://www.google.com/'},
            {'Referer': f'https://{self.domain}/'},
            {'Accept': '*/*'},
            {},  # Minimal headers
        ]
        
        for headers in headers_variations:
            try:
                # Create new session with modified headers
                temp_session = requests.Session()
                temp_session.headers.update(session.headers)
                temp_session.headers.update(headers)
                
                response = temp_session.get(url, timeout=self.config['timeout'], allow_redirects=True)
                if response.status_code == 200:
                    return response
                    
                # Wait before next attempt
                time.sleep(1)
            except:
                continue
        
        return None
    
    def crawl(self) -> Dict[str, Dict]:
        """Crawl website focusing on getting only 200 responses."""
        print(f"Starting Success-Only Crawler for {self.domain}")
        print(f"Goal: Collect {self.config['max_pages']} URLs with 200 status codes")
        
        # Initialize URL queue with smart ordering
        visited = set()
        queue = deque()
        
        # Start with common successful patterns
        start_urls = [
            f'https://{self.domain}/',
            f'https://www.{self.domain}/',
            f'https://{self.domain}/index.html',
            f'https://{self.domain}/home',
            f'https://{self.domain}/products',
            f'https://{self.domain}/services',
            f'https://{self.domain}/about',
            f'https://{self.domain}/contact',
        ]
        
        for url in start_urls:
            queue.append(url)
        
        pages_crawled = 0
        successful_pages = 0
        
        while queue and successful_pages < self.config['max_pages']:
            url = queue.popleft()
            
            if url in visited:
                continue
                
            visited.add(url)
            
            # Check if URL is worth trying
            if not self._should_crawl_url(url):
                continue
            
            # Smart delay
            self._smart_delay()
            
            # Try to fetch
            print(f"[{successful_pages + 1}/{self.config['max_pages']}] Trying: {url}")
            
            response = self._fetch_with_fallback(url)
            pages_crawled += 1
            
            if response and response.status_code == 200:
                # Success! Process the page
                successful_pages += 1
                
                # Extract metadata
                content_type = response.headers.get('content-type', '').split(';')[0].strip()
                
                self.url_metadata[url] = {
                    'url': url,
                    'status_code': 200,
                    'content_type': content_type,
                    'size': len(response.content),
                    'last_modified': response.headers.get('last-modified', ''),
                }
                
                print(f"✓ Success! {url} (delay: {self.metrics['current_delay']:.1f}s)")
                
                # Update metrics
                self._update_metrics(url, 200)
                
                # Extract more URLs if HTML
                if 'text/html' in content_type:
                    try:
                        soup = BeautifulSoup(response.content, 'html.parser')
                        
                        # Find all links
                        for link in soup.find_all('a', href=True):
                            href = link['href']
                            absolute_url = urljoin(url, href)
                            parsed = urlparse(absolute_url)
                            
                            # Only same domain
                            if self._is_same_domain(parsed.netloc):
                                if absolute_url not in visited and absolute_url not in queue:
                                    # Prioritize based on success likelihood
                                    if self._should_crawl_url(absolute_url):
                                        queue.append(absolute_url)
                    except:
                        pass
            else:
                # Failed - update metrics
                status = response.status_code if response else 0
                self._update_metrics(url, status)
                print(f"✗ Failed: {url} (status: {status})")
        
        # Final report
        print("\n" + "="*60)
        print(f"Crawl Complete! Results:")
        print(f"- Total URLs tried: {pages_crawled}")
        print(f"- Successful (200): {successful_pages}")
        print(f"- Success rate: {(successful_pages/pages_crawled*100):.1f}%")
        print(f"- URLs collected: {len(self.url_metadata)}")
        print("="*60)
        
        return self.url_metadata
    
    def _is_same_domain(self, netloc: str) -> bool:
        """Check if netloc belongs to target domain."""
        return (netloc == self.domain or 
                netloc == f'www.{self.domain}' or 
                netloc.endswith(f'.{self.domain}'))
    
    def save_results(self) -> None:
        """Save only successful URLs to CSV."""
        if not self.url_metadata:
            print("No successful URLs to save!")
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
        
        print(f"\nSaved {len(sorted_urls)} successful URLs to {self.output_file}")


def main():
    """Main entry point."""
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python success_only_crawler.py <domain>")
        sys.exit(1)
    
    domain = sys.argv[1].replace('https://', '').replace('http://', '').rstrip('/')
    
    crawler = SuccessOnlyCrawler(domain)
    crawler.crawl()
    crawler.save_results()


if __name__ == '__main__':
    main()