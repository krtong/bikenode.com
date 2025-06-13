#!/usr/bin/env python3
"""
Step 14: URL Remapping
Handles URL changes, redirects, and maintains URL mapping history.
"""

import argparse
import sys
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Set
from urllib.parse import urlparse
import requests
import psycopg2
from psycopg2.extras import RealDictCursor

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent / 'orchestration'))

from config import config
from utils_minimal import setup_logging, save_json, load_json, create_timestamp


class URLRemapper:
    """Handles URL remapping and redirect resolution."""
    
    def __init__(self, domain: str):
        """Initialize URL remapper."""
        self.domain = domain
        self.logger = setup_logging('url_remapper', Path(__file__).parent / 'remap.log')
        self.output_file = Path(__file__).parent / 'url_mappings.json'
        self.conn = None
        self.session = requests.Session()
        self.session.headers.update({'User-Agent': config.user_agent})
    
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
    
    def check_url_status(self, url: str, timeout: int = 10) -> Dict[str, Any]:
        """Check URL status and follow redirects."""
        result = {
            'original_url': url,
            'final_url': url,
            'status_code': None,
            'redirect_chain': [],
            'error': None,
        }
        
        try:
            # Make request with redirect handling
            response = self.session.get(url, allow_redirects=True, timeout=timeout)
            
            result['status_code'] = response.status_code
            result['final_url'] = response.url
            
            # Build redirect chain
            if response.history:
                for r in response.history:
                    result['redirect_chain'].append({
                        'url': r.url,
                        'status': r.status_code,
                    })
            
            # Check if URL has changed
            result['url_changed'] = url != response.url
            
        except requests.exceptions.RequestException as e:
            result['error'] = str(e)
            self.logger.debug(f"Error checking {url}: {e}")
        
        return result
    
    def get_active_urls(self) -> List[str]:
        """Get all active URLs from database."""
        try:
            with self.conn.cursor() as cur:
                cur.execute("""
                    SELECT DISTINCT source_url
                    FROM scraper.products
                    WHERE source_domain = %s AND is_active = TRUE
                    ORDER BY source_url
                """, (self.domain,))
                
                return [r[0] for r in cur.fetchall()]
                
        except Exception as e:
            self.logger.error(f"Error getting active URLs: {e}")
            return []
    
    def find_404_urls(self) -> List[str]:
        """Find URLs returning 404 errors."""
        not_found_urls = []
        
        try:
            # Get recent 404s from previous dump.csv
            previous_dump = Path(__file__).parent.parent / '01_map' / 'dump.csv'
            if previous_dump.exists():
                import csv
                with open(previous_dump, 'r', newline='', encoding='utf-8') as f:
                    reader = csv.DictReader(f)
                    for row in reader:
                        if row.get('status_code') == '404':
                            not_found_urls.append(row['url'])
            
            return not_found_urls
            
        except Exception as e:
            self.logger.error(f"Error finding 404 URLs: {e}")
            return []
    
    def detect_url_patterns_change(self) -> Dict[str, str]:
        """Detect systematic URL pattern changes."""
        pattern_changes = {}
        
        try:
            # Load original URL patterns
            patterns_file = Path(__file__).parent.parent / '03_group' / 'grouping_summary.json'
            if not patterns_file.exists():
                return {}
            
            summary = load_json(patterns_file)
            patterns = summary.get('patterns', {})
            
            # Check sample URLs from each pattern
            for pattern, info in patterns.items():
                examples = info.get('examples', [])[:3]
                
                redirects = []
                for url in examples:
                    result = self.check_url_status(url)
                    if result['url_changed'] and not result.get('error'):
                        redirects.append({
                            'from': url,
                            'to': result['final_url'],
                        })
                
                # Analyze redirect patterns
                if len(redirects) >= 2:
                    # Try to find common pattern change
                    old_pattern = self.extract_pattern(redirects[0]['from'])
                    new_pattern = self.extract_pattern(redirects[0]['to'])
                    
                    if old_pattern != new_pattern:
                        pattern_changes[old_pattern] = new_pattern
                        self.logger.info(f"Detected pattern change: {old_pattern} -> {new_pattern}")
            
        except Exception as e:
            self.logger.error(f"Error detecting pattern changes: {e}")
        
        return pattern_changes
    
    def extract_pattern(self, url: str) -> str:
        """Extract URL pattern for comparison."""
        parsed = urlparse(url)
        path = parsed.path
        
        # Simplify to pattern
        import re
        path = re.sub(r'/[0-9]+/', '/{id}/', path)
        path = re.sub(r'/[a-f0-9]{8,}/', '/{hash}/', path)
        path = re.sub(r'/[a-z0-9-]+$', '/{slug}', path)
        
        return path
    
    def update_database_urls(self, mappings: Dict[str, str]) -> Dict[str, int]:
        """Update URLs in database based on mappings."""
        stats = {
            'updated': 0,
            'failed': 0,
        }
        
        try:
            with self.conn.cursor() as cur:
                for old_url, new_url in mappings.items():
                    try:
                        # Check if new URL already exists
                        cur.execute("""
                            SELECT id FROM scraper.products
                            WHERE source_url = %s
                        """, (new_url,))
                        
                        if cur.fetchone():
                            # Mark old as inactive instead of updating
                            cur.execute("""
                                UPDATE scraper.products
                                SET is_active = FALSE,
                                    metadata = jsonb_set(
                                        COALESCE(metadata, '{}'),
                                        '{redirected_to}',
                                        %s
                                    )
                                WHERE source_url = %s
                            """, (f'"{new_url}"', old_url))
                        else:
                            # Update URL
                            cur.execute("""
                                UPDATE scraper.products
                                SET source_url = %s,
                                    metadata = jsonb_set(
                                        COALESCE(metadata, '{}'),
                                        '{previous_url}',
                                        %s
                                    )
                                WHERE source_url = %s
                            """, (new_url, f'"{old_url}"', old_url))
                        
                        self.conn.commit()
                        stats['updated'] += 1
                        
                    except Exception as e:
                        self.logger.error(f"Failed to update {old_url}: {e}")
                        self.conn.rollback()
                        stats['failed'] += 1
            
        except Exception as e:
            self.logger.error(f"Error updating database: {e}")
        
        return stats
    
    def run(self, check_redirects: bool = True,
            check_404s: bool = True,
            auto_update: bool = False) -> Dict[str, Any]:
        """Run URL remapping process."""
        self.logger.info(f"Starting URL remapping for domain: {self.domain}")
        
        # Connect to database
        if not self.connect():
            return {}
        
        try:
            mappings = {}
            report = {
                'timestamp': create_timestamp(),
                'domain': self.domain,
                'checks_performed': [],
                'url_changes': [],
                '404_urls': [],
                'pattern_changes': {},
                'stats': {},
            }
            
            # Check for redirects
            if check_redirects:
                self.logger.info("Checking for URL redirects...")
                report['checks_performed'].append('redirects')
                
                active_urls = self.get_active_urls()
                sample_size = min(100, len(active_urls))
                
                self.logger.info(f"Checking {sample_size} sample URLs")
                
                for url in active_urls[:sample_size]:
                    result = self.check_url_status(url)
                    
                    if result['url_changed'] and not result.get('error'):
                        mappings[url] = result['final_url']
                        report['url_changes'].append({
                            'from': url,
                            'to': result['final_url'],
                            'status': result['status_code'],
                        })
            
            # Check for 404s
            if check_404s:
                self.logger.info("Checking for 404 URLs...")
                report['checks_performed'].append('404s')
                
                not_found = self.find_404_urls()
                report['404_urls'] = not_found
                
                # Mark 404s as inactive
                if not_found and auto_update:
                    with self.conn.cursor() as cur:
                        for url in not_found:
                            cur.execute("""
                                UPDATE scraper.products
                                SET is_active = FALSE,
                                    metadata = jsonb_set(
                                        COALESCE(metadata, '{}'),
                                        '{deactivated_reason}',
                                        '"404_not_found"'
                                    )
                                WHERE source_url = %s
                            """, (url,))
                        self.conn.commit()
            
            # Detect pattern changes
            self.logger.info("Detecting URL pattern changes...")
            pattern_changes = self.detect_url_patterns_change()
            report['pattern_changes'] = pattern_changes
            
            # Update database if requested
            if auto_update and mappings:
                self.logger.info(f"Updating {len(mappings)} URLs in database...")
                update_stats = self.update_database_urls(mappings)
                report['stats']['database_updates'] = update_stats
            
            # Save mappings
            if mappings:
                all_mappings = {
                    'timestamp': create_timestamp(),
                    'domain': self.domain,
                    'mappings': mappings,
                    'pattern_changes': pattern_changes,
                }
                save_json(all_mappings, self.output_file)
                self.logger.info(f"Saved {len(mappings)} URL mappings")
            
            # Generate summary stats
            report['stats'].update({
                'total_checked': len(report.get('url_changes', [])) + len(report.get('404_urls', [])),
                'redirects_found': len(report.get('url_changes', [])),
                '404s_found': len(report.get('404_urls', [])),
                'pattern_changes': len(pattern_changes),
            })
            
            # Save report
            report_file = Path(__file__).parent / 'remap_report.json'
            save_json(report, report_file)
            
            # Log summary
            self.logger.info("URL remapping complete!")
            for key, value in report['stats'].items():
                self.logger.info(f"  {key}: {value}")
            
            return report
            
        finally:
            self.disconnect()


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description='Check and remap changed URLs',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Check for URL changes
  python remap.py --domain example.com
  
  # Check and auto-update database
  python remap.py --domain example.com --auto-update
  
  # Only check for 404s
  python remap.py --domain example.com --no-redirects
  
  # Full check without updating
  python remap.py --domain example.com --check-all
        """
    )
    
    parser.add_argument('--domain', required=True, help='Domain to check')
    parser.add_argument('--auto-update', action='store_true',
                       help='Automatically update database with changes')
    parser.add_argument('--no-redirects', action='store_true',
                       help='Skip redirect checking')
    parser.add_argument('--no-404s', action='store_true',
                       help='Skip 404 checking')
    parser.add_argument('--check-all', action='store_true',
                       help='Check all URLs (not just samples)')
    
    args = parser.parse_args()
    
    # Run remapper
    remapper = URLRemapper(args.domain)
    report = remapper.run(
        check_redirects=not args.no_redirects,
        check_404s=not args.no_404s,
        auto_update=args.auto_update
    )
    
    if report:
        print(f"\nURL remapping complete!")
        print(f"Domain: {report['domain']}")
        
        stats = report.get('stats', {})
        print("\nResults:")
        for key, value in stats.items():
            print(f"  {key}: {value}")
        
        if report.get('url_changes'):
            print("\nSample URL changes:")
            for change in report['url_changes'][:5]:
                print(f"  {change['from']} -> {change['to']}")
        
        if report.get('pattern_changes'):
            print("\nPattern changes detected:")
            for old, new in report['pattern_changes'].items():
                print(f"  {old} -> {new}")


if __name__ == '__main__':
    main()