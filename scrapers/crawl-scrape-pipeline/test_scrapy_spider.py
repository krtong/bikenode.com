#!/usr/bin/env python3
"""
Test the MetadataSpider directly to debug link extraction.
"""
import sys
from pathlib import Path

# Add parent directory to path
sys.path.append(str(Path(__file__)))

from scrapers.crawl_scrape_pipeline.01_map.run_map import MetadataSpider
from scrapy.crawler import CrawlerProcess

# Test spider
process = CrawlerProcess({
    'LOG_LEVEL': 'DEBUG',
    'USER_AGENT': 'Mozilla/5.0 Test Spider',
})

spider = MetadataSpider(domain='quotes.toscrape.com')

# Run the spider
process.crawl(spider)
process.start()

# Check results
print(f"\nFound {len(spider.url_metadata)} URLs")
for url, data in list(spider.url_metadata.items())[:5]:
    print(f"- {url}: {data['status_code']} ({data['content_type']})")