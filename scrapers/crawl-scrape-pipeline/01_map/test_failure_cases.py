#!/usr/bin/env python3
"""
Test crawler on challenging sites to find failure cases.
"""

import asyncio
import sys
from pathlib import Path

# Test sites that commonly block crawlers
CHALLENGING_SITES = [
    # Social media (often require login)
    "linkedin.com",
    "facebook.com", 
    "instagram.com",
    "twitter.com",
    
    # E-commerce with strong anti-bot
    "walmart.com",
    "target.com",
    "bestbuy.com",
    "ebay.com",
    
    # News sites with paywalls
    "nytimes.com",
    "wsj.com",
    "ft.com",
    
    # Sites with Cloudflare Enterprise
    "discord.com",
    "medium.com",
    
    # Sites with PerimeterX/DataDome
    "ticketmaster.com",
    "footlocker.com",
    
    # Government sites
    "irs.gov",
    "dmv.ca.gov",
    
    # Banking/Financial (highest security)
    "chase.com",
    "bankofamerica.com",
    
    # Streaming services
    "netflix.com",
    "hulu.com"
]

async def test_all_sites():
    """Test crawler on all challenging sites."""
    sys.path.append(str(Path(__file__).parent.parent))
    from ultra_stealth_crawler import UltraStealthCrawler
    
    print("Testing crawler on challenging sites...")
    print("=" * 60)
    
    results = {}
    
    for site in CHALLENGING_SITES:
        print(f"\nTesting {site}...")
        crawler = UltraStealthCrawler(site)
        
        # Just test the homepage
        crawler.to_visit.append(f'https://{site}/')
        crawler.to_visit.append(f'https://www.{site}/')
        
        # Test with single page
        await crawler.crawl(max_pages=2)
        
        # Check results
        success_rate = (crawler.stats['success_200'] / crawler.stats['total_attempts'] * 100) if crawler.stats['total_attempts'] > 0 else 0
        
        results[site] = {
            'success_rate': success_rate,
            'successful_200s': crawler.stats['success_200'],
            'total_attempts': crawler.stats['total_attempts'],
            'methods_used': crawler.stats['methods_used'],
            'status_codes': crawler.stats.get('status_codes', {})
        }
        
        # Brief delay between sites
        await asyncio.sleep(2)
    
    # Print summary
    print("\n" + "=" * 60)
    print("SUMMARY OF CHALLENGING SITES")
    print("=" * 60)
    
    successful_sites = []
    failed_sites = []
    
    for site, data in results.items():
        if data['success_rate'] == 100:
            successful_sites.append(site)
        else:
            failed_sites.append((site, data))
    
    print(f"\n✅ SUCCESSFUL ({len(successful_sites)} sites):")
    for site in successful_sites:
        print(f"  - {site}")
    
    print(f"\n❌ FAILED OR PARTIAL ({len(failed_sites)} sites):")
    for site, data in failed_sites:
        print(f"  - {site}: {data['success_rate']:.0f}% success")
        if data['status_codes']:
            print(f"    Status codes: {data['status_codes']}")
        if data['total_attempts'] > 0:
            print(f"    Methods tried: {list(data['methods_used'].keys())}")
    
    # Calculate overall success rate
    total_success = sum(r['successful_200s'] for r in results.values())
    total_attempts = sum(r['total_attempts'] for r in results.values())
    overall_rate = (total_success / total_attempts * 100) if total_attempts > 0 else 0
    
    print(f"\nOVERALL SUCCESS RATE: {overall_rate:.1f}%")
    print(f"Total: {total_success}/{total_attempts} requests successful")
    
    return results

if __name__ == "__main__":
    asyncio.run(test_all_sites())