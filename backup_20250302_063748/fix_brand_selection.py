#!/usr/bin/env python3
"""
Utility script to diagnose and fix brand selection issues in your bike scraper
"""
import os
import sys
import json
import time
import argparse
import random
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

class BrandFixer:
    def __init__(self, headless=False):
        """Initialize the BrandFixer with browser configuration"""
        options = Options()
        options.add_argument("--disable-blink-features=AutomationControlled")
        options.add_argument("--window-size=1920,1080")
        
        # Use a realistic user agent
        user_agent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"
        options.add_argument(f"--user-agent={user_agent}")
        
        if headless:
            options.add_argument('--headless')
            
        # Disable automation flags
        options.add_experimental_option("excludeSwitches", ["enable-automation"])
        options.add_experimental_option("useAutomationExtension", False)
        
        # Initialize browser
        self.driver = webdriver.Chrome(options=options)
        
        # Mask webdriver to avoid detection
        self.driver.execute_cdp_cmd("Page.addScriptToEvaluateOnNewDocument", {
            "source": '''
                Object.defineProperty(navigator, 'webdriver', {
                    get: () => undefined
                });
            '''
        })
        
        self.brands_data = {}
        self.debug_dir = "brand_debug"
        os.makedirs(self.debug_dir, exist_ok=True)

    def navigate_to_url(self, url, wait_time=5):
        """Navigate to a URL and handle page loading"""
        print(f"Navigating to: {url}")
        
        try:
            self.driver.get(url)
            time.sleep(wait_time)  # Wait for page to load
            return True
        except Exception as e:
            print(f"Error navigating to {url}: {e}")
            return False

    def extract_brands_from_filter(self):
        """Extract brand data from the brand filter on 99spokes"""
        print("Extracting brands from filter dropdown...")
        
        if not self.navigate_to_url("https://99spokes.com/bikes"):
            print("Failed to navigate to bikes page")
            return False
        
        time.sleep(3)  # Wait for filters to load
        
        try:
            # Try to find brand filter button
            brand_buttons = self.driver.find_elements(By.XPATH, 
                "//button[contains(., 'Brand') or contains(., 'Make')]")
            
            if not brand_buttons:
                print("❌ Could not find brand filter button")
                return False
            
            # Click the brand filter to open dropdown
            brand_buttons[0].click()
            time.sleep(2)  # Wait for dropdown to open
            
            self.driver.save_screenshot(os.path.join(self.debug_dir, "brand_dropdown.png"))
            
            # Find brand checkboxes or labels in the dropdown
            brand_elements = self.driver.find_elements(By.XPATH,
                "//div[contains(@class, 'dropdown') or contains(@class, 'popover')]//label")
            
            if not brand_elements:
                print("❌ No brand elements found in dropdown")
                return False
            
            print(f"Found {len(brand_elements)} brand elements")
            brands = []
            
            # Process each brand element
            for element in brand_elements:
                try:
                    brand_name = element.text.strip()
                    
                    # Skip non-brand items (like "Clear")
                    if not brand_name or brand_name.isdigit() or len(brand_name) < 2:
                        continue
                    
                    # Try to find input element with value (contains maker ID)
                    checkbox = element.find_element(By.XPATH, ".//input[@type='checkbox']")
                    maker_id = checkbox.get_attribute("value")
                    
                    # Build brand data
                    brand_data = {
                        "name": brand_name,
                        "maker_id": maker_id,
                        "slug": brand_name.lower().replace(" ", "-")
                    }
                    
                    brands.append(brand_data)
                except Exception as e:
                    # Simply skip problematic elements
                    pass
            
            # Save brands data
            self.brands_data = {brand["maker_id"]: brand for brand in brands}
            
            # Save to file
            with open(os.path.join(self.debug_dir, "extracted_brands.json"), "w") as f:
                json.dump(brands, f, indent=2)
            
            print(f"✅ Extracted {len(brands)} brands and saved to extracted_brands.json")
            return True
            
        except Exception as e:
            print(f"❌ Error extracting brands: {e}")
            return False

    def test_brand_filtering(self, num_brands=5, year=2024):
        """Test if brand filtering works correctly by trying random brands"""
        if not self.brands_data:
            if not self.extract_brands_from_filter():
                print("Failed to extract brands for testing")
                return False
        
        # Select random brands to test
        brands_to_test = random.sample(list(self.brands_data.values()), min(num_brands, len(self.brands_data)))
        
        results = []
        
        print(f"\nTesting filtering with {len(brands_to_test)} random brands for year {year}:")
        print("-" * 60)
        
        for brand in brands_to_test:
            brand_name = brand["name"]
            maker_id = brand["maker_id"]
            
            print(f"Testing brand: {brand_name} (maker_id: {maker_id})")
            
            # Construct URL with brand filter
            url = f"https://99spokes.com/bikes?year={year}&makerId={maker_id}"
            
            if not self.navigate_to_url(url):
                print(f"❌ Failed to navigate to filtered URL for {brand_name}")
                results.append({
                    "brand": brand_name,
                    "success": False,
                    "error": "Navigation failed"
                })
                continue
            
            # Take a screenshot
            screenshot_file = f"brand_{maker_id}_test.png"
            self.driver.save_screenshot(os.path.join(self.debug_dir, screenshot_file))
            
            # Check if filter worked (no "no bikes match" message)
            page_source = self.driver.page_source.lower()
            
            if "no bikes match" in page_source:
                print(f"❌ No bikes found for {brand_name}")
                results.append({
                    "brand": brand_name,
                    "success": False,
                    "error": "No bikes found"
                })
                continue
            
            # Count bike listings
            bike_links = self.driver.find_elements(By.XPATH, "//a[contains(@href, '/bikes/')]")
            valid_bike_links = [link for link in bike_links if "/bikes?" not in link.get_attribute("href")]
            
            # Check if filter worked correctly by verifying bike brands
            brand_mentioned = False
            page_text = self.driver.find_element(By.TAG_NAME, "body").text.lower()
            
            # Check for brand name in various formats
            brand_variations = [
                brand_name.lower(),
                brand_name.lower().replace(" ", "-"),
                brand_name.lower().replace("-", " ")
            ]
            
            for variation in brand_variations:
                if variation in page_text:
                    brand_mentioned = True
                    break
            
            success = len(valid_bike_links) > 0 and brand_mentioned
            
            if success:
                print(f"✅ Filter worked for {brand_name}! Found {len(valid_bike_links)} bike links")
                results.append({
                    "brand": brand_name,
                    "success": True,
                    "bikes_found": len(valid_bike_links)
                })
            else:
                print(f"⚠️ Possible issue with {brand_name} filter. Found {len(valid_bike_links)} bike links, brand mentioned: {brand_mentioned}")
                results.append({
                    "brand": brand_name,
                    "success": False,
                    "error": "Content doesn't match expected brand"
                })
        
        # Save results
        with open(os.path.join(self.debug_dir, f"brand_filter_test_results_{year}.json"), "w") as f:
            json.dump(results, f, indent=2)
        
        # Print summary
        successful = sum(1 for r in results if r["success"])
        print("\nTest Results Summary:")
        print(f"Successful filters: {successful}/{len(results)}")
        
        return successful == len(results)

    def create_brand_mapping_file(self):
        """Create a brand mapping file with validated brand information"""
        if not self.brands_data and not self.extract_brands_from_filter():
            print("Failed to extract brands")
            return False
        
        # Get existing mapping file if it exists
        mapping_file = "brand_mapping.json"
        existing_mapping = {}
        
        if os.path.exists(mapping_file):
            try:
                with open(mapping_file, "r") as f:
                    existing_mapping = json.load(f)
                print(f"Loaded existing mapping with {len(existing_mapping)} brands")
            except:
                print("Could not load existing mapping, creating new one")
        
        # Combine existing mapping with new data
        combined_mapping = dict(existing_mapping)
        
        for maker_id, brand_data in self.brands_data.items():
            # Check if brand already exists in mapping
            if maker_id in combined_mapping:
                # Update with new data if available
                combined_mapping[maker_id].update({
                    k: v for k, v in brand_data.items() 
                    if k not in combined_mapping[maker_id] or not combined_mapping[maker_id][k]
                })
            else:
                # Add new brand
                combined_mapping[maker_id] = brand_data
        
        # Add a normalized_name field to help with matching
        for maker_id, brand_data in combined_mapping.items():
            if "name" in brand_data:
                brand_data["normalized_name"] = brand_data["name"].lower().replace(" ", "-")
        
        # Save complete mapping file
        with open(mapping_file, "w") as f:
            json.dump(combined_mapping, f, indent=2)
        
        # Create a simple lookup file with just maker_id -> name
        simple_mapping = {maker_id: data["name"] for maker_id, data in combined_mapping.items()}
        
        with open("brand_lookup.json", "w") as f:
            json.dump(simple_mapping, f, indent=2)
        
        print(f"✅ Created brand mapping files with {len(combined_mapping)} brands")
        print("Full mapping: brand_mapping.json")
        print("Simple lookup: brand_lookup.json")
        
        return True

    def generate_scraper_code(self):
        """Generate code for brand handling in scrapers"""
        code = """
def get_brand_id_from_name(brand_name):
    \"\"\"Get maker_id for a brand name (useful for filtering)\"\"\"
    try:
        # Try to load brand mapping
        with open("brand_mapping.json", "r") as f:
            brand_mapping = json.load(f)
        
        # Normalize input brand name
        normalized_name = brand_name.lower().replace(" ", "-")
        
        # First try direct match with maker_id
        if normalized_name in brand_mapping:
            return normalized_name
            
        # Then try to match by normalized_name
        for maker_id, brand_data in brand_mapping.items():
            if brand_data.get("normalized_name") == normalized_name:
                return maker_id
                
        # Try to match by name
        for maker_id, brand_data in brand_mapping.items():
            if brand_data.get("name", "").lower() == brand_name.lower():
                return maker_id
    except:
        pass
        
    # Fallback: just use the normalized name
    return brand_name.lower().replace(" ", "-")

def apply_brand_filter(year, brand):
    \"\"\"Apply brand filter to URL\"\"\"
    maker_id = get_brand_id_from_name(brand)
    return f"https://99spokes.com/bikes?year={year}&makerId={maker_id}"
"""
        
        # Save the code to a file
        with open(os.path.join(self.debug_dir, "brand_helper_code.py"), "w") as f:
            f.write(code)
        
        print("\nGenerated helper code for brand handling:")
        print(f"Saved to: {os.path.join(self.debug_dir, 'brand_helper_code.py')}")
        
        return code

    def verify_all_brands_in_scrapers(self):
        """Check if all brands in our scrapers match the actual site brands"""
        if not self.brands_data and not self.extract_brands_from_filter():
            print("Failed to extract brands for verification")
            return False
        
        # Find all scraper files
        project_path = "/Users/kevintong/Documents/Code/bikenode.com"
        scraper_files = []
        
        for root, _, files in os.walk(project_path):
            for file in files:
                if file.endswith('.py') and any(x in file for x in ['scraper', 'bikes', 'extract']):
                    scraper_files.append(os.path.join(root, file))
        
        print(f"Found {len(scraper_files)} scraper files to check")
        
        # Check each file for brand references
        issues = []
        site_brands = {brand["name"].lower() for brand in self.brands_data.values()}
        site_ids = {brand["maker_id"].lower() for brand in self.brands_data.values()}
        site_slugs = {brand.get("slug", "").lower() for brand in self.brands_data.values()}
        
        for file_path in scraper_files:
            try:
                with open(file_path, 'r') as f:
                    content = f.read()
                    
                # Look for brand lists or arrays
                if "brands" in content and ("[" in content or "brands = {" in content):
                    print(f"\nAnalyzing {os.path.basename(file_path)}...")
                    
                    # Extract potential brand lists using simple pattern matching
                    try:
                        # Look for list-like patterns
                        import re
                        list_matches = re.findall(r'brands\s*=\s*\[(.*?)\]', content, re.DOTALL)
                        dict_matches = re.findall(r'brands\s*=\s*\{(.*?)\}', content, re.DOTALL)
                        
                        # Process list matches
                        if list_matches:
                            for match in list_matches:
                                # Extract strings from the list
                                strings = re.findall(r'"([^"]*)"', match) + re.findall(r"'([^']*)'", match)
                                for brand in strings:
                                    brand_lower = brand.lower()
                                    if brand_lower and len(brand_lower) > 1 and brand_lower not in site_brands and brand_lower not in site_ids and brand_lower not in site_slugs:
                                        issues.append({
                                            "file": os.path.basename(file_path),
                                            "brand": brand,
                                            "issue": "Brand not found on site"
                                        })
                                        print(f"⚠️ Brand '{brand}' in {os.path.basename(file_path)} not found on site")
                    except Exception as e:
                        print(f"Error analyzing brand lists in {file_path}: {e}")
            except Exception as e:
                print(f"Error reading file {file_path}: {e}")
        
        # Save issues to file
        if issues:
            with open(os.path.join(self.debug_dir, "brand_issues.json"), "w") as f:
                json.dump(issues, f, indent=2)
            
            print(f"\n⚠️ Found {len(issues)} brand issues. See brand_issues.json for details.")
        else:
            print("\n✅ No brand inconsistencies found!")
        
        return len(issues) == 0

    def close(self):
        """Close the browser"""
        self.driver.quit()
        print("Browser closed")

