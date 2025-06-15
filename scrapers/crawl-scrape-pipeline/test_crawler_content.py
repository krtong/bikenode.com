#!/usr/bin/env python3
"""
Test crawler content quality to ensure we're getting real HTML, not garbled data.
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from pathlib import Path
import csv
import json
import re
from urllib.parse import urlparse


class ContentQualityTester:
    """Tests the quality of crawled content."""
    
    def __init__(self):
        self.base_dir = Path(__file__).parent / "01_map"
        self.issues = []
        self.passed = 0
        self.failed = 0
        
    def test_csv_file(self, csv_file: Path) -> dict:
        """Test a CSV file for content quality issues."""
        print(f"\n=== Testing {csv_file.name} ===")
        
        if not csv_file.exists():
            print(f"✗ File not found: {csv_file}")
            return {"status": "failed", "reason": "file_not_found"}
        
        issues = []
        stats = {
            "total_urls": 0,
            "status_200": 0,
            "javascript_urls": 0,
            "anchor_duplicates": 0,
            "zero_size": 0,
            "suspicious_size": 0,
            "error_status": 0
        }
        
        # Track URLs without anchors to find duplicates
        urls_without_anchors = set()
        anchor_duplicates = []
        
        with open(csv_file, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            
            for row in reader:
                stats["total_urls"] += 1
                url = row.get('url', '')
                status = int(row.get('status_code', 0))
                size = int(row.get('size', 0))
                content_type = row.get('content_type', '')
                
                # Check for JavaScript template URLs
                if '${' in url or '{{' in url:
                    stats["javascript_urls"] += 1
                    issues.append(f"JavaScript template URL: {url}")
                
                # Check for anchor duplicates
                url_no_anchor = url.split('#')[0]
                if url_no_anchor in urls_without_anchors and '#' in url:
                    stats["anchor_duplicates"] += 1
                    anchor_duplicates.append(url)
                urls_without_anchors.add(url_no_anchor)
                
                # Check status codes
                if status == 200:
                    stats["status_200"] += 1
                elif status == 0:
                    stats["error_status"] += 1
                    issues.append(f"Error status (0) for URL: {url}")
                
                # Check content size
                if size == 0 and status == 200:
                    stats["zero_size"] += 1
                    issues.append(f"Zero size content for 200 status: {url}")
                elif size < 100 and status == 200 and 'html' in content_type:
                    stats["suspicious_size"] += 1
                    issues.append(f"Suspiciously small HTML ({size} bytes): {url}")
        
        # Print results
        print(f"\nStatistics:")
        print(f"  Total URLs: {stats['total_urls']}")
        print(f"  Status 200: {stats['status_200']}")
        print(f"  JavaScript URLs: {stats['javascript_urls']}")
        print(f"  Anchor duplicates: {stats['anchor_duplicates']}")
        print(f"  Zero size: {stats['zero_size']}")
        print(f"  Suspicious size: {stats['suspicious_size']}")
        print(f"  Error status: {stats['error_status']}")
        
        if anchor_duplicates:
            print(f"\nAnchor duplicate URLs found:")
            for url in anchor_duplicates[:5]:  # Show first 5
                print(f"  - {url}")
        
        if issues:
            print(f"\nIssues found ({len(issues)}):")
            for issue in issues[:10]:  # Show first 10
                print(f"  - {issue}")
            self.failed += 1
            return {"status": "failed", "stats": stats, "issues": issues}
        else:
            print("✓ No content quality issues found")
            self.passed += 1
            return {"status": "passed", "stats": stats}
    
    def test_actual_content(self, domain: str, max_urls: int = 5):
        """Test by actually crawling and checking content."""
        print(f"\n=== Live content test for {domain} ===")
        
        # Import here to avoid circular imports
        sys.path.append(str(self.base_dir))
        from run_map import SiteMapper
        
        mapper = SiteMapper(domain, max_pages=max_urls)
        metadata = mapper.run(methods=['requests'])
        
        if not metadata:
            print("✗ No URLs found")
            self.failed += 1
            return {"status": "failed", "reason": "no_urls"}
        
        # Check content quality
        issues = []
        for url, data in list(metadata.items())[:5]:  # Check first 5
            print(f"\nChecking {url}:")
            print(f"  Status: {data['status_code']}")
            print(f"  Size: {data['size']} bytes")
            print(f"  Type: {data['content_type']}")
            
            if data['status_code'] == 200:
                # For enhanced metadata, check if we got real content
                if 'page_title' in data:
                    print(f"  Title: {data['page_title'][:50]}...")
                if 'meta_description' in data:
                    print(f"  Description: {data['meta_description'][:50]}...")
                
                # Check for suspicious patterns
                if data['size'] < 1000 and 'html' in data['content_type']:
                    issues.append(f"Suspiciously small HTML content for {url}")
        
        if issues:
            print(f"\n✗ Content issues found: {len(issues)}")
            self.failed += 1
            return {"status": "failed", "issues": issues}
        else:
            print("\n✓ Content quality looks good")
            self.passed += 1
            return {"status": "passed", "metadata": metadata}
    
    def test_revzilla_sample(self):
        """Test the RevZilla dump.csv for known issues."""
        dump_file = self.base_dir / "dump.csv"
        return self.test_csv_file(dump_file)
    
    def run_all_tests(self):
        """Run all content quality tests."""
        print("Starting content quality tests...")
        
        # Test existing CSV files
        csv_files = list(self.base_dir.glob("*.csv"))
        print(f"\nFound {len(csv_files)} CSV files to test")
        
        results = {}
        for csv_file in csv_files[:5]:  # Test first 5
            result = self.test_csv_file(csv_file)
            results[csv_file.name] = result
        
        # Test live crawling on a simple site
        print("\n" + "="*50)
        print("Testing live crawl on example.com")
        live_result = self.test_actual_content("example.com", max_urls=3)
        results["live_example.com"] = live_result
        
        # Summary
        print("\n" + "="*50)
        print(f"Tests completed: {self.passed + self.failed}")
        print(f"Passed: {self.passed}")
        print(f"Failed: {self.failed}")
        
        # Show problematic files
        print("\nProblematic files:")
        for filename, result in results.items():
            if result["status"] == "failed":
                print(f"  - {filename}")
                if "stats" in result:
                    stats = result["stats"]
                    if stats["javascript_urls"] > 0:
                        print(f"    JavaScript URLs: {stats['javascript_urls']}")
                    if stats["anchor_duplicates"] > 0:
                        print(f"    Anchor duplicates: {stats['anchor_duplicates']}")
        
        return self.failed == 0


def main():
    """Run the content quality tests."""
    tester = ContentQualityTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()