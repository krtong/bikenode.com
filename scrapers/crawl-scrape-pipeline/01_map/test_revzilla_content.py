#!/usr/bin/env python3
"""
Test what content RevZilla returns with curl user agent.
"""

import requests
import time
import sys
from pathlib import Path

def test_revzilla_content():
    """Test and save RevZilla response content."""
    
    test_url = 'https://www.revzilla.com/motorcycle/abus-9809k-steel-o-chain-lock'
    
    session = requests.Session()
    session.headers.update({
        'User-Agent': 'curl/7.64.1',
        'Accept': '*/*',
    })
    
    print(f"Fetching: {test_url}")
    
    try:
        response = session.get(test_url, timeout=30)
        
        print(f"Status: {response.status_code}")
        print(f"Content-Type: {response.headers.get('Content-Type', 'N/A')}")
        print(f"Content Length: {len(response.text)}")
        
        # Save the full response
        output_file = Path(__file__).parent / 'revzilla_response.html'
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(response.text)
        print(f"\nFull response saved to: {output_file}")
        
        # Check what's in the response
        content_lower = response.text.lower()
        
        # Look for specific patterns
        patterns_to_check = [
            ('Cloudflare', 'cloudflare'),
            ('Challenge', 'challenge'),
            ('Bot detection', 'bot'),
            ('JavaScript check', 'javascript'),
            ('Product title', '<h1'),
            ('Price', 'price'),
            ('Add to cart', 'add to cart'),
            ('Reviews', 'review'),
            ('Description', 'description'),
        ]
        
        print("\nContent analysis:")
        for name, pattern in patterns_to_check:
            if pattern in content_lower:
                print(f"✓ Found: {name}")
                # Find and print a snippet
                idx = content_lower.find(pattern)
                snippet = response.text[max(0, idx-50):idx+100].replace('\n', ' ')
                print(f"  Snippet: ...{snippet}...")
            else:
                print(f"✗ Not found: {name}")
                
        # Check if it's a JavaScript-rendered page
        if '<noscript>' in content_lower:
            print("\n⚠️  Page contains <noscript> tags - likely requires JavaScript")
            
        # Look for data in JSON format
        if 'application/json' in content_lower or 'window.__INITIAL_STATE__' in response.text:
            print("\n📦 Found JSON data in page")
            
    except Exception as e:
        print(f"Error: {e}")


if __name__ == '__main__':
    test_revzilla_content()