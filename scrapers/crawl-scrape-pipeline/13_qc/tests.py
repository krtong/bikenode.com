#!/usr/bin/env python3
"""
Step 13: Quality Control
Runs quality checks and tests on loaded data.
"""

import argparse
import sys
from pathlib import Path
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timedelta
import pandas as pd
import psycopg2
from psycopg2.extras import RealDictCursor
import statistics

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent / '00_env'))

from config import config
from utils import setup_logging, save_json, create_timestamp


class QualityChecker:
    """Performs quality checks on scraped data."""
    
    def __init__(self, domain: str):
        """Initialize quality checker."""
        self.domain = domain
        self.logger = setup_logging('quality_checker', config.dirs['qc'] / 'qc.log')
        self.report_file = config.dirs['qc'] / 'qc_report.txt'
        self.report_json = config.dirs['qc'] / 'qc_report.json'
        self.conn = None
        self.checks_passed = 0
        self.checks_failed = 0
        self.warnings = []
    
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
    
    def log_check(self, check_name: str, passed: bool, message: str, 
                  details: Optional[Dict] = None):
        """Log check result."""
        status = "PASS" if passed else "FAIL"
        self.logger.info(f"[{status}] {check_name}: {message}")
        
        if passed:
            self.checks_passed += 1
        else:
            self.checks_failed += 1
        
        if details:
            for key, value in details.items():
                self.logger.info(f"  {key}: {value}")
    
    def add_warning(self, warning: str):
        """Add a warning message."""
        self.warnings.append(warning)
        self.logger.warning(warning)
    
    def check_data_freshness(self) -> Tuple[bool, Dict[str, Any]]:
        """Check if data is fresh."""
        try:
            with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
                # Get latest scrape
                cur.execute("""
                    SELECT MAX(last_scraped_at) as latest_scrape,
                           COUNT(*) as total_products
                    FROM scraper.products
                    WHERE source_domain = %s AND is_active = TRUE
                """, (self.domain,))
                
                result = cur.fetchone()
                
                if not result or not result['latest_scrape']:
                    return False, {'error': 'No data found'}
                
                latest_scrape = result['latest_scrape']
                age_hours = (datetime.utcnow() - latest_scrape).total_seconds() / 3600
                
                details = {
                    'latest_scrape': str(latest_scrape),
                    'age_hours': round(age_hours, 1),
                    'total_products': result['total_products'],
                }
                
                # Check if data is stale (>24 hours old)
                if age_hours > 24:
                    self.add_warning(f"Data is {age_hours:.1f} hours old")
                
                return True, details
                
        except Exception as e:
            return False, {'error': str(e)}
    
    def check_data_completeness(self) -> Tuple[bool, Dict[str, Any]]:
        """Check data completeness."""
        try:
            with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
                # Check field coverage
                cur.execute("""
                    SELECT 
                        COUNT(*) as total,
                        COUNT(title) as has_title,
                        COUNT(price) as has_price,
                        COUNT(description) as has_description,
                        COUNT(brand) as has_brand,
                        COUNT(category) as has_category,
                        COUNT(sku) as has_sku
                    FROM scraper.products
                    WHERE source_domain = %s AND is_active = TRUE
                """, (self.domain,))
                
                coverage = cur.fetchone()
                total = coverage['total']
                
                if total == 0:
                    return False, {'error': 'No products found'}
                
                # Calculate percentages
                field_coverage = {
                    'title': round(coverage['has_title'] / total * 100, 1),
                    'price': round(coverage['has_price'] / total * 100, 1),
                    'description': round(coverage['has_description'] / total * 100, 1),
                    'brand': round(coverage['has_brand'] / total * 100, 1),
                    'category': round(coverage['has_category'] / total * 100, 1),
                    'sku': round(coverage['has_sku'] / total * 100, 1),
                }
                
                # Check image coverage
                cur.execute("""
                    SELECT COUNT(DISTINCT p.id) as products_with_images
                    FROM scraper.products p
                    JOIN scraper.product_images pi ON p.id = pi.product_id
                    WHERE p.source_domain = %s AND p.is_active = TRUE
                """, (self.domain,))
                
                img_result = cur.fetchone()
                field_coverage['images'] = round(img_result['products_with_images'] / total * 100, 1)
                
                # Determine if coverage is acceptable
                critical_fields = ['title', 'price']
                acceptable = all(field_coverage[f] >= 90 for f in critical_fields)
                
                # Add warnings for low coverage
                for field, pct in field_coverage.items():
                    if pct < 80:
                        self.add_warning(f"Low coverage for {field}: {pct}%")
                
                return acceptable, {
                    'total_products': total,
                    'field_coverage': field_coverage,
                }
                
        except Exception as e:
            return False, {'error': str(e)}
    
    def check_data_quality(self) -> Tuple[bool, Dict[str, Any]]:
        """Check data quality metrics."""
        try:
            with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
                # Check for suspicious prices
                cur.execute("""
                    SELECT 
                        MIN(price) as min_price,
                        MAX(price) as max_price,
                        AVG(price) as avg_price,
                        STDDEV(price) as stddev_price,
                        COUNT(*) as price_count
                    FROM scraper.products
                    WHERE source_domain = %s AND is_active = TRUE AND price IS NOT NULL
                """, (self.domain,))
                
                price_stats = cur.fetchone()
                
                quality_issues = []
                
                # Check for zero or negative prices
                cur.execute("""
                    SELECT COUNT(*) as bad_price_count
                    FROM scraper.products
                    WHERE source_domain = %s AND is_active = TRUE AND price <= 0
                """, (self.domain,))
                
                bad_prices = cur.fetchone()['bad_price_count']
                if bad_prices > 0:
                    quality_issues.append(f"{bad_prices} products with zero/negative prices")
                
                # Check for duplicate titles
                cur.execute("""
                    SELECT title, COUNT(*) as count
                    FROM scraper.products
                    WHERE source_domain = %s AND is_active = TRUE
                    GROUP BY title
                    HAVING COUNT(*) > 1
                    ORDER BY count DESC
                    LIMIT 10
                """, (self.domain,))
                
                duplicates = cur.fetchall()
                if duplicates:
                    quality_issues.append(f"{len(duplicates)} duplicate titles found")
                
                # Check for very short titles
                cur.execute("""
                    SELECT COUNT(*) as short_title_count
                    FROM scraper.products
                    WHERE source_domain = %s AND is_active = TRUE 
                    AND LENGTH(title) < 10
                """, (self.domain,))
                
                short_titles = cur.fetchone()['short_title_count']
                if short_titles > 0:
                    quality_issues.append(f"{short_titles} products with very short titles")
                
                # Check for missing images
                cur.execute("""
                    SELECT COUNT(*) as no_image_count
                    FROM scraper.products p
                    LEFT JOIN scraper.product_images pi ON p.id = pi.product_id
                    WHERE p.source_domain = %s AND p.is_active = TRUE
                    AND pi.id IS NULL
                """, (self.domain,))
                
                no_images = cur.fetchone()['no_image_count']
                if no_images > 0:
                    self.add_warning(f"{no_images} products without images")
                
                return len(quality_issues) == 0, {
                    'price_stats': {
                        'min': float(price_stats['min_price']) if price_stats['min_price'] else None,
                        'max': float(price_stats['max_price']) if price_stats['max_price'] else None,
                        'avg': float(price_stats['avg_price']) if price_stats['avg_price'] else None,
                        'stddev': float(price_stats['stddev_price']) if price_stats['stddev_price'] else None,
                    },
                    'quality_issues': quality_issues,
                    'duplicate_count': len(duplicates),
                }
                
        except Exception as e:
            return False, {'error': str(e)}
    
    def check_scrape_consistency(self) -> Tuple[bool, Dict[str, Any]]:
        """Check scraping consistency over time."""
        try:
            with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
                # Get recent scrape history
                cur.execute("""
                    SELECT 
                        scrape_type,
                        start_time,
                        end_time,
                        urls_scraped,
                        items_loaded,
                        status
                    FROM scraper.scrape_history
                    WHERE domain = %s
                    ORDER BY start_time DESC
                    LIMIT 10
                """, (self.domain,))
                
                history = cur.fetchall()
                
                if len(history) < 2:
                    return True, {'message': 'Not enough history for consistency check'}
                
                # Analyze success rates
                successful = sum(1 for h in history if h['status'] == 'completed')
                success_rate = successful / len(history) * 100
                
                # Check for declining performance
                recent_loads = [h['items_loaded'] for h in history[:5] if h['items_loaded']]
                if len(recent_loads) >= 3:
                    avg_recent = statistics.mean(recent_loads[:3])
                    avg_older = statistics.mean(recent_loads[2:])
                    
                    if avg_recent < avg_older * 0.8:  # 20% decline
                        self.add_warning(f"Declining scrape performance: {avg_recent:.0f} vs {avg_older:.0f} items")
                
                return success_rate >= 80, {
                    'scrape_count': len(history),
                    'success_rate': round(success_rate, 1),
                    'recent_scrapes': [
                        {
                            'date': str(h['start_time']),
                            'type': h['scrape_type'],
                            'items': h['items_loaded'],
                            'status': h['status'],
                        }
                        for h in history[:5]
                    ],
                }
                
        except Exception as e:
            return False, {'error': str(e)}
    
    def check_price_stability(self) -> Tuple[bool, Dict[str, Any]]:
        """Check for unusual price changes."""
        try:
            with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
                # Find products with large price changes
                cur.execute("""
                    WITH price_changes AS (
                        SELECT 
                            ph1.product_id,
                            ph1.price as current_price,
                            ph2.price as previous_price,
                            ABS(ph1.price - ph2.price) / ph2.price * 100 as change_pct
                        FROM scraper.price_history ph1
                        JOIN scraper.price_history ph2 ON ph1.product_id = ph2.product_id
                        WHERE ph1.recorded_at > ph2.recorded_at
                        AND ph1.product_id IN (
                            SELECT id FROM scraper.products 
                            WHERE source_domain = %s AND is_active = TRUE
                        )
                        AND ph1.recorded_at > NOW() - INTERVAL '7 days'
                    )
                    SELECT 
                        COUNT(*) as total_changes,
                        COUNT(CASE WHEN change_pct > 50 THEN 1 END) as large_changes,
                        MAX(change_pct) as max_change_pct
                    FROM price_changes
                """, (self.domain,))
                
                result = cur.fetchone()
                
                suspicious_changes = result['large_changes'] if result['large_changes'] else 0
                
                if suspicious_changes > 0:
                    self.add_warning(f"{suspicious_changes} products with >50% price change")
                
                return suspicious_changes == 0, {
                    'total_price_changes': result['total_changes'] or 0,
                    'large_changes': suspicious_changes,
                    'max_change_pct': round(result['max_change_pct'], 1) if result['max_change_pct'] else 0,
                }
                
        except Exception as e:
            return False, {'error': str(e)}
    
    def generate_report(self, results: Dict[str, Any]) -> str:
        """Generate quality control report."""
        report = []
        report.append("=" * 60)
        report.append(f"QUALITY CONTROL REPORT - {self.domain}")
        report.append(f"Generated: {create_timestamp()}")
        report.append("=" * 60)
        report.append("")
        
        # Summary
        report.append("SUMMARY")
        report.append("-" * 20)
        report.append(f"Checks Passed: {self.checks_passed}")
        report.append(f"Checks Failed: {self.checks_failed}")
        report.append(f"Warnings: {len(self.warnings)}")
        report.append("")
        
        # Check results
        report.append("CHECK RESULTS")
        report.append("-" * 20)
        
        for check_name, check_result in results.items():
            passed = check_result.get('passed', False)
            status = "PASS" if passed else "FAIL"
            report.append(f"\n[{status}] {check_name.replace('_', ' ').title()}")
            
            details = check_result.get('details', {})
            for key, value in details.items():
                if key != 'error':
                    if isinstance(value, dict):
                        report.append(f"  {key}:")
                        for k, v in value.items():
                            report.append(f"    {k}: {v}")
                    elif isinstance(value, list):
                        report.append(f"  {key}:")
                        for item in value[:5]:  # Limit to 5 items
                            report.append(f"    - {item}")
                    else:
                        report.append(f"  {key}: {value}")
        
        # Warnings
        if self.warnings:
            report.append("\nWARNINGS")
            report.append("-" * 20)
            for warning in self.warnings:
                report.append(f"- {warning}")
        
        # Recommendations
        report.append("\nRECOMMENDATIONS")
        report.append("-" * 20)
        
        if self.checks_failed > 0:
            report.append("- Review and fix failing checks before production use")
        
        if len(self.warnings) > 3:
            report.append("- Address warnings to improve data quality")
        
        if 'data_freshness' in results and results['data_freshness']['details'].get('age_hours', 0) > 24:
            report.append("- Schedule more frequent scraping to keep data fresh")
        
        report.append("")
        report.append("=" * 60)
        
        return "\n".join(report)
    
    def run(self) -> Dict[str, Any]:
        """Run all quality checks."""
        self.logger.info(f"Starting quality control checks for domain: {self.domain}")
        
        # Connect to database
        if not self.connect():
            return {'error': 'Failed to connect to database'}
        
        try:
            results = {}
            
            # Run checks
            checks = [
                ('data_freshness', self.check_data_freshness),
                ('data_completeness', self.check_data_completeness),
                ('data_quality', self.check_data_quality),
                ('scrape_consistency', self.check_scrape_consistency),
                ('price_stability', self.check_price_stability),
            ]
            
            for check_name, check_func in checks:
                self.logger.info(f"Running check: {check_name}")
                passed, details = check_func()
                
                self.log_check(
                    check_name,
                    passed,
                    "Check completed" if passed else "Check failed",
                    details
                )
                
                results[check_name] = {
                    'passed': passed,
                    'details': details,
                }
            
            # Generate report
            report_text = self.generate_report(results)
            
            # Save report
            with open(self.report_file, 'w') as f:
                f.write(report_text)
            
            # Save JSON report
            json_report = {
                'domain': self.domain,
                'timestamp': create_timestamp(),
                'checks_passed': self.checks_passed,
                'checks_failed': self.checks_failed,
                'warnings': self.warnings,
                'results': results,
            }
            save_json(json_report, self.report_json)
            
            # Print report
            print(report_text)
            
            return json_report
            
        finally:
            self.disconnect()


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description='Run quality control checks on scraped data',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Run all quality checks
  python tests.py --domain example.com
  
  # Run specific check only
  python tests.py --domain example.com --check data_completeness
  
  # Output JSON report only
  python tests.py --domain example.com --json-only
        """
    )
    
    parser.add_argument('--domain', required=True, help='Domain to check')
    parser.add_argument('--check', help='Run specific check only')
    parser.add_argument('--json-only', action='store_true',
                       help='Output JSON report only')
    
    args = parser.parse_args()
    
    # Run quality checks
    checker = QualityChecker(args.domain)
    results = checker.run()
    
    if args.json_only:
        import json
        print(json.dumps(results, indent=2))
    
    # Exit with error code if checks failed
    if checker.checks_failed > 0:
        sys.exit(1)


if __name__ == '__main__':
    main()