#!/usr/bin/env python3
"""
Test Motor Sport Magazine page structure.
"""

import urllib.request
import ssl
import re

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
}

url = "https://www.motorsportmagazine.com/articles/author/mat-oxley_writer/"

try:
    req = urllib.request.Request(url, headers=headers)
    response = urllib.request.urlopen(req, context=ctx, timeout=30)
    html = response.read().decode('utf-8', errors='ignore')
    
    print(f"Status: {response.getcode()}")
    print(f"Content length: {len(html)} characters")
    
    # Look for article links
    print("\nSearching for article patterns...")
    
    # Try different patterns
    patterns = {
        'Standard articles': r'href="(/articles/[^"]+)"',
        'Full URLs': r'href="(https://www\.motorsportmagazine\.com/articles/[^"]+)"',
        'Article cards': r'<a[^>]*class="[^"]*article[^"]*"[^>]*href="([^"]+)"',
        'Title links': r'<h[1-6][^>]*><a[^>]*href="([^"]+)"[^>]*>([^<]+)</a>',
        'Motorcycles section': r'href="(/articles/motorcycles/[^"]+)"',
    }
    
    for name, pattern in patterns.items():
        matches = re.findall(pattern, html)
        if matches:
            print(f"\n{name}: Found {len(matches)} matches")
            for i, match in enumerate(matches[:3]):
                print(f"  {i+1}. {match}")
    
    # Look for pagination
    print("\nSearching for pagination...")
    page_patterns = [
        r'href="([^"]*page[=/]\d+[^"]*)"',
        r'<a[^>]*class="[^"]*pagination[^"]*"[^>]*href="([^"]+)"',
        r'href="([^"]+)"[^>]*>\s*Next\s*</a>',
    ]
    
    for pattern in page_patterns:
        matches = re.findall(pattern, html)
        if matches:
            print(f"Found pagination: {matches[:3]}")
    
    # Save sample HTML for inspection
    with open('motorsport_sample.html', 'w', encoding='utf-8') as f:
        f.write(html[:10000])  # First 10KB
    print("\nSaved first 10KB to motorsport_sample.html for inspection")
    
except Exception as e:
    print(f"Error: {e}")