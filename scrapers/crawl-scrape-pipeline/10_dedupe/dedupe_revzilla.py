#!/usr/bin/env python3
"""
Simple deduplication for RevZilla products.
"""

import json
import argparse
from collections import OrderedDict

def dedupe_products(input_file, output_file):
    """Remove duplicate products based on URL."""
    seen_urls = set()
    unique_products = []
    
    with open(input_file, 'r') as f:
        for line in f:
            if line.strip():
                product = json.loads(line)
                url = product.get('url', '')
                
                # Remove anchor from URL for deduplication
                base_url = url.split('#')[0]
                
                if base_url not in seen_urls:
                    seen_urls.add(base_url)
                    unique_products.append(product)
    
    # Write unique products
    with open(output_file, 'w') as out:
        for product in unique_products:
            json.dump(product, out)
            out.write('\n')
    
    print(f"Deduplication complete:")
    print(f"- Input products: {len(seen_urls) + len(unique_products)}")
    print(f"- Unique products: {len(unique_products)}")
    print(f"- Duplicates removed: {len(seen_urls)}")

def main():
    parser = argparse.ArgumentParser(description='Deduplicate RevZilla products')
    parser.add_argument('--input', required=True, help='Input NDJSON file')
    parser.add_argument('--output', required=True, help='Output NDJSON file')
    args = parser.parse_args()
    
    dedupe_products(args.input, args.output)

if __name__ == '__main__':
    main()