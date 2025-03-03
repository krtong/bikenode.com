#!/usr/bin/env python3
"""
Brand-by-brand bike scraper to obtain complete bike datasets from 99spokes.com
This approach systematically goes through each brand to work around the website's display limitations
"""
import os
import sys
import time
import json
import csv
import logging
import argparse
import re
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import traceback
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler("brand_by_brand_scraper.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class BrandByScraper:
    def __init__(self, headless=False, debug_dir="debug_output"):
        """Initialize the scraper with optional headless mode"""
        options = Options()
        options.add_argument("--disable-blink-features=AutomationControlled")
        options.add_argument("--window-size=1920,1080")
        
        # Add a realistic user agent
        user_agent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        options.add_argument(f"--user-agent={user_agent}")
        
        # Disable automation flags
        options.add_experimental_option("excludeSwitches", ["enable-automation"])
        options.add_experimental_option("useAutomationExtension", False)
        
        if headless:
            options.add_argument('--headless')
            
        self.driver = webdriver.Chrome(options=options)
        
        # Executing CDP commands to prevent detection
        self.driver.execute_cdp_cmd("Page.addScriptToEvaluateOnNewDocument", {
            "source": '''
                Object.defineProperty(navigator, 'webdriver', {
                    get: () => undefined
                });
            '''
        })
        
        self.debug_dir = debug_dir
        os.makedirs(self.debug_dir, exist_ok=True)
        
        # Store progress
        self.brands_processed = set()
        self.brands_found = []
        self.all_bikes = []
        self.progress_file = "brand_scraper_progress.json"
        self.stats = {
            "total_brands": 0,
            "brands_processed": 0,
            "total_bikes": 0,
            "duplicate_bikes": 0
        }
    
    def navigate_to_url(self, url, wait_time=5, max_retries=3):
        """Navigate to URL with retry logic and smart waiting"""
        logger.info(f"Navigating to: {url}")
        
        for retry in range(max_retries):
            try:
                self.driver.get(url)
                
                # Start with a small wait and increase if needed
                for _ in range(wait_time):
                    # Check if page has loaded enough to work with
                    if len(self.driver.page_source) > 1000:
                        break
                    time.sleep(1)
                
                # Check for challenge page
                if self.is_bot_challenge_page():
                    logger.warning("Bot challenge detected. Waiting for it to resolve...")
                    if not self.handle_bot_challenge():
                        if retry < max_retries - 1:
                            logger.info(f"Retrying navigation after failed challenge (attempt {retry+1}/{max_retries})")
                            continue
                        return False
                        
                # Additional check for "Access Denied" or other errors
                if "access denied" in self.driver.page_source.lower() or "error" in self.driver.title.lower():
                    logger.warning(f"Detected access issue: {self.driver.title}")
                    if retry < max_retries - 1:
                        logger.info(f"Retrying navigation after access issue (attempt {retry+1}/{max_retries})")
                        time.sleep(5)  # Wait longer before retry
                        continue
                    return False
                
                return True
                
            except Exception as e:
                logger.error(f"Error navigating to {url}: {e}")
                if retry < max_retries - 1:
                    logger.info(f"Retrying navigation after error (attempt {retry+1}/{max_retries})")
                    time.sleep(3)
                else:
                    return False
        
        return False
    
    def is_bot_challenge_page(self):
        """Check if current page is a Cloudflare challenge"""
        page_title = self.driver.title.lower()
        title_indicators = ["just a moment", "checking your browser", "security check"]
        if any(indicator in page_title for indicator in title_indicators):
            return True
        
        # Add other detection methods if needed
        return False
    
    def handle_bot_challenge(self, timeout=300):
        """Wait for bot challenge to be solved (requires manual intervention)"""
        print("\n" + "=" * 80)
        print("⚠️  BOT CHALLENGE DETECTED  ⚠️")
        print("=" * 80)
        print("Please check the browser window and complete the security challenge.")
        print("The browser window should be visible. If not, check your taskbar.")
        print("=" * 80)
        
        # Maximize window to make it more visible
        self.driver.maximize_window()
        
        start_time = time.time()
        while time.time() - start_time < timeout:
            # Check every 2 seconds if challenge is still active
            if not self.is_bot_challenge_page():
                print("\n✅ Challenge completed successfully! Continuing...")
                return True
            time.sleep(2)
        
        print("\n❌ Timeout waiting for challenge completion.")
        return False
    
    def get_all_brands(self):
        """Get complete list of brands available on 99spokes"""
        logger.info("Getting list of all bike brands")
        
        if not self.navigate_to_url("https://99spokes.com/en-US/brands"):
            logger.error("Failed to navigate to brands page")
            return []
        
        try:
            # Wait for brand links to load
            time.sleep(5)
            
            # Find all brand links (they typically follow a particular pattern)
            brand_elements = self.driver.find_elements(By.XPATH, "//a[contains(@href, '/brands/')]")
            
            brands = []
            for element in brand_elements:
                try:
                    brand_name = element.text.strip()
                    brand_url = element.get_attribute("href")
                    
                    # Skip empty or invalid brand names
                    if not brand_name or len(brand_name) < 2:
                        continue
                        
                    # Extract the brand slug from the URL
                    brand_slug = brand_url.split("/brands/")[-1] if "/brands/" in brand_url else None
                    
                    if brand_slug:
                        brands.append({
                            "name": brand_name,
                            "slug": brand_slug,
                            "url": brand_url
                        })
                except Exception as e:
                    logger.error(f"Error processing brand element: {e}")
            
            # For backup, also try to get brands from the filter dropdown
            if not brands:
                logger.info("Trying alternative method to get brands")
                self.navigate_to_url("https://99spokes.com/bikes")
                time.sleep(3)
                
                # Try to open brand filter dropdown
                try:
                    brand_button = self.driver.find_element(By.XPATH, "//button[contains(., 'Brand') or contains(., 'Make')]")
                    brand_button.click()
                    time.sleep(1)
                    
                    # Get brand labels
                    brand_labels = self.driver.find_elements(By.XPATH, "//div[contains(@class, 'dropdown') or contains(@class, 'popover')]//label")
                    
                    for label in brand_labels:
                        brand_name = label.text.strip()
                        if brand_name and not brand_name.isdigit() and len(brand_name) > 1:
                            brand_slug = brand_name.lower().replace(" ", "-")
                            brands.append({
                                "name": brand_name,
                                "slug": brand_slug,
                                "url": f"https://99spokes.com/brands/{brand_slug}"
                            })
                except Exception as e:
                    logger.error(f"Error getting brands from filter: {e}")
            
            # If we still don't have brands, use a hardcoded list of major brands
            if not brands:
                logger.warning("Using fallback brand list")
                major_brands = ["specialized", "trek", "cannondale", "giant", "santa-cruz", "canyon", 
                               "bmc", "cervelo", "scott", "kona", "salsa", "surly", "orbea", 
                               "liv", "felt", "fuji", "gt", "ibis", "jamis", "marin", "norco", 
                               "pivot", "polygon", "pinarello", "yeti", "raleigh", "diamondback",
                               "cinelli", "colnago", "bianchi", "focus", "cube", "niner", "devinci"]
                               
                brands = [{"name": b.title(), "slug": b, "url": f"https://99spokes.com/brands/{b}"} for b in major_brands]
            
            self.brands_found = brands
            self.stats["total_brands"] = len(brands)
            logger.info(f"Found {len(brands)} bike brands")
            
            # Save list of brands to file
            with open(os.path.join(self.debug_dir, "all_brands.json"), 'w') as f:
                json.dump(brands, f, indent=2)
                
            return brands
            
        except Exception as e:
            logger.error(f"Error getting brands: {e}")
            return []
    
    def get_bikes_for_brand_year(self, brand, year):
        """Get all bikes for a specific brand and year with pagination support"""
        logger.info(f"Getting bikes for brand: {brand['name']}, year: {year}")
        
        # Construct URL with brand and year filters
        url = f"https://99spokes.com/bikes?year={year}&brand={brand['slug']}"
        all_bikes = []
        page = 1
        max_pages = 20  # Set a reasonable limit
        
        while page <= max_pages:
            page_url = f"{url}&page={page}" if page > 1 else url
            
            if not self.navigate_to_url(page_url, wait_time=7):
                logger.error(f"Failed to navigate to {page_url}")
                break
            
            # Check if there are any bikes for this brand and year
            if "no bikes match" in self.driver.page_source.lower():
                if page == 1:
                    logger.info(f"No bikes found for {brand['name']} in {year}")
                else:
                    logger.info(f"No more bikes found for {brand['name']} in {year} after page {page-1}")
                break
            
            # Take screenshot of the page for debugging
            self.driver.save_screenshot(os.path.join(self.debug_dir, f"{brand['slug']}_{year}_page{page}.png"))
            
            try:
                # Find bike links
                page_bikes = []
                
                # Try different approaches to find bike listings
                bike_elements = []
                
                # First approach: Look for elements with specific URL patterns
                bike_links = self.driver.find_elements(By.XPATH, "//a[contains(@href, '/bikes/')]")
                if bike_links:
                    for link in bike_links:
                        try:
                            href = link.get_attribute("href")
                            # Make sure it's a bike detail page, not another kind of page
                            if href and "/bikes/" in href and not "/bikes?" in href:
                                bike_elements.append(link)
                        except:
                            pass
                
                logger.info(f"Found {len(bike_elements)} bike links on page {page}")
                
                # Process each bike element
                for element in bike_elements:
                    bike_data = self._extract_bike_from_element(element, brand, year)
                    if bike_data:
                        page_bikes.append(bike_data)
                
                # Look for bike family links which can lead to more bikes
                family_links = self.driver.find_elements(By.XPATH, "//a[contains(@href, 'family=')]")
                family_urls = []
                
                for link in family_links:
                    try:
                        href = link.get_attribute("href")
                        if href and "family=" in href:
                            family_urls.append(href)
                    except:
                        continue
                
                # Log once we have all info from this page
                logger.info(f"Found {len(page_bikes)} direct bikes and {len(family_urls)} family links on page {page}")
                
                # Add bikes found on this page
                all_bikes.extend(page_bikes)
                
                # Check for pagination - try to find Next button
                next_page_exists = False
                
                # Try different methods for finding the Next button
                next_button_selectors = [
                    "//button[@aria-label='Next page']",
                    "//button[text()='Next']",
                    "//*[contains(@class, 'pagination') and (text()='Next' or text()='→')]",
                    "//a[contains(@class, 'next') or contains(text(), 'Next')]"
                ]
                
                for selector in next_button_selectors:
                    elements = self.driver.find_elements(By.XPATH, selector)
                    if elements and elements[0].is_displayed() and elements[0].is_enabled():
                        try:
                            # Scroll to make button visible
                            self.driver.execute_script("arguments[0].scrollIntoView(true);", elements[0])
                            time.sleep(1)
                            
                            # If button is not disabled, click it
                            if "disabled" not in elements[0].get_attribute("class").lower():
                                next_page_exists = True
                                break
                        except:
                            pass
                
                # If no next button found or it's disabled, we're done with pagination
                if not next_page_exists:
                    # Process family links before finishing
                    if family_urls:
                        family_bikes = self._process_family_links(family_urls, brand["name"], year)
                        all_bikes.extend(family_bikes)
                    break
                
                # Move to next page by direct URL navigation (most reliable)
                page += 1
                
            except Exception as e:
                logger.error(f"Error processing page {page}: {e}")
                break
        
        # Final deduplication
        return self._deduplicate_bikes(all_bikes)
    
    def _extract_bike_from_element(self, element, brand, year):
        """Extract bike data from an element (separated for clarity)"""
        try:
            bike_url = element.get_attribute("href")
            
            # Skip URLs that aren't bike detail pages
            if not bike_url or "/bikes?" in bike_url or "family=" in bike_url:
                return None
            
            # Basic data from the link
            bike_data = {
                "url": bike_url,
                "brand": brand["name"],
                "year": year
            }
            
            # Extract the model name from the URL if possible
            url_parts = bike_url.split('/')
            if len(url_parts) >= 5:
                try:
                    if str(year) in url_parts:
                        idx = url_parts.index(str(year))
                        if idx + 2 < len(url_parts):  # Make sure there's room for brand and model
                            bike_data["model"] = url_parts[idx + 2]
                except:
                    pass
            
            # Extract text content from the element
            text = element.text.strip()
            if text:
                # Add full text for debugging
                bike_data["listing_text"] = text
                
                # Split text into lines for structured extraction
                lines = [line.strip() for line in text.split('\n') if line.strip()]
                
                # Try to extract make and model
                if len(lines) >= 2 and "make" not in bike_data:
                    bike_data["make"] = lines[0]
                    bike_data["model"] = lines[1]
                
                # Try to extract price
                price_match = re.search(r'(\$[\d,]+(\.\d{2})?)|(\$[\d,]+—\$[\d,]+)', text)
                if price_match:
                    bike_data["price"] = price_match.group(0)
            
            return bike_data
        except Exception as e:
            logger.error(f"Error extracting bike data: {e}")
            return None
    
    def _process_family_links(self, family_urls, brand_name, year, max_families=10):
        """Process bike family links (separated for clarity)"""
        logger.info(f"Processing {min(len(family_urls), max_families)} family URLs")
        all_family_bikes = []
        
        # Process each family URL up to the limit
        for url in family_urls[:max_families]:
            try:
                family_bikes = self.get_bikes_from_family_page(url, brand_name, year)
                all_family_bikes.extend(family_bikes)
                
                # Save progress after each family
                if family_bikes:
                    self.save_progress()
                
                # Pause between families
                time.sleep(2)
            except Exception as e:
                logger.error(f"Error processing family URL {url}: {e}")
        
        return all_family_bikes
    
    def _deduplicate_bikes(self, bikes_list):
        """Deduplicate bikes based on URL"""
        unique_bikes = []
        seen_urls = set()
        
        for bike in bikes_list:
            if bike.get("url") and bike["url"] not in seen_urls:
                seen_urls.add(bike["url"])
                unique_bikes.append(bike)
                
        logger.info(f"Deduplicated {len(bikes_list)} bikes to {len(unique_bikes)}")
        return unique_bikes
    
    def get_bikes_from_family_page(self, family_url, brand_name, year):
        """Get bikes from a family page"""
        logger.info(f"Processing family page: {family_url}")
        
        if not self.navigate_to_url(family_url):
            return []
            
        time.sleep(5)
        
        # Find bike links on the family page
        bike_links = self.driver.find_elements(By.XPATH, "//a[contains(@href, '/bikes/')]")
        family_bikes = []
        
        for link in bike_links:
            try:
                bike_url = link.get_attribute("href")
                
                # Skip URLs that aren't bike detail pages
                if not bike_url or "/bikes?" in bike_url or "family=" in bike_url:
                    continue
                
                bike_data = {
                    "url": bike_url,
                    "brand": brand_name,
                    "year": year,
                    "from_family_page": True
                }
                
                # Extract text content if available
                text = link.text.strip()
                if text:
                    bike_data["listing_text"] = text
                    
                    # Try to extract price
                    price_match = re.search(r'\$[\d,]+(\.\d{2})?', text)
                    if price_match:
                        bike_data["price"] = price_match.group(0)
                
                # Only add if we have at least a URL
                if bike_data["url"]:
                    family_bikes.append(bike_data)
                    
            except Exception as e:
                logger.error(f"Error processing bike link in family page: {e}")
        
        logger.info(f"Found {len(family_bikes)} bikes in family page")
        return family_bikes
    
    def get_complete_bike_details(self, bike_basic_data):
        """Get full details for a bike by visiting its detail page"""
        url = bike_basic_data["url"]
        logger.info(f"Getting detailed info for bike: {url}")
        
        if not self.navigate_to_url(url):
            logger.error(f"Failed to navigate to bike detail page: {url}")
            return bike_basic_data  # Return what we already have
        
        try:
            # Enhanced data
            bike_data = dict(bike_basic_data)
            
            # Extract title and basic info
            try:
                bike_data["page_title"] = self.driver.title
            except:
                pass
                
            # Look for make/model if not already present
            if "brand" not in bike_data or not bike_data["brand"]:
                try:
                    # Extract from breadcrumbs or header
                    make_elements = self.driver.find_elements(By.XPATH, "//h1")
                    if make_elements:
                        text = make_elements[0].text
                        parts = text.split()
                        if len(parts) >= 2:
                            bike_data["brand"] = parts[0]
                            bike_data["model"] = " ".join(parts[1:])
                except:
                    pass
            
            # Extract price if not already present
            if "price" not in bike_data or not bike_data["price"]:
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
            try:
                # Look for specification tables or definition lists
                spec_rows = self.driver.find_elements(By.XPATH, "//dt | //dd | //th | //td")
                specs = {}
                
                # Process specification elements
                for i in range(0, len(spec_rows) - 1, 2):
                    try:
                        key = spec_rows[i].text.strip()
                        value = spec_rows[i+1].text.strip()
                        if key and value:
                            specs[key] = value
                    except:
                        continue
                
                if specs:
                    bike_data["specifications"] = specs
                    
                    # Try to extract bike type from specs
                    if "Category" in specs:
                        bike_data["type"] = specs["Category"]
                    elif "Type" in specs:
                        bike_data["type"] = specs["Type"]
            except Exception as e:
                logger.error(f"Error extracting specifications: {e}")
            
            return bike_data
                
        except Exception as e:
            logger.error(f"Error getting bike details: {e}")
            return bike_basic_data  # Return what we already have
    
    def load_progress(self):
        """Load previous progress"""
        if os.path.exists(self.progress_file):
            try:
                with open(self.progress_file, 'r') as f:
                    progress = json.load(f)
                
                if "brands_processed" in progress:
                    self.brands_processed = set(progress["brands_processed"])
                
                if "stats" in progress:
                    self.stats.update(progress["stats"])
                    
                if "all_bikes" in progress:
                    self.all_bikes = progress["all_bikes"]
                    
                logger.info(f"Loaded progress with {len(self.brands_processed)} brands already processed")
                return True
                
            except Exception as e:
                logger.error(f"Error loading progress: {e}")
        
        return False
    
    def save_progress(self, filename=None):
        """Save current progress"""
        if not filename:
            filename = self.progress_file
            
        try:
            progress = {
                "brands_processed": list(self.brands_processed),
                "stats": self.stats,
                "timestamp": datetime.now().isoformat(),
                "all_bikes": self.all_bikes
            }
            
            with open(filename, 'w') as f:
                json.dump(progress, f, indent=2)
                
            logger.info(f"Saved progress to {filename}")
            return True
            
        except Exception as e:
            logger.error(f"Error saving progress: {e}")
            return False
    
    def save_bikes_to_csv(self, bikes, filename):
        """Save list of bikes to a CSV file"""
        if not bikes:
            logger.warning(f"No bikes to save to {filename}")
            return False
            
        try:
            # Get all possible fieldnames
            all_fields = set()
            for bike in bikes:
                all_fields.update(bike.keys())
                # Include specification fields
                if "specifications" in bike and isinstance(bike["specifications"], dict):
                    for spec_key in bike["specifications"].keys():
                        all_fields.add(f"spec_{spec_key}")
            
            # Remove 'specifications' from fieldnames since we'll expand it
            if "specifications" in all_fields:
                all_fields.remove("specifications")
                
            fieldnames = sorted(list(all_fields))
            
            with open(filename, 'w', newline='', encoding='utf-8') as csvfile:
                writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
                writer.writeheader()
                
                for bike in bikes:
                    row = {k: v for k, v in bike.items() if k != 'specifications'}
                    
                    # Expand specifications into individual columns
                    if "specifications" in bike and isinstance(bike["specifications"], dict):
                        for spec_key, spec_value in bike["specifications"].items():
                            row[f"spec_{spec_key}"] = spec_value
                            
                    writer.writerow(row)
                    
            logger.info(f"Saved {len(bikes)} bikes to {filename}")
            return True
            
        except Exception as e:
            logger.error(f"Error saving bikes to CSV: {e}")
            return False
    
    def process_all_brands_for_year(self, year, brands_to_use=None, get_details=False, auto_resume=True):
        """Process all brands for a specific year with improved progress tracking"""
        logger.info(f"Processing all brands for year {year}")
        
        # Get all brands if not provided
        if not brands_to_use:
            if not self.brands_found:
                self.brands_found = self.get_all_brands()
            brands_to_use = self.brands_found
        
        if not brands_to_use:
            logger.error("No brands to process")
            return []
        
        # Load progress from existing file if auto_resume is enabled
        if auto_resume:
            self.load_progress()
        
        # Process each brand
        year_bikes = []
        bike_counter = 0
        processed_brands = 0
        
        # Create a progress tracking file
        progress_log = f"brand_progress_{year}.txt"
        with open(progress_log, 'a', encoding='utf-8') as f:
            f.write(f"\n{'-'*50}\nStarting scrape for year {year} at {datetime.now().isoformat()}\n{'-'*50}\n")
        
        for i, brand in enumerate(brands_to_use):
            # Format for console display
            brand_progress = f"[{i+1}/{len(brands_to_use)}]"
            brand_key = f"{brand['name']}|{year}"
            
            # Skip if already processed
            if brand_key in self.brands_processed:
                logger.info(f"{brand_progress} Skipping already processed brand: {brand['name']}")
                # Log to progress file
                with open(progress_log, 'a', encoding='utf-8') as f:
                    f.write(f"{brand_progress} SKIPPED: {brand['name']} (already processed)\n")
                continue
                
            logger.info(f"{brand_progress} Processing brand: {brand['name']}")
            start_time = time.time()
            
            try:
                # Get bikes for this brand and year
                brand_bikes = self.get_bikes_for_brand_year(brand, year)
                
                if brand_bikes:
                    processed_brands += 1
                    
                    # Get detailed info for each bike if requested
                    if get_details:
                        detailed_bikes = []
                        for b in brand_bikes:
                            try:
                                detailed_bike = self.get_complete_bike_details(b)
                                detailed_bikes.append(detailed_bike)
                            except Exception as e:
                                logger.error(f"Error getting details for bike: {e}")
                                detailed_bikes.append(b)  # Add with basic info
                        brand_bikes = detailed_bikes
                    
                    # Add bikes to year collection
                    year_bikes.extend(brand_bikes)
                    bike_counter += len(brand_bikes)
                    
                    # Update stats
                    self.stats["total_bikes"] = len(self.all_bikes) + len(year_bikes)
                    
                    # Log results to progress file
                    elapsed = time.time() - start_time
                    with open(progress_log, 'a', encoding='utf-8') as f:
                        f.write(f"{brand_progress} COMPLETED: {brand['name']} - Found {len(brand_bikes)} bikes in {elapsed:.1f}s\n")
                    
                else:
                    # Log no results to progress file
                    with open(progress_log, 'a', encoding='utf-8') as f:
                        f.write(f"{brand_progress} NO RESULTS: {brand['name']}\n")
                
                # Save intermediate progress based on certain conditions
                should_save = (i + 1) % 5 == 0 or i == len(brands_to_use) - 1 or len(brand_bikes) > 10
                if should_save:
                    # Save all bikes discovered so far
                    all_bikes_so_far = self.all_bikes + year_bikes
                    intermediate_file = f"bikes_{year}_progress_{i+1}_brands.csv"
                    self.save_bikes_to_csv(all_bikes_so_far, intermediate_file)
                    
                    # Save progress state
                    self.save_progress(f"brand_scraper_progress_{year}_partial.json")
                
                # Mark as processed
                self.brands_processed.add(brand_key)
                self.stats["brands_processed"] = len(self.brands_processed)
                
            except Exception as e:
                logger.error(f"Error processing brand {brand['name']}: {e}")
                # Log error to progress file
                with open(progress_log, 'a', encoding='utf-8') as f:
                    f.write(f"{brand_progress} ERROR: {brand['name']} - {str(e)}\n")
                
            # Pause between brands with variable time based on success
            time.sleep(2 if brand_bikes else 1)
        
        logger.info(f"Processed {processed_brands} brands for {year}. Found {bike_counter} bikes.")
        
        # Save full results for this year
        if year_bikes:
            self.all_bikes.extend(year_bikes)
            output_file = f"bikes_{year}_complete.csv"
            self.save_bikes_to_csv(year_bikes, output_file)
            
            # Also save a JSON version
            with open(output_file.replace('.csv', '.json'), 'w', encoding='utf-8') as f:
                json.dump(year_bikes, f, indent=2)
        
        return year_bikes
    
    def close(self):
        """Close the browser and clean up"""
        self.driver.quit()

def main():
    parser = argparse.ArgumentParser(description="Extract bikes from 99spokes.com brand by brand")
    parser.add_argument("--year", type=int, default=2024, help="Model year to extract bikes for")
    parser.add_argument("--headless", action="store_true", help="Run in headless mode")
    parser.add_argument("--all-years", action="store_true", help="Process all years from 2020-2024")
    parser.add_argument("--details", action="store_true", help="Get detailed information for each bike")
    parser.add_argument("--resume", action="store_true", help="Resume from previous progress")
    parser.add_argument("--brands", type=int, default=None, help="Limit to this many brands (for testing)")
    parser.add_argument("--skip-brands", type=int, default=0, help="Skip the first N brands (for partial runs)")
    parser.add_argument("--year-range", type=str, help="Custom year range (format: start-end, e.g., 2020-2022)")
    parser.add_argument("--shuffle", action="store_true", help="Randomize brand order")
    
    args = parser.parse_args()
    
    # Process custom year range if provided
    if args.year_range:
        try:
            start_year, end_year = map(int, args.year_range.split('-'))
            years_to_process = range(start_year, end_year + 1)
        except:
            print(f"Invalid year range format: {args.year_range}. Use format: start-end (e.g., 2020-2022)")
            return 1
    elif args.all_years:
        years_to_process = range(2020, 2025)  # 2020-2024
    else:
        years_to_process = [args.year]
    
    print(f"\n{'='*80}")
    print(f"BIKE SCRAPER - BRAND-BY-BRAND APPROACH")
    print(f"{'='*80}\n")
    print(f"Years to process: {list(years_to_process)}")
    print(f"Getting detailed info: {args.details}")
    print(f"Resume from previous run: {args.resume}")
    if args.brands:
        print(f"Limited to {args.brands} brands for testing")
    print(f"{'='*80}\n")
    
    scraper = BrandByScraper(headless=args.headless)
    
    try:
        # Load previous progress if requested
        if args.resume:
            scraper.load_progress()
        
        # Get list of all brands
        brands = scraper.get_all_brands()
        
        # Apply brand limiting options
        if args.shuffle:
            import random
            random.shuffle(brands)
            print(f"Randomized the order of {len(brands)} brands")
            
        if args.skip_brands > 0:
            brands = brands[args.skip_brands:]
            print(f"Skipping the first {args.skip_brands} brands")
            
        if args.brands and len(brands) > args.brands:
            brands = brands[:args.brands]
            print(f"Limited to the first {args.brands} brands")
        
        start_time = time.time()
        total_bikes = 0
        
        # Process each year
        for year in years_to_process:
            year_start_time = time.time()
            print(f"\n{'='*80}")
            print(f"PROCESSING YEAR: {year}")
            print(f"{'='*80}")
            
            bikes = scraper.process_all_brands_for_year(year, brands, get_details=args.details)
            total_bikes += len(bikes)
            
            year_time = time.time() - year_start_time
            print(f"✅ Completed year {year}: Found {len(bikes)} bikes in {year_time:.1f} seconds")
            
            # Save full progress after each year
            scraper.save_progress()
            
            # Create combined file for this year
            combined_file = f"bikes_{year}_final.csv"
            year_bikes = [bike for bike in scraper.all_bikes if bike.get("year") == year]
            scraper.save_bikes_to_csv(year_bikes, combined_file)
        
        # Create a combined file with all years
        all_bikes_file = "all_bikes_complete.csv"
        scraper.save_bikes_to_csv(scraper.all_bikes, all_bikes_file)
        
        total_time = time.time() - start_time
        print(f"\n{'='*80}")
        print(f"✅ All processing complete!")
        print(f"Total bikes found: {total_bikes}")
        print(f"Total processing time: {total_time:.1f} seconds")
        print(f"All results saved to {all_bikes_file}")
        print(f"{'='*80}\n")
            
    except KeyboardInterrupt:
        print("\nProcess interrupted by user")
        # Save partial progress
        scraper.save_progress("brand_scraper_progress_interrupted.json")
        print("Progress saved, you can resume later with --resume")
        
    except Exception as e:
        print(f"Error in main process: {e}")
        traceback.print_exc()
        
        # Save partial progress
        scraper.save_progress("brand_scraper_progress_error.json")
        print("Progress saved despite error, you can resume with --resume")
        
    finally:
        scraper.close()

if __name__ == "__main__":
    main()
