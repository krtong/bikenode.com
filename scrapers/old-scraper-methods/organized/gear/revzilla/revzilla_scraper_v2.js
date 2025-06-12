import puppeteer from 'puppeteer';
import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { EventEmitter } from 'events';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
    baseUrl: 'https://www.revzilla.com',
    outputDir: path.join(__dirname, 'data'),
    imagesDir: path.join(__dirname, 'data', 'images'),
    logsDir: path.join(__dirname, 'logs'),
    stateFile: path.join(__dirname, 'data', 'scraper_state.json'),
    
    // Rate limiting
    delays: {
        betweenPages: 2000,
        betweenProducts: 3000,
        betweenCategories: 5000,
        onError: 10000,
        maxRetryDelay: 60000
    },
    
    // Retry settings
    maxRetries: 3,
    retryBackoff: 2,
    
    // Batch settings
    batchSize: 50,
    maxConcurrentDownloads: 5,
    
    // User agents rotation
    userAgents: [
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15'
    ],
    
    // Proxy settings (optional)
    useProxy: false,
    proxyList: []
};

// Product schema
const PRODUCT_SCHEMA = {
    // Basic info
    id: null,
    url: null,
    scraped_at: null,
    
    // Product details
    name: null,
    brand: null,
    sku: null,
    mpn: null, // Manufacturer Part Number
    category: null,
    subcategory: null,
    
    // Pricing
    price: {
        regular: null,
        sale: null,
        currency: 'USD',
        in_stock: null
    },
    
    // Ratings & Reviews
    rating: {
        average: null,
        count: null,
        distribution: {}
    },
    
    // Description & Features
    description: null,
    features: [],
    specifications: {},
    
    // Variants & Options
    sizes: [],
    colors: [],
    variants: [],
    
    // Images
    images: {
        main: null,
        gallery: [],
        local_paths: []
    },
    
    // SEO & Metadata
    meta: {
        title: null,
        description: null,
        keywords: []
    },
    
    // Structured data
    json_ld: null,
    
    // Additional info
    shipping: {
        free_shipping: null,
        estimated_days: null
    },
    warranty: null,
    fitment: [],
    related_products: [],
    
    // Status
    scrape_status: 'pending',
    error_count: 0,
    last_error: null
};

class RevZillaScraperV2 extends EventEmitter {
    constructor(options = {}) {
        super();
        this.config = { ...CONFIG, ...options };
        this.browser = null;
        this.state = {
            totalProducts: 0,
            scrapedProducts: 0,
            failedProducts: 0,
            categories: {},
            startTime: new Date(),
            currentCategory: null,
            currentPage: 1
        };
        this.isRunning = false;
        this.shouldStop = false;
        this.logStream = null;
    }

    async init() {
        // Create directories
        await this.createDirectories();
        
        // Load previous state if exists
        await this.loadState();
        
        // Setup logging
        await this.setupLogging();
        
        // Initialize browser only when needed
        // Don't initialize here to avoid connection issues
        
        this.log('info', 'Scraper initialized');
    }

    async createDirectories() {
        const dirs = [
            this.config.outputDir,
            this.config.imagesDir,
            this.config.logsDir,
            path.join(this.config.imagesDir, 'helmets'),
            path.join(this.config.imagesDir, 'jackets'),
            path.join(this.config.imagesDir, 'gloves'),
            path.join(this.config.imagesDir, 'boots'),
            path.join(this.config.imagesDir, 'pants'),
            path.join(this.config.imagesDir, 'accessories')
        ];
        
        for (const dir of dirs) {
            await fs.mkdir(dir, { recursive: true });
        }
    }

    async setupLogging() {
        const logFile = path.join(
            this.config.logsDir,
            `scraper_${new Date().toISOString().split('T')[0]}.log`
        );
        
        try {
            this.logStream = await fs.open(logFile, 'a');
        } catch (error) {
            console.warn('Could not open log file:', error.message);
        }
    }

