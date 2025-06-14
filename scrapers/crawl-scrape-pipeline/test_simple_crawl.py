#!/usr/bin/env python3
"""
Simple test crawler to verify basic connectivity and parsing.
"""
import scrapy
from scrapy.crawler import CrawlerProcess


class SimpleSpider(scrapy.Spider):
    name = 'simple_test'
    start_urls = ['https://quotes.toscrape.com/']
    
    def parse(self, response):
        print(f"\n=== RESPONSE DEBUG ===")
        print(f"URL: {response.url}")
        print(f"Status: {response.status}")
        print(f"Headers: {response.headers}")
        print(f"Body length: {len(response.body)}")
        print(f"Text length: {len(response.text)}")
        print(f"First 500 chars of body: {response.text[:500]}")
        
        # Test different ways to extract links
        links_css = response.css('a::attr(href)').getall()
        print(f"\nLinks found with CSS: {len(links_css)}")
        print(f"First 5 CSS links: {links_css[:5]}")
        
        links_xpath = response.xpath('//a/@href').getall()
        print(f"\nLinks found with XPath: {len(links_xpath)}")
        print(f"First 5 XPath links: {links_xpath[:5]}")
        
        # Test quote extraction
        quotes = response.css('div.quote')
        print(f"\nQuotes found: {len(quotes)}")
        
        if quotes:
            first_quote = quotes[0]
            text = first_quote.css('span.text::text').get()
            author = first_quote.css('small.author::text').get()
            print(f"First quote: '{text}' - {author}")


if __name__ == '__main__':
    process = CrawlerProcess({
        'USER_AGENT': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'LOG_LEVEL': 'WARNING',
    })
    
    process.crawl(SimpleSpider)
    process.start()