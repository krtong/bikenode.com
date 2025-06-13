#!/usr/bin/env python3
"""Simple site mapper using requests and BeautifulSoup."""

import sys
import csv
from pathlib import Path
from urllib.parse import urljoin, urlparse
import requests
from bs4 import BeautifulSoup
from collections import deque

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent / 'orchestration'))
from utils_minimal import setup_logging, normalize_url, is_valid_url

def simple_crawl(start_url, max_pages=50):
    """Simple crawler that discovers URLs on a website."""
    logger = setup_logging('simple_mapper', Path(__file__).parent / 'map.log')
    
    # Parse domain
    parsed = urlparse(start_url)
    domain = parsed.netloc
    
    # Track visited and to-visit URLs
    visited = set()
    to_visit = deque([start_url])
    url_metadata = {}
    
    logger.info(f"Starting simple crawl of {domain}")
    
    while to_visit and len(visited) < max_pages:
        url = to_visit.popleft()
        
        if url in visited:
            continue
            
        try:
            logger.info(f"Fetching {url}")
            response = requests.get(url, timeout=10)
            visited.add(url)
            
            # Store metadata
            url_metadata[url] = {
                'url': url,
                'status_code': response.status_code,
                'content_type': response.headers.get('content-type', ''),
                'size': len(response.content),
                'last_modified': response.headers.get('last-modified', '')
            }
            
            # Only parse HTML pages
            if response.status_code == 200 and 'text/html' in response.headers.get('content-type', ''):
                soup = BeautifulSoup(response.text, 'html.parser')
                
                # Find all links
                for link in soup.find_all('a', href=True):
                    href = link['href']
                    # Make URL absolute
                    absolute_url = urljoin(url, href)
                    
                    # Only follow links on same domain
                    if urlparse(absolute_url).netloc == domain and absolute_url not in visited:
                        to_visit.append(absolute_url)
                        
        except Exception as e:
            logger.error(f"Error fetching {url}: {e}")
            url_metadata[url] = {
                'url': url,
                'status_code': 0,
                'content_type': 'error',
                'size': 0,
                'last_modified': ''
            }
    
    logger.info(f"Crawled {len(visited)} pages")
    
    # Save to CSV
    output_file = Path(__file__).parent / 'dump.csv'
    with open(output_file, 'w', newline='', encoding='utf-8') as f:
        fieldnames = ['url', 'status_code', 'content_type', 'size', 'last_modified']
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        
        for url in sorted(url_metadata.keys()):
            writer.writerow(url_metadata[url])
    
    logger.info(f"Saved {len(url_metadata)} URLs to {output_file}")
    print(f"\nMapping complete! Found {len(url_metadata)} URLs")
    print(f"Results saved to: {output_file}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python simple_map.py <domain>")
        sys.exit(1)
    
    domain = sys.argv[1].replace('https://', '').replace('http://', '').rstrip('/')
    start_url = f"https://{domain}/"
    
    simple_crawl(start_url)