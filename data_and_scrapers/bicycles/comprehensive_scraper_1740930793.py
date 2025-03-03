#!/usr/bin/env python3
"""
Comprehensive 99spokes.com scraper that uses filtering to obtain complete bike datasets
"""
import os
import argparse
import time
import json
import csv
import sys
import re
import logging
from datetime import datetime
from pathlib import Path
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

# Import existing scraper class to leverage existing functionality
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from data.bicycles.scrape import NinetyNineSpokesScraper

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler("comprehensive_scraper.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class ComprehensiveBikeScraper(NinetyNineSpokesScraper):
    """
    Enhanced scraper that uses filtering to obtain complete bike datasets
    """
    
    # Define filter categories and their values
    FILTER_CATEGORIES = {
        "category": [
            "road", "gravel", "cyclocross", "mountain", "hybrid", "touring", 
            "city", "electric", "folding", "kids", "bmx", "fat", "fixie",
            "commuter", "comfort", "cruiser", "fitness", "cargo", "recumbent"
        ],
        "brand": None,  # Will be populated dynamically
        "price": [
            "0-500", "500-1000", "1000-2000", "2000-3000", 
            "3000-4000", "4000-5000", "5000-7500", "7500-10000", "10000+"
        ],
        # Add more filter categories as needed
    }
    
    def __init__(self, headless=False, debug_dir="debug_output", allow_manual_intervention=True):
        """Initialize the comprehensive scraper"""
        super().__init__(headless=headless, debug_dir=debug_dir, allow_manual_intervention=allow_manual_intervention)
        self.all_bikes = []
        self.progress_file = "scraper_progress.json"
        self.current_progress = {}
        self.stats = {
            "pages_scraped": 0,
            "bikes_found": 0,
            "filter_combinations_tried": 0,
            "duplicates_avoided": 0
        }
    
    def get_brands_from_site(self):
        """Dynamically get the list of brands from the website's filter options"""
        logger.info("Getting list of brands from website filters")
        
        try:
            # Navigate to the bikes page
            self.navigate_to_url("https://99spokes.com/bikes")
            time.sleep(2)
            
            # Try to find the brand filter
            brand_elements = []
            
            # Look for filter elements containing "brand" or "make"
            filter_elements = self.driver.find_elements(By.XPATH, 
                "//div[contains(@class, 'filter') or contains(@class, 'facet')]//button[contains(., 'Brand') or contains(., 'Make')]")
            
            if filter_elements:
                logger.info(f"Found brand filter button: {len(filter_elements)}")
                # Click to open the filter dropdown
                filter_elements[0].click()
                time.sleep(1)
                
                # Look for brand checkboxes or links
                brand_elements = self.driver.find_elements(By.XPATH, 
                    "//div[contains(@class, 'dropdown') or contains(@class, 'popover')]//label")
                
                logger.info(f"Found {len(brand_elements)} brand elements")
            
            # Extract brand names
            brands = []
            for element in brand_elements:
                try:
                    brand_name = element.text.strip()
                    if brand_name and not brand_name.isdigit() and not brand_name.startswith("("):
                        brands.append(brand_name.lower())
                except Exception as e:
                    logger.error(f"Error extracting brand name: {e}")
            
            # Close any open dropdown
            try:
                self.driver.find_element(By.TAG_NAME, "body").click()
            except:
                pass
                
            logger.info(f"Extracted {len(brands)} brand names")
            return brands
            
        except Exception as e:
            logger.error(f"Error getting brands: {e}")
            # Return a default list of major brands as fallback
            return ["specialized", "trek", "cannondale", "giant", "santa-cruz", "canyon", 
                   "bmc", "cervelo", "scott", "kona", "salsa", "surly", "orbea"]
    
    def load_progress(self):
        """Load progress from previous runs"""
        if os.path.exists(self.progress_file):
            try:
                with open(self.progress_file, 'r') as f:
                    self.current_progress = json.load(f)
                logger.info(f"Loaded progress from {self.progress_file}")
                return True
            except Exception as e:
                logger.error(f"Error loading progress: {e}")
        return False
    
    def save_progress(self, year, current_filters):
        """Save current progress to allow resuming later"""
        self.current_progress[str(year)] = {
            "filters": current_filters,
            "bikes_found": len(self.all_bikes),
            "timestamp": datetime.now().isoformat()
        }
        
        try:
            with open(self.progress_file, 'w') as f:
                json.dump(self.current_progress, f, indent=2)
        except Exception as e:
            logger.error(f"Error saving progress: {e}")
    
    def apply_filters(self, year, filters):
        """Apply filters to the bike search URL"""
        base_url = f"https://99spokes.com/bikes?year={year}"
        
        for category, value in filters.items():
            if value:
                # Format the filter value for URL
                filter_value = value.lower().replace(" ", "-")
                base_url += f"&{category}={filter_value}"
        
        logger.info(f"Navigating to filtered URL: {base_url}")
        return self.navigate_to_url(base_url)
    
    def is_valid_bike_listing(self, bike_data):
        """Check if a bike listing has valid data"""
        # Must have make and model, and they should be reasonable
        if not bike_data.get("make") or not bike_data.get("model"):
            return False
            
        make = bike_data.get("make", "").lower()
        model = bike_data.get("model", "").lower()
        
        # Skip items that are clearly not bikes
        invalid_keywords = ["add to compare", "clear all", "save", "filter", "sort by"]
        for keyword in invalid_keywords:
            if keyword in make.lower() or keyword in model.lower():
                return False
                
        # Skip very short models/makes that likely aren't real names
        if len(make) < 2 or len(model) < 2:
            return False
            
        return True
    
    def check_if_duplicate(self, new_bike):
        """Check if a bike is already in our list (to avoid duplicates)"""
        if not new_bike.get("make") or not new_bike.get("model"):
            return True
            
        for existing_bike in self.all_bikes:
            # Check if make and model match (case-insensitive)
            if (existing_bike.get("make", "").lower() == new_bike.get("make", "").lower() and
                existing_bike.get("model", "").lower() == new_bike.get("model", "").lower()):
                self.stats["duplicates_avoided"] += 1
                return True
                
        return False
    
    def scrape_bikes_with_filters(self, year, max_pages_per_filter=10):
        """
        Scrape bikes using multiple filter combinations to get a comprehensive list
        
        Args:
            year: The model year to scrape
            max_pages_per_filter: Maximum pages to scrape for each filter combination
            
        Returns:
            List of all unique bikes found
        """
        logger.info(f"Starting comprehensive bike scrape for {year}")
        self.all_bikes = []
        
        # Initialize filters with dynamic brand list
        if self.FILTER_CATEGORIES["brand"] is None:
            self.FILTER_CATEGORIES["brand"] = self.get_brands_from_site()
        
        # Track progress
        completed_combinations = set()
        if str(year) in self.current_progress:
            completed_combinations = set(self.current_progress[str(year)].get("completed_filters", []))
        
        # We'll first use individual category filters
        for filter_type, filter_values in self.FILTER_CATEGORIES.items():
            if not filter_values:
                continue
                
            for filter_value in filter_values:
                filter_combination = f"{filter_type}:{filter_value}"
                
                # Skip if we've already done this combination
                if filter_combination in completed_combinations:
                    logger.info(f"Skipping already completed filter: {filter_combination}")
                    continue
                
                logger.info(f"Using filter: {filter_type}={filter_value}")
                self.stats["filter_combinations_tried"] += 1
                
                # Apply this filter
                filters = {filter_type: filter_value}
                if not self.apply_filters(year, filters):
                    logger.warning(f"Failed to apply filter {filter_combination}, continuing to next")
                    continue
                
                # Now the page is loaded with the filtered results
                # Use our enhanced search method to extract bikes from all pages
                page = 1
                page_has_bikes = True
                
                while page <= max_pages_per_filter and page_has_bikes:
                    self.stats["pages_scraped"] += 1
                    
                    # Handle pagination for pages after the first
                    if page > 1:
                        # Construct and navigate to the paginated URL directly
                        paginated_url = f"https://99spokes.com/bikes?year={year}&{filter_type}={filter_value}&page={page}"
                        if not self.navigate_to_url(paginated_url):
                            logger.warning(f"Failed to navigate to page {page}, ending pagination for this filter")
                            break
                    
                    # Wait for content to load
                    time.sleep(5)
                    
                    # Check for "no bikes match" message
                    if "no bikes match" in self.driver.page_source.lower():
                        logger.info(f"No bikes found for {filter_combination} on page {page}, moving to next filter")
                        page_has_bikes = False
                        break
                        
                    # Extract bikes from this page using our proven selectors
                    found_bikes_on_page = self.extract_bikes_from_current_page(year)
                    bikes_added = 0
                    
                    # Add non-duplicate bikes to our master list
                    for bike in found_bikes_on_page:
                        if self.is_valid_bike_listing(bike) and not self.check_if_duplicate(bike):
                            # Add filter info to track where this bike was found
                            bike["source_filter"] = filter_combination
                            self.all_bikes.append(bike)
                            bikes_added += 1
                    
                    total_bikes = len(self.all_bikes)
                    logger.info(f"Found {len(found_bikes_on_page)} bikes on page {page}, added {bikes_added} unique bikes (total: {total_bikes})")
                    
                    # Check if we found any bikes on this page
                    if len(found_bikes_on_page) == 0:
                        logger.info(f"No bikes found on page {page}, ending pagination for this filter")
                        page_has_bikes = False
                        break
                    
                    # Save intermediate progress every page
                    if bikes_added > 0 and total_bikes % 100 == 0:
                        intermediate_file = f"bikes_{year}_intermediate_{total_bikes}.csv"
                        self.save_bikes_to_csv(self.all_bikes, intermediate_file)
                        logger.info(f"Saved intermediate progress to {intermediate_file}")
                    
                    # Move to next page
                    page += 1
                
                # Mark this combination as completed
                completed_combinations.add(filter_combination)
                
                # Update progress
                self.current_progress[str(year)] = {
                    "completed_filters": list(completed_combinations),
                    "bikes_found": len(self.all_bikes),
                    "last_filter": filter_combination,
                    "timestamp": datetime.now().isoformat()
                }
                
                # Save progress to allow resuming
                self.save_progress(year, {"completed_filters": list(completed_combinations)})
                
                # Optional: pause briefly between filter changes to avoid overloading the server
                time.sleep(2)
        
        # Final dedupe
        self.all_bikes = self.deduplicate_bikes(self.all_bikes)
        
        logger.info(f"Completed comprehensive scrape for {year}. Found {len(self.all_bikes)} unique bikes.")
        logger.info(f"Stats: {json.dumps(self.stats, indent=2)}")
        
        return self.all_bikes
    
    def extract_bikes_from_current_page(self, year):
        """Extract all bikes from the current page"""
        bikes_on_page = []
        
        # Use our proven selectors and XPath patterns
        selectors = [
            "a[href*='/bikes/']",
            ".grid-item",
            ".bike-card",
            ".product-card",
            "[data-testid^='bike']", 
            "div[data-bike-id]",
            "a.card"
        ]
        
        # Try each selector until we find bike elements
        bike_elements = []
        for selector in selectors:
            elements = self.driver.find_elements(By.CSS_SELECTOR, selector)
            if elements and len(elements) > 3:  # Reasonable minimum for a bikes page
                bike_elements = elements
                break
        
        # If standard selectors didn't work, try XPath patterns
        if not bike_elements:
            xpath_patterns = [
                "//a[contains(@href, '/bikes/')]",
                "//div[.//img]//a[contains(@href, '/bikes/')]",
                "//a[.//img and string-length(normalize-space(.)) > 10]"
            ]
            
            for xpath in xpath_patterns:
                elements = self.driver.find_elements(By.XPATH, xpath)
                if elements:
                    bike_elements = elements
                    break
        
        # Process each bike element
        for element in bike_elements:
            try:
                text_content = element.text.strip()
                
                # Skip elements with no meaningful text
                if len(text_content) < 5:
                    continue
                    
                bike_data = {"year": year}
                
                # Add link/URL
                if element.tag_name == "a":
                    bike_data["url"] = element.get_attribute("href")
                else:
                    links = element.find_elements(By.TAG_NAME, "a")
                    if links:
                        bike_data["url"] = links[0].get_attribute("href")
                
                # Extract make and model from text
                lines = text_content.split('\n')
                processed_lines = [line.strip() for line in lines if line.strip()]
                
                # Add raw text for debugging
                bike_data["raw_text"] = text_content
                
                # Identify make and model from text patterns
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
                
                # Extract price using regex patterns
                price_patterns = [
                    r'\$[\d,]+(\.\d{2})?',  # $1,234.56 or $1,234
                    r'[\d,]+(\.\d{2})?\s*USD',  # 1,234.56 USD
                    r'\$[\d,]+—\$[\d,]+',  # Price range: $1,000—$2,000
                    r'\(?\$[\d,]+\)?',  # ($1,234) - parenthesized price
                ]
                
                for pattern in price_patterns:
                    import re
                    match = re.search(pattern, text_content)
                    if match:
                        bike_data["price"] = match.group(0)
                        break
                
                # Add the bike to our page results if it has basic data
                if bike_data.get("make") and bike_data.get("model") != "Unknown":
                    bikes_on_page.append(bike_data)
                    
            except Exception as e:
                logger.error(f"Error processing bike element: {e}")
        
        self.stats["bikes_found"] += len(bikes_on_page)
        return bikes_on_page
    
    def deduplicate_bikes(self, bikes_list):
        """Remove duplicate bikes from the list"""
        unique_bikes = []
        seen_bikes = set()
        
        for bike in bikes_list:
            if not bike.get("make") or not bike.get("model"):
                continue
                
            # Create a unique identifier for the bike
            bike_id = f"{bike.get('make', '').lower()}|{bike.get('model', '').lower()}"
            
            if bike_id not in seen_bikes:
                seen_bikes.add(bike_id)
                unique_bikes.append(bike)
        
        logger.info(f"Deduplicated {len(bikes_list)} bikes to {len(unique_bikes)} unique bikes")
        return unique_bikes
    
    def save_bikes_to_csv(self, bikes_list, filename):
        """Save a list of bikes to CSV"""
        if not bikes_list:
            logger.warning(f"No bikes to save to {filename}")
            return False
            
        try:
            # Get all possible fieldnames
            all_fields = set()
            for bike in bikes_list:
                all_fields.update(bike.keys())
            
            fieldnames = sorted(list(all_fields))
            
            with open(filename, "w", newline="", encoding="utf-8") as csvfile:
                writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
                writer.writeheader()
                for bike in bikes_list:
                    writer.writerow(bike)
            
            logger.info(f"Saved {len(bikes_list)} bikes to {filename}")
            return True
            
        except Exception as e:
            logger.error(f"Error saving to CSV {filename}: {e}")
            return False

def main():
    """Main function to run the comprehensive scraper"""
    parser = argparse.ArgumentParser(description="Comprehensive bike scraper for 99spokes.com")
    parser.add_argument("--year", type=int, default=2024, help="Model year to scrape")
    parser.add_argument("--output", default=None, help="Output CSV filename (default: bikes_YEAR_complete.csv)")
    parser.add_argument("--headless", action="store_true", help="Run in headless mode")
    parser.add_argument("--pages", type=int, default=10, help="Maximum pages per filter to scrape")
    parser.add_argument("--resume", action="store_true", help="Resume from previous progress")
    parser.add_argument("--all-years", action="store_true", help="Scrape all years from 2020 to 2024")
    
    args = parser.parse_args()
    
    years_to_scrape = [args.year]
    if args.all_years:
        years_to_scrape = list(range(2020, 2025))  # 2020-2024
    
    scraper = ComprehensiveBikeScraper(headless=args.headless, allow_manual_intervention=not args.headless)
    
    try:
        # Load previous progress if resuming
        if args.resume:
            scraper.load_progress()
        
        for year in years_to_scrape:
            output_file = args.output or f"bikes_{year}_complete.csv"
            
            print(f"\n{'='*80}")
            print(f"SCRAPING {year} BIKES - COMPREHENSIVE MODE")
            print(f"{'='*80}")
            print(f"This will systematically go through all filter combinations")
            print(f"to extract all available bikes for {year}.")
            print(f"Output file: {output_file}")
            print(f"Maximum pages per filter: {args.pages}")
            print(f"{'='*80}\n")
            
            # Perform the comprehensive scrape
            bikes = scraper.scrape_bikes_with_filters(year, max_pages_per_filter=args.pages)
            
            # Save the results
            scraper.save_bikes_to_csv(bikes, output_file)
            
            print(f"\nCompleted scrape for {year}. Found {len(bikes)} unique bikes.")
            print(f"Results saved to {output_file}")
            
            # Save JSON version as well for easier processing
            json_file = output_file.replace('.csv', '.json')
            with open(json_file, 'w', encoding='utf-8') as f:
                json.dump(bikes, f, indent=2)
            print(f"JSON version saved to {json_file}")
            
            # Pause between years to avoid overwhelming the server
            if len(years_to_scrape) > 1 and year != years_to_scrape[-1]:
                time.sleep(10)
    
    except KeyboardInterrupt:
        print("\nScraping interrupted by user. Progress has been saved.")
        print("You can resume later with --resume option.")
    
    except Exception as e:
        print(f"\nError during scraping: {e}")
        import traceback
        traceback.print_exc()
        print("\nProgress has been saved. You can resume later with --resume option.")
        
    finally:
        scraper.close()

if __name__ == "__main__":
    main()
