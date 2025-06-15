#!/usr/bin/env python3
"""
Crawl all Mat Oxley articles from Motor Sport Magazine.
"""

import urllib.request
import urllib.parse
import ssl
import csv
import time
import re
from pathlib import Path
from datetime import datetime

# SSL context
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

class MatOxleyCrawler:
    def __init__(self):
        self.base_url = "https://www.motorsportmagazine.com"
        self.author_url = f"{self.base_url}/articles/author/mat-oxley_writer/"
        self.visited = set()
        self.articles = []
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
    
    def extract_article_links(self, html):
        """Extract article links from HTML."""
        article_links = []
        
        # Find article links with various patterns
        patterns = [
            r'href="(/articles/[^"]+)"',  # Direct article links
            r'href="(/database/drivers/[^"]+)"',  # Driver profiles
            r'href="(/opinion/[^"]+)"',  # Opinion pieces
            r'href="(/motorcycles/[^"]+)"',  # Motorcycle articles
        ]
        
        for pattern in patterns:
            matches = re.findall(pattern, html)
            for match in matches:
                full_url = self.base_url + match
                if full_url not in self.visited:
                    article_links.append(full_url)
        
        return list(set(article_links))  # Remove duplicates
    
    def extract_pagination_links(self, html):
        """Extract pagination links."""
        pagination_links = []
        
        # Look for pagination patterns
        patterns = [
            r'href="([^"]*\?page=\d+)"',
            r'href="([^"]*&page=\d+)"',
            r'href="(/articles/author/mat-oxley_writer/page/\d+)"',
        ]
        
        for pattern in patterns:
            matches = re.findall(pattern, html)
            for match in matches:
                if match.startswith('http'):
                    full_url = match
                else:
                    full_url = self.base_url + match
                if full_url not in self.visited:
                    pagination_links.append(full_url)
        
        return list(set(pagination_links))
    
    def extract_article_metadata(self, url, html):
        """Extract metadata from an article page."""
        metadata = {
            'url': url,
            'title': '',
            'author': 'Mat Oxley',
            'date': '',
            'category': '',
            'description': ''
        }
        
        # Extract title
        title_match = re.search(r'<title>([^<]+)</title>', html)
        if title_match:
            metadata['title'] = title_match.group(1).strip()
        
        # Extract meta description
        desc_match = re.search(r'<meta name="description" content="([^"]+)"', html)
        if desc_match:
            metadata['description'] = desc_match.group(1).strip()
        
        # Extract publication date
        date_patterns = [
            r'<time[^>]*datetime="([^"]+)"',
            r'"datePublished":"([^"]+)"',
            r'<span class="date">([^<]+)</span>',
        ]
        for pattern in date_patterns:
            date_match = re.search(pattern, html)
            if date_match:
                metadata['date'] = date_match.group(1).strip()
                break
        
        # Extract category from URL
        if '/motorcycles/' in url:
            metadata['category'] = 'Motorcycles'
        elif '/opinion/' in url:
            metadata['category'] = 'Opinion'
        elif '/drivers/' in url:
            metadata['category'] = 'Driver Profile'
        else:
            metadata['category'] = 'Article'
        
        return metadata
    
    def crawl(self):
        """Main crawling function."""
        print("Starting Mat Oxley article crawler...")
        print("="*60)
        
        # Start with the author page
        to_visit = [self.author_url]
        articles_found = 0
        
        while to_visit:
            url = to_visit.pop(0)
            
            if url in self.visited:
                continue
            
            self.visited.add(url)
            print(f"\nFetching: {url}")
            
            html, status = self.fetch_page(url)
            if not html:
                continue
            
            # Check if this is an article page
            if '/articles/' in url and 'mat-oxley' in html.lower():
                metadata = self.extract_article_metadata(url, html)
                self.articles.append(metadata)
                articles_found += 1
                print(f"✅ Article #{articles_found}: {metadata['title'][:60]}...")
            
            # Extract more article links
            article_links = self.extract_article_links(html)
            
            # Only add Mat Oxley articles
            for link in article_links:
                if 'mat-oxley' in link or link not in self.visited:
                    to_visit.append(link)
            
            # Extract pagination links from author pages
            if '/author/mat-oxley' in url:
                pagination_links = self.extract_pagination_links(html)
                to_visit.extend(pagination_links)
                print(f"   Found {len(pagination_links)} pagination links")
            
            # Rate limiting
            time.sleep(0.5)
            
            # Progress update
            if articles_found % 10 == 0 and articles_found > 0:
                print(f"\n📊 Progress: {articles_found} articles found, {len(to_visit)} URLs in queue")
        
        return self.articles
    
    def save_results(self, articles):
        """Save results to CSV."""
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f'mat_oxley_articles_{timestamp}.csv'
        
        with open(filename, 'w', newline='', encoding='utf-8') as f:
            fieldnames = ['url', 'title', 'author', 'date', 'category', 'description']
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(articles)
        
        print(f"\nResults saved to {filename}")
        return filename

def main():
    crawler = MatOxleyCrawler()
    articles = crawler.crawl()
    
    print("\n" + "="*60)
    print(f"Crawl complete! Found {len(articles)} Mat Oxley articles")
    
    if articles:
        # Show sample of articles
        print("\nSample articles found:")
        for i, article in enumerate(articles[:5]):
            print(f"{i+1}. {article['title'][:60]}...")
            print(f"   Date: {article['date']}")
            print(f"   Category: {article['category']}")
        
        # Save results
        filename = crawler.save_results(articles)
        
        # Summary by category
        categories = {}
        for article in articles:
            cat = article['category']
            categories[cat] = categories.get(cat, 0) + 1
        
        print("\nArticles by category:")
        for cat, count in sorted(categories.items(), key=lambda x: x[1], reverse=True):
            print(f"- {cat}: {count}")

if __name__ == "__main__":
    main()