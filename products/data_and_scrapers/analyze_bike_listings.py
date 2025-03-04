import time
import json
import os
import logging
from datetime import datetime
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager

logging.basicConfig(filename='scraper.log', level=logging.INFO)

class BikeListingAnalyzer:
    def __init__(self, output_dir="analysis_results"):
        """Initialize the bike listing analyzer with anti-detection measures"""
        self.output_dir = output_dir
        self.timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        self.results = {}
        
        # Create output directory if it doesn't exist
        if not os.path.exists(output_dir):
            os.makedirs(output_dir)
            
        # Setup browser with anti-detection
        self.setup_browser()
        
    def setup_browser(self):
        """Configure browser with anti-detection measures"""
        options = Options()
        options.add_argument("--window-size=1920,1080")
        options.add_argument("--disable-blink-features=AutomationControlled")
        options.add_experimental_option("excludeSwitches", ["enable-automation"])
        options.add_experimental_option("useAutomationExtension", False)
        
        # Create service using webdriver-manager
        service = Service(ChromeDriverManager().install())
        
        # Create driver with service and options
        self.driver = webdriver.Chrome(service=service, options=options)
        
        # Mask automation
        self.driver.execute_script(
            "Object.defineProperty(navigator, 'webdriver', {get: () => undefined})"
        )
        
        # Add random user agent (optional)
        self.driver.execute_cdp_cmd("Network.setUserAgentOverride", {
            "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
        })
    
    def navigate_to_page(self, url):
        """Navigate to the specified URL and wait for page to load"""
        print(f"Navigating to {url}")
        self.driver.get(url)
        time.sleep(3)  # Allow time for JavaScript to execute
        
        # Take screenshot of full page
        screenshot_path = f"{self.output_dir}/page_{self.timestamp}.png"
        self.driver.save_screenshot(screenshot_path)
        print(f"Screenshot saved to {screenshot_path}")
        
        return True
    
    def test_selectors(self, selectors_dict, wait_time=10):
        """
        Test multiple selectors and record results
        
        Args:
            selectors_dict: Dictionary of {selector_name: {type: "css|xpath", value: "selector"}}
            wait_time: Maximum time to wait for elements
        
        Returns:
            Dictionary of results
        """
        results = {}
        
        for name, selector_info in selectors_dict.items():
            selector_type = selector_info["type"]
            selector_value = selector_info["value"]
            
            print(f"Testing selector: {name} ({selector_value})")
            
            try:
                if selector_type == "css":
                    by_method = By.CSS_SELECTOR
                elif selector_type == "xpath":
                    by_method = By.XPATH
                else:
                    print(f"Unknown selector type: {selector_type}")
                    continue
                
                # Wait for element(s) to be present
                wait = WebDriverWait(self.driver, wait_time)
                elements = wait.until(EC.presence_of_all_elements_located((by_method, selector_value)))
                
                # Record results
                element_count = len(elements)
                
                # Get text and attributes from first 3 elements
                sample_data = []
                for i, elem in enumerate(elements[:3]):
                    elem_data = {
                        "text": elem.text.strip(),
                        "html": elem.get_attribute("outerHTML"),
                        "tag": elem.tag_name,
                    }
                    
                    # Get common attributes
                    for attr in ["href", "src", "alt", "class", "id"]:
                        attr_value = elem.get_attribute(attr)
                        if attr_value:
                            elem_data[attr] = attr_value
                            
                    sample_data.append(elem_data)
                
                # Save element screenshot if possible
                if element_count > 0:
                    try:
                        elements[0].screenshot(
                            f"{self.output_dir}/{name}_element_{self.timestamp}.png"
                        )
                    except Exception as e:
                        print(f"Could not capture element screenshot: {e}")
                
                results[name] = {
                    "found": True,
                    "count": element_count,
                    "samples": sample_data,
                    "selector": selector_value,
                    "type": selector_type,
                }
                
                print(f"✅ Found {element_count} elements with selector {name}")
                logging.info(f"Found {element_count} elements with selector {name}")
                
            except (TimeoutException, NoSuchElementException) as e:
                results[name] = {
                    "found": False,
                    "error": str(e),
                    "selector": selector_value,
                    "type": selector_type,
                }
                print(f"❌ No elements found with selector {name}")
        
        # Save detailed results
        with open(f"{self.output_dir}/selector_results_{self.timestamp}.json", "w") as f:
            json.dump(results, f, indent=2)
            
        self.results.update(results)
        return results
    
    def analyze_listings_page(self, url):
        if not self.navigate_to_page(url):
            return False
        
        # Extract family links
        family_links = self.driver.find_elements(By.CSS_SELECTOR, "a[href*='family=']")
        for link in family_links[:5]:  # Limit for testing
            family_url = link.get_attribute("href")
            print(f"Visiting family page: {family_url}")
            self.navigate_to_page(family_url)
            
            # Test selectors for bike entries on family page
            family_selectors = {
                "bike_entries": {"type": "css", "value": "div.bike-entry, div.model-card"},
                "bike_detail_links": {"type": "css", "value": "a[href*='/bikes/']"}
            }
            self.test_selectors(family_selectors)
        
        # Test original selectors on main listings page
        selectors = {
            "bike_cards": {
                "type": "css", 
                "value": "div.bike-card, div.product-card, div[data-testid='bike-card']"
            },
            "bike_titles": {
                "type": "css", 
                "value": "h3.bike-name, h3.product-name, div.product-title"
            },
            "bike_prices": {
                "type": "css", 
                "value": "div.price-tag, span.price, div.product-price"
            },
            "bike_images": {
                "type": "css", 
                "value": "div.bike-card img, div.product-card img"
            },
            "pagination": {
                "type": "css", 
                "value": "a.next-page, div.pagination a, a[aria-label='Next page']"
            },
            "bike_links": {
                "type": "css", 
                "value": "a[href^='/bikes/'][href*='/20']"
            },
            # XPath alternatives
            "bike_cards_xpath": {
                "type": "xpath", 
                "value": "//div[contains(@class, 'bike-card') or contains(@class, 'product-card')]"
            },
            "bike_links_xpath": {
                "type": "xpath", 
                "value": "//a[starts-with(@href, '/bikes/') and contains(@href, '/20')]"
            },
            # Family links
            "family_links": {
                "type": "css",
                "value": "a[href*='family=']"
            }
        }
        
        return self.test_selectors(selectors)
    
    def analyze_detail_page(self, url):
        if not self.navigate_to_page(url):
            return False
        
        selectors = {
            "model_name": {"type": "css", "value": "h1"},
            "specs_container": {"type": "css", "value": "div#specs-section"},
            "spec_items": {"type": "css", "value": "div.spec-item"},
            "spec_keys": {"type": "css", "value": "div.spec-item .spec-label"},
            "spec_values": {"type": "css", "value": "div.spec-item .spec-value"},
            "geometry_table": {"type": "css", "value": "table.geometry-table"}
        }
        return self.test_selectors(selectors)
    
    def generate_report(self):
        """Generate a summary report of selector effectiveness"""
        report = {
            "timestamp": self.timestamp,
            "summary": {
                "working_selectors": [],
                "failing_selectors": []
            },
            "recommendations": {}
        }
        
        for name, result in self.results.items():
            if result["found"] and result["count"] > 0:
                report["summary"]["working_selectors"].append({
                    "name": name,
                    "count": result["count"],
                    "selector": result["selector"]
                })
            else:
                report["summary"]["failing_selectors"].append({
                    "name": name,
                    "selector": result["selector"],
                    "error": result.get("error", "No elements found")
                })
        
        # Generate recommendations based on results
        if any(s["name"].startswith("bike_cards") for s in report["summary"]["working_selectors"]):
            working = next(s for s in report["summary"]["working_selectors"] 
                          if s["name"].startswith("bike_cards"))
            report["recommendations"]["bike_card_selector"] = working["selector"]
        
        # Write report to file
        report_path = f"{self.output_dir}/analysis_report_{self.timestamp}.json"
        with open(report_path, "w") as f:
            json.dump(report, f, indent=2)
        
        print(f"Analysis report saved to {report_path}")
        return report
    
    def analyze_website(self):
        """Run full analysis on website"""
        # Analyze different page types
        listings_url = "https://99spokes.com/bikes"
        self.analyze_listings_page(listings_url)
        
        # Try to find a bike detail page
        try:
            bike_link = self.driver.find_element(By.CSS_SELECTOR, "a[href^='/bikes/'][href*='/20']")
            detail_url = "https://99spokes.com" + bike_link.get_attribute("href")
            self.analyze_detail_page(detail_url)
        except Exception as e:
            print(f"Could not find bike detail link: {e}")
            # Fallback to a specific bike URL
            detail_url = "https://99spokes.com/bikes/trek/2023/checkpoint-sl-6-axs"
            self.analyze_detail_page(detail_url)
        
        # Generate final report
        return self.generate_report()
    
    def close(self):
        """Close browser and clean up"""
        if self.driver:
            self.driver.quit()


# Main execution
if __name__ == "__main__":
    analyzer = BikeListingAnalyzer()
    try:
        analyzer.analyze_website()
    finally:
        analyzer.close()