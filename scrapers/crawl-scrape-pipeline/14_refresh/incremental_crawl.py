#!/usr/bin/env python3
"""
Step 14: Incremental Crawling
Performs incremental updates by crawling only new or changed content.
"""

import argparse
import sys
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple
from datetime import datetime, timedelta
from urllib.parse import urlparse
import psycopg2
from psycopg2.extras import RealDictCursor

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent / '00_env'))

from config import config
from utils import (
    setup_logging, save_json, load_json, write_urls_file,
    read_urls_file, create_timestamp
)


class IncrementalCrawler:
    """Handles incremental crawling strategy."""
    
    def __init__(self, domain: str):
        """Initialize incremental crawler."""
        self.domain = domain
        self.logger = setup_logging('incremental_crawler', Path(__file__).parent / 'refresh.log')
        self.output_dir = Path(__file__).parent
        self.conn = None
    
    def connect(self) -> bool:
        """Connect to database."""
        try:
            self.conn = psycopg2.connect(config.database_url)
            return True
        except Exception as e:
            self.logger.error(f"Failed to connect to database: {e}")
            return False
    
    def disconnect(self):
        """Disconnect from database."""
        if self.conn:
            self.conn.close()
    
    def get_stale_urls(self, days: int = 7) -> List[str]:
        """Get URLs that haven't been scraped recently."""
        try:
            with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("""
                    SELECT source_url
                    FROM scraper.products
                    WHERE source_domain = %s
                    AND is_active = TRUE
                    AND (
                        last_scraped_at < NOW() - INTERVAL '%s days'
                        OR last_scraped_at IS NULL
                    )
                    ORDER BY last_scraped_at ASC NULLS FIRST
                """, (self.domain, days))
                
                results = cur.fetchall()
                return [r['source_url'] for r in results]
                
        except Exception as e:
            self.logger.error(f"Error getting stale URLs: {e}")
            return []
    
    def get_high_priority_urls(self) -> List[str]:
        """Get high-priority URLs (frequently changing, popular items)."""
        try:
            with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
                # Get products with frequent price changes
                cur.execute("""
                    SELECT DISTINCT p.source_url
                    FROM scraper.products p
                    JOIN scraper.price_history ph ON p.id = ph.product_id
                    WHERE p.source_domain = %s
                    AND p.is_active = TRUE
                    GROUP BY p.id, p.source_url
                    HAVING COUNT(DISTINCT DATE(ph.recorded_at)) > 2
                    ORDER BY COUNT(DISTINCT DATE(ph.recorded_at)) DESC
                    LIMIT 100
                """, (self.domain,))
                
                high_priority = {r['source_url'] for r in cur.fetchall()}
                
                # Get recently out-of-stock items to check availability
                cur.execute("""
                    SELECT source_url
                    FROM scraper.products
                    WHERE source_domain = %s
                    AND is_active = TRUE
                    AND availability IN ('out_of_stock', 'limited_stock')
                    AND last_scraped_at < NOW() - INTERVAL '1 day'
                    LIMIT 50
                """, (self.domain,))
                
                high_priority.update(r['source_url'] for r in cur.fetchall())
                
                return list(high_priority)
                
        except Exception as e:
            self.logger.error(f"Error getting high priority URLs: {e}")
            return []
    
    def discover_new_urls(self) -> List[str]:
        """Discover new URLs by crawling category/listing pages."""
        new_urls = []
        
        try:
            # Get category/listing URLs
            with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("""
                    SELECT DISTINCT source_url
                    FROM scraper.products
                    WHERE source_domain = %s
                    AND source_url LIKE '%/category/%'
                       OR source_url LIKE '%/collection/%'
                       OR source_url LIKE '%/shop/%'
                    LIMIT 20
                """, (self.domain,))
                
                category_urls = [r['source_url'] for r in cur.fetchall()]
            
            # Also check from original URL patterns
            patterns_file = Path(__file__).parent.parent / '03_group' / 'grouping_summary.json'
            if patterns_file.exists():
                summary = load_json(patterns_file)
                patterns = summary.get('patterns', {})
                
                # Find listing patterns
                for pattern, info in patterns.items():
                    if info.get('likely_type') == 'product_listing':
                        examples = info.get('examples', [])
                        category_urls.extend(examples[:5])
            
            # Run lightweight crawl on category pages
            if category_urls:
                self.logger.info(f"Checking {len(category_urls)} category pages for new products")
                
                # Import and use the mapping spider
                from run_map import SiteMapper
                mapper = SiteMapper(self.domain)
                
                # Crawl with limited depth
                discovered = mapper.crawl_website(max_depth=1)
                
                # Filter to find new product URLs
                existing_urls = self.get_all_product_urls()
                new_urls = [url for url in discovered if url not in existing_urls]
                
                self.logger.info(f"Discovered {len(new_urls)} new URLs")
        
        except Exception as e:
            self.logger.error(f"Error discovering new URLs: {e}")
        
        return new_urls
    
    def get_all_product_urls(self) -> Set[str]:
        """Get all existing product URLs from database."""
        try:
            with self.conn.cursor() as cur:
                cur.execute("""
                    SELECT source_url
                    FROM scraper.products
                    WHERE source_domain = %s
                """, (self.domain,))
                
                return {r[0] for r in cur.fetchall()}
                
        except Exception as e:
            self.logger.error(f"Error getting existing URLs: {e}")
            return set()
    
    def prioritize_urls(self, urls: List[str], max_urls: int) -> List[str]:
        """Prioritize URLs for crawling."""
        if len(urls) <= max_urls:
            return urls
        
        # Group URLs by priority
        priority_groups = {
            'high': [],
            'medium': [],
            'low': [],
        }
        
        # Get URL metadata from database
        try:
            with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
                url_str = ','.join(f"'{url}'" for url in urls[:1000])  # Limit for query
                
                cur.execute(f"""
                    SELECT 
                        source_url,
                        last_scraped_at,
                        price,
                        availability
                    FROM scraper.products
                    WHERE source_url IN ({url_str})
                """)
                
                url_data = {r['source_url']: r for r in cur.fetchall()}
        except:
            url_data = {}
        
        # Categorize URLs
        for url in urls:
            data = url_data.get(url, {})
            
            # High priority: never scraped or out of stock
            if not data.get('last_scraped_at') or data.get('availability') == 'out_of_stock':
                priority_groups['high'].append(url)
            # Medium priority: high-value items or stale
            elif data.get('price', 0) > 100 or (
                data.get('last_scraped_at') and 
                (datetime.utcnow() - data['last_scraped_at']).days > 3
            ):
                priority_groups['medium'].append(url)
            else:
                priority_groups['low'].append(url)
        
        # Build final list
        prioritized = []
        for group in ['high', 'medium', 'low']:
            remaining = max_urls - len(prioritized)
            if remaining > 0:
                prioritized.extend(priority_groups[group][:remaining])
        
        return prioritized
    
    def generate_crawl_list(self, strategy: str = 'balanced',
                           max_urls: int = 1000,
                           stale_days: int = 7) -> Tuple[List[str], Dict[str, Any]]:
        """Generate list of URLs to crawl based on strategy."""
        urls_to_crawl = []
        stats = {
            'strategy': strategy,
            'stale_urls': 0,
            'high_priority_urls': 0,
            'new_urls': 0,
        }
        
        if strategy == 'stale':
            # Only crawl stale URLs
            stale_urls = self.get_stale_urls(stale_days)
            urls_to_crawl = stale_urls[:max_urls]
            stats['stale_urls'] = len(urls_to_crawl)
            
        elif strategy == 'priority':
            # Only crawl high-priority URLs
            priority_urls = self.get_high_priority_urls()
            urls_to_crawl = priority_urls[:max_urls]
            stats['high_priority_urls'] = len(urls_to_crawl)
            
        elif strategy == 'discover':
            # Focus on discovering new URLs
            new_urls = self.discover_new_urls()
            urls_to_crawl = new_urls[:max_urls]
            stats['new_urls'] = len(urls_to_crawl)
            
        elif strategy == 'balanced':
            # Balance between different types
            remaining = max_urls
            
            # 40% high priority
            priority_urls = self.get_high_priority_urls()
            priority_count = min(len(priority_urls), int(max_urls * 0.4))
            urls_to_crawl.extend(priority_urls[:priority_count])
            stats['high_priority_urls'] = priority_count
            remaining -= priority_count
            
            # 40% stale
            stale_urls = self.get_stale_urls(stale_days)
            stale_count = min(len(stale_urls), int(max_urls * 0.4))
            urls_to_crawl.extend(stale_urls[:stale_count])
            stats['stale_urls'] = stale_count
            remaining -= stale_count
            
            # 20% new discovery
            if remaining > 0:
                new_urls = self.discover_new_urls()
                new_count = min(len(new_urls), remaining)
                urls_to_crawl.extend(new_urls[:new_count])
                stats['new_urls'] = new_count
        
        # Remove duplicates while preserving order
        seen = set()
        unique_urls = []
        for url in urls_to_crawl:
            if url not in seen:
                seen.add(url)
                unique_urls.append(url)
        
        return unique_urls, stats
    
    def run(self, strategy: str = 'balanced',
            max_urls: int = 1000,
            stale_days: int = 7) -> Dict[str, Any]:
        """Run incremental crawl planning."""
        self.logger.info(f"Starting incremental crawl planning for domain: {self.domain}")
        self.logger.info(f"Strategy: {strategy}, Max URLs: {max_urls}")
        
        # Connect to database
        if not self.connect():
            return {}
        
        try:
            # Generate crawl list
            urls_to_crawl, stats = self.generate_crawl_list(
                strategy=strategy,
                max_urls=max_urls,
                stale_days=stale_days
            )
            
            if not urls_to_crawl:
                self.logger.warning("No URLs selected for incremental crawl")
                return {'error': 'No URLs to crawl'}
            
            # Save URL list
            urls_file = self.output_dir / 'incremental_urls.txt'
            write_urls_file(urls_to_crawl, urls_file)
            self.logger.info(f"Saved {len(urls_to_crawl)} URLs to {urls_file}")
            
            # Create crawl plan
            crawl_plan = {
                'timestamp': create_timestamp(),
                'domain': self.domain,
                'strategy': strategy,
                'total_urls': len(urls_to_crawl),
                'stats': stats,
                'sample_urls': urls_to_crawl[:10],
            }
            
            # Save crawl plan
            plan_file = self.output_dir / 'incremental_plan.json'
            save_json(crawl_plan, plan_file)
            
            # Create script to run the crawl
            script_content = f"""#!/bin/bash
# Incremental crawl script generated at {create_timestamp()}

cd {Path(__file__).parent.parent}

echo "Starting incremental crawl for {self.domain}"
echo "URLs to crawl: {len(urls_to_crawl)}"

# Run the crawl
python 08_fetch/crawl_full.py \\
    --domain {self.domain} \\
    --input {urls_file} \\
    --batch-size 100

# Run parsing
python 09_scrape/parse_dom.py \\
    --domain {self.domain}

# Run deduplication
python 10_dedupe/dedupe.py \\
    --domain {self.domain}

# Run cleaning
python 11_clean/clean.py \\
    --domain {self.domain}

# Load to database
python 12_load/load_db.py \\
    --domain {self.domain}

# Run quality checks
python 13_qc/tests.py \\
    --domain {self.domain}

echo "Incremental crawl complete!"
"""
            
            script_file = self.output_dir / 'run_incremental.sh'
            with open(script_file, 'w') as f:
                f.write(script_content)
            
            # Make executable
            import os
            os.chmod(script_file, 0o755)
            
            self.logger.info(f"Created run script: {script_file}")
            
            # Log summary
            self.logger.info("Incremental crawl plan complete!")
            self.logger.info(f"Total URLs: {len(urls_to_crawl)}")
            for key, value in stats.items():
                if key != 'strategy' and value > 0:
                    self.logger.info(f"  {key}: {value}")
            
            return crawl_plan
            
        finally:
            self.disconnect()


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description='Plan and execute incremental crawls',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Balanced incremental crawl
  python incremental_crawl.py --domain example.com
  
  # Focus on stale content
  python incremental_crawl.py --domain example.com --strategy stale
  
  # Discover new products
  python incremental_crawl.py --domain example.com --strategy discover
  
  # High-priority items only
  python incremental_crawl.py --domain example.com --strategy priority
  
  # Custom parameters
  python incremental_crawl.py --domain example.com --max-urls 500 --stale-days 3

