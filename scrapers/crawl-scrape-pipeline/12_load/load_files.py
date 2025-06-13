#!/usr/bin/env python3
"""
Step 12: File-Based Data Loading (Alternative to Database)
Organizes cleaned data into structured file storage for production use.
"""

import argparse
import sys
import json
import shutil
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional, Any
import csv

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent / 'orchestration'))

from utils_minimal import setup_logging, create_timestamp, save_json, load_json


class FileLoader:
    """Loads cleaned data into organized file structure."""
    
    def __init__(self, domain: str):
        """Initialize file loader."""
        self.domain = domain
        self.logger = setup_logging('file_loader', Path(__file__).parent / 'load.log')
        self.output_dir = Path(__file__).parent / 'data' / self.domain
        self.stats_file = Path(__file__).parent / 'load_stats.json'
        
        # Create directory structure
        self.products_dir = self.output_dir / 'products'
        self.index_dir = self.output_dir / 'indexes'
        self.history_dir = self.output_dir / 'history'
        
        for dir_path in [self.products_dir, self.index_dir, self.history_dir]:
            dir_path.mkdir(parents=True, exist_ok=True)
    
    def load_product(self, product: Dict[str, Any]) -> bool:
        """Save individual product to file."""
        try:
            # Generate product ID from URL
            url = product.get('url', '')
            product_id = url.replace('https://', '').replace('/', '_').replace('?', '_')
            
            # Add metadata
            product['_id'] = product_id
            product['_loaded_at'] = create_timestamp()
            product['_domain'] = self.domain
            
            # Save product file
            product_file = self.products_dir / f"{product_id}.json"
            save_json(product, product_file)
            
            # Update price history if exists
            if product.get('price'):
                self.update_price_history(product_id, product['price'])
            
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to load product {product.get('url')}: {e}")
            return False
    
    def update_price_history(self, product_id: str, price: float):
        """Track price changes over time."""
        history_file = self.history_dir / f"{product_id}_prices.json"
        
        # Load existing history
        if history_file.exists():
            history = load_json(history_file)
        else:
            history = {'product_id': product_id, 'prices': []}
        
        # Add new price entry
        history['prices'].append({
            'price': price,
            'timestamp': create_timestamp()
        })
        
        # Keep only last 100 price points
        history['prices'] = history['prices'][-100:]
        
        save_json(history, history_file)
    
    def build_indexes(self, products: List[Dict[str, Any]]):
        """Build index files for quick lookups."""
        # URL index
        url_index = {}
        
        # Category index
        category_index = {}
        
        # Brand index
        brand_index = {}
        
        # Price range index
        price_ranges = {
            'under_50': [],
            '50_100': [],
            '100_200': [],
            '200_500': [],
            'over_500': []
        }
        
        for product in products:
            product_id = product.get('_id')
            
            # URL index
            url_index[product.get('url')] = product_id
            
            # Category index
            category = product.get('category', 'uncategorized')
            if category not in category_index:
                category_index[category] = []
            category_index[category].append(product_id)
            
            # Brand index
            brand = product.get('brand', 'unknown')
            if brand not in brand_index:
                brand_index[brand] = []
            brand_index[brand].append(product_id)
            
            # Price range index
            price = product.get('price', 0)
            if price < 50:
                price_ranges['under_50'].append(product_id)
            elif price < 100:
                price_ranges['50_100'].append(product_id)
            elif price < 200:
                price_ranges['100_200'].append(product_id)
            elif price < 500:
                price_ranges['200_500'].append(product_id)
            else:
                price_ranges['over_500'].append(product_id)
        
        # Save indexes
        save_json(url_index, self.index_dir / 'url_index.json')
        save_json(category_index, self.index_dir / 'category_index.json')
        save_json(brand_index, self.index_dir / 'brand_index.json')
        save_json(price_ranges, self.index_dir / 'price_ranges.json')
        
        self.logger.info("Built index files for quick lookups")
    
    def create_catalog(self, products: List[Dict[str, Any]]):
        """Create a master catalog file."""
        catalog = {
            'domain': self.domain,
            'generated_at': create_timestamp(),
            'total_products': len(products),
            'products': []
        }
        
        # Add summary info for each product
        for product in products:
            catalog['products'].append({
                'id': product.get('_id'),
                'url': product.get('url'),
                'title': product.get('title'),
                'price': product.get('price'),
                'brand': product.get('brand'),
                'category': product.get('category')
            })
        
        # Save catalog
        catalog_file = self.output_dir / 'catalog.json'
        save_json(catalog, catalog_file)
        
        # Also save as CSV for easy viewing
        catalog_csv = self.output_dir / 'catalog.csv'
        if catalog['products']:
            with open(catalog_csv, 'w', newline='', encoding='utf-8') as f:
                writer = csv.DictWriter(f, fieldnames=catalog['products'][0].keys())
                writer.writeheader()
                writer.writerows(catalog['products'])
        
        self.logger.info(f"Created catalog with {len(products)} products")
    
    def run(self, input_file: Optional[Path] = None) -> Dict[str, Any]:
        """Run file-based loading process."""
        self.logger.info(f"Starting file load for domain: {self.domain}")
        
        # Default input per spec: 11_clean/clean.csv
        if input_file is None:
            input_file = Path(__file__).parent.parent / '11_clean' / 'clean.csv'
        
        if not input_file.exists():
            self.logger.error(f"Input file not found: {input_file}")
            return {}
        
        # Load cleaned data
        products = []
        with open(input_file, 'r', newline='', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                # Convert price to float
                if row.get('price'):
                    try:
                        row['price'] = float(row['price'])
                    except:
                        pass
                products.append(row)
        
        self.logger.info(f"Loaded {len(products)} products from {input_file}")
        
        # Process products
        stats = {
            'start_time': create_timestamp(),
            'total_products': len(products),
            'loaded': 0,
            'failed': 0,
        }
        
        loaded_products = []
        
        for product in products:
            if self.load_product(product):
                stats['loaded'] += 1
                loaded_products.append(product)
            else:
                stats['failed'] += 1
        
        # Build indexes and catalog
        if loaded_products:
            self.build_indexes(loaded_products)
            self.create_catalog(loaded_products)
        
        stats['end_time'] = create_timestamp()
        
        # Save statistics
        save_json(stats, self.stats_file)
        
        # Create summary report
        summary_file = self.output_dir / 'summary.txt'
        with open(summary_file, 'w') as f:
            f.write(f"Data Load Summary for {self.domain}\n")
            f.write(f"{'=' * 40}\n")
            f.write(f"Generated: {stats['end_time']}\n")
            f.write(f"Total Products: {stats['total_products']}\n")
            f.write(f"Successfully Loaded: {stats['loaded']}\n")
            f.write(f"Failed: {stats['failed']}\n")
            f.write(f"\nData Location: {self.output_dir}\n")
            f.write(f"\nAvailable Files:\n")
            f.write(f"- catalog.json - Master product catalog\n")
            f.write(f"- catalog.csv - Catalog in CSV format\n")
            f.write(f"- products/ - Individual product JSON files\n")
            f.write(f"- indexes/ - Quick lookup indexes\n")
            f.write(f"- history/ - Price history tracking\n")
        
        # Log summary
        self.logger.info("File loading complete!")
        self.logger.info(f"Loaded: {stats['loaded']}/{stats['total_products']}")
        self.logger.info(f"Data stored in: {self.output_dir}")
        
        return stats


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description='Load cleaned data into organized file structure',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
This is a file-based alternative to database loading.
It organizes clean data into a structured file system for production use.

Examples:
  # Load cleaned CSV data
  python load_files.py --domain example.com
  
  # Load from custom file
  python load_files.py --domain example.com --input custom_clean.csv

Output Structure:
  12_load/data/{domain}/
    ├── catalog.json      # Master catalog
    ├── catalog.csv       # CSV version
    ├── summary.txt       # Load summary
    ├── products/         # Individual product files
    │   └── {id}.json
    ├── indexes/          # Quick lookup indexes
    │   ├── url_index.json
    │   ├── category_index.json
    │   ├── brand_index.json
    │   └── price_ranges.json
    └── history/          # Price tracking
        └── {id}_prices.json
        """
    )
    
    parser.add_argument('--domain', required=True, help='Domain being loaded')
    parser.add_argument('--input', help='Input CSV file')
    
    args = parser.parse_args()
    
    # Run loader
    loader = FileLoader(args.domain)
    
    input_file = Path(args.input) if args.input else None
    stats = loader.run(input_file=input_file)
    
    if stats:
        print(f"\nFile loading complete!")
        print(f"Domain: {args.domain}")
        print(f"Total products: {stats['total_products']}")
        print(f"Loaded: {stats['loaded']}")
        print(f"Failed: {stats['failed']}")
        print(f"\nData location: 12_load/data/{args.domain}/")


if __name__ == '__main__':
    main()