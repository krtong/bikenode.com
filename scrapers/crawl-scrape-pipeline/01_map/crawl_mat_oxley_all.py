#!/usr/bin/env python3
"""
Focused crawler to get all Mat Oxley articles by following pagination.
"""

import csv
from pathlib import Path
from urllib.parse import urljoin, urlparse
import requests
from bs4 import BeautifulSoup
import time
from datetime import datetime
import re

def crawl_all_mat_oxley_articles():
    """Crawl all Mat Oxley articles by following pagination."""
    
    base_url = "https://www.motorsportmagazine.com/articles/author/mat-oxley_writer/"
    articles = []
    visited_pages = set()
    page_num = 1
    
    session = requests.Session()
    session.headers.update({
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
    })
    
    while True:
        if page_num == 1:
            current_url = base_url
        else:
            current_url = f"{base_url}page/{page_num}/"
            
        if current_url in visited_pages:
            break
            
        print(f"Fetching page {page_num}: {current_url}")
        visited_pages.add(current_url)
        
        try:
            response = session.get(current_url, timeout=30)
            if response.status_code == 404:
                print(f"Page {page_num} returned 404 - reached end of pagination")
                break
            elif response.status_code != 200:
                print(f"Page {page_num} returned {response.status_code}")
                break
                
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Find article links on this page
            article_links = []
            
            # Look for article links in various possible containers
            for article in soup.find_all('article'):
                link = article.find('a', href=True)
                if link and '/archive/article/' in link['href']:
                    article_links.append(link['href'])
            
            # Also check for links with specific patterns
            for link in soup.find_all('a', href=re.compile(r'/archive/article/.*mat-oxley')):
                article_links.append(link['href'])
                
            # Check h2/h3 titles that might contain article links
            for heading in soup.find_all(['h2', 'h3']):
                link = heading.find('a', href=True)
                if link and '/archive/article/' in link['href']:
                    article_links.append(link['href'])
                    
            # Deduplicate
            article_links = list(set(article_links))
            
            print(f"Found {len(article_links)} articles on page {page_num}")
            
            # Get metadata for each article
            for article_url in article_links:
                full_url = urljoin(current_url, article_url)
                
                # Extract title from URL
                title_match = re.search(r'/([^/]+)/$', article_url)
                title = title_match.group(1).replace('-', ' ').title() if title_match else ''
                
                articles.append({
                    'url': full_url,
                    'page': page_num,
                    'title_from_url': title
                })
                
            # Check if there's a next page
            next_page = soup.find('a', {'class': re.compile(r'next|pagination.*next')})
            if not next_page:
                # Also check for numbered pagination
                pagination = soup.find_all('a', href=re.compile(r'/page/\d+/'))
                if pagination:
                    # Get highest page number
                    max_page = max([int(re.search(r'/page/(\d+)/', p['href']).group(1)) 
                                   for p in pagination if re.search(r'/page/(\d+)/', p['href'])])
                    if page_num >= max_page:
                        print(f"Reached last page ({max_page})")
                        break
                else:
                    print("No next page found")
                    break
                    
            page_num += 1
            time.sleep(0.5)  # Be polite
            
        except Exception as e:
            print(f"Error on page {page_num}: {e}")
            break
            
        # Safety limit
        if page_num > 100:
            print("Reached page limit")
            break
    
    print(f"\nTotal articles found: {len(articles)}")
    
    # Save to CSV
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    output_file = Path(__file__).parent / f'mat_oxley_all_articles_{timestamp}.csv'
    
    with open(output_file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=['url', 'page', 'title_from_url'])
        writer.writeheader()
        writer.writerows(articles)
        
    print(f"Saved to {output_file}")
    
    # Also fetch full metadata for first 10 articles as sample
    print("\nFetching metadata for first 10 articles...")
    metadata = []
    
    for article in articles[:10]:
        try:
            response = session.get(article['url'], timeout=30)
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Extract metadata
            title_tag = soup.find('title')
            title = title_tag.text.strip() if title_tag else ''
            
            meta_desc = soup.find('meta', attrs={'name': 'description'})
            description = meta_desc.get('content', '') if meta_desc else ''
            
            # Find publication date
            date_elem = soup.find('time') or soup.find('span', class_=re.compile('date|time'))
            date = date_elem.text.strip() if date_elem else ''
            
            metadata.append({
                'url': article['url'],
                'title': title,
                'description': description,
                'date': date,
                'status': response.status_code
            })
            
            print(f"✓ {title[:60]}...")
            time.sleep(0.3)
            
        except Exception as e:
            print(f"✗ Error fetching {article['url']}: {e}")
            
    # Save metadata sample
    metadata_file = Path(__file__).parent / f'mat_oxley_metadata_sample_{timestamp}.csv'
    with open(metadata_file, 'w', newline='', encoding='utf-8') as f:
        if metadata:
            writer = csv.DictWriter(f, fieldnames=metadata[0].keys())
            writer.writeheader()
            writer.writerows(metadata)
            
    print(f"\nMetadata sample saved to {metadata_file}")

if __name__ == "__main__":
    crawl_all_mat_oxley_articles()