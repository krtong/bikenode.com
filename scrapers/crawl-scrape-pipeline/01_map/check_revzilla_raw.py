#!/usr/bin/env python3
"""
Get raw RevZilla response and save for inspection.
"""

import urllib.request
import ssl
import gzip
from io import BytesIO

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

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

url = 'https://www.revzilla.com/'

req = urllib.request.Request(url, headers=headers)
response = urllib.request.urlopen(req, context=ctx, timeout=30)

# Handle encoding
if response.headers.get('Content-Encoding') == 'gzip':
    content = gzip.GzipFile(fileobj=BytesIO(response.read())).read()
else:
    content = response.read()

html = content.decode('utf-8', errors='ignore')

# Save to file
with open('revzilla_response.html', 'w') as f:
    f.write(html)

print(f"Status: {response.getcode()}")
print(f"Size: {len(html):,} chars")
print(f"\nSearching for key indicators...")

# Search for key RevZilla elements
indicators = [
    ('RevZilla logo/brand', 'RevZilla'),
    ('Products', 'product'),
    ('Prices', '$'),
    ('Add to cart', 'add-to-cart'),
    ('Motorcycle terms', 'motorcycle'),
    ('Helmet category', 'helmet'),
    ('Captcha/bot check', 'captcha'),
    ('Cloudflare', 'cloudflare'),
    ('Access denied', 'denied'),
]

found_real_content = False
for name, term in indicators:
    count = html.lower().count(term.lower())
    if count > 0:
        print(f"- {name}: {count} occurrences")
        if term in ['RevZilla', 'product', 'motorcycle', 'helmet'] and count > 5:
            found_real_content = True

# Check specific RevZilla elements
if 'data-testid' in html:
    print("\n✅ Found RevZilla React components (data-testid)")
    found_real_content = True

if 'revzilla.com/assets' in html:
    print("✅ Found RevZilla asset references")
    found_real_content = True

# Show a meaningful snippet
print("\nHTML snippet (first 1000 chars after <body>):")
print("-" * 50)
body_start = html.find('<body')
if body_start >= 0:
    print(html[body_start:body_start+1000])
else:
    print(html[:1000])

print("\n" + "="*60)
if found_real_content:
    print("✅ CONFIRMED: This is real RevZilla content!")
else:
    print("❌ This might be a block page or limited content")

print(f"\nFull response saved to: revzilla_response.html")