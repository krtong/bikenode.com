#!/usr/bin/env python3
"""
Hierarchical bike scraper for 99spokes.com that captures the complete taxonomy:
  Year > Brand (makerId) > Family > Bike/Build > Specifications
"""
import os
import sys
import time
import json
import csv
import logging
import argparse
import re
from datetime import datetime
from urllib.parse import urljoin, urlparse, parse_qs
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler("hierarchical_scraper.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class HierarchicalBikeScraper:
    """
    Scraper class that extracts bikes following the complete taxonomy:
    Year > Brand > Family > Bike/Build > Specifications
    """
    
    def __init__(self, headless=False, debug_screenshots=False):
        """Initialize the hierarchical scraper with browser configuration"""
        options = Options()
        options.add_argument("--disable-blink-features=AutomationControlled")
        options.add_argument("--window-size=1920,1080")
        
        # Use a realistic user agent
        user_agent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
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
        
        self.debug_screenshots = debug_screenshots
        if debug_screenshots:
            os.makedirs("debug_screenshots", exist_ok=True)
            
        # Data storage
        self.all_bikes = []
        self.brands = []
        self.families = []
        self.year_data = {}  # Organized data by year
        
        # Progress tracking
        self.progress_file = "hierarchical_progress.json"
        self.current_progress = {
            "processed_brands": [],
            "processed_families": [],
            "current_year": None,
            "total_bikes": 0
        }

    def navigate_to_url(self, url, wait_time=5):
        """Navigate to a URL and handle page loading"""
        logger.info(f"Navigating to: {url}")
        
        try:
            self.driver.get(url)
            
            # Wait for page to load
            time.sleep(wait_time)
            
            # Save screenshot if debug enabled
            if self.debug_screenshots:
                clean_url = url.replace(":", "_").replace("/", "_").replace("?", "_")
                self.driver.save_screenshot(f"debug_screenshots/page_{clean_url[:30]}_{int(time.time())}.png")
                
            # Check for challenge page
            if self.is_challenge_page():
                logger.warning("Detected security challenge page")
                self.handle_challenge()
                
            # Check if page loaded successfully
            return "99spokes" in self.driver.title.lower()
            
        except Exception as e:
            logger.error(f"Error navigating to {url}: {e}")
            return False
    
    def is_challenge_page(self):
        """Check if the current page is a security challenge"""
        page_title = self.driver.title.lower()
        challenge_indicators = ["security check", "checking your browser", "just a moment"]
        
        # Enhanced detection methods
        if any(indicator in page_title for indicator in challenge_indicators):
            return True
            
        # Check for CloudFlare or other security service elements
        try:
            challenge_elements = self.driver.find_elements(By.XPATH, 
                "//*[contains(text(), 'security') or contains(text(), 'challenge') or contains(text(), 'verify')]")
            if challenge_elements:
                for element in challenge_elements:
                    if "verify you are human" in element.text.lower() or "security check" in element.text.lower():
                        return True
        except:
            pass
            
        return False
    
    def handle_challenge(self, timeout=300):
        """Handle security challenge with manual intervention if needed"""
        print("\n" + "=" * 80)
        print("⚠️  SECURITY CHALLENGE DETECTED  ⚠️")
        print("=" * 80)
        print("Please solve the security challenge in the browser window.")
        print("The script will continue once the challenge is completed.")
        print("=" * 80)
        
        # Make browser window visible for manual intervention
        self.driver.maximize_window()
        
        start_time = time.time()
        while time.time() - start_time < timeout:
            if not self.is_challenge_page():
                logger.info("Challenge resolved successfully")
                return True
            time.sleep(2)
        
        logger.error("Challenge not resolved within timeout period")
        return False
    
    def get_all_brands(self):
        """Get complete list of bike brands with their IDs"""
        logger.info("Fetching all bike brands with their IDs")
        
        # Navigate to bikes page
        if not self.navigate_to_url("https://99spokes.com/bikes"):
            logger.error("Failed to navigate to bikes page")
            return []
            
        brands = []
        
        try:
            # Try to open the brand filter dropdown
            brand_filter_buttons = self.driver.find_elements(By.XPATH, "//button[contains(., 'Brand') or contains(., 'Make')]")
            
            if brand_filter_buttons:
                # Click the filter button to show brands
                brand_filter_buttons[0].click()
                time.sleep(2)
                
                # Find brand checkboxes in the dropdown
                brand_elements = self.driver.find_elements(By.XPATH, "//div[contains(@class, 'dropdown') or contains(@class, 'popover')]//label")
                
                # Extract brand information
                for element in brand_elements:
                    try:
                        brand_name = element.text.strip()
                        
                        # Skip non-brand items
                        if not brand_name or brand_name.isdigit() or len(brand_name) < 2:
                            continue
                            
                        # Try to find the checkbox with value (usually contains makerId)
                        checkbox = element.find_element(By.XPATH, ".//input[@type='checkbox']")
                        maker_id = checkbox.get_attribute("value")
                        
                        # If we found a valid makerId
                        if maker_id:
                            brand_entry = {
                                "name": brand_name,
                                "maker_id": maker_id,
                                "url": f"https://99spokes.com/bikes?makerId={maker_id}"
                            }
                            brands.append(brand_entry)
                    except Exception as e:
                        pass  # Skip problematic elements
                
                # Close dropdown by clicking elsewhere
                self.driver.find_element(By.TAG_NAME, "body").click()
        except Exception as e:
            logger.error(f"Error extracting brands from filter: {e}")
        
        # If we couldn't get brands from filter, try alternate method
        if not brands:
            logger.info("Trying alternate method to get brands")
            brands = self.get_brands_alternate_method()
        
        logger.info(f"Found {len(brands)} brands")
        self.brands = brands
        return brands
    
    def get_brands_alternate_method(self):
        """Get brands using alternate method (from brands page)"""
        if not self.navigate_to_url("https://99spokes.com/brands"):
            return self.get_fallback_brands()
            
        try:
            # Wait for brand links to load
            time.sleep(3)
            
            # Find all brand links
            brand_elements = self.driver.find_elements(By.XPATH, "//a[contains(@href, '/brands/')]")
            
            brands = []
            for element in brand_elements:
                try:
                    brand_name = element.text.strip()
                    brand_url = element.get_attribute("href")
                    
                    # Skip empty or invalid names
                    if not brand_name or len(brand_name) < 2:
                        continue
                    
                    # Extract the brand slug from URL
                    brand_slug = brand_url.split("/brands/")[-1].strip("/") if "/brands/" in brand_url else None
                    
                    if brand_slug:
                        brands.append({
                            "name": brand_name,
                            "maker_id": brand_slug,  # Use slug as makerId
                            "url": f"https://99spokes.com/bikes?makerId={brand_slug}"
                        })
                except Exception as e:
                    logger.error(f"Error processing brand element: {e}")
            
            return brands
            
        except Exception as e:
            logger.error(f"Error getting brands from brands page: {e}")
            return self.get_fallback_brands()
    
    def get_fallback_brands(self):
        """Use a hardcoded list of popular brands as fallback"""
        logger.warning("Using fallback list of brands")
        
        major_brands = [
            "specialized", "trek", "cannondale", "giant", "santa-cruz", "canyon", 
            "bmc", "cervelo", "scott", "kona", "salsa", "surly", "orbea", 
            "liv", "felt", "fuji", "gt", "ibis", "jamis", "marin", "norco", 
            "pivot", "polygon", "pinarello", "yeti", "raleigh", "diamondback",
            "cinelli", "colnago", "bianchi", "focus", "cube", "niner", "devinci"
        ]
        
        brands = []
        for brand_slug in major_brands:
            name = brand_slug.title()
            brands.append({
                "name": name,
                "maker_id": brand_slug,
                "url": f"https://99spokes.com/bikes?makerId={brand_slug}"
            })
        
        logger.info(f"Using {len(brands)} fallback brands")
        return brands
    
    def get_families_for_brand(self, brand, year):
        """Get all bike families for a specific brand and year"""
        logger.info(f"Getting families for brand {brand['name']} in year {year}")
        
        # Construct URL with makerId and year filters
        url = f"https://99spokes.com/bikes?year={year}&makerId={brand['maker_id']}"
        
        if not self.navigate_to_url(url):
            logger.error(f"Failed to navigate to bikes page for brand {brand['name']}")
            return []
            
        # Check if there are any bikes for this brand and year
        if "no bikes match" in self.driver.page_source.lower():
            logger.info(f"No bikes found for {brand['name']} in {year}")
            return []
            
        # Find all family links on page
        family_links = self.driver.find_elements(By.XPATH, "//a[contains(@href, 'family=')]")
        families = []
        
        for link in family_links:
            try:
                href = link.get_attribute("href")
                if not href or "family=" not in href:
                    continue
                    
                # Extract family parameter from URL
                parsed_url = urlparse(href)
                query_params = parse_qs(parsed_url.query)
                
                if "family" in query_params:
                    family_value = query_params["family"][0]
                    
                    # Extract family name from link text or URL
                    family_name = link.text.strip()
                    if not family_name:
                        # If no text, try to extract from family parameter
                        family_name = family_value.split("-")[-1].replace("-", " ").title()
                    
                    # Create family entry with hierarchical information
                    family = {
                        "name": family_name,
                        "brand": brand["name"],
                        "brand_id": brand["maker_id"],
                        "year": year,
                        "family_id": family_value,
                        "url": href
                    }
                    
                    # Only add if not already in list (based on family_id)
                    if not any(f["family_id"] == family_value for f in families):
                        families.append(family)
            except Exception as e:
                logger.error(f"Error processing family link: {e}")
                
        logger.info(f"Found {len(families)} families for {brand['name']}")
        return families
    
    def get_bikes_from_family(self, family):
        """Get individual bike models/builds from a family page"""
        logger.info(f"Getting bike models from family: {family['name']}")
        
        if not self.navigate_to_url(family["url"]):
            logger.error(f"Failed to navigate to family URL: {family['url']}")
            return []
        
        try:
            # Find bike detail links - they typically follow this pattern
            bike_links = self.driver.find_elements(By.XPATH, "//a[contains(@href, '/bikes/') and not(contains(@href, '/bikes?'))]")
            
            # Extract unique valid bike URLs
            bikes = []
            seen_urls = set()
            
            for link in bike_links:
                try:
                    href = link.get_attribute("href")
                    
                    # Make sure it's a valid bike detail URL
                    if not href or "/bikes/" not in href or "/bikes?" in href or href in seen_urls:
                        continue
                        
                    seen_urls.add(href)
                    
                    # Basic bike data including the hierarchy
                    bike_basic = {
                        "url": href,
                        "brand": family["brand"],
                        "brand_id": family["brand_id"],
                        "family": family["name"],
                        "family_id": family["family_id"],
                        "year": family["year"]
                    }
                    
                    # Extract model name from URL
                    url_parts = href.split('/')
                    if len(url_parts) >= 5:
                        # Typical URL format: /bikes/brand/year/model
                        for i, part in enumerate(url_parts):
                            if part.isdigit() and len(part) == 4 and i+1 < len(url_parts):
                                bike_basic["model"] = url_parts[i+1]
                                break
                    
                    # Extract price if present in the listing
                    text_content = link.text.strip()
                    if text_content:
                        price_match = re.search(r'\$[\d,]+(\.\d{2})?', text_content)
                        if price_match:
                            bike_basic["price"] = price_match.group(0)
                    
                    bikes.append(bike_basic)
                    
                except Exception as e:
                    logger.error(f"Error processing bike link: {e}")
            
            logger.info(f"Found {len(bikes)} bike models in family {family['name']}")
            return bikes
            
        except Exception as e:
            logger.error(f"Error extracting bike models from family: {e}")
            return []
    
    def get_bike_details(self, bike_basic):
        """Extract detailed information from a bike's page"""
        logger.info(f"Extracting details from: {bike_basic['url']}")
        
        if not self.navigate_to_url(bike_basic["url"]):
            logger.error(f"Failed to navigate to bike URL: {bike_basic['url']}")
            return bike_basic  # Return basic info if can't get details
        
        try:
            # Start with basic info and enhance it
            bike_data = dict(bike_basic)
            bike_data["scraped_at"] = datetime.now().isoformat()
            bike_data["page_title"] = self.driver.title
            
            # Extract price
            try:
                price_elements = self.driver.find_elements(By.XPATH, "//*[contains(text(), '$')]")
                for element in price_elements:
                    price_match = re.search(r'\$[\d,]+(\.\d{2})?', element.text)
                    if price_match:
                        bike_data["price"] = price_match.group(0)
                        break
            except:
                pass
            
            # Extract specifications
            specs = {}
            try:
                # Look for specification tables or definition lists
                spec_elements = self.driver.find_elements(By.XPATH, "//dt | //th")
                for element in spec_elements:
                    try:
                        key = element.text.strip()
                        if key and ":" not in key:
                            # Find the matching value element
                            if element.tag_name == "dt":
                                value_element = element.find_element(By.XPATH, "following-sibling::dd[1]")
                            else:  # th
                                value_element = element.find_element(By.XPATH, "following-sibling::td[1]")
                                
                            value = value_element.text.strip()
                            if value:
                                specs[key] = value
                    except:
                        continue
            except:
                pass
            
            # Add specifications to bike data
            if specs:
                bike_data["specifications"] = specs
                
                # Extract important specs as top-level fields for easier analysis
                if "Type" in specs:
                    bike_data["type"] = specs["Type"]
                elif "Category" in specs:
                    bike_data["type"] = specs["Category"]
                    
                if "Material" in specs:
                    bike_data["material"] = specs["Material"]
                    
                if "Weight" in specs:
                    bike_data["weight"] = specs["Weight"]
            
            # Try to find images
            try:
                images = []
                img_elements = self.driver.find_elements(By.TAG_NAME, "img")
                for img in img_elements:
                    src = img.get_attribute("src")
                    if src and ("bike" in src.lower() or "product" in src.lower()) and not any(s in src.lower() for s in ["icon", "logo", "placeholder"]):
                        # Check if image is reasonably sized
                        width = img.get_attribute("width")
                        if width and int(width) > 200:
                            images.append(src)
                
                if images:
                    bike_data["image_url"] = images[0]  # Primary image
                    if len(images) > 1:
                        bike_data["additional_images"] = images[1:]
            except:
                pass
                
            return bike_data
            
        except Exception as e:
            logger.error(f"Error extracting bike details: {e}")
            return bike_basic
    
    def process_year(self, year):
        """Process all brands, families and bikes for a specific year"""
        logger.info(f"Processing all bikes for year {year}")
        
        # Update progress
        self.current_progress["current_year"] = year
        
        # Get all brands if not already loaded
        if not self.brands:
            self.brands = self.get_all_brands()
        
        # Initialize year data
        year_data = {
            "year": year,
            "brands": {},
            "families": [],
            "bikes": []
        }
        
        # Process each brand
        for brand_idx, brand in enumerate(self.brands):
            brand_key = f"{brand['maker_id']}|{year}"
            
            # Skip already processed brands if resuming
            if brand_key in self.current_progress.get("processed_brands", []):
                logger.info(f"Skipping already processed brand: {brand['name']}")
                continue
            
            logger.info(f"Processing brand {brand_idx+1}/{len(self.brands)}: {brand['name']}")
            
            try:
                # Get all families for this brand and year
                families = self.get_families_for_brand(brand, year)
                
                # Store families in year data
                if families:
                    year_data["brands"][brand["name"]] = {
                        "maker_id": brand["maker_id"],
                        "family_count": len(families)
                    }
                    year_data["families"].extend(families)
                
                # Process each family to get bikes
                for family_idx, family in enumerate(families):
                    family_key = f"{family['family_id']}|{year}"
                    
                    # Skip already processed families if resuming
                    if family_key in self.current_progress.get("processed_families", []):
                        logger.info(f"Skipping already processed family: {family['name']}")
                        continue
                    
                    logger.info(f"Processing family {family_idx+1}/{len(families)}: {family['name']}")
                    
                    try:
                        # Get bikes from this family
                        bikes = self.get_bikes_from_family(family)
                        
                        # Get detailed information for each bike
                        detailed_bikes = []
                        for bike_idx, basic_bike in enumerate(bikes):
                            if bike_idx % 5 == 0 and bike_idx > 0:
                                logger.info(f"Processed {bike_idx}/{len(bikes)} bikes in family {family['name']}")
                                
                            bike_data = self.get_bike_details(basic_bike)
                            detailed_bikes.append(bike_data)
                            
                            # Add to year data
                            year_data["bikes"].append(bike_data)
                            self.all_bikes.append(bike_data)
                        
                        # Mark family as processed
                        self.current_progress.setdefault("processed_families", []).append(family_key)
                        
                        # Save intermediate progress after each family
                        self.save_progress()
                        
                    except Exception as e:
                        logger.error(f"Error processing family {family['name']}: {e}")
                
                # Mark brand as processed
                self.current_progress.setdefault("processed_brands", []).append(brand_key)
                
                # Save intermediate progress after each brand
                self.save_progress()
                self.save_bikes_to_csv(year_data["bikes"], f"bikes_{year}_progress_{brand_idx+1}.csv")
                logger.info(f"Saved {len(year_data['bikes'])} bikes after processing {brand_idx+1} brands")
                
            except Exception as e:
                logger.error(f"Error processing brand {brand['name']}: {e}")
            
            # Pause between brands to avoid rate limiting
            time.sleep(2)
        
        # Store year data
        self.year_data[year] = year_data
        
        # Return all bikes for this year
        return year_data["bikes"]
    
    def deduplicate_bikes(self, bikes):
        """Remove duplicate bikes based on URL"""
        seen_urls = set()
        unique_bikes = []
        
        for bike in bikes:
            if bike.get("url") and bike["url"] not in seen_urls:
                seen_urls.add(bike["url"])
                unique_bikes.append(bike)
                
        logger.info(f"Deduplicated {len(bikes)} bikes to {len(unique_bikes)} unique bikes")
        return unique_bikes
    
    def save_bikes_to_csv(self, bikes, filename):
        """Save bikes to CSV file with hierarchical information preserved"""
        if not bikes:
            logger.warning(f"No bikes to save to {filename}")
            return False
            
        try:
            # Collect all possible fields
            all_fields = set()
            for bike in bikes:
                for key, value in bike.items():
                    if key != "specifications":  # Handle specs separately
                        all_fields.add(key)
                
                # Add spec keys with prefix
                if "specifications" in bike and isinstance(bike["specifications"], dict):
                    for spec_key in bike["specifications"].keys():
                        all_fields.add(f"spec_{spec_key}")
            
            with open(filename, 'w', newline='', encoding='utf-8') as csvfile:
                writer = csv.DictWriter(csvfile, fieldnames=sorted(all_fields))
                writer.writeheader()
                
                for bike in bikes:
                    # Create a flat dictionary with all fields
                    row_data = {k: v for k, v in bike.items() if k != "specifications" and k != "additional_images"}
                    
                    # Handle specifications
                    if "specifications" in bike and isinstance(bike["specifications"], dict):
                        for spec_key, spec_value in bike["specifications"].items():
                            row_data[f"spec_{spec_key}"] = spec_value
                    
                    # Handle additional images
                    if "additional_images" in bike and isinstance(bike["additional_images"], list):
                        row_data["additional_images"] = "|".join(bike["additional_images"])
                    
                    writer.writerow(row_data)
                    
            logger.info(f"Saved {len(bikes)} bikes to {filename}")
            return True
            
        except Exception as e:
            logger.error(f"Error saving to CSV {filename}: {e}")
            return False
    
    def save_hierarchical_json(self, filename):
        """Save the complete hierarchical data structure to a JSON file"""
        try:
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(self.year_data, f, indent=2)
                
            logger.info(f"Saved hierarchical data to {filename}")
            return True
            
        except Exception as e:
            logger.error(f"Error saving hierarchical JSON: {e}")
            return False
    
    def save_progress(self):
        """Save current progress to file"""
        try:
            self.current_progress["total_bikes"] = len(self.all_bikes)
            self.current_progress["last_updated"] = datetime.now().isoformat()
            
            with open(self.progress_file, 'w', encoding='utf-8') as f:
                json.dump(self.current_progress, f, indent=2)
                
            logger.info(f"Saved progress to {self.progress_file}")
            return True
            
        except Exception as e:
            logger.error(f"Error saving progress: {e}")
            return False
    
    def load_progress(self):
        """Load progress from file"""
        if os.path.exists(self.progress_file):
            try:
                with open(self.progress_file, 'r', encoding='utf-8') as f:
                    self.current_progress = json.load(f)
                    
                logger.info(f"Loaded progress from {self.progress_file}")
                return True
                
            except Exception as e:
                logger.error(f"Error loading progress: {e}")
        
        return False
    
    def close(self):
        """Close the browser"""
        try:
            self.driver.quit()
            logger.info("Browser closed")
        except:
            pass

def main():
    """Main function to run the hierarchical scraper"""
    parser = argparse.ArgumentParser(description="Extract bikes from 99spokes.com with complete hierarchy")
    parser.add_argument("--year", type=int, default=2024, help="Year to extract bikes for")
    parser.add_argument("--headless", action="store_true", help="Run in headless mode")
    parser.add_argument("--debug", action="store_true", help="Save debug screenshots")
    parser.add_argument("--output", type=str, help="Output file prefix (default: bikes_YEAR)")
    parser.add_argument("--resume", action="store_true", help="Resume from previous progress")
    parser.add_argument("--all-years", action="store_true", help="Process multiple years (2020-2024)")
    parser.add_argument("--brands", type=int, help="Limit to first N brands (for testing)")
    
    args = parser.parse_args()
    
    years_to_process = [args.year]
    if args.all_years:
        years_to_process = list(range(2020, 2025))  # 2020-2024
    
    scraper = HierarchicalBikeScraper(headless=args.headless, debug_screenshots=args.debug)
    
    try:
        if args.resume:
            scraper.load_progress()
        
        # First get all brands
        brands = scraper.get_all_brands()
        
        # Limit brands if requested
        if args.brands and args.brands < len(brands):
            brands = brands[:args.brands]
            scraper.brands = brands
            print(f"Limited to first {args.brands} brands")
        
        # Process each year
        for year in years_to_process:
            print(f"\n{'='*80}")
            print(f"PROCESSING BIKES FOR YEAR {year}")
            print(f"{'='*80}\n")
            
            bikes = scraper.process_year(year)
            
            # Save the results
            output_prefix = args.output or f"bikes_{year}"
            csv_file = f"{output_prefix}.csv"
            json_file = f"{output_prefix}.json"
            hierarchical_file = f"{output_prefix}_hierarchical.json"
            
            # Save flat CSV for easy data analysis
            scraper.save_bikes_to_csv(bikes, csv_file)
            
            # Save flat JSON for programmatic access
            with open(json_file, 'w', encoding='utf-8') as f:
                json.dump(bikes, f, indent=2)
            
            # Save hierarchical JSON with complete taxonomy
            scraper.save_hierarchical_json(hierarchical_file)
            
            print(f"\nCompleted processing for {year}")
            print(f"Found {len(bikes)} bikes")
            print(f"CSV results saved to {csv_file}")
            print(f"JSON results saved to {json_file}")
            print(f"Hierarchical data saved to {hierarchical_file}")
        
        # Save all bikes if processing multiple years
        if len(years_to_process) > 1:
            all_bikes_file = "all_bikes_hierarchical.csv"
            scraper.save_bikes_to_csv(scraper.all_bikes, all_bikes_file)
            
            all_bikes_json = "all_bikes_hierarchical.json"
            with open(all_bikes_json, 'w', encoding='utf-8') as f:
                json.dump(scraper.all_bikes, f, indent=2)
                
            print(f"All {len(scraper.all_bikes)} bikes saved to {all_bikes_file} and {all_bikes_json}")
    
    except KeyboardInterrupt:
        print("\nProcess interrupted by user")
        # Save current progress
        scraper.save_progress()
        print("Progress saved. You can resume later with --resume")
    
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        
        # Save current progress
        scraper.save_progress()
        print("Progress saved despite error. You can resume with --resume")
    
    finally:
        scraper.close()

if __name__ == "__main__":
    main()