    log(level, message, data = {}) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level,
            message,
            ...data
        };
        
        console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
        
        if (this.logStream && this.logStream.write) {
            this.logStream.write(JSON.stringify(logEntry) + '\n').catch(() => {});
        }
        
        this.emit('log', logEntry);
    }

    async initBrowser() {
        if (this.browser) return;
        
        const args = [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
            '--disable-blink-features=AutomationControlled'
        ];
        
        if (this.config.useProxy && this.config.proxyList.length > 0) {
            const proxy = this.getRandomProxy();
            args.push(`--proxy-server=${proxy}`);
        }
        
        try {
            this.browser = await puppeteer.launch({
                headless: 'new',
                args,
                defaultViewport: {
                    width: 1920,
                    height: 1080
                }
            });
        } catch (error) {
            this.log('error', 'Failed to launch browser', { error: error.message });
            throw error;
        }
    }

    getRandomUserAgent() {
        return this.config.userAgents[Math.floor(Math.random() * this.config.userAgents.length)];
    }

    getRandomProxy() {
        return this.config.proxyList[Math.floor(Math.random() * this.config.proxyList.length)];
    }

    async createPage() {
        if (!this.browser) {
            await this.initBrowser();
        }
        
        const page = await this.browser.newPage();
        
        // Set random user agent
        await page.setUserAgent(this.getRandomUserAgent());
        
        // Add stealth settings
        await page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'webdriver', {
                get: () => false,
            });
            
            // Override chrome property
            window.chrome = {
                runtime: {},
            };
            
            // Override permissions
            const originalQuery = window.navigator.permissions.query;
            window.navigator.permissions.query = (parameters) => (
                parameters.name === 'notifications' ?
                    Promise.resolve({ state: Notification.permission }) :
                    originalQuery(parameters)
            );
        });
        
        // Set request interception for efficiency
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            const resourceType = req.resourceType();
            if (['font', 'stylesheet'].includes(resourceType)) {
                req.abort();
            } else {
                req.continue();
            }
        });
        
        return page;
    }

    async discoverCategories() {
        this.log('info', 'Discovering categories...');
        
        try {
            await this.initBrowser();
            const page = await this.createPage();
            
            await page.goto(this.config.baseUrl, { 
                waitUntil: 'networkidle2',
                timeout: 30000 
            });
            
            const categories = await page.evaluate(() => {
                const cats = {};
                
                // Find main navigation menu
                const menuItems = document.querySelectorAll('.main-nav__item, .navigation-menu__item, [data-category]');
                
                menuItems.forEach(item => {
                    const link = item.querySelector('a');
                    if (link && link.href.includes('/motorcycle-')) {
                        const url = link.href;
                        const text = link.textContent.trim();
                        const category = url.split('/').pop().split('?')[0];
                        
                        if (category && !cats[category]) {
                            cats[category] = {
                                name: text,
                                url: url,
                                subcategories: []
                            };
                        }
                    }
                });
                
                // Also check for subcategories
                document.querySelectorAll('[data-subcategory], .subcategory-link').forEach(subItem => {
                    const link = subItem.querySelector('a') || subItem;
                    if (link.href && link.href.includes('/motorcycle-')) {
                        const parts = link.href.split('/');
                        const parentCategory = parts[parts.length - 2];
                        const subcategory = parts[parts.length - 1].split('?')[0];
                        
                        if (cats[parentCategory]) {
                            cats[parentCategory].subcategories.push({
                                name: link.textContent.trim(),
                                url: link.href,
                                slug: subcategory
                            });
                        }
                    }
                });
                
                return cats;
            });
            
            // Add default categories if discovery fails
            const defaultCategories = {
                'motorcycle-helmets': { name: 'Helmets', subcategories: [] },
                'motorcycle-jackets': { name: 'Jackets', subcategories: [] },
                'motorcycle-gloves': { name: 'Gloves', subcategories: [] },
                'motorcycle-boots': { name: 'Boots', subcategories: [] },
                'motorcycle-pants': { name: 'Pants', subcategories: [] },
                'motorcycle-accessories': { name: 'Accessories', subcategories: [] }
            };
            
            const finalCategories = { ...defaultCategories, ...categories };
            
            this.log('info', `Discovered ${Object.keys(finalCategories).length} categories`);
            
            await page.close();
            return finalCategories;
            
        } catch (error) {
            this.log('error', 'Category discovery failed', { error: error.message });
            
            // Return default categories on error
            return {
                'motorcycle-helmets': { name: 'Helmets', subcategories: [] },
                'motorcycle-jackets': { name: 'Jackets', subcategories: [] },
                'motorcycle-gloves': { name: 'Gloves', subcategories: [] },
                'motorcycle-boots': { name: 'Boots', subcategories: [] },
                'motorcycle-pants': { name: 'Pants', subcategories: [] },
                'motorcycle-accessories': { name: 'Accessories', subcategories: [] }
            };
        }
    }

    async scrapeProductListing(category, pageNum = 1) {
        let page;
        
        try {
            await this.initBrowser();
            page = await this.createPage();
            
            const url = `${this.config.baseUrl}/${category}?page=${pageNum}&limit=96`;
            this.log('info', `Scraping listing page: ${url}`);
            
            await page.goto(url, { 
                waitUntil: 'networkidle2',
                timeout: 30000 
            });
            
            // Check if products exist
            const hasProducts = await page.$('.product-index-item, .product-tile, [data-product-tile]');
            if (!hasProducts) {
                this.log('warn', 'No products found on page', { category, pageNum });
                return { products: [], hasNextPage: false };
            }
            
            // Extract product URLs and basic info
            const pageData = await page.evaluate(() => {
                const items = [];
                const productSelectors = [
                    '.product-index-item',
                    '.product-tile',
                    '[data-product-tile]',
                    '.product-card'
                ];
                
                let productElements = [];
                for (const selector of productSelectors) {
                    const elements = document.querySelectorAll(selector);
                    if (elements.length > 0) {
                        productElements = elements;
                        break;
                    }
                }
                
                productElements.forEach(element => {
                    const linkEl = element.querySelector('a[href*="/motorcycle"]');
                    const nameEl = element.querySelector('.product-item__title, .product-tile__title, [data-product-title]');
                    const brandEl = element.querySelector('.product-item__brand, .product-tile__brand, [data-product-brand]');
                    const priceEl = element.querySelector('[data-product-price], .product-price, .price');
                    const imageEl = element.querySelector('img[src*="revzilla"], img[data-src*="revzilla"]');
                    
                    if (linkEl && nameEl) {
                        items.push({
                            url: linkEl.href,
                            name: nameEl.textContent.trim(),
                            brand: brandEl ? brandEl.textContent.trim() : '',
                            price: priceEl ? priceEl.textContent.trim() : '',
                            imageUrl: imageEl ? (imageEl.src || imageEl.dataset.src) : null
                        });
                    }
                });
                
                // Check for next page
                const nextPageExists = !!document.querySelector(
                    '.pagination__next:not(.disabled), ' +
                    'a[rel="next"], ' +
                    '.next-page:not(.disabled)'
                );
                
                return {
                    products: items,
                    hasNextPage: nextPageExists
                };
            });
            
            await page.close();
            return pageData;
            
        } catch (error) {
            this.log('error', 'Failed to scrape listing', { 
                category, 
                pageNum, 
                error: error.message 
            });
            
            if (page) await page.close();
            throw error;
        }
    }

    async scrapeProductDetails(productUrl, retryCount = 0) {
        let page;
        
        try {
            await this.initBrowser();
            page = await this.createPage();
            
            this.log('info', `Scraping product: ${productUrl}`);
            
            await page.goto(productUrl, { 
                waitUntil: 'networkidle2',
                timeout: 30000 
            });
            
            // Wait for main content
            await page.waitForSelector(
                '.product-show, .product-detail, [data-product-detail]',
                { timeout: 10000 }
            );
            
            // Extract all product data
            const productData = await page.evaluate(() => {
                const data = {};
                
                // Basic info
                data.name = document.querySelector('h1.product-title, h1[itemprop="name"]')?.textContent.trim();
                data.brand = document.querySelector('.product-brand a, [itemprop="brand"]')?.textContent.trim();
                data.sku = document.querySelector('.product-sku, [data-sku]')?.textContent.replace(/SKU:?\s*/i, '').trim();
                
                // Pricing
                const priceEl = document.querySelector('.product-price__retail, [data-price]');
                const salePriceEl = document.querySelector('.product-price__sale, [data-sale-price]');
                data.price = {
                    regular: priceEl ? parseFloat(priceEl.textContent.replace(/[^0-9.]/g, '')) : null,
                    sale: salePriceEl ? parseFloat(salePriceEl.textContent.replace(/[^0-9.]/g, '')) : null,
                    currency: 'USD'
                };
                
                // Stock status
                const stockEl = document.querySelector('.product-stock, [data-in-stock]');
                data.price.in_stock = stockEl ? !stockEl.textContent.includes('out of stock') : true;
                
                // Rating
                const ratingEl = document.querySelector('.star-rating, [data-rating]');
                const reviewCountEl = document.querySelector('.product-rating__count, [data-review-count]');
                data.rating = {
                    average: ratingEl ? parseFloat(ratingEl.getAttribute('data-rating') || ratingEl.textContent) : null,
                    count: reviewCountEl ? parseInt(reviewCountEl.textContent.match(/\d+/)?.[0] || '0') : 0
                };
                
                // Description
                data.description = document.querySelector(
                    '.product-description__content, ' +
                    '[data-product-description], ' +
                    '.product-info__description'
                )?.textContent.trim();
                
                // Features
                data.features = [];
                document.querySelectorAll('.product-features li, .feature-list li').forEach(li => {
                    const text = li.textContent.trim();
                    if (text) data.features.push(text);
                });
                
                // Specifications
                data.specifications = {};
                document.querySelectorAll('.product-specs tr, .specs-table tr').forEach(row => {
                    const label = row.querySelector('td:first-child, .spec-name')?.textContent.trim();
                    const value = row.querySelector('td:last-child, .spec-value')?.textContent.trim();
                    if (label && value) {
                        data.specifications[label] = value;
                    }
                });
                
                // Images
                data.images = {
                    main: null,
                    gallery: []
                };
                
                // Main image
                const mainImg = document.querySelector('.product-images__main img, .main-image img');
                if (mainImg) {
                    data.images.main = mainImg.src || mainImg.dataset.src;
                }
                
                // Gallery images
                document.querySelectorAll(
                    '.product-images__thumb img, ' +
                    '.product-gallery img, ' +
                    '[data-gallery-image]'
                ).forEach(img => {
                    const src = img.src || img.dataset.src || img.dataset.zoom;
                    if (src && !src.includes('thumb')) {
                        // Try to get high-res version
                        const highRes = src.replace('/thumb/', '/large/')
                            .replace('_thumb', '')
                            .replace('small', 'large');
                        data.images.gallery.push(highRes);
                    }
                });
                
                // Sizes
                data.sizes = [];
                document.querySelectorAll('.product-options__size option, [data-option-size] option').forEach(option => {
                    if (option.value && !option.textContent.includes('Select')) {
                        data.sizes.push({
                            value: option.value,
                            text: option.textContent.trim(),
                            available: !option.disabled
                        });
                    }
                });
                
                // Colors
                data.colors = [];
                document.querySelectorAll('.product-options__color option, [data-option-color] option').forEach(option => {
                    if (option.value && !option.textContent.includes('Select')) {
                        data.colors.push({
                            value: option.value,
                            text: option.textContent.trim(),
                            available: !option.disabled
                        });
                    }
                });
                
                // Extract JSON-LD structured data
                const jsonLdScript = document.querySelector('script[type="application/ld+json"]');
                if (jsonLdScript) {
                    try {
                        data.json_ld = JSON.parse(jsonLdScript.textContent);
                    } catch (e) {
                        console.error('Failed to parse JSON-LD');
                    }
                }
                
                // Meta tags
                data.meta = {
                    title: document.querySelector('meta[property="og:title"]')?.content,
                    description: document.querySelector('meta[name="description"]')?.content,
                    keywords: document.querySelector('meta[name="keywords"]')?.content?.split(',').map(k => k.trim())
                };
                
                return data;
            });
            
            // Merge with schema
            const product = this.mergeWithSchema(productData);
            product.url = productUrl;
            product.scraped_at = new Date().toISOString();
            product.id = this.generateProductId(product);
            
            await page.close();
            return product;
            
        } catch (error) {
            if (page) await page.close();
            
            if (retryCount < this.config.maxRetries) {
                const delay = Math.min(
                    this.config.delays.onError * Math.pow(this.config.retryBackoff, retryCount),
                    this.config.delays.maxRetryDelay
                );
                
                this.log('warn', `Retrying product scrape after ${delay}ms`, {
                    url: productUrl,
                    attempt: retryCount + 1,
                    error: error.message
                });
                
                await this.delay(delay);
                return this.scrapeProductDetails(productUrl, retryCount + 1);
            }
            
            throw error;
        }
    }

    mergeWithSchema(data) {
        const product = JSON.parse(JSON.stringify(PRODUCT_SCHEMA));
        
        // Merge data with schema
        Object.keys(data).forEach(key => {
            if (product.hasOwnProperty(key)) {
                if (typeof product[key] === 'object' && !Array.isArray(product[key]) && product[key] !== null) {
                    product[key] = { ...product[key], ...(data[key] || {}) };
                } else {
                    product[key] = data[key];
                }
            }
        });
        
        return product;
    }

    generateProductId(product) {
        const str = `${product.brand}-${product.name}-${product.sku}`.toLowerCase();
        return crypto.createHash('md5').update(str).digest('hex').substring(0, 12);
    }

    async downloadProductImages(product) {
        if (!product.images.gallery || product.images.gallery.length === 0) {
            return;
        }
        
        const category = product.category.replace('motorcycle-', '');
        const brandFolder = product.brand.toLowerCase().replace(/[^a-z0-9]/g, '_');
        const productFolder = `${product.id}_${product.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
        
        const imageDir = path.join(this.config.imagesDir, category, brandFolder, productFolder);
        await fs.mkdir(imageDir, { recursive: true });
        
        product.images.local_paths = [];
        
        // Download images with concurrency control
        const downloadQueue = [...product.images.gallery];
        const downloading = [];
        
        while (downloadQueue.length > 0 || downloading.length > 0) {
            // Start new downloads if under limit
            while (downloading.length < this.config.maxConcurrentDownloads && downloadQueue.length > 0) {
                const imageUrl = downloadQueue.shift();
                const imageIndex = product.images.gallery.indexOf(imageUrl);
                const extension = path.extname(new URL(imageUrl).pathname) || '.jpg';
                const filename = `${product.id}_${imageIndex}${extension}`;
                const filepath = path.join(imageDir, filename);
                
                const downloadPromise = this.downloadImage(imageUrl, filepath)
                    .then(localPath => {
                        if (localPath) {
                            product.images.local_paths.push(localPath);
                        }
                    })
                    .catch(error => {
                        this.log('error', 'Image download failed', {
                            url: imageUrl,
                            error: error.message
                        });
                    });
                
                downloading.push(downloadPromise);
            }
            
            // Wait for at least one to complete
            if (downloading.length > 0) {
                await Promise.race(downloading);
                downloading.splice(0, downloading.filter(p => p.isPending === false).length);
            }
        }
    }

    async downloadImage(url, filepath) {
        try {
            const response = await axios.get(url, {
                responseType: 'arraybuffer',
                timeout: 30000,
                headers: {
                    'User-Agent': this.getRandomUserAgent()
                }
            });
            
            await fs.writeFile(filepath, response.data);
            return filepath;
            
        } catch (error) {
            throw new Error(`Failed to download image: ${error.message}`);
        }
    }

    async scrapeCategory(category, options = {}) {
        const {
            maxPages = Infinity,
            downloadImages = true,
            startPage = 1
        } = options;
        
        this.state.currentCategory = category;
        const products = [];
        let currentPage = startPage;
        let hasNextPage = true;
        
        this.log('info', `Starting category scrape: ${category}`);
        
        while (hasNextPage && currentPage <= maxPages && !this.shouldStop) {
            try {
                // Update state
                this.state.currentPage = currentPage;
                await this.saveState();
                
                // Scrape listing page
                const { products: pageProducts, hasNextPage: hasNext } = 
                    await this.scrapeProductListing(category, currentPage);
                
                hasNextPage = hasNext;
                
                this.log('info', `Found ${pageProducts.length} products on page ${currentPage}`);
                
                // Process products in batches
                for (let i = 0; i < pageProducts.length; i += this.config.batchSize) {
                    if (this.shouldStop) break;
                    
                    const batch = pageProducts.slice(i, i + this.config.batchSize);
                    const batchProducts = [];
                    
                    for (const productInfo of batch) {
                        if (this.shouldStop) break;
                        
                        try {
                            // Scrape product details
                            const product = await this.scrapeProductDetails(productInfo.url);
                            product.category = category;
                            
                            // Download images if requested
                            if (downloadImages) {
                                await this.downloadProductImages(product);
                            }
                            
                            product.scrape_status = 'completed';
                            batchProducts.push(product);
                            
                            this.state.scrapedProducts++;
                            this.emit('product', product);
                            
                            // Delay between products
                            await this.delay(this.config.delays.betweenProducts);
                            
                        } catch (error) {
                            this.log('error', 'Failed to scrape product', {
                                url: productInfo.url,
                                error: error.message
                            });
                            
                            const failedProduct = {
                                ...productInfo,
                                scrape_status: 'failed',
                                last_error: error.message,
                                error_count: 1
                            };
                            
                            batchProducts.push(failedProduct);
                            this.state.failedProducts++;
                        }
                    }
                    
                    // Save batch
                    await this.saveBatch(category, currentPage, batchProducts);
                    products.push(...batchProducts);
                }
                
                currentPage++;
                
                // Delay between pages
                await this.delay(this.config.delays.betweenPages);
                
            } catch (error) {
                this.log('error', `Failed to scrape page ${currentPage}`, {
                    category,
                    error: error.message
                });
                
                // Continue to next page
                currentPage++;
            }
        }
        
        this.log('info', `Completed category: ${category}`, {
            totalProducts: products.length,
            successful: products.filter(p => p.scrape_status === 'completed').length,
            failed: products.filter(p => p.scrape_status === 'failed').length
        });
        
        return products;
    }

    async saveBatch(category, page, products) {
        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `${category}_page${page}_${timestamp}.json`;
        const filepath = path.join(this.config.outputDir, filename);
        
        await fs.writeFile(filepath, JSON.stringify(products, null, 2));
        
        this.log('info', `Saved batch: ${filename}`, {
            products: products.length
        });
    }

    async saveState() {
        const state = {
            ...this.state,
            lastUpdated: new Date().toISOString()
        };
        
        await fs.writeFile(this.config.stateFile, JSON.stringify(state, null, 2));
    }

    async loadState() {
        try {
            const data = await fs.readFile(this.config.stateFile, 'utf-8');
            const savedState = JSON.parse(data);
            
            // Merge with current state
            this.state = { ...this.state, ...savedState };
            
            this.log('info', 'Loaded previous state', {
                scrapedProducts: this.state.scrapedProducts,
                failedProducts: this.state.failedProducts
            });
            
        } catch (error) {
            this.log('info', 'No previous state found, starting fresh');
        }
    }

    async scrapeAll(options = {}) {
        const {
            categories = null,
            maxPagesPerCategory = Infinity,
            downloadImages = true,
            resumeFrom = null
        } = options;
        
        this.isRunning = true;
        this.shouldStop = false;
        
        try {
            // Discover or use provided categories
            const allCategories = categories || await this.discoverCategories();
            const categoryList = Object.keys(allCategories);
            
            // Resume from specific category if provided
            let startIndex = 0;
            if (resumeFrom) {
                startIndex = categoryList.indexOf(resumeFrom);
                if (startIndex === -1) startIndex = 0;
            }
            
            // Process each category
            for (let i = startIndex; i < categoryList.length; i++) {
                if (this.shouldStop) break;
                
                const category = categoryList[i];
                const categoryInfo = allCategories[category];
                
                await this.scrapeCategory(category, {
                    maxPages: maxPagesPerCategory,
                    downloadImages
                });
                
                // Process subcategories if any
                if (categoryInfo.subcategories && categoryInfo.subcategories.length > 0) {
                    for (const subcat of categoryInfo.subcategories) {
                        if (this.shouldStop) break;
                        
                        await this.scrapeCategory(subcat.slug, {
                            maxPages: maxPagesPerCategory,
                            downloadImages
                        });
                    }
                }
                
                // Delay between categories
                await this.delay(this.config.delays.betweenCategories);
            }
            
            // Generate final report
            await this.generateReport();
            
        } catch (error) {
            this.log('error', 'Scraping failed', { error: error.message });
            throw error;
        } finally {
            this.isRunning = false;
            await this.cleanup();
        }
    }

    async generateReport() {
        const duration = Date.now() - new Date(this.state.startTime).getTime();
        const report = {
            summary: {
                totalProducts: this.state.scrapedProducts + this.state.failedProducts,
                successful: this.state.scrapedProducts,
                failed: this.state.failedProducts,
                duration: duration,
                averageTimePerProduct: duration / (this.state.scrapedProducts || 1)
            },
            categories: this.state.categories,
            timestamp: new Date().toISOString()
        };
        
        const reportPath = path.join(
            this.config.outputDir,
            `scraper_report_${new Date().toISOString().split('T')[0]}.json`
        );
        
        await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
        
        this.log('info', 'Generated final report', report.summary);
    }

    async validateData() {
        this.log('info', 'Validating scraped data...');
        
        const files = await fs.readdir(this.config.outputDir);
        const jsonFiles = files.filter(f => f.endsWith('.json') && !f.includes('report'));
        
        let totalProducts = 0;
        let validProducts = 0;
        const issues = [];
        
        for (const file of jsonFiles) {
            const data = JSON.parse(await fs.readFile(path.join(this.config.outputDir, file), 'utf-8'));
            
            if (Array.isArray(data)) {
                for (const product of data) {
                    totalProducts++;
                    
                    const productIssues = [];
                    
                    // Validate required fields
                    if (!product.name) productIssues.push('Missing name');
                    if (!product.brand) productIssues.push('Missing brand');
                    if (!product.url) productIssues.push('Missing URL');
                    if (!product.price || !product.price.regular) productIssues.push('Missing price');
                    
                    if (productIssues.length === 0) {
                        validProducts++;
                    } else {
                        issues.push({
                            product: product.name || 'Unknown',
                            url: product.url,
                            issues: productIssues
                        });
                    }
                }
            }
        }
        
        const validationReport = {
            totalProducts,
            validProducts,
            invalidProducts: totalProducts - validProducts,
            validationRate: totalProducts > 0 ? (validProducts / totalProducts * 100).toFixed(2) + '%' : '0%',
            issues: issues.slice(0, 100) // First 100 issues
        };
        
        await fs.writeFile(
            path.join(this.config.outputDir, 'validation_report.json'),
            JSON.stringify(validationReport, null, 2)
        );
        
        this.log('info', 'Validation complete', {
            valid: validProducts,
            invalid: totalProducts - validProducts
        });
        
        return validationReport;
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async cleanup() {
        if (this.browser) {
            try {
                await this.browser.close();
            } catch (error) {
                this.log('warn', 'Error closing browser', { error: error.message });
            }
        }
        
        if (this.logStream && this.logStream.close) {
            try {
                await this.logStream.close();
            } catch (error) {
                // Ignore close errors
            }
        }
        
        await this.saveState();
    }

    stop() {
        this.log('info', 'Stopping scraper...');
        this.shouldStop = true;
    }
}

// Export for use in other modules
export default RevZillaScraperV2;

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
    const scraper = new RevZillaScraperV2();
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
        console.log('\nReceived SIGINT, shutting down gracefully...');
        scraper.stop();
        await new Promise(resolve => setTimeout(resolve, 5000));
        process.exit(0);
    });
    
    // Run scraper
    (async () => {
        try {
            await scraper.init();
            
            // Parse command line arguments
            const args = process.argv.slice(2);
            const options = {
                categories: null,
                maxPagesPerCategory: Infinity,
                downloadImages: true
            };
            
            // Parse arguments
            for (let i = 0; i < args.length; i++) {
                switch (args[i]) {
                    case '--category':
                        options.categories = { [args[++i]]: { name: args[i] } };
                        break;
                    case '--max-pages':
                        options.maxPagesPerCategory = parseInt(args[++i]);
                        break;
                    case '--no-images':
                        options.downloadImages = false;
                        break;
                    case '--resume':
                        options.resumeFrom = args[++i];
                        break;
                }
            }
            
            await scraper.scrapeAll(options);
            await scraper.validateData();
            
        } catch (error) {
            console.error('Fatal error:', error);
            process.exit(1);
        }
    })();
}