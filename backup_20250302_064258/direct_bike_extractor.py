#!/usr/bin/env python3
"""
Direct Bike Extractor - A tool to extract bike data from saved HTML files or direct content.

This script parses HTML content from 99spokes.com (either saved files or from clipboard)
and extracts bike information including brand, model, price range and URLs.
"""

import os
import sys
import csv
import re
import json
import logging
import argparse
from bs4 import BeautifulSoup
from pathlib import Path
from datetime import datetime
from urllib.parse import urlparse, parse_qs, urljoin

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler("bike_extractor.log"),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

class DirectBikeExtractor:
    """Extract bike data directly from HTML content without browser automation"""
    
    def __init__(self, output_dir="extracted_bikes"):
        self.output_dir = output_dir
        self.base_url = "https://99spokes.com"
        
        # Setup directory structure
        os.makedirs(output_dir, exist_ok=True)
        os.makedirs(os.path.join(output_dir, "by_brand"), exist_ok=True)
        os.makedirs(os.path.join(output_dir, "by_year"), exist_ok=True)
        
    def extract_from_file(self, file_path):
        """Extract bikes from an HTML file"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                html_content = f.read()
                
            return self.extract_from_html(html_content)
            
        except Exception as e:
            logger.error(f"Error extracting bikes from file {file_path}: {e}")
            return []
            
    def extract_from_clipboard(self):
        """Extract bikes from clipboard content"""
        try:
            import pyperclip
            html_content = pyperclip.paste()
            
            return self.extract_from_html(html_content)
            
        except ImportError:
            logger.error("pyperclip module not installed. Use 'pip install pyperclip'")
            return []
        except Exception as e:
            logger.error(f"Error extracting bikes from clipboard: {e}")
            return []
            
    def extract_from_html(self, html_content):
        """Extract bike data from HTML content"""
        bikes = []
        try:
            # Try a few different parsing approaches
            soup = BeautifulSoup(html_content, 'html.parser')
            
            # Attempt 1: Extract from bike cards in search/filter results
            bike_cards = soup.select("a[href*='/bikes/']")
            if bike_cards:
                logger.info(f"Found {len(bike_cards)} bike cards in the HTML")
                
                for card in bike_cards:
                    try:
                        bike = self._extract_bike_from_card(card)
                        if bike:
                            bikes.append(bike)
                    except Exception as e:
                        logger.error(f"Error extracting from card: {e}")
            
            # Attempt 2: Extract from bike family links
            family_links = soup.select("a[href*='family=']")
            if family_links:
                logger.info(f"Found {len(family_links)} bike family links in the HTML")
                
                for link in family_links:
                    try:
                        family = self._extract_bike_family(link)
                        if family:
                            bikes.append(family)
                    except Exception as e:
                        logger.error(f"Error extracting from family link: {e}")
            
            # Attempt 3: Look for structured data (JSON-LD)
            script_tags = soup.find_all('script', type='application/ld+json')
            for script in script_tags:
                try:
                    json_data = json.loads(script.string)
                    if isinstance(json_data, dict) and json_data.get("@type") == "Product":
                        bike = self._extract_from_json_ld(json_data)
                        if bike:
                            bikes.append(bike)
                except:
                    pass
            
            logger.info(f"Extracted {len(bikes)} bikes from the HTML content")
            return bikes
            
        except Exception as e:
            logger.error(f"Error parsing HTML content: {e}")
            return []
            
    def _extract_bike_from_card(self, card):
        """Extract bike data from a card element"""
        bike = {}
        
        # Get href link
        href = card.get('href')
        if href:
            if not href.startswith('http'):
                href = urljoin(self.base_url, href)
            bike['url'] = href
            
            # Try to extract brand/model/year from URL
            url_parts = href.split('/')
            for i, part in enumerate(url_parts):
                if part.isdigit() and len(part) == 4 and 2000 <= int(part) <= 2030:
                    bike['year'] = part
                    # Brand is typically before year
                    if i > 0:
                        brand_slug = url_parts[i-1]
                        bike['brand'] = brand_slug.replace('-', ' ').title()
                    # Model is typically after year
                    if i+1 < len(url_parts):
                        model_slug = url_parts[i+1]
                        bike['model'] = model_slug.replace('-', ' ').title()
        
        # Extract brand name
        brand_elem = card.select_one("p[class*='brand']")
        if brand_elem and brand_elem.text.strip():
            bike['brand'] = brand_elem.text.strip()
            
        # Extract model name
        model_elem = card.select_one("p[class*='model']")
        if model_elem and model_elem.text.strip():
            bike['model'] = model_elem.text.strip()
            
        # Extract price
        price_elem = card.select_one("p[class*='price']")
        if price_elem and price_elem.text.strip():
            price_text = price_elem.text.strip()
            price_match = re.search(r'\$[\d,]+(\.\d{2})?', price_text)
            if price_match:
                bike['price'] = price_match.group(0)
                
            # Check for price range
            price_range = re.search(r'\$[\d,]+(\.\d{2})?—\$[\d,]+(\.\d{2})?', price_text)
            if price_range:
                bike['price_range'] = price_range.group(0)
                
        # Extract image URL
        img = card.select_one('img[src*="cloudfront"]')
        if img and img.get('src'):
            bike['image_url'] = img.get('src')
        
        # Extract electric status
        electric_icon = card.select_one('svg[class*="zap"]')
        if electric_icon:
            bike['electric'] = True
            
        # Extract extracted timestamp
        bike['extracted_at'] = datetime.now().isoformat()
        
        return bike if bike else None
    
    def _extract_bike_family(self, link):
        """Extract bike family data from a link element"""
        family = {}
        
        # Get href attribute
        href = link.get('href')
        if href:
            if not href.startswith('http'):
                href = urljoin(self.base_url, href)
            family['url'] = href
            
            # Parse query parameters
            parsed_url = urlparse(href)
            query_params = parse_qs(parsed_url.query)
            
            if 'year' in query_params:
                family['year'] = query_params['year'][0]
                
            if 'family' in query_params:
                family_slug = query_params['family'][0]
                
                # Family slug typically contains brand and model
                parts = family_slug.split('-')
                if len(parts) >= 2:
                    brand = parts[0].strip().title()
                    model = ' '.join(parts[1:]).strip().title()
                    family['brand'] = brand
                    family['family'] = model
        
        # Try to extract from card content if it's contained in a card
        card = link.find_parent('div', class_=lambda c: c and 'card' in c.lower())
        if card:
            # Extract brand name
            brand_elem = card.select_one("p[class*='brand']")
            if brand_elem and brand_elem.text.strip():
                family['brand'] = brand_elem.text.strip()
                
            # Extract model/family name
            model_elem = card.select_one("p[class*='model']")
            if model_elem and model_elem.text.strip():
                family['family'] = model_elem.text.strip()
                
            # Extract price range
            price_elem = card.select_one("p[class*='price']")
            if price_elem and price_elem.text.strip():
                price_text = price_elem.text.strip()
                price_range = re.search(r'\$[\d,]+(\.\d{2})?—\$[\d,]+(\.\d{2})?', price_text)
                if price_range:
                    family['price_range'] = price_range.group(0)
                    
            # Extract image URL
            img = card.select_one('img[src*="cloudfront"]')
            if img and img.get('src'):
                family['image_url'] = img.get('src')
            
            # Extract electric status
            electric_icon = card.select_one('svg[class*="zap"]')
            if electric_icon:
                family['electric'] = True
        
        # Extract extracted timestamp
        family['extracted_at'] = datetime.now().isoformat()
        family['entry_type'] = 'family'
        
        return family if family else None
    
    def _extract_from_json_ld(self, json_data):
        """Extract bike data from JSON-LD structured data"""
        bike = {}
        
        if "name" in json_data:
            # Usually in format "Brand Model Year"
            name_parts = json_data["name"].split()
            if len(name_parts) >= 2:
                bike["brand"] = name_parts[0]
                bike["model"] = ' '.join(name_parts[1:-1])
                # Last part might be year
                if name_parts[-1].isdigit() and len(name_parts[-1]) == 4:
                    bike["year"] = name_parts[-1]
        
        if "description" in json_data:
            bike["description"] = json_data["description"]
            
        if "image" in json_data:
            if isinstance(json_data["image"], list):
                bike["image_url"] = json_data["image"][0]
            else:
                bike["image_url"] = json_data["image"]
                
        if "offers" in json_data:
            offers = json_data["offers"]
            if isinstance(offers, dict):
                if "price" in offers:
                    bike["price"] = f"${offers['price']}"
                if "url" in offers:
                    bike["url"] = offers["url"]
                    
        # Extract extracted timestamp
        bike['extracted_at'] = datetime.now().isoformat()
        
        return bike
    
    def save_bikes_csv(self, bikes, filename):
        """Save bike data to CSV file"""
        if not bikes:
            logger.warning(f"No bikes to save to {filename}")
            return False
            
        try:
            # Determine all possible fields from bike data
            all_fields = set()
            for bike in bikes:
                all_fields.update(bike.keys())
            
            # Sort fields for consistent output
            headers = sorted(list(all_fields))
            
            # Move important fields to the front
            priority_fields = ["brand", "model", "family", "year", "url", "price", "price_range", "electric"]
            for field in reversed(priority_fields):
                if field in headers:
                    headers.remove(field)
                    headers.insert(0, field)
            
            with open(filename, 'w', newline='', encoding='utf-8') as f:
                writer = csv.DictWriter(f, fieldnames=headers)
                writer.writeheader()
                writer.writerows(bikes)
                
            logger.info(f"Successfully saved {len(bikes)} bikes to {filename}")
            return True
            
        except Exception as e:
            logger.error(f"Error saving bikes to {filename}: {e}")
            return False
    
    def extract_and_save(self, html_file=None, output_file=None):
        """Extract and save bikes from HTML file or clipboard"""
        bikes = []
        
        if html_file:
            bikes = self.extract_from_file(html_file)
        else:
            bikes = self.extract_from_clipboard()
            
        if not bikes:
            logger.warning("No bikes were extracted")
            return False
            
        if not output_file:
            output_file = os.path.join(self.output_dir, f"extracted_bikes_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv")
            
        return self.save_bikes_csv(bikes, output_file)

def main():
    """Main entry point for the script"""
    parser = argparse.ArgumentParser(description='Direct Bike Extractor')
    
    parser.add_argument('--file', type=str, help='HTML file to extract from')
    parser.add_argument('--output', type=str, help='Output CSV file')
    parser.add_argument('--output-dir', type=str, default='extracted_bikes', help='Output directory')
    parser.add_argument('--clipboard', action='store_true', help='Extract from clipboard content')
    
    args = parser.parse_args()
    
    extractor = DirectBikeExtractor(output_dir=args.output_dir)
    
    if args.clipboard or not args.file:
        logger.info("Extracting from clipboard")
        success = extractor.extract_and_save(output_file=args.output)
    else:
        logger.info(f"Extracting from file: {args.file}")
        success = extractor.extract_and_save(html_file=args.file, output_file=args.output)
    
    if success:
        print("Extraction completed successfully!")
    else:
        print("Extraction failed or no bikes were found.")

if __name__ == "__main__":
    main()
