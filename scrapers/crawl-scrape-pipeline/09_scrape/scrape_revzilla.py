#!/usr/bin/env python3
"""
RevZilla product scraper - extracts structured data from HTML.
"""

import json
import re
from bs4 import BeautifulSoup
from pathlib import Path
import argparse

def extract_product_data(html, url):
    """Extract product data from RevZilla HTML."""
    soup = BeautifulSoup(html, 'html.parser')
    
    product = {
        'url': url,
        'source': 'revzilla'
    }
    
    # Extract title
    title_elem = soup.find('h1', class_='product-header__title')
    if title_elem:
        product['title'] = title_elem.text.strip()
    
    # Extract price
    price_elem = soup.find('span', class_='price__retail')
    if price_elem:
        price_text = price_elem.text.strip()
        # Extract numeric price
        price_match = re.search(r'[\d,]+\.?\d*', price_text)
        if price_match:
            product['price'] = float(price_match.group().replace(',', ''))
            product['currency'] = 'USD'
    
    # Check for sale price
    sale_elem = soup.find('span', class_='price__sale')
    if sale_elem:
        sale_match = re.search(r'[\d,]+\.?\d*', sale_elem.text)
        if sale_match:
            product['sale_price'] = float(sale_match.group().replace(',', ''))
    
    # Extract brand
    brand_elem = soup.find('a', class_='product-header__brand-link')
    if brand_elem:
        product['brand'] = brand_elem.text.strip()
    
    # Extract SKU/Part number
    sku_elem = soup.find('span', class_='product-header__part-number')
    if sku_elem:
        sku_text = sku_elem.text.strip()
        sku_match = re.search(r'Part #:\s*(.+)', sku_text)
        if sku_match:
            product['sku'] = sku_match.group(1).strip()
    
    # Extract rating
    rating_elem = soup.find('div', class_='star-rating')
    if rating_elem and rating_elem.get('data-rating'):
        product['rating'] = float(rating_elem['data-rating'])
    
    # Extract review count
    review_elem = soup.find('span', class_='product-rating__count')
    if review_elem:
        review_match = re.search(r'(\d+)', review_elem.text)
        if review_match:
            product['review_count'] = int(review_match.group(1))
    
    # Extract description
    desc_elem = soup.find('div', class_='product-description__content')
    if desc_elem:
        product['description'] = desc_elem.text.strip()
    
    # Extract features/bullet points
    features = []
    feature_list = soup.find('ul', class_='product-features__list')
    if feature_list:
        for li in feature_list.find_all('li'):
            features.append(li.text.strip())
    if features:
        product['features'] = features
    
    # Extract images
    images = []
    image_container = soup.find('div', class_='product-images')
    if image_container:
        for img in image_container.find_all('img'):
            src = img.get('src') or img.get('data-src')
            if src and 'product' in src:
                # Clean up image URL
                if src.startswith('//'):
                    src = 'https:' + src
                images.append(src)
    if images:
        product['images'] = list(set(images))  # Remove duplicates
    
    # Extract availability
    availability_elem = soup.find('span', class_='product-availability')
    if availability_elem:
        product['availability'] = availability_elem.text.strip()
    
    # Extract categories from breadcrumbs
    categories = []
    breadcrumb = soup.find('nav', class_='breadcrumb')
    if breadcrumb:
        for link in breadcrumb.find_all('a', class_='breadcrumb__link'):
            cat_text = link.text.strip()
            if cat_text and cat_text not in ['Home', 'RevZilla']:
                categories.append(cat_text)
    if categories:
        product['categories'] = categories
    
    # Extract fitment information (for motorcycle parts)
    fitment = []
    fitment_section = soup.find('div', class_='product-fitment')
    if fitment_section:
        for item in fitment_section.find_all('li'):
            fitment.append(item.text.strip())
    if fitment:
        product['fitment'] = fitment
    
    # Extract from structured data (JSON-LD)
    for script in soup.find_all('script', type='application/ld+json'):
        try:
            data = json.loads(script.string)
            # Handle both single objects and arrays
            if isinstance(data, list):
                for item in data:
                    if isinstance(item, dict) and item.get('@type') == 'Product':
                        data = item
                        break
                else:
                    continue
            
            if isinstance(data, dict) and data.get('@type') == 'Product':
                # Fill in any missing fields from structured data
                if 'title' not in product and data.get('name'):
                    product['title'] = data['name']
                if 'brand' not in product and data.get('brand', {}).get('name'):
                    product['brand'] = data['brand']['name']
                if 'price' not in product and data.get('offers', {}).get('price'):
                    product['price'] = float(data['offers']['price'])
                if 'images' not in product and data.get('image'):
                    product['images'] = data['image'] if isinstance(data['image'], list) else [data['image']]
                if 'description' not in product and data.get('description'):
                    product['description'] = data['description']
                if data.get('aggregateRating'):
                    if 'rating' not in product:
                        product['rating'] = float(data['aggregateRating'].get('ratingValue', 0))
                    if 'review_count' not in product:
                        product['review_count'] = int(data['aggregateRating'].get('reviewCount', 0))
        except (json.JSONDecodeError, ValueError):
            pass
    
    return product

def scrape_products(input_file, output_file):
    """Scrape product data from fetched HTML."""
    products = []
    
    with open(input_file, 'r') as f:
        for line in f:
            if line.strip():
                data = json.loads(line)
                if data.get('html'):
                    product = extract_product_data(data['html'], data['url'])
                    products.append(product)
                    print(f"Scraped: {product.get('title', 'Unknown')} - ${product.get('price', 'N/A')}")
    
    # Save as NDJSON
    with open(output_file, 'w') as out:
        for product in products:
            json.dump(product, out)
            out.write('\n')
    
    print(f"\nScraped {len(products)} products")
    print(f"Results saved to {output_file}")
    
    # Summary statistics
    print("\nSummary:")
    print(f"- Products with prices: {sum(1 for p in products if 'price' in p)}")
    print(f"- Products with ratings: {sum(1 for p in products if 'rating' in p)}")
    print(f"- Products with images: {sum(1 for p in products if 'images' in p)}")
    print(f"- Brands found: {len(set(p.get('brand', '') for p in products if p.get('brand')))}")

def main():
    parser = argparse.ArgumentParser(description='Scrape RevZilla product data')
    parser.add_argument('--input', required=True, help='Input NDJSON file with HTML')
    parser.add_argument('--output', required=True, help='Output NDJSON file')
    args = parser.parse_args()
    
    scrape_products(args.input, args.output)

if __name__ == '__main__':
    main()