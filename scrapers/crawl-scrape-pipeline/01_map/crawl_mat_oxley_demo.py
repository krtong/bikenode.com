#!/usr/bin/env python3
"""
Demo crawler for Mat Oxley articles - first 3 pages only.
"""

import urllib.request
import ssl
import re
import csv
import time
from datetime import datetime

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
}

def fetch_page(url):
    """Fetch a page."""
    try:
        req = urllib.request.Request(url, headers=headers)
        response = urllib.request.urlopen(req, context=ctx, timeout=30)
        if response.getcode() == 200:
            return response.read().decode('utf-8', errors='ignore')
    except Exception as e:
        print(f"Error: {e}")
    return None

def extract_article_links(html):
    """Extract article links from listing page."""
    links = []
    
    # Find article links - looking for actual article URLs
    pattern = r'href="(/articles/motorcycles/[^"]+)"'
    matches = re.findall(pattern, html)
    
    base = "https://www.motorsportmagazine.com"
    for match in matches:
        if '/author/' not in match and '/category/' not in match:
            links.append(base + match)
    
    return list(set(links))  # Remove duplicates

def get_article_info(url, html):
    """Extract article information."""
    info = {'url': url}
    
    # Title
    title_match = re.search(r'<h1[^>]*>([^<]+)</h1>', html)
    if title_match:
        info['title'] = title_match.group(1).strip()
    else:
        title_match = re.search(r'<title>([^<]+)</title>', html)
        if title_match:
            info['title'] = title_match.group(1).strip()
    
    # Check if Mat Oxley
    if 'mat oxley' in html.lower():
        info['author'] = 'Mat Oxley'
    else:
        info['author'] = 'Unknown'
    
    # Date
    date_match = re.search(r'<time[^>]*datetime="([^"]+)"', html)
    if date_match:
        info['date'] = date_match.group(1)[:10]  # Just date part
    
    return info

def main():
    print("Mat Oxley Article Crawler Demo")
    print("="*60)
    
    articles = []
    base_url = "https://www.motorsportmagazine.com/articles/author/mat-oxley_writer/"
    
    # Crawl first 3 pages
    for page_num in range(1, 4):
        if page_num == 1:
            page_url = base_url
        else:
            page_url = f"{base_url}page/{page_num}/"
        
        print(f"\nCrawling page {page_num}: {page_url}")
        html = fetch_page(page_url)
        
        if html:
            article_links = extract_article_links(html)
            print(f"Found {len(article_links)} article links")
            
            # Fetch first 5 articles from each page
            for i, article_url in enumerate(article_links[:5]):
                print(f"  Fetching article {i+1}: {article_url}")
                article_html = fetch_page(article_url)
                
                if article_html:
                    info = get_article_info(article_url, article_html)
                    if info.get('author') == 'Mat Oxley':
                        articles.append(info)
                        print(f"    ✅ {info.get('title', 'No title')[:60]}...")
                
                time.sleep(0.3)  # Rate limit
        
        time.sleep(0.5)
    
    # Save results
    print(f"\n{'='*60}")
    print(f"Found {len(articles)} Mat Oxley articles")
    
    if articles:
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f'mat_oxley_demo_{timestamp}.csv'
        
        with open(filename, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=['url', 'title', 'author', 'date'])
            writer.writeheader()
            writer.writerows(articles)
        
        print(f"Saved to {filename}")
        
        print("\nSample articles:")
        for i, article in enumerate(articles[:5]):
            print(f"{i+1}. {article.get('title', 'No title')[:70]}...")
            print(f"   Date: {article.get('date', 'No date')}")

if __name__ == "__main__":
    main()