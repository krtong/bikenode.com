#!/usr/bin/env python3
"""
Test edge cases and failure scenarios for the universal crawler.
"""

import urllib.request
import urllib.error
import json
import time
import ssl
from urllib.parse import urlparse

# Create SSL context that doesn't verify certificates
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

def test_url(url, test_name):
    """Test a URL using basic urllib."""
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
    
    req = urllib.request.Request(url, headers=headers)
    start_time = time.time()
    
    try:
        response = urllib.request.urlopen(req, context=ctx, timeout=30)
        elapsed = time.time() - start_time
        
        status = response.getcode()
        content_type = response.headers.get('Content-Type', '').split(';')[0]
        content = response.read()
        
        # Check for bot detection in content
        content_str = content.decode('utf-8', errors='ignore')[:1000].lower()
        bot_detected = any(indicator in content_str for indicator in [
            'captcha', 'access denied', 'please verify', 'robot', 'bot detected'
        ])
        
        return {
            'test_name': test_name,
            'url': url,
            'status_code': status,
            'success': status == 200 and not bot_detected,
            'response_time': f"{elapsed:.2f}s",
            'content_type': content_type,
            'size': len(content),
            'bot_detected': bot_detected,
            'error': 'Bot detection in content' if bot_detected else None
        }
        
    except urllib.error.HTTPError as e:
        elapsed = time.time() - start_time
        return {
            'test_name': test_name,
            'url': url,
            'status_code': e.code,
            'success': False,
            'response_time': f"{elapsed:.2f}s",
            'error': f"HTTP {e.code}: {e.reason}"
        }
    except Exception as e:
        elapsed = time.time() - start_time
        return {
            'test_name': test_name,
            'url': url,
            'status_code': 0,
            'success': False,
            'response_time': f"{elapsed:.2f}s",
            'error': str(e)
        }

def run_test_category(test_name, urls):
    """Run tests for a category."""
    print(f"\n{'='*60}")
    print(f"Testing: {test_name}")
    print(f"{'='*60}")
    
    results = []
    for url in urls:
        result = test_url(url, test_name)
        results.append(result)
        
        status_symbol = "✅" if result['success'] else "❌"
        error_msg = f" - {result.get('error', '')}" if result.get('error') else ""
        print(f"{status_symbol} {url} - {result['status_code']}{error_msg}")
        
        time.sleep(0.5)  # Small delay between requests
    
    return results

def main():
    """Run all edge case tests."""
    all_results = []
    
    # Test 1: Authentication Required
    auth_urls = [
        "https://github.com/settings/profile",
        "https://www.linkedin.com/mynetwork/",
        "https://twitter.com/home",
        "https://mail.google.com/",
    ]
    all_results.extend(run_test_category("Authentication Required", auth_urls))
    
    # Test 2: API Endpoints
    api_urls = [
        "https://api.github.com/user",
        "https://api.twitter.com/2/users/me",
        "https://graph.facebook.com/me",
    ]
    all_results.extend(run_test_category("API Endpoints", api_urls))
    
    # Test 3: Known Bot Blockers
    bot_block_urls = [
        "https://www.nike.com/",
        "https://www.ticketmaster.com/",
        "https://www.bestbuy.com/",
    ]
    all_results.extend(run_test_category("Bot Detection Sites", bot_block_urls))
    
    # Test 4: JavaScript SPAs
    spa_urls = [
        "https://web.whatsapp.com/",
        "https://discord.com/app",
        "https://www.figma.com/files/recent",
    ]
    all_results.extend(run_test_category("JavaScript SPAs", spa_urls))
    
    # Test 5: Geo-Restricted
    geo_urls = [
        "https://www.bbc.co.uk/iplayer",
        "https://www.hulu.com/",
        "https://www.hotstar.com/",
    ]
    all_results.extend(run_test_category("Geo-Restricted", geo_urls))
    
    # Test 6: Paywall Sites
    paywall_urls = [
        "https://www.wsj.com/articles/test",
        "https://www.ft.com/content/test",
        "https://www.nytimes.com/2024/01/01/technology/test.html",
    ]
    all_results.extend(run_test_category("Paywall Content", paywall_urls))
    
    # Test 7: Rate Limiting
    print(f"\n{'='*60}")
    print("Testing: Rate Limiting (10 rapid requests)")
    print(f"{'='*60}")
    
    for i in range(10):
        result = test_url("https://httpbin.org/status/200", f"Rate Test #{i+1}")
        all_results.append(result)
        status_symbol = "✅" if result['success'] else "❌"
        print(f"{status_symbol} Request {i+1}/10: {result['status_code']}")
    
    # Generate Summary
    print(f"\n{'='*60}")
    print("EDGE CASE TEST SUMMARY")
    print(f"{'='*60}")
    
    total = len(all_results)
    successful = sum(1 for r in all_results if r.get('success', False))
    failed = total - successful
    
    print(f"Total Tests: {total}")
    print(f"Successful: {successful} ({successful/total*100:.1f}%)")
    print(f"Failed: {failed} ({failed/total*100:.1f}%)")
    
    # Error breakdown
    error_types = {}
    for result in all_results:
        if not result.get('success', False):
            error = result.get('error', 'Unknown')
            if 'HTTP' in error:
                error = error.split(':')[0]  # Group HTTP errors
            error_types[error] = error_types.get(error, 0) + 1
    
    if error_types:
        print("\nFailure Breakdown:")
        for error, count in sorted(error_types.items(), key=lambda x: x[1], reverse=True):
            print(f"  - {error}: {count}")
    
    # Key findings
    print("\nKey Findings:")
    if successful == total:
        print("- Crawler achieves 100% success rate on all tests!")
    else:
        success_rate = successful/total*100
        print(f"- Overall success rate: {success_rate:.1f}%")
        
        if 'HTTP 401' in error_types or 'HTTP 403' in error_types:
            print("- Authentication endpoints properly return 401/403")
        if 'Bot detection in content' in error_types:
            print("- Some sites detect bot traffic despite 200 status")
        if 'HTTP 429' in error_types:
            print("- Rate limiting detected on some endpoints")
    
    # Save results
    with open('edge_case_results.json', 'w') as f:
        json.dump({
            'summary': {
                'total': total,
                'successful': successful,
                'failed': failed,
                'success_rate': f"{successful/total*100:.1f}%"
            },
            'error_breakdown': error_types,
            'results': all_results
        }, f, indent=2)
    
    print(f"\nDetailed results saved to: edge_case_results.json")

if __name__ == "__main__":
    main()