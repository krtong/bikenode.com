import cloudscraper
import json
import os
import re
import time
import random
from bs4 import BeautifulSoup
from datetime import datetime
from urllib.parse import urljoin

class NinetyNineSpokesScraperEnhanced:
    """
    Enhanced scraper for 99spokes.com using cloudscraper to bypass Cloudflare protection
    """
    
    def __init__(self):
        self.base_url = "https://99spokes.com"
        self.bikes_url = "https://99spokes.com/en-US/bikes"
        self.timestamp = datetime.now().isoformat().replace(':', '-')
        self.scraper = self._create_scraper()
        self.output_dirs = ['data', 'html', 'screenshots', 'checkpoints']
        self._create_output_dirs()
        
    def _create_scraper(self):
        """Create a cloudscraper session with browser emulation"""
        return cloudscraper.create_scraper(
            browser={
                'browser': 'chrome',
                'platform': 'windows',
                'desktop': True
            },
            delay=10
        )
    
    def _create_output_dirs(self):
        """Create output directories if they don't exist"""
        for dir_name in self.output_dirs:
            dir_path = os.path.join(os.path.dirname(__file__), dir_name)
            if not os.path.exists(dir_path):
                os.makedirs(dir_path)
    
    def save_html(self, html, filename):
        """Save HTML content to a file"""
        html_path = os.path.join(os.path.dirname(__file__), 'html', filename)
        with open(html_path, 'w', encoding='utf-8') as f:
            f.write(html)
        print(f"HTML saved to: {html_path}")
    
    def save_checkpoint(self, data, name):
        """Save data to a checkpoint file"""
        try:
            checkpoint_dir = os.path.join(os.path.dirname(__file__), 'checkpoints')
            checkpoint_path = os.path.join(checkpoint_dir, f"{name}_{self.timestamp}.json")
            with open(checkpoint_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2)
            print(f"Checkpoint saved: {name}")
        except Exception as e:
            print(f"Failed to save checkpoint {name}: {str(e)}")
    
    def save_data(self, data, filename):
        """Save data to a JSON file in the data directory"""
        output_path = os.path.join(os.path.dirname(__file__), 'data', filename)
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2)
        print(f"Data saved to: {output_path}")
    
    def random_delay(self, min_seconds=1, max_seconds=3):
        """Add a random delay between requests to avoid detection"""
        delay = random.uniform(min_seconds, max_seconds)
        print(f"Waiting for {delay:.2f} seconds...")
        time.sleep(delay)
    
    def get_bike_categories(self):
        """Get all bike categories from the main page"""
        print("Fetching bike categories...")
        response = self.scraper.get(self.bikes_url)
        self.save_html(response.text, "bikes_main_page.html")
        
        soup = BeautifulSoup(response.text, 'html.parser')
        categories = []
        
        # Look for category links
        category_links = soup.select('a[href*="/bikes/"]')
        for link in category_links:
            category_url = urljoin(self.base_url, link.get('href'))
            category_name = link.get_text(strip=True)
            if category_name and category_url and '/bikes/' in category_url:
                categories.append({
                    'name': category_name,
                    'url': category_url
                })
        
        # Remove duplicates
        unique_categories = []
        seen_urls = set()
        for category in categories:
            if category['url'] not in seen_urls:
                unique_categories.append(category)
                seen_urls.add(category['url'])
        
        print(f"Found {len(unique_categories)} bike categories")
        self.save_checkpoint(unique_categories, "bike_categories")
        return unique_categories
    
    def get_bikes_from_category(self, category, max_pages=1):
        """Get bikes from a specific category"""
        print(f"Fetching bikes from category: {category['name']}...")
        bikes = []
        
        for page in range(1, max_pages + 1):
            page_url = f"{category['url']}?page={page}"
            print(f"Fetching page {page} from {category['name']}...")
            
            try:
                response = self.scraper.get(page_url)
                self.save_html(response.text, f"category_{category['name'].lower().replace(' ', '_')}_page_{page}.html")
                
                soup = BeautifulSoup(response.text, 'html.parser')
                
                # Look for bike cards
                bike_cards = soup.select('.bike-card, [data-testid="bike-card"], .card, article, div.grid > div')
                
                if not bike_cards:
                    # Try a more generic approach
                    bike_cards = []
                    links = soup.select('a[href*="/bikes/"]')
                    for link in links:
                        if link.select_one('img') and not any(cls in link.get('class', []) for cls in ['category', 'nav']):
                            bike_cards.append(link)
                
                print(f"Found {len(bike_cards)} bike cards on page {page}")
                
                for card in bike_cards:
                    bike = self._extract_bike_from_card(card)
                    if bike and bike['url']:
                        bikes.append(bike)
                
                # Add a delay before the next page
                if page < max_pages:
                    self.random_delay(2, 5)
                
            except Exception as e:
                print(f"Error fetching page {page} from {category['name']}: {str(e)}")
        
        print(f"Extracted {len(bikes)} bikes from category: {category['name']}")
        self.save_checkpoint(bikes, f"bikes_category_{category['name'].lower().replace(' ', '_')}")
        return bikes
    
    def _extract_bike_from_card(self, card):
        """Extract bike information from a card element"""
        # Helper function to find text using selectors
        def find_text(selectors):
            for selector in selectors:
                el = card.select_one(selector)
                if el and el.get_text(strip=True):
                    return el.get_text(strip=True)
            return ''
        
        # Extract data
        brand = find_text(['.brand', '[data-testid="bike-brand"]', '.manufacturer', 'h3', '.title']) or 'Unknown Brand'
        model = find_text(['.model', '[data-testid="bike-model"]', '.name', 'h4', '.subtitle']) or 'Unknown Model'
        price = find_text(['.price', '[data-testid="bike-price"]', '.price', '.cost'])
        category = find_text(['.category', '[data-testid="bike-category"]', '.type', '.bike-type'])
        year = find_text(['.year', '[data-testid="bike-year"]', '.model-year'])
        
        # Extract URL
        url = ''
        if card.name == 'a':
            url = card.get('href', '')
        else:
            link = card.select_one('a')
            if link:
                url = link.get('href', '')
        
        # Make sure URL is absolute
        if url and not url.startswith('http'):
            url = urljoin(self.base_url, url)
        
        # Extract image URL
        img_url = ''
        img = card.select_one('img')
        if img:
            img_url = img.get('src', '')
            if img_url and not img_url.startswith('http'):
                img_url = urljoin(self.base_url, img_url)
        
        return {
            'brand': brand,
            'model': model,
            'price': price,
            'category': category,
            'year': year,
            'url': url,
            'image_url': img_url
        }
    
    def get_bike_details(self, bike):
        """Get detailed information for a specific bike"""
        print(f"Fetching details for {bike['brand']} {bike['model']}...")
        
        if not bike['url']:
            print("No URL provided for this bike. Skipping...")
            return bike
        
        try:
            response = self.scraper.get(bike['url'])
            filename = f"bike_detail_{bike['brand']}_{bike['model']}".lower().replace(' ', '_').replace('/', '_')
            self.save_html(response.text, f"{filename}.html")
            
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Extract specifications
            specs = self._extract_bike_specs(soup)
            bike['specs'] = specs
            
            # Extract geometry
            geometry = self._extract_bike_geometry(soup)
            if geometry:
                bike['geometry'] = geometry
            
            # Extract additional images
            images = self._extract_bike_images(soup)
            if images:
                bike['images'] = images
            
            # Extract description
            description = self._extract_bike_description(soup)
            if description:
                bike['description'] = description
            
            self.save_checkpoint(bike, f"bike_detail_{bike['brand']}_{bike['model']}".lower().replace(' ', '_').replace('/', '_'))
            
        except Exception as e:
            print(f"Error fetching details for {bike['brand']} {bike['model']}: {str(e)}")
        
        return bike
    
    def _extract_bike_specs(self, soup):
        """Extract bike specifications from the detail page"""
        specs = {}
        
        # Try different selectors for spec tables
        spec_tables = soup.select('.specs-table, [data-testid="specs-table"], table, .specifications, .specs')
        
        for table in spec_tables:
            rows = table.select('tr')
            for row in rows:
                cells = row.select('th, td')
                if len(cells) >= 2:
                    label = cells[0].get_text(strip=True)
                    value = cells[1].get_text(strip=True)
                    if label and value:
                        specs[label] = value
        
        # Try to extract specs from definition lists
        dl_elements = soup.select('dl, .spec-list')
        for dl in dl_elements:
            dt_elements = dl.select('dt')
            dd_elements = dl.select('dd')
            
            for i in range(min(len(dt_elements), len(dd_elements))):
                label = dt_elements[i].get_text(strip=True)
                value = dd_elements[i].get_text(strip=True)
                if label and value:
                    specs[label] = value
        
        return specs
    
    def _extract_bike_geometry(self, soup):
        """Extract bike geometry information"""
        geometry = {}
        
        # Try to find geometry tables
        geo_tables = soup.select('.geometry-table, [data-testid="geometry-table"], table.geometry')
        
        for table in geo_tables:
            # Extract headers (sizes)
            headers = []
            header_row = table.select_one('thead tr')
            if header_row:
                headers = [th.get_text(strip=True) for th in header_row.select('th')]
                
                # Skip the first header if it's a label column
                if headers and headers[0].lower() in ['size', 'measurement', 'geometry']:
                    headers = headers[1:]
            
            # Extract measurements
            rows = table.select('tbody tr')
            for row in rows:
                cells = row.select('td')
                if len(cells) >= 2:
                    measurement = row.select_one('th, td:first-child')
                    if measurement:
                        measurement_name = measurement.get_text(strip=True)
                        values = {}
                        
                        for i, cell in enumerate(cells):
                            if i < len(headers):
                                size = headers[i]
                                value = cell.get_text(strip=True)
                                values[size] = value
                        
                        if values:
                            geometry[measurement_name] = values
        
        return geometry
    
    def _extract_bike_images(self, soup):
        """Extract additional bike images"""
        images = []
        
        # Try different selectors for image galleries
        image_elements = soup.select('.gallery img, .bike-image img, [data-testid="bike-image"], .product-image img, .carousel img')
        
        for img in image_elements:
            src = img.get('src', '')
            if src:
                if not src.startswith('http'):
                    src = urljoin(self.base_url, src)
                images.append(src)
        
        return list(set(images))  # Remove duplicates
    
    def _extract_bike_description(self, soup):
        """Extract bike description"""
        description_elements = soup.select('.description, [data-testid="bike-description"], .product-description')
        
        for element in description_elements:
            description = element.get_text(strip=True)
            if description:
                return description
        
        return ""
    
    def run(self, max_categories=3, max_bikes_per_category=5, max_pages_per_category=1):
        """Run the scraper to collect bike data"""
        print(f"Starting 99spokes.com enhanced scraper at {self.timestamp}...")
        
        # Get bike categories
        categories = self.get_bike_categories()
        
        # Limit the number of categories to scrape
        categories_to_scrape = categories[:max_categories]
        
        all_bikes = []
        
        # Scrape bikes from each category
        for category in categories_to_scrape:
            self.random_delay(3, 6)
            bikes = self.get_bikes_from_category(category, max_pages=max_pages_per_category)
            
            # Limit the number of bikes to get details for
            bikes_to_detail = bikes[:max_bikes_per_category]
            
            # Get details for each bike
            detailed_bikes = []
            for bike in bikes_to_detail:
                self.random_delay(3, 6)
                detailed_bike = self.get_bike_details(bike)
                detailed_bikes.append(detailed_bike)
            
            all_bikes.extend(detailed_bikes)
        
        # Save all collected data
        self.save_data(all_bikes, f"99spokes_bikes_enhanced_{self.timestamp}.json")
        
        print(f"\nScraping complete! Collected data for {len(all_bikes)} bikes.")
        return all_bikes


if __name__ == "__main__":
    scraper = NinetyNineSpokesScraperEnhanced()
    scraper.run(max_categories=2, max_bikes_per_category=3, max_pages_per_category=1)