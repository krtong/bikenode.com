import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import { parse } from 'json2csv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class RevZillaScraper {
    constructor(options = {}) {
        this.baseUrl = 'https://www.revzilla.com';
        this.outputDir = options.outputDir || path.join(__dirname, 'revzilla_data');
        this.imagesDir = path.join(this.outputDir, 'images');
        this.browser = null;
        this.page = null;
        this.failedUrls = [];
        this.options = {
            headless: options.headless !== false,
            downloadImages: options.downloadImages || false,
            rateLimit: options.rateLimit || 2000, // ms between requests
            maxRetries: options.maxRetries || 3,
            timeout: options.timeout || 60000
        };
    }

    async init() {
        // Create output directories
        await fs.mkdir(this.outputDir, { recursive: true });
        await fs.mkdir(this.imagesDir, { recursive: true });
        await fs.mkdir(path.join(this.outputDir, 'products'), { recursive: true });
        await fs.mkdir(path.join(this.outputDir, 'exports'), { recursive: true });

        // Launch browser
        this.browser = await puppeteer.launch({
            headless: this.options.headless ? 'new' : false,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--single-process',
                '--disable-gpu'
            ],
            timeout: this.options.timeout
        });
        
        this.page = await this.browser.newPage();
        
        // Set user agent
        await this.page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        // Set viewport
        await this.page.setViewport({ width: 1920, height: 1080 });
        
        // Block unnecessary resources for faster loading
        await this.page.setRequestInterception(true);
        this.page.on('request', (req) => {
            const resourceType = req.resourceType();
            if (['stylesheet', 'font', 'media'].includes(resourceType)) {
                req.abort();
            } else {
                req.continue();
            }
        });
    }

    async scrapeCategory(categorySlug, options = {}) {
        const { maxPages = null, includeDetails = false } = options;
        console.log(`\n📦 Scraping category: ${categorySlug}`);
        
        const allProducts = [];
        let currentPage = 1;
        let hasMorePages = true;

        while (hasMorePages && (!maxPages || currentPage <= maxPages)) {
            try {
                // Use view_all=true for all pages
                const url = currentPage === 1 
                    ? `${this.baseUrl}/${categorySlug}?view_all=true`
                    : `${this.baseUrl}/${categorySlug}?view_all=true&page=${currentPage}`;
                
                console.log(`📄 Page ${currentPage}: ${url}`);
                
                await this.page.goto(url, { 
                    waitUntil: 'domcontentloaded', 
                    timeout: this.options.timeout 
                });
                
                // Wait for products to load
                try {
                    await this.page.waitForSelector('.product-tile', { 
                        timeout: 30000,
                        visible: true 
                    });
                } catch (e) {
                    console.log('No products found on this page');
                    hasMorePages = false;
                    break;
                }
                
                // Add small delay for dynamic content
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // Extract products
                const pageProducts = await this.page.evaluate(() => {
                    const items = [];
                    const productTiles = document.querySelectorAll('.product-tile');
                    
                    productTiles.forEach(tile => {
                        const nameEl = tile.querySelector('.product-tile__name');
                        const name = nameEl ? nameEl.textContent.trim() : null;
                        
                        // Extract price from tile text
                        const priceMatch = tile.textContent.match(/\$[\d,]+\.?\d*/);
                        const price = priceMatch ? priceMatch[0] : null;
                        
                        // Get image
                        const imgEl = tile.querySelector('img');
                        const imageUrl = imgEl ? imgEl.src : null;
                        
                        // Get product link
                        const linkEl = tile.querySelector('a');
                        const url = linkEl ? linkEl.href : null;
                        
                        if (name && price) {
                            items.push({
                                url: url,
                                name: name,
                                price: price,
                                imageUrl: imageUrl,
                                category: window.location.pathname.split('/')[1]
                            });
                        }
                    });
                    
                    return items;
                });
                
                console.log(`✅ Found ${pageProducts.length} products on page ${currentPage}`);
                allProducts.push(...pageProducts);
                
                // Check for next page
                const hasNextButton = await this.page.evaluate(() => {
                    const nextButton = document.querySelector('a[rel="next"], .pagination__next:not(.disabled)');
                    return !!nextButton;
                });
                
                hasMorePages = hasNextButton && pageProducts.length > 0;
                currentPage++;
                
                // Rate limiting
                await new Promise(resolve => setTimeout(resolve, this.options.rateLimit));
                
            } catch (error) {
                console.error(`❌ Error on page ${currentPage}:`, error.message);
                hasMorePages = false;
            }
        }

        // Optionally fetch product details
        if (includeDetails && allProducts.length > 0) {
            console.log('\n🔍 Fetching product details...');
            for (let i = 0; i < allProducts.length; i++) {
                const product = allProducts[i];
                const details = await this.scrapeProductDetails(product.url);
                if (details) {
                    allProducts[i] = { ...product, ...details };
                }
                
                // Progress indicator
                if ((i + 1) % 10 === 0) {
                    console.log(`Progress: ${i + 1}/${allProducts.length}`);
                }
            }
        }

        // Save results
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `${categorySlug}_${timestamp}.json`;
        const filepath = path.join(this.outputDir, 'products', filename);
        
        await fs.writeFile(filepath, JSON.stringify({
            category: categorySlug,
            totalProducts: allProducts.length,
            timestamp: new Date().toISOString(),
            products: allProducts
        }, null, 2));
        
        console.log(`\n✅ Saved ${allProducts.length} products to ${filepath}`);
        return allProducts;
    }

    async scrapeProductDetails(productUrl) {
        try {
            await this.page.goto(productUrl, { 
                waitUntil: 'networkidle2', 
                timeout: this.options.timeout 
            });
            
            // Extract structured data and additional details
            const productDetails = await this.page.evaluate(() => {
                // Try to get JSON-LD structured data first
                const scripts = document.querySelectorAll('script[type="application/ld+json"]');
                let structuredData = null;
                
                for (const script of scripts) {
                    try {
                        const data = JSON.parse(script.textContent);
                        if (data['@type'] === 'Product') {
                            structuredData = data;
                            break;
                        }
                    } catch (e) {}
                }
                
                // Extract additional details from the page
                const details = {
                    url: window.location.href,
                    scrapedAt: new Date().toISOString()
                };
                
                if (structuredData) {
                    details.name = structuredData.name;
                    details.brand = structuredData.brand?.name;
                    details.price = structuredData.offers?.price;
                    details.currency = structuredData.offers?.priceCurrency;
                    details.availability = structuredData.offers?.availability;
                    details.sku = structuredData.sku;
                    details.description = structuredData.description;
                    details.images = Array.isArray(structuredData.image) ? structuredData.image : [structuredData.image];
                    details.rating = structuredData.aggregateRating?.ratingValue;
                    details.reviewCount = structuredData.aggregateRating?.reviewCount;
                }
                
                // Extract sizes/variants
                const sizeOptions = [];
                const sizeSelects = document.querySelectorAll('select[name*="size"], select[class*="size"]');
                sizeSelects.forEach(select => {
                    const options = Array.from(select.options);
                    options.forEach(opt => {
                        if (opt.value && opt.text && !opt.disabled) {
                            sizeOptions.push({
                                value: opt.value,
                                text: opt.text.trim(),
                                available: !opt.text.includes('Out of Stock')
                            });
                        }
                    });
                });
                
                if (sizeOptions.length > 0) {
                    details.sizes = sizeOptions;
                }
                
                // Extract features
                const features = [];
                const featureElements = document.querySelectorAll('[class*="feature"], [class*="bullet"], li');
                featureElements.forEach(el => {
                    const text = el.textContent.trim();
                    if (text && text.trim() && !text.includes('Add to Cart')) {
                        features.push(text);
                    }
                });
                
                if (features.length > 0) {
                    details.features = [...new Set(features)]; // Dedupe only
                }
                
                return details;
            });
            
            await new Promise(resolve => setTimeout(resolve, this.options.rateLimit));
            return productDetails;
            
        } catch (error) {
            console.error(`Error scraping product details for ${productUrl}:`, error.message);
            this.failedUrls.push(productUrl);
            return null;
        }
    }

    async scrapeSitemap(options = {}) {
        const { maxUrls = null, batchSize = 100 } = options;
        console.log('\n🗺️ Scraping sitemap for product URLs...');
        
        const sitemapUrl = 'https://www.revzilla.com/sitemap_products.xml';
        const allUrls = [];
        let pageNum = 1;
        let hasMorePages = true;

        // Fetch all sitemap pages
        while (hasMorePages) {
            try {
                const url = `${sitemapUrl}?page=${pageNum}`;
                const response = await fetch(url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (compatible; RevZillaScraper/1.0)'
                    }
                });
                
                if (!response.ok) {
                    hasMorePages = false;
                    break;
                }
                
                const xmlContent = await response.text();
                const urlMatches = xmlContent.match(/<loc>([^<]+)<\/loc>/g) || [];
                const urls = urlMatches.map(match => match.replace(/<\/?loc>/g, ''));
                
                if (urls.length === 0) {
                    hasMorePages = false;
                } else {
                    allUrls.push(...urls);
                    console.log(`Page ${pageNum}: Found ${urls.length} URLs (Total: ${allUrls.length})`);
                    
                    if (maxUrls && allUrls.length >= maxUrls) {
                        allUrls.splice(maxUrls);
                        hasMorePages = false;
                    }
                }
                
                pageNum++;
                await new Promise(resolve => setTimeout(resolve, 1000));
                
            } catch (error) {
                console.error(`Error fetching sitemap page ${pageNum}:`, error.message);
                hasMorePages = false;
            }
        }

        console.log(`\n✅ Total URLs found: ${allUrls.length}`);

        // Save URLs in batches
        const urlBatches = [];
        for (let i = 0; i < allUrls.length; i += batchSize) {
            urlBatches.push(allUrls.slice(i, i + batchSize));
        }

        const sitemapDir = path.join(this.outputDir, 'sitemap_urls');
        await fs.mkdir(sitemapDir, { recursive: true });

        for (let i = 0; i < urlBatches.length; i++) {
            const filename = `urls_batch_${i + 1}.json`;
            const filepath = path.join(sitemapDir, filename);
            await fs.writeFile(filepath, JSON.stringify(urlBatches[i], null, 2));
        }

        console.log(`Saved ${urlBatches.length} URL batches to ${sitemapDir}`);
        return allUrls;
    }

    async scrapeProductBatch(urls) {
        const products = [];
        
        for (const url of urls) {
            const details = await this.scrapeProductDetails(url);
            if (details) {
                products.push(details);
            }
        }
        
        return products;
    }

    async exportToCSV(products, filename) {
        const exportDir = path.join(this.outputDir, 'exports');
        await fs.mkdir(exportDir, { recursive: true });
        
        // Define CSV fields
        const fields = [
            { label: 'Name', value: 'name' },
            { label: 'Brand', value: 'brand' },
            { label: 'Price', value: 'price' },
            { label: 'Category', value: 'category' },
            { label: 'SKU', value: 'sku' },
            { label: 'In Stock', value: row => row.availability?.includes('InStock') ? 'Yes' : 'No' },
            { label: 'Rating', value: 'rating' },
            { label: 'Reviews', value: 'reviewCount' },
            { label: 'URL', value: 'url' },
            { label: 'Image URL', value: row => row.images?.[0] || row.imageUrl || '' },
            { label: 'Description', value: 'description' },
            { label: 'Features', value: row => row.features?.join('; ') || '' },
            { label: 'Sizes', value: row => row.sizes?.map(s => s.text).join(', ') || '' }
        ];

        const csv = parse(products, { fields });
        const filepath = path.join(exportDir, filename);
        await fs.writeFile(filepath, csv);
        
        console.log(`✅ Exported ${products.length} products to ${filepath}`);
        return filepath;
    }

    async close() {
        if (this.browser) {
            await this.browser.close();
        }
        
        if (this.failedUrls.length > 0) {
            const failedFile = path.join(this.outputDir, 'failed_urls.json');
            await fs.writeFile(failedFile, JSON.stringify(this.failedUrls, null, 2));
            console.log(`\n⚠️ ${this.failedUrls.length} URLs failed. Saved to ${failedFile}`);
        }
    }
}

