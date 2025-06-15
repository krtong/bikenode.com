#!/usr/bin/env python3
"""
Test that the crawler fixes are working properly:
1. No JavaScript template URLs
2. No anchor duplicates
3. Getting real HTML content
"""
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '01_map'))

from run_map import SiteMapper
from pathlib import Path
import csv


def test_javascript_template_filter():
    """Test that JavaScript template URLs are filtered out."""
    print("\n=== Testing JavaScript Template URL Filter ===")
    
    # Create a test with a known problematic site
    mapper = SiteMapper('revzilla.com', max_pages=10)
    metadata = mapper.run(methods=['requests'])
    
    # Check for JavaScript template URLs
    js_urls = [url for url in metadata.keys() if '${' in url or '{{' in url]
    
    if js_urls:
        print(f"✗ Found {len(js_urls)} JavaScript template URLs:")
        for url in js_urls:
            print(f"  - {url}")
        return False
    else:
        print("✓ No JavaScript template URLs found")
        return True


def test_anchor_deduplication():
    """Test that anchor duplicates are properly handled."""
    print("\n=== Testing Anchor Deduplication ===")
    
    # Test on a site that typically has anchor links
    mapper = SiteMapper('example.com', max_pages=5)
    
    # Monkey patch to add test URLs with anchors
    original_crawl = mapper.crawl_with_requests
    
    def test_crawl():
        # Run original crawl
        original_crawl()
        
        # Check if anchor handling works by looking at visited URLs
        test_urls = [
            'https://example.com/page#section1',
            'https://example.com/page#section2',
            'https://example.com/page',
        ]
        
        # Simulate what would happen with these URLs
        base_urls = set()
        anchor_count = 0
        for url in mapper.url_metadata.keys():
            base_url = url.split('#')[0]
            if base_url in base_urls and '#' in url:
                anchor_count += 1
            base_urls.add(base_url)
        
        return anchor_count
    
    mapper.crawl_with_requests = test_crawl
    anchor_duplicates = test_crawl()
    
    if anchor_duplicates > 0:
        print(f"✗ Found {anchor_duplicates} anchor duplicates")
        return False
    else:
        print("✓ No anchor duplicates found")
        return True


def test_content_quality():
    """Test that we're getting real HTML content."""
    print("\n=== Testing Content Quality ===")
    
    mapper = SiteMapper('example.com', max_pages=2)
    metadata = mapper.run(methods=['requests'])
    
    issues = []
    for url, data in metadata.items():
        if data['status_code'] == 200:
            # Check size
            if data['size'] < 100:
                issues.append(f"Suspiciously small content ({data['size']} bytes) for {url}")
            
            # Check if enhanced metadata was extracted
            if 'page_title' in data and not data['page_title']:
                issues.append(f"Empty page title for {url}")
            
            # Check content type
            if 'html' in data['content_type'] and data['size'] == 0:
                issues.append(f"Zero size HTML for {url}")
    
    if issues:
        print(f"✗ Found {len(issues)} content quality issues:")
        for issue in issues:
            print(f"  - {issue}")
        return False
    else:
        print("✓ Content quality looks good")
        return True


def test_revzilla_specifically():
    """Test RevZilla to ensure all fixes work on this problematic site."""
    print("\n=== Testing RevZilla Specifically ===")
    
    mapper = SiteMapper('revzilla.com', max_pages=20)
    metadata = mapper.run(methods=['requests'])
    
    # Save to a test file
    test_file = Path(__file__).parent / '01_map' / f'test_revzilla_fixed.csv'
    
    with open(test_file, 'w', newline='', encoding='utf-8') as f:
        fieldnames = ['url', 'status_code', 'content_type', 'size', 'last_modified']
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction='ignore')
        writer.writeheader()
        
        for url, data in metadata.items():
            writer.writerow({
                'url': url,
                'status_code': data['status_code'],
                'content_type': data['content_type'],
                'size': data['size'],
                'last_modified': data.get('last_modified', '')
            })
    
    # Analyze results
    js_urls = [url for url in metadata.keys() if '${' in url or '{{' in url]
    
    # Check for anchor duplicates
    base_urls = set()
    anchor_duplicates = []
    for url in metadata.keys():
        base_url = url.split('#')[0]
        if base_url in base_urls and '#' in url:
            anchor_duplicates.append(url)
        base_urls.add(base_url)
    
    # Check success rate
    success_count = sum(1 for data in metadata.values() if data['status_code'] == 200)
    success_rate = (success_count / len(metadata) * 100) if metadata else 0
    
    print(f"\nResults:")
    print(f"  Total URLs: {len(metadata)}")
    print(f"  Success rate: {success_rate:.1f}%")
    print(f"  JavaScript URLs: {len(js_urls)}")
    print(f"  Anchor duplicates: {len(anchor_duplicates)}")
    
    if js_urls:
        print(f"\n  JavaScript URLs found:")
        for url in js_urls[:3]:
            print(f"    - {url}")
    
    if anchor_duplicates:
        print(f"\n  Anchor duplicates found:")
        for url in anchor_duplicates[:3]:
            print(f"    - {url}")
    
    return len(js_urls) == 0 and len(anchor_duplicates) == 0


def main():
    """Run all tests."""
    print("Testing Crawler Fixes")
    print("=" * 50)
    
    tests = [
        test_javascript_template_filter,
        test_anchor_deduplication,
        test_content_quality,
        test_revzilla_specifically
    ]
    
    passed = 0
    failed = 0
    
    for test in tests:
        try:
            if test():
                passed += 1
            else:
                failed += 1
        except Exception as e:
            print(f"✗ Test {test.__name__} crashed: {e}")
            failed += 1
    
    print("\n" + "=" * 50)
    print(f"Tests completed: {passed + failed}")
    print(f"Passed: {passed}")
    print(f"Failed: {failed}")
    
    return failed == 0


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)