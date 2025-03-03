#!/usr/bin/env python3
"""
Complete bike extraction script with robust error handling and retry mechanisms
for extracting bikes from 99spokes.com for all years and brands.
"""
import os
import sys
import time
import json
import random
import logging
import argparse
import re
from datetime import datetime
from urllib.parse import urljoin, urlparse, parse_qs, quote
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, WebDriverException, NoSuchElementException

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler("complete_extraction.log"),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

class BikeScraper:
    """Complete bike scraper with robust error handling and retry mechanisms"""
    
    def __init__(self, headless=False, debug_screenshots=False, output_dir="bike_data"):
        """Initialize the bike scraper with browser configuration"""
        self.headless = headless
        self.debug_screenshots = debug_screenshots
        self.output_dir = output_dir
        self.driver = None
        self.bikes = []
        self.visited_urls = set()
        self.challenge_count = 0
        self.max_retries = 3
        
        # Create output directory
        os.makedirs(output_dir, exist_ok=True)
        os.makedirs(os.path.join(output_dir, "screenshots"), exist_ok=True)
        
        # Progress tracking
        self.progress_file = os.path.join(output_dir, "bike_scraper_progress.json")
        self.progress = self._load_progress() or {
            "processed_brands": [],
            "processed_years": [],
            "processed_brand_year_pairs": [],
            "visited_urls": [],
            "total_bikes": 0,
            "last_updated": None
        }
        
        # Initialize browser
        self._init_browser()
    
    def _init_browser(self):
        """Initialize the browser with proper settings to avoid detection"""
        options = Options()
        
        # Window size and basic settings
        options.add_argument("--window-size=1920,1080")
        options.add_argument("--disable-blink-features=AutomationControlled")
        
        # Only use headless if specified and not in debug mode
        if self.headless and not self.debug_screenshots:
            options.add_argument('--headless')
        
        # Use a realistic user agent
        user_agent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
        options.add_argument(f"--user-agent={user_agent}")
        
        # Disable automation flags
        options.add_experimental_option("excludeSwitches", ["enable-automation"])
        options.add_experimental_option("useAutomationExtension", False)
        
        # Initialize the browser
        self.driver = webdriver.Chrome(options=options)
        
        # Set page load timeout
        self.driver.set_page_load_timeout(30)
        
        # Make the window bigger
        self.driver.maximize_window()
        
        # Anti-detection measures
        self.driver.execute_cdp_cmd("Page.addScriptToEvaluateOnNewDocument", {
            "source": '''
                Object.defineProperty(navigator, 'webdriver', {
                    get: () => undefined
                });
                
                // Overwrite the 'plugins' property
                Object.defineProperty(navigator, 'plugins', {
                    get: () => [1, 2, 3, 4, 5]
                });
                
                // Overwrite the 'languages' property
                Object.defineProperty(navigator, 'languages', {
                    get: () => ['en-US', 'en']
                });
            '''
        })
    
    def _load_progress(self):
        """Load progress from file"""
        if os.path.exists(self.progress_file):
            try:
                with open(self.progress_file, 'r') as f:
                    progress = json.load(f)
                logger.info(f"Loaded existing progress with {progress.get('total_bikes', 0)} bikes")
                
                # Restore visited URLs set
                if "visited_urls" in progress:
                    self.visited_urls = set(progress["visited_urls"])
                
                return progress
            except Exception as e:
                logger.error(f"Error loading progress: {e}")
        return None
    
    def _save_progress(self):
        """Save current progress"""
        try:
            # Update progress data
            self.progress["total_bikes"] = len(self.bikes)
            self.progress["last_updated"] = datetime.now().isoformat()
            self.progress["visited_urls"] = list(self.visited_urls)
            
            with open(self.progress_file, 'w') as f:
                json.dump(self.progress, f, indent=2)
            
            logger.info(f"Saved progress to {self.progress_file}")
        except Exception as e:
            logger.error(f"Error saving progress: {e}")
    
    def navigate_to_url(self, url, retry_count=0, wait_time=5):
        """Navigate to URL with error handling and retries"""
        if url in self.visited_urls:
            logger.info(f"URL already visited: {url}")
            return False
        
        logger.info(f"Navigating to: {url}")
        
        try:
            # Add a small random delay before navigation
            time.sleep(random.uniform(1, 3))
            
            # Send the navigation request
            self.driver.get(url)
            
            # Wait for the page to load
            time.sleep(wait_time)
            
            # Take screenshot if debug enabled
            if self.debug_screenshots:
                self._take_screenshot(f"page_{urlparse(url).path.replace('/', '_')}")
            
            # Mark as visited
            self.visited_urls.add(url)
            
            # Check for security challenge
            if self._is_challenge_page():
                logger.warning("Security challenge detected")
                
                # Increase challenge count
                self.challenge_count += 1
                
                # Take a screenshot of the challenge
                self._take_screenshot(f"challenge_{self.challenge_count}")
                
                # Handle the challenge
                challenge_resolved = self._handle_challenge()
                
                if not challenge_resolved and retry_count < self.max_retries:
                    # Try again with backoff
                    backoff = (retry_count + 1) * 5
                    logger.info(f"Challenge not resolved, retrying in {backoff} seconds...")
                    time.sleep(backoff)
                    return self.navigate_to_url(url, retry_count + 1, wait_time)
                elif not challenge_resolved:
                    logger.error(f"Failed to resolve challenge after {self.max_retries} attempts")
                    return False
            
            # Check if page loaded successfully
            page_loaded = "99spokes" in self.driver.title.lower()
            
            if not page_loaded and retry_count < self.max_retries:
                # Try again with backoff
                backoff = (retry_count + 1) * 5
                logger.info(f"Page not loaded correctly, retrying in {backoff} seconds...")
                time.sleep(backoff)
                return self.navigate_to_url(url, retry_count + 1, wait_time)
            
            return page_loaded
            
        except TimeoutException:
            logger.warning(f"Timeout loading {url}")
            if retry_count < self.max_retries:
                backoff = (retry_count + 1) * 5
                logger.info(f"Retrying in {backoff} seconds...")
                time.sleep(backoff)
                return self.navigate_to_url(url, retry_count + 1, wait_time * 1.5)
            return False
            
        except WebDriverException as e:
            logger.error(f"WebDriver error navigating to {url}: {e}")
            if retry_count < self.max_retries:
                backoff = (retry_count + 1) * 5
                logger.info(f"Retrying in {backoff} seconds...")
                time.sleep(backoff)
                
                # For severe errors, try restarting the browser
                if "chrome not reachable" in str(e).lower():
                    logger.warning("Chrome not reachable, restarting browser...")
                    self._restart_browser()
                
                return self.navigate_to_url(url, retry_count + 1, wait_time)
            return False
            
        except Exception as e:
            logger.error(f"Error navigating to {url}: {e}")
            if retry_count < self.max_retries:
                backoff = (retry_count + 1) * 5
                logger.info(f"Retrying in {backoff} seconds...")
                time.sleep(backoff)
                return self.navigate_to_url(url, retry_count + 1, wait_time)
            return False
    
    def _restart_browser(self):
        """Restart the browser in case of severe errors"""
        try:
            if self.driver:
                self.driver.quit()
        except:
            pass
        
        # Reinitialize
        self._init_browser()
    
    def _is_challenge_page(self):
        """Check if the current page is a security challenge"""
        # Check page title
        title = self.driver.title.lower()
        challenge_indicators = ["security check", "checking your browser", "just a moment"]
        if any(indicator in title for indicator in challenge_indicators):
            return True
        
        # Check page content
        try:
            body_text = self.driver.find_element(By.TAG_NAME, "body").text.lower()
            if any(indicator in body_text for indicator in challenge_indicators):
                return True
            
            # Look for CloudFlare or other security elements
            challenge_elements = self.driver.find_elements(
                By.XPATH, 
                "//*[contains(text(), 'security') or contains(text(), 'challenge') or contains(text(), 'verify')]"
            )
            
            for element in challenge_elements:
                element_text = element.text.lower()
                if "verify you are human" in element_text or "security check" in element_text:
                    return True
        except:
            pass
        
        return False
    
    def _handle_challenge(self, timeout=300):
        """Handle security challenge with user intervention or automated methods"""
        logger.warning("Handling security challenge")
        
        # Make sure the browser is visible
        try:
            self.driver.maximize_window()
        except:
            pass
        
        # Take a screenshot of the challenge
        self._take_screenshot("challenge_before_handling")
        
        # Alert the user
        print("\n" + "=" * 80)
        print("⚠️  SECURITY CHALLENGE DETECTED  ⚠️")
        print("=" * 80)
        print("Please solve the security challenge in the browser window.")
        print("The script will continue once the challenge is completed.")
        print("=" * 80)
        
        # Wait for manual resolution
        start_time = time.time()
        while time.time() - start_time < timeout:
            # Take periodic screenshots if debug enabled
            if self.debug_screenshots and int(time.time() - start_time) % 10 == 0:
                self._take_screenshot(f"challenge_wait_{int(time.time() - start_time)}")
            
            # Check if the challenge is still present
            if not self._is_challenge_page():
                logger.info("Challenge resolved successfully")
                
                # Take a screenshot after resolution
                self._take_screenshot("challenge_resolved")
                
                # Small delay to let the page load fully
                time.sleep(5)
                
                return True
                
            # Wait before checking again
            time.sleep(2)
        
        logger.error("Challenge not resolved within timeout period")
        return False
    
    def _take_screenshot(self, name):
        """Take a screenshot of the current page"""
        if not self.debug_screenshots:
            return
        
        try:
            filename = os.path.join(
                self.output_dir, 
                "screenshots", 
                f"{name}_{int(time.time())}.png"
            )
            self.driver.save_screenshot(filename)
            logger.info(f"Saved screenshot to {filename}")
        except Exception as e:
            logger.error(f"Error taking screenshot: {e}")
    
    def extract_by_year(self, year):
        """Extract bikes for a specific year"""
        logger.info(f"Extracting bikes for year {year}")
        
        # Check if year was already processed
        if str(year) in self.progress.get("processed_years", []):
            logger.info(f"Year {year} already processed, skipping")
            return []
        
        # URL for bike listing by year
        url = f"https://99spokes.com/bikes?year={year}"
        
        if not self.navigate_to_url(url):
            logger.error(f"Failed to navigate to bikes page for year {year}")
            return []
        
        # Check if there are any bikes for this year
        if self._is_empty_result_page():
            logger.info(f"No bikes found for year {year}")
            return []
        
        # Extract bikes
        bikes = self._extract_bikes_from_listing(year=year)
        
        # Mark year as processed
        self.progress.setdefault("processed_years", []).append(str(year))
        self._save_progress()
        
        return bikes
    
    def extract_by_brand(self, year, brand, maker_id=None):
        """Extract bikes for a specific brand and year"""
        logger.info(f"Getting bikes for brand {brand} in year {year}")
        
        # Generate brand key for tracking progress
        brand_key = brand.lower().replace(' ', '-')
        pair_key = f"{brand_key}|{year}"
        
        # Check if this brand-year combination was already processed
        if pair_key in self.progress.get("processed_brand_year_pairs", []):
            logger.info(f"Brand {brand} for year {year} already processed, skipping")
            return []
        
        # Construct URL
        # Try with maker ID if provided, otherwise use the brand name
        if maker_id:
            url = f"https://99spokes.com/bikes?year={year}&makerId={maker_id}"
        else:
            # URL encode the brand name properly
            encoded_brand = quote(brand)
            url = f"https://99spokes.com/bikes?year={year}&brand={encoded_brand}"
        
        # Try alternate URL format if the primary format doesn't work
        if not self.navigate_to_url(url):
            logger.warning(f"Failed with primary URL format for {brand}, trying alternate format")
            
            # Try alternate format
            encoded_brand = quote(brand.lower())
            alt_url = f"https://99spokes.com/bikes?year={year}&make={encoded_brand}"
            
            if not self.navigate_to_url(alt_url):
                logger.error(f"Failed to navigate to bikes page for brand {brand}")
                return []
        
        # Check if there are any bikes for this brand and year
        if self._is_empty_result_page():
            logger.info(f"No bikes found for {brand} in {year}")
            
            # Mark as processed even if no bikes were found
            self.progress.setdefault("processed_brand_year_pairs", []).append(pair_key)
            self._save_progress()
            
            return []
        
        # Extract bikes from the listing
        bikes = self._extract_bikes_from_listing(year=year, brand=brand)
        
        # Mark brand-year as processed
        self.progress.setdefault("processed_brand_year_pairs", []).append(pair_key)
        self._save_progress()
        
        return bikes
    
    def _is_empty_result_page(self):
        """Check if the current page shows no results"""
        try:
            # Check for common "no results" indicators
            no_results_phrases = [
                "no bikes match", 
                "no results", 
                "we couldn't find any", 
                "0 bikes found"
            ]
            
            body_text = self.driver.find_element(By.TAG_NAME, "body").text.lower()
            
            return any(phrase in body_text for phrase in no_results_phrases)
        except:
            return False
    
    def _extract_bikes_from_listing(self, year=None, brand=None):
        """Extract bikes from a listing page"""
        bikes = []
        bike_links = []
        
        try:
            # Find all bike links on the page
            bike_elements = self.driver.find_elements(
                By.XPATH, 
                "//a[contains(@href, '/bikes/') and not(contains(@href, '/bikes?'))]"
            )
            
            # Extract URLs
            for element in bike_elements:
                try:
                    url = element.get_attribute("href")
                    if url and "/bikes/" in url and "/bikes?" not in url:
                        bike_links.append(url)
                except:
                    continue
            
            # Remove duplicates
            bike_links = list(set(bike_links))
            
            logger.info(f"Found {len(bike_links)} bike links on the page")
            
            # Extract details for each bike
            for i, link in enumerate(bike_links):
                if i > 0 and i % 5 == 0:
                    logger.info(f"Processed {i}/{len(bike_links)} bikes")
                    
                    # Save progress periodically
                    self._save_progress()
                
                try:
                    # Extract bike details
                    bike_data = self._extract_bike_details(link, year, brand)
                    
                    if bike_data:
                        bikes.append(bike_data)
                        self.bikes.append(bike_data)
                        
                    # Add a small delay between requests
                    time.sleep(random.uniform(1, 3))
                    
                except Exception as e:
                    logger.error(f"Error extracting bike details from {link}: {e}")
            
            logger.info(f"Extracted {len(bikes)} bikes")
            return bikes
            
        except Exception as e:
            logger.error(f"Error extracting bikes from listing page: {e}")
            return bikes
    
    def _extract_bike_details(self, url, year=None, brand=None):
        """Extract detailed information about a bike from its page"""
        if not self.navigate_to_url(url):
            logger.error(f"Failed to navigate to bike URL: {url}")
            return None
        
        try:
            # Basic bike data
            bike_data = {
                "url": url,
                "scraped_at": datetime.now().isoformat()
            }
            
            # Add year and brand if provided
            if year:
                bike_data["year"] = year
            if brand:
                bike_data["brand"] = brand
            
            # Extract information from the URL
            url_parts = url.split('/')
            if len(url_parts) >= 5:
                # Try to extract brand and year from URL
                for i, part in enumerate(url_parts):
                    if part.isdigit() and len(part) == 4 and i > 0 and i+1 < len(url_parts):
                        # Likely a year
                        if "year" not in bike_data:
                            bike_data["year"] = part
                        
                        # The part before is likely the brand
                        if "brand" not in bike_data and i > 0:
                            bike_data["brand"] = url_parts[i-1].title()
                        
                        # The part after is likely the model
                        if i+1 < len(url_parts):
                            bike_data["model"] = url_parts[i+1].replace('-', ' ').title()
            
            # Extract page title
            bike_data["page_title"] = self.driver.title
            
            # Extract price
            try:
                price_elements = self.driver.find_elements(
                    By.XPATH, 
                    "//*[contains(text(), '$')]"
                )
                for element in price_elements:
                    try:
                        price_match = re.search(r'\$[\d,]+(\.\d{2})?', element.text)
                        if price_match:
                            bike_data["price"] = price_match.group(0)
                            break
                    except:
                        continue
            except:
                pass
            
            # Extract bike type/category
            try:
                type_elements = self.driver.find_elements(
                    By.XPATH,
                    "//dt[contains(text(), 'Type') or contains(text(), 'Category')]/following-sibling::dd[1]"
                )
                if type_elements:
                    bike_data["type"] = type_elements[0].text.strip()
            except:
                pass
                
            # Extract specifications
            specs = {}
            try:
                # Look for spec elements in various formats
                spec_elements = self.driver.find_elements(
                    By.XPATH, 
                    "//dt | //th[not(ancestor::table[contains(@class, 'geometry')])]"
                )
                
                for element in spec_elements:
                    try:
                        key = element.text.strip()
                        if key and ":" not in key:
                            # Find the matching value element
                            if element.tag_name == "dt":
                                value_elements = element.find_elements(By.XPATH, "following-sibling::dd[1]")
                            else:  # th
                                value_elements = element.find_elements(By.XPATH, "following-sibling::td[1]")
                                
                            if value_elements:
                                value = value_elements[0].text.strip()
                                if value:
                                    specs[key] = value
                    except:
                        continue
            except:
                pass
                
            # Add specs to bike data
            if specs:
                bike_data["specifications"] = specs
                
                # Extract important specs as top-level fields
                if "Type" in specs and "type" not in bike_data:
                    bike_data["type"] = specs["Type"]
                elif "Category" in specs and "type" not in bike_data:
                    bike_data["type"] = specs["Category"]
                
                if "Material" in specs:
                    bike_data["material"] = specs["Material"]
                
                if "Weight" in specs:
                    bike_data["weight"] = specs["Weight"]
            
            # Extract images
            try:
                images = []
                img_elements = self.driver.find_elements(By.TAG_NAME, "img")
                for img in img_elements:
                    try:
                        src = img.get_attribute("src")
                        if src and ("bike" in src.lower() or "product" in src.lower()) and not any(s in src.lower() for s in ["icon", "logo", "placeholder"]):
                            # Check if reasonably sized
                            width = img.get_attribute("width")
                            if width and int(width) > 100:
                                images.append(src)
                    except:
                        continue
                
                # Deduplicate and add to bike data
                images = list(set(images))
                if images:
                    bike_data["image_url"] = images[0]
                    if len(images) > 1:
                        bike_data["additional_images"] = images[1:]
            except:
                pass
            
            logger.info(f"Extracted details for bike: {bike_data.get('brand', 'Unknown')} {bike_data.get('model', 'Unknown')}")
            return bike_data
            
        except Exception as e:
            logger.error(f"Error extracting bike details: {e}")
            return None
    
    def extract_by_method(self, year, method="year"):
        """Extract bikes using the specified method"""
        if method == "year":
            logger.info(f"Processing by year for {year}")
            return self.extract_by_year(year)
        elif method == "brand":
            logger.info(f"Processing by brands for year {year}")
            
            # Get list of brands
            brands = self.get_brands()
            bikes = []
            
            # Process each brand
            for i, brand in enumerate(brands):
                logger.info(f"Processing brand {i+1}/{len(brands)}: {brand}")
                brand_bikes = self.extract_by_brand(year, brand)
                bikes.extend(brand_bikes)
                
                # Save intermediate progress
                self._save_progress()
                
                # Save interim results every few brands
                if (i+1) % 3 == 0:
                    self.save_bikes_to_csv(bikes, f"bikes_{year}_brand_progress_{i+1}.csv")
                    logger.info(f"Saved intermediate progress: {len(bikes)} bikes after {i+1} brands")
                
                # Add pause between brands
                time.sleep(random.uniform(2, 5))
            
            logger.info(f"Completed processing by brands for {year}. Found {len(bikes)} bikes.")
            return bikes
        else:
            logger.error(f"Unknown extraction method: {method}")
            return []
    
    def get_brands(self):
        """Get list of bike brands"""
        logger.info("Getting list of bike brands")
        
        # Try to navigate to brands page
        if not self.navigate_to_url("https://99spokes.com/brands"):
            logger.error("Failed to navigate to brands page")
            return self._get_fallback_brands()
        
        try:
            # Wait for brand links to load
            time.sleep(3)
            
            # Find all brand links
            brand_elements = self.driver.find_elements(
                By.XPATH, 
                "//a[contains(@href, '/brands/')]"
            )
            
            brands = []
            for element in brand_elements:
                try:
                    brand_name = element.text.strip()
                    if brand_name and len(brand_name) >= 2:
                        brands.append(brand_name)
                except:
                    pass
            
            # Remove duplicates and sort
            brands = sorted(list(set(brands)))
            
            if brands:
                logger.info(f"Found {len(brands)} brands")
                return brands
            else:
                logger.warning("No brands found on brands page")
                return self._get_fallback_brands()
                
        except Exception as e:
            logger.error(f"Error getting brands: {e}")
            return self._get_fallback_brands()
    
    def _get_fallback_brands(self):
        """Return a fallback list of popular brands"""
        logger.warning("Using fallback list of brands")
        
        brands = [
            "Specialized", "Trek", "Cannondale", "Giant", "Santa-Cruz", "Canyon", 
            "BMC", "Cervelo", "Scott", "Kona", "Salsa", "Surly", "Orbea", 
            "Liv", "Felt", "Fuji", "GT", "Ibis", "Jamis", "Marin", "Norco", 
            "Pivot", "Polygon", "Pinarello", "Yeti", "Raleigh", "Diamondback",
            "Cinelli", "Colnago", "Bianchi", "Focus", "Cube", "Niner", "Devinci"
        ]
        
        logger.info(f"Using {len(brands)} fallback brands")
        return brands
    
    def save_bikes_to_csv(self, bikes, filename):
        """Save bikes to CSV file"""
        if not bikes:
            logger.warning(f"No bikes to save to {filename}")
            return False
            
        try:
            import csv
            
            # Collect all field names across all bikes
            all_fields = set()
            for bike in bikes:
                for key in bike.keys():
                    if key != "specifications" and key != "additional_images":
                        all_fields.add(key)
                
                # Handle specifications
                if "specifications" in bike and isinstance(bike["specifications"], dict):
                    for spec_key in bike["specifications"].keys():
                        all_fields.add(f"spec_{spec_key}")
            
            # Write to CSV file
            with open(os.path.join(self.output_dir, filename), 'w', newline='', encoding='utf-8') as f:
                writer = csv.DictWriter(f, fieldnames=sorted(all_fields))
                writer.writeheader()
                
                for bike in bikes:
                    # Create row with basic fields
                    row = {k: v for k, v in bike.items() if k != "specifications" and k != "additional_images"}
                    
                    # Add specifications with prefix
                    if "specifications" in bike and isinstance(bike["specifications"], dict):
                        for spec_key, spec_value in bike["specifications"].items():
                            row[f"spec_{spec_key}"] = spec_value
                    
                    # Handle additional images
                    if "additional_images" in bike and isinstance(bike["additional_images"], list):
                        row["additional_images"] = "|".join(bike["additional_images"])
                    
                    writer.writerow(row)
            
            logger.info(f"Saved {len(bikes)} bikes to {filename}")
            return True
            
        except Exception as e:
            logger.error(f"Error saving bikes to CSV: {e}")
            return False
    
    def save_bikes_to_json(self, bikes, filename):
        """Save bikes to JSON file"""
        if not bikes:
            logger.warning(f"No bikes to save to {filename}")
            return False
            
        try:
            with open(os.path.join(self.output_dir, filename), 'w', encoding='utf-8') as f:
                json.dump(bikes, f, indent=2)
                
            logger.info(f"Saved {len(bikes)} bikes to {filename}")
            return True
            
        except Exception as e:
            logger.error(f"Error saving bikes to JSON: {e}")
            return False
    
    def close(self):
        """Close the browser"""
        try