#!/usr/bin/env python3
"""
Step 02: URL Filtering
Filters URLs from dump.csv keeping only those with status_code == 200 and content_type starting with text/html.
Inputs: 01_map/dump.csv
Outputs: all_urls.txt (one URL per line)
"""

import argparse
import csv
import sys
from pathlib import Path
from typing import List, Dict

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent / '00_env'))

from utils import setup_logging


class URLFilter:
    """Filters URLs based on HTTP metadata from dump.csv."""
    
    def __init__(self):
        """Initialize URL filter."""
        self.logger = setup_logging('url_filter', Path(__file__).parent / 'filter.log')
        self.input_file = Path(__file__).parent.parent / '01_map' / 'dump.csv'
        self.output_file = Path(__file__).parent / 'all_urls.txt'
    
    def filter_urls(self) -> List[str]:
        """Filter URLs based on status code and content type."""
        if not self.input_file.exists():
            self.logger.error(f"Input file not found: {self.input_file}")
            raise FileNotFoundError(f"Missing required file: {self.input_file}")
        
        filtered_urls = []
        total_count = 0
        status_200_count = 0
        html_count = 0
        
        self.logger.info(f"Reading URLs from {self.input_file}")
        
        with open(self.input_file, 'r', newline='', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            
            # Verify required columns exist
            if not all(col in reader.fieldnames for col in ['url', 'status_code', 'content_type']):
                self.logger.error(f"Missing required columns. Found: {reader.fieldnames}")
                raise ValueError("dump.csv missing required columns: url, status_code, content_type")
            
            for row in reader:
                total_count += 1
                
                # Check status code
                try:
                    status_code = int(row.get('status_code', 0))
                except ValueError:
                    self.logger.warning(f"Invalid status code for {row.get('url')}: {row.get('status_code')}")
                    continue
                
                if status_code == 200:
                    status_200_count += 1
                    
                    # Check content type
                    content_type = row.get('content_type', '').lower()
                    if content_type.startswith('text/html'):
                        html_count += 1
                        filtered_urls.append(row['url'])
                        self.logger.debug(f"Included: {row['url']}")
                    else:
                        self.logger.debug(f"Excluded (content-type: {content_type}): {row['url']}")
                else:
                    self.logger.debug(f"Excluded (status: {status_code}): {row['url']}")
        
        self.logger.info(f"Filtering complete:")
        self.logger.info(f"  Total URLs: {total_count}")
        self.logger.info(f"  Status 200: {status_200_count}")
        self.logger.info(f"  HTML pages: {html_count}")
        self.logger.info(f"  Filtered URLs: {len(filtered_urls)}")
        
        return filtered_urls
    
    def save_results(self, urls: List[str]) -> None:
        """Save filtered URLs to all_urls.txt."""
        with open(self.output_file, 'w', encoding='utf-8') as f:
            for url in urls:
                f.write(url + '\n')
        
        self.logger.info(f"Saved {len(urls)} URLs to {self.output_file}")
    
    def run(self) -> List[str]:
        """Run the filtering process."""
        self.logger.info("Starting URL filtering")
        
        # Filter URLs
        filtered_urls = self.filter_urls()
        
        # Save results
        if filtered_urls:
            self.save_results(filtered_urls)
        else:
            self.logger.warning("No URLs passed filtering criteria!")
        
        return filtered_urls


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description='Filter URLs keeping only status_code==200 and content_type starts with text/html',
        epilog='Input: ../01_map/dump.csv\nOutput: all_urls.txt'
    )
    
    # No arguments needed - paths are fixed per spec
    args = parser.parse_args()
    
    # Run filter
    filter = URLFilter()
    filtered_urls = filter.run()
    
    if filtered_urls:
        print(f"\nFiltering complete! {len(filtered_urls)} URLs passed criteria")
        print(f"Results saved to: {filter.output_file}")
    else:
        print("\nNo URLs passed filtering criteria!")
        sys.exit(1)


if __name__ == '__main__':
    main()