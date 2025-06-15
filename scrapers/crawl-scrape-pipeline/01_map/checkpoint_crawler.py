#!/usr/bin/env python3
"""
Crawler with checkpoint/resume capability for interrupted crawls.
Saves progress periodically and can resume from where it left off.
"""

import json
import csv
import sys
import time
import pickle
from pathlib import Path
from typing import Dict, Set, List, Optional
from urllib.parse import urljoin, urlparse
import requests
from bs4 import BeautifulSoup
from collections import deque
from datetime import datetime

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))
from orchestration.utils_minimal import normalize_url, is_valid_url, logger


class CheckpointCrawler:
    """Crawler with checkpoint/resume functionality."""
    
    def __init__(self, domain: str, checkpoint_file: Optional[str] = None):
        self.domain = domain
        self.checkpoint_file = checkpoint_file or f'{domain}_checkpoint.pkl'
        self.checkpoint_path = Path(__file__).parent / self.checkpoint_file
        self.output_file = Path(__file__).parent / 'dump.csv'
        
        # State to be checkpointed
        self.visited_urls: Set[str] = set()
        self.to_visit: deque = deque()
        self.url_metadata: Dict[str, Dict] = {}
        self.pages_crawled = 0
        self.start_time = None
        self.checkpoint_interval = 50  # Save every 50 pages
        self.last_checkpoint = 0
        
        # Session setup
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
        })
        
    def save_checkpoint(self):
        """Save current state to checkpoint file."""
        checkpoint_data = {
            'domain': self.domain,
            'visited_urls': self.visited_urls,
            'to_visit': list(self.to_visit),
            'url_metadata': self.url_metadata,
            'pages_crawled': self.pages_crawled,
            'timestamp': datetime.now().isoformat()
        }
        
        # Save as pickle for efficiency
        with open(self.checkpoint_path, 'wb') as f:
            pickle.dump(checkpoint_data, f)
        
        # Also save CSV incrementally
        self.save_csv()
        
        logger.info(f"Checkpoint saved: {self.pages_crawled} pages crawled, {len(self.to_visit)} URLs in queue")
        
    def load_checkpoint(self) -> bool:
        """Load state from checkpoint file if it exists."""
        if not self.checkpoint_path.exists():
            return False
            
        try:
            with open(self.checkpoint_path, 'rb') as f:
                checkpoint_data = pickle.load(f)
            
            # Restore state
            self.domain = checkpoint_data['domain']
            self.visited_urls = checkpoint_data['visited_urls']
            self.to_visit = deque(checkpoint_data['to_visit'])
            self.url_metadata = checkpoint_data['url_metadata']
            self.pages_crawled = checkpoint_data['pages_crawled']
            
            logger.info(f"Checkpoint loaded: {self.pages_crawled} pages already crawled")
            logger.info(f"Resuming with {len(self.to_visit)} URLs in queue")
            logger.info(f"Last checkpoint: {checkpoint_data['timestamp']}")
            
            return True
            
        except Exception as e:
            logger.error(f"Error loading checkpoint: {e}")
            return False
    
    def save_csv(self):
        """Save current results to CSV."""
        if not self.url_metadata:
            return
        
        with open(self.output_file, 'w', newline='', encoding='utf-8') as f:
            fieldnames = ['url', 'status_code', 'content_type', 'size', 'last_modified']
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            
            for url in sorted(self.url_metadata.keys()):
                writer.writerow(self.url_metadata[url])
    
    def is_same_domain(self, netloc: str) -> bool:
        """Check if URL belongs to same domain."""
        return (netloc == self.domain or 
                netloc == f'www.{self.domain}' or 
                netloc.endswith(f'.{self.domain}'))
    
    def fetch_url(self, url: str) -> Optional[Dict]:
        """Fetch a single URL and return metadata."""
        try:
            response = self.session.get(url, timeout=30, allow_redirects=True, verify=False)
            
            # Handle rate limiting with exponential backoff
            if response.status_code == 429:
                retry_after = int(response.headers.get('Retry-After', 60))
                logger.warning(f"Rate limited on {url}, waiting {retry_after} seconds")
                time.sleep(retry_after)
                return self.fetch_url(url)  # Retry
            
            content_type = response.headers.get('content-type', '').split(';')[0].strip()
            
            metadata = {
                'url': url,
                'status_code': response.status_code,
                'content_type': content_type,
                'size': len(response.content),
                'last_modified': response.headers.get('last-modified', '')
            }
            
            # Extract links if HTML
            if response.status_code == 200 and 'text/html' in content_type:
                try:
                    soup = BeautifulSoup(response.content, 'html.parser')
                    for link in soup.find_all('a', href=True):
                        href = link['href']
                        absolute_url = normalize_url(urljoin(url, href))
                        parsed = urlparse(absolute_url)
                        
                        if (self.is_same_domain(parsed.netloc) and 
                            absolute_url not in self.visited_urls):
                            self.to_visit.append(absolute_url)
                            
                except Exception as e:
                    logger.warning(f"Error parsing HTML for {url}: {e}")
            
            return metadata
            
        except Exception as e:
            logger.error(f"Error fetching {url}: {e}")
            return {
                'url': url,
                'status_code': 0,
                'content_type': 'error',
                'size': 0,
                'last_modified': ''
            }
    
    def crawl(self, max_pages: int = 1000):
        """Main crawling loop with checkpoint support."""
        self.start_time = time.time()
        
        # Try to resume from checkpoint
        resumed = self.load_checkpoint()
        
        if not resumed:
            # Fresh start
            logger.info(f"Starting fresh crawl of {self.domain}")
            self.to_visit.append(f'https://{self.domain}/')
            self.to_visit.append(f'https://www.{self.domain}/')
        
        while self.to_visit and self.pages_crawled < max_pages:
            url = self.to_visit.popleft()
            
            if url in self.visited_urls:
                continue
            
            self.visited_urls.add(url)
            
            logger.info(f"[{self.pages_crawled + 1}/{max_pages}] Fetching: {url}")
            
            metadata = self.fetch_url(url)
            if metadata:
                self.url_metadata[url] = metadata
                self.pages_crawled += 1
                
                # Save checkpoint periodically
                if self.pages_crawled - self.last_checkpoint >= self.checkpoint_interval:
                    self.save_checkpoint()
                    self.last_checkpoint = self.pages_crawled
            
            # Rate limiting
            time.sleep(0.5)
        
        # Final save
        self.save_checkpoint()
        
        # Clean up checkpoint file on successful completion
        if self.pages_crawled >= max_pages or not self.to_visit:
            self.checkpoint_path.unlink(missing_ok=True)
            logger.info("Crawl completed, checkpoint file removed")
        
        elapsed = time.time() - self.start_time
        logger.info(f"Crawled {self.pages_crawled} pages in {elapsed:.2f} seconds")
        logger.info(f"Average: {self.pages_crawled/elapsed:.2f} pages/second")
        
        return self.url_metadata


def main():
    """Main entry point."""
    if len(sys.argv) < 2:
        print("Usage: python checkpoint_crawler.py <domain> [max_pages] [--resume]")
        sys.exit(1)
    
    domain = sys.argv[1].replace('https://', '').replace('http://', '').rstrip('/')
    max_pages = int(sys.argv[2]) if len(sys.argv) > 2 else 1000
    resume = '--resume' in sys.argv
    
    crawler = CheckpointCrawler(domain)
    
    if resume and crawler.checkpoint_path.exists():
        print(f"Resuming crawl from checkpoint...")
    else:
        print(f"Starting new crawl of {domain} (max {max_pages} pages)")
    
    metadata = crawler.crawl(max_pages)
    
    print(f"\nCrawl complete! Found {len(metadata)} URLs")
    print(f"Results saved to: {crawler.output_file}")
    
    # Print status distribution
    status_counts = {}
    for m in metadata.values():
        status = m['status_code']
        status_counts[status] = status_counts.get(status, 0) + 1
    
    print("\nStatus code distribution:")
    for status, count in sorted(status_counts.items()):
        print(f"  {status}: {count}")


if __name__ == "__main__":
    main()