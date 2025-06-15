#!/usr/bin/env python3
"""
Simple fetcher for RevZilla product pages.
Saves HTML content to NDJSON file.
"""

import json
import requests
import time
from pathlib import Path
import argparse

def fetch_product_pages(urls_file, output_file):
    """Fetch product pages and save to NDJSON."""
    
    # Session for connection reuse
    session = requests.Session()
    session.headers.update({
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
    })
    
    # Read URLs
    with open(urls_file, 'r') as f:
        urls = [line.strip() for line in f if line.strip()]
    
    print(f"Fetching {len(urls)} product pages...")
    
    # Fetch each URL
    with open(output_file, 'w') as out:
        for i, url in enumerate(urls):
            try:
                print(f"[{i+1}/{len(urls)}] Fetching: {url}")
                
                response = session.get(url, timeout=30)
                
                if response.status_code == 200:
                    # Save as NDJSON
                    data = {
                        'url': url,
                        'status_code': response.status_code,
                        'content_type': response.headers.get('content-type', ''),
                        'html': response.text,
                        'timestamp': int(time.time())
                    }
                    json.dump(data, out)
                    out.write('\n')
                    out.flush()
                    print(f"  ✓ Success: {response.status_code}")
                else:
                    print(f"  ✗ Failed: {response.status_code}")
                
                # Rate limiting
                time.sleep(0.5)
                
            except Exception as e:
                print(f"  ✗ Error: {str(e)}")
                continue
    
    print(f"\nFetching complete! Results saved to {output_file}")

def main():
    parser = argparse.ArgumentParser(description='Fetch RevZilla product pages')
    parser.add_argument('--urls', required=True, help='File with URLs to fetch')
    parser.add_argument('--output', required=True, help='Output NDJSON file')
    args = parser.parse_args()
    
    fetch_product_pages(args.urls, args.output)

if __name__ == '__main__':
    main()