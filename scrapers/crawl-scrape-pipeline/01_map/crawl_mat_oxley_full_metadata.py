#!/usr/bin/env python3
"""
Fetch full HTTP metadata for all Mat Oxley articles.
"""

import csv
from pathlib import Path
from urllib.parse import urljoin
import requests
from bs4 import BeautifulSoup
import time
from datetime import datetime
import sys

def crawl_full_metadata(article_file):
    """Fetch full metadata for all articles in the CSV."""
    
    # Read article URLs
    articles = []
    with open(article_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        articles = list(reader)
    
    print(f"Found {len(articles)} articles to process")
    
    session = requests.Session()
    session.headers.update({
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
    })
    
    metadata = []
    
    for i, article in enumerate(articles):
        url = article['url']
        print(f"\r[{i+1}/{len(articles)}] Processing {url[:80]}...", end='', flush=True)
        
        try:
            response = session.get(url, timeout=30, allow_redirects=True)
            
            # Basic HTTP metadata
            meta = {
                'url': url,
                'status_code': response.status_code,
                'content_type': response.headers.get('content-type', '').split(';')[0].strip(),
                'size': len(response.content),
                'last_modified': response.headers.get('last-modified', ''),
                'response_time': response.elapsed.total_seconds(),
                'redirect_count': len(response.history),
                'final_url': response.url if response.url != url else ''
            }
            
            # Extract page content if HTML
            if response.status_code == 200 and 'text/html' in response.headers.get('content-type', ''):
                soup = BeautifulSoup(response.text, 'html.parser')
                
                # Title
                title_tag = soup.find('title')
                meta['page_title'] = title_tag.text.strip() if title_tag else ''
                
                # Meta description
                meta_desc = soup.find('meta', attrs={'name': 'description'})
                meta['meta_description'] = meta_desc.get('content', '') if meta_desc else ''
                
                # Publication date
                date_elem = soup.find('time') or soup.find('span', class_='date')
                meta['publication_date'] = date_elem.text.strip() if date_elem else ''
                
                # Author (should be Mat Oxley)
                author_elem = soup.find('span', class_='author') or soup.find('a', href='/articles/author/mat-oxley_writer/')
                meta['author'] = author_elem.text.strip() if author_elem else 'Mat Oxley'
                
                # Categories/tags
                categories = []
                for cat in soup.find_all('a', href=lambda x: x and '/category/' in x):
                    categories.append(cat.text.strip())
                meta['categories'] = '|'.join(categories[:5])  # Top 5 categories
                
                # Check for MotoGP/motorcycle content
                content_text = soup.get_text().lower()
                meta['is_motogp'] = 'motogp' in content_text
                meta['is_motorcycle'] = any(word in content_text for word in ['motorcycle', 'bike', 'rider', 'racing'])
                
            metadata.append(meta)
            
            # Be polite
            time.sleep(0.5)
            
        except Exception as e:
            print(f"\nError on {url}: {e}")
            metadata.append({
                'url': url,
                'status_code': 0,
                'content_type': 'error',
                'size': 0,
                'error': str(e)
            })
    
    print(f"\n\nProcessed {len(metadata)} articles")
    
    # Save results
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    output_file = Path(__file__).parent / f'mat_oxley_full_metadata_{timestamp}.csv'
    
    # Determine all fields
    all_fields = set()
    for item in metadata:
        all_fields.update(item.keys())
    
    with open(output_file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=sorted(all_fields))
        writer.writeheader()
        writer.writerows(metadata)
    
    print(f"Saved to {output_file}")
    
    # Summary statistics
    status_codes = {}
    for item in metadata:
        code = item.get('status_code', 0)
        status_codes[code] = status_codes.get(code, 0) + 1
    
    print("\nStatus code summary:")
    for code, count in sorted(status_codes.items()):
        print(f"  {code}: {count}")
    
    # Count motorcycle content
    moto_count = sum(1 for m in metadata if m.get('is_motorcycle', False))
    motogp_count = sum(1 for m in metadata if m.get('is_motogp', False))
    
    print(f"\nContent analysis:")
    print(f"  Motorcycle-related: {moto_count}/{len(metadata)} ({moto_count/len(metadata)*100:.1f}%)")
    print(f"  MotoGP-specific: {motogp_count}/{len(metadata)} ({motogp_count/len(metadata)*100:.1f}%)")

if __name__ == "__main__":
    # Use the most recent article list
    article_file = sorted(Path(__file__).parent.glob('mat_oxley_all_articles_*.csv'))[-1]
    print(f"Using article list: {article_file}")
    crawl_full_metadata(article_file)