def main():
    parser = argparse.ArgumentParser(description="Fix brand selection issues in bike scrapers")
    parser.add_argument("--extract", action="store_true", help="Extract brands from the website")
    parser.add_argument("--test", action="store_true", help="Test brand filtering")
    parser.add_argument("--map", action="store_true", help="Create brand mapping files")
    parser.add_argument("--verify", action="store_true", help="Verify brands in scrapers")
    parser.add_argument("--all", action="store_true", help="Perform all operations")
    parser.add_argument("--brands", type=int, default=5, help="Number of brands to test")
    parser.add_argument("--year", type=int, default=2024, help="Year to test with")
    parser.add_argument("--visible", action="store_true", help="Make browser visible")
    
    args = parser.parse_args()
    
    # If no options specified, print help
    if not any([args.extract, args.test, args.map, args.verify, args.all]):
        parser.print_help()
        return
    
    print("\n" + "=" * 80)
    print("BRAND SELECTION FIXER FOR BIKE SCRAPERS")
    print("=" * 80)
    
    fixer = BrandFixer(headless=not args.visible)
    
    try:
        if args.all or args.extract:
            print("\n[1] Extracting brands from filter...")
            fixer.extract_brands_from_filter()
        
        if args.all or args.test:
            print("\n[2] Testing brand filtering...")
            fixer.test_brand_filtering(num_brands=args.brands, year=args.year)
        
        if args.all or args.map:
            print("\n[3] Creating brand mapping file...")
            fixer.create_brand_mapping_file()
        
        if args.all or args.verify:
            print("\n[4] Verifying brands in scrapers...")
            fixer.verify_all_brands_in_scrapers()
        
        # Generate helper code
        if args.all or args.map:
            print("\n[5] Generating helper code...")
            fixer.generate_scraper_code()
            
    finally:
        fixer.close()
        
    print("\n" + "=" * 80)
    print("Brand fixing operations completed!")
    print("=" * 80)

if __name__ == "__main__":
    main()
