#!/usr/bin/env python3
"""
Concurrent crawler using asyncio and aiohttp for better performance.
"""

import asyncio
import aiohttp
import csv
import sys
import time
from pathlib import Path
from typing import Dict, Set, List
from urllib.parse import urljoin, urlparse
from bs4 import BeautifulSoup
from collections import deque

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))
from orchestration.utils_minimal import normalize_url, is_valid_url, logger


class ConcurrentCrawler:
    """High-performance concurrent web crawler."""
    
    def __init__(self, domain: str, max_pages: int = 200, max_concurrent: int = 10):
        self.domain = domain
        self.max_pages = max_pages
        self.max_concurrent = max_concurrent
        self.visited_urls: Set[str] = set()
        self.url_metadata: Dict[str, Dict] = {}
        self.to_visit = asyncio.Queue()
        self.session = None
        self.start_time = None
        
    def is_same_domain(self, url: str) -> bool:
        """Check if URL belongs to the same domain."""
        parsed = urlparse(url)
        return (parsed.netloc == self.domain or 
                parsed.netloc == f'www.{self.domain}' or 
                parsed.netloc.endswith(f'.{self.domain}'))
    
    async def fetch_url(self, url: str, retry_count: int = 0) -> None:
        """Fetch a single URL and extract links."""
        if url in self.visited_urls or len(self.visited_urls) >= self.max_pages:
            return
            
        self.visited_urls.add(url)
        
        try:
            async with self.session.get(url, timeout=aiohttp.ClientTimeout(total=30)) as response:
                # Collect metadata
                content = await response.read()
                content_type = response.headers.get('content-type', '').split(';')[0].strip()
                
                self.url_metadata[url] = {
                    'url': url,
                    'status_code': response.status,
                    'content_type': content_type,
                    'size': len(content),
                    'last_modified': response.headers.get('last-modified', '')
                }
                
                logger.info(f"[{len(self.visited_urls)}/{self.max_pages}] Fetched {url} - Status: {response.status}, Size: {len(content)}")
                
                # Handle rate limiting
                if response.status == 429:
                    if retry_count < 3:
                        retry_after = int(response.headers.get('Retry-After', 2 ** retry_count))
                        logger.warning(f"Rate limited on {url}, retrying after {retry_after} seconds (attempt {retry_count + 1}/3)")
                        await asyncio.sleep(retry_after)
                        self.visited_urls.discard(url)  # Remove from visited to retry
                        await self.fetch_url(url, retry_count + 1)
                        return
                    else:
                        logger.error(f"Max retries exceeded for {url} due to rate limiting")
                
                # Extract links from HTML pages
                if response.status == 200 and 'text/html' in content_type:
                    try:
                        soup = BeautifulSoup(content, 'html.parser')
                        links_found = 0
                        
                        for link in soup.find_all('a', href=True):
                            href = link['href']
                            absolute_url = normalize_url(urljoin(url, href))
                            
                            if (self.is_same_domain(absolute_url) and 
                                absolute_url not in self.visited_urls and
                                len(self.visited_urls) < self.max_pages):
                                await self.to_visit.put(absolute_url)
                                links_found += 1
                        
                        if links_found > 0:
                            logger.debug(f"Found {links_found} new links on {url}")
                            
                    except Exception as e:
                        logger.warning(f"Error parsing HTML for {url}: {e}")
                        
        except asyncio.TimeoutError:
            logger.error(f"Timeout fetching {url}")
            self.url_metadata[url] = {
                'url': url,
                'status_code': 0,
                'content_type': 'timeout',
                'size': 0,
                'last_modified': ''
            }
        except Exception as e:
            logger.error(f"Error fetching {url}: {e}")
            self.url_metadata[url] = {
                'url': url,
                'status_code': 0,
                'content_type': 'error',
                'size': 0,
                'last_modified': ''
            }
    
    async def worker(self):
        """Worker coroutine that processes URLs from the queue."""
        while len(self.visited_urls) < self.max_pages:
            try:
                # Get URL from queue with timeout
                url = await asyncio.wait_for(self.to_visit.get(), timeout=5.0)
                await self.fetch_url(url)
                # Small delay to be respectful
                await asyncio.sleep(0.1)
            except asyncio.TimeoutError:
                # No more URLs in queue
                break
            except Exception as e:
                logger.error(f"Worker error: {e}")
    
    async def crawl(self):
        """Main crawling logic."""
        self.start_time = time.time()
        
        # Configure session with headers
        headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
        }
        
        connector = aiohttp.TCPConnector(limit=self.max_concurrent)
        async with aiohttp.ClientSession(headers=headers, connector=connector) as self.session:
            # Add initial URLs
            await self.to_visit.put(f'https://{self.domain}/')
            await self.to_visit.put(f'https://www.{self.domain}/')
            
            # Start worker tasks
            workers = [asyncio.create_task(self.worker()) for _ in range(self.max_concurrent)]
            
            # Wait for all workers to complete
            await asyncio.gather(*workers, return_exceptions=True)
        
        elapsed = time.time() - self.start_time
        logger.info(f"Crawl complete in {elapsed:.2f} seconds")
        logger.info(f"Crawled {len(self.visited_urls)} pages at {len(self.visited_urls)/elapsed:.2f} pages/second")
    
    def save_results(self):
        """Save crawl results to CSV file."""
        output_file = Path(__file__).parent / 'dump.csv'
        
        with open(output_file, 'w', newline='', encoding='utf-8') as f:
            fieldnames = ['url', 'status_code', 'content_type', 'size', 'last_modified']
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            
            for url in sorted(self.url_metadata.keys()):
                writer.writerow(self.url_metadata[url])
        
        logger.info(f"Saved {len(self.url_metadata)} URLs to {output_file}")
        
        # Also save sitemap.txt for compatibility
        sitemap_file = Path(__file__).parent / 'sitemap.txt'
        with open(sitemap_file, 'w', encoding='utf-8') as f:
            for url in sorted(self.url_metadata.keys()):
                if self.url_metadata[url]['status_code'] == 200:
                    f.write(url + '\n')
        
        return output_file


async def main():
    """Main entry point."""
    if len(sys.argv) < 2:
        print("Usage: python concurrent_crawler.py <domain> [max_pages]")
        sys.exit(1)
    
    domain = sys.argv[1].replace('https://', '').replace('http://', '').rstrip('/')
    max_pages = int(sys.argv[2]) if len(sys.argv) > 2 else 200
    
    logger.info(f"Starting concurrent crawl of {domain} (max {max_pages} pages)")
    
    crawler = ConcurrentCrawler(domain, max_pages=max_pages)
    await crawler.crawl()
    
    output_file = crawler.save_results()
    
    print(f"\nMapping complete! Found {len(crawler.url_metadata)} URLs")
    print(f"Results saved to: {output_file}")
    
    # Print some statistics
    status_counts = {}
    for metadata in crawler.url_metadata.values():
        status = metadata['status_code']
        status_counts[status] = status_counts.get(status, 0) + 1
    
    print("\nStatus code distribution:")
    for status, count in sorted(status_counts.items()):
        print(f"  {status}: {count}")


if __name__ == "__main__":
    asyncio.run(main())