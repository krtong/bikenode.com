#!/usr/bin/env python3
"""
Test additional sites that might block crawlers.
"""

import requests
from collections import defaultdict

# Additional challenging sites
TEST_SITES = [
    # News/Media with paywalls
    "nytimes.com",
    "ft.com",
    "bloomberg.com",
    "economist.com",
    
    # Social media requiring auth
    "instagram.com",
    "twitter.com",
    "pinterest.com",
    "tiktok.com",
    
    # E-commerce with bot protection  
    "nike.com",
    "adidas.com",
    "supreme.com",
    "stockx.com",
    
    # Streaming/Entertainment
    "netflix.com",
    "hulu.com",
    "spotify.com",
    "twitch.tv",
    
    # Gaming
    "steampowered.com",
    "epicgames.com",
    "roblox.com",
    
    # Other protected sites
    "airbnb.com",
    "uber.com",
    "doordash.com"
]

def quick_test(url):
    """Quick test to get status code."""
    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'max-age=0',
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=10, allow_redirects=True)
        return response.status_code, response.url
    except Exception as e:
        return f"Error: {type(e).__name__}", url

def main():
    print("Testing Additional Sites for Failures")
    print("=" * 60)
    
    results = defaultdict(list)
    
    for site in TEST_SITES:
        url = f"https://{site}/"
        status, final_url = quick_test(url)
        results[status].append((site, final_url))
        print(f"{site:<20} -> {status}")
    
    print("\n" + "=" * 60)
    print("SUMMARY BY STATUS CODE")
    print("=" * 60)
    
    # Sort by status code
    for status in sorted(results.keys(), key=lambda x: (isinstance(x, str), x)):
        sites = results[status]
        print(f"\n{status} ({len(sites)} sites):")
        for site, final_url in sites:
            if final_url != f"https://{site}/":
                print(f"  - {site} (redirected to {final_url})")
            else:
                print(f"  - {site}")
    
    # Calculate success rate
    total = len(TEST_SITES)
    success = len([s for s, _ in results.get(200, [])])
    print(f"\nSuccess Rate: {success}/{total} ({success/total*100:.1f}%)")
    
    # List all non-200 sites
    non_200_sites = []
    for status, sites in results.items():
        if status != 200:
            non_200_sites.extend([s[0] for s in sites])
    
    if non_200_sites:
        print(f"\nSites that didn't return 200:")
        for site in sorted(non_200_sites):
            print(f"  - {site}")

if __name__ == "__main__":
    main()