import requests
from bs4 import BeautifulSoup
import time
import os

def scrape_motorcycle_data(year):
    url = f"https://bikez.com/year/{year}-motorcycle-models.php"
    print(f"Scraping data for {year} from {url}")
    
    try:
        response = requests.get(url)
        if response.status_code != 200:
            print(f"Failed to retrieve data for {year}. Status code: {response.status_code}")
            return None
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Find the main table with motorcycle models
        table = soup.find('table', {'class': 'zebra'})
        if not table:
            print(f"No data table found for {year}")
            return None
        
        rows = table.find_all('tr')
        data = []
        
        # Skip the header row
        for row in rows[1:]:
            cols = row.find_all('td')
            if len(cols) >= 4:
                model = cols[0].text.strip()
                rating = cols[1].text.strip()
                category = cols[2].text.strip()
                engine = cols[3].text.strip()
                data.append(f"{model}\t{rating}\t{category}\t{engine}")
        
        return data
    
    except Exception as e:
        print(f"Error scraping data for {year}: {e}")
        return None

def main():
    # Ensure data directory exists
    os.makedirs('data', exist_ok=True)
    
    for year in range(1894, 1949):
        data = scrape_motorcycle_data(year)
        if data:
            # Write header
            header = f"{year} motorcycle models\tRating\tCategory\tEngine"
            
            # Write data to file
            filename = f"data/{year}_motorcycles"
            with open(filename, 'w', encoding='utf-8') as f:
                f.write(header + '\n')
                f.write('\n'.join(data))
            
            print(f"Successfully saved data for {year} to {filename}")
        
        # Be polite to the server with a delay between requests
        time.sleep(2)

if __name__ == "__main__":
    main()