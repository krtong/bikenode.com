import cloudscraper
import json
import os
import re
import time
import random
from bs4 import BeautifulSoup
from datetime import datetime
from urllib.parse import urljoin

class NinetyNineSpokesDirectScraper:
    """
    Direct scraper for 99spokes.com using cloudscraper to bypass Cloudflare protection
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
    
    def get_bikes_from_main_page(self, max_pages=2):
        """Get bikes directly from the main bikes page"""
        print(f"Fetching bikes from main page...")
        all_bikes = []
        
        for page in range(1, max_pages + 1):
            page_url = f"{self.bikes_url}?page={page}"
            print(f"Fetching page {page}...")
            
            try:
                response = self.scraper.get(page_url)
                self.save_html(response.text, f"bikes_main_page_{page}.html")
                
                soup = BeautifulSoup(response.text, 'html.parser')
                
                # Look for bike links
                bike_links = []
                
                # Try different approaches to find bike links
                # 1. Look for links with /bikes/ in the URL that aren't category links
                all_links = soup.select('a[href*="/bikes/"]')
                for link in all_links:
                    href = link.get('href', '')
                    # Skip category links
                    if '/bikes/categories/' not in href and '/bikes/brands/' not in href:
                        bike_links.append(link)
                
                # 2. Look for links with images that might be bike cards
                img_links = soup.select('a:has(img)')
                for link in img_links:
                    href = link.get('href', '')
                    if '/bikes/' in href and link not in bike_links:
                        bike_links.append(link)
                
                print(f"Found {len(bike_links)} potential bike links on page {page}")
                
                # Extract bike data from links
                page_bikes = []
                for link in bike_links:
                    bike = self._extract_bike_from_link(link)
                    if bike and bike['url'] and bike not in page_bikes:
                        page_bikes.append(bike)
                
                print(f"Extracted {len(page_bikes)} bikes from page {page}")
                self.save_checkpoint(page_bikes, f"bikes_main_page_{page}")
                
                all_bikes.extend(page_bikes)
                
                # Add a delay before the next page
                if page < max_pages:
                    self.random_delay(2, 5)
                
            except Exception as e:
                print(f"Error fetching page {page}: {str(e)}")
        
        print(f"Extracted {len(all_bikes)} bikes in total")
        return all_bikes
    
    def _extract_bike_from_link(self, link):
        """Extract bike information from a link element"""
        url = link.get('href', '')
        if not url:
            return None
        
        # Make URL absolute
        if not url.startswith('http'):
            url = urljoin(self.base_url, url)
        
        # Extract text content
        text = link.get_text(strip=True)
        
        # Try to extract brand and model from text or URL
        brand = 'Unknown Brand'
        model = 'Unknown Model'
        
        # Extract from URL
        url_parts = url.split('/')
        if len(url_parts) > 4:
            # URLs often have format /bikes/brand/model
            potential_brand = url_parts[-2]
            potential_model = url_parts[-1]
            
            if potential_brand and potential_brand != 'bikes':
                brand = potential_brand.replace('-', ' ').title()
            
            if potential_model:
                model = potential_model.replace('-', ' ').title()
        
        # Extract image URL
        img_url = ''
        img = link.select_one('img')
        if img:
            img_url = img.get('src', '')
            if img_url and not img_url.startswith('http'):
                img_url = urljoin(self.base_url, img_url)
        
        # Extract price if available
        price = ''
        price_element = link.select_one('.price, [data-testid="bike-price"], .cost')
        if price_element:
            price = price_element.get_text(strip=True)
        
        return {
            'brand': brand,
            'model': model,
            'url': url,
            'image_url': img_url,
            'price': price,
            'text': text
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
            
            # Try to extract better brand and model information
            title_element = soup.select_one('h1, .title, [data-testid="bike-title"]')
            if title_element:
                title_text = title_element.get_text(strip=True)
                parts = title_text.split(' ', 1)
                if len(parts) >= 2:
                    bike['brand'] = parts[0]
                    bike['model'] = parts[1]
            
            # Extract specifications
            specs = {}
            spec_tables = soup.select('table, .specs-table, [data-testid="specs-table"]')
            for table in spec_tables:
                rows = table.select('tr')
                for row in rows:
                    cells = row.select('th, td')
                    if len(cells) >= 2:
                        label = cells[0].get_text(strip=True)
                        value = cells[1].get_text(strip=True)
                        if label and value:
                            specs[label] = value
            
            if specs:
                bike['specs'] = specs
            
            # Extract description
            description_element = soup.select_one('.description, [data-testid="bike-description"], .product-description, article p')
            if description_element:
                bike['description'] = description_element.get_text(strip=True)
            
            # Extract additional images
            images = []
            image_elements = soup.select('img')
            for img in image_elements:
                src = img.get('src', '')
                if src and ('bike' in src.lower() or 'product' in src.lower()):
                    if not src.startswith('http'):
                        src = urljoin(self.base_url, src)
                    images.append(src)
            
            if images:
                bike['images'] = list(set(images))  # Remove duplicates
            
            self.save_checkpoint(bike, filename)
            
        except Exception as e:
            print(f"Error fetching details for {bike['brand']} {bike['model']}: {str(e)}")
        
        return bike
    
    def run(self, max_pages=2, max_bikes_for_details=5):
        """Run the scraper to collect bike data"""
        print(f"Starting 99spokes.com direct scraper at {self.timestamp}...")
        
        # Get bikes from main page
        bikes = self.get_bikes_from_main_page(max_pages=max_pages)
        
        # Limit the number of bikes to get details for
        bikes_for_details = bikes[:max_bikes_for_details]
        
        # Get details for each bike
        detailed_bikes = []
        for bike in bikes_for_details:
            self.random_delay(3, 6)
            detailed_bike = self.get_bike_details(bike)
            detailed_bikes.append(detailed_bike)
        
        # Save all collected data
        self.save_data(detailed_bikes, f"99spokes_bikes_direct_{self.timestamp}.json")
        
        print(f"\nScraping complete! Collected data for {len(detailed_bikes)} bikes with details.")
        return detailed_bikes


if __name__ == "__main__":
    scraper = NinetyNineSpokesDirectScraper()
    scraper.run(max_pages=2, max_bikes_for_details=5)