#!/usr/bin/env python3
"""
Step 04: Template Probing
Probes URL patterns to understand page structure and data availability.
"""

import argparse
import asyncio
import json
import sys
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple, Any
from urllib.parse import urlparse

from playwright.async_api import async_playwright, Page, Response
import requests
from bs4 import BeautifulSoup

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent / '00_env'))

from config import config
from utils import setup_logging, load_json, save_json, save_yaml, ensure_dir, create_timestamp


class TemplateProber:
    """Probes URL templates to understand their structure."""
    
    def __init__(self, domain: str):
        """Initialize template prober."""
        self.domain = domain
        self.logger = setup_logging('template_prober', Path(__file__).parent / 'probe.log')
        self.findings: Dict[str, Dict] = {}
        self.netlogs_dir = ensure_dir(Path(__file__).parent / 'netlogs')
        self.pages_dir = ensure_dir(Path(__file__).parent / 'pages')
    
    async def probe_with_playwright(self, url: str) -> Dict[str, Any]:
        """Probe a URL using Playwright for JavaScript-rendered content."""
        findings = {
            'url': url,
            'timestamp': create_timestamp(),
            'method': 'playwright',
            'success': False,
        }
        
        try:
            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=True)
                context = await browser.new_context(**config.get_playwright_context())
                page = await context.new_page()
                
                # Track network requests
                api_calls = []
                resources = {'scripts': [], 'stylesheets': [], 'images': [], 'xhr': []}
                
                async def handle_request(request):
                    url_lower = request.url.lower()
                    if request.resource_type == 'xhr' or request.resource_type == 'fetch':
                        api_calls.append({
                            'url': request.url,
                            'method': request.method,
                            'headers': dict(request.headers),
                        })
                        resources['xhr'].append(request.url)
                    elif request.resource_type == 'script':
                        resources['scripts'].append(request.url)
                    elif request.resource_type == 'stylesheet':
                        resources['stylesheets'].append(request.url)
                    elif request.resource_type == 'image':
                        resources['images'].append(request.url)
                
                page.on('request', handle_request)
                
                # Navigate to page
                response = await page.goto(url, wait_until='networkidle', timeout=30000)
                
                if response:
                    findings['status_code'] = response.status
                    findings['success'] = response.status == 200
                
                # Wait for dynamic content
                await page.wait_for_timeout(2000)
                
                # Get page content
                content = await page.content()
                findings['content_length'] = len(content)
                
                # Analyze page structure
                findings['structure'] = await self.analyze_page_structure(page)
                
                # Detect frameworks
                findings['frameworks'] = await self.detect_frameworks(page)
                
                # Save page content
                page_file = self.pages_dir / f"{urlparse(url).path.replace('/', '_')}.html"
                with open(page_file, 'w', encoding='utf-8') as f:
                    f.write(content)
                
                # Add network findings
                findings['api_calls'] = api_calls
                findings['resources'] = resources
                findings['has_spa'] = len(api_calls) > 0
                
                await browser.close()
                
        except Exception as e:
            self.logger.error(f"Error probing {url} with Playwright: {e}")
            findings['error'] = str(e)
        
        return findings
    
    async def analyze_page_structure(self, page: Page) -> Dict[str, Any]:
        """Analyze the structure of a page."""
        structure = {}
        
        # Check for common e-commerce elements
        selectors = {
            'product_title': ['h1', '.product-title', '#product-name', '[itemprop="name"]'],
            'price': ['.price', '.product-price', '[itemprop="price"]', '.cost'],
            'description': ['.description', '.product-description', '[itemprop="description"]'],
            'images': ['img.product-image', '.gallery img', '[itemprop="image"]'],
            'add_to_cart': ['button.add-to-cart', '.add-to-cart', 'button[type="submit"]'],
            'variants': ['.variant-selector', '.size-selector', '.color-selector'],
            'reviews': ['.reviews', '.rating', '[itemprop="review"]'],
            'breadcrumbs': ['.breadcrumb', 'nav[aria-label="breadcrumb"]', '.breadcrumbs'],
            'related_products': ['.related-products', '.recommendations', '.similar-items'],
        }
        
        for element, selector_list in selectors.items():
            found = False
            for selector in selector_list:
                try:
                    count = await page.locator(selector).count()
                    if count > 0:
                        structure[element] = {
                            'found': True,
                            'selector': selector,
                            'count': count,
                        }
                        found = True
                        break
                except:
                    continue
            
            if not found:
                structure[element] = {'found': False}
        
        # Check for pagination
        pagination_selectors = ['.pagination', '.pager', 'nav[aria-label="pagination"]']
        for selector in pagination_selectors:
            if await page.locator(selector).count() > 0:
                structure['has_pagination'] = True
                break
        else:
            structure['has_pagination'] = False
        
        # Check for filters
        filter_selectors = ['.filters', '.facets', '.filter-options', 'aside.filters']
        for selector in filter_selectors:
            if await page.locator(selector).count() > 0:
                structure['has_filters'] = True
                break
        else:
            structure['has_filters'] = False
        
        return structure
    
    async def detect_frameworks(self, page: Page) -> Dict[str, bool]:
        """Detect common frameworks and technologies."""
        frameworks = {}
        
        # Check for common frameworks
        checks = {
            'react': "!!window.React || !!document.querySelector('[data-reactroot]')",
            'vue': "!!window.Vue || !!document.querySelector('[data-v-]')",
            'angular': "!!window.angular || !!document.querySelector('[ng-app]')",
            'jquery': "!!window.jQuery || !!window.$",
            'shopify': "!!window.Shopify",
            'woocommerce': "!!document.querySelector('.woocommerce')",
            'magento': "!!document.querySelector('.magento')",
            'nextjs': "!!window.__NEXT_DATA__",
        }
        
        for framework, check in checks.items():
            try:
                frameworks[framework] = await page.evaluate(check)
            except:
                frameworks[framework] = False
        
        return frameworks
    
    def probe_with_requests(self, url: str) -> Dict[str, Any]:
        """Probe a URL using requests for static content."""
        findings = {
            'url': url,
            'timestamp': create_timestamp(),
            'method': 'requests',
            'success': False,
        }
        
        try:
            response = requests.get(url, headers={'User-Agent': config.user_agent}, timeout=10)
            
            findings['status_code'] = response.status_code
            findings['success'] = response.status_code == 200
            findings['content_length'] = len(response.content)
            findings['headers'] = dict(response.headers)
            
            if response.status_code == 200:
                # Parse HTML
                soup = BeautifulSoup(response.text, 'html.parser')
                
                # Check for JSON-LD
                json_ld_scripts = soup.find_all('script', type='application/ld+json')
                if json_ld_scripts:
                    findings['has_json_ld'] = True
                    findings['json_ld_types'] = []
                    for script in json_ld_scripts:
                        try:
                            data = json.loads(script.string)
                            if '@type' in data:
                                findings['json_ld_types'].append(data['@type'])
                        except:
                            pass
                
                # Check for Open Graph
                og_tags = soup.find_all('meta', property=lambda x: x and x.startswith('og:'))
                findings['has_open_graph'] = len(og_tags) > 0
                
                # Check for microdata
                microdata = soup.find_all(attrs={'itemscope': True})
                findings['has_microdata'] = len(microdata) > 0
                
                # Check content type
                if 'application/json' in response.headers.get('content-type', ''):
                    findings['is_api_endpoint'] = True
                    try:
                        findings['json_structure'] = self.analyze_json_structure(response.json())
                    except:
                        pass
        
        except Exception as e:
            self.logger.error(f"Error probing {url} with requests: {e}")
            findings['error'] = str(e)
        
        return findings
    
    def analyze_json_structure(self, data: Any, max_depth: int = 3, current_depth: int = 0) -> Dict:
        """Analyze the structure of JSON data."""
        if current_depth >= max_depth:
            return {'type': type(data).__name__, 'truncated': True}
        
        if isinstance(data, dict):
            structure = {
                'type': 'object',
                'keys': list(data.keys())[:10],  # First 10 keys
                'total_keys': len(data),
            }
            # Sample one item for structure
            if data:
                sample_key = list(data.keys())[0]
                structure['sample'] = {
                    sample_key: self.analyze_json_structure(data[sample_key], max_depth, current_depth + 1)
                }
        elif isinstance(data, list):
            structure = {
                'type': 'array',
                'length': len(data),
            }
            if data:
                structure['item_structure'] = self.analyze_json_structure(data[0], max_depth, current_depth + 1)
        else:
            structure = {
                'type': type(data).__name__,
                'sample': str(data)[:100] if isinstance(data, str) else data,
            }
        
        return structure
    
    async def probe_pattern(self, pattern: str, examples: List[str]) -> Dict[str, Any]:
        """Probe a URL pattern using multiple examples."""
        pattern_findings = {
            'pattern': pattern,
            'examples_probed': [],
            'common_structure': {},
            'recommendations': [],
        }
        
        # Probe up to 3 examples
        for url in examples[:3]:
            self.logger.info(f"Probing {url}")
            
            # Try Playwright first for better JavaScript support
            findings = await self.probe_with_playwright(url)
            
            # Fallback to requests if needed
            if not findings['success']:
                findings.update(self.probe_with_requests(url))
            
            pattern_findings['examples_probed'].append(findings)
        
        # Analyze common patterns
        pattern_findings['common_structure'] = self.find_common_structure(pattern_findings['examples_probed'])
        
        # Generate recommendations
        pattern_findings['recommendations'] = self.generate_recommendations(pattern_findings)
        
        return pattern_findings
    
    def find_common_structure(self, examples: List[Dict]) -> Dict[str, Any]:
        """Find common structure across examples."""
        if not examples:
            return {}
        
        common = {
            'all_successful': all(e.get('success', False) for e in examples),
            'uses_javascript': any(e.get('has_spa', False) for e in examples),
            'has_api_calls': any(e.get('api_calls', []) for e in examples),
            'common_frameworks': {},
            'common_elements': {},
        }
        
        # Find common frameworks
        framework_counts = {}
        for example in examples:
            frameworks = example.get('frameworks', {})
            for framework, present in frameworks.items():
                if present:
                    framework_counts[framework] = framework_counts.get(framework, 0) + 1
        
        for framework, count in framework_counts.items():
            if count == len(examples):
                common['common_frameworks'][framework] = True
        
        # Find common page elements
        element_counts = {}
        for example in examples:
            structure = example.get('structure', {})
            for element, info in structure.items():
                if isinstance(info, dict) and info.get('found', False):
                    element_counts[element] = element_counts.get(element, 0) + 1
        
        for element, count in element_counts.items():
            if count == len(examples):
                common['common_elements'][element] = True
        
        return common
    
    def generate_recommendations(self, pattern_findings: Dict) -> List[str]:
        """Generate scraping recommendations based on findings."""
        recommendations = []
        common = pattern_findings.get('common_structure', {})
        
        if common.get('uses_javascript'):
            recommendations.append("Use Playwright or Selenium for JavaScript rendering")
        else:
            recommendations.append("Can use simple HTTP requests (requests/scrapy)")
        
        if common.get('has_api_calls'):
            recommendations.append("Consider intercepting API calls for direct data access")
        
        if common.get('common_frameworks', {}).get('react'):
            recommendations.append("React app detected - look for __INITIAL_STATE__ or API endpoints")
        
        if common.get('common_frameworks', {}).get('shopify'):
            recommendations.append("Shopify detected - use Shopify-specific selectors")
        
        elements = common.get('common_elements', {})
        if elements.get('product_title') and elements.get('price'):
            recommendations.append("Product pages detected - extract title, price, description, images")
        
        if elements.get('has_pagination'):
            recommendations.append("Pagination detected - implement pagination handling")
        
        if elements.get('has_filters'):
            recommendations.append("Filters detected - consider crawling filter combinations")
        
        return recommendations
    
    async def run(self, patterns_file: Optional[Path] = None) -> Dict[str, Dict]:
        """Run the probing process."""
        # Load patterns to probe
        if patterns_file is None:
            patterns_file = Path(__file__).parent.parent / '03_group' / 'patterns_to_probe.json'
        
        if not patterns_file.exists():
            self.logger.error(f"Patterns file not found: {patterns_file}")
            self.logger.error("Make sure to run 03_group/group_urls.py first")
            return {}
        
        patterns = load_json(patterns_file)
        self.logger.info(f"Loaded {len(patterns)} patterns to probe")
        
        # Probe each pattern
        for pattern, info in patterns.items():
            self.logger.info(f"Probing pattern: {pattern}")
            
            examples = info.get('examples', [])
            if not examples:
                self.logger.warning(f"No examples for pattern: {pattern}")
                continue
            
            findings = await self.probe_pattern(pattern, examples)
            self.findings[pattern] = findings
        
        # Save findings
        self.save_findings()
        
        return self.findings
    
    def save_findings(self) -> None:
        """Save probing findings."""
        # Save detailed findings as JSON
        findings_file = Path(__file__).parent / 'findings.json'
        save_json(self.findings, findings_file)
        self.logger.info(f"Saved detailed findings to {findings_file}")
        
        # Save summary as YAML for readability
        summary = {}
        for pattern, findings in self.findings.items():
            summary[pattern] = {
                'type': findings.get('common_structure', {}).get('type', 'unknown'),
                'uses_javascript': findings.get('common_structure', {}).get('uses_javascript', False),
                'recommendations': findings.get('recommendations', []),
                'success_rate': sum(1 for e in findings.get('examples_probed', []) if e.get('success', False)) / len(findings.get('examples_probed', [])) if findings.get('examples_probed') else 0,
            }
        
        summary_file = Path(__file__).parent / 'findings_summary.yaml'
        save_yaml(summary, summary_file)
        self.logger.info(f"Saved findings summary to {summary_file}")


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description='Probe URL patterns to understand page structure',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Probe patterns from grouping step
  python probe_template.py --domain example.com
  
  # Probe specific patterns file
  python probe_template.py --domain example.com --patterns custom_patterns.json
  
  # Probe with specific number of examples
  python probe_template.py --domain example.com --max-examples 5
        """
    )
    
    parser.add_argument('--domain', required=True, help='Domain being analyzed')
    parser.add_argument('--patterns', help='Patterns file (default: patterns_to_probe.json)')
    parser.add_argument('--max-examples', type=int, default=3,
                       help='Maximum examples to probe per pattern')
    
    args = parser.parse_args()
    
    # Run probing
    prober = TemplateProber(args.domain)
    
    patterns_file = Path(args.patterns) if args.patterns else None
    
    # Run async probe
    findings = asyncio.run(prober.run(patterns_file))
    
    print(f"\nProbing complete!")
    print(f"Probed {len(findings)} patterns")
    print(f"Findings saved to {Path(__file__).parent}")
    
    # Print summary
    print("\nKey findings:")
    for pattern, finding in findings.items():
        common = finding.get('common_structure', {})
        print(f"\n{pattern}:")
        print(f"  - JavaScript required: {common.get('uses_javascript', False)}")
        print(f"  - Recommendations: {', '.join(finding.get('recommendations', []))}")


if __name__ == '__main__':
    main()