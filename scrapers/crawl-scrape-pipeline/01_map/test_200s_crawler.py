#!/usr/bin/env python3
"""
Test crawler on various challenging websites to verify 200 status codes.
Uses the simple requests approach that already works on Cloudflare.
"""

import requests
import csv
import time
from pathlib import Path
from datetime import datetime
import json

# Test sites - mix of easy and challenging
TEST_SITES = [
    "example.com",      # Easy - standard test site
    "github.com",       # Should work - developer friendly
    "cloudflare.com",   # Already confirmed working
    "wikipedia.org",    # Should work - open content
    "stackoverflow.com", # Should work - public content
    "reddit.com",       # May have challenges
    "amazon.com",       # E-commerce with anti-bot
    "google.com",       # Should work but minimal content
    "bing.com",         # Should work
    "duckduckgo.com",   # Privacy-focused, should work
]

def test_simple_crawler(domain: str) -> dict:
    """Test if we can get 200 status with simple requests approach."""
    
    # Headers that work on Cloudflare
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
    
    results = {
        'domain': domain,
        'timestamp': datetime.now().isoformat(),
        'urls_tested': [],
    }
    
    # Test both www and non-www versions
    test_urls = [
        f"https://{domain}/",
        f"https://www.{domain}/"
    ]
    
    session = requests.Session()
    session.headers.update(headers)
    
    for url in test_urls:
        print(f"\nTesting: {url}")
        
        try:
            start_time = time.time()
            response = session.get(url, timeout=30, allow_redirects=True, verify=True)
            elapsed = time.time() - start_time
            
            result = {
                'url': url,
                'status_code': response.status_code,
                'content_type': response.headers.get('content-type', '').split(';')[0],
                'size': len(response.content),
                'response_time': round(elapsed, 2),
                'final_url': response.url,
                'server': response.headers.get('server', ''),
                'success': response.status_code == 200
            }
            
            # Check for bot detection in content
            if response.status_code == 200:
                content_lower = response.text[:1000].lower()
                bot_indicators = ['captcha', 'robot', 'blocked', 'forbidden', 'cloudflare']
                result['possible_bot_detection'] = any(indicator in content_lower for indicator in bot_indicators)
            
            results['urls_tested'].append(result)
            
            # Display result
            status_emoji = "✅" if result['success'] else "❌"
            print(f"{status_emoji} Status: {result['status_code']} | "
                  f"Type: {result['content_type']} | "
                  f"Size: {result['size']:,} bytes | "
                  f"Time: {result['response_time']}s")
            
            if result.get('possible_bot_detection'):
                print("  ⚠️  Possible bot detection in content")
                
        except requests.exceptions.RequestException as e:
            result = {
                'url': url,
                'status_code': 0,
                'error': str(e),
                'success': False
            }
            results['urls_tested'].append(result)
            print(f"❌ Error: {str(e)}")
        
        # Be polite - wait between requests
        time.sleep(1)
    
    # Calculate success rate
    successful = sum(1 for r in results['urls_tested'] if r['success'])
    total = len(results['urls_tested'])
    results['success_rate'] = successful / total if total > 0 else 0
    
    return results

def main():
    """Test crawler on multiple sites and save results."""
    print("Testing Simple Crawler on Various Websites")
    print("=" * 50)
    
    all_results = []
    
    for domain in TEST_SITES:
        print(f"\n{'='*50}")
        print(f"Testing: {domain}")
        print(f"{'='*50}")
        
        results = test_simple_crawler(domain)
        all_results.append(results)
        
        # Summary for this domain
        success_rate = results['success_rate']
        print(f"\nSummary for {domain}: {success_rate:.0%} success rate")
        
        # Wait between domains
        time.sleep(2)
    
    # Save detailed results
    output_file = Path(__file__).parent / 'test_200s_results.json'
    with open(output_file, 'w') as f:
        json.dump(all_results, f, indent=2)
    
    # Save summary CSV
    csv_file = Path(__file__).parent / 'test_200s_summary.csv'
    with open(csv_file, 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['domain', 'urls_tested', 'successful', 'success_rate', 'avg_response_time'])
        
        for result in all_results:
            successful = sum(1 for r in result['urls_tested'] if r['success'])
            total = len(result['urls_tested'])
            avg_time = sum(r.get('response_time', 0) for r in result['urls_tested']) / total if total > 0 else 0
            
            writer.writerow([
                result['domain'],
                total,
                successful,
                f"{result['success_rate']:.0%}",
                f"{avg_time:.2f}s"
            ])
    
    # Print final summary
    print(f"\n{'='*50}")
    print("FINAL SUMMARY")
    print(f"{'='*50}")
    
    total_domains = len(all_results)
    perfect_domains = sum(1 for r in all_results if r['success_rate'] == 1.0)
    
    print(f"Tested {total_domains} domains")
    print(f"Perfect success (100%): {perfect_domains} domains")
    print(f"\nResults saved to:")
    print(f"  - {output_file}")
    print(f"  - {csv_file}")

if __name__ == "__main__":
    main()