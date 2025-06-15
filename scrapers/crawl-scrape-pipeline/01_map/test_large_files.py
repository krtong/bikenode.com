#!/usr/bin/env python3
"""
Test crawler behavior with large file downloads.
"""

import urllib.request
import ssl
import time

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

def test_large_files():
    """Test crawler on various large file types."""
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
    }
    
    test_files = [
        # Large files of various types
        ('Small PDF', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'),
        ('Large Image', 'https://upload.wikimedia.org/wikipedia/commons/3/3d/LARGE_elevation.jpg'),
        ('Video Sample', 'https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4'),
        ('ZIP Archive', 'https://github.com/git/git/archive/refs/heads/master.zip'),
        ('Large JSON', 'https://raw.githubusercontent.com/json-iterator/test-data/master/large-file.json'),
        ('Binary File', 'https://speed.hetzner.de/100MB.bin'),
    ]
    
    print("Testing Large File Downloads")
    print("=" * 60)
    
    results = []
    
    for name, url in test_files:
        print(f"\nTesting: {name}")
        print(f"URL: {url}")
        
        req = urllib.request.Request(url, headers=headers)
        start_time = time.time()
        
        try:
            # Set a reasonable timeout
            response = urllib.request.urlopen(req, context=ctx, timeout=10)
            
            # Read only headers, not full content (to avoid memory issues)
            status = response.getcode()
            content_type = response.headers.get('Content-Type', '').split(';')[0]
            content_length = response.headers.get('Content-Length', 'Unknown')
            
            # Read only first 1KB to verify we can access content
            first_kb = response.read(1024)
            
            elapsed = time.time() - start_time
            
            result = {
                'name': name,
                'url': url,
                'status': status,
                'content_type': content_type,
                'size': content_length,
                'accessible': True,
                'time': f"{elapsed:.2f}s"
            }
            
            print(f"✅ Status: {status}")
            print(f"   Type: {content_type}")
            print(f"   Size: {content_length} bytes")
            print(f"   Time: {elapsed:.2f}s")
            
        except Exception as e:
            elapsed = time.time() - start_time
            result = {
                'name': name,
                'url': url,
                'status': 0,
                'accessible': False,
                'error': str(e),
                'time': f"{elapsed:.2f}s"
            }
            print(f"❌ Error: {e}")
        
        results.append(result)
    
    # Summary
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    
    successful = sum(1 for r in results if r.get('accessible', False))
    print(f"Total files tested: {len(results)}")
    print(f"Successfully accessed: {successful}")
    print(f"Failed: {len(results) - successful}")
    
    print("\nKey Findings:")
    if successful == len(results):
        print("- Crawler can access all large file types")
    else:
        print("- Some large files are inaccessible or timeout")
    
    # Check which types work
    working_types = set()
    for r in results:
        if r.get('accessible') and r.get('content_type'):
            working_types.add(r['content_type'])
    
    if working_types:
        print(f"- Successfully accessed file types: {', '.join(working_types)}")
    
    # Note about crawler behavior
    print("\nCrawler Implications:")
    print("- Large files should be filtered by URL patterns (e.g., skip .pdf, .zip, .mp4)")
    print("- Content-Type header can identify file types before downloading")
    print("- Set reasonable timeouts to avoid hanging on large downloads")
    print("- Consider file size limits based on Content-Length header")

if __name__ == "__main__":
    test_large_files()