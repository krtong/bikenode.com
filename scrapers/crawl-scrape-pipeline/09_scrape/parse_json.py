#!/usr/bin/env python3
"""
Step 09: JSON Parsing
Extracts structured data from API responses and JSON files.
"""

import argparse
import sys
import json
from pathlib import Path
from typing import Dict, List, Optional, Any, Union

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent / '00_env'))

from config import config
from utils import (
    setup_logging, load_json, load_yaml, save_json, append_ndjson,
    ensure_dir, create_timestamp, extract_price
)


class JSONParser:
    """Parses JSON/API responses to extract structured data."""
    
    def __init__(self, domain: str):
        """Initialize JSON parser."""
        self.domain = domain
        self.logger = setup_logging('json_parser', Path(__file__).parent / 'scrape_json.log')
        self.output_file = Path(__file__).parent / 'parsed_json.ndjson'
        self.mappings = self.load_mappings()
    
    def load_mappings(self) -> Dict[str, Dict[str, Any]]:
        """Load field mappings for JSON extraction."""
        mappings_file = Path(__file__).parent.parent / '06_plan' / 'api_endpoints.yaml'
        if mappings_file.exists():
            api_config = load_yaml(mappings_file)
            
            # Extract field mappings from API config
            mappings = {}
            for pattern, config in api_config.items():
                if 'field_mapping' in config:
                    mappings[pattern] = config['field_mapping']
            
            return mappings
        
        # Default mappings for common API structures
        return {
            'default': {
                'id': ['id', 'product_id', 'sku', 'item_id'],
                'title': ['title', 'name', 'product_name', 'item_name'],
                'price': ['price', 'cost', 'amount', 'pricing.current'],
                'description': ['description', 'details', 'overview', 'summary'],
                'images': ['images', 'photos', 'media', 'gallery'],
                'brand': ['brand', 'manufacturer', 'vendor'],
                'category': ['category', 'categories', 'product_type'],
                'availability': ['availability', 'in_stock', 'stock_status'],
                'rating': ['rating', 'average_rating', 'stars'],
                'reviews_count': ['reviews_count', 'review_count', 'total_reviews'],
            }
        }
    
    def extract_nested_value(self, data: Dict[str, Any], path: str) -> Any:
        """Extract value from nested dictionary using dot notation."""
        parts = path.split('.')
        current = data
        
        for part in parts:
            if isinstance(current, dict):
                # Handle array notation like items[0]
                if '[' in part and ']' in part:
                    key = part[:part.index('[')]
                    index = int(part[part.index('[')+1:part.index(']')])
                    
                    if key in current and isinstance(current[key], list):
                        if len(current[key]) > index:
                            current = current[key][index]
                        else:
                            return None
                    else:
                        return None
                else:
                    current = current.get(part)
            elif isinstance(current, list) and part.isdigit():
                index = int(part)
                if len(current) > index:
                    current = current[index]
                else:
                    return None
            else:
                return None
        
        return current
    
    def apply_mapping(self, data: Dict[str, Any], mapping: Dict[str, Any]) -> Dict[str, Any]:
        """Apply field mapping to extract data."""
        extracted = {}
        
        for target_field, source_paths in mapping.items():
            if not isinstance(source_paths, list):
                source_paths = [source_paths]
            
            for path in source_paths:
                value = self.extract_nested_value(data, path)
                
                if value is not None:
                    # Special processing for certain fields
                    if target_field == 'price':
                        if isinstance(value, str):
                            value = extract_price(value)
                        elif isinstance(value, dict):
                            # Handle price objects like {amount: 99.99, currency: "USD"}
                            value = value.get('amount', value.get('value'))
                    
                    elif target_field == 'images':
                        if isinstance(value, str):
                            value = [value]
                        elif isinstance(value, list):
                            # Extract URLs from image objects if needed
                            images = []
                            for img in value:
                                if isinstance(img, str):
                                    images.append(img)
                                elif isinstance(img, dict):
                                    url = img.get('url', img.get('src', img.get('href')))
                                    if url:
                                        images.append(url)
                            value = images
                    
                    extracted[target_field] = value
                    break
        
        return extracted
    
    def parse_json_file(self, json_path: Path, pattern: Optional[str] = None) -> List[Dict[str, Any]]:
        """Parse a JSON file and extract data."""
        results = []
        
        try:
            # Load JSON data
            with open(json_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # Determine mapping to use
            if pattern and pattern in self.mappings:
                mapping = self.mappings[pattern]
            else:
                mapping = self.mappings.get('default', {})
            
            # Handle different JSON structures
            if isinstance(data, list):
                # Array of items
                for item in data:
                    if isinstance(item, dict):
                        extracted = self.apply_mapping(item, mapping)
                        if extracted:
                            result = {
                                'source_file': str(json_path),
                                'timestamp_parsed': create_timestamp(),
                                'data': extracted,
                                'raw_data': item,  # Keep raw data for reference
                            }
                            results.append(result)
            
            elif isinstance(data, dict):
                # Single item or nested structure
                # Check for common patterns
                if 'data' in data:
                    # Wrapped response
                    if isinstance(data['data'], list):
                        for item in data['data']:
                            extracted = self.apply_mapping(item, mapping)
                            if extracted:
                                result = {
                                    'source_file': str(json_path),
                                    'timestamp_parsed': create_timestamp(),
                                    'data': extracted,
                                }
                                results.append(result)
                    else:
                        extracted = self.apply_mapping(data['data'], mapping)
                        if extracted:
                            results.append({
                                'source_file': str(json_path),
                                'timestamp_parsed': create_timestamp(),
                                'data': extracted,
                            })
                
                elif 'items' in data or 'products' in data or 'results' in data:
                    # Common array field names
                    for key in ['items', 'products', 'results']:
                        if key in data and isinstance(data[key], list):
                            for item in data[key]:
                                extracted = self.apply_mapping(item, mapping)
                                if extracted:
                                    results.append({
                                        'source_file': str(json_path),
                                        'timestamp_parsed': create_timestamp(),
                                        'data': extracted,
                                    })
                            break
                
                else:
                    # Try to extract from root object
                    extracted = self.apply_mapping(data, mapping)
                    if extracted:
                        results.append({
                            'source_file': str(json_path),
                            'timestamp_parsed': create_timestamp(),
                            'data': extracted,
                        })
            
        except Exception as e:
            self.logger.error(f"Error parsing {json_path}: {e}")
        
        return results
    
    def run(self, input_dir: Optional[Path] = None) -> Dict[str, Any]:
        """Run JSON parsing on API response files."""
        self.logger.info(f"Starting JSON parsing for domain: {self.domain}")
        
        # Default to fetch JSON directory
        if input_dir is None:
            input_dir = Path(__file__).parent.parent / '08_fetch' / 'json'
        
        if not input_dir.exists():
            self.logger.error(f"Input directory not found: {input_dir}")
            return {}
        
        # Find all JSON files
        json_files = list(input_dir.rglob('*.json'))
        if not json_files:
            self.logger.error("No JSON files found")
            return {}
        
        self.logger.info(f"Found {len(json_files)} JSON files to process")
        
        # Process files
        all_results = []
        stats = {
            'total_files': len(json_files),
            'successful_files': 0,
            'failed_files': 0,
            'total_items': 0,
            'start_time': create_timestamp(),
        }
        
        for json_file in json_files:
            # Try to determine pattern from file path or name
            pattern = None
            for pat in self.mappings:
                if pat in str(json_file):
                    pattern = pat
                    break
            
            results = self.parse_json_file(json_file, pattern)
            
            if results:
                # Save results
                for result in results:
                    append_ndjson(result, self.output_file)
                
                all_results.extend(results)
                stats['successful_files'] += 1
                stats['total_items'] += len(results)
                
                self.logger.info(f"Parsed {json_file.name}: {len(results)} items")
            else:
                stats['failed_files'] += 1
                self.logger.warning(f"No data extracted from {json_file.name}")
        
        stats['end_time'] = create_timestamp()
        
        # Save statistics
        stats_file = config.dirs['scrape'] / 'parse_json_stats.json'
        save_json(stats, stats_file)
        
        # Log summary
        self.logger.info("JSON parsing complete!")
        self.logger.info(f"Files: {stats['successful_files']}/{stats['total_files']} successful")
        self.logger.info(f"Total items extracted: {stats['total_items']}")
        
        return stats


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description='Parse JSON/API responses to extract structured data',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Parse all JSON files in default location
  python parse_json.py --domain example.com
  
  # Parse JSON files from custom directory
  python parse_json.py --domain example.com --input-dir /path/to/json/files
  
  # Parse with specific pattern mapping
  python parse_json.py --domain example.com --pattern "/api/products/{id}"
        """
    )
    
    parser.add_argument('--domain', required=True, help='Domain being parsed')
    parser.add_argument('--input-dir', help='Directory containing JSON files')
    parser.add_argument('--pattern', help='Pattern name for field mapping')
    
    args = parser.parse_args()
    
    # Run parser
    parser = JSONParser(args.domain)
    
    input_dir = Path(args.input_dir) if args.input_dir else None
    stats = parser.run(input_dir=input_dir)
    
    if stats:
        print(f"\nJSON parsing complete!")
        print(f"Files processed: {stats['total_files']}")
        print(f"Successful: {stats['successful_files']}")
        print(f"Total items: {stats['total_items']}")


if __name__ == '__main__':
    main()