Strategies:
  - balanced: Mix of stale, priority, and new URLs (default)
  - stale: Focus on URLs not crawled recently
  - priority: High-value and frequently changing items
  - discover: Find new URLs not in database
        """
    )
    
    parser.add_argument('--domain', required=True, help='Domain to crawl')
    parser.add_argument('--strategy', choices=['balanced', 'stale', 'priority', 'discover'],
                       default='balanced', help='Crawl strategy')
    parser.add_argument('--max-urls', type=int, default=1000,
                       help='Maximum URLs to crawl')
    parser.add_argument('--stale-days', type=int, default=7,
                       help='Days before considering URL stale')
    parser.add_argument('--execute', action='store_true',
                       help='Execute the crawl immediately')
    
    args = parser.parse_args()
    
    # Run incremental crawler
    crawler = IncrementalCrawler(args.domain)
    plan = crawler.run(
        strategy=args.strategy,
        max_urls=args.max_urls,
        stale_days=args.stale_days
    )
    
    if plan and not plan.get('error'):
        print(f"\nIncremental crawl planned!")
        print(f"Strategy: {plan['strategy']}")
        print(f"Total URLs: {plan['total_urls']}")
        
        stats = plan.get('stats', {})
        print("\nBreakdown:")
        for key, value in stats.items():
            if key != 'strategy' and value > 0:
                print(f"  {key}: {value}")
        
        if args.execute:
            print("\nExecuting crawl...")
            import subprocess
            script_path = Path(__file__).parent / 'run_incremental.sh'
            subprocess.run(['bash', str(script_path)])
        else:
            print(f"\nTo execute, run: ./14_refresh/run_incremental.sh")


if __name__ == '__main__':
    main()