#!/usr/bin/env python3
"""
Direct Bike Scraper - A resilient scraper for 99spokes.com that uses direct URL scraping
and multiple anti-detection strategies to bypass severe blocking mechanisms.
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
import requests
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
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
        logging.FileHandler("direct_scraper.log"),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

class DirectBikeScraper:
    """
    Direct bike scraper that bypasses filtering UIs by using a pattern-based URL approach
    and implements multiple anti-detection strategies
    """
    
    def __init__(self, headless=False, debug=True, output_dir="direct_bike_data"):
        """Initialize the direct bike scraper with browser configuration"""
        self.headless = headless
        self.debug = debug
        self.output_dir = output_dir
        self.driver = None
        self.bikes = []
        self.visited_urls = set()
        
        # URL patterns 
        self.DIRECT_URLS = {
            # Pattern 1: Brand model pages (most reliable)
            "brand_model": "https://99spokes.com/bikes/{brand}/{year}/{model}",
            
            # Pattern 2: Brand index page
            "brand_index": "https://99spokes.com/en/brands/{brand}",
            
            # Pattern 3: Year + brand search
            "search": "https://99spokes.com/en/search?q={brand}+{year}"
        }
        
        # Verified direct bike URLs that successfully loaded
        self.verified_bike_urls = []
        
        # Different browser profiles to rotate
        self.profiles = [
            {"user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"},
            {"user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"},
            {"user_agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"}
        ]
        
        # Retry configuration
        self.max_retries = 3
        self.min_wait = 2
        self.max_wait = 7
        self.challenge_timeout = 300
        
        # Create output directories
        os.makedirs(output_dir, exist_ok=True)
        os.makedirs(os.path.join(output_dir, "screenshots"), exist_ok=True)
        os.makedirs(os.path.join(output_dir, "by_year"), exist_ok=True)
        os.makedirs(os.path.join(output_dir, "by_brand"), exist_ok=True)
        
        # Progress tracking
        self.progress_file = os.path.join(output_dir, "direct_scraper_progress.json")
        self.progress = self._load_progress() or {
            "verified_bike_urls": [],
            "visited_urls": [],
            "total_bikes_found": 0,
            "last_updated": None
        }
        
        # Load back any saved state
        self.verified_bike_urls = self.progress.get("verified_bike_urls", [])
        self.visited_urls = set(self.progress.get("visited_urls", []))
        
        # Initialize browser
        self._init_browser()
    
    def _init_browser(self):
        """Initialize the browser with anti-detection features"""
        current_profile = random.choice(self.profiles)
        
        options = Options()
        
        # Window size and basic settings
        options.add_argument("--window-size=1920,1080") 
        options.add_argument("--disable-blink-features=AutomationControlled")
        
        # Use headless only if specified and not in debug mode
        if self.headless and not self.debug:
            options.add_argument('--headless')
        
        # Use a realistic user agent
        options.add_argument(f"--user-agent={current_profile['user_agent']}")
        
        # Add additional privacy settings
        options.add_argument("--disable-features=IsolateOrigins,site-per-process")
        options.add_argument("--disable-site-isolation-trials")
        
        # Disable automation flags
        options.add_experimental_option("excludeSwitches", ["enable-automation"])
        options.add_experimental_option("useAutomationExtension", False)
        
        # Add performance options
        options.add_argument("--dns-prefetch-disable")
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        
        # Use a custom profile directory to persist cookies between sessions
        user_dir = os.path.join(self.output_dir, "chrome_profile")
        options.add_argument(f"--user-data-dir={user_dir}")
        
        # Initialize Chrome with WebDriver manager for automatic driver updates
        try:
            service = Service(ChromeDriverManager().install())
            self.driver = webdriver.Chrome(service=service, options=options)
            
            # Set page load timeout
            self.driver.set_page_load_timeout(30)
            
            # Apply additional anti-detection measures via CDP
            self.driver.execute_cdp_cmd("Page.addScriptToEvaluateOnNewDocument", {
                "source": '''
                    // Overwrite navigator properties
                    Object.defineProperty(navigator, 'webdriver', {
                        get: () => undefined
                    });
                    
                    // Overwrite Permissions API
                    const originalQuery = window.navigator.permissions.query;
                    window.navigator.permissions.query = (parameters) => (
                        parameters.name === 'notifications' ?
                            Promise.resolve({ state: Notification.permission }) :
                            originalQuery(parameters)
                    );
                    
                    // Override plugins
                    Object.defineProperty(navigator, 'plugins', {
                        get: () => {
                            const plugins = [];
                            for (let i = 0; i < 5; i++) {
                                plugins.push({
                                    name: `Plugin ${i}`,
                                    description: `Sample plugin ${i}`,
                                    filename: `plugin${i}.dll`,
                                    length: 1
                                });
                            }
                            return plugins;
                        }
                    });
                    
                    // Override languages
                    Object.defineProperty(navigator, 'languages', {
                        get: () => ['en-US', 'en', 'fr']
                    });
                    
                    // Override hardware concurrency to look like a real device
                    Object.defineProperty(navigator, 'hardwareConcurrency', {
                        get: () => 8
                    });
                    
                    // Override platform
                    Object.defineProperty(navigator, 'platform', {
                        get: () => 'MacIntel'
                    });
                '''
            })
            
            logger.info("Browser initialized successfully")
        except Exception as e:
            logger.error(f"Error initializing browser: {e}")
            raise
    
    def _load_progress(self):
        """Load progress from file"""
        if os.path.exists(self.progress_file):
            try:
                with open(self.progress_file, 'r') as f:
                    progress = json.load(f)
                logger.info(f"Loaded existing progress with {len(progress.get('verified_bike_urls', []))} verified bike URLs")
                return progress
            except Exception as e:
                logger.error(f"Error loading progress: {e}")
        return None
    
    def _save_progress(self):
        """Save current progress"""
        try:
            # Update progress data
            self.progress["verified_bike_urls"] = self.verified_bike_urls
            self.progress["visited_urls"] = list(self.visited_urls)
            self.progress["total_bikes_found"] = len(self.bikes)
            self.progress["last_updated"] = datetime.now().isoformat()
            
            with open(self.progress_file, 'w') as f:
                json.dump(self.progress, f, indent=2)
            
            logger.info(f"Saved progress with {len(self.verified_bike_urls)} verified URLs")
        except Exception as e:
            logger.error(f"Error saving progress: {e}")
    
    def _take_screenshot(self, name):
        """Take a screenshot of the current page"""
        if not self.debug:
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
    
    def _is_challenge_page(self):
        """Check if current page is a security challenge"""
        try:
            title = self.driver.title.lower()
            challenge_indicators = [
                "security check", 
                "checking your browser", 
                "just a moment",
                "captcha",
                "detection",
                "cloudflare"
            ]
            
            # Check title
            if any(indicator in title for indicator in challenge_indicators):
                return True
                
            # Check body text
            body_text = self.driver.find_element(By.TAG_NAME, "body").text.lower()
            if any(indicator in body_text for indicator in challenge_indicators):
                return True
            
            # Check for specific elements often found in challenges
            challenge_selectors = [
                "//*[contains(text(), 'security') or contains(text(), 'challenge') or contains(text(), 'verify')]",
                "//iframe[contains(@src, 'captcha') or contains(@src, 'challenge')]",
                "//div[contains(@class, 'cf-') or contains(@id, 'cf-')]",
                "//form[contains(@action, 'captcha') or contains(@id, 'challenge-form')]"
            ]
            
            for selector in challenge_selectors:
                elements = self.driver.find_elements(By.XPATH, selector)
                if elements:
                    for elem in elements:
                        if "challenge" in elem.get_attribute("outerHTML").lower() or "captcha" in elem.get_attribute("outerHTML").lower():
                            return True
        except:
            pass
            
        return False
    
    def _handle_challenge(self):
        """Handle security challenge with user intervention"""
        logger.warning("Security challenge detected")
        self._take_screenshot("challenge_detected")
        
        # Make browser visible
        try:
            self.driver.maximize_window()
        except:
            pass
        
        # Alert the user
        print("\n" + "=" * 80)
        print("⚠️  SECURITY CHALLENGE DETECTED  ⚠️")
        print("=" * 80)
        print("Please solve the CAPTCHA in the browser window that just appeared.")
        print("The script will continue automatically once you solve it.")
        print("=" * 80)
        
        # Wait for manual resolution
        start_time = time.time()
        solved = False
        
        while time.time() - start_time < self.challenge_timeout:
            if not self._is_challenge_page():
                logger.info("Challenge has been resolved")
                self._take_screenshot("challenge_resolved")
                solved = True
                # Wait a bit to make sure page loads fully after challenge
                time.sleep(5)
                break
                
            # Wait before checking again
            time.sleep(1)
        
        if not solved:
            logger.error(f"Challenge not resolved within timeout of {self.challenge_timeout} seconds")
            
        return solved
    
    def navigate_to_url(self, url, retry_count=0, wait_time=None):
        """Navigate to URL with robust error handling and exponential backoff"""
        if url in self.visited_urls:
            logger.info(f"Skipping already visited URL: {url}")
            return False
        
        # Calculate wait time with exponential backoff
        if wait_time is None:
            wait_time = self.min_wait
        else:
            wait_time = min(self.max_wait, wait_time * 1.5)
            
        logger.info(f"Navigating to: {url}")
        
        try:
            # Add a random delay before navigation to appear more human-like
            time.sleep(random.uniform(1, 3))
            
            # Send the navigation request
            self.driver.get(url)
            
            # Wait for the page to load
            time.sleep(wait_time)
            
            # Take screenshot
            self._take_screenshot(f"page_{urlparse(url).path.replace('/', '_')}")
            
            # Mark as visited
            self.visited_urls.add(url)
            
            # Check for security challenge
            if self._is_challenge_page():
                if not self._handle_challenge():
                    if retry_count < self.max_retries:
                        logger.info(f"Retrying URL after challenge failure: {url}")
                        time.sleep(random.uniform(5, 10))  # Additional delay after challenge
                        return self.navigate_to_url(url, retry_count + 1, wait_time)
                    else:
                        logger.error(f"Failed to resolve challenge after {self.max_retries} attempts")
                        return False
            
            # Check if page loaded successfully
            if "bike" in self.driver.title.lower() or "99spokes" in self.driver.title.lower():
                logger.info(f"Successfully loaded: {url}")
                return True
            else:
                logger.warning(f"Page loaded but title doesn't contain expected keywords: {self.driver.title}")
                
                # Check if we got a valid bike page despite the title
                if self._is_valid_bike_page():
                    logger.info("Detected valid bike page content")
                    return True
                
                if retry_count < self.max_retries:
                    logger.info(f"Retrying URL: {url}")
                    time.sleep(random.uniform(5, 10))
                    return self.navigate_to_url(url, retry_count + 1, wait_time)
                else:
                    return False
                    
        except TimeoutException:
            logger.warning(f"Timeout loading URL: {url}")
            if retry_count < self.max_retries:
                time.sleep(retry_count * 5 + random.uniform(2, 5))
                return self.navigate_to_url(url, retry_count + 1, wait_time)
            return False
            
        except WebDriverException as e:
            logger.error(f"WebDriver error: {e}")
            if "chrome not reachable" in str(e).lower() or "session deleted" in str(e).lower():
                logger.warning("Chrome crashed or session lost, restarting browser")
                try:
                    self._init_browser()
                except:
                    logger.error("Failed to restart browser")
                    return False
                    
                if retry_count < self.max_retries:
                    time.sleep(5)
                    return self.navigate_to_url(url, retry_count + 1, wait_time)
            return False
            
        except Exception as e:
            logger.error(f"Error navigating to {url}: {e}")
            return False
    
    def _is_valid_bike_page(self):
        """Check if the current page has bike-related content"""
        try:
            # Look for common elements on bike pages
            bike_indicators = [
                "//h1[contains(@class, 'product') or contains(@class, 'title')]",
                "//*[contains(text(), 'Specifications') or contains(text(), 'Specs')]",
                "//*[contains(text(), 'Geometry') or contains(text(), 'Frame')]",
                "//img[contains(@src, 'bike') or contains(@alt, 'bike')]",
                "//div[contains(@class, 'product') or contains(@class, 'bike')]"
            ]
            
            for selector in bike_indicators:
                elements = self.driver.find_elements(By.XPATH, selector)
                if elements:
                    return True
                    
            # Check for bike-related terms in page content
            page_text = self.driver.find_element(By.TAG_NAME, "body").text.lower()
            bike_terms = ["frame", "fork", "wheelset", "groupset", "derailleur", "brakes", "tires"]
            
            term_count = sum(1 for term in bike_terms if term in page_text)
            if term_count >= 3:  # If at least 3 bike-related terms are found
                return True
                
        except:
            pass
            
        return False
    
    def scrape_bike_by_pattern(self, brand, year, model=None, models=None):
        """
        Try to scrape bike data using URL patterns
        
        Args:
            brand: Brand name
            year: Model year
            model: Specific model to try (optional)
            models: List of models to try (optional)
        """
        # Normalize brand for URLs
        url_brand = brand.lower().replace(" ", "-")
        
        # If no specific model is provided, try some generic model patterns
        test_models = models or []
        if not test_models and not model:
            test_models = [
                f"{brand.lower()}-{random.choice(['trail', 'road', 'mountain', 'gravel', 'endurance'])}", 
                f"{url_brand}-pro", 
                f"{url_brand}-elite",
                f"{url_brand}-comp",
                f"{url_brand}-{year}",
                "flagship",
                "carbon",
                "alloy"
            ]
        
        if model:
            test_models.insert(0, model)
            
        # First try brand model pages (most reliable direct URLs)
        for test_model in test_models:
            model_slug = test_model.lower().replace(" ", "-")
            direct_url = self.DIRECT_URLS["brand_model"].format(
                brand=url_brand, year=year, model=model_slug
            )
            
            logger.info(f"Trying direct bike URL: {direct_url}")
            if self.navigate_to_url(direct_url):
                if self._is_valid_bike_page():
                    logger.info(f"Found valid bike page: {direct_url}")
                    bike_data = self._extract_bike_details(direct_url, brand, year)
                    if bike_data:
                        self.verified_bike_urls.append(direct_url)
                        self.bikes.append(bike_data)
                        self._save_progress()
                        return bike_data
                        
        # If direct URLs fail, try brand index page
        brand_index_url = self.DIRECT_URLS["brand_index"].format(brand=url_brand)
        if self.navigate_to_url(brand_index_url):
            logger.info(f"Trying to find {year} bikes on brand index page")
            bike_links = self._extract_bike_links_from_page(filter_year=year, filter_brand=brand)
            
            if bike_links:
                logger.info(f"Found {len(bike_links)} bike links on brand index page")
                for link in bike_links[:5]:  # Try the first 5 links
                    if self.navigate_to_url(link):
                        if self._is_valid_bike_page():
                            bike_data = self._extract_bike_details(link, brand, year)
                            if bike_data:
                                self.verified_bike_urls.append(link)
                                self.bikes.append(bike_data)
                                self._save_progress()
                                return bike_data
        
        # If all else fails, try search page
        search_url = self.DIRECT_URLS["search"].format(brand=url_brand, year=year)
        if self.navigate_to_url(search_url):
            logger.info(f"Trying search page for {brand} {year}")
            bike_links = self._extract_bike_links_from_page(filter_year=year, filter_brand=brand)
            
            if bike_links:
                logger.info(f"Found {len(bike_links)} bike links on search page")
                for link in bike_links[:5]:
                    if self.navigate_to_url(link):
                        if self._is_valid_bike_page():
                            bike_data = self._extract_bike_details(link, brand, year)
                            if bike_data:
                                self.verified_bike_urls.append(link)
                                self.bikes.append(bike_data)
                                self._save_progress()
                                return bike_data
        
        logger.warning(f"Failed to find any valid bike pages for {brand} {year}")
        return None
    
    def _extract_bike_links_from_page(self, filter_year=None, filter_brand=None):
        """Extract bike links from the current page with optional filtering"""
        try:
            all_links = self.driver.find_elements(By.TAG_NAME, "a")
            bike_links = []
            
            for link in all_links:
                try:
                    href = link.get_attribute("href")
                    if not href:
                        continue
                        
                    # Check if it looks like a bike detail URL
                    if "/bikes/" in href and "/bikes?" not in href:
                        # If filtering by year/brand
                        if filter_year and str(filter_year) not in href:
                            continue
                            
                        if filter_brand:
                            brand_slug = filter_brand.lower().replace(" ", "-")
                            if brand_slug not in href.lower():
                                continue
                        
                        bike_links.append(href)
                except:
                    continue
                    
            return list(set(bike_links))  # Remove duplicates
            
        except Exception as e:
            logger.error(f"Error extracting bike links: {e}")
            return []
    
    def _extract_bike_details(self, url, brand=None, year=None):
        """Extract detailed bike information from the current page"""
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
            
            # Extract information from the URL if not provided
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
                            bike_data["brand"] = url_parts[i-1].title().replace('-', ' ')
                        
                        # The part after is likely the model
                        if i+1 < len(url_parts):
                            bike_data["model"] = url_parts[i+1].replace('-', ' ').title()
                            break
            
            # Extract page title
            bike_data["page_title"] = self.driver.title
            
            # Extract bike name/title
            try:
                title_selectors = [
                    "//h1",
                    "//h1[contains(@class, 'title')]", 
                    "//div[contains(@class, 'title')]//h1",
                    "//div[contains(@class, 'product-title')]"
                ]
                
                for selector in title_selectors:
                    title_elements = self.driver.find_elements(By.XPATH, selector)
                    if title_elements:
                        bike_data["title"] = title_elements[0].text.strip()
                        break
            except:
                pass
            
            # Extract price
            try:
                price_selectors = [
                    "//*[contains(text(), '$')]", 
                    "//span[contains(@class, 'price')]",
                    "//div[contains(@class, 'price')]"
                ]
                
                for selector in price_selectors:
                    price_elements = self.driver.find_elements(By.XPATH, selector)
                    for element in price_elements:
                        try:
                            price_match = re.search(r'\$[\d,]+(\.\d{2})?', element.text)
                            if price_match:
                                bike_data["price"] = price_match.group(0)
                                break
                        except:
                            continue
                    if "price" in bike_data:
                        break
            except:
                pass
            
            # Extract bike type/category
            try:
                type_selectors = [
                    "//dt[contains(text(), 'Type') or contains(text(), 'Category')]/following-sibling::dd[1]",
                    "//*[contains(@class, 'category')]"
                ]
                
                for selector in type_selectors:
                    type_elements = self.driver.find_elements(By.XPATH, selector)
                    if type_elements:
                        bike_data["type"] = type_elements[0].text.strip()
                        break
            except:
                pass
                
            # Extract specifications
            specs = {}
            try:
                # Try different spec element formats
                spec_selectors = [
                    "//dt", 
                    "//th[not(ancestor::table[contains(@class, 'geometry')])]",
                    "//div[contains(@class, 'specs')]//strong"
                ]
                
                for selector in spec_selectors:
                    spec_elements = self.driver.find_elements(By.XPATH, selector)
                    
                    for element in spec_elements:
                        try:
                            key = element.text.strip()
                            if key and ":" not in key:
                                # Find the matching value element based on element type
                                if element.tag_name == "dt":
                                    value_elements = element.find_elements(By.XPATH, "following-sibling::dd[1]")
                                elif element.tag_name == "th":
                                    value_elements = element.find_elements(By.XPATH, "following-sibling::td[1]")
                                else:  # div or other element
                                    value_elements = element.find_elements(By.XPATH, "following::span[1] | following::div[1]")
                                    
                                if value_elements:
                                    value = value_elements[0].text.strip()
                                    if value and key != value:
                                        specs[key] = value
                        except:
                            continue
                            
                # Try to find key-value pairs in text
                text_elements = self.driver.find_elements(
                    By.XPATH, 
                    "//div[contains(@class, 'specs') or contains(@class, 'details')]//li | //div[contains(@class, 'specs')]//p"
                )
                
                for element in text_elements:
                    try:
                        text = element.text.strip()
                        if ":" in text:
                            parts = text.split(":", 1)
                            key = parts[0].strip()
                            value = parts[1].strip()
                            if key and value:
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
                            width = img.get_attribute("width") or "0"
                            height = img.get_attribute("height") or "0"
                            try:
                                if int(width) > 100 or int(height) > 100:
                                    images.append(src)
                            except:
                                # If we can't check size, include it anyway
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
            
            logger.info(f"