#!/usr/bin/env python3
"""
Quick test to check if crawler works on RevZilla.
"""

import urllib.request
import ssl
import time

# Create SSL context
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

def test_revzilla():
    """Test if we can crawl RevZilla successfully."""
    
    # Use the proven headers
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
    
    test_urls = [
        'https://www.revzilla.com/',
        'https://www.revzilla.com/motorcycle-helmets',
        'https://www.revzilla.com/motorcycle-jackets',
        'https://www.revzilla.com/shoei-helmets',
        'https://www.revzilla.com/motorcycle/shoei-rf-1400-helmet'
    ]
    
    print("Testing RevZilla crawler...")
    print("="*60)
    
    success_count = 0
    
    for url in test_urls:
        try:
            req = urllib.request.Request(url, headers=headers)
            start = time.time()
            response = urllib.request.urlopen(req, context=ctx, timeout=30)
            elapsed = time.time() - start
            
            status = response.getcode()
            content_type = response.headers.get('Content-Type', '').split(';')[0]
            content = response.read()
            size = len(content)
            
            if status == 200:
                success_count += 1
                print(f"✅ {url}")
                print(f"   Status: {status}, Size: {size:,} bytes, Time: {elapsed:.2f}s")
            else:
                print(f"❌ {url}")
                print(f"   Status: {status}")
                
        except Exception as e:
            print(f"❌ {url}")
            print(f"   Error: {e}")
        
        time.sleep(0.5)  # Small delay between requests
    
    print("\n" + "="*60)
    print(f"Results: {success_count}/{len(test_urls)} successful")
    print(f"Success Rate: {success_count/len(test_urls)*100:.0f}%")
    
    if success_count == len(test_urls):
        print("\n🎉 RevZilla crawler works perfectly!")
    elif success_count > 0:
        print("\n⚠️  RevZilla crawler partially works")
    else:
        print("\n❌ RevZilla crawler failed")

if __name__ == "__main__":
    test_revzilla()