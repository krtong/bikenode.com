#!/usr/bin/env python3
"""
Minimal RevZilla crawler using only urllib (no external dependencies).
"""

import urllib.request
import urllib.parse
import ssl
import csv
import time
import re
from collections import deque

# SSL context
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

class MinimalCrawler:
    def __init__(self, domain):
        self.domain = domain
        self.visited = set()
        self.to_visit = deque([f'https://{domain}/', f'https://www.{domain}/'])
        self.results = []
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Cache-Control': 'max-age=0',
        }
    
    def crawl(self, max_pages=20):
        """Crawl the site up to max_pages."""
        pages_crawled = 0
        
        print(f"Starting crawl of {self.domain}...")
        print("="*60)
        
        while self.to_visit and pages_crawled < max_pages:
            url = self.to_visit.popleft()
            
            if url in self.visited:
                continue
                
            self.visited.add(url)
            
            try:
                req = urllib.request.Request(url, headers=self.headers)
                response = urllib.request.urlopen(req, context=ctx, timeout=30)
                
                status = response.getcode()
                content_type = response.headers.get('Content-Type', '').split(';')[0]
                content = response.read()
                size = len(content)
                
                self.results.append({
                    'url': url,
                    'status_code': status,
                    'content_type': content_type,
                    'size': size,
                    'last_modified': response.headers.get('Last-Modified', '')
                })
                
                pages_crawled += 1
                print(f"[{pages_crawled}/{max_pages}] {status} - {url} ({size:,} bytes)")
                
                # Extract links if HTML
                if 'text/html' in content_type and status == 200:
                    try:
                        html = content.decode('utf-8', errors='ignore')
                        links = self.extract_links(html, url)
                        new_links = 0
                        for link in links:
                            if link not in self.visited and link not in self.to_visit:
                                self.to_visit.append(link)
                                new_links += 1
                        if new_links > 0:
                            print(f"    Found {new_links} new links")
                    except Exception as e:
                        print(f"    Error extracting links: {e}")
                
                # Delay between requests
                time.sleep(0.5)
                
            except Exception as e:
                print(f"[ERROR] {url} - {e}")
                self.results.append({
                    'url': url,
                    'status_code': 0,
                    'content_type': 'error',
                    'size': 0,
                    'last_modified': ''
                })
                pages_crawled += 1
        
        print("\n" + "="*60)
        print(f"Crawl complete! Visited {pages_crawled} pages")
        return self.results
    
    def extract_links(self, html, base_url):
        """Extract links from HTML."""
        links = []
        # Simple regex to find href attributes
        href_pattern = r'href=[\'"](.*?)[\'"]'
        for match in re.finditer(href_pattern, html):
            href = match.group(1)
            if href.startswith('http'):
                absolute_url = href
            elif href.startswith('/'):
                parsed = urllib.parse.urlparse(base_url)
                absolute_url = f"{parsed.scheme}://{parsed.netloc}{href}"
            else:
                continue
            
            # Only include same domain
            if self.domain in absolute_url:
                links.append(absolute_url.split('#')[0].split('?')[0])  # Remove fragments and queries
        
        return list(set(links))  # Unique links
    
    def save_results(self, filename='crawler_results.csv'):
        """Save results to CSV."""
        with open(filename, 'w', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=['url', 'status_code', 'content_type', 'size', 'last_modified'])
            writer.writeheader()
            writer.writerows(self.results)
        print(f"\nResults saved to {filename}")

if __name__ == "__main__":
    crawler = MinimalCrawler('revzilla.com')
    results = crawler.crawl(max_pages=20)
    
    # Summary
    successful = sum(1 for r in results if r['status_code'] == 200)
    print(f"\nSummary:")
    print(f"- Total pages: {len(results)}")
    print(f"- Successful (200): {successful}")
    print(f"- Success rate: {successful/len(results)*100:.1f}%")
    
    crawler.save_results()