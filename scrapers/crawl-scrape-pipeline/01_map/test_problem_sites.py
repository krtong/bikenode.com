#!/usr/bin/env python3
"""
Test problem sites with different methods to understand failures.
"""

import asyncio
import sys
from pathlib import Path

# Sites that return non-200 status codes
PROBLEM_SITES = [
    ("wsj.com", "401 - DataDome protection"),
    ("bloomberg.com", "403 - Forbidden"),
    ("adidas.com", "403 - Forbidden"),
    ("stockx.com", "403 - Forbidden"),
    ("doordash.com", "403 - Forbidden"),
]

async def test_with_ultra_stealth(domain):
    """Test problem site with ultra stealth crawler."""
    sys.path.append(str(Path(__file__).parent.parent))
    from ultra_stealth_crawler import UltraStealthCrawler
    
    crawler = UltraStealthCrawler(domain)
    
    # Test just the homepage
    test_url = f'https://{domain}/'
    result = await crawler.fetch_url_ultra_stealth(test_url)
    
    return result

async def main():
    print("Testing Problem Sites with Ultra Stealth Crawler")
    print("=" * 60)
    
    for domain, issue in PROBLEM_SITES:
        print(f"\n{domain} (Known issue: {issue})")
        print("-" * 40)
        
        result = await test_with_ultra_stealth(domain)
        
        print(f"Status: {result['status_code']}")
        print(f"Method: {result['method']}")
        print(f"Size: {result['size']} bytes")
        
        if result['status_code'] == 200:
            print("✅ SUCCESS! Ultra stealth crawler bypassed the protection!")
        else:
            print("❌ Still blocked by protection")
        
        # Brief delay between sites
        await asyncio.sleep(2)
    
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print("\nThe ultra stealth crawler can bypass many protections but some sites")
    print("still block access:")
    print("\n1. WSJ.com - DataDome with 401 (requires subscription)")
    print("2. Bloomberg/Adidas/StockX/DoorDash - 403 Forbidden (IP or fingerprint based)")
    print("\nPossible solutions:")
    print("- Residential proxies for IP rotation")
    print("- More sophisticated browser fingerprinting")
    print("- API access or partnerships for protected content")
    print("- Respect site terms of service")

if __name__ == "__main__":
    asyncio.run(main())