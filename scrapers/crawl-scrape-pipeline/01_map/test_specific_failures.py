#!/usr/bin/env python3
"""
Test specific failure cases to understand what's blocking the crawler.
"""

import requests
import json
from urllib.parse import urlparse

# Sites that commonly block crawlers
TEST_SITES = [
    "wsj.com",           # Wall Street Journal - 401 Unauthorized
    "linkedin.com",      # LinkedIn - requires login for most content
    "ticketmaster.com",  # PerimeterX protection
    "footlocker.com",    # DataDome protection
    "discord.com",       # Cloudflare Enterprise
    "chase.com",         # Banking - highest security
]

def test_basic_request(url):
    """Test with basic requests to see exact error."""
    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
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
        'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="121", "Google Chrome";v="121"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"macOS"',
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=10, allow_redirects=True)
        return {
            'status': response.status_code,
            'headers': dict(response.headers),
            'size': len(response.content),
            'text_preview': response.text[:500] if response.text else '',
            'final_url': response.url,
            'history': [r.status_code for r in response.history] if response.history else []
        }
    except Exception as e:
        return {
            'status': 'error',
            'error': str(e),
            'error_type': type(e).__name__
        }

def analyze_protection(domain, result):
    """Analyze what protection mechanism is in place."""
    protection = []
    
    if result.get('status') == 401:
        protection.append("401 Unauthorized - Requires authentication")
    elif result.get('status') == 403:
        protection.append("403 Forbidden - Access denied")
    elif result.get('status') == 429:
        protection.append("429 Too Many Requests - Rate limited")
    
    if 'headers' in result:
        headers = result['headers']
        
        # Check for common protection services
        if 'cf-ray' in headers:
            protection.append("Cloudflare protection detected")
        if 'x-perimeterx' in headers or 'px' in headers.get('set-cookie', ''):
            protection.append("PerimeterX protection detected")
        if 'datadome' in str(headers).lower():
            protection.append("DataDome protection detected")
        if 'x-sucuri' in headers:
            protection.append("Sucuri protection detected")
        if 'server' in headers:
            server = headers['server'].lower()
            if 'cloudflare' in server:
                protection.append(f"Server: {headers['server']}")
    
    if 'text_preview' in result:
        text = result['text_preview'].lower()
        if 'captcha' in text or 'challenge' in text:
            protection.append("CAPTCHA/Challenge page detected")
        if 'please verify you are human' in text:
            protection.append("Bot verification page")
        if 'access denied' in text or 'forbidden' in text:
            protection.append("Access denied message in content")
    
    return protection

def main():
    print("Testing Specific Failure Cases")
    print("=" * 60)
    
    for site in TEST_SITES:
        print(f"\n{site}:")
        print("-" * 40)
        
        # Test both www and non-www
        for prefix in ['https://', 'https://www.']:
            url = f"{prefix}{site}/"
            print(f"\nTesting {url}")
            
            result = test_basic_request(url)
            
            if result.get('status') == 'error':
                print(f"  Error: {result['error_type']} - {result['error']}")
            else:
                print(f"  Status: {result['status']}")
                print(f"  Final URL: {result['final_url']}")
                if result['history']:
                    print(f"  Redirects: {result['history']} -> {result['status']}")
                
                # Analyze protection
                protections = analyze_protection(site, result)
                if protections:
                    print(f"  Protection detected:")
                    for p in protections:
                        print(f"    - {p}")
                
                # Show relevant headers
                if 'headers' in result:
                    interesting_headers = ['server', 'x-frame-options', 'content-security-policy', 
                                         'cf-ray', 'x-perimeterx', 'set-cookie']
                    print(f"  Key headers:")
                    for h in interesting_headers:
                        if h in result['headers']:
                            value = result['headers'][h]
                            if len(str(value)) > 100:
                                value = str(value)[:100] + "..."
                            print(f"    {h}: {value}")
                
                # Show content preview if not 200
                if result['status'] != 200 and result.get('text_preview'):
                    print(f"  Content preview: {result['text_preview'][:200]}...")
    
    print("\n" + "=" * 60)
    print("ANALYSIS COMPLETE")

if __name__ == "__main__":
    main()