#!/usr/bin/env python3
"""
Simple test to extract data from fetched HTML files without dependencies.
This demonstrates that the pipeline works with just BeautifulSoup.
"""

import json
from pathlib import Path
from bs4 import BeautifulSoup

def extract_quotes_data():
    """Extract quotes from the fetched HTML files."""
    html_dir = Path("08_fetch/html/batch_0000")
    results = []
    
    # Process the main quotes page
    main_page = html_dir / "quotes.toscrape.com_.html"
    if main_page.exists():
        print(f"Processing {main_page.name}...")
        
        with open(main_page, 'r', encoding='utf-8') as f:
            soup = BeautifulSoup(f.read(), 'html.parser')
        
        # Extract quotes
        for quote_div in soup.find_all('div', class_='quote'):
            quote_data = {}
            
            # Extract quote text
            quote_text = quote_div.find('span', class_='text')
            if quote_text:
                quote_data['text'] = quote_text.text.strip()
            
            # Extract author
            author = quote_div.find('small', class_='author')
            if author:
                quote_data['author'] = author.text.strip()
            
            # Extract tags
            tags = []
            for tag in quote_div.find_all('a', class_='tag'):
                tags.append(tag.text.strip())
            quote_data['tags'] = tags
            
            results.append(quote_data)
    
    return results

def extract_revzilla_data():
    """Extract data from RevZilla pages (if available)."""
    results = []
    
    # Check for RevZilla dump
    dump_file = Path("01_map/dump.csv")
    if dump_file.exists():
        print("\nRevZilla URLs found in dump.csv:")
        with open(dump_file, 'r') as f:
            lines = f.readlines()[1:6]  # Skip header, show first 5
            for line in lines:
                parts = line.strip().split(',')
                if len(parts) >= 3:
                    url, status, content_type = parts[:3]
                    print(f"  - {url} [{status}] {content_type}")
    
    # Check grouped URLs
    group_dir = Path("03_group/by_template")
    if group_dir.exists():
        print("\nRevZilla URL patterns found:")
        patterns = list(group_dir.glob("*.txt"))[:10]  # Show first 10
        for pattern_file in patterns:
            if pattern_file.name != '.txt':  # Skip empty filename
                print(f"  - {pattern_file.stem}")
                with open(pattern_file, 'r') as f:
                    urls = f.readlines()
                    if urls:
                        print(f"    Example: {urls[0].strip()}")
    
    return results

def main():
    """Run extraction tests."""
    print("Testing data extraction from crawled pages...\n")
    
    # Test quotes extraction
    quotes = extract_quotes_data()
    if quotes:
        print(f"Successfully extracted {len(quotes)} quotes!")
        print("\nSample quote:")
        print(json.dumps(quotes[0], indent=2))
    
    # Test RevZilla data
    extract_revzilla_data()
    
    # Save sample results
    if quotes:
        output_file = Path("test_extraction_results.json")
        with open(output_file, 'w') as f:
            json.dump(quotes[:5], f, indent=2)
        print(f"\nSaved sample results to {output_file}")

if __name__ == "__main__":
    main()