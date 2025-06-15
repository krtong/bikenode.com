#!/usr/bin/env python3
"""
Enhanced crawler for Mat Oxley articles from Motor Sport Magazine.
"""

import urllib.request
import urllib.parse
import ssl
import csv
import time
import re
from pathlib import Path
from datetime import datetime
from collections import deque

# SSL context
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

class MatOxleyCrawlerV2:
    def __init__(self):
        self.base_url = "https://www.motorsportmagazine.com"
        self.author_base = "/articles/author/mat-oxley_writer/"
        self.visited = set()
        self.articles = []
        self.to_visit = deque()
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Cache-Control': 'max-age=0',
        }
        
        # Initialize with all pagination pages
        for page in range(1, 77):  # Up to page 76 based on test
            if page == 1:
                self.to_visit.append(f"{self.base_url}{self.author_base}")
            else:
                self.to_visit.append(f"{self.base_url}{self.author_base}page/{page}/")
    
    def fetch_page(self, url):
        """Fetch a page and return HTML content."""
        try:
            req = urllib.request.Request(url, headers=self.headers)
            response = urllib.request.urlopen(req, context=ctx, timeout=30)
            
            if response.getcode() == 200:
                content = response.read().decode('utf-8', errors='ignore')
                return content, response.getcode()
            return None, response.getcode()
            
        except Exception as e:
            print(f"Error fetching {url}: {e}")
            return None, 0
    
    def extract_articles_from_listing(self, html, page_url):
        """Extract article information from a listing page."""
        articles_found = []
        
        # Find article cards with class-based pattern
        article_pattern = r'<a[^>]*class="[^"]*article[^"]*"[^>]*href="([^"]+)"[^>]*>([^<]*)</a>'
        matches = re.findall(article_pattern, html)
        
        # Also try to find articles in a more general way
        if not matches:
            # Look for links to /articles/motorcycles/ or similar
            link_pattern = r'href="(/articles/[^"]+)"'
            all_links = re.findall(link_pattern, html)
            
            # Filter for actual article links (not category or author pages)
            for link in all_links:
                if ('/author/' not in link and 
                    '/category/' not in link and 
                    '/page/' not in link and
                    link.count('/') >= 3):  # Actual articles have deeper paths
                    articles_found.append({
                        'url': self.base_url + link,
                        'source_page': page_url
                    })
        else:
            for url, title in matches:
                if url.startswith('http'):
                    full_url = url
                else:
                    full_url = self.base_url + url
                
                articles_found.append({
                    'url': full_url,
                    'title_hint': title.strip(),
                    'source_page': page_url
                })
        
        return articles_found
    
    def extract_article_metadata(self, url, html):
        """Extract detailed metadata from an article page."""
        metadata = {
            'url': url,
            'title': '',
            'author': '',
            'date': '',
            'category': '',
            'description': '',
            'word_count': 0
        }
        
        # Extract title
        title_patterns = [
            r'<h1[^>]*>([^<]+)</h1>',
            r'<title>([^<]+)</title>',
            r'property="og:title"\s+content="([^"]+)"',
        ]
        for pattern in title_patterns:
            match = re.search(pattern, html)
            if match:
                metadata['title'] = match.group(1).strip()
                break
        
        # Verify it's a Mat Oxley article
        if 'mat oxley' in html.lower() or 'Mat Oxley' in html:
            metadata['author'] = 'Mat Oxley'
        
        # Extract date
        date_patterns = [
            r'<time[^>]*datetime="([^"]+)"',
            r'"datePublished"\s*:\s*"([^"]+)"',
            r'<span[^>]*class="[^"]*date[^"]*"[^>]*>([^<]+)</span>',
        ]
        for pattern in date_patterns:
            match = re.search(pattern, html)
            if match:
                metadata['date'] = match.group(1).strip()
                break
        
        # Extract description
        desc_patterns = [
            r'<meta name="description" content="([^"]+)"',
            r'property="og:description"\s+content="([^"]+)"',
        ]
        for pattern in desc_patterns:
            match = re.search(pattern, html)
            if match:
                metadata['description'] = match.group(1).strip()
                break
        
        # Categorize based on URL
        if '/motorcycles/' in url:
            metadata['category'] = 'Motorcycles'
        elif '/motogp/' in url:
            metadata['category'] = 'MotoGP'
        elif '/opinion/' in url:
            metadata['category'] = 'Opinion'
        elif '/bikes/' in url:
            metadata['category'] = 'Bikes'
        else:
            metadata['category'] = 'General'
        
        # Estimate word count
        # Remove script and style tags
        text = re.sub(r'<script[^>]*>.*?</script>', '', html, flags=re.DOTALL)
        text = re.sub(r'<style[^>]*>.*?</style>', '', text, flags=re.DOTALL)
        text = re.sub(r'<[^>]+>', '', text)  # Remove all HTML tags
        words = len(text.split())
        metadata['word_count'] = words
        
        return metadata
    
    def crawl(self):
        """Main crawling function."""
        print("Starting enhanced Mat Oxley article crawler...")
        print("="*60)
        
        articles_found = 0
        listing_pages_crawled = 0
        
        while self.to_visit:
            url = self.to_visit.popleft()
            
            if url in self.visited:
                continue
            
            self.visited.add(url)
            
            # Check if this is a listing page or article
            if '/page/' in url or url.endswith('/mat-oxley_writer/'):
                listing_pages_crawled += 1
                print(f"\nCrawling listing page {listing_pages_crawled}: {url}")
                
                html, status = self.fetch_page(url)
                if html and status == 200:
                    # Extract articles from this listing
                    found_articles = self.extract_articles_from_listing(html, url)
                    
                    for article_info in found_articles:
                        article_url = article_info['url']
                        if article_url not in self.visited:
                            self.to_visit.append(article_url)
                    
                    print(f"   Found {len(found_articles)} article links")
            else:
                # This should be an article page
                print(f"\nFetching article: {url}")
                
                html, status = self.fetch_page(url)
                if html and status == 200:
                    metadata = self.extract_article_metadata(url, html)
                    
                    # Only save if it's confirmed to be a Mat Oxley article
                    if metadata['author'] == 'Mat Oxley':
                        self.articles.append(metadata)
                        articles_found += 1
                        print(f"✅ Article #{articles_found}: {metadata['title'][:60]}...")
                        print(f"   Category: {metadata['category']}, Date: {metadata['date']}")
                    else:
                        print(f"   Not a Mat Oxley article, skipping")
            
            # Rate limiting
            time.sleep(0.3)
            
            # Progress update
            if articles_found % 25 == 0 and articles_found > 0:
                print(f"\n📊 Progress: {articles_found} articles found")
                print(f"   Pages visited: {len(self.visited)}")
                print(f"   Queue size: {len(self.to_visit)}")
        
        return self.articles
    
    def save_results(self, articles):
        """Save results to CSV."""
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f'mat_oxley_articles_{timestamp}.csv'
        
        # Sort by date (newest first)
        articles.sort(key=lambda x: x['date'], reverse=True)
        
        with open(filename, 'w', newline='', encoding='utf-8') as f:
            fieldnames = ['url', 'title', 'author', 'date', 'category', 'description', 'word_count']
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(articles)
        
        print(f"\nResults saved to {filename}")
        return filename

