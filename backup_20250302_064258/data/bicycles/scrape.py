from selenium import webdriver
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
        '''
        Initialize the scraper with optional headless mode
        
        Args:
            headless: Whether to run in headless mode (no visible browser)
            debug_dir: Directory to save debug output
            allow_manual_intervention: Whether to allow user to manually solve challenges
        '''
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
        '''
        Check if the current page is a bot challenge/protection page
        Now with improved detection to avoid false positives
        '''
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
        '''
        Wait for bot protection challenge to resolve, with optional manual intervention
        
        Args:
            timeout: Maximum time to wait in seconds (for automatic resolution only)
            
        Returns:
            bool: True if challenge was resolved, False otherwise
        '''
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
    
    # Remaining methods
    def navigate_to_url(self, url, retry_count=2, wait_time=5):
        '''
        Navigate to URL with bot protection handling and optional manual intervention
        
        Args:
            url: URL to navigate to
            retry_count: Number of retry attempts
            wait_time: Base time to wait for page load
            
        Returns:
            bool: True if navigation was successful, False otherwise
        '''
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
        '''Capture current page state for debugging'''
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
        '''
        Analyze the DOM structure of a given page to help determine selectors
        
        Args:
            url: The URL to analyze
            sample_elements: Number of sample elements to show for each selector
            
        Returns:
            Dictionary with DOM structure information
        '''
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
        
        # Additional complex analysis...
        # Remaining analysis implementation
        
        logger.info(f"DOM analysis complete. Found potentially interesting elements")
        return dom_info
    
    def _generate_xpath(self, element):
        '''Generate a relative XPath for an element'''
        try:
            if element.get_attribute("id"):
                return f"id('{element.get_attribute('id')}')"
                
            classes = element.get_attribute("class").split()
            if classes:
                return f"//*[contains(@class, '{classes[0]}')]"
                
            return "xpath_generation_failed"
        except:
            return "xpath_generation_failed"
            
    def search_bikes_content_based(self, year=2025, max_pages=20):
        '''
        Search for bikes using content-based detection
        
        Args:
            year: Model year to search for
            max_pages: Maximum number of pages to scrape
            
        Returns:
            List of dictionaries with bike data
        '''
        self.bikes = []
        page = 1
        total_processed = 0
        
        while page <= max_pages:
            url = f"https://99spokes.com/bikes?year={year}&page={page}"
            
            logger.info(f"Processing page {page} of {max_pages} maximum")
            
            # Use the enhanced navigation method
            if not self.navigate_to_url(url):
                logger.warning(f"Failed to navigate to page {page}. Ending search.")
                break
                
            # Wait for content to load - increase wait time to ensure page is fully loaded
            time.sleep(7)
            
            # First, check if we're on a valid results page
            if "no bikes match" in self.driver.page_source.lower():
                logger.info("No more results found (reached end of listings)")
                break
                
            # Improved selector strategy with more options
            bike_elements = []
            selectors = [
                "a[href*='/bikes/']",  # Links to bike detail pages
                "a[href^='/bikes?']",   # Links to filtered bike listings
                "a.product-card",      # Product card links
                ".grid-item",          # Grid items that might contain bikes
                ".bike-card",          # Specific bike card class
                ".product-card",       # Generic product card class
                "[data-testid^='bike']", # Elements with bike test IDs
                "div[data-bike-id]",   # Elements with bike IDs
                "a.card",              # Links styled as cards
                "div.clickable"        # Clickable divs (might be bike cards)
            ]
            
            for selector in selectors:
                try:
                    elements = self.driver.find_elements(By.CSS_SELECTOR, selector)
                    if elements and len(elements) > 5:  # Require at least 5 elements to avoid false matches
                        logger.info(f"Found {len(elements)} elements with selector: {selector}")
                        bike_elements = elements
                        break
                except Exception as e:
                    logger.debug(f"Error with selector {selector}: {e}")
            
            # If standard selectors didn't work, try content-based approach
            if not bike_elements:
                logger.info("No elements found with standard selectors, trying more complex patterns...")
                
                # Try different XPath patterns
                xpath_patterns = [
                    "//a[contains(@href, '/bikes/')]",  # All links to bike detail pages
                    "//div[.//img]//a[contains(@href, '/bikes/')]",  # Links with images that go to bike pages
                    "//div[.//img and .//div[contains(text(), '$')]]",  # Elements with images and price text
                    "//a[.//img and string-length(normalize-space(.)) > 10]",  # Links with images and some text
                    "//li[.//a[contains(@href, '/bikes/')]]"  # List items containing bike links
                ]
                
                for xpath in xpath_patterns:
                    elements = self.driver.find_elements(By.XPATH, xpath)
                    if elements:
                        logger.info(f"Found {len(elements)} elements with XPath pattern: {xpath}")
                        bike_elements = elements
                        break
            
            if not bike_elements:
                logger.warning("No potential bike elements found on this page.")
                # Take a debug screenshot
                self.debug_page(page, prefix=f"no_elements_year{year}_page{page}")
                
                # Try one more approach - get all links and filter for bikes
                logger.info("Falling back to checking all links on the page...")
                all_links = self.driver.find_elements(By.TAG_NAME, "a")
                bike_links = [link for link in all_links if '/bikes/' in link.get_attribute("href") if link.get_attribute("href")]
                
                if bike_links:
                    logger.info(f"Found {len(bike_links)} bike links by direct URL check")
                    bike_elements = bike_links
                else:
                    logger.warning("Still no bike elements found. Moving to next page.")
                    page += 1
                    continue
                
            # Extract data from each potential bike listing with improved parsing
            processed_on_page = 0
            for element in bike_elements:
                try:
                    text_content = element.text.strip()
                    
                    # Skip elements with no meaningful text
                    if len(text_content) < 5:
                        continue
                        
                    bike_data = {"year": year}
                    
                    # Add link/URL data
                    if element.tag_name == "a":
                        bike_data["url"] = element.get_attribute("href")
                    else:
                        # Try to find a link within the element
                        links = element.find_elements(By.TAG_NAME, "a")
                        if links:
                            bike_data["url"] = links[0].get_attribute("href")
                    
                    # Process text content
                    lines = text_content.split('\n')
                    processed_lines = [line.strip() for line in lines if line.strip()]
                    
                    # Add raw text for debugging
                    bike_data["raw_text"] = text_content[:200] + "..." if len(text_content) > 200 else text_content
                    
                    # Try to identify make and model from the text content
                    if len(processed_lines) >= 2:
                        bike_data["make"] = processed_lines[0]
                        bike_data["model"] = processed_lines[1]
                    elif len(processed_lines) == 1:
                        parts = processed_lines[0].split(' ', 1)
                        if len(parts) >= 2:
                            bike_data["make"] = parts[0].strip()
                            bike_data["model"] = parts[1].strip()
                        else:
                            bike_data["make"] = processed_lines[0]
                            bike_data["model"] = "Unknown"
                    
                    # Look for price information (now handling more formats)
                    price_patterns = [
                        r'\$[\d,]+(\.\d{2})?',  # $1,234.56 or $1,234
                        r'[\d,]+(\.\d{2})?\s*USD',  # 1,234.56 USD
                        r'\$[\d,]+—\$[\d,]+',  # Price range: $1,000—$2,000
                        r'\(?\$[\d,]+\)?',  # ($1,234) - parenthesized price
                        r'from \$[\d,]+',  # from $1,234
                        r'starting at \$[\d,]+'  # starting at $1,234
                    ]
                    
                    for pattern in price_patterns:
                        import re
                        match = re.search(pattern, text_content)
                        if match:
                            bike_data["price"] = match.group(0)
                            break
                    
                    # Only add bikes with valid data and no duplicates
                    if bike_data.get("make") and bike_data.get("make") != "Unknown":
                        # Check for duplicates
                        duplicate = False
                        for existing_bike in self.bikes:
                            if (existing_bike.get("make") == bike_data.get("make") and 
                                existing_bike.get("model") == bike_data.get("model")):
                                duplicate = True
                                break
                                
                        if not duplicate:
                            self.bikes.append(bike_data)
                            processed_on_page += 1
                        
                except Exception as e:
                    logger.error(f"Error processing bike element: {e}")
            
            total_processed += processed_on_page
            logger.info(f"Scraped page {page}, extracted {processed_on_page} bikes from this page, {len(self.bikes)} total unique bikes")
            
            # IMPROVED PAGINATION: Look for pagination indicators and next button
            found_next_page = False
            
            # First check if we're on the last page by looking for disabled next button
            disabled_next = self.driver.find_elements(By.XPATH, "//button[@disabled and (contains(text(), 'Next') or @aria-label='Next page')]")
            if disabled_next:
                logger.info("Found disabled Next button - reached last page")
                break
                
            # Try multiple ways to find the next button
            next_button = None
            next_selector_approaches = [
                # By aria-label
                "//button[@aria-label='Next page']",
                # By text content
                "//button[text()='Next']",
                # By common classes and text
                "//*[contains(@class, 'pagination') and (text()='Next' or text()='→')]",
                # By aria-label containing next
                "//*[@aria-label and contains(@aria-label, 'next')]"
            ]
            
            for selector in next_selector_approaches:
                elements = self.driver.find_elements(By.XPATH, selector)
                if elements and elements[0].is_displayed() and elements[0].is_enabled():
                    next_button = elements[0]
                    logger.info(f"Found next button using selector: {selector}")
                    break
            
            # If we found a next button, click it
            if next_button:
                # Scroll to the button to make it clickable
                self.driver.execute_script("arguments[0].scrollIntoView(true);", next_button)
                time.sleep(1)
                
                try:
                    next_button.click()
                    logger.info("Clicked next button, navigating to next page")
                    page += 1
                    time.sleep(3)  # Wait for next page to load
                    found_next_page = True
                except Exception as e:
                    logger.error(f"Error clicking next button: {e}")
                    # Try JavaScript click as a fallback
                    try:
                        self.driver.execute_script("arguments[0].click();", next_button)
                        logger.info("Used JavaScript to click next button")
                        page += 1
                        time.sleep(3)
                        found_next_page = True
                    except:
                        logger.error("JavaScript click also failed")
            
            # If we couldn't find/click the next button, try URL-based pagination
            if not found_next_page:
                logger.info("Could not find or click next button, trying direct URL navigation")
                # Just increment the page number in the URL
                page += 1
                
        logger.info(f"Completed search for {year} bikes. Found {len(self.bikes)} unique bikes across {page-1} pages.")
        return self.bikes

    def search_bikes(self, year=2025, max_pages=5, debug=False):
        '''
        Search for bikes on 99spokes.com
        
        Args:
            year: Model year to search for
            max_pages: Maximum number of pages to scrape
            debug: Whether to run in debug mode
            
        Returns:
            List of dictionaries with bike data
        '''
        self.bikes = []
        page = 1
        # Implementation of bike search...
        return self.bikes
    
    def get_bike_details(self, bike_url):
        '''Get detailed information from a specific bike listing'''
        logger.info(f"Getting bike details from: {bike_url}")
        # Implementation of detail scraping...
        return {}
    
    def save_to_csv(self, filename="bikes_data.csv"):
        '''Save scraped bike data to CSV'''
        if not self.bikes:
            logger.warning("No bikes to save")
            return False
            
        try:
            # Get all possible fieldnames from all bikes
            all_fields = set()
            for bike in self.bikes:
                all_fields.update(bike.keys())
            
            fieldnames = sorted(list(all_fields))
            
            with open(filename, "w", newline="", encoding="utf-8") as csvfile:
                writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
                writer.writeheader()
                for bike in self.bikes:
                    writer.writerow(bike)
            logger.info(f"Saved {len(self.bikes)} bikes to {filename}")
            return True
        except Exception as e:
            logger.error(f"Error saving to CSV: {e}")
            return False
    
    def bike_to_json(self, bike_data):
        '''Convert bike data to JSON string'''
        return json.dumps(bike_data, indent=2)
    
    def close(self):
        '''Close the browser'''
        self.driver.quit()


# Example usage when script is run directly
if __name__ == "__main__":
    # Always set allow_manual_intervention=True when running directly
    scraper = NinetyNineSpokesScraper(headless=False, allow_manual_intervention=True)
    try:
        # Test access to the website
        print("Testing access to website...")
        # Rest of implementation...
    finally:
        scraper.close()
