#!/usr/bin/env python3
"""
Step 07: Sample Crawling
Crawls a sample of URLs to test extraction logic before full crawl.
"""

import argparse
import asyncio
import sys
from pathlib import Path
from typing import Dict, List, Optional, Any, Tuple
from urllib.parse import urlparse

from playwright.async_api import async_playwright, Page
import scrapy
from scrapy.crawler import CrawlerProcess

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent / 'orchestration'))

from config import config
from utils_minimal import (
    setup_logging, load_json, load_yaml, save_json, append_ndjson,
    ensure_dir, create_timestamp, normalize_url
)


class SampleSpider(scrapy.Spider):
    """Scrapy spider for sample crawling."""
    
    name = 'sample_spider'
    
    def __init__(self, urls: List[str], selectors: Dict[str, str], *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.start_urls = urls
        self.selectors = selectors
        self.results = []
    
    def parse(self, response):
        """Parse response using configured selectors."""
        result = {
            'url': response.url,
            'timestamp': create_timestamp(),
            'status': response.status,
            'data': {},
        }
        
        # Extract data using selectors
        for field, selector in self.selectors.items():
            try:
                if selector.startswith('//'):  # XPath
                    values = response.xpath(selector).getall()
                else:  # CSS
                    values = response.css(selector).getall()
                
                # Clean and store values
                if values:
                    result['data'][field] = values[0] if len(values) == 1 else values
            except Exception as e:
                self.logger.error(f"Error extracting {field}: {e}")
        
        self.results.append(result)
        yield result


class PlaywrightCrawler:
    """Playwright-based crawler for JavaScript-heavy sites."""
    
    def __init__(self, selectors: Dict[str, str]):
        self.selectors = selectors
        self.results = []
    
    async def crawl_url(self, page: Page, url: str) -> Dict[str, Any]:
        """Crawl a single URL with Playwright."""
        result = {
            'url': url,
            'timestamp': create_timestamp(),
            'status': None,
            'data': {},
        }
        
        try:
            response = await page.goto(url, wait_until='networkidle', timeout=30000)
            result['status'] = response.status if response else None
            
            # Wait for content
            await page.wait_for_timeout(2000)
            
            # Extract data using selectors
            for field, selector in self.selectors.items():
                try:
                    elements = await page.query_selector_all(selector)
                    values = []
                    
                    for element in elements:
                        text = await element.text_content()
                        if text:
                            values.append(text.strip())
                    
                    if values:
                        result['data'][field] = values[0] if len(values) == 1 else values
                
                except Exception as e:
                    print(f"Error extracting {field}: {e}")
            
            # Extract additional metadata
            result['metadata'] = {
                'title': await page.title(),
                'url_final': page.url,  # After redirects
            }
            
        except Exception as e:
            result['error'] = str(e)
        
        return result
    
    async def crawl_urls(self, urls: List[str]) -> List[Dict[str, Any]]:
        """Crawl multiple URLs."""
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context(**config.get_playwright_context())
            page = await context.new_page()
            
            for url in urls:
                print(f"Crawling {url}")
                result = await self.crawl_url(page, url)
                self.results.append(result)
            
            await browser.close()
        
        return self.results


class SampleCrawler:
    """Main sample crawler orchestrator."""
    
    def __init__(self, domain: str, pattern: str):
        """Initialize sample crawler."""
        self.domain = domain
        self.pattern = pattern
        self.logger = setup_logging('sample_crawler', Path(__file__).parent / 'sample.log')
        self.output_file = Path(__file__).parent / 'output.ndjson'
    
    def load_configuration(self) -> Tuple[List[str], Dict[str, str], str]:
        """Load URLs, selectors, and method from configuration."""
        # Load patterns to probe results
        findings_file = Path(__file__).parent.parent / '04_probe' / 'findings.json'
        if findings_file.exists():
            findings = load_json(findings_file)
            pattern_findings = findings.get(self.pattern, {})
            
            # Determine method based on findings
            common = pattern_findings.get('common_structure', {})
            method = 'playwright' if common.get('uses_javascript') else 'scrapy'
        else:
            method = 'scrapy'  # Default
        
        # Load selectors from plan (if exists)
        selectors_file = Path(__file__).parent.parent / '06_plan' / 'css_selectors.yaml'
        if selectors_file.exists():
            selectors_config = load_yaml(selectors_file)
            selectors = selectors_config.get(self.pattern, {})
        else:
            # Default selectors
            selectors = {
                'title': 'h1',
                'price': '.price',
                'description': '.description',
                'image': 'img.product-image',
            }
        
        # Load URLs for this pattern
        pattern_dir = Path(__file__).parent.parent / '03_group' / 'by_template'
        safe_pattern = self.pattern.replace('/', '_').replace('{', '').replace('}', '')
        if safe_pattern.startswith('_'):
            safe_pattern = safe_pattern[1:]
        
        urls_file = pattern_dir / f"{safe_pattern}.txt"
        urls = []
        if urls_file.exists():
            with open(urls_file, 'r') as f:
                urls = [line.strip() for line in f if line.strip()][:30]  # First 30 URLs per spec
        
        return urls, selectors, method
    
    def run_scrapy_crawl(self, urls: List[str], selectors: Dict[str, str]) -> List[Dict]:
        """Run crawl using Scrapy."""
        self.logger.info(f"Running Scrapy crawl for {len(urls)} URLs")
        
        # Create spider
        process = CrawlerProcess(config.get_scrapy_settings())
        spider = SampleSpider
        process.crawl(spider, urls=urls, selectors=selectors)
        process.start()
        
        # Get results
        results = []
        for crawler in process.crawlers:
            if hasattr(crawler.spider, 'results'):
                results.extend(crawler.spider.results)
        
        return results
    
    async def run_playwright_crawl(self, urls: List[str], selectors: Dict[str, str]) -> List[Dict]:
        """Run crawl using Playwright."""
        self.logger.info(f"Running Playwright crawl for {len(urls)} URLs")
        
        crawler = PlaywrightCrawler(selectors)
        results = await crawler.crawl_urls(urls)
        
        return results
    
    def analyze_results(self, results: List[Dict]) -> Dict[str, Any]:
        """Analyze crawl results to assess extraction quality."""
        analysis = {
            'total_urls': len(results),
            'successful': sum(1 for r in results if r.get('status') == 200),
            'fields_extracted': {},
            'coverage': {},
        }
        
        # Analyze field extraction
        for result in results:
            data = result.get('data', {})
            for field, value in data.items():
                if field not in analysis['fields_extracted']:
                    analysis['fields_extracted'][field] = 0
                if value:  # Field has data
                    analysis['fields_extracted'][field] += 1
        
        # Calculate coverage
        for field, count in analysis['fields_extracted'].items():
            analysis['coverage'][field] = count / len(results) if results else 0
        
        return analysis
    
    async def run(self, method: Optional[str] = None) -> Dict[str, Any]:
        """Run sample crawling."""
        self.logger.info(f"Starting sample crawl for pattern: {self.pattern}")
        
        # Load configuration
        urls, selectors, default_method = self.load_configuration()
        
        if not urls:
            self.logger.error("No URLs found for pattern")
            return {}
        
        self.logger.info(f"Loaded {len(urls)} URLs and {len(selectors)} selectors")
        
        # Use specified method or default
        crawl_method = method or default_method
        
        # Run crawl
        if crawl_method == 'playwright':
            results = await self.run_playwright_crawl(urls, selectors)
        else:
            results = self.run_scrapy_crawl(urls, selectors)
        
        # Save results
        for result in results:
            append_ndjson(result, self.output_file)
        
        self.logger.info(f"Saved {len(results)} results to {self.output_file}")
        
        # Analyze results
        analysis = self.analyze_results(results)
        
        # Log summary
        self.logger.info(f"Crawl complete: {analysis['successful']}/{analysis['total_urls']} successful")
        for field, coverage in analysis['coverage'].items():
            self.logger.info(f"  {field}: {coverage:.1%} coverage")
        
        # Check fail rule: if >10% of fields miss, exit non-zero
        failed_fields = []
        for field, coverage in analysis['coverage'].items():
            if coverage < 0.9:  # Less than 90% coverage means >10% missing
                failed_fields.append(f"{field} ({coverage:.1%})")
        
        if failed_fields:
            self.logger.error(f"Failed coverage threshold for fields: {', '.join(failed_fields)}")
            sys.exit(1)
        
        return analysis


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description='Crawl sample URLs to test extraction',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Crawl sample for a specific pattern
  python crawl_sample.py --domain example.com --pattern "/product/{slug}"
  
  # Force specific method
  python crawl_sample.py --domain example.com --pattern "/product/{slug}" --method playwright
  
  # Crawl all patterns
  python crawl_sample.py --domain example.com --all-patterns
        """
    )
    
    parser.add_argument('--domain', required=True, help='Domain being crawled')
    parser.add_argument('--pattern', help='URL pattern to sample')
    parser.add_argument('--method', choices=['scrapy', 'playwright'],
                       help='Force specific crawl method')
    parser.add_argument('--all-patterns', action='store_true',
                       help='Crawl samples for all patterns')
    
    args = parser.parse_args()
    
    if args.all_patterns:
        # Load all patterns
        patterns_file = config.dirs['probe'] / 'patterns_to_probe.json'
        if not patterns_file.exists():
            print("No patterns file found. Run probe step first.")
            sys.exit(1)
        
        patterns = load_json(patterns_file)
        
        # Run sample for each pattern
        for pattern in patterns:
            print(f"\nSampling pattern: {pattern}")
            crawler = SampleCrawler(args.domain, pattern)
            asyncio.run(crawler.run(method=args.method))
    
    elif args.pattern:
        # Run for specific pattern
        crawler = SampleCrawler(args.domain, args.pattern)
        analysis = asyncio.run(crawler.run(method=args.method))
        
        print(f"\nSample crawl complete!")
        print(f"Success rate: {analysis['successful']}/{analysis['total_urls']}")
        print(f"Field coverage:")
        for field, coverage in analysis['coverage'].items():
            print(f"  {field}: {coverage:.1%}")
    
    else:
        print("Please specify --pattern or --all-patterns")
        sys.exit(1)


if __name__ == '__main__':
    main()