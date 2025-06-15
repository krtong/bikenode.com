#!/usr/bin/env python3
"""
Clean and validate RevZilla product data.
"""

import json
import csv
import argparse
import re
from datetime import datetime

def clean_product(product):
    """Clean and validate a single product."""
    cleaned = {}
    
    # Required fields
    cleaned['url'] = product.get('url', '').strip()
    cleaned['source'] = 'revzilla'
    cleaned['scraped_at'] = datetime.now().isoformat()
    
    # Title
    title = product.get('title', '').strip()
    if title:
        # Remove extra whitespace
        cleaned['title'] = ' '.join(title.split())
    
    # Brand
    brand = product.get('brand', '').strip()
    if brand:
        cleaned['brand'] = brand
    
    # Price
    if 'price' in product:
        try:
            price = float(product['price'])
            if price > 0:
                cleaned['price'] = round(price, 2)
                cleaned['currency'] = product.get('currency', 'USD')
        except (ValueError, TypeError):
            pass
    
    # Sale price
    if 'sale_price' in product:
        try:
            sale_price = float(product['sale_price'])
            if sale_price > 0:
                cleaned['sale_price'] = round(sale_price, 2)
        except (ValueError, TypeError):
            pass
    
    # SKU
    sku = product.get('sku', '').strip()
    if sku:
        cleaned['sku'] = sku
    
    # Rating
    if 'rating' in product:
        try:
            rating = float(product['rating'])
            if 0 <= rating <= 5:
                cleaned['rating'] = round(rating, 1)
        except (ValueError, TypeError):
            pass
    
    # Review count
    if 'review_count' in product:
        try:
            review_count = int(product['review_count'])
            if review_count >= 0:
                cleaned['review_count'] = review_count
        except (ValueError, TypeError):
            pass
    
    # Description
    desc = product.get('description', '').strip()
    if desc:
        # Clean up description
        desc = ' '.join(desc.split())
        # Remove HTML entities
        desc = desc.replace('&nbsp;', ' ')
        desc = desc.replace('&amp;', '&')
        cleaned['description'] = desc[:1000]  # Limit length
    
    # Features
    if 'features' in product and isinstance(product['features'], list):
        features = [f.strip() for f in product['features'] if f.strip()]
        if features:
            cleaned['features'] = features[:10]  # Limit to 10 features
    
    # Images
    if 'images' in product:
        images = []
        if isinstance(product['images'], list):
            for img in product['images'][:5]:  # Limit to 5 images
                if isinstance(img, str):
                    img_url = img.strip()
                    if img_url.startswith(('http://', 'https://')):
                        images.append(img_url)
                elif isinstance(img, dict) and 'contentUrl' in img:
                    img_url = img['contentUrl'].strip()
                    if img_url.startswith(('http://', 'https://')):
                        images.append(img_url)
        if images:
            cleaned['images'] = images
    
    # Categories
    if 'categories' in product and isinstance(product['categories'], list):
        categories = [c.strip() for c in product['categories'] if c.strip()]
        if categories:
            cleaned['categories'] = categories
    
    # Availability
    avail = product.get('availability', '').strip()
    if avail:
        cleaned['availability'] = avail
    
    return cleaned

def clean_products(input_file, output_json, output_csv):
    """Clean all products and save to JSON and CSV."""
    cleaned_products = []
    
    with open(input_file, 'r') as f:
        for line in f:
            if line.strip():
                product = json.loads(line)
                cleaned = clean_product(product)
                if cleaned.get('title') and cleaned.get('url'):  # Minimum requirements
                    cleaned_products.append(cleaned)
    
    # Save as NDJSON
    with open(output_json, 'w') as out:
        for product in cleaned_products:
            json.dump(product, out)
            out.write('\n')
    
    # Save as CSV
    if cleaned_products:
        # Get all unique keys
        all_keys = set()
        for p in cleaned_products:
            all_keys.update(p.keys())
        
        # Define column order
        columns = ['url', 'title', 'brand', 'price', 'currency', 'sale_price', 
                   'rating', 'review_count', 'sku', 'availability', 'description']
        # Add any remaining columns
        for key in sorted(all_keys):
            if key not in columns:
                columns.append(key)
        
        with open(output_csv, 'w', newline='', encoding='utf-8') as csvfile:
            writer = csv.DictWriter(csvfile, fieldnames=columns)
            writer.writeheader()
            for product in cleaned_products:
                # Convert lists to strings for CSV
                row = {}
                for key, value in product.items():
                    if isinstance(value, list):
                        row[key] = '|'.join(str(v) for v in value)
                    else:
                        row[key] = value
                writer.writerow(row)
    
    print(f"Cleaning complete:")
    print(f"- Cleaned products: {len(cleaned_products)}")
    print(f"- Saved to: {output_json} and {output_csv}")
    
    # Summary statistics
    if cleaned_products:
        with_price = sum(1 for p in cleaned_products if 'price' in p)
        with_rating = sum(1 for p in cleaned_products if 'rating' in p)
        with_images = sum(1 for p in cleaned_products if 'images' in p)
        
        print(f"\nData quality:")
        print(f"- Products with price: {with_price} ({with_price/len(cleaned_products)*100:.1f}%)")
        print(f"- Products with rating: {with_rating} ({with_rating/len(cleaned_products)*100:.1f}%)")
        print(f"- Products with images: {with_images} ({with_images/len(cleaned_products)*100:.1f}%)")

def main():
    parser = argparse.ArgumentParser(description='Clean RevZilla product data')
    parser.add_argument('--input', required=True, help='Input NDJSON file')
    parser.add_argument('--output-json', required=True, help='Output NDJSON file')
    parser.add_argument('--output-csv', required=True, help='Output CSV file')
    args = parser.parse_args()
    
    clean_products(args.input, args.output_json, args.output_csv)

if __name__ == '__main__':
    main()