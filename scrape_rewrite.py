#!/usr/bin/env python3
"""
Complete rewrite of the scraper file to fix all structural issues
"""
import os
import sys
import shutil
from datetime import datetime

def rewrite_scraper():
    """Create a completely new scraper file with proper structure"""
    scraper_path = "data/bicycles/scrape.py"
    
    if not os.path.exists(os.path.dirname(scraper_path)):
        os.makedirs(os.path.dirname(scraper_path), exist_ok=True)
    
    # Create backup if file exists
    if os.path.exists(scraper_path):
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_path = f"{scraper_path}.bak_full_{timestamp}"
        try:
            shutil.copy2(scraper_path, backup_path)
            print(f"✅ Created backup of original scraper at {backup_path}")
        except Exception as e:
            print(f"Warning: Could not create backup: {e}")
            response = input("Continue without backup? (y/n): ")
            if response.lower() != 'y':
                return False
    
    # The completely rewritten file with proper structure
    new_content = """from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time
import csv
import json
import logging
import os
import random

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class NinetyNineSpokesScraper:
    def __init__(self, headless=False, debug_dir="debug_output", allow_manual_intervention=False):
        """
        Initialize the scraper with optional headless mode
        
        Args:
            headless: Whether to run in headless mode (no visible browser)
            debug_dir: Directory to save debug output
            allow_manual_intervention: Whether to allow user to manually solve challenges
        """
        options = webdriver.ChromeOptions()
        # Add options to better mimic a real browser and avoid detection
        options.add_argument("--disable-blink-features=AutomationControlled")
        options.add_argument("--window-size=1920,1080")
        
        # Add a realistic user agent
        user_agents = [
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Safari/605.1.15"
        ]
        options.add_argument(f"--user-agent={random.choice(user_agents)}")
        
        # Disable automation flags
        options.add_experimental_option("excludeSwitches", ["enable-automation"])
        options.add_experimental_option("useAutomationExtension", False)
        
        # Only use headless if specified AND manual intervention is not allowed
        # This ensures the browser is visible when manual intervention is needed
        if headless and not allow_manual_intervention:
            options.add_argument('--headless')
            
        self.driver = webdriver.Chrome(options=options)
        self.allow_manual_intervention = allow_manual_intervention
        
        # Executing CDP commands to prevent detection
        self.driver.execute_cdp_cmd("Page.addScriptToEvaluateOnNewDocument", {
            "source": '''
                Object.defineProperty(navigator, 'webdriver', {
                    get: () => undefined
                });
            '''
        })
        
        self.bikes = []
        
        # Create debug directory if it doesn't exist
        self.debug_dir = debug_dir
        os.makedirs(self.debug_dir, exist_ok=True)
    
    def is_bot_challenge_page(self):
        """
        Check if the current page is a bot challenge/protection page
        Now with improved detection to avoid false positives
        """
        page_title = self.driver.title.lower()
        
        # Check title first - most reliable indicator
        title_indicators = ["just a moment", "checking your browser", "security check"]
        if any(indicator in page_title for indicator in title_indicators):
            logger.info(f"Bot challenge detected in page title: {page_title}")
            return True
            
        # Check for specific Cloudflare challenge elements
        try:
            cf_challenge = self.driver.find_element(By.ID, "cf-challenge-running")
            if cf_challenge:
                logger.info("Bot challenge detected: found cf-challenge-running element")
                return True
        except:
            pass
            
        try:
            cf_error = self.driver.find_element(By.ID, "cf-error-details")
            if cf_error:
                logger.info("Bot challenge detected: found cf-error-details element")
                return True
        except:
            pass
        
        # Check for challenge in URL
        current_url = self.driver.current_url.lower()
        challenge_url_patterns = ["challenge", "captcha", "__cf_chl"]
        if any(pattern in current_url for pattern in challenge_url_patterns):
            logger.info(f"Bot challenge detected in URL: {current_url}")
            return True
            
        # For page content, require more specific challenge phrases
        # Simple mentions of cloudflare or robot are no longer enough
        page_source = self.driver.page_source.lower()
        strong_phrases = [
            "please complete the security check",
            "checking if the site connection is secure",
            "please wait while we verify",
            "protection system",
            "browser check"
        ]
        
        if any(phrase in page_source for phrase in strong_phrases):
            logger.info("Bot challenge detected: found strong challenge phrase in content")
            return True
            
        # If we made it here, it's a normal page (not a challenge)
        return False
        
    def wait_for_bot_challenge(self, timeout=30):
        """
        Wait for bot protection challenge to resolve, with optional manual intervention
        
        Args:
            timeout: Maximum time to wait in seconds (for automatic resolution only)
            
        Returns:
            bool: True if challenge was resolved, False otherwise
        """
        logger.info("Detected bot protection challenge.")
        
        # Take a screenshot of the challenge page
        self.driver.save_screenshot(os.path.join(self.debug_dir, "bot_challenge.png"))
        
        # If manual intervention is allowed, prompt the user
        if self.allow_manual_intervention:
            print("\n" + "=" * 80)
            print("⚠️  BOT CHALLENGE DETECTED  ⚠️")
            print("=" * 80)
            print("Please check the browser window and complete the security challenge.")
            print("Look for CAPTCHA, \"I'm not a robot\" checkbox, or other verification.")
            print("The browser window should be visible. If not, check your taskbar or application switcher.")
            print("=" * 80)
            
            # Maximize window to make it more visible
            self.driver.maximize_window()
            
            # Wait for user to manually solve the challenge
            timeout = 300  # Give user up to 5 minutes to solve it
            manual_success = False
            
            start_time = time.time()
            while time.time() - start_time < timeout:
                # Check every 2 seconds if the challenge is still active
                if not self.is_bot_challenge_page():
                    manual_success = True
                    break
                time.sleep(2)
            
            if manual_success:
                print("\n✅ Challenge completed successfully! Continuing with scraping...")
                return True
            else:
                print("\n❌ Timeout waiting for challenge completion. Please try again.")
                return False
        else:
            # Original automated waiting logic
            logger.info("Waiting for challenge to resolve automatically...")
            start_time = time.time()
            check_interval = 1.0
            
            while time.time() - start_time < timeout:
                if not self.is_bot_challenge_page():
                    elapsed = time.time() - start_time
                    logger.info(f"Bot challenge resolved after {elapsed:.2f} seconds")
                    return True
                    
                time.sleep(check_interval + random.uniform(0.1, 0.5))
                check_interval = min(check_interval * 1.2, 3.0)
                
            logger.warning(f"Bot challenge not resolved within {timeout} seconds")
            self.driver.save_screenshot(os.path.join(self.debug_dir, "bot_challenge_timeout.png"))
            return False
        
    def navigate_to_url(self, url, retry_count=2, wait_time=5):
        """
        Navigate to URL with bot protection handling and optional manual intervention
        
        Args:
            url: URL to navigate to
            retry_count: Number of retry attempts
            wait_time: Base time to wait for page load
            
        Returns:
            bool: True if navigation was successful, False otherwise
        """
        logger.info(f"Navigating to: {url}")
        
        for attempt in range(retry_count + 1):
            try:
                self.driver.get(url)
                
                # Add some randomness to appear more human-like
                time.sleep(wait_time + random.uniform(0.5, 2.0))
                
                # Check for bot protection
                if self.is_bot_challenge_page():
                    if not self.wait_for_bot_challenge():
                        if attempt < retry_count:
                            logger.info(f"Retrying navigation (attempt {attempt+1} of {retry_count})")
                            continue
                        else:
                            return False
                
                return True
                
            except Exception as e:
                logger.error(f"Error during navigation: {e}")
                if attempt < retry_count:
                    logger.info(f"Retrying navigation (attempt {attempt+1} of {retry_count})")
                else:
                    return False
                    
        return False
    
    def debug_page(self, page_num=1, prefix="debug"):
        """Capture current page state for debugging"""
        try:
            # Take screenshot
            screenshot_path = os.path.join(self.debug_dir, f"{prefix}_page{page_num}.png")
            self.driver.save_screenshot(screenshot_path)
            logger.info(f"Screenshot saved to {screenshot_path}")
            
            # Save HTML content
            html_path = os.path.join(self.debug_dir, f"{prefix}_page{page_num}.html")
            with open(html_path, 'w', encoding='utf-8') as f:
                f.write(self.driver.page_source)
            logger.info(f"HTML source saved to {html_path}")
            
            # Log basic page info
            logger.info(f"Page title: {self.driver.title}")
            
            # Print some common elements to see what's available
            element_types = ['div', 'a', 'span', 'h1', 'h2', 'article']
            for el_type in element_types:
                elements = self.driver.find_elements(By.TAG_NAME, el_type)
                logger.info(f"Found {len(elements)} {el_type} elements")
                
            # Look for elements with common class name patterns
            for class_pattern in ['bike', 'product', 'listing', 'card', 'item']:
                xpath = f"//*[contains(@class, '{class_pattern}')]"
                elements = self.driver.find_elements(By.XPATH, xpath)
                logger.info(f"Found {len(elements)} elements with class containing '{class_pattern}'")
                if len(elements) > 0 and len(elements) < 10:
                    for i, el in enumerate(elements[:3]):
                        logger.info(f"  Element {i} class: {el.get_attribute('class')}")
            
            return True
        except Exception as e:
            logger.error(f"Error during debug: {e}")
            return False
            
    def analyze_dom_structure(self, url, sample_elements=3):
        """
        Analyze the DOM structure of a given page to help determine selectors
        
        Args:
            url: The URL to analyze
            sample_elements: Number of sample elements to show for each selector
            
        Returns:
            Dictionary with DOM structure information
        """
        logger.info(f"Analyzing DOM structure of: {url}")
        self.driver.get(url)
        time.sleep(5)  # Wait for page to fully load
        
        dom_info = {
            "page_title": self.driver.title,
            "url": url,
            "element_counts": {},
            "common_classes": {},
            "potential_bike_elements": [],
            "potential_selectors": [],
            "interesting_elements": []
        }
        
        # Get counts of common elements
        element_types = ['div', 'a', 'span', 'h1', 'h2', 'h3', 'article', 'section', 'li', 'ul']
        for el_type in element_types:
            elements = self.driver.find_elements(By.TAG_NAME, el_type)
            dom_info["element_counts"][el_type] = len(elements)
        
        # Find the most common classes
        all_elements = self.driver.find_elements(By.XPATH, "//*[@class]")
        class_count = {}
        
        for element in all_elements:
            try:
                classes = element.get_attribute("class").split()
                for cls in classes:
                    if cls in class_count:
                        class_count[cls] += 1
                    else:
                        class_count[cls] = 1
            except:
                pass
        
        # Sort classes by frequency
        sorted_classes = sorted(class_count.items(), key=lambda x: x[1], reverse=True)
        dom_info["common_classes"] = {cls: count for cls, count in sorted_classes[:20]}
        
        # Look for elements with specific content patterns typical of bike listings
        # For example, elements containing both an image and price-like text
        logger.info("Looking for content patterns that might indicate bike listings...")
        
        # 1. Find elements containing images
        elements_with_images = self.driver.find_elements(By.XPATH, "//div[.//img]")
        logger.info(f"Found {len(elements_with_images)} elements containing images")
        
        # 2. Find elements that might be product cards based on content
        for i, element in enumerate(elements_with_images[:20]):
            try:
                # Check if this element has characteristics of a product card
                image_elements = element.find_elements(By.TAG_NAME, "img")
                text_content = element.text.strip()
                
                # Skip very small or empty elements
                if len(text_content) < 5 or element.size['height'] < 100:
                    continue
                
                # If it has an image and some text, it might be interesting
                element_info = {
                    "index": i,
                    "tag": element.tag_name,
                    "class": element.get_attribute("class"),
                    "id": element.get_attribute("id"),
                    "text_content": text_content[:200] + "..." if len(text_content) > 200 else text_content,
                    "image_count": len(image_elements),
                    "xpath": self._generate_xpath(element),
                    "size": element.size
                }
                
                dom_info["interesting_elements"].append(element_info)
            except Exception as e:
                logger.error(f"Error analyzing element {i}: {e}")
                
        # 3. Look specifically for product grid patterns
        grid_containers = self.driver.find_elements(By.XPATH, 
            "//div[count(.//div) > 5 and count(.//img) > 3]")
        
        logger.info(f"Found {len(grid_containers)} potential grid containers")
        
        # Take a screenshot for reference
        screenshot_path = os.path.join(self.debug_dir, "dom_analysis.png")
        self.driver.save_screenshot(screenshot_path)
        
        # Save HTML source
        html_path = os.path.join(self.debug_dir, "dom_analysis.html")
        with open(html_path, 'w', encoding='utf-8') as f:
            f.write(self.driver.page_source)
        
        logger.info(f"DOM analysis complete. Found {len(dom_info['interesting_elements'])} potentially interesting elements")
        return dom_info
        
    def _generate_xpath(self, element):
        """Generate a relative XPath for an element"""
        try:
            # This is a simplified version; a real implementation would be more robust
            if element.get_attribute("id"):
                return f"id('{element.get_attribute('id')}')"
                
            classes = element.get_attribute("class").split()
            if classes:
                return f"//*[contains(@class, '{classes[0]}')]"
                
            return "xpath_generation_failed"
        except:
            return "xpath_generation_failed"
            
    def search_bikes_content_based(self, year=2025, max_pages=5):
        """
        Search for bikes using content-based detection instead of fixed selectors
        
        Args:
            year: Model year to search for
            max_pages: Maximum number of pages to scrape
            
        Returns:
            List of dictionaries with bike data
        """
        self.bikes = []
        page = 1
        
        while page <= max_pages:
            url = f"https://99spokes.com/bikes?year={year}&page={page}"
            
            # Use the enhanced navigation method
            if not self.navigate_to_url(url):
                logger.warning(f"Failed to navigate to page {page}. Ending search.")
                break
                
            # Wait for content to load
            time.sleep(5)
            
            # Find potential bike elements by looking for typical content patterns
            # 1. Find elements that contain both images and text and are of a reasonable size
            potential_bike_elements = self.driver.find_elements(By.XPATH, 
                "//div[.//img and string-length(normalize-space(.)) > 10 and @style[contains(., 'height') or contains(., 'width')]]")
            
            logger.info(f"Found {len(potential_bike_elements)} potential bike elements based on content pattern")
            
            if not potential_bike_elements:
                # Try an alternative approach - look for links containing images
                potential_bike_elements = self.driver.find_elements(By.XPATH, "//a[.//img]")
                logger.info(f"Second attempt: Found {len(potential_bike_elements)} link elements containing images")
            
            if not potential_bike_elements:
                logger.warning("No potential bike elements found. Ending search.")
                break
                
            # Extract data from each potential bike listing
            for element in potential_bike_elements:
                try:
                    # Only process elements that look like they might be bike cards
                    # Skip very small elements or those with minimal content
                    if element.size['height'] < 100 or len(element.text.strip()) < 10:
                        continue
                        
                    bike_data = {"year": year}
                    
                    # Get text content and parse it
                    text_content = element.text.strip()
                    lines = text_content.split('\\n')
                    
                    # Add full text for debugging
                    bike_data["raw_text"] = text_content[:200] + "..." if len(text_content) > 200 else text_content
                    
                    # If there are at least two lines, assume first is make, second is model
                    if len(lines) >= 2:
                        bike_data["make"] = lines[0].strip()
                        bike_data["model"] = lines[1].strip()
                    elif len(lines) == 1:
                        # Try to split the single line
                        parts = lines[0].split(' ', 1)
                        if len(parts) >= 2:
                            bike_data["make"] = parts[0].strip()
                            bike_data["model"] = parts[1].strip()
                        else:
                            bike_data["make"] = lines[0].strip()
                            bike_data["model"] = "Unknown"
                    else:
                        bike_data["make"] = "Unknown"
                        bike_data["model"] = "Unknown"
                    
                    # Look for price-like text
                    price_patterns = [
                        r'\\$[\\d,]+(\\.[\\d]{2})?',  # $1,234.56 or $1,234
                        r'[\\d,]+(\\.[\\d]{2})?\\s*USD',  # 1,234.56 USD or 1,234 USD
                    ]
                    
                    for pattern in price_patterns:
                        import re
                        match = re.search(pattern, text_content)
                        if match:
                            bike_data["price"] = match.group(0)
                            break
                            
                    # Try to get URL
                    try:
                        if element.tag_name == 'a':
                            bike_data["url"] = element.get_attribute("href")
                        else:
                            link =