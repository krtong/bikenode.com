#!/usr/bin/env python3
"""
Pattern-based Bike Scraper - A specialized scraper that extracts bike data using
direct URL patterns, bypassing the search and filtering interfaces that have strong
anti-bot measures.

This script implements advanced stealth techniques and uses a library of common URL
patterns for bike models to access data directly.
"""
import os
import sys
import time
import json
import random
import logging
import argparse
import re
import csv
from datetime import datetime
from pathlib import Path
from urllib.parse import urljoin, urlparse, parse_qs, quote

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, WebDriverException, NoSuchElementException

try:
    from webdriver_manager.chrome import ChromeDriverManager
    WEBDRIVER_MANAGER_AVAILABLE = True
except ImportError:
    WEBDRIVER_MANAGER_AVAILABLE = False

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler("pattern_scraper.log"),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

class PatternBikeScraper:
    """
    A specialized bike scraper that uses direct URL patterns to extract
    bike data, bypassing search interfaces with strong anti-bot measures.
    """
    
    def __init__(self, output_dir="pattern_bikes", headless=False, debug=True):
        self.output_dir = output_dir
        self.headless = headless
        self.debug = debug
        self.driver = None
        self.bikes = []
        self.visited_urls = set()
        self.successful_patterns = set()
        self.failed_patterns = set()
        
        # Setup directory structure
        os.makedirs(output_dir, exist_ok=True)
        os.makedirs(os.path.join(output_dir, "screenshots"), exist_ok=True)
        os.makedirs(os.path.join(output_dir, "by_brand"), exist_ok=True)
        os.makedirs(os.path.join(output_dir, "by_year"), exist_ok=True)
        
        # State tracking
        self.progress_file = os.path.join(output_dir, "pattern_scraper_state.json")
        self.state = self._load_state() or {
            "visited_urls": [],
            "successful_patterns": [],
            "failed_patterns": [],
            "successful_bike_pages": [],
            "extracted_bikes_count": 0,
            "last_updated": None
        }
        
        # Restore state
        self.visited_urls = set(self.state.get("visited_urls", []))
        self.successful_patterns = set(self.state.get("successful_patterns", []))
        self.failed_patterns = set(self.state.get("failed_patterns", []))
        
        # URL patterns for direct access to bike pages
        self.URL_PATTERNS = [
            # Standard bike detail page
            "https://99spokes.com/bikes/{brand}/{year}/{model}",
            
            # Alternate format sometimes used
            "https://99spokes.com/en/bikes/{brand}/{year}/{model}",
            
            # More generic path that might work
            "https://99spokes.com/{brand}/{year}/{model}"
        ]
        
        # Common model name patterns for popular brands
        self.MODEL_PATTERNS = {
            "specialized": [
                "stumpjumper", "rockhopper", "allez", "diverge", "roubaix", "tarmac", 
                "enduro", "epic", "chisel", "crux", "fuse", "sirrus", "turbo-levo",
                "sequoia", "crosstrail", "venge", "demo", "riprock", "pitch"
            ],
            "trek": [
                "fuel-ex", "marlin", "domane", "emonda", "madone", "checkpoint", "slash",
                "roscoe", "fx", "powerfly", "procaliber", "supercaliber", "remedy",
                "farley", "verve", "session", "rail", "crockett", "520", "x-caliber"
            ],
            "cannondale": [
                "synapse", "supersix", "caadx", "topstone", "caad", "trail", "systemsix",
                "habit", "scalpel", "slate", "quick", "bad-boy", "jekyll", "f-si", "caad12"
            ],
            "giant": [
                "tcr", "defy", "revolt", "contend", "trance", "anthem", "stance", "talon",
                "reign", "propel", "fathom", "escape", "fastroad", "explore", "xtc"
            ],
            "santa-cruz": [
                "hightower", "tallboy", "bronson", "megatower", "nomad", "chameleon",
                "bullit", "5010", "blur", "stigmata", "jackal", "v10", "highball"
            ],
            "canyon": [
                "ultimate", "aeroad", "endurace", "grail", "spectral", "neuron", "sender",
                "inflite", "exceed", "strive", "roadlite", "commuter", "speedmax", "dude"
            ],
            "bmc": [
                "teamelite", "teammachine", "roadmachine", "fourstroke", "trackmachine",
                "alpenchallenge", "twostroke", "urs", "speedfox", "timemachine", "frameset"
            ],
            "cervelo": [
                "r5", "s5", "caledonia", "aspero", "p5", "r3", "s3", "p3", "s-series",
                "r-series", "c-series", "p-series", "t4", "zht"
            ],
            # Default patterns for any brand
            "default": [
                "carbon", "alloy", "elite", "comp", "pro", "expert", "sport",
                "trail", "race", "endurance", "gravel", "road", "mountain",
                "e-bike", "electric", "hardtail", "full-suspension", "cx", "fat"
            ]
        }

        # Human profiles for randomization
        self.HUMAN_PROFILES = [
            {
                "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                "window_size": (1440, 900),
                "platform": "macOS",
            },
            {
                "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                "window_size": (1920, 1080),
                "platform": "Windows",
            },
            {
                "user_agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                "window_size": (1680, 1050),
                "platform": "Linux",
            }
        ]
        
        # Initialize browser with a random profile
        self._init_browser()
    
    def _load_state(self):
        """Load scraper state from file"""
        if os.path.exists(self.progress_file):
            try:
                with open(self.progress_file, 'r') as f:
                    return json.load(f)
            except Exception as e:
                logger.error(f"Error loading state file: {e}")
        return None
    
    def _save_state(self):
        """Save current scraper state"""
        try:
            self.state["visited_urls"] = list(self.visited_urls)
            self.state["successful_patterns"] = list(self.successful_patterns)
            self.state["failed_patterns"] = list(self.failed_patterns)
            self.state["extracted_bikes_count"] = len(self.bikes)
            self.state["last_updated"] = datetime.now().isoformat()
            
            with open(self.progress_file, 'w') as f:
                json.dump(self.state, f, indent=2)
                
            logger.debug(f"State saved to {self.progress_file}")
        except Exception as e:
            logger.error(f"Error saving state: {e}")
    
    def _init_browser(self):
        """Initialize browser with anti-detection measures"""
        # Select random profile
        profile = random.choice(self.HUMAN_PROFILES)
        
        options = Options()
        
        # Configure window size
        width, height = profile["window_size"]
        options.add_argument(f"--window-size={width},{height}")
        
        # User agent
        options.add_argument(f"--user-agent={profile['user_agent']}")
        
        # Anti-detection measures
        options.add_argument("--disable-blink-features=AutomationControlled")
        options.add_experimental_option("excludeSwitches", ["enable-automation"])
        options.add_experimental_option("useAutomationExtension", False)
        
        # Performance options
        options.add_argument("--disable-gpu")
        options.add_argument("--disable-features=IsolateOrigins,site-per-process")
        options.add_argument("--disable-site-isolation-trials")
        
        # Headless mode (not recommended for first run)
        if self.headless and not self.debug:
            options.add_argument("--headless")
        
        # Create a persistent profile to maintain cookies
        user_dir = os.path.join(self.output_dir, "chrome_profile")
        options.add_argument(f"--user-data-dir={user_dir}")
        
        # Initialize Chrome with the appropriate driver
        try:
            if WEBDRIVER_MANAGER_AVAILABLE:
                service = Service(ChromeDriverManager().install())
                self.driver = webdriver.Chrome(service=service, options=options)
            else:
                self.driver = webdriver.Chrome(options=options)
                
            # Set page load timeout
            self.driver.set_page_load_timeout(30)
            
            # Additional anti-detection measures
            self.driver.execute_cdp_cmd("Page.addScriptToEvaluateOnNewDocument", {
                "source": '''
                    // Override webdriver property
                    Object.defineProperty(navigator, 'webdriver', {
                        get: () => undefined
                    });
                    
                    // Override plugins
                    Object.defineProperty(navigator, 'plugins', {
                        get: () => {
                            const plugins = [];
                            for (let i = 0; i < 5; i++) {
                                plugins.push({
                                    name: `Plugin ${i}`,
                                    description: `Sample plugin ${i}`,
                                    filename: `plugin${i}.dll`
                                });
                            }
                            return plugins;
                        }
                    });
                    
                    // Override platform
                    Object.defineProperty(navigator, 'platform', {
                        get: () => '''' + profile['platform'] + ''''
                    });
                    
                    // Override languages
                    Object.defineProperty(navigator, 'languages', {
                        get: () => ['en-US', 'en']
                    });
                '''
            })
            
            logger.info(f"Browser initialized with {profile['platform']} profile")
            
        except Exception as e:
            logger.error(f"Error initializing browser: {e}")
            raise
    
    def _take_screenshot(self, name):
        """Take a screenshot for debugging purposes"""
        if not self.debug:
            return
        
        try:
            filename = os.path.join(
                self.output_dir, 
                "screenshots", 
                f"{name}_{int(time.time())}.png"
            )
            self.driver.save_screenshot(filename)
            logger.debug(f"Screenshot saved: {filename}")
        except Exception as e:
            logger.error(f"Error taking screenshot: {e}")
    
    def _is_challenge_page(self):
        """Check if current page is a security challenge or CAPTCHA"""
        try:
            page_title = self.driver.title.lower()
            page_content = self.driver.page_source.lower()
            
            # Common indicators of challenge pages
            challenge_indicators = [
                "security check",
                "checking your browser",
                "just a moment",
                "captcha",
                "cloudflare",
                "human verification",
                "bot detection"
            ]
            
            # Check title and page content
            for indicator in challenge_indicators:
                if indicator in page_title or indicator in page_content:
                    return True
            
            # Check for common challenge elements
            challenge_elements = [
                "//iframe[contains(@src, 'captcha') or contains(@src, 'challenge')]",
                "//form[contains(@action, 'captcha') or contains(@id, 'challenge-form')]",
                "//div[contains(@class, 'cf-browser-verification')]",
                "//div[contains(@class, 'cf-') or contains(@id, 'cf-')]"
            ]
            
            for xpath in challenge_elements:
                if self.driver.find_elements(By.XPATH, xpath):
                    return True
                    
            return False
            
        except Exception as e:
            logger.error(f"Error checking for challenge page: {e}")
            return False
    
    def _handle_challenge(self, timeout=120):
        """Handle security challenge with user intervention"""
        logger.warning("Security challenge detected")
        self._take_screenshot("challenge_detected")
        
        # Make the browser visible for manual intervention
        try:
            self.driver.maximize_window()
        except:
            pass
        
        # Notify user to solve the challenge
        print("\n" + "=" * 80)
        print("🔒 SECURITY CHALLENGE DETECTED 🔒")
        print("=" * 80)
        print("Please solve the challenge in the browser window.")
        print("The script will continue automatically once solved.")
        print("=" * 80)
        
        # Wait for challenge resolution
        start_time = time.time()
        while time.time() - start_time < timeout:
            if not self._is_challenge_page():
                logger.info("Challenge resolved successfully")
                self._take_screenshot("challenge_resolved")
                time.sleep(2)  # Wait a bit for page to fully load
                return True
                
            # Check every 1 second
            time.sleep(1)
        
        logger.error(f"Challenge not resolved within {timeout} seconds")
        return False
    
    def _is_valid_bike_page(self):
        """Check if the current page contains bike information"""
        try:
            # Page title typically contains bike info
            title = self.driver.title.lower()
            if "bike" in title or "bicycle" in title:
                return True
                
            # Check for common elements on bike pages
            bike_indicators = [
                "//h1[contains(@class, 'product-title') or contains(@class, 'bike-name')]",
                "//*[contains(text(), 'Specifications') or contains(text(), 'Specs')]",
                "//*[contains(text(), 'Geometry') or contains(text(), 'Frame Size')]",
                "//img[contains(@src, 'bike') or contains(@alt, 'bike')]"
            ]
            
            for xpath in bike_indicators:
                if self.driver.find_elements(By.XPATH, xpath):
                    return True
            
            # Check for common bike-related terms in the page content
            content = self.driver.page_source.lower()
            bike_terms = [
                "frame", "fork", "drivetrain", "groupset", "wheelset", 
                "derailleur", "crankset", "cassette", "shifters", "brakes"
            ]
            
            matches = sum(1 for term in bike_terms if term in content)
            if matches >= 3:
                return True
                
            return False
            
        except Exception as e:
            logger.error(f"Error checking if page is valid bike page: {e}")
            return False
    
    def navigate_to_url(self, url, retry_count=0):
        """Navigate to URL with robust error handling and retry logic"""
        if url in self.visited_urls:
            logger.debug(f"Already visited URL: {url}")
            return False
            
        logger.info(f"Navigating to: {url}")
        
        try:
            # Random delay before navigation
            time.sleep(random.uniform(1, 3))
            
            # Navigate to URL
            self.driver.get(url)
            
            # Mark as visited
            self.visited_urls.add(url)
            
            # Random delay after navigation to simulate reading
            time.sleep(random.uniform(2, 4))
            
            # Take screenshot if debug is enabled
            self._take_screenshot(f"page_{urlparse(url).path.replace('/', '_')}")
            
            # Check for security challenge
            if self._is_challenge_page():
                if not self._handle_challenge():
                    if retry_count < 3:
                        logger.warning(f"Retrying URL after failed challenge: {url}")
                        return self.navigate_to_url(url, retry_count + 1)
                    else:
                        return False
            
            # Check if the page loaded successfully
            if self._is_valid_bike_page():
                logger.info(f"Successfully loaded bike page: {url}")
                return True
            else:
                logger.warning(f"Page loaded but doesn't appear to be a valid bike page: {url}")
                return False
                
        except TimeoutException:
            logger.warning(f"Timeout loading {url}")
            if retry_count < 3:
                delay = random.uniform(5, 10)
                logger.info(f"Retrying in {delay:.1f} seconds...")
                time.sleep(delay)
                return self.navigate_to_url(url, retry_count + 1)
            return False
            
        except WebDriverException as e:
            logger.error(f"WebDriver error: {e}")
            if "chrome not reachable" in str(e).lower():
                logger.warning("Chrome crashed, restarting browser")
                self._init_browser()
                
                if retry_count < 3:
                    return self.navigate_to_url(url, retry_count + 1)
            return False
            
        except Exception as e:
            logger.error(f"Error navigating to {url}: {e}")
            if retry_count < 3:
                delay = random.uniform(3, 8) * (retry_count + 1)
                logger.info(f"Retrying in {delay:.1f} seconds...")
                time.sleep(delay)
                return self.navigate_to_url(url, retry_count + 1)
            return False
    
    def extract_bike_data(self, url, year=None, brand=None, model=None):
        """Extract bike data from current page"""
        try:
            # Basic bike data
            bike_data = {
                "url": url,
                "scraped_at": datetime.now().isoformat()
            }
            
            # Add known info if provided
            if year:
                bike_data["year"] = year
            if brand:
                bike_data["brand"] = brand
            if model:
                bike_data["model"] = model
                
            # Extract title
            try:
                title_elements = self.driver.find_elements(By.TAG_NAME, "h1")
                if title_elements:
                    bike_data["title"] = title_elements[0].text.strip()
            except:
                pass
            
            # Extract from URL if not provided
            if not all(k in bike_data for k in ["year", "brand", "model"]):
                url_parts = url.split("/")
                for i, part in enumerate(url_parts):
                    # Look for year (4 digit number)
                    if part.isdigit() and len(part) == 4 and 2000 <= int(part) <= 2030:
                        bike_data["year"] = part
                        
                        # Brand is typically before year
                        if i > 0 and "brand" not in bike_data:
                            brand_slug = url_parts[i-1]
                            bike_data["brand"] = brand_slug.replace("-", " ").title()
                            
                        # Model is typically after year
                        if i+1 < len(url_parts) and "model" not in bike_data:
                            model_slug = url_parts[i+1]
                            bike_data["model"] = model_slug.replace("-", " ").title()
            
            # Extract price
            try:
                price_elements = self.driver.find_elements(
                    By.XPATH, 
                    "//*[contains(text(), '$')] | //*[contains(@class, 'price')]"
                )
                for element in price_elements:
                    price_text = element.text
                    price_match = re.search(r'\$[\d,]+(\.\d{2})?', price_text)
                    if price_match:
                        bike_data["price"] = price_match.group(0)
                        break
            except:
                pass
                
            # Extract specifications
            specs = {}
            try:
                # Look for spec elements in various formats
                spec_selectors = [
                    "//dt", # Definition list terms
                    "//th", # Table headers
                    "//div[contains(@class, 'spec')]//strong"
                ]
                
                for selector in spec_selectors:
                    spec_elements = self.driver.find_elements(By.XPATH, selector)
                    
                    for element in spec_elements:
                        try:
                            key = element.text.strip()
                            if not key or ":" in key:
                                continue
                                
                            # Find corresponding value based on element type
                            if element.tag_name == "dt":
                                value_elements = element.find_elements(By.XPATH, "following-sibling::dd[1]")
                            elif element.tag_name == "th":
                                value_elements = element.find_elements(By.XPATH, "following-sibling::td[1]")
                            else:
                                value_elements = element.find_elements(By.XPATH, "following-sibling::span[1] | following-sibling::div[1]")
                                
                            if value_elements:
                                value = value_elements[0].text.strip()
                                if value:
                                    specs[key] = value
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
                    src = img.get_attribute("src")
                    if src and ("bike" in src.lower() or "product" in src.lower()):
                        # Filter out small icons and logos
                        width = img.get_attribute("width")
                        height = img.get_attribute("height")
                        
                        if width and height:
                            try:
                                if int(width) > 100 and int(height) > 100:
                                    images.append(src)
                            except:
                                images.append(src)
                        else:
                            images.append(src)
                
                # Deduplicate
                images = list(set(images))
                
                if images:
                    bike_data["image_url"] = images[0]
                    if len(images) > 1:
                        bike_data["additional_images"] = images[1:]
            except:
                pass
            
            logger.info(f"Successfully extracted data for: {bike_data.get('brand', 'Unknown')} {bike_data.get('model', 'Unknown')}")
            return bike_data
            
        except Exception as e:
            logger.error(f"Error extracting bike data: {e}")
            return None
    
    def generate_model_patterns(self, brand, year):
        """Generate model patterns to try for a specific brand and year"""
        brand_key = brand.lower().replace(' ', '-')
        
        # Get brand-specific model patterns if available, or use defaults
        model_patterns = self.MODEL_PATTERNS.get(brand_key, self.MODEL_PATTERNS["default"])
        
        # Create copies with common variants
        variants = []
        for model in model_patterns:
            variants.append(model)
            
            # Add common suffix variants
            suffixes = ["", "-comp", "-expert", "-elite", "-pro", "-sport", f"-{year}", "-carbon", "-alloy"]
            for suffix in suffixes:
                if suffix and not model.endswith(suffix):
                    variants.append(f"{model}{suffix}")
        
        # Remove duplicates and return
        return list(set(variants))
    
    def try_direct_bike_urls(self, brand, year, model_patterns=None):
        """Try direct bike URLs using pattern matching"""
        brand_slug = brand.lower().replace(' ', '-')
        
        # Get model patterns if not provided
        if model_patterns is None:
            model_patterns = self.generate_model_patterns(brand, year)
        
        successful_bikes = []
        successful_urls = []
        
        # Try each URL pattern
        for url_pattern in self.URL_PATTERNS:
            if url_pattern in self.failed_patterns:
                continue
                
            for model in model_patterns:
                # Build direct URL
                url = url_pattern.format(
                    brand=brand_slug,
                    year=year,
                    model=model
                )
                
                # Skip if already visited
                if url in self.visited_urls:
                    continue
                
                logger.info(f"Trying URL: {url}")
                if self.navigate_to_url(url):
                    if self._is_valid_bike_page():
                        # Extract data
                        bike_data = self.extract_bike_data(url, year, brand, model)
                        
                        if bike_data:
                            successful_bikes.append(bike_data)
                            successful_urls.append(url)
                            
                            # Add the pattern to successful patterns
                            self.successful_patterns.add(url_pattern)
                            
                            # Save bike to overall collection
                            self.bikes.append(bike_data)
                            
                            # Update state
                            self.state.setdefault("successful_bike_pages", []).append(url)
                            self._save_state()
                
                # Add a random delay between attempts
                time.sleep(random.uniform(3, 7))
            
            # Mark pattern as failed if no successes
            if not successful_urls and url_pattern not in self.successful_patterns:
                self.failed_patterns.add(url_pattern)
        
        return successful_bikes
    
    def process_brand_batch(self, brands, years, max_models_per_brand=5):
        """Process a batch of brands across specified years"""
        results = {}
        
        for brand in brands:
            brand_results = {}
            brand_slug = brand.lower().replace(' ', '-')
            
            # Create a directory for this brand
            brand_dir = os.path.join(self.output_dir, "by_brand", brand_slug)
            os.makedirs(brand_dir, exist_ok=True)
            
            logger.info(f"Processing brand: {brand}")
            
            for year in years:
                logger.info(f"Trying {brand} bikes from {year}")
                
                # Generate model patterns for this brand
                model_patterns = self.generate_model_patterns(brand, year)
                
                # Limit models to try (to avoid too many requests)
                models_to_try = model_patterns[:max_models_per_brand]
                
                # Try direct URLs
                bikes = self.try_direct_bike_urls(brand, year, models_to_try)
                
                if bikes:
                    # Save to year directory
                    year_dir = os.path.join(self.output_dir, "by_year", str(year))
                    os.makedirs(year_dir, exist_ok=True)
                    
                    # Save to brand-specific file
                    self._save_bikes_csv(
                        bikes, 
                        os.path.join(brand_dir, f"{brand_slug}_{year}.csv")
                    )
                    
                    # Add to overall year file
                    self._append_bikes_csv(
                        bikes,
                        os.path.join(self.output_dir, f"bikes_{year}.csv")
                    )
                    
                    brand_results[year] = bikes
            
            results[brand] = brand_results
        
        return results
    
    def _save_bikes_csv(self, bikes, filename):
        """Save list of bikes to CSV file"""
        if not bikes:
            logger.warning(f"No bikes to save to {filename}")
            return
            
        try:
            # Determine all possible fields from bike data
            all_fields = set()
            for bike in bikes:
                all_fields.update(bike.keys())
                if "specifications" in bike:
                    all_fields.update(f"spec_{key}" for key in bike["specifications"].keys())
            
            # Sort fields for consistent output
            headers = sorted(list(all_fields))
            
            # Move important fields to the front
            priority_fields = ["brand", "model", "year", "url", "price", "type", "material", "weight"]
            for field in reversed(priority_fields):
                if field in headers:
                    headers.remove(field)
                    headers.insert(0, field)
            
            with open(filename, 'w', newline='', encoding='utf-8') as f:
                writer = csv.DictWriter(f, fieldnames=headers)
                writer.writeheader()
                
                for bike in bikes:
                    row = bike.copy()
                    # Flatten specifications into top-level fields
                    if "specifications" in row:
                        specs = row.pop("specifications")
                        for key, value in specs.items():
                            row[f"spec_{key}"] = value
                    writer.writerow(row)
                    
            logger.info(f"Successfully saved {len(bikes)} bikes to {filename}")
            
        except Exception as e:
            logger.error(f"Error saving bikes to {filename}: {e}")
    
    def _append_bikes_csv(self, bikes, filename):
        """Append bikes to existing CSV file or create new one"""
        if not bikes:
            return
            
        try:
            # Check if file exists
            file_exists = os.path.isfile(filename)
            
            with open(filename, 'a+', newline='', encoding='utf-8') as f:
                # Determine headers
                if file_exists:
                    # Read existing headers
                    f.seek(0)
                    reader = csv.reader(f)
                    headers = next(reader, [])
                    
                    # Add missing headers
                    for bike in bikes:
                        for key in bike.keys():
                            if key not in headers:
                                headers.append(key)
                        if "specifications" in bike:
                            for spec_key in bike["specifications"].keys():
                                field = f"spec_{spec_key}"
                                if field not in headers:
                                    headers.append(field)
                else:
                    # Create new headers
                    all_fields = set()
                    for bike in bikes:
                        all_fields.update(bike.keys())
                        if "specifications" in bike:
                            all_fields.update(f"spec_{key}" for key in bike["specifications"].keys())
                    
                    # Sort fields for consistent output
                    headers = sorted(list(all_fields))
                    
                    # Move important fields to the front
                    priority_fields = ["brand", "model", "year", "url", "price", "type", "material", "weight"]
                    for field in reversed(priority_fields):
                        if field in headers:
                            headers.remove(field)
                            headers.insert(0, field)
                
                # Position at the end of the file
                f.seek(0, 2)
                
                writer = csv.DictWriter(f, fieldnames=headers)
                if not file_exists:
                    writer.writeheader()
                    
                for bike in bikes:
                    row = bike.copy()
                    # Flatten specifications into top-level fields
                    if "specifications" in row:
                        specs = row.pop("specifications")
                        for key, value in specs.items():
                            row[f"spec_{key}"] = value
                    writer.writerow(row)
                    
            logger.info(f"Successfully appended {len(bikes)} bikes to {filename}")
            
        except Exception as e:
            logger.error(f"Error appending bikes to {filename}: {e}")
            
    def process_family_page(self, url):
        """
        Extract data from family page that lists multiple bike models
        This is useful for when we find a URL like /bikes?year=2024&family=trek-checkpoint
        """
        if not self.navigate_to_url(url):
            return []
            
        # Look for bike cards
        bikes = []
        try:
            bike_cards = self.driver.find_elements(By.XPATH, "//a[contains(@href, '/bikes/')]")
            
            for card in bike_cards:
                try:
                    bike_url = card.get_attribute("href")
                    if bike_url:
                        # Extract details from card
                        brand_elem = card.find_elements(By.XPATH, ".//p[contains(@class, 'brand')]")
                        model_elem = card.find_elements(By.XPATH, ".//p[contains(@class, 'model')]")
                        price_elem = card.find_elements(By.XPATH, ".//p[contains(@class, 'price')]")
                        
                        brand = brand_elem[0].text.strip() if brand_elem else None
                        model = model_elem[0].text.strip() if model_elem else None
                        price_text = price_elem[0].text.strip() if price_elem else None
                        
                        # Extract year and more details from URL
                        url_parts = bike_url.split('/')
                        year = None
                        for part in url_parts:
                            if part.isdigit() and len(part) == 4 and 2000 <= int(part) <= 2030:
                                year = part
                                
                        # Create basic bike entry
                        bike = {
                            "url": bike_url,
                            "scraped_at": datetime.now().isoformat()
                        }
                        
                        if brand:
                            bike["brand"] = brand
                        if model:
                            bike["model"] = model
                        if year:
                            bike["year"] = year
                        if price_text:
                            price_match = re.search(r'\$[\d,]+(\.\d{2})?', price_text)
                            if price_match:
                                bike["price"] = price_match.group(0)
                        
                        bikes.append(bike)
                except Exception as e:
                    logger.error(f"Error processing bike card: {e}")
            
            logger.info(f"Extracted {len(bikes)} bikes from family page: {url}")
            return bikes
            
        except Exception as e:
            logger.error(f"Error processing family page: {e}")
            return []
    
    def cleanup(self):
        """Close the browser and perform cleanup"""
        try:
            self._save_state()
            if self.driver:
                self.driver.quit()
                logger.info("Browser closed")
        except Exception as e:
            logger.error(f"Error during cleanup: {e}")

    def run_from_list(self, brand_list, years_list, output_file="extracted_bikes.csv", max_models_per_brand=10):
        """Run the scraper with a list of brands and years"""
        try:
            all_bikes = []
            total_brands = len(brand_list)
            
            for i, brand in enumerate(brand_list, 1):
                logger.info(f"Processing brand {i}/{total_brands}: {brand}")
                
                for year in years_list:
                    bikes = self.try_direct_bike_urls(brand, year, max_models_per_brand=max_models_per_brand)
                    
                    if bikes:
                        all_bikes.extend(bikes)
                        # Save intermediate results
                        self._append_bikes_csv(bikes, output_file)
                    
                    # Try to find family pages for this brand
                    try:
                        brand_slug = brand.lower().replace(' ', '-')
                        family_url = f"https://99spokes.com/bikes?year={year}&brand={brand_slug}"
                        family_bikes = self.process_family_page(family_url)
                        if family_bikes:
                            all_bikes.extend(family_bikes)
                            self._append_bikes_csv(family_bikes, output_file)
                    except Exception as e:
                        logger.error(f"Error processing family page for brand {brand}: {e}")
                
                # Save progress
                self._save_state()
                    
            return all_bikes
            
        finally:
            self.cleanup()

