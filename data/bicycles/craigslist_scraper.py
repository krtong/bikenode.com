# DEPRECATED: Unused duplicate code. Consider removal.
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import json
import time
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class CraigslistScraper:
    def __init__(self, headless=False):
        """Initialize the scraper with optional headless mode"""
        options = webdriver.ChromeOptions()
        if headless:
            options.add_argument('--headless')
        self.driver = webdriver.Chrome(options=options)

    def search_bikes(self, location="sfbay", query="bicycle", max_results=5):
        """
    
        Search for bikes on Craigslist
        
        Args:
            location: Craigslist location subdomain
            query: Search term
            max_results: Maximum number of results to return
            
        Returns:
            List of dictionaries with listing preview data
        """
        url = f"https://{location}.craigslist.org/search/bia?query={query}"
        logger.info(f"Searching Craigslist at: {url}")
        self.driver.get(url)
        
        try:
            # Wait for search results to load
            WebDriverWait(self.driver, 10).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, ".cl-search-result"))
            )
            
            # Find all listings
            listing_elements = self.driver.find_elements(By.CSS_SELECTOR, ".cl-search-result")
            
            results = []
            for i, listing in enumerate(listing_elements[:max_results]):
                try:
                    # Extract data from listing preview
                    listing_data = {}
                    listing_data["title"] = listing.find_element(By.CSS_SELECTOR, ".cl-app-anchor").text
                    listing_data["price"] = listing.find_element(By.CSS_SELECTOR, ".price").text.strip()
                    listing_data["url"] = listing.find_element(By.CSS_SELECTOR, ".cl-app-anchor").get_attribute("href")
                    listing_data["id"] = listing.get_attribute("data-pid")
                    
                    results.append(listing_data)
                except Exception as e:
                    logger.error(f"Error parsing listing: {e}")
                    
            return results
            
        except Exception as e:
            logger.error(f"Error during search: {e}")
            return []

    def get_listing_details(self, listing_url):
        """
        Get detailed information from a specific listing
        
        Args:
            listing_url: URL of the listing to scrape
            
        Returns:
            Dictionary with listing details
        """
        logger.info(f"Getting listing details from: {listing_url}")
        self.driver.get(listing_url)
        
        try:
            # Wait for listing details to load
            WebDriverWait(self.driver, 10).until(
                EC.presence_of_element_located((By.ID, "titletextonly"))
            )
            
            listing_data = {}
            
            # Basic info
            listing_data["title"] = self.driver.find_element(By.ID, "titletextonly").text
            try:
                listing_data["price"] = self.driver.find_element(By.CLASS_NAME, "price").text
            except:
                listing_data["price"] = "Not listed"
            
            # Description
            try:
                listing_data["description"] = self.driver.find_element(By.ID, "postingbody").text
            except:
                listing_data["description"] = "No description available"
            
            # Get attributes table
            try:
                attr_groups = self.driver.find_elements(By.CSS_SELECTOR, ".attrgroup")
                attributes = {}
                
                for group in attr_groups:
                    spans = group.find_elements(By.TAG_NAME, "span")
                    for span in spans:
                        text = span.text.strip()
                        if ":" in text:
                            key, value = text.split(":", 1)
                            attributes[key.strip()] = value.strip()
                        elif text:
                            attributes[text] = True
                
                listing_data["attributes"] = attributes
            except:
                listing_data["attributes"] = {}
            
            # Images
            try:
                img_elements = self.driver.find_elements(By.CSS_SELECTOR, "#thumbs .thumb img")
                listing_data["images"] = [img.get_attribute("src") for img in img_elements]
            except:
                listing_data["images"] = []
                
            return listing_data
            
        except Exception as e:
            logger.error(f"Error getting listing details: {e}")
            return {"error": str(e)}

    def listing_to_json(self, listing_data):
        """Convert listing data to JSON string"""
        return json.dumps(listing_data, indent=2)

    def close(self):
        """Close the browser"""
        self.driver.quit()
