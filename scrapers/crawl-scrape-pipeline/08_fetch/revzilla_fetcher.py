#!/usr/bin/env python3
"""
RevZilla-specific fetcher using curl user agent.
Successfully bypasses bot detection to fetch product pages.
"""

import json
import time
import random
import sys
from pathlib import Path
from typing import Dict, List, Optional
import requests

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent / 'orchestration'))

from utils_minimal import setup_logging


class RevZillaFetcher:
    """Fetcher specifically configured for RevZilla."""
    
    def __init__(self):
        self.domain = 'revzilla.com'
        self.logger = setup_logging('revzilla_fetcher', Path(__file__).parent / 'revzilla_fetch.log')
        self.session = self._setup_session()
        self.failed_urls = []
        self.success_count = 0
        
    def _setup_session(self) -> requests.Session:
        """Set up session with curl user agent."""
        session = requests.Session()
        
        # Use curl user agent which bypasses RevZilla's bot detection
        session.headers.update({
            'User-Agent': 'curl/7.64.1',
            'Accept': '*/*',
        })
        
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
    
    def fetch_url(self, url: str) -> Optional[Dict]:
        """Fetch a single URL and return the response data."""
        try:
            # Add delay between requests
            if self.success_count > 0:
                delay = random.uniform(1.0, 2.0)
                time.sleep(delay)
            
            self.logger.info(f"Fetching: {url}")
            response = self.session.get(url, timeout=30)
            
            if response.status_code == 200:
                self.success_count += 1
                
                # Check if we got actual product content
                if len(response.text) < 10000:
                    self.logger.warning(f"Suspiciously small response for {url}: {len(response.text)} bytes")
                
                return {
                    'url': url,
                    'status_code': response.status_code,
                    'content_type': response.headers.get('Content-Type', ''),
                    'content_length': len(response.text),
                    'html': response.text,
                    'fetched_at': time.time(),
                }
            elif response.status_code == 403:
                self.logger.error(f"403 Forbidden for {url} - bot detection may be active")
                self.failed_urls.append(url)
            elif response.status_code == 404:
                self.logger.warning(f"404 Not Found for {url}")
            else:
                self.logger.error(f"Unexpected status {response.status_code} for {url}")
                self.failed_urls.append(url)
                
        except Exception as e:
            self.logger.error(f"Error fetching {url}: {e}")
            self.failed_urls.append(url)
            
        return None
    
    def fetch_batch(self, urls: List[str], output_file: str) -> Dict:
        """Fetch a batch of URLs and save to NDJSON file."""
        self.logger.info(f"Starting batch fetch of {len(urls)} URLs")
        
        results = []
        start_time = time.time()
        
        with open(output_file, 'w', encoding='utf-8') as f:
            for i, url in enumerate(urls):
                # Progress logging
                if i > 0 and i % 10 == 0:
                    elapsed = time.time() - start_time
                    rate = i / elapsed
                    self.logger.info(f"Progress: {i}/{len(urls)} ({i/len(urls)*100:.1f}%) - {rate:.1f} URLs/sec")
                
                result = self.fetch_url(url)
                if result:
                    # Write to NDJSON
                    f.write(json.dumps(result) + '\n')
                    f.flush()
                    results.append(result)
                    
                # Rate limiting check
                if len(self.failed_urls) > 5:
                    self.logger.error("Too many failures, stopping batch")
                    break
        
        elapsed = time.time() - start_time
        
        stats = {
            'total_urls': len(urls),
            'successful': len(results),
            'failed': len(self.failed_urls),
            'elapsed_seconds': elapsed,
            'urls_per_second': len(results) / elapsed if elapsed > 0 else 0,
            'failed_urls': self.failed_urls,
        }
        
        self.logger.info(f"Batch complete: {stats['successful']}/{stats['total_urls']} successful in {elapsed:.1f}s")
        
        return stats


def main():
    """Main entry point for testing."""
    if len(sys.argv) < 2:
        print("Usage: python revzilla_fetcher.py <urls_file> [output_file]")
        sys.exit(1)
    
    urls_file = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else 'revzilla_batch.ndjson'
    
    # Read URLs
    with open(urls_file, 'r') as f:
        urls = [line.strip() for line in f if line.strip() and 'revzilla.com' in line]
    
    if not urls:
        print("No RevZilla URLs found in input file")
        sys.exit(1)
    
    print(f"Found {len(urls)} RevZilla URLs")
    
    # Fetch batch
    fetcher = RevZillaFetcher()
    stats = fetcher.fetch_batch(urls[:50], output_file)  # Limit to 50 for testing
    
    print(f"\nFetch complete!")
    print(f"Successful: {stats['successful']}")
    print(f"Failed: {stats['failed']}")
    print(f"Rate: {stats['urls_per_second']:.2f} URLs/sec")
    print(f"Output saved to: {output_file}")
    
    if stats['failed_urls']:
        print(f"\nFailed URLs:")
        for url in stats['failed_urls'][:5]:
            print(f"  - {url}")


if __name__ == '__main__':
    main()