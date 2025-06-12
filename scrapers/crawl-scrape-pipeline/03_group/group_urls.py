#!/usr/bin/env python3
"""
Step 03: URL Grouping
Groups URLs by template/pattern to identify common page types.
"""

import argparse
import re
import sys
from collections import defaultdict, Counter
from pathlib import Path
from typing import List, Dict, Set, Tuple, Optional
from urllib.parse import urlparse

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent / '00_env'))

from config import config
from utils import setup_logging, read_urls_file, write_urls_file, save_json, ensure_dir


class URLGrouper:
    """Groups URLs by patterns and templates."""
    
    def __init__(self, domain: str):
        """Initialize URL grouper."""
        self.domain = domain
        self.logger = setup_logging('url_grouper', config.dirs['group'] / 'grouping.log')
        self.groups: Dict[str, List[str]] = defaultdict(list)
        self.templates: Dict[str, str] = {}
    
    def extract_url_pattern(self, url: str) -> str:
        """Extract a pattern from URL by replacing dynamic parts."""
        parsed = urlparse(url)
        path = parsed.path
        
        # Replace common dynamic patterns
        patterns = [
            (r'/\d+', '/{id}'),  # Numeric IDs
            (r'/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}', '/{uuid}'),  # UUIDs
            (r'/[a-f0-9]{24,}', '/{hash}'),  # Long hashes
            (r'/\d{4}/\d{1,2}/\d{1,2}', '/{date}'),  # Date patterns
            (r'/\d{4}/\d{1,2}', '/{year}/{month}'),  # Year/month
            (r'/page/\d+', '/page/{n}'),  # Pagination
            (r'-\d+\.html?$', '-{id}.html'),  # ID in filename
            (r'[?&]id=\d+', '?id={id}'),  # Query param IDs
            (r'[?&]page=\d+', '?page={n}'),  # Query param pagination
        ]
        
        template = path
        for pattern, replacement in patterns:
            template = re.sub(pattern, replacement, template)
        
        # Handle slugs (keep first part, replace rest with {slug})
        # e.g., /products/awesome-bike-model -> /products/{slug}
        parts = template.split('/')
        if len(parts) > 2:
            # Check if last part looks like a slug
            last_part = parts[-1]
            if re.match(r'^[a-z0-9-]+$', last_part) and '-' in last_part:
                parts[-1] = '{slug}'
                template = '/'.join(parts)
        
        return template
    
    def identify_url_components(self, url: str) -> Dict[str, str]:
        """Identify components of a URL."""
        parsed = urlparse(url)
        path_parts = [p for p in parsed.path.split('/') if p]
        
        components = {
            'domain': parsed.netloc,
            'path': parsed.path,
            'depth': len(path_parts),
            'has_query': bool(parsed.query),
            'has_fragment': bool(parsed.fragment),
        }
        
        # Identify likely purpose
        if path_parts:
            first_part = path_parts[0].lower()
            if first_part in ['product', 'products', 'item', 'items', 'shop', 'store']:
                components['type'] = 'product'
            elif first_part in ['category', 'categories', 'collection', 'collections']:
                components['type'] = 'category'
            elif first_part in ['blog', 'news', 'article', 'articles', 'post', 'posts']:
                components['type'] = 'content'
            elif first_part in ['search', 's']:
                components['type'] = 'search'
            else:
                components['type'] = 'other'
        else:
            components['type'] = 'homepage'
        
        return components
    
    def group_by_pattern(self, urls: List[str]) -> Dict[str, List[str]]:
        """Group URLs by their patterns."""
        pattern_groups = defaultdict(list)
        
        for url in urls:
            pattern = self.extract_url_pattern(url)
            pattern_groups[pattern].append(url)
            self.templates[url] = pattern
        
        return dict(pattern_groups)
    
    def group_by_structure(self, urls: List[str]) -> Dict[str, List[str]]:
        """Group URLs by their structural characteristics."""
        structure_groups = defaultdict(list)
        
        for url in urls:
            components = self.identify_url_components(url)
            
            # Create structure key
            structure_key = f"{components['type']}_depth{components['depth']}"
            if components['has_query']:
                structure_key += '_query'
            
            structure_groups[structure_key].append(url)
        
        return dict(structure_groups)
    
    def analyze_groups(self, pattern_groups: Dict[str, List[str]]) -> Dict[str, Dict]:
        """Analyze groups to provide insights."""
        analysis = {}
        
        for pattern, urls in pattern_groups.items():
            analysis[pattern] = {
                'count': len(urls),
                'examples': urls[:5],  # First 5 examples
                'likely_type': self.guess_page_type(pattern),
                'priority': self.calculate_priority(pattern, len(urls)),
            }
        
        return analysis
    
    def guess_page_type(self, pattern: str) -> str:
        """Guess the type of page based on pattern."""
        pattern_lower = pattern.lower()
        
        # Product patterns
        if any(x in pattern_lower for x in ['/product', '/item', '/p/', '/{slug}']):
            return 'product_detail'
        
        # Category/listing patterns
        if any(x in pattern_lower for x in ['/category', '/collection', '/c/', '/browse']):
            return 'product_listing'
        
        # Search patterns
        if any(x in pattern_lower for x in ['/search', '/s/', 'query=', 'q=']):
            return 'search_results'
        
        # Pagination
        if 'page/{n}' in pattern or 'page={n}' in pattern:
            return 'paginated_listing'
        
        return 'unknown'
    
    def calculate_priority(self, pattern: str, count: int) -> int:
        """Calculate priority for scraping this pattern."""
        # Higher count = higher priority (more examples to work with)
        priority = min(count, 100)  # Cap at 100
        
        # Boost priority for likely product pages
        if self.guess_page_type(pattern) in ['product_detail', 'product_listing']:
            priority += 50
        
        # Lower priority for pagination
        if 'page' in pattern:
            priority -= 20
        
        return max(priority, 1)
    
    def save_groups(self, pattern_groups: Dict[str, List[str]], 
                    structure_groups: Dict[str, List[str]],
                    analysis: Dict[str, Dict]) -> None:
        """Save grouping results."""
        output_dir = ensure_dir(config.dirs['group'] / 'by_template')
        
        # Save individual group files
        for pattern, urls in pattern_groups.items():
            # Create safe filename
            safe_pattern = pattern.replace('/', '_').replace('{', '').replace('}', '')
            if safe_pattern.startswith('_'):
                safe_pattern = safe_pattern[1:]
            
            group_file = output_dir / f"{safe_pattern}.txt"
            write_urls_file(urls, group_file)
        
        # Save summary
        summary = {
            'domain': self.domain,
            'total_urls': sum(len(urls) for urls in pattern_groups.values()),
            'total_patterns': len(pattern_groups),
            'patterns': analysis,
        }
        
        summary_file = config.dirs['group'] / 'grouping_summary.json'
        save_json(summary, summary_file)
        self.logger.info(f"Saved grouping summary to {summary_file}")
        
        # Save top patterns for probe step
        top_patterns = sorted(
            analysis.items(),
            key=lambda x: x[1]['priority'],
            reverse=True
        )[:10]
        
        probe_input = {}
        for pattern, info in top_patterns:
            probe_input[pattern] = {
                'examples': info['examples'],
                'type': info['likely_type'],
                'count': info['count'],
            }
        
        probe_file = config.dirs['probe'] / 'patterns_to_probe.json'
        save_json(probe_input, probe_file)
        self.logger.info(f"Saved top patterns for probing to {probe_file}")
    
    def run(self, urls: List[str]) -> Tuple[Dict[str, List[str]], Dict[str, Dict]]:
        """Run the grouping process."""
        self.logger.info(f"Grouping {len(urls)} URLs")
        
        # Group by pattern
        pattern_groups = self.group_by_pattern(urls)
        self.logger.info(f"Found {len(pattern_groups)} unique patterns")
        
        # Group by structure
        structure_groups = self.group_by_structure(urls)
        self.logger.info(f"Found {len(structure_groups)} structure types")
        
        # Analyze groups
        analysis = self.analyze_groups(pattern_groups)
        
        # Log top patterns
        top_patterns = sorted(
            analysis.items(),
            key=lambda x: x[1]['count'],
            reverse=True
        )[:10]
        
        self.logger.info("Top 10 patterns by count:")
        for pattern, info in top_patterns:
            self.logger.info(f"  {pattern}: {info['count']} URLs ({info['likely_type']})")
        
        # Save results
        self.save_groups(pattern_groups, structure_groups, analysis)
        
        return pattern_groups, analysis


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description='Group URLs by patterns and templates',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Basic grouping
  python group_urls.py --domain example.com
  
  # Use custom input file
  python group_urls.py --domain example.com --input custom_urls.txt
  
  # Limit number of patterns to analyze
  python group_urls.py --domain example.com --max-patterns 20
        """
    )
    
    parser.add_argument('--domain', required=True, help='Domain being analyzed')
    parser.add_argument('--input', help='Input file with URLs (default: filtered_urls.txt)')
    parser.add_argument('--max-patterns', type=int, default=50,
                       help='Maximum number of patterns to keep')
    
    args = parser.parse_args()
    
    # Load URLs
    input_file = Path(args.input) if args.input else config.dirs['group'] / 'filtered_urls.txt'
    if not input_file.exists():
        print(f"Error: Input file not found: {input_file}")
        sys.exit(1)
    
    urls = read_urls_file(input_file)
    print(f"Loaded {len(urls)} URLs from {input_file}")
    
    # Run grouping
    grouper = URLGrouper(args.domain)
    pattern_groups, analysis = grouper.run(urls)
    
    print(f"\nGrouping complete!")
    print(f"Found {len(pattern_groups)} unique URL patterns")
    print(f"Results saved to {config.dirs['group']}")


if __name__ == '__main__':
    main()