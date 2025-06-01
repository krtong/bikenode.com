import cloudscraper
import json
import os
import re
from bs4 import BeautifulSoup
from datetime import datetime

def main():
    print("Starting 99spokes.com scraper with cloudscraper...")
    
    # Create a timestamp for this scrape session
    timestamp = datetime.now().isoformat().replace(':', '-')
    
    # Create directories for output
    output_dirs = ['data', 'html', 'screenshots', 'checkpoints']
    for dir_name in output_dirs:
        dir_path = os.path.join(os.path.dirname(__file__), dir_name)
        if not os.path.exists(dir_path):
            os.makedirs(dir_path)
    
    # Create a cloudscraper session
    scraper = cloudscraper.create_scraper(
        browser={
            'browser': 'chrome',
            'platform': 'windows',
            'desktop': True
        },
        delay=10
    )
    
    try:
        # Fetch the bikes page
        print("Fetching 99spokes.com bikes page...")
        response = scraper.get('https://99spokes.com/en-US/bikes')
        
        # Save the HTML for debugging
        html_path = os.path.join(os.path.dirname(__file__), 'html', 'bikes_listing_page_cloudscraper.html')
        with open(html_path, 'w', encoding='utf-8') as f:
            f.write(response.text)
        
        print(f"Received HTML response ({len(response.text)} bytes)")
        print(f"HTML saved to: {html_path}")
        
        # Check if we got the Cloudflare challenge page
        if 'Just a moment' in response.text or 'Attention Required' in response.text:
            print("Still received Cloudflare challenge page.")
            return
        
        # Parse the HTML with BeautifulSoup
        print("Parsing HTML with BeautifulSoup...")
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Extract bike data
        bikes = extract_bikes(soup)
        
        if bikes:
            print(f"Extracted data for {len(bikes)} bikes")
            
            # Save the bike data
            save_checkpoint(bikes, f"bikes_listing_page_cloudscraper", timestamp)
            
            # Save to data directory
            output_path = os.path.join(os.path.dirname(__file__), 'data', f'99spokes_bikes_cloudscraper_{timestamp}.json')
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(bikes, f, indent=2)
            
            print(f"\nScraping complete! Collected data for {len(bikes)} bikes.")
            print(f"Data saved to: {output_path}")
            
            # Try to fetch details for a few bikes
            for i, bike in enumerate(bikes[:3]):
                if 'url' in bike and bike['url']:
                    print(f"Fetching details for {bike['brand']} {bike['model']}...")
                    try:
                        detail_response = scraper.get(bike['url'])
                        
                        # Save the HTML for debugging
                        detail_html_path = os.path.join(os.path.dirname(__file__), 'html', f'bike_detail_cloudscraper_{i}.html')
                        with open(detail_html_path, 'w', encoding='utf-8') as f:
                            f.write(detail_response.text)
                        
                        print(f"Detail page HTML saved to: {detail_html_path}")
                        
                        # Parse the detail page
                        detail_soup = BeautifulSoup(detail_response.text, 'html.parser')
                        
                        # Extract specs
                        specs_table = detail_soup.select_one('.specs-table, [data-testid="specs-table"], table')
                        if specs_table:
                            specs = {}
                            for row in specs_table.select('tr'):
                                cells = row.select('th, td')
                                if len(cells) >= 2:
                                    label = cells[0].get_text(strip=True)
                                    value = cells[1].get_text(strip=True)
                                    if label and value:
                                        specs[label] = value
                            
                            bike['specs'] = specs
                            print(f"Extracted {len(specs)} specifications")
                        
                        # Extract image URL
                        img = detail_soup.select_one('.bike-image img, [data-testid="bike-image"], .product-image img')
                        if img and img.get('src'):
                            bike['imageUrl'] = img['src']
                            print("Extracted image URL")
                        
                        # Save updated bike data
                        save_checkpoint(bike, f"bike_{bike['brand']}_{bike['model']}_cloudscraper".replace(' ', '_').lower(), timestamp)
                        
                    except Exception as e:
                        print(f"Error fetching details: {str(e)}")
        else:
            print("No bikes found in the HTML. Check the saved HTML file for debugging.")
        
    except Exception as e:
        print(f"Error occurred: {str(e)}")

def extract_bikes(soup):
    """Extract bike data from the soup object"""
    bikes = []
    
    # Try different selectors for bike cards
    selectors = [
        '.bike-card', 
        '[data-testid="bike-card"]', 
        '.card', 
        '.product-card',
        '.bike-list-item',
        '.bike',
        'article'
    ]
    
    bike_elements = []
    for selector in selectors:
        elements = soup.select(selector)
        if elements:
            print(f"Found {len(elements)} bikes using selector: {selector}")
            bike_elements = elements
            break
    
    # If no bike elements found, try a more generic approach
    if not bike_elements:
        print("No bikes found with specific selectors, trying generic approach...")
        links = soup.select('a')
        bike_elements = [link for link in links if 'bike' in link.get_text().lower() or 'bike' in link.get('href', '').lower()]
        print(f"Found {len(bike_elements)} potential bike links using generic approach")
    
    # Extract data from each bike element (limit to 5 for testing)
    for element in bike_elements[:5]:
        # Helper function to find text using selectors
        def find_text(selectors):
            for selector in selectors:
                el = element.select_one(selector)
                if el:
                    return el.get_text(strip=True)
            return ''
        
        # Extract data
        brand = find_text(['.brand', '[data-testid="bike-brand"]', '.manufacturer', 'h3', '.title']) or 'Unknown Brand'
        model = find_text(['.model', '[data-testid="bike-model"]', '.name', 'h4', '.subtitle']) or 'Unknown Model'
        price = find_text(['.price', '[data-testid="bike-price"]', '.price', '.cost'])
        category = find_text(['.category', '[data-testid="bike-category"]', '.type', '.bike-type'])
        
        # Extract URL
        url = ''
        if element.name == 'a':
            url = element.get('href', '')
        else:
            link = element.select_one('a')
            if link:
                url = link.get('href', '')
        
        # Make sure URL is absolute
        if url and not url.startswith('http'):
            url = f"https://99spokes.com{'' if url.startswith('/') else '/'}{url}"
        
        bikes.append({
            'brand': brand,
            'model': model,
            'price': price,
            'category': category,
            'url': url
        })
    
    return bikes

def save_checkpoint(data, name, timestamp):
    """Save data to a checkpoint file"""
    try:
        checkpoint_dir = os.path.join(os.path.dirname(__file__), 'checkpoints')
        checkpoint_path = os.path.join(checkpoint_dir, f"{name}_{timestamp}.json")
        with open(checkpoint_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2)
        print(f"Checkpoint saved: {name}")
    except Exception as e:
        print(f"Failed to save checkpoint {name}: {str(e)}")

if __name__ == "__main__":
    main()