// CLI usage
async function main() {
    const args = process.argv.slice(2);
    const command = args[0];
    
    const scraper = new RevZillaScraper({
        headless: !args.includes('--headed'),
        downloadImages: args.includes('--images')
    });
    
    try {
        await scraper.init();
        
        switch (command) {
            case 'category': {
                const category = args[1];
                if (!category) {
                    console.error('Please specify a category slug');
                    break;
                }
                const maxPages = args.find(a => a.startsWith('--pages='))?.split('=')[1];
                const includeDetails = args.includes('--details');
                
                const products = await scraper.scrapeCategory(category, {
                    maxPages: maxPages ? parseInt(maxPages) : null,
                    includeDetails
                });
                
                // Export to CSV if requested
                if (args.includes('--csv')) {
                    const csvFile = `${category}_${new Date().toISOString().split('T')[0]}.csv`;
                    await scraper.exportToCSV(products, csvFile);
                }
                break;
            }
            
            case 'sitemap': {
                const maxUrls = args.find(a => a.startsWith('--max='))?.split('=')[1];
                await scraper.scrapeSitemap({
                    maxUrls: maxUrls ? parseInt(maxUrls) : null
                });
                break;
            }
            
            case 'batch': {
                const batchFile = args[1];
                if (!batchFile) {
                    console.error('Please specify a batch file');
                    break;
                }
                
                const urls = JSON.parse(await fs.readFile(batchFile, 'utf8'));
                const products = await scraper.scrapeProductBatch(urls);
                
                const outputFile = batchFile.replace('.json', '_products.json');
                await fs.writeFile(outputFile, JSON.stringify(products, null, 2));
                
                if (args.includes('--csv')) {
                    const csvFile = batchFile.replace('.json', '_products.csv');
                    await scraper.exportToCSV(products, csvFile);
                }
                break;
            }
            
            default:
                console.log(`
RevZilla Scraper - Usage:

Scrape a category:
  node revzilla_scraper.js category [category-slug] [options]
  Options:
    --pages=N       Scrape N pages (default: all)
    --details       Include product details
    --csv           Export to CSV
    --headed        Show browser window
    --images        Download product images

Scrape sitemap:
  node revzilla_scraper.js sitemap [options]
  Options:
    --max=N         Maximum URLs to extract

Scrape URL batch:
  node revzilla_scraper.js batch [urls.json] [options]
  Options:
    --csv           Export to CSV

Examples:
  node revzilla_scraper.js category motorcycle-helmets --pages=5 --csv
  node revzilla_scraper.js sitemap --max=1000
  node revzilla_scraper.js batch urls_batch_1.json --csv
                `);
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