def main():
    crawler = MatOxleyCrawlerV2()
    articles = crawler.crawl()
    
    print("\n" + "="*60)
    print(f"Crawl complete! Found {len(articles)} Mat Oxley articles")
    
    if articles:
        # Show sample of articles
        print("\nSample of recent articles:")
        for i, article in enumerate(articles[:10]):
            print(f"{i+1}. {article['title'][:70]}...")
            print(f"   Date: {article['date']}, Category: {article['category']}")
        
        # Save results
        filename = crawler.save_results(articles)
        
        # Summary by category
        categories = {}
        years = {}
        for article in articles:
            # Category stats
            cat = article['category']
            categories[cat] = categories.get(cat, 0) + 1
            
            # Year stats
            if article['date']:
                year = article['date'][:4]
                if year.isdigit():
                    years[year] = years.get(year, 0) + 1
        
        print("\nArticles by category:")
        for cat, count in sorted(categories.items(), key=lambda x: x[1], reverse=True):
            print(f"- {cat}: {count}")
        
        print("\nArticles by year:")
        for year, count in sorted(years.items(), reverse=True)[:10]:
            print(f"- {year}: {count}")
        
        # Total word count
        total_words = sum(a['word_count'] for a in articles)
        print(f"\nTotal estimated words: {total_words:,}")
        print(f"Average words per article: {total_words // len(articles):,}")

if __name__ == "__main__":
    main()