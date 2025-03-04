import os
import time
import csv
import logging
import pandas as pd
from datetime import datetime
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException, StaleElementReferenceException
from webdriver_manager.chrome import ChromeDriverManager
from urllib.parse import urlparse, parse_qs

# Setup logging
logging.basicConfig(
    filename='bike_scraper.log',
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

class BikeDataScraper:
    def __init__(self, output_dir="scraped_data"):
        """Initialize the bike data scraper"""
        self.output_dir = output_dir
        self.timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        if not os.path.exists(output_dir):
            os.makedirs(output_dir)
            
        self.bikes = []
        self.specs = []
        self.geometry = []
        
        self.setup_browser()
        
    def setup_browser(self):
        """Configure browser with anti-detection measures"""
        options = Options()
        options.add_argument("--window-size=1920,1080")
        options.add_argument("--disable-blink-features=AutomationControlled")
        options.add_experimental_option("excludeSwitches", ["enable-automation"])
        options.add_experimental_option("useAutomationExtension", False)
        
        service = Service(ChromeDriverManager().install())
        self.driver = webdriver.Chrome(service=service, options=options)
        self.driver.execute_script(
            "Object.defineProperty(navigator, 'webdriver', {get: () => undefined})"
        )
        self.driver.execute_cdp_cmd("Network.setUserAgentOverride", {
            "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
        })
    
    def navigate_to_page(self, url):
        try:
            logging.info(f"Navigating to {url}")
            self.driver.get(url)
            time.sleep(5)
            return True
        except Exception as e:
            logging.error(f"Error navigating to {url}: {str(e)}")
            return False
    
    def extract_family_links(self, max_families=None):
        family_links = []
        try:
            logging.info("Extracting family links...")
            wait = WebDriverWait(self.driver, 10)
            elements = wait.until(
                EC.presence_of_all_elements_located((By.CSS_SELECTOR, "a[href*='family=']"))
            )
            for element in elements:
                try:
                    href = element.get_attribute("href")
                    if href and "family=" in href:
                        family_links.append(href)
                except StaleElementReferenceException:
                    continue
            logging.info(f"Found {len(family_links)} family links")
            family_links = list(set(family_links))
            if max_families:
                family_links = family_links[:max_families]
            return family_links
        except Exception as e:
            logging.error(f"Error extracting family links: {str(e)}")
            return []
    
    def extract_bike_links(self, max_bikes=None):
        bike_links = []
        try:
            logging.info("Extracting bike detail links...")
            wait = WebDriverWait(self.driver, 10)
            try:
                elements = wait.until(
                    EC.presence_of_all_elements_located((By.CSS_SELECTOR, "a[href*='/bikes/'][href*='/20']"))
                )
            except:
                try:
                    elements = wait.until(
                        EC.presence_of_all_elements_located((By.CSS_SELECTOR, "a[href^='/bikes/']"))
                    )
                except:
                    logging.warning("Could not find bike links with standard selectors, trying XPath")
                    elements = wait.until(
                        EC.presence_of_all_elements_located((By.XPATH, "//a[contains(@href, '/bikes/')]"))
                    )
            for element in elements:
                try:
                    href = element.get_attribute("href")
                    parts = urlparse(href).path.split("/")
                    if len(parts) >= 5 and parts[1] == "bikes" and parts[3].isdigit():
                        bike_links.append(href)
                except StaleElementReferenceException:
                    continue
            logging.info(f"Found {len(bike_links)} bike detail links")
            bike_links = list(set(bike_links))
            if max_bikes:
                bike_links = bike_links[:max_bikes]
            return bike_links
        except Exception as e:
            logging.error(f"Error extracting bike links: {str(e)}")
            return []
    
    def click_tab(self, tab_id):
        """Click on a tab based on tab ID rather than text content"""
        try:
            # Try multiple selector strategies for tab clicking
            selectors = [
                f"a[href='#{tab_id}']",           # By href
                f"button[data-tab='{tab_id}']",    # By data attribute
                f"li[data-tab='{tab_id}'] a",      # By parent data attribute
                f"//a[contains(@class, 'nav-link') and contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), '{tab_id.lower()}')]" # By text
            ]
            
            for selector in selectors:
                try:
                    if selector.startswith('//'):
                        # XPath selector
                        tab = WebDriverWait(self.driver, 10).until(
                            EC.element_to_be_clickable((By.XPATH, selector))
                        )
                    else:
                        # CSS selector
                        tab = WebDriverWait(self.driver, 10).until(
                            EC.element_to_be_clickable((By.CSS_SELECTOR, selector))
                        )
                    tab.click()
                    logging.info(f"Clicked {tab_id} tab using selector: {selector}")
                    time.sleep(5)  # Increased wait time for content to load
                    self.driver.save_screenshot(f"debug_{tab_id}_tab.png")
                    return True
                except Exception:
                    continue
            
            logging.warning(f"Could not find {tab_id} tab with any selector")
            return False
        except Exception as e:
            logging.error(f"Error clicking {tab_id} tab: {str(e)}")
            return False

    def extract_specifications(self, bike_id):
        """Extract specifications with enhanced selectors and waiting"""
        try:
            logging.info(f"Extracting specifications for {bike_id}")
            wait = WebDriverWait(self.driver, 10)
            
            # Try multiple selectors for the active pane
            pane_selectors = [
                ".tab-pane.active", 
                "#specifications", 
                "[data-tab='specifications']",
                "div.specifications-container"
            ]
            
            active_pane = None
            for selector in pane_selectors:
                try:
                    active_pane = wait.until(EC.visibility_of_element_located((By.CSS_SELECTOR, selector)))
                    logging.info(f"Found specifications pane with selector: {selector}")
                    break
                except Exception:
                    continue
                    
            if not active_pane:
                logging.warning(f"Could not find specifications pane for {bike_id}")
                return False
                
            # Look for table within the pane
            try:
                # First check for direct table
                table = active_pane.find_element(By.TAG_NAME, "table")
                rows = table.find_elements(By.TAG_NAME, "tr")
                for row in rows:
                    cells = row.find_elements(By.TAG_NAME, "td")
                    if len(cells) >= 2:
                        key = cells[0].text.strip()
                        value = cells[1].text.strip()
                        if key and value:
                            self.specs.append({
                                "bike_id": bike_id,
                                "spec_name": key,
                                "spec_value": value
                            })
                logging.info(f"Extracted {len(self.specs)} specifications for {bike_id}")
            except NoSuchElementException:
                # If no table, try dl/dt/dd structure
                logging.info("No table found, trying dl/dt/dd structure")
                try:
                    dl_elements = active_pane.find_elements(By.TAG_NAME, "dl")
                    if dl_elements:
                        dl = dl_elements[0]
                        dt_elements = dl.find_elements(By.TAG_NAME, "dt")
                        
                        for dt in dt_elements:
                            try:
                                key = dt.text.strip()
                                # Get the next dd element
                                dd = self.driver.execute_script(
                                    "return arguments[0].nextElementSibling;", dt
                                )
                                
                                if dd and dd.tag_name.lower() == "dd":
                                    value = dd.text.strip()
                                    
                                    if key and value:
                                        self.specs.append({
                                            "bike_id": bike_id,
                                            "spec_name": key,
                                            "spec_value": value
                                        })
                            except Exception as e:
                                logging.warning(f"Error with dt/dd: {str(e)}")
                        logging.info(f"Extracted {len(self.specs)} specifications using dl/dt/dd structure")
                    else:
                        logging.warning("No dl elements found")
                except Exception as e:
                    logging.warning(f"Error checking dl structure: {str(e)}")
                    
            return True
        except Exception as e:
            logging.error(f"Error extracting specifications: {str(e)}")
            return False

    def extract_geometry(self, bike_id):
        """Extract geometry measurements with enhanced selectors and waiting"""
        try:
            logging.info(f"Extracting geometry for {bike_id}")
            wait = WebDriverWait(self.driver, 10)
            
            # Try multiple selectors for the active pane
            pane_selectors = [
                ".tab-pane.active", 
                "#geometry", 
                "[data-tab='geometry']",
                "div.geometry-container"
            ]
            
            active_pane = None
            for selector in pane_selectors:
                try:
                    active_pane = wait.until(EC.visibility_of_element_located((By.CSS_SELECTOR, selector)))
                    logging.info(f"Found geometry pane with selector: {selector}")
                    break
                except Exception:
                    continue
                    
            if not active_pane:
                logging.warning(f"Could not find geometry pane for {bike_id}")
                return False
                
            # Look for table within the pane
            try:
                table = active_pane.find_element(By.TAG_NAME, "table")
                rows = table.find_elements(By.TAG_NAME, "tr")
                for row in rows:
                    cells = row.find_elements(By.TAG_NAME, "td")
                    if len(cells) >= 2:
                        key = cells[0].text.strip()
                        value = cells[1].text.strip()
                        if key and value:
                            self.geometry.append({
                                "bike_id": bike_id,
                                "geometry_name": key,
                                "geometry_value": value
                            })
                logging.info(f"Extracted {len(self.geometry)} geometry measurements for {bike_id}")
            except NoSuchElementException:
                logging.warning(f"No geometry table found in active pane for {bike_id}")
            return True
        except Exception as e:
            logging.error(f"Error extracting geometry: {str(e)}")
            return False

    def scrape_bike_details(self, url):
        try:
            logging.info(f"Scraping bike details from {url}")
            path_parts = urlparse(url).path.split("/")
            if len(path_parts) >= 5:
                brand = path_parts[2]
                year = path_parts[3]
                model_slug = "/".join(path_parts[4:])
            else:
                logging.warning(f"URL format unexpected: {url}")
                brand = "unknown"
                year = "unknown"
                model_slug = "unknown"
            wait = WebDriverWait(self.driver, 10)
            try:
                model_element = wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "h1")))
                model_name = model_element.text.strip()
            except:
                logging.warning(f"Could not find model name for {url}")
                model_name = model_slug
            bike_id = f"{brand}_{year}_{model_slug.replace('/', '_')}"
            bike_data = {
                "id": bike_id,
                "brand": brand,
                "year": year,
                "model_name": model_name,
                "model_slug": model_slug,
                "url": url
            }
            self.bikes.append(bike_data)
            self.click_tab("specifications")
            self.extract_specifications(bike_id)
            self.click_tab("geometry")
            self.extract_geometry(bike_id)
            return True
        except Exception as e:
            logging.error(f"Error scraping bike details from {url}: {str(e)}")
            return False
    
    def save_data(self):
        """Save all scraped data to CSV files"""
        try:
            bikes_df = pd.DataFrame(self.bikes)
            specs_df = pd.DataFrame(self.specs)
            geometry_df = pd.DataFrame(self.geometry)
            
            bikes_file = f"{self.output_dir}/bikes_{self.timestamp}.csv"
            specs_file = f"{self.output_dir}/specifications_{self.timestamp}.csv"
            geometry_file = f"{self.output_dir}/geometry_{self.timestamp}.csv"
            
            bikes_df.to_csv(bikes_file, index=False)
            specs_df.to_csv(specs_file, index=False)
            geometry_df.to_csv(geometry_file, index=False)
            
            logging.info(f"Saved {len(self.bikes)} bikes to {bikes_file}")
            logging.info(f"Saved {len(self.specs)} specifications to {specs_file}")
            logging.info(f"Saved {len(self.geometry)} geometry measurements to {geometry_file}")
            
            return True
        except Exception as e:
            logging.error(f"Error saving data: {str(e)}")
            return False
    
    def run(self, max_families=5, max_bikes_per_family=3):
        try:
            if not self.navigate_to_page("https://99spokes.com/bikes"):
                return False
            
            family_links = self.extract_family_links(max_families)
            for i, family_url in enumerate(family_links):
                logging.info(f"Processing family {i+1}/{len(family_links)}: {family_url}")
                if not self.navigate_to_page(family_url):
                    continue
                bike_links = self.extract_bike_links(max_bikes_per_family)
                for j, bike_url in enumerate(bike_links):
                    logging.info(f"Processing bike {j+1}/{len(bike_links)}: {bike_url}")
                    if not self.navigate_to_page(bike_url):
                        continue
                    self.scrape_bike_details(bike_url)
                    time.sleep(5)
            
            self.save_data()
            return True
        except Exception as e:
            logging.error(f"Error during scraping: {str(e)}")
            return False
        finally:
            self.close()
    
    def close(self):
        if hasattr(self, 'driver'):
            self.driver.quit()

if __name__ == "__main__":
    scraper = BikeDataScraper()
    scraper.run(max_families=5, max_bikes_per_family=3)