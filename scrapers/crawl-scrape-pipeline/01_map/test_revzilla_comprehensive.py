#!/usr/bin/env python3
"""
Comprehensive test of RevZilla to verify crawler actually works.
"""

import requests
import time
import random

# Test various RevZilla pages including product pages
REVZILLA_URLS = [
    "https://www.revzilla.com/",
    "https://www.revzilla.com/motorcycle-helmets",
    "https://www.revzilla.com/motorcycle-jackets", 
    "https://www.revzilla.com/shoei-rf-1400-helmet",
    "https://www.revzilla.com/alpinestars-smx-6-v2-boots",
    "https://www.revzilla.com/motorcycle/shoei-rf-1400-helmet?sku_id=1846766",  # Specific product
]

def test_revzilla_page(url):
    """Test a specific RevZilla URL."""
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
        'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"macOS"',
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=30, allow_redirects=True)
        
        # Check for rate limiting indicators
        is_rate_limited = False
        if response.status_code == 429:
            is_rate_limited = True
        elif "rate limit" in response.text.lower():
            is_rate_limited = True
        elif "access denied" in response.text.lower():
            is_rate_limited = True
            
        # Check if we got actual product content
        has_product_content = False
        if response.status_code == 200:
            text_lower = response.text.lower()
            if any(keyword in text_lower for keyword in ['price', 'add to cart', 'product', 'motorcycle']):
                has_product_content = True
        
        return {
            'url': url,
            'status_code': response.status_code,
            'size': len(response.content),
            'rate_limited': is_rate_limited,
            'has_product_content': has_product_content,
            'title': response.text.split('<title>')[1].split('</title>')[0] if '<title>' in response.text else 'No title'
        }
    except Exception as e:
        return {
            'url': url,
            'status_code': f'Error: {type(e).__name__}',
            'error': str(e)
        }

def main():
    print("Comprehensive RevZilla Test")
    print("=" * 80)
    print("Testing various pages including product pages to verify actual functionality\n")
    
    results = []
    
    for i, url in enumerate(REVZILLA_URLS):
        print(f"Test {i+1}/{len(REVZILLA_URLS)}: {url}")
        
        result = test_revzilla_page(url)
        results.append(result)
        
        if isinstance(result['status_code'], int):
            print(f"  Status: {result['status_code']}")
            print(f"  Size: {result['size']:,} bytes")
            print(f"  Title: {result['title'][:60]}...")
            if result['rate_limited']:
                print(f"  ⚠️  RATE LIMITED!")
            if result['has_product_content']:
                print(f"  ✓ Contains product content")
            print()
        else:
            print(f"  Error: {result['status_code']}")
            print(f"  Details: {result.get('error', '')}\n")
        
        # Random delay between requests
        if i < len(REVZILLA_URLS) - 1:
            delay = random.uniform(1, 3)
            print(f"Waiting {delay:.1f} seconds before next request...\n")
            time.sleep(delay)
    
    # Summary
    print("=" * 80)
    print("SUMMARY")
    print("=" * 80)
    
    successful = [r for r in results if isinstance(r['status_code'], int) and r['status_code'] == 200]
    rate_limited = [r for r in results if r.get('rate_limited', False)]
    with_content = [r for r in results if r.get('has_product_content', False)]
    
    print(f"Total URLs tested: {len(results)}")
    print(f"Successful (200): {len(successful)}")
    print(f"Rate limited: {len(rate_limited)}")
    print(f"With product content: {len(with_content)}")
    
    print(f"\nSuccess rate: {len(successful)}/{len(results)} ({len(successful)/len(results)*100:.0f}%)")
    
    if rate_limited:
        print("\n⚠️  Some requests were rate limited!")
        print("RevZilla implements rate limiting after multiple requests.")
    
    if with_content:
        print("\n✓ Successfully retrieved actual product content from RevZilla")
    else:
        print("\n❌ Could not retrieve product content - might be blocked")

if __name__ == "__main__":
    main()