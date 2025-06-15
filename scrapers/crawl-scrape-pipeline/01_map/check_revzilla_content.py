#!/usr/bin/env python3
"""
Check what content RevZilla is actually serving to our crawler.
"""

import requests

url = "https://www.revzilla.com/"

headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
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

response = requests.get(url, headers=headers, timeout=30)

print(f"Status: {response.status_code}")
print(f"Content-Type: {response.headers.get('content-type', 'Not specified')}")
print(f"Size: {len(response.content):,} bytes")
print(f"\nFirst 1000 characters of response:\n")
print(response.text[:1000])
print("\n...")
print("\nLast 500 characters:\n")
print(response.text[-500:])

# Check for common blocking indicators
indicators = [
    "cloudflare",
    "captcha", 
    "challenge",
    "blocked",
    "denied",
    "robot",
    "verify",
    "javascript",
    "please wait"
]

print(f"\nChecking for blocking indicators:")
text_lower = response.text.lower()
for indicator in indicators:
    if indicator in text_lower:
        count = text_lower.count(indicator)
        print(f"  Found '{indicator}' {count} time(s)")

# Check if it's real content or a blocking page
if "<title>" in response.text:
    title = response.text.split("<title>")[1].split("</title>")[0]
    print(f"\nPage title: {title}")
    
# Check for product/commerce indicators
commerce_terms = ["product", "price", "cart", "motorcycle", "helmet", "jacket", "gear"]
commerce_found = [term for term in commerce_terms if term in text_lower]
if commerce_found:
    print(f"\nCommerce terms found: {commerce_found}")
else:
    print(f"\n⚠️  No commerce terms found - likely not the real site content")