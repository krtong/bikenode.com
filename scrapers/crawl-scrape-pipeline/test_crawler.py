#!/usr/bin/env python3
"""
Simple test script to verify the crawler works with a real website.
This will crawl a small website to test the pipeline.
"""

import sys
import subprocess
from pathlib import Path

def run_command(cmd, description):
    """Run a command and print the result."""
    print(f"\n{'='*60}")
    print(f"Running: {description}")
    print(f"Command: {cmd}")
    print('='*60)
    
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    
    if result.returncode == 0:
        print(f"✓ Success: {description}")
        if result.stdout:
            print(f"Output preview: {result.stdout[:200]}...")
    else:
        print(f"✗ Failed: {description}")
        print(f"Error: {result.stderr}")
        return False
    
    return True

def main():
    """Run a test crawl on a small website."""
    # Test with a small, crawl-friendly website
    # Using quotes.toscrape.com which is designed for web scraping practice
    test_domain = "quotes.toscrape.com"
    
    print(f"Testing crawler with: {test_domain}")
    print("This is a website designed for web scraping practice.\n")
    
    # Change to pipeline directory
    pipeline_dir = Path(__file__).parent
    
    # Step 1: Map the site (discover URLs)
    if not run_command(
        f"cd {pipeline_dir} && python 01_map/run_map.py {test_domain}",
        "Step 1: Mapping site URLs"
    ):
        print("\nMapping failed. Make sure you have installed dependencies:")
        print("pip install -r requirements.txt")
        print("playwright install")
        return 1
    
    # Step 2: Filter URLs (keep only scrapeable ones)
    if not run_command(
        f"cd {pipeline_dir} && python 02_filter/filter_urls.py",
        "Step 2: Filtering URLs"
    ):
        return 1
    
    # Step 3: Group URLs by template
    if not run_command(
        f"cd {pipeline_dir} && python 03_group/group_urls.py",
        "Step 3: Grouping URLs by template"
    ):
        return 1
    
    # Show results
    print("\n" + "="*60)
    print("TEST RESULTS")
    print("="*60)
    
    # Check what we found
    dump_file = pipeline_dir / "01_map/dump.csv"
    if dump_file.exists():
        with open(dump_file) as f:
            lines = f.readlines()
            print(f"✓ Found {len(lines)-1} URLs")
            if len(lines) > 1:
                print(f"  First URL: {lines[1].split(',')[0]}")
    
    # Check filtered URLs
    filtered_file = pipeline_dir / "02_filter/all_urls.txt"
    if filtered_file.exists():
        with open(filtered_file) as f:
            urls = f.readlines()
            print(f"✓ {len(urls)} URLs passed filtering")
    
    # Check grouping
    summary_file = pipeline_dir / "03_group/grouping_summary.json"
    if summary_file.exists():
        import json
        with open(summary_file) as f:
            summary = json.load(f)
            if summary:
                print(f"✓ URLs grouped into {len(summary)} templates")
                for template, info in summary.items():
                    print(f"  - {template}: {info.get('count', 0)} URLs")
    
    print("\n✅ Basic crawler test completed successfully!")
    print("\nNext steps:")
    print("1. Continue with steps 4-14 to complete the full pipeline")
    print("2. Or run a different domain: python 01_map/run_map.py your-domain.com")
    
    return 0

if __name__ == "__main__":
    sys.exit(main())