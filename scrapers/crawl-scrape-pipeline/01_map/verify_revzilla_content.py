#!/usr/bin/env python3
"""
Verify we're actually getting RevZilla content, not a block page.
"""

import urllib.request
import ssl
import gzip
from io import BytesIO

# Create SSL context
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

def verify_revzilla():
    """Check if we're getting real RevZilla content."""
    
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
    
    url = 'https://www.revzilla.com/motorcycle-helmets'
    
    try:
        req = urllib.request.Request(url, headers=headers)
        response = urllib.request.urlopen(req, context=ctx, timeout=30)
        
        # Handle gzip encoding
        if response.headers.get('Content-Encoding') == 'gzip':
            content = gzip.GzipFile(fileobj=BytesIO(response.read())).read()
        else:
            content = response.read()
            
        html = content.decode('utf-8', errors='ignore')
        
        print(f"Response Status: {response.getcode()}")
        print(f"Content Length: {len(html):,} characters")
        print(f"Content-Type: {response.headers.get('Content-Type')}")
        print("\nContent Analysis:")
        print("-" * 40)
        
        # Check for RevZilla-specific content
        indicators = {
            'RevZilla': html.count('RevZilla'),
            'motorcycle': html.count('motorcycle'),
            'helmet': html.count('helmet'),
            'product': html.count('product'),
            'price': html.count('price'),
            'Add to Cart': html.count('Add to Cart'),
            'captcha': html.count('captcha'),
            'blocked': html.count('blocked'),
            'access denied': html.count('access denied'),
        }
        
        for key, count in indicators.items():
            if count > 0:
                symbol = "✅" if key not in ['captcha', 'blocked', 'access denied'] else "❌"
                print(f"{symbol} '{key}' found {count} times")
        
        # Check page title
        import re
        title_match = re.search(r'<title>(.*?)</title>', html, re.IGNORECASE)
        if title_match:
            print(f"\nPage Title: {title_match.group(1)}")
        
        # Look for product listings
        product_pattern = r'data-product-id|product-tile|product-card'
        products = len(re.findall(product_pattern, html, re.IGNORECASE))
        if products:
            print(f"\n✅ Found {products} product references")
        
        # Show first 500 chars of actual content
        print("\nFirst 500 characters of content:")
        print("-" * 40)
        # Skip past initial HTML tags to get to content
        content_start = html.find('<body')
        if content_start > 0:
            print(html[content_start:content_start+500])
        
        # Verdict
        print("\n" + "="*60)
        if indicators['RevZilla'] > 10 and indicators['motorcycle'] > 5 and products > 0:
            print("✅ VERIFIED: Getting real RevZilla content!")
            return True
        elif indicators['captcha'] > 0 or indicators['blocked'] > 0:
            print("❌ BLOCKED: Hitting bot detection")
            return False
        else:
            print("⚠️  UNCERTAIN: May be getting limited content")
            return None
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    verify_revzilla()