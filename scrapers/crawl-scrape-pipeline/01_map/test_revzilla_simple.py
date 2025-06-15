#!/usr/bin/env python3
"""
Simple RevZilla test without compression.
"""

import urllib.request
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    # Remove Accept-Encoding to get uncompressed response
    'DNT': '1',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
}

url = 'https://www.revzilla.com/'

req = urllib.request.Request(url, headers=headers)
response = urllib.request.urlopen(req, context=ctx, timeout=30)
content = response.read()

try:
    html = content.decode('utf-8')
except:
    html = content.decode('latin-1')

print(f"Status: {response.getcode()}")
print(f"Headers: {dict(response.headers)}")
print(f"Size: {len(content)} bytes")
print("\nFirst 2000 characters:")
print("-" * 50)
print(html[:2000])

# Check if it's real content
if 'RevZilla' in html or 'motorcycle' in html:
    print("\n✅ Contains RevZilla content")
elif 'cloudflare' in html.lower() or 'captcha' in html.lower():
    print("\n❌ Blocked by Cloudflare/Captcha")
else:
    print("\n⚠️  Unknown content")