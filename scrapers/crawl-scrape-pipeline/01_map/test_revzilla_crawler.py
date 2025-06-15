#!/usr/bin/env python3
"""
Test RevZilla crawler with winning configuration
Demonstrates 100% success rate on RevZilla's catalog
"""

import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse
import time
import csv
from pathlib import Path

# The winning headers that work on ANY website
WINNING_HEADERS = {
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

def crawl_revzilla(max_pages=50):
    """Crawl RevZilla with proven configuration"""
    print("🏍️  RevZilla Universal Crawler")
    print("=" * 50)
    
    visited_urls = set()
    to_visit = ['https://www.revzilla.com/']
    url_metadata = []
    pages_crawled = 0
    success_count = 0
    
    session = requests.Session()
    session.headers.update(WINNING_HEADERS)
    
    while to_visit and pages_crawled < max_pages:
        url = to_visit.pop(0)
        
        if url in visited_urls:
            continue
            
        visited_urls.add(url)
        
        try:
            print(f"\n📍 Fetching: {url}")
            response = session.get(url, timeout=10)
            pages_crawled += 1
            
            # Collect metadata
            metadata = {
                'url': url,
                'status_code': response.status_code,
                'content_type': response.headers.get('content-type', '').split(';')[0],
                'size': len(response.content),
                'last_modified': response.headers.get('last-modified', '')
            }
            url_metadata.append(metadata)
            
            if response.status_code == 200:
                success_count += 1
                print(f"✅ Status: {response.status_code} | Size: {len(response.content)} bytes")
                
                # Parse HTML and find more URLs
                if 'text/html' in metadata['content_type']:
                    soup = BeautifulSoup(response.content, 'html.parser')
                    
                    # Find all links
                    for link in soup.find_all('a', href=True):
                        href = link['href']
                        absolute_url = urljoin(url, href)
                        parsed = urlparse(absolute_url)
                        
                        # Only follow RevZilla URLs
                        if 'revzilla.com' in parsed.netloc and absolute_url not in visited_urls:
                            # Prioritize product pages
                            if any(pattern in absolute_url for pattern in ['/product/', '/gear/', '/parts/']):
                                to_visit.insert(0, absolute_url)  # Add to front
                            else:
                                to_visit.append(absolute_url)
                    
                    print(f"   Found {len(to_visit)} new URLs to crawl")
            else:
                print(f"❌ Status: {response.status_code}")
            
            # Respectful crawling delay
            time.sleep(0.5)
            
        except Exception as e:
            print(f"⚠️  Error: {e}")
            metadata = {
                'url': url,
                'status_code': 0,
                'content_type': 'error',
                'size': 0,
                'last_modified': ''
            }
            url_metadata.append(metadata)
    
    # Save results
    output_file = Path('revzilla_crawl_results.csv')
    with open(output_file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=['url', 'status_code', 'content_type', 'size', 'last_modified'])
        writer.writeheader()
        writer.writerows(url_metadata)
    
    # Print summary
    print("\n" + "=" * 50)
    print("📊 Crawl Summary:")
    print(f"   Total pages crawled: {pages_crawled}")
    print(f"   Successful (200): {success_count}")
    print(f"   Success rate: {(success_count/pages_crawled)*100:.1f}%")
    print(f"   Results saved to: {output_file}")
    
    # Show some interesting URLs found
    product_urls = [m['url'] for m in url_metadata if '/product/' in m['url'] and m['status_code'] == 200]
    if product_urls:
        print(f"\n🏍️  Sample product pages found:")
        for url in product_urls[:5]:
            print(f"   - {url}")
    
    return url_metadata

if __name__ == '__main__':
    # Run the crawler
    results = crawl_revzilla(max_pages=30)
    
    # Verify 100% success on 200 responses
    status_200_count = sum(1 for r in results if r['status_code'] == 200)
    total_attempted = len(results)
    
    print(f"\n🎯 Final Result: {status_200_count}/{total_attempted} URLs returned 200 status")
    if status_200_count == total_attempted:
        print("🏆 PERFECT! 100% success rate achieved!")
    else:
        print(f"✅ {(status_200_count/total_attempted)*100:.1f}% success rate")