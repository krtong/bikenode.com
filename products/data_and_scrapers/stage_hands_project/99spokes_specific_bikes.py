import cloudscraper
import json
import os
import time
import random
from bs4 import BeautifulSoup
from datetime import datetime
from urllib.parse import urljoin

class NinetyNineSpokesSpecificScraper:
    """
    Scraper for specific bike URLs on 99spokes.com using cloudscraper
    """
    
    def __init__(self):
        self.base_url = "https://99spokes.com"
        self.timestamp = datetime.now().isoformat().replace(':', '-')
        self.scraper = self._create_scraper()
        self.output_dirs = ['data', 'html', 'screenshots', 'checkpoints']
        self._create_output_dirs()
        
        # List of specific bike URLs to scrape
        self.bike_urls = [
            "https://99spokes.com/bikes/specialized/2023/stumpjumper-alloy",
            "https://99spokes.com/bikes/trek/2023/marlin-5",
            "https://99spokes.com/bikes/cannondale/2023/topstone-1",
            "https://99spokes.com/bikes/giant/2023/tcr-advanced-pro-1",
            "https://99spokes.com/bikes/santa-cruz/2023/hightower",
            "https://99spokes.com/bikes/specialized/2023/diverge-comp-e5",
            "https://99spokes.com/bikes/canyon/2023/endurace-cf-sl-8",
            "https://99spokes.com/bikes/trek/2023/fuel-ex-8",
            "https://99spokes.com/bikes/giant/2023/revolt-advanced-2",
            "https://99spokes.com/bikes/specialized/2023/tarmac-sl7-expert"
        ]
        
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
    
    def get_bike_details(self, url):
        """Get detailed information for a specific bike URL"""
        print(f"Fetching details for {url}...")
        
        try:
            response = self.scraper.get(url)
            
            # Extract bike name from URL for filename
            url_parts = url.split('/')
            brand = url_parts[-2] if len(url_parts) > 2 else "unknown"
            model = url_parts[-1] if len(url_parts) > 1 else "unknown"
            
            filename = f"bike_detail_{brand}_{model}".lower().replace(' ', '_')
            self.save_html(response.text, f"{filename}.html")
            
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Extract bike information
            bike = {
                'url': url,
                'brand': brand.title(),
                'model': model.replace('-', ' ').title()
            }
            
            # Try to extract better brand and model information
            title_element = soup.select_one('h1, .title, [data-testid="bike-title"]')
            if title_element:
                title_text = title_element.get_text(strip=True)
                parts = title_text.split(' ', 1)
                if len(parts) >= 2:
                    bike['brand'] = parts[0]
                    bike['model'] = parts[1]
            
            # Extract price
            price_element = soup.select_one('.price, [data-testid="bike-price"], .cost')
            if price_element:
                bike['price'] = price_element.get_text(strip=True)
            
            # Extract year
            year_element = soup.select_one('.year, [data-testid="bike-year"], .model-year')
            if year_element:
                bike['year'] = year_element.get_text(strip=True)
            else:
                # Try to extract year from URL
                for part in url_parts:
                    if part.isdigit() and len(part) == 4 and 2000 <= int(part) <= 2030:
                        bike['year'] = part
                        break
            
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
            
            # Extract images
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
            
            # Extract geometry if available
            geometry = {}
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
            
            if geometry:
                bike['geometry'] = geometry
            
            self.save_checkpoint(bike, filename)
            return bike
            
        except Exception as e:
            print(f"Error fetching details for {url}: {str(e)}")
            return {'url': url, 'error': str(e)}
    
    def run(self):
        """Run the scraper to collect bike data"""
        print(f"Starting 99spokes.com specific bike scraper at {self.timestamp}...")
        
        all_bikes = []
        
        # Get details for each bike URL
        for url in self.bike_urls:
            bike = self.get_bike_details(url)
            if bike:
                all_bikes.append(bike)
            
            # Add a delay before the next request
            if url != self.bike_urls[-1]:
                self.random_delay(3, 6)
        
        # Save all collected data
        self.save_data(all_bikes, f"99spokes_specific_bikes_{self.timestamp}.json")
        
        print(f"\nScraping complete! Collected data for {len(all_bikes)} bikes.")
        return all_bikes


if __name__ == "__main__":
    scraper = NinetyNineSpokesSpecificScraper()
    scraper.run()