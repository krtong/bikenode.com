#!/usr/bin/env python3
"""
Step 10: Deduplication
Removes duplicate records based on configurable criteria.
"""

import argparse
import sys
from pathlib import Path
from typing import Dict, List, Optional, Any, Set, Tuple
import hashlib

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent / 'orchestration'))

from config import config
from utils_minimal import (
    setup_logging, load_ndjson, save_json, append_ndjson,
    create_hash, create_timestamp
)


class Deduplicator:
    """Handles deduplication of scraped data."""
    
    def __init__(self, domain: str):
        """Initialize deduplicator."""
        self.domain = domain
        self.logger = setup_logging('deduplicator', Path(__file__).parent / 'dedupe.log')
        self.output_file = Path(__file__).parent / 'deduped.ndjson'
        self.duplicates_file = Path(__file__).parent / 'duplicates.ndjson'
    
    def generate_item_key(self, item: Dict[str, Any], strategy: str = 'auto') -> Optional[str]:
        """Generate a unique key for an item based on deduplication strategy."""
        data = item.get('data', {}) or item.get('extracted_data', {})
        
        if strategy == 'url':
            # Dedupe by URL only
            return item.get('url', '')
        
        elif strategy == 'content':
            # Dedupe by actual content
            return create_hash(data)
        
        elif strategy == 'id':
            # Dedupe by product ID/SKU
            product_id = data.get('id') or data.get('sku') or data.get('product_id')
            if product_id:
                return f"id_{product_id}"
            return None
        
        elif strategy == 'auto':
            # Try multiple strategies in order
            # 1. Try product ID
            product_id = data.get('id') or data.get('sku') or data.get('product_id')
            if product_id:
                return f"id_{product_id}"
            
            # 2. Try title + price combination
            title = data.get('title') or data.get('name')
            price = data.get('price')
            if title and price:
                return create_hash(f"{title}_{price}")
            
            # 3. Fall back to URL
            url = item.get('url')
            if url:
                return url
            
            # 4. Last resort: hash entire data
            return create_hash(data)
        
        return None
    
    def compare_items(self, item1: Dict[str, Any], item2: Dict[str, Any]) -> Dict[str, Any]:
        """Compare two items and determine which to keep."""
        comparison = {
            'identical': False,
            'keep_first': True,
            'reason': '',
        }
        
        data1 = item1.get('data', {}) or item1.get('extracted_data', {})
        data2 = item2.get('data', {}) or item2.get('extracted_data', {})
        
        # Check if completely identical
        if data1 == data2:
            comparison['identical'] = True
            comparison['reason'] = 'Identical content'
            return comparison
        
        # Prefer item with more complete data
        fields1 = sum(1 for v in data1.values() if v)
        fields2 = sum(1 for v in data2.values() if v)
        
        if fields2 > fields1:
            comparison['keep_first'] = False
            comparison['reason'] = f'Second item has more fields ({fields2} vs {fields1})'
        elif fields1 > fields2:
            comparison['reason'] = f'First item has more fields ({fields1} vs {fields2})'
        else:
            # Same number of fields, prefer newer
            time1 = item1.get('timestamp_parsed', item1.get('timestamp', ''))
            time2 = item2.get('timestamp_parsed', item2.get('timestamp', ''))
            
            if time2 > time1:
                comparison['keep_first'] = False
                comparison['reason'] = 'Second item is newer'
            else:
                comparison['reason'] = 'First item is newer or same time'
        
        return comparison
    
    def deduplicate_items(self, items: List[Dict[str, Any]], 
                         strategy: str = 'auto') -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """Deduplicate a list of items."""
        seen = {}
        unique_items = []
        duplicate_items = []
        
        for item in items:
            key = self.generate_item_key(item, strategy)
            
            if not key:
                # Can't generate key, keep item
                unique_items.append(item)
                continue
            
            if key in seen:
                # Duplicate found
                existing_item = seen[key]
                comparison = self.compare_items(existing_item, item)
                
                duplicate_record = {
                    'key': key,
                    'kept_item': existing_item if comparison['keep_first'] else item,
                    'duplicate_item': item if comparison['keep_first'] else existing_item,
                    'comparison': comparison,
                }
                duplicate_items.append(duplicate_record)
                
                # Update kept item if needed
                if not comparison['keep_first']:
                    # Replace with better item
                    idx = unique_items.index(existing_item)
                    unique_items[idx] = item
                    seen[key] = item
            else:
                # New unique item
                seen[key] = item
                unique_items.append(item)
        
        return unique_items, duplicate_items
    
    def analyze_duplicates(self, duplicate_records: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze duplicate patterns."""
        analysis = {
            'total_duplicates': len(duplicate_records),
            'duplicate_reasons': {},
            'duplicate_patterns': {},
        }
        
        # Count reasons
        for record in duplicate_records:
            reason = record['comparison']['reason']
            analysis['duplicate_reasons'][reason] = analysis['duplicate_reasons'].get(reason, 0) + 1
        
        # Analyze patterns (e.g., same product from different URLs)
        url_groups = {}
        for record in duplicate_records:
            kept_url = record['kept_item'].get('url', '')
            dup_url = record['duplicate_item'].get('url', '')
            
            # Extract paths
            from urllib.parse import urlparse
            kept_path = urlparse(kept_url).path
            dup_path = urlparse(dup_url).path
            
            if kept_path != dup_path:
                pattern = 'different_urls_same_content'
                analysis['duplicate_patterns'][pattern] = analysis['duplicate_patterns'].get(pattern, 0) + 1
        
        return analysis
    
    def run(self, input_file: Optional[Path] = None, 
            strategy: str = 'auto',
            batch_size: int = 10000) -> Dict[str, Any]:
        """Run deduplication process."""
        self.logger.info(f"Starting deduplication for domain: {self.domain}")
        self.logger.info(f"Strategy: {strategy}")
        
        # Default input file per spec: 09_scrape/parsed.ndjson
        if input_file is None:
            input_file = Path(__file__).parent.parent / '09_scrape' / 'parsed.ndjson'
            
        if not input_file.exists():
            self.logger.error(f"Input file not found: {input_file}")
            return {}
            
        items = load_ndjson(input_file)
        self.logger.info(f"Loaded {len(items)} items from {input_file}")
        
        if not items:
            self.logger.error("No items to deduplicate")
            return {}
        
        # Process in batches to handle large datasets
        all_unique = []
        all_duplicates = []
        
        for i in range(0, len(items), batch_size):
            batch = items[i:i + batch_size]
            self.logger.info(f"Processing batch {i//batch_size + 1} ({len(batch)} items)")
            
            unique, duplicates = self.deduplicate_items(batch, strategy)
            all_unique.extend(unique)
            all_duplicates.extend(duplicates)
        
        # Deduplicate across batches
        self.logger.info("Final deduplication across batches...")
        final_unique, final_duplicates = self.deduplicate_items(all_unique, strategy)
        all_duplicates.extend(final_duplicates)
        
        # Save results
        self.logger.info(f"Saving {len(final_unique)} unique items")
        for item in final_unique:
            append_ndjson(item, self.output_file)
        
        if all_duplicates:
            self.logger.info(f"Saving {len(all_duplicates)} duplicate records")
            for dup in all_duplicates:
                append_ndjson(dup, self.duplicates_file)
        
        # Analyze results
        analysis = self.analyze_duplicates(all_duplicates)
        
        # Create statistics
        stats = {
            'timestamp': create_timestamp(),
            'strategy': strategy,
            'input_items': len(items),
            'unique_items': len(final_unique),
            'duplicate_items': len(all_duplicates),
            'deduplication_rate': len(all_duplicates) / len(items) if items else 0,
            'analysis': analysis,
        }
        
        # Save statistics
        stats_file = Path(__file__).parent / 'dedupe_stats.json'
        save_json(stats, stats_file)
        
        # Log summary
        self.logger.info("Deduplication complete!")
        self.logger.info(f"Input items: {len(items)}")
        self.logger.info(f"Unique items: {len(final_unique)}")
        self.logger.info(f"Duplicates removed: {len(all_duplicates)}")
        self.logger.info(f"Deduplication rate: {stats['deduplication_rate']:.1%}")
        
        return stats


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description='Deduplicate scraped data',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Deduplicate with automatic strategy
  python dedupe.py --domain example.com
  
  # Use specific deduplication strategy
  python dedupe.py --domain example.com --strategy content
  
  # Deduplicate custom input file
  python dedupe.py --domain example.com --input custom_data.ndjson
  
Strategies:
  - auto: Tries multiple strategies (ID, title+price, URL, content hash)
  - url: Deduplicate by URL only
  - content: Deduplicate by content hash
  - id: Deduplicate by product ID/SKU
        """
    )
    
    parser.add_argument('--domain', required=True, help='Domain being processed')
    parser.add_argument('--input', help='Input NDJSON file (default: parsed.ndjson)')
    parser.add_argument('--strategy', choices=['auto', 'url', 'content', 'id'],
                       default='auto', help='Deduplication strategy')
    parser.add_argument('--batch-size', type=int, default=10000,
                       help='Batch size for processing')
    
    args = parser.parse_args()
    
    # Run deduplication
    deduplicator = Deduplicator(args.domain)
    
    input_file = Path(args.input) if args.input else None
    stats = deduplicator.run(
        input_file=input_file,
        strategy=args.strategy,
        batch_size=args.batch_size
    )
    
    if stats:
        print(f"\nDeduplication complete!")
        print(f"Strategy: {stats['strategy']}")
        print(f"Input items: {stats['input_items']}")
        print(f"Unique items: {stats['unique_items']}")
        print(f"Duplicates removed: {stats['duplicate_items']}")
        print(f"Deduplication rate: {stats['deduplication_rate']:.1%}")
        
        if stats['analysis']['duplicate_reasons']:
            print("\nDuplicate reasons:")
            for reason, count in stats['analysis']['duplicate_reasons'].items():
                print(f"  {reason}: {count}")


if __name__ == '__main__':
    main()