def main():
    """Main entry point for the script"""
    parser = argparse.ArgumentParser(description='Pattern-based Bike Scraper')
    
    # Brand/Year options
    parser.add_argument('--brands', type=str, help='Comma-separated list of brands to scrape')
    parser.add_argument('--years', type=str, default='2024', help='Comma-separated list of years to scrape')
    
    # Output options
    parser.add_argument('--output', type=str, default='pattern_bikes.csv', help='Output CSV file')
    parser.add_argument('--output-dir', type=str, default='pattern_bikes', help='Output directory')
    
    # Browser options
    parser.add_argument('--headless', action='store_true', help='Run browser in headless mode')
    parser.add_argument('--debug', action='store_true', help='Enable debug mode (screenshots)')
    
    # Processing options
    parser.add_argument('--max-models', type=int, default=10, help='Maximum number of models to try per brand')
    
    args = parser.parse_args()
    
    # Process input args
    brands = [b.strip() for b in args.brands.split(',')] if args.brands else [
        "Specialized", "Trek", "Cannondale", "Giant", "Santa Cruz",
        "Canyon", "BMC", "Cervelo", "Scott", "Kona"
    ]
    
    years = [y.strip() for y in args.years.split(',')]
    
    # Initialize scraper
    scraper = PatternBikeScraper(
        output_dir=args.output_dir,
        headless=args.headless,
        debug=args.debug
    )
    
    # Run scraper
    bikes = scraper.run_from_list(
        brands,
        years,
        output_file=args.output,
        max_models_per_brand=args.max_models
    )
    
    # Print summary
    print(f"\nCompleted scraping process:")
    print(f"Processed {len(brands)} brands across {len(years)} years")
    print(f"Found {len(bikes)} bikes")
    print(f"Results saved to {args.output}")

if __name__ == "__main__":
    main()