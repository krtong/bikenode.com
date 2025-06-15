#!/usr/bin/env python3
"""
Test if the actual crawler works on RevZilla by running it directly.
"""

import sys
sys.path.append('/Users/kevintong/Documents/Code/bikenode.com/scrapers/crawl-scrape-pipeline')

# Import the run_map module directly
import run_map

# Create mapper and run
mapper = run_map.SiteMapper('revzilla.com')

# Run with requests method since scrapy isn't available
print("Running crawler on revzilla.com...")
try:
    metadata = mapper.run(methods=['requests'])
    print(f"\nCrawler completed successfully!")
    print(f"Found {len(metadata)} URLs")
    
    # Show first 10 URLs
    print("\nFirst 10 URLs:")
    for i, (url, data) in enumerate(list(metadata.items())[:10]):
        print(f"{i+1}. {data['status_code']} - {url} ({data['size']} bytes)")
        
except Exception as e:
    print(f"\nCrawler failed with error: {e}")
    import traceback
    traceback.print_exc()