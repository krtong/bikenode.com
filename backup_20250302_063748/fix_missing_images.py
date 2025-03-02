#!/usr/bin/env python3
"""
Fix missing images in the scraped bike data
This script visits bike URLs and attempts to extract images that might have been missed
"""
import os
import sys
import json
import csv
import time
import argparse
import re
from urllib.parse import urljoin
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By

def setup_browser(headless=True):
    """Setup and return a browser instance"""
    options = Options()
    
    if headless:
        options.add_argument('--headless')
        
    options.add_argument("--disable-blink-features=AutomationControlled")
    options.add_argument("--window-size=1920,1080")
    
    # Use a realistic user agent
    user_agent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    options.add_argument(f"--user-agent={user_agent}")
    
    # Disable automation flags
    options.add_experimental_option("excludeSwitches", ["enable-automation"])
    options.add_experimental_option("useAutomationExtension", False)
    
    browser = webdriver.Chrome(options=options)
    browser.execute_cdp_cmd("Page.addScriptToEvaluateOnNewDocument", {
        "source": '''
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined
            });
        '''
    })
    
    return browser

def load_bike_data(filename):
    """Load bike data from CSV or JSON file"""
    ext = os.path.splitext(filename)[1].lower()
    
    if ext == '.csv':
        bikes = []
        with open(filename, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                bikes.append(row)
        return bikes
    elif ext == '.json':
        with open(filename, 'r', encoding='utf-8') as f:
            return json.load(f)
    else:
        print(f"Unsupported file extension: {ext}")
        return None

def extract_images_from_page(browser, url):
    """Extract images from a bike page"""
    print(f"Visiting: {url}")
    
    try:
        browser.get(url)
        # Wait for page to load
        time.sleep(5)
        
        # List to store image URLs
        images = []
        
        # Find main product images
        try:
            # Look for product image containers first
            image_selectors = [
                "img.product-image", 
                ".product-image img",
                ".product-gallery img",
                ".bike-image img",
                ".gallery img",
                "img[src*='bike']",
                "img[src*='bikes']",
                "img[src*='product']"
            ]
            
            for selector in image_selectors:
                img_elements = browser.find_elements(By.CSS_SELECTOR, selector)
                if img_elements:
                    for img in img_elements:
                        src = img.get_attribute("src")
                        if src and "placeholder" not in src.lower() and "loading" not in src.lower():
                            images.append(src)
                    
                    # If we found images with this selector, stop trying others
                    if images:
                        break
            
            # If we didn't find product images, take any reasonably sized images
            if not images:
                all_images = browser.find_elements(By.TAG_NAME, "img")
                for img in all_images:
                    try:
                        # Check if image is reasonably sized (not tiny icons)
                        width = img.get_attribute("width")
                        height = img.get_attribute("height")
                        src = img.get_attribute("src")
                        
                        if src and (
                            (width and int(width) > 200) or 
                            (height and int(height) > 200) or
                            ("bike" in src.lower() or "product" in src.lower())
                        ):
                            images.append(src)
                    except:
                        pass
        except Exception as e:
            print(f"Error finding images: {e}")
        
        # Make sure all URLs are absolute
        base_url = url
        images = [urljoin(base_url, img) for img in images]
        
        return list(set(images))  # Return unique images
        
    except Exception as e:
        print(f"Error processing {url}: {e}")
        return []

def fix_missing_images(input_file, output_file, max_bikes=None, headless=True):
    """Process the bike data file and add missing images"""
    bikes = load_bike_data(input_file)
    
    if not bikes:
        print("No bike data loaded")
        return False
    
    print(f"Loaded {len(bikes)} bikes from {input_file}")
    
    # Limit number of bikes to process if specified
    if max_bikes and max_bikes < len(bikes):
        bikes = bikes[:max_bikes]
        print(f"Limited to processing {max_bikes} bikes")
    
    # Count bikes without images
    bikes_without_images = [bike for bike in bikes if not bike.get("image_url")]
    print(f"Found {len(bikes_without_images)} bikes without images")
    
    # Setup browser
    browser = setup_browser(headless=headless)
    
    try:
        # Process bikes without images
        processed = 0
        updated = 0
        
        for bike in bikes_without_images:
            processed += 1
            url = bike.get("url")
            
            if not url:
                continue
            
            if processed % 10 == 0 or processed == len(bikes_without_images):
                print(f"Progress: {processed}/{len(bikes_without_images)}")
            
            # Get images from page
            images = extract_images_from_page(browser, url)
            
            # Update bike data if we found images
            if images:
                bike["image_url"] = images[0]  # Primary image
                if len(images) > 1:
                    bike["additional_images"] = json.dumps(images[1:])
                updated += 1
            
            # Pause between requests
            time.sleep(2)
        
        print(f"\nFinished processing. Updated {updated} out of {len(bikes_without_images)} bikes without images.")
        
        # Save updated data
        ext = os.path.splitext(output_file)[1].lower()
        
        if ext == '.csv':
            fieldnames = set()
            for bike in bikes:
                fieldnames.update(bike.keys())
                
            with open(output_file, 'w', newline='', encoding='utf-8') as f:
                writer = csv.DictWriter(f, fieldnames=sorted(list(fieldnames)))
                writer.writeheader()
                for bike in bikes:
                    writer.writerow(bike)
        elif ext == '.json':
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(bikes, f, indent=2)
        else:
            print(f"Unsupported output file extension: {ext}")
            return False
        
        print(f"Saved updated data to {output_file}")
        return True
        
    except Exception as e:
        print(f"Error: {e}")
        return False
        
    finally:
        # Clean up
        browser.quit()
        print("Browser closed")

def main():
    parser = argparse.ArgumentParser(description="Fix missing images in bike data")
    parser.add_argument("input_file", help="Input CSV or JSON file with bike data")
    parser.add_argument("--output", help="Output file (default: adds _with_images suffix)")
    parser.add_argument("--max", type=int, help="Maximum number of bikes to process")
    parser.add_argument("--visible", action="store_true", help="Make browser visible (not headless)")
    args = parser.parse_args()
    
    if not os.path.exists(args.input_file):
        print(f"Error: Input file {args.input_file} not found")
        return 1
    
    # Default output filename if not specified
    if not args.output:
        base, ext = os.path.splitext(args.input_file)
        args.output = f"{base}_with_images{ext}"
    
    print("=" * 70)
    print("FIXING MISSING IMAGES FOR BIKE DATA")
    print("=" * 70)
    print(f"Input file:  {args.input_file}")
    print(f"Output file: {args.output}")
    print("=" * 70)
    
    success = fix_missing_images(
        args.input_file, 
        args.output, 
        max_bikes=args.max, 
        headless=not args.visible
    )
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())
