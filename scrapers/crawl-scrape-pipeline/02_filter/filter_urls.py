#!/usr/bin/env python3
"""
Step 02: URL Filtering
Filters URLs based on patterns, file types, and relevance.
"""

import argparse
import re
import sys
from pathlib import Path
from typing import List, Set, Optional, Dict
from urllib.parse import urlparse, parse_qs

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent / '00_env'))

from config import config
from utils import setup_logging, read_urls_file, write_urls_file, is_valid_url, normalize_url


class URLFilter:
    """Filters URLs based on various criteria."""
    
    # Common non-content file extensions to exclude
    EXCLUDED_EXTENSIONS = {
        '.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.ico',  # Images
        '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',  # Documents
        '.zip', '.rar', '.7z', '.tar', '.gz',  # Archives
        '.mp3', '.mp4', '.avi', '.mov', '.wmv',  # Media
        '.css', '.js', '.woff', '.woff2', '.ttf', '.eot',  # Web assets
        '.xml', '.rss', '.atom',  # Feeds (unless needed)
    }
    
    # Common non-content URL patterns
    EXCLUDED_PATTERNS = [
        r'/cdn-cgi/',  # Cloudflare
        r'/wp-admin/', r'/wp-includes/', r'/wp-content/uploads/',  # WordPress internals
        r'/tag/', r'/category/', r'/author/',  # Common taxonomy pages
        r'/feed/', r'/rss/', r'/atom/',  # Feed URLs
        r'[?&]print=', r'[?&]pdf=',  # Print/PDF versions
        r'/search[/?]', r'/s[/?]',  # Search pages
        r'/login', r'/logout', r'/register', r'/signin', r'/signup',  # Auth pages
        r'/cart', r'/checkout', r'/account',  # E-commerce process pages
    ]
    
    # Patterns that indicate potential product/content pages
    INCLUDED_PATTERNS = [
        r'/products?/',
        r'/items?/',
        r'/collections?/',
        r'/shop/',
        r'/store/',
        r'/catalog/',
        r'/browse/',
        r'/gear/',
        r'/equipment/',
        r'/accessories/',
        r'/parts/',
        r'/bikes?/',
        r'/motorcycles?/',
        r'/helmets?/',
        r'/jackets?/',
        r'/gloves?/',
        r'/boots?/',
    ]
    
    def __init__(self, domain: str):
        """Initialize URL filter."""
        self.domain = domain
        self.logger = setup_logging('url_filter', config.dirs['filter'] / 'filter.log')
        
        # Compile regex patterns for efficiency
        self.excluded_regex = [re.compile(pattern, re.IGNORECASE) for pattern in self.EXCLUDED_PATTERNS]
        self.included_regex = [re.compile(pattern, re.IGNORECASE) for pattern in self.INCLUDED_PATTERNS]
    
    def has_excluded_extension(self, url: str) -> bool:
        """Check if URL has an excluded file extension."""
        path = urlparse(url).path.lower()
        return any(path.endswith(ext) for ext in self.EXCLUDED_EXTENSIONS)
    
    def matches_excluded_pattern(self, url: str) -> bool:
        """Check if URL matches any excluded pattern."""
        return any(regex.search(url) for regex in self.excluded_regex)
    
    def matches_included_pattern(self, url: str) -> bool:
        """Check if URL matches any included pattern."""
        return any(regex.search(url) for regex in self.included_regex)
    
    def is_pagination_url(self, url: str) -> bool:
        """Check if URL is a pagination URL."""
        parsed = urlparse(url)
        path = parsed.path.lower()
        query = parsed.query.lower()
        
        # Common pagination patterns
        pagination_patterns = [
            r'/page/\d+',
            r'[?&]page=\d+',
            r'[?&]p=\d+',
            r'[?&]offset=\d+',
            r'[?&]start=\d+',
        ]
        
        for pattern in pagination_patterns:
            if re.search(pattern, url, re.IGNORECASE):
                return True
        
        return False
    
    def normalize_pagination_url(self, url: str) -> str:
        """Normalize pagination URLs to their first page."""
        # Remove common pagination parameters
        parsed = urlparse(url)
        query_params = parse_qs(parsed.query)
        
        # Remove pagination parameters
        for param in ['page', 'p', 'offset', 'start']:
            query_params.pop(param, None)
        
        # Reconstruct URL without pagination
        new_query = '&'.join(f"{k}={v[0]}" for k, v in query_params.items())
        normalized = parsed._replace(query=new_query).geturl()
        
        # Remove /page/N from path
        normalized = re.sub(r'/page/\d+/?$', '/', normalized)
        
        return normalized
    
    def filter_urls(self, urls: List[str], 
                   include_pagination: bool = False,
                   custom_exclude: Optional[List[str]] = None,
                   custom_include: Optional[List[str]] = None) -> Dict[str, List[str]]:
        """Filter URLs based on criteria."""
        self.logger.info(f"Filtering {len(urls)} URLs")
        
        # Add custom patterns if provided
        if custom_exclude:
            self.excluded_regex.extend([re.compile(p, re.IGNORECASE) for p in custom_exclude])
        if custom_include:
            self.included_regex.extend([re.compile(p, re.IGNORECASE) for p in custom_include])
        
        filtered = {
            'content': [],
            'excluded': [],
            'pagination': [],
        }
        
        seen_normalized = set()
        
        for url in urls:
            # Skip invalid URLs
            if not is_valid_url(url):
                filtered['excluded'].append(url)
                continue
            
            # Check if URL should be excluded
            if self.has_excluded_extension(url):
                filtered['excluded'].append(url)
                self.logger.debug(f"Excluded (extension): {url}")
                continue
            
            if self.matches_excluded_pattern(url):
                filtered['excluded'].append(url)
                self.logger.debug(f"Excluded (pattern): {url}")
                continue
            
            # Handle pagination
            if self.is_pagination_url(url):
                filtered['pagination'].append(url)
                if include_pagination:
                    # Normalize and add only first page
                    normalized = self.normalize_pagination_url(url)
                    if normalized not in seen_normalized:
                        seen_normalized.add(normalized)
                        filtered['content'].append(normalized)
                continue
            
            # Priority include if matches included pattern
            if self.matches_included_pattern(url):
                filtered['content'].append(url)
                self.logger.debug(f"Included (pattern match): {url}")
            else:
                # Default include if not explicitly excluded
                filtered['content'].append(url)
        
        # Remove duplicates while preserving order
        filtered['content'] = list(dict.fromkeys(filtered['content']))
        
        self.logger.info(f"Filtered results: {len(filtered['content'])} content URLs, "
                        f"{len(filtered['pagination'])} pagination URLs, "
                        f"{len(filtered['excluded'])} excluded")
        
        return filtered
    
    def save_results(self, filtered: Dict[str, List[str]]) -> None:
        """Save filtered results to files."""
        # Save main content URLs
        output_file = config.dirs['filter'] / 'filtered_urls.txt'
        write_urls_file(filtered['content'], output_file)
        self.logger.info(f"Saved {len(filtered['content'])} content URLs to {output_file}")
        
        # Save to group step for next phase
        group_file = config.dirs['group'] / 'filtered_urls.txt'
        write_urls_file(filtered['content'], group_file)
        
        # Save excluded URLs for review
        if filtered['excluded']:
            excluded_file = config.dirs['filter'] / 'excluded_urls.txt'
            write_urls_file(filtered['excluded'], excluded_file)
            self.logger.info(f"Saved {len(filtered['excluded'])} excluded URLs to {excluded_file}")
        
        # Save pagination URLs separately
        if filtered['pagination']:
            pagination_file = config.dirs['filter'] / 'pagination_urls.txt'
            write_urls_file(filtered['pagination'], pagination_file)
            self.logger.info(f"Saved {len(filtered['pagination'])} pagination URLs to {pagination_file}")


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description='Filter URLs based on patterns and relevance',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Basic filtering
  python filter_urls.py --domain example.com
  
  # Include pagination URLs (normalized to first page)
  python filter_urls.py --domain example.com --include-pagination
  
  # Add custom exclude patterns
  python filter_urls.py --domain example.com --exclude "/blog/" "/news/"
  
  # Add custom include patterns
  python filter_urls.py --domain example.com --include "/special-products/"
        """
    )
    
    parser.add_argument('--domain', required=True, help='Domain being filtered')
    parser.add_argument('--input', help='Input file with URLs (default: all_urls.txt)')
    parser.add_argument('--include-pagination', action='store_true',
                       help='Include pagination URLs (normalized to first page)')
    parser.add_argument('--exclude', nargs='+', help='Additional patterns to exclude')
    parser.add_argument('--include', nargs='+', help='Additional patterns to include')
    
    args = parser.parse_args()
    
    # Load URLs
    input_file = Path(args.input) if args.input else config.dirs['filter'] / 'all_urls.txt'
    if not input_file.exists():
        print(f"Error: Input file not found: {input_file}")
        sys.exit(1)
    
    urls = read_urls_file(input_file)
    print(f"Loaded {len(urls)} URLs from {input_file}")
    
    # Filter URLs
    filter = URLFilter(args.domain)
    filtered = filter.filter_urls(
        urls,
        include_pagination=args.include_pagination,
        custom_exclude=args.exclude,
        custom_include=args.include
    )
    
    # Save results
    filter.save_results(filtered)
    
    print(f"\nFiltering complete!")
    print(f"Content URLs: {len(filtered['content'])}")
    print(f"Excluded URLs: {len(filtered['excluded'])}")
    print(f"Pagination URLs: {len(filtered['pagination'])}")


if __name__ == '__main__':
    main()