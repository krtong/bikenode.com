#!/usr/bin/env python3
"""Simple test to verify web crawling works."""

import requests
from bs4 import BeautifulSoup

def test_basic_fetch():
    """Test basic HTTP fetch."""
    url = "https://quotes.toscrape.com"
    print(f"Testing basic fetch of {url}...")
    
    try:
        response = requests.get(url, timeout=10)
        print(f"✓ Status code: {response.status_code}")
        print(f"✓ Content length: {len(response.text)} bytes")
        
        # Parse with BeautifulSoup
        soup = BeautifulSoup(response.text, 'html.parser')
        title = soup.find('title')
        print(f"✓ Page title: {title.text if title else 'No title'}")
        
        # Find some quotes
        quotes = soup.find_all('div', class_='quote')
        print(f"✓ Found {len(quotes)} quotes on the page")
        
        # Find links
        links = soup.find_all('a', href=True)
        print(f"✓ Found {len(links)} links")
        
        # Show first few links
        print("\nFirst 5 links:")
        for i, link in enumerate(links[:5]):
            print(f"  - {link['href']}")
        
        return True
        
    except Exception as e:
        print(f"✗ Error: {e}")
        return False

if __name__ == "__main__":
    print("Testing basic web crawling capability...\n")
    
    if test_basic_fetch():
        print("\n✅ Basic crawling works! The pipeline should be able to fetch pages.")
    else:
        print("\n❌ Basic crawling failed. Check your internet connection.")