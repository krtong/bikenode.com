#!/usr/bin/env python3
"""
Step 09: DOM Parsing
Extracts structured data from crawled HTML pages using configured selectors.
"""

import argparse
import sys
from pathlib import Path
from typing import Dict, List, Optional, Any, Union
from concurrent.futures import ProcessPoolExecutor, as_completed
import json

from bs4 import BeautifulSoup
from lxml import html
import extruct

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent / '00_env'))

from config import config
from utils import (
    setup_logging, load_json, load_yaml, save_json, append_ndjson,
    load_ndjson, ensure_dir, create_timestamp, clean_text, extract_price
)


class DOMParser:
    """Parses HTML content to extract structured data."""
    
    def __init__(self, domain: str):
        """Initialize DOM parser."""
        self.domain = domain
        self.logger = setup_logging('dom_parser', Path(__file__).parent / 'scrape.log')
        self.output_file = Path(__file__).parent / 'parsed.ndjson'
        self.selectors = self.load_selectors()
    
    def load_selectors(self) -> Dict[str, Dict[str, Any]]:
        """Load CSS selectors configuration."""
        selectors_file = Path(__file__).parent.parent / '06_plan' / 'css_selectors.yaml'
        if selectors_file.exists():
            return load_yaml(selectors_file)
        
        # Default selectors for common patterns
        return {
            'product_detail': {
                'title': ['h1', '.product-title', '[itemprop="name"]'],
                'price': ['.price', '.product-price', '[itemprop="price"]'],
                'description': ['.description', '.product-description', '[itemprop="description"]'],
                'images': ['img.product-image', '.gallery img', '[itemprop="image"]'],
                'brand': ['.brand', '[itemprop="brand"]', '.manufacturer'],
                'sku': ['.sku', '[itemprop="sku"]', '.product-code'],
                'availability': ['.availability', '[itemprop="availability"]'],
                'rating': ['.rating', '[itemprop="ratingValue"]'],
                'reviews_count': ['.reviews-count', '[itemprop="reviewCount"]'],
            },
            'product_listing': {
                'products': '.product-item',
                'title': 'h2, h3, .product-name',
                'price': '.price',
                'link': 'a',
                'image': 'img',
            },
        }
    
    def extract_structured_data(self, html_content: str, url: str) -> Dict[str, Any]:
        """Extract structured data (JSON-LD, microdata, etc.)."""
        structured = {}
        
        try:
            # Extract all structured data formats
            data = extruct.extract(html_content, url)
            
            # JSON-LD
            if data.get('json-ld'):
                structured['json_ld'] = data['json-ld']
            
            # Microdata
            if data.get('microdata'):
                structured['microdata'] = data['microdata']
            
            # Open Graph
            if data.get('opengraph'):
                structured['opengraph'] = data['opengraph']
            
            # RDFa
            if data.get('rdfa'):
                structured['rdfa'] = data['rdfa']
                
        except Exception as e:
            self.logger.debug(f"Error extracting structured data: {e}")
        
        return structured
    
    def extract_with_css(self, soup: BeautifulSoup, selectors: Dict[str, Any]) -> Dict[str, Any]:
        """Extract data using CSS selectors."""
        extracted = {}
        
        for field, selector_list in selectors.items():
            if not isinstance(selector_list, list):
                selector_list = [selector_list]
            
            for selector in selector_list:
                try:
                    if field == 'images':
                        # Special handling for images
                        elements = soup.select(selector)
                        values = []
                        for elem in elements:
                            src = elem.get('src', '') or elem.get('data-src', '')
                            if src:
                                values.append(src)
                        if values:
                            extracted[field] = values
                            break
                    elif field == 'price':
                        # Special handling for price
                        elements = soup.select(selector)
                        for elem in elements:
                            text = elem.get_text(strip=True)
                            price = extract_price(text)
                            if price:
                                extracted[field] = price
                                extracted[f'{field}_text'] = text
                                break
                        if field in extracted:
                            break
                    else:
                        # Regular text extraction
                        elements = soup.select(selector)
                        if elements:
                            if len(elements) == 1:
                                text = clean_text(elements[0].get_text())
                                if text:
                                    extracted[field] = text
                            else:
                                texts = [clean_text(e.get_text()) for e in elements]
                                texts = [t for t in texts if t]
                                if texts:
                                    extracted[field] = texts
                            break
                            
                except Exception as e:
                    self.logger.debug(f"Error with selector {selector}: {e}")
        
        return extracted
    
    def extract_with_xpath(self, tree: html.HtmlElement, selectors: Dict[str, str]) -> Dict[str, Any]:
        """Extract data using XPath selectors."""
        extracted = {}
        
        for field, xpath in selectors.items():
            try:
                if field == 'images':
                    elements = tree.xpath(xpath)
                    values = []
                    for elem in elements:
                        if hasattr(elem, 'get'):
                            src = elem.get('src', '') or elem.get('data-src', '')
                        else:
                            src = str(elem)
                        if src:
                            values.append(src)
                    if values:
                        extracted[field] = values
                else:
                    values = tree.xpath(xpath)
                    if values:
                        if len(values) == 1:
                            text = clean_text(str(values[0]))
                            if text:
                                extracted[field] = text
                        else:
                            texts = [clean_text(str(v)) for v in values]
                            texts = [t for t in texts if t]
                            if texts:
                                extracted[field] = texts
                                
            except Exception as e:
                self.logger.debug(f"Error with XPath {xpath}: {e}")
        
        return extracted
    
    def guess_page_type(self, url: str, soup: BeautifulSoup) -> str:
        """Guess the type of page based on URL and content."""
        url_lower = url.lower()
        
        # Check URL patterns
        if any(x in url_lower for x in ['/product/', '/item/', '/p/']):
            return 'product_detail'
        if any(x in url_lower for x in ['/category/', '/collection/', '/shop/']):
            return 'product_listing'
        
        # Check page content
        if soup.find('div', class_='product-detail') or soup.find(attrs={'itemtype': 'http://schema.org/Product'}):
            return 'product_detail'
        if soup.find_all('div', class_='product-item') or soup.find_all('article', class_='product'):
            return 'product_listing'
        
        return 'unknown'
    
    def parse_html_file(self, html_path: Path, metadata: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Parse a single HTML file."""
        try:
            # Read HTML content
            with open(html_path, 'r', encoding='utf-8') as f:
                html_content = f.read()
            
            # Parse with BeautifulSoup
            soup = BeautifulSoup(html_content, 'html.parser')
            
            # Also parse with lxml for XPath support
            tree = html.fromstring(html_content)
            
            # Start with metadata
            result = {
                'url': metadata.get('url'),
                'timestamp_crawled': metadata.get('timestamp'),
                'timestamp_parsed': create_timestamp(),
                'file_path': str(html_path),
            }
            
            # Extract structured data
            structured = self.extract_structured_data(html_content, result['url'])
            if structured:
                result['structured_data'] = structured
            
            # Guess page type
            page_type = self.guess_page_type(result['url'], soup)
            result['page_type'] = page_type
            
            # Get appropriate selectors
            if page_type in self.selectors:
                selectors = self.selectors[page_type]
            else:
                # Try to match pattern from grouping
                pattern = metadata.get('pattern')
                if pattern and pattern in self.selectors:
                    selectors = self.selectors[pattern]
                else:
                    selectors = self.selectors.get('product_detail', {})
            
            # Extract with CSS selectors
            css_data = self.extract_with_css(soup, selectors)
            if css_data:
                result['extracted_data'] = css_data
            
            # Try XPath if we have XPath selectors
            xpath_selectors = {}
            for field, selector in selectors.items():
                if isinstance(selector, str) and selector.startswith('//'):
                    xpath_selectors[field] = selector
            
            if xpath_selectors:
                xpath_data = self.extract_with_xpath(tree, xpath_selectors)
                if xpath_data:
                    result['extracted_data'].update(xpath_data)
            
            return result
            
        except Exception as e:
            self.logger.error(f"Error parsing {html_path}: {e}")
            return None
    
    def process_batch(self, batch_dir: Path) -> List[Dict[str, Any]]:
        """Process all HTML files in a batch directory."""
        results = []
        
        # Load metadata for this batch
        metadata_file = batch_dir.parent.parent / f"{batch_dir.name}.ndjson"
        metadata_map = {}
        
        if metadata_file.exists():
            metadata_records = load_ndjson(metadata_file)
            for record in metadata_records:
                if 'file_path' in record:
                    metadata_map[record['file_path']] = record
        
        # Process HTML files
        html_files = list(batch_dir.glob('*.html'))
        self.logger.info(f"Processing {len(html_files)} files in {batch_dir.name}")
        
        for html_file in html_files:
            # Find metadata
            relative_path = f"html/{batch_dir.name}/{html_file.name}"
            metadata = metadata_map.get(relative_path, {'url': 'unknown'})
            
            # Parse file
            result = self.parse_html_file(html_file, metadata)
            if result:
                results.append(result)
        
        return results
    
    def run(self, batch_id: Optional[str] = None, max_workers: int = 4) -> Dict[str, Any]:
        """Run DOM parsing on crawled HTML files."""
        self.logger.info(f"Starting DOM parsing for domain: {self.domain}")
        
        html_dir = Path(__file__).parent.parent / '08_fetch' / 'html'
        if not html_dir.exists():
            self.logger.error("No HTML directory found. Run fetch step first.")
            return {}
        
        # Get batch directories
        if batch_id:
            batch_dirs = [html_dir / batch_id]
        else:
            batch_dirs = [d for d in html_dir.iterdir() if d.is_dir() and d.name.startswith('batch_')]
        
        if not batch_dirs:
            self.logger.error("No batch directories found")
            return {}
        
        self.logger.info(f"Found {len(batch_dirs)} batches to process")
        
        # Process batches
        all_results = []
        stats = {
            'total_batches': len(batch_dirs),
            'total_files': 0,
            'successful': 0,
            'failed': 0,
            'start_time': create_timestamp(),
        }
        
        for batch_dir in batch_dirs:
            batch_results = self.process_batch(batch_dir)
            
            # Save results incrementally
            for result in batch_results:
                append_ndjson(result, self.output_file)
            
            all_results.extend(batch_results)
            stats['total_files'] += len(list(batch_dir.glob('*.html')))
            stats['successful'] += len(batch_results)
            
            self.logger.info(f"Batch {batch_dir.name}: {len(batch_results)} parsed")
        
        stats['failed'] = stats['total_files'] - stats['successful']
        stats['end_time'] = create_timestamp()
        
        # Save statistics
        stats_file = config.dirs['scrape'] / 'parse_stats.json'
        save_json(stats, stats_file)
        
        # Log summary
        self.logger.info("Parsing complete!")
        self.logger.info(f"Total files: {stats['total_files']}")
        self.logger.info(f"Successful: {stats['successful']}")
        self.logger.info(f"Failed: {stats['failed']}")
        
        return stats


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description='Parse HTML files to extract structured data',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Parse all crawled HTML
  python parse_dom.py --domain example.com
  
  # Parse specific batch
  python parse_dom.py --domain example.com --batch batch_0001
  
  # Use more workers for parallel processing
  python parse_dom.py --domain example.com --workers 8
        """
    )
    
    parser.add_argument('--domain', required=True, help='Domain being parsed')
    parser.add_argument('--batch', help='Specific batch ID to parse')
    parser.add_argument('--workers', type=int, default=4,
                       help='Number of parallel workers')
    
    args = parser.parse_args()
    
    # Run parser
    parser = DOMParser(args.domain)
    stats = parser.run(batch_id=args.batch, max_workers=args.workers)
    
    if stats:
        print(f"\nParsing complete!")
        print(f"Total files: {stats['total_files']}")
        print(f"Successful: {stats['successful']}")
        print(f"Failed: {stats['failed']}")


if __name__ == '__main__':
    main()