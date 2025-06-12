#!/usr/bin/env python3
"""
Step 08: Full Crawling
Performs full-scale crawling of all URLs using optimized settings.
"""

import argparse
import asyncio
import sys
import time
from pathlib import Path
from typing import Dict, List, Optional, Any, Set
from urllib.parse import urlparse
from concurrent.futures import ThreadPoolExecutor, as_completed

import scrapy
from scrapy.crawler import CrawlerProcess
from scrapy.downloadermiddlewares.retry import RetryMiddleware
from scrapy import signals
from scrapy.exceptions import NotConfigured

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent / '00_env'))

from config import config
from utils import (
    setup_logging, load_json, load_yaml, save_json, append_ndjson,
    read_urls_file, ensure_dir, create_timestamp, chunk_list
)


class FullCrawlSpider(scrapy.Spider):
    """Optimized spider for full-scale crawling."""
    
    name = 'full_crawl_spider'
    custom_settings = {
        'CONCURRENT_REQUESTS': 32,
        'CONCURRENT_REQUESTS_PER_DOMAIN': 16,
        'DOWNLOAD_DELAY': 0.25,
        'AUTOTHROTTLE_ENABLED': True,
        'AUTOTHROTTLE_TARGET_CONCURRENCY': 16,
        'RETRY_TIMES': 2,
        'RETRY_HTTP_CODES': [500, 502, 503, 504, 408, 429],
        'DOWNLOAD_TIMEOUT': 30,
        'FEEDS': {
            'html/%(batch_id)s/%(name)s.ndjson': {
                'format': 'jsonlines',
                'encoding': 'utf8',
                'store_empty': False,
            },
        },
    }
    
    def __init__(self, urls: List[str], batch_id: str, output_dir: Path, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.start_urls = urls
        self.batch_id = batch_id
        self.output_dir = output_dir
        self.pages_dir = output_dir / 'html' / batch_id
        self.pages_dir.mkdir(parents=True, exist_ok=True)
        
        self.stats = {
            'total': len(urls),
            'success': 0,
            'failed': 0,
            'start_time': time.time(),
        }
    
    @classmethod
    def from_crawler(cls, crawler, *args, **kwargs):
        spider = super().from_crawler(crawler, *args, **kwargs)
        crawler.signals.connect(spider.spider_closed, signal=signals.spider_closed)
        return spider
    
    def parse(self, response):
        """Save response content and metadata."""
        # Create metadata
        metadata = {
            'url': response.url,
            'status': response.status,
            'timestamp': create_timestamp(),
            'headers': dict(response.headers),
            'meta': {
                'download_latency': response.meta.get('download_latency', 0),
                'depth': response.meta.get('depth', 0),
                'redirect_urls': response.meta.get('redirect_urls', []),
            },
        }
        
        # Save HTML content
        if response.status == 200:
            # Create safe filename
            parsed = urlparse(response.url)
            filename = f"{parsed.netloc}{parsed.path}".replace('/', '_')
            if not filename.endswith('.html'):
                filename += '.html'
            
            filepath = self.pages_dir / filename
            
            # Save content
            with open(filepath, 'wb') as f:
                f.write(response.body)
            
            metadata['file_path'] = str(filepath.relative_to(self.output_dir))
            metadata['content_length'] = len(response.body)
            self.stats['success'] += 1
        else:
            self.stats['failed'] += 1
        
        yield metadata
    
    def spider_closed(self, spider):
        """Log statistics when spider closes."""
        duration = time.time() - self.stats['start_time']
        self.logger.info(f"Batch {self.batch_id} complete:")
        self.logger.info(f"  Duration: {duration:.1f}s")
        self.logger.info(f"  Success: {self.stats['success']}/{self.stats['total']}")
        self.logger.info(f"  Failed: {self.stats['failed']}")
        self.logger.info(f"  Rate: {self.stats['success']/duration:.1f} pages/sec")


class FullCrawler:
    """Orchestrates full-scale crawling operations."""
    
    def __init__(self, domain: str):
        """Initialize full crawler."""
        self.domain = domain
        self.logger = setup_logging('full_crawler', Path(__file__).parent / 'fetch.log')
        self.output_dir = Path(__file__).parent
        self.html_dir = ensure_dir(self.output_dir / 'html')
        self.json_dir = ensure_dir(self.output_dir / 'json')
        self.metadata_file = self.output_dir / 'crawl_metadata.ndjson'
    
    def load_urls(self, pattern: Optional[str] = None) -> List[str]:
        """Load URLs to crawl."""
        if pattern:
            # Load URLs for specific pattern
            pattern_dir = Path(__file__).parent.parent / '03_group' / 'by_template'
            safe_pattern = pattern.replace('/', '_').replace('{', '').replace('}', '')
            if safe_pattern.startswith('_'):
                safe_pattern = safe_pattern[1:]
            
            urls_file = pattern_dir / f"{safe_pattern}.txt"
            if urls_file.exists():
                return read_urls_file(urls_file)
        else:
            # Load all filtered URLs from 02_filter per spec
            urls_file = Path(__file__).parent.parent / '02_filter' / 'all_urls.txt'
            if urls_file.exists():
                return read_urls_file(urls_file)
        
        return []
    
    def should_use_api(self, pattern: str) -> bool:
        """Check if pattern should use API instead of HTML crawling."""
        api_file = Path(__file__).parent.parent / '06_plan' / 'api_endpoints.yaml'
        if api_file.exists():
            api_config = load_yaml(api_file)
            return pattern in api_config
        return False
    
    def crawl_batch(self, urls: List[str], batch_id: str) -> Dict[str, Any]:
        """Crawl a batch of URLs."""
        self.logger.info(f"Starting batch {batch_id} with {len(urls)} URLs")
        
        start_time = time.time()
        
        # Configure and run crawler
        process = CrawlerProcess({
            **config.get_scrapy_settings(),
            'LOG_LEVEL': 'WARNING',  # Reduce verbosity
        })
        
        process.crawl(
            FullCrawlSpider,
            urls=urls,
            batch_id=batch_id,
            output_dir=self.output_dir
        )
        
        process.start()
        
        duration = time.time() - start_time
        
        return {
            'batch_id': batch_id,
            'url_count': len(urls),
            'duration': duration,
            'rate': len(urls) / duration if duration > 0 else 0,
        }
    
    def crawl_api_endpoints(self, pattern: str, urls: List[str]) -> int:
        """Crawl API endpoints instead of HTML pages."""
        api_file = Path(__file__).parent.parent / '06_plan' / 'api_endpoints.yaml'
        api_config = load_yaml(api_file)
        
        endpoint_config = api_config.get(pattern, {})
        if not endpoint_config:
            self.logger.warning(f"No API config found for pattern {pattern}")
            return 0
        
        success_count = 0
        
        for url in urls:
            # Extract ID from URL based on pattern
            # This is simplified - real implementation would use regex
            parsed = urlparse(url)
            path_parts = parsed.path.strip('/').split('/')
            
            if len(path_parts) > 0:
                item_id = path_parts[-1]
                
                # Construct API URL
                api_url = endpoint_config.get('url_template', '').format(id=item_id)
                
                # Here you would make the API request
                # For now, we'll just log it
                self.logger.info(f"Would fetch API: {api_url}")
                success_count += 1
        
        return success_count
    
    def run(self, pattern: Optional[str] = None, 
            batch_size: int = 1000,
            max_urls: Optional[int] = None) -> Dict[str, Any]:
        """Run full crawling operation."""
        self.logger.info(f"Starting full crawl for domain: {self.domain}")
        
        # Load URLs
        all_urls = self.load_urls(pattern)
        if not all_urls:
            self.logger.error("No URLs found to crawl")
            return {}
        
        # Limit URLs if specified
        if max_urls:
            all_urls = all_urls[:max_urls]
        
        self.logger.info(f"Total URLs to crawl: {len(all_urls)}")
        
        # Check if we should use API
        if pattern and self.should_use_api(pattern):
            self.logger.info("Using API endpoint for this pattern")
            success_count = self.crawl_api_endpoints(pattern, all_urls)
            return {
                'method': 'api',
                'total_urls': len(all_urls),
                'success': success_count,
            }
        
        # Split into batches
        batches = chunk_list(all_urls, batch_size)
        self.logger.info(f"Split into {len(batches)} batches of up to {batch_size} URLs")
        
        # Track overall statistics
        overall_stats = {
            'start_time': time.time(),
            'total_urls': len(all_urls),
            'total_batches': len(batches),
            'batch_results': [],
        }
        
        # Process batches
        for i, batch_urls in enumerate(batches):
            batch_id = f"batch_{i:04d}"
            
            try:
                result = self.crawl_batch(batch_urls, batch_id)
                overall_stats['batch_results'].append(result)
                
                # Brief pause between batches
                if i < len(batches) - 1:
                    time.sleep(5)
                    
            except Exception as e:
                self.logger.error(f"Error in batch {batch_id}: {e}")
                overall_stats['batch_results'].append({
                    'batch_id': batch_id,
                    'error': str(e),
                })
        
        # Calculate final statistics
        overall_stats['end_time'] = time.time()
        overall_stats['total_duration'] = overall_stats['end_time'] - overall_stats['start_time']
        
        # Count successful crawls
        successful_batches = [r for r in overall_stats['batch_results'] if 'error' not in r]
        overall_stats['successful_batches'] = len(successful_batches)
        overall_stats['failed_batches'] = len(batches) - len(successful_batches)
        
        # Save statistics
        stats_file = self.output_dir / 'crawl_stats.json'
        save_json(overall_stats, stats_file)
        
        # Log summary
        self.logger.info("Crawl complete!")
        self.logger.info(f"Total duration: {overall_stats['total_duration']:.1f}s")
        self.logger.info(f"Successful batches: {overall_stats['successful_batches']}/{len(batches)}")
        
        return overall_stats


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description='Perform full-scale crawling',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Crawl all filtered URLs
  python crawl_full.py --domain example.com
  
  # Crawl specific pattern
  python crawl_full.py --domain example.com --pattern "/product/{slug}"
  
  # Limit number of URLs
  python crawl_full.py --domain example.com --max-urls 10000
  
  # Custom batch size
  python crawl_full.py --domain example.com --batch-size 500
        """
    )
    
    parser.add_argument('--domain', required=True, help='Domain to crawl')
    parser.add_argument('--pattern', help='Specific URL pattern to crawl')
    parser.add_argument('--batch-size', type=int, default=1000,
                       help='Number of URLs per batch')
    parser.add_argument('--max-urls', type=int,
                       help='Maximum number of URLs to crawl')
    
    args = parser.parse_args()
    
    # Run crawler
    crawler = FullCrawler(args.domain)
    stats = crawler.run(
        pattern=args.pattern,
        batch_size=args.batch_size,
        max_urls=args.max_urls
    )
    
    if stats:
        print(f"\nCrawl complete!")
        print(f"Total URLs: {stats.get('total_urls', 0)}")
        print(f"Duration: {stats.get('total_duration', 0):.1f}s")
        print(f"Batches: {stats.get('successful_batches', 0)}/{stats.get('total_batches', 0)} successful")


if __name__ == '__main__':
    main()