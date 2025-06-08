import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class RevZillaScraper {
    constructor() {
        this.baseUrl = 'https://www.revzilla.com';
        this.outputDir = path.join(__dirname, 'revzilla_data');
        this.imagesDir = path.join(this.outputDir, 'images');
        this.browser = null;
        this.page = null;
    }

    async init() {
        // Create output directories
        await fs.mkdir(this.outputDir, { recursive: true });
        await fs.mkdir(this.imagesDir, { recursive: true });

        // Launch browser with updated settings
        this.browser = await puppeteer.launch({
            headless: 'new', // Use new headless mode
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu'
            ]
        });
        
        this.page = await this.browser.newPage();
        
        // Set user agent to avoid detection
        await this.page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        // Set viewport
        await this.page.setViewport({ width: 1920, height: 1080 });
        
        // Block unnecessary resources to speed up loading
        await this.page.setRequestInterception(true);
        this.page.on('request', (req) => {
            if (req.resourceType() === 'stylesheet' || req.resourceType() === 'font') {
                req.abort();
            } else {
                req.continue();
            }
        });
    }

    async scrapeProductListing(category, maxPages = 1) {
        const products = [];
        
        for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
            console.log(`Scraping ${category} page ${pageNum}...`);
            
            try {
                // Navigate to category page
                const url = `${this.baseUrl}/${category}?page=${pageNum}`;
                await this.page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
                
                // Wait for products to load
                await this.page.waitForSelector('.product-index-item', { timeout: 10000 });
                
                // Extract product data
                const pageProducts = await this.page.evaluate(() => {
                    const items = [];
                    const productElements = document.querySelectorAll('.product-index-item');
                    
                    productElements.forEach(element => {
                        const linkEl = element.querySelector('a.product-item-link');
                        const nameEl = element.querySelector('.product-item__title');
                        const brandEl = element.querySelector('.product-item__brand');
                        const priceEl = element.querySelector('.product-item__price-retail');
                        const salePriceEl = element.querySelector('.product-item__price-sale');
                        const ratingEl = element.querySelector('.star-rating');
                        const imageEl = element.querySelector('img.product-item__image');
                        
                        if (linkEl && nameEl) {
                            items.push({
                                url: linkEl.href,
                                name: nameEl.textContent.trim(),
                                brand: brandEl ? brandEl.textContent.trim() : '',
                                price: priceEl ? priceEl.textContent.trim() : '',
                                salePrice: salePriceEl ? salePriceEl.textContent.trim() : null,
                                rating: ratingEl ? ratingEl.getAttribute('data-rating') : null,
                                imageUrl: imageEl ? imageEl.src : null,
                                category: window.location.pathname.split('/')[1]
                            });
                        }
                    });
                    
                    return items;
                });
                
                products.push(...pageProducts);
                
                // Add delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 2000));
                
            } catch (error) {
                console.error(`Error scraping page ${pageNum}:`, error.message);
            }
        }
        
        return products;
    }

    async scrapeProductDetails(productUrl) {
        try {
            console.log(`Scraping product details: ${productUrl}`);
            
            await this.page.goto(productUrl, { waitUntil: 'networkidle2', timeout: 30000 });
            
            // Wait for main content
            await this.page.waitForSelector('.product-show', { timeout: 10000 });
            
            const productDetails = await this.page.evaluate(() => {
                const details = {};
                
                // Basic info
                details.name = document.querySelector('h1.product-title')?.textContent.trim();
                details.brand = document.querySelector('.product-brand a')?.textContent.trim();
                details.sku = document.querySelector('.product-sku')?.textContent.replace('SKU: ', '').trim();
                
                // Price info
                const priceEl = document.querySelector('.product-price__retail');
                const salePriceEl = document.querySelector('.product-price__sale');
                details.price = priceEl ? priceEl.textContent.trim() : '';
                details.salePrice = salePriceEl ? salePriceEl.textContent.trim() : null;
                
                // Rating
                const ratingEl = document.querySelector('.product-rating .star-rating');
                details.rating = ratingEl ? ratingEl.getAttribute('data-rating') : null;
                details.reviewCount = document.querySelector('.product-rating__count')?.textContent.match(/\d+/)?.[0];
                
                // Description
                details.description = document.querySelector('.product-description__content')?.textContent.trim();
                
                // Features
                const features = [];
                document.querySelectorAll('.product-features li').forEach(li => {
                    features.push(li.textContent.trim());
                });
                details.features = features;
                
                // Specifications
                const specs = {};
                document.querySelectorAll('.product-specs tr').forEach(row => {
                    const label = row.querySelector('.product-specs__label')?.textContent.trim();
                    const value = row.querySelector('.product-specs__value')?.textContent.trim();
                    if (label && value) {
                        specs[label] = value;
                    }
                });
                details.specifications = specs;
                
                // Images
                const images = [];
                document.querySelectorAll('.product-images__thumb img').forEach(img => {
                    if (img.src) {
                        images.push(img.src.replace('/thumb/', '/large/'));
                    }
                });
                details.images = images;
                
                // Sizes/Options
                const sizes = [];
                document.querySelectorAll('.product-options__size option').forEach(option => {
                    if (option.value && option.textContent !== 'Select Size') {
                        sizes.push({
                            value: option.value,
                            text: option.textContent.trim(),
                            available: !option.disabled
                        });
                    }
                });
                details.sizes = sizes;
                
                return details;
            });
            
            return productDetails;
            
        } catch (error) {
            console.error(`Error scraping product details:`, error.message);
            return null;
        }
    }

    async downloadImage(imageUrl, filename) {
        try {
            const response = await this.page.evaluate(async (url) => {
                const res = await fetch(url);
                const buffer = await res.arrayBuffer();
                return Array.from(new Uint8Array(buffer));
            }, imageUrl);
            
            const buffer = Buffer.from(response);
            const filepath = path.join(this.imagesDir, filename);
            await fs.writeFile(filepath, buffer);
            
            return filepath;
        } catch (error) {
            console.error(`Error downloading image ${imageUrl}:`, error.message);
            return null;
        }
    }

    async scrapeCategory(category, options = {}) {
        const { maxPages = 1, includeDetails = true, downloadImages = false } = options;
        
        // Scrape product listings
        const products = await this.scrapeProductListing(category, maxPages);
        console.log(`Found ${products.length} products in ${category}`);
        
        // Scrape detailed info for each product
        if (includeDetails) {
            for (let i = 0; i < products.length; i++) {
                const product = products[i];
                console.log(`Scraping details for product ${i + 1}/${products.length}`);
                
                const details = await this.scrapeProductDetails(product.url);
                if (details) {
                    products[i] = { ...product, ...details };
                    
                    // Download images if requested
                    if (downloadImages && details.images && details.images.length > 0) {
                        const imageFilename = `${product.brand}_${product.name}`.replace(/[^a-z0-9]/gi, '_').toLowerCase();
                        const mainImagePath = await this.downloadImage(details.images[0], `${imageFilename}.jpg`);
                        products[i].localImagePath = mainImagePath;
                    }
                }
                
                // Add delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
        }
        
        // Save data
        const filename = `${category}_products_${new Date().toISOString().split('T')[0]}.json`;
        const filepath = path.join(this.outputDir, filename);
        await fs.writeFile(filepath, JSON.stringify(products, null, 2));
        
        console.log(`Saved ${products.length} products to ${filepath}`);
        return products;
    }

    async close() {
        if (this.browser) {
            await this.browser.close();
        }
    }
}

// Example usage
async function main() {
    const scraper = new RevZillaScraper();
    
    try {
        await scraper.init();
        
        // Scrape different categories
        const categories = [
            'motorcycle-helmets',
            'motorcycle-jackets',
            'motorcycle-gloves',
            'motorcycle-boots',
            'motorcycle-pants'
        ];
        
        for (const category of categories) {
            await scraper.scrapeCategory(category, {
                maxPages: 1,
                includeDetails: true,
                downloadImages: true
            });
            
            // Add delay between categories
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
        
    } catch (error) {
        console.error('Scraping error:', error);
    } finally {
        await scraper.close();
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export default RevZillaScraper;