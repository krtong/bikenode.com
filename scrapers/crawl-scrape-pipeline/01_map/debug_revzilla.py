#!/usr/bin/env python3
"""
Debug script to see what RevZilla returns
"""

import requests
import sys
from pathlib import Path

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent / 'orchestration'))

from utils_minimal import setup_logging

def debug_revzilla():
    logger = setup_logging('debug_revzilla', Path(__file__).parent / 'debug.log')
    
    # Try different approaches
    urls = [
        'https://www.revzilla.com/',
        'https://www.revzilla.com/robots.txt',
        'https://www.revzilla.com/sitemap.xml',
    ]
    
    for url in urls:
        print(f"\n{'='*60}")
        print(f"Testing: {url}")
        print('='*60)
        
        # Try with different user agents
        user_agents = [
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
            'curl/7.64.1',
        ]
        
        for ua in user_agents:
            try:
                headers = {
                    'User-Agent': ua,
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Connection': 'keep-alive',
                }
                
                response = requests.get(url, headers=headers, timeout=10)
                print(f"\nUser-Agent: {ua[:50]}...")
                print(f"Status: {response.status_code}")
                print(f"Headers: {dict(response.headers)}")
                
                if response.status_code == 200:
                    print(f"Content length: {len(response.text)}")
                    print(f"First 500 chars: {response.text[:500]}")
                    
                    # Check for common bot detection patterns
                    text_lower = response.text.lower()
                    if any(pattern in text_lower for pattern in ['captcha', 'challenge', 'cf-browser-verification', 'bot detected']):
                        print("WARNING: Bot detection pattern found!")
                    
                    # Count links
                    link_count = response.text.count('<a ')
                    print(f"Link count: {link_count}")
                    
            except Exception as e:
                print(f"Error with {ua[:30]}...: {e}")
                
    # Check if there's an API endpoint
    print(f"\n{'='*60}")
    print("Checking for API endpoints...")
    print('='*60)
    
    api_endpoints = [
        'https://www.revzilla.com/api/products',
        'https://www.revzilla.com/api/v1/products',
        'https://www.revzilla.com/api/v2/products',
        'https://api.revzilla.com/products',
    ]
    
    for endpoint in api_endpoints:
        try:
            response = requests.get(endpoint, headers={'User-Agent': user_agents[0]}, timeout=5)
            print(f"\n{endpoint}: {response.status_code}")
        except Exception as e:
            print(f"{endpoint}: Error - {e}")

if __name__ == '__main__':
    debug_revzilla()