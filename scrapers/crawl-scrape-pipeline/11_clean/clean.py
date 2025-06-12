#!/usr/bin/env python3
"""
Step 11: Data Cleaning
Cleans, validates, and standardizes scraped data.
"""

import argparse
import re
import sys
from pathlib import Path
from typing import Dict, List, Optional, Any, Union
from datetime import datetime
import pandas as pd

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent / '00_env'))

from config import config
from utils import (
    setup_logging, load_ndjson, save_json, clean_text,
    extract_price, create_timestamp
)


class DataCleaner:
    """Cleans and standardizes scraped data."""
    
    def __init__(self, domain: str):
        """Initialize data cleaner."""
        self.domain = domain
        self.logger = setup_logging('data_cleaner', Path(__file__).parent / 'clean.log')
        self.output_csv = Path(__file__).parent / 'clean.csv'
        self.output_json = Path(__file__).parent / 'clean.json'
        self.validation_report = Path(__file__).parent / 'validation_report.json'
    
    def clean_title(self, title: Any) -> Optional[str]:
        """Clean and validate product title."""
        if not title:
            return None
        
        title = str(title).strip()
        
        # Remove excessive whitespace
        title = ' '.join(title.split())
        
        # Remove common unwanted patterns
        title = re.sub(r'\s*\|.*$', '', title)  # Remove everything after |
        title = re.sub(r'\s*-\s*$', '', title)  # Remove trailing dash
        
        # Validate length
        if len(title) < 3 or len(title) > 500:
            return None
        
        return title
    
    def clean_price(self, price: Any) -> Optional[float]:
        """Clean and validate price."""
        if price is None:
            return None
        
        # Handle already numeric prices
        if isinstance(price, (int, float)):
            price_float = float(price)
            # Validate reasonable price range
            if 0.01 <= price_float <= 1000000:
                return round(price_float, 2)
            return None
        
        # Extract from string
        price_float = extract_price(str(price))
        
        if price_float and 0.01 <= price_float <= 1000000:
            return round(price_float, 2)
        
        return None
    
    def clean_description(self, description: Any) -> Optional[str]:
        """Clean and validate description."""
        if not description:
            return None
        
        if isinstance(description, list):
            description = ' '.join(str(d) for d in description)
        
        description = clean_text(str(description))
        
        # Remove HTML entities
        description = re.sub(r'&[a-zA-Z]+;', ' ', description)
        description = re.sub(r'&#\d+;', ' ', description)
        
        # Remove excessive newlines
        description = re.sub(r'\n{3,}', '\n\n', description)
        
        # Validate length
        if len(description) < 10:
            return None
        
        # Truncate if too long
        if len(description) > 5000:
            description = description[:4997] + '...'
        
        return description
    
    def clean_images(self, images: Any) -> List[str]:
        """Clean and validate image URLs."""
        if not images:
            return []
        
        if isinstance(images, str):
            images = [images]
        elif not isinstance(images, list):
            return []
        
        cleaned_images = []
        
        for img in images:
            if not img:
                continue
            
            img_url = str(img).strip()
            
            # Skip data URLs
            if img_url.startswith('data:'):
                continue
            
            # Ensure proper URL format
            if not img_url.startswith(('http://', 'https://', '//')):
                # Relative URL - prepend protocol
                if img_url.startswith('/'):
                    img_url = f'https://{self.domain}{img_url}'
                else:
                    continue
            
            # Normalize protocol-relative URLs
            if img_url.startswith('//'):
                img_url = 'https:' + img_url
            
            # Remove query parameters that might be tracking/cache busters
            img_url = re.sub(r'\?.*$', '', img_url)
            
            if img_url not in cleaned_images:
                cleaned_images.append(img_url)
        
        return cleaned_images
    
    def clean_category(self, category: Any) -> Optional[str]:
        """Clean and standardize category."""
        if not category:
            return None
        
        if isinstance(category, list):
            # Join category hierarchy
            category = ' > '.join(str(c).strip() for c in category if c)
        
        category = clean_text(str(category))
        
        # Standardize separators
        category = category.replace('/', ' > ')
        category = category.replace('|', ' > ')
        
        # Remove duplicates in hierarchy
        parts = [p.strip() for p in category.split(' > ') if p.strip()]
        seen = set()
        unique_parts = []
        for part in parts:
            if part.lower() not in seen:
                seen.add(part.lower())
                unique_parts.append(part)
        
        return ' > '.join(unique_parts) if unique_parts else None
    
    def clean_availability(self, availability: Any) -> Optional[str]:
        """Clean and standardize availability status."""
        if not availability:
            return None
        
        avail_str = str(availability).lower().strip()
        
        # Standardize common patterns
        if any(x in avail_str for x in ['in stock', 'available', 'in-stock', 'yes']):
            return 'in_stock'
        elif any(x in avail_str for x in ['out of stock', 'unavailable', 'sold out', 'no']):
            return 'out_of_stock'
        elif any(x in avail_str for x in ['limited', 'low stock', 'few left']):
            return 'limited_stock'
        elif any(x in avail_str for x in ['preorder', 'pre-order', 'coming soon']):
            return 'preorder'
        
        return None
    
    def validate_item(self, item: Dict[str, Any]) -> Dict[str, List[str]]:
        """Validate an item and return validation errors/warnings."""
        errors = []
        warnings = []
        
        # Required fields
        if not item.get('title'):
            errors.append('Missing title')
        
        if not item.get('url') and not item.get('id'):
            errors.append('Missing both URL and ID')
        
        # Validate price
        price = item.get('price')
        if price is not None:
            if price <= 0:
                errors.append(f'Invalid price: {price}')
            elif price > 10000:
                warnings.append(f'Unusually high price: ${price}')
        
        # Validate images
        images = item.get('images', [])
        if not images:
            warnings.append('No images')
        elif len(images) > 20:
            warnings.append(f'Too many images: {len(images)}')
        
        # Validate description
        desc = item.get('description')
        if desc and len(desc) < 20:
            warnings.append('Very short description')
        
        return {'errors': errors, 'warnings': warnings}
    
    def clean_item(self, raw_item: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Clean a single item."""
        # Extract data based on structure
        if 'data' in raw_item:
            data = raw_item['data']
        elif 'extracted_data' in raw_item:
            data = raw_item['extracted_data']
        else:
            data = raw_item
        
        # Clean each field
        cleaned = {
            'url': raw_item.get('url'),
            'timestamp_scraped': raw_item.get('timestamp_crawled') or raw_item.get('timestamp'),
            'timestamp_cleaned': create_timestamp(),
        }
        
        # Clean core fields
        cleaned['title'] = self.clean_title(data.get('title') or data.get('name'))
        cleaned['price'] = self.clean_price(data.get('price'))
        cleaned['description'] = self.clean_description(data.get('description'))
        cleaned['images'] = self.clean_images(data.get('images'))
        cleaned['category'] = self.clean_category(data.get('category'))
        cleaned['brand'] = clean_text(data.get('brand')) if data.get('brand') else None
        cleaned['sku'] = clean_text(data.get('sku')) if data.get('sku') else None
        cleaned['availability'] = self.clean_availability(data.get('availability'))
        
        # Clean numeric fields
        if 'rating' in data:
            try:
                rating = float(data['rating'])
                if 0 <= rating <= 5:
                    cleaned['rating'] = round(rating, 1)
            except:
                pass
        
        if 'reviews_count' in data:
            try:
                cleaned['reviews_count'] = int(data['reviews_count'])
            except:
                pass
        
        # Validate
        validation = self.validate_item(cleaned)
        
        # Skip items with errors
        if validation['errors']:
            self.logger.warning(f"Item validation errors: {validation['errors']}")
            return None
        
        # Add warnings as metadata
        if validation['warnings']:
            cleaned['_warnings'] = validation['warnings']
        
        return cleaned
    
    def run(self, input_file: Optional[Path] = None) -> Dict[str, Any]:
        """Run data cleaning process."""
        self.logger.info(f"Starting data cleaning for domain: {self.domain}")
        
        # Default input per spec: 10_dedupe/deduped.ndjson
        if input_file is None:
            input_file = Path(__file__).parent.parent / '10_dedupe' / 'deduped.ndjson'
        
        if not input_file.exists():
            self.logger.error(f"Input file not found: {input_file}")
            return {}
        
        # Load data
        raw_items = load_ndjson(input_file)
        self.logger.info(f"Loaded {len(raw_items)} items from {input_file}")
        
        # Clean items
        cleaned_items = []
        stats = {
            'total_input': len(raw_items),
            'cleaned': 0,
            'dropped': 0,
            'validation_errors': {},
            'validation_warnings': {},
        }
        
        for raw_item in raw_items:
            cleaned = self.clean_item(raw_item)
            
            if cleaned:
                cleaned_items.append(cleaned)
                stats['cleaned'] += 1
                
                # Track warnings
                if '_warnings' in cleaned:
                    for warning in cleaned['_warnings']:
                        stats['validation_warnings'][warning] = stats['validation_warnings'].get(warning, 0) + 1
            else:
                stats['dropped'] += 1
        
        self.logger.info(f"Cleaned {stats['cleaned']} items, dropped {stats['dropped']}")
        
        # Convert to DataFrame for additional processing
        df = pd.DataFrame(cleaned_items)
        
        # Remove warning column before saving
        if '_warnings' in df.columns:
            df = df.drop('_warnings', axis=1)
        
        # Additional data enrichment
        if 'price' in df.columns:
            df['price_range'] = pd.cut(
                df['price'],
                bins=[0, 50, 100, 200, 500, 1000, float('inf')],
                labels=['under_50', '50_100', '100_200', '200_500', '500_1000', 'over_1000'],
                include_lowest=True
            )
        
        # Save cleaned data
        df.to_csv(self.output_csv, index=False)
        self.logger.info(f"Saved CSV to {self.output_csv}")
        
        # Also save as JSON for flexibility
        df.to_json(self.output_json, orient='records', indent=2)
        self.logger.info(f"Saved JSON to {self.output_json}")
        
        # Create summary statistics
        summary = {
            'timestamp': create_timestamp(),
            'stats': stats,
            'field_coverage': {},
            'data_quality': {},
        }
        
        # Calculate field coverage
        for col in df.columns:
            if col != 'price_range':
                non_null = df[col].notna().sum()
                summary['field_coverage'][col] = {
                    'count': int(non_null),
                    'percentage': round(non_null / len(df) * 100, 1)
                }
        
        # Data quality metrics
        if 'price' in df.columns:
            summary['data_quality']['price_stats'] = {
                'min': float(df['price'].min()) if not df['price'].isna().all() else None,
                'max': float(df['price'].max()) if not df['price'].isna().all() else None,
                'mean': float(df['price'].mean()) if not df['price'].isna().all() else None,
                'median': float(df['price'].median()) if not df['price'].isna().all() else None,
            }
        
        if 'images' in df.columns:
            image_counts = df['images'].apply(len)
            summary['data_quality']['images_per_item'] = {
                'min': int(image_counts.min()),
                'max': int(image_counts.max()),
                'mean': round(image_counts.mean(), 1),
            }
        
        # Save summary
        save_json(summary, self.validation_report)
        
        # Log summary
        self.logger.info("Data cleaning complete!")
        self.logger.info(f"Input items: {stats['total_input']}")
        self.logger.info(f"Cleaned items: {stats['cleaned']}")
        self.logger.info(f"Dropped items: {stats['dropped']}")
        
        return summary


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description='Clean and validate scraped data',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Clean deduplicated data
  python clean.py --domain example.com
  
  # Clean custom input file
  python clean.py --domain example.com --input custom_data.ndjson
  
  # Generate detailed validation report
  python clean.py --domain example.com --detailed
        """
    )
    
    parser.add_argument('--domain', required=True, help='Domain being processed')
    parser.add_argument('--input', help='Input NDJSON file')
    parser.add_argument('--detailed', action='store_true',
                       help='Generate detailed validation report')
    
    args = parser.parse_args()
    
    # Run cleaning
    cleaner = DataCleaner(args.domain)
    
    input_file = Path(args.input) if args.input else None
    summary = cleaner.run(input_file=input_file)
    
    if summary:
        print(f"\nData cleaning complete!")
        print(f"Cleaned: {summary['stats']['cleaned']}")
        print(f"Dropped: {summary['stats']['dropped']}")
        
        print("\nField coverage:")
        for field, coverage in summary['field_coverage'].items():
            print(f"  {field}: {coverage['percentage']}%")
        
        if summary['stats']['validation_warnings']:
            print("\nTop validation warnings:")
            for warning, count in sorted(summary['stats']['validation_warnings'].items(),
                                       key=lambda x: x[1], reverse=True)[:5]:
                print(f"  {warning}: {count}")


if __name__ == '__main__':
    main()