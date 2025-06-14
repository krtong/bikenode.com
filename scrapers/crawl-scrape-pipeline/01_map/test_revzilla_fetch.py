#!/usr/bin/env python3
"""
Test if we can fetch actual product pages from RevZilla using curl user agent.
"""

import requests
import time
import random
import sys
from pathlib import Path

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent / 'orchestration'))

from utils_minimal import setup_logging


def test_revzilla_fetch():
    """Test fetching actual product pages from RevZilla."""
    logger = setup_logging('test_revzilla', Path(__file__).parent / 'test_revzilla.log')
    
    # Sample product URLs from our crawl
    test_urls = [
        'https://www.revzilla.com/motorcycle/509-altitude-20-helmet-2020',
        'https://www.revzilla.com/motorcycle/abus-9809k-steel-o-chain-lock',
        'https://www.revzilla.com/motorcycle/abus-granit-8077-20-3d-alarm-disc-lock',
        'https://www.revzilla.com/motorcycle/abus-smartx-8078-3d-alarm-disc-lock',
        'https://www.revzilla.com/motorcycle/abus-trigger-alarm-20-355-disc-lock',
    ]
    
    # Test different user agents
    user_agents = {
        'curl': 'curl/7.64.1',
        'chrome': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'googlebot': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    }
    
    session = requests.Session()
    
    for ua_name, user_agent in user_agents.items():
        print(f"\n{'='*60}")
        print(f"Testing with {ua_name} user agent")
        print('='*60)
        
        session.headers.update({
            'User-Agent': user_agent,
            'Accept': '*/*' if ua_name == 'curl' else 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        })
        
        success_count = 0
        
        for i, url in enumerate(test_urls[:3]):  # Test first 3 URLs
            try:
                # Add delay between requests
                if i > 0:
                    delay = random.uniform(1.0, 2.0)
                    logger.info(f"Waiting {delay:.1f}s before next request")
                    time.sleep(delay)
                
                logger.info(f"Fetching: {url}")
                response = session.get(url, timeout=30)
                
                print(f"\nURL: {url}")
                print(f"Status: {response.status_code}")
                print(f"Content-Type: {response.headers.get('Content-Type', 'N/A')}")
                print(f"Content Length: {len(response.text)}")
                
                if response.status_code == 200:
                    # Check for bot detection patterns
                    content_lower = response.text.lower()
                    bot_patterns = [
                        'captcha', 'cf-browser-verification',
                        'bot detected', 'access denied', 'forbidden',
                        'unusual traffic', 'automated', 'not a robot',
                        'please verify you are human', 'security check'
                    ]
                    
                    bot_detected = any(pattern in content_lower for pattern in bot_patterns)
                    
                    if bot_detected:
                        print("WARNING: Bot detection pattern found!")
                        logger.warning(f"Bot detection pattern found for {url}")
                    else:
                        # Check for actual product content
                        product_indicators = [
                            'add to cart', 'price', 'product-title',
                            'product-description', 'availability',
                            'reviews', 'rating', 'sku'
                        ]
                        
                        has_product_content = any(indicator in content_lower for indicator in product_indicators)
                        
                        if has_product_content:
                            print("SUCCESS: Product content found!")
                            success_count += 1
                            
                            # Extract some basic product info
                            if '<title>' in response.text:
                                title_start = response.text.find('<title>') + 7
                                title_end = response.text.find('</title>', title_start)
                                title = response.text[title_start:title_end].strip()
                                print(f"Page Title: {title}")
                            
                            # Look for price
                            price_patterns = ['$', 'price', 'cost']
                            for pattern in price_patterns:
                                if pattern in content_lower:
                                    print(f"Price indicator found: {pattern}")
                                    break
                        else:
                            print("WARNING: No product content indicators found")
                            logger.warning(f"No product content found for {url}")
                            
                        # Save a sample for inspection
                        if success_count == 1:
                            sample_file = Path(__file__).parent / f'sample_{ua_name}.html'
                            with open(sample_file, 'w', encoding='utf-8') as f:
                                f.write(response.text)
                            print(f"Sample saved to: {sample_file}")
                            
                elif response.status_code == 403:
                    print("BLOCKED: 403 Forbidden")
                    logger.error(f"403 Forbidden for {url}")
                elif response.status_code == 404:
                    print("ERROR: 404 Not Found")
                    logger.error(f"404 Not Found for {url}")
                else:
                    print(f"ERROR: Unexpected status code {response.status_code}")
                    logger.error(f"Unexpected status {response.status_code} for {url}")
                    
            except Exception as e:
                print(f"ERROR: {e}")
                logger.error(f"Error fetching {url}: {e}")
        
        print(f"\nSummary for {ua_name}: {success_count}/{len(test_urls[:3])} successful")
        
    # Test rate limiting with curl
    print(f"\n{'='*60}")
    print("Testing rate limiting with curl user agent")
    print('='*60)
    
    session.headers.update({
        'User-Agent': 'curl/7.64.1',
        'Accept': '*/*',
    })
    
    # Test rapid requests
    print("\nTesting 5 rapid requests with minimal delay...")
    for i, url in enumerate(test_urls):
        try:
            if i > 0:
                time.sleep(0.5)  # Very short delay
            
            start_time = time.time()
            response = session.get(url, timeout=30)
            elapsed = time.time() - start_time
            
            print(f"Request {i+1}: Status {response.status_code}, Time: {elapsed:.2f}s")
            
            if response.status_code != 200:
                print(f"Rate limited or blocked at request {i+1}")
                break
                
        except Exception as e:
            print(f"Error at request {i+1}: {e}")
            break
            
    print("\nTest complete!")
    
    # Final recommendation
    print(f"\n{'='*60}")
    print("RECOMMENDATION:")
    print('='*60)
    print("Based on the tests, use the following configuration for RevZilla:")
    print("- User Agent: curl/7.64.1")
    print("- Accept Header: */*")
    print("- Delay between requests: 1-2 seconds")
    print("- Monitor for rate limiting and adjust delays as needed")


if __name__ == '__main__':
    test_revzilla_fetch()