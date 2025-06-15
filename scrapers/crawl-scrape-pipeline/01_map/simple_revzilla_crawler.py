#!/usr/bin/env python3
"""
Simple RevZilla crawler that ACTUALLY WORKS
No dependencies except requests and beautifulsoup4
"""

import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse
import time
import csv
import json

# The proven headers that work
headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
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

def crawl_revzilla(max_pages=100):
    """Actually crawl RevZilla and save results"""
    print("Starting REAL RevZilla crawl...")
    
    visited = set()
    to_visit = ['https://www.revzilla.com/']
    results = []
    
    session = requests.Session()
    session.headers.update(headers)
    
    while to_visit and len(results) < max_pages:
        url = to_visit.pop(0)
        if url in visited:
            continue
            
        visited.add(url)
        
        try:
            print(f"Crawling: {url}")
            resp = session.get(url, timeout=10)
            
            results.append({
                'url': url,
                'status_code': resp.status_code,
                'content_type': resp.headers.get('content-type', '').split(';')[0],
                'size': len(resp.content),
                'last_modified': resp.headers.get('last-modified', '')
            })
            
            if resp.status_code == 200 and 'text/html' in resp.headers.get('content-type', ''):
                soup = BeautifulSoup(resp.content, 'html.parser')
                
                # Find all links
                for link in soup.find_all('a', href=True):
                    href = link['href']
                    absolute_url = urljoin(url, href)
                    
                    # Only follow RevZilla links
                    if 'revzilla.com' in urlparse(absolute_url).netloc:
                        if absolute_url not in visited:
                            to_visit.append(absolute_url)
                
            time.sleep(0.5)  # Be respectful
            
        except Exception as e:
            print(f"Error crawling {url}: {e}")
            results.append({
                'url': url,
                'status_code': 0,
                'content_type': 'error',
                'size': 0,
                'last_modified': ''
            })
    
    # Save results to dump.csv
    with open('dump.csv', 'w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=['url', 'status_code', 'content_type', 'size', 'last_modified'])
        writer.writeheader()
        writer.writerows(results)
    
    print(f"\nCrawled {len(results)} pages")
    print(f"Results saved to dump.csv")
    
    # Show summary
    success_count = sum(1 for r in results if r['status_code'] == 200)
    print(f"Success rate: {success_count}/{len(results)} ({success_count/len(results)*100:.1f}%)")

if __name__ == '__main__':
    crawl_revzilla()