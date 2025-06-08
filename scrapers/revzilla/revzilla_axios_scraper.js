import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class RevZillaAxiosScraper {
    constructor() {
        this.baseUrl = 'https://www.revzilla.com';
        this.outputDir = path.join(__dirname, 'revzilla_data');
        this.headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
        };
    }

    async init() {
        await fs.mkdir(this.outputDir, { recursive: true });
    }

    async fetchPage(url) {
        try {
            const response = await axios.get(url, { 
                headers: this.headers,
                timeout: 30000
            });
            return response.data;
        } catch (error) {
            console.error(`Error fetching ${url}:`, error.message);
            throw error;
        }
    }

    async testConnection() {
        console.log('Testing connection to RevZilla...');
        try {
            const html = await this.fetchPage(this.baseUrl);
            const $ = cheerio.load(html);
            const title = $('title').text();
            console.log('Successfully connected! Page title:', title);
            
            // Save HTML for inspection
            await fs.writeFile(path.join(this.outputDir, 'test_page.html'), html);
            console.log('HTML saved to revzilla_data/test_page.html');
            
            return true;
        } catch (error) {
            console.error('Connection test failed:', error.message);
            return false;
        }
    }

    async scrapeCategory(category) {
        const url = `${this.baseUrl}/${category}`;
        console.log(`\nScraping category: ${url}`);
        
        try {
            const html = await this.fetchPage(url);
            const $ = cheerio.load(html);
            
            // Log page structure for debugging
            console.log('\nAnalyzing page structure...');
            
            // Check for various product selectors
            const selectors = {
                '.product-tile': $('.product-tile').length,
                '.product-card': $('.product-card').length,
                '.product-item': $('.product-item').length,
                '[data-product]': $('[data-product]').length,
                'article': $('article').length,
                '.grid-item': $('.grid-item').length,
                '[class*="ProductCard"]': $('[class*="ProductCard"]').length,
                '[class*="product-"]': $('[class*="product-"]').length
            };
            
            console.log('Product selector counts:');
            Object.entries(selectors).forEach(([selector, count]) => {
                if (count > 0) console.log(`  ${selector}: ${count}`);
            });
            
            // Try to extract product data with the most common selector
            let products = [];
            const productSelector = Object.entries(selectors)
                .filter(([_, count]) => count > 0)
                .sort((a, b) => b[1] - a[1])[0]?.[0];
            
            if (productSelector) {
                console.log(`\nUsing selector: ${productSelector}`);
                
                $(productSelector).each((i, elem) => {
                    if (i < 10) { // Limit to first 10 for testing
                        const $elem = $(elem);
                        const product = {
                            html: $elem.html()?.substring(0, 200),
                            text: $elem.text()?.trim().substring(0, 100),
                            links: $elem.find('a').map((_, a) => $(a).attr('href')).get(),
                            images: $elem.find('img').map((_, img) => $(img).attr('src')).get(),
                            classes: $elem.attr('class')
                        };
                        products.push(product);
                    }
                });
            }
            
            // Save raw data for analysis
            const output = {
                url,
                timestamp: new Date().toISOString(),
                productCount: products.length,
                products: products
            };
            
            const filename = `${category}_analysis_${Date.now()}.json`;
            await fs.writeFile(
                path.join(this.outputDir, filename),
                JSON.stringify(output, null, 2)
            );
            
            console.log(`\nAnalysis saved to: ${filename}`);
            console.log(`Found ${products.length} potential products`);
            
            return products;
            
        } catch (error) {
            console.error(`Error scraping ${category}:`, error.message);
            return [];
        }
    }
}

// Test the scraper
async function test() {
    const scraper = new RevZillaAxiosScraper();
    
    try {
        await scraper.init();
        
        // Test connection first
        const connected = await scraper.testConnection();
        if (!connected) {
            console.log('Failed to connect to RevZilla');
            return;
        }
        
        // Try scraping helmets category
        await scraper.scrapeCategory('motorcycle-helmets');
        
    } catch (error) {
        console.error('Test failed:', error);
    }
}

test();