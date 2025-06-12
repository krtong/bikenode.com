import puppeteer from 'puppeteer';
import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { EventEmitter } from 'events';
import MockDataGenerator from './mock_data_generator.js';
import DataDeduplicator from './deduplicator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Enhanced configuration with better defaults
const CONFIG = {
    baseUrl: 'https://www.revzilla.com',
    outputDir: path.join(__dirname, 'data'),
    imagesDir: path.join(__dirname, 'data', 'images'),
    logsDir: path.join(__dirname, 'logs'),
    stateFile: path.join(__dirname, 'data', 'scraper_state.json'),
    
    // Enhanced rate limiting to prevent socket hang ups
    delays: {
        betweenPages: 5000,      // Increased from 2000
        betweenProducts: 4000,   // Increased from 3000
        betweenCategories: 8000, // Increased from 5000
        onError: 15000,         // Increased from 10000
        maxRetryDelay: 90000,   // Increased from 60000
        browserRestart: 30000   // New: delay before restarting browser
    },
    
    // Enhanced retry settings
    maxRetries: 5,              // Increased from 3
    retryBackoff: 1.5,         // Reduced from 2 for more gradual backoff
    
    // Connection settings
    connectionTimeout: 60000,   // Increased timeout
    navigationTimeout: 45000,   // Specific navigation timeout
    
    // Batch settings
    batchSize: 25,             // Reduced from 50
    maxConcurrentDownloads: 3, // Reduced from 5
    
    // Browser settings
    browserRestartAfter: 50,   // Restart browser after N products
    maxMemoryUsage: 500 * 1024 * 1024, // 500MB
    
    // Anti-detection measures
    userAgents: [
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15'
    ],
    
    // Proxy settings
    useProxy: false,
    proxyList: [],
    
    // Mock mode for testing
    useMockData: false
};

// Enhanced product schema with validation
const PRODUCT_SCHEMA = {
    // Basic info
    id: null,
    url: null,
    scraped_at: null,
    
    // Product details
    name: null,
    brand: null,
    sku: null,
    mpn: null,
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

class RevZillaScraperV3 extends EventEmitter {
    constructor(options = {}) {
        super();
        this.config = { ...CONFIG, ...options };
        this.browser = null;
        this.browserLaunchCount = 0;
        this.productsSinceRestart = 0;
        this.state = {
            totalProducts: 0,
            scrapedProducts: 0,
            failedProducts: 0,
            categories: {},
            startTime: new Date(),
            currentCategory: null,
            currentPage: 1,
            errors: []
        };
        this.isRunning = false;
        this.shouldStop = false;
        this.logStream = null;
        this.mockGenerator = null;
    }

    async init() {
        // Create directories
        await this.createDirectories();
        
        // Load previous state if exists
        await this.loadState();
        
        // Setup logging
        await this.setupLogging();
        
        // Initialize mock generator if in mock mode
        if (this.config.useMockData) {
            this.mockGenerator = new MockDataGenerator();
            this.mockGenerator.outputDir = this.config.outputDir;
            await this.mockGenerator.init();
        }
        
        this.log('info', 'Scraper v3 initialized with enhanced error handling');
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
            `scraper_v3_${new Date().toISOString().split('T')[0]}.log`
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
        
        // Track errors
        if (level === 'error') {
            this.state.errors.push({
                timestamp,
                message,
                ...data
            });
        }
        
        this.emit('log', logEntry);
    }

    async initBrowser(retryCount = 0) {
        if (this.browser) return;
        
        const args = [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
            '--disable-blink-features=AutomationControlled',
            '--disable-features=IsolateOrigins,site-per-process',
            '--disable-web-security',
            '--disable-site-isolation-trials'
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
                },
                handleSIGINT: false,
                handleSIGTERM: false,
                handleSIGHUP: false,
                protocolTimeout: this.config.connectionTimeout
            });
            
            this.browserLaunchCount++;
            this.productsSinceRestart = 0;
            
            // Set up browser event handlers
            this.browser.on('disconnected', () => {
                this.log('warn', 'Browser disconnected');
                this.browser = null;
            });
            
            this.log('info', 'Browser launched successfully', { 
                launchCount: this.browserLaunchCount 
            });
            
        } catch (error) {
            this.log('error', 'Failed to launch browser', { 
                error: error.message,
                retryCount 
            });
            
            if (retryCount < 3) {
                await this.delay(this.config.delays.browserRestart);
                return this.initBrowser(retryCount + 1);
            }
            
            throw error;
        }
    }

    async restartBrowser() {
        this.log('info', 'Restarting browser to prevent memory issues');
        
        if (this.browser) {
            try {
                await this.browser.close();
            } catch (error) {
                this.log('warn', 'Error closing browser', { error: error.message });
            }
            this.browser = null;
        }
        
        await this.delay(this.config.delays.browserRestart);
        await this.initBrowser();
    }

    async createPage() {
        if (!this.browser) {
            await this.initBrowser();
        }
        
        // Check if browser needs restart
        if (this.productsSinceRestart >= this.config.browserRestartAfter) {
            await this.restartBrowser();
        }
        
        try {
            const page = await this.browser.newPage();
            
            // Set timeout
            page.setDefaultTimeout(this.config.navigationTimeout);
            page.setDefaultNavigationTimeout(this.config.navigationTimeout);
            
            // Set random user agent
            await page.setUserAgent(this.getRandomUserAgent());
            
            // Enhanced stealth settings
            await page.evaluateOnNewDocument(() => {
                // Override webdriver property
                Object.defineProperty(navigator, 'webdriver', {
                    get: () => false,
                });
                
                // Override chrome property
                window.chrome = {
                    runtime: {},
                    loadTimes: function() {},
                    csi: function() {},
                    app: {}
                };
                
                // Override permissions
                const originalQuery = window.navigator.permissions.query;
                window.navigator.permissions.query = (parameters) => (
                    parameters.name === 'notifications' ?
                        Promise.resolve({ state: Notification.permission }) :
                        originalQuery(parameters)
                );
                
                // Override plugins
                Object.defineProperty(navigator, 'plugins', {
                    get: () => [1, 2, 3, 4, 5],
                });
                
                // Override languages
                Object.defineProperty(navigator, 'languages', {
                    get: () => ['en-US', 'en'],
                });
            });
            
            // Set viewport
            await page.setViewport({
                width: 1920 + Math.floor(Math.random() * 100),
                height: 1080 + Math.floor(Math.random() * 100)
            });
            
            // Intercept requests for efficiency
            await page.setRequestInterception(true);
            page.on('request', (req) => {
                const resourceType = req.resourceType();
                const url = req.url();
                
                // Block unnecessary resources
                if (['font', 'stylesheet', 'media'].includes(resourceType)) {
                    req.abort();
                } else if (url.includes('google-analytics') || url.includes('doubleclick')) {
                    req.abort();
                } else {
                    req.continue();
                }
            });
            
            // Handle page errors
            page.on('error', error => {
                this.log('error', 'Page crashed', { error: error.message });
            });
            
            page.on('pageerror', error => {
                this.log('warn', 'Page error', { error: error.message });
            });
            
            return page;
            
        } catch (error) {
            this.log('error', 'Failed to create page', { error: error.message });
            
            // Try restarting browser
            await this.restartBrowser();
            throw error;
        }
    }

    getRandomUserAgent() {
        return this.config.userAgents[Math.floor(Math.random() * this.config.userAgents.length)];
    }

    getRandomProxy() {
        return this.config.proxyList[Math.floor(Math.random() * this.config.proxyList.length)];
    }

    async discoverCategories() {
        if (this.config.useMockData) {
            return {
                'motorcycle-helmets': { name: 'Helmets', subcategories: [] },
                'motorcycle-jackets': { name: 'Jackets', subcategories: [] },
                'motorcycle-gloves': { name: 'Gloves', subcategories: [] },
                'motorcycle-boots': { name: 'Boots', subcategories: [] },
                'motorcycle-pants': { name: 'Pants', subcategories: [] },
                'motorcycle-accessories': { name: 'Accessories', subcategories: [] }
            };
        }
        
        this.log('info', 'Discovering categories...');
        
        let page;
        let retryCount = 0;
        
        while (retryCount < this.config.maxRetries) {
            try {
                await this.initBrowser();
                page = await this.createPage();
                
                await page.goto(this.config.baseUrl, { 
                    waitUntil: 'domcontentloaded',
                    timeout: this.config.navigationTimeout
                });
                
                // Wait a bit for dynamic content
                await this.delay(2000);
                
                const categories = await page.evaluate(() => {
                    const cats = {};
                    
                    // Multiple selectors for different page structures
                    const selectors = [
                        '.main-nav__item a',
                        '.navigation-menu__item a',
                        '[data-category] a',
                        '.category-link',
                        'nav a[href*="/motorcycle-"]'
                    ];
                    
                    for (const selector of selectors) {
                        const links = document.querySelectorAll(selector);
                        links.forEach(link => {
                            if (link.href && link.href.includes('/motorcycle-')) {
                                const url = link.href;
                                const text = link.textContent.trim();
                                const match = url.match(/\/motorcycle-([^\/\?]+)/);
                                
                                if (match) {
                                    const category = match[1];
                                    if (!cats[`motorcycle-${category}`]) {
                                        cats[`motorcycle-${category}`] = {
                                            name: text,
                                            url: url,
                                            subcategories: []
                                        };
                                    }
                                }
                            }
                        });
                    }
                    
                    return cats;
                });
                
                await page.close();
                
                // Add default categories if discovery fails
                const defaultCategories = {
                    'motorcycle-helmets': { name: 'Helmets', subcategories: [] },
                    'motorcycle-jackets': { name: 'Jackets', subcategories: [] },
                    'motorcycle-gloves': { name: 'Gloves', subcategories: [] },
                    'motorcycle-boots': { name: 'Boots', subcategories: [] },
                    'motorcycle-pants': { name: 'Pants', subcategories: [] },
                    'motorcycle-accessories': { name: 'Accessories', subcategories: [] }
                };
                
                const finalCategories = Object.keys(categories).length > 0 ? 
                    { ...defaultCategories, ...categories } : 
                    defaultCategories;
                
                this.log('info', `Discovered ${Object.keys(finalCategories).length} categories`);
                
                return finalCategories;
                
            } catch (error) {
                retryCount++;
                this.log('error', 'Category discovery failed', { 
                    error: error.message,
                    attempt: retryCount 
                });
                
                if (page) {
                    try {
                        await page.close();
                    } catch (e) {}
                }
                
                if (retryCount < this.config.maxRetries) {
                    const delay = this.config.delays.onError * Math.pow(this.config.retryBackoff, retryCount - 1);
                    await this.delay(delay);
                } else {
                    // Return default categories on final failure
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
        }
    }

    async scrapeProductListing(category, pageNum = 1) {
        if (this.config.useMockData) {
            // Generate mock listing data
            const mockProducts = [];
            const productsPerPage = 48;
            const hasNextPage = pageNum < 3; // Simulate 3 pages
            
            for (let i = 0; i < productsPerPage; i++) {
                const productId = crypto.randomBytes(6).toString('hex');
                mockProducts.push({
                    url: `${this.config.baseUrl}/${category}/${productId}`,
                    name: `Mock Product ${i + 1}`,
                    brand: 'Mock Brand',
                    price: '$299.99',
                    imageUrl: null
                });
            }
            
            return { products: mockProducts, hasNextPage };
        }
        
        let page;
        let retryCount = 0;
        
        while (retryCount < this.config.maxRetries) {
            try {
                await this.initBrowser();
                page = await this.createPage();
                
                const url = `${this.config.baseUrl}/${category}?page=${pageNum}&limit=96`;
                this.log('info', `Scraping listing page: ${url}`);
                
                const response = await page.goto(url, { 
                    waitUntil: 'domcontentloaded',
                    timeout: this.config.navigationTimeout
                });
                
                // Check response status
                if (response && response.status() !== 200) {
                    throw new Error(`HTTP ${response.status()}`);
                }
                
                // Wait for products to load
                await page.waitForSelector(
                    '.product-index-item, .product-tile, [data-product-tile], .product-card',
                    { timeout: 10000 }
                ).catch(() => {
                    this.log('warn', 'Product selector timeout, continuing anyway');
                });
                
                // Extract product URLs and basic info
                const pageData = await page.evaluate(() => {
                    const items = [];
                    const productSelectors = [
                        '.product-index-item',
                        '.product-tile',
                        '[data-product-tile]',
                        '.product-card',
                        '.product-listing-item'
                    ];
                    
                    let productElements = [];
                    for (const selector of productSelectors) {
                        const elements = document.querySelectorAll(selector);
                        if (elements.length > 0) {
                            productElements = Array.from(elements);
                            break;
                        }
                    }
                    
                    productElements.forEach(element => {
                        try {
                            const linkEl = element.querySelector('a[href*="/motorcycle"], a.product-link');
                            const nameEl = element.querySelector('.product-item__title, .product-tile__title, [data-product-title], .product-name');
                            const brandEl = element.querySelector('.product-item__brand, .product-tile__brand, [data-product-brand], .product-brand');
                            const priceEl = element.querySelector('[data-product-price], .product-price, .price');
                            const imageEl = element.querySelector('img[src*="revzilla"], img[data-src*="revzilla"], img.product-image');
                            
                            if (linkEl && (nameEl || linkEl.textContent)) {
                                items.push({
                                    url: linkEl.href,
                                    name: nameEl ? nameEl.textContent.trim() : linkEl.textContent.trim(),
                                    brand: brandEl ? brandEl.textContent.trim() : '',
                                    price: priceEl ? priceEl.textContent.trim() : '',
                                    imageUrl: imageEl ? (imageEl.src || imageEl.dataset.src) : null
                                });
                            }
                        } catch (e) {
                            console.error('Error parsing product element:', e);
                        }
                    });
                    
                    // Check for next page
                    const nextPageExists = !!document.querySelector(
                        '.pagination__next:not(.disabled), ' +
                        'a[rel="next"]:not(.disabled), ' +
                        '.next-page:not(.disabled), ' +
                        '.pagination a[aria-label="Next"]'
                    );
                    
                    return {
                        products: items,
                        hasNextPage: nextPageExists
                    };
                });
                
                await page.close();
                
                this.log('info', `Found ${pageData.products.length} products on page ${pageNum}`);
                
                return pageData;
                
            } catch (error) {
                retryCount++;
                this.log('error', 'Failed to scrape listing', { 
                    category, 
                    pageNum, 
                    error: error.message,
                    attempt: retryCount
                });
                
                if (page) {
                    try {
                        await page.close();
                    } catch (e) {}
                }
                
                if (retryCount < this.config.maxRetries) {
                    const delay = this.config.delays.onError * Math.pow(this.config.retryBackoff, retryCount - 1);
                    await this.delay(delay);
                } else {
                    return { products: [], hasNextPage: false };
                }
            }
        }
        
        return { products: [], hasNextPage: false };
    }

    async scrapeProductDetails(productUrl, retryCount = 0) {
        if (this.config.useMockData) {
            // Generate mock product
            const category = productUrl.match(/motorcycle-([^\/]+)/)?.[1] || 'accessories';
            const mockProduct = this.mockGenerator.generateProduct(category);
            mockProduct.url = productUrl;
            return mockProduct;
        }
        
        let page;
        
        try {
            await this.initBrowser();
            page = await this.createPage();
            
            this.log('info', `Scraping product: ${productUrl}`);
            
            const response = await page.goto(productUrl, { 
                waitUntil: 'domcontentloaded',
                timeout: this.config.navigationTimeout
            });
            
            // Check response status
            if (response && response.status() !== 200) {
                throw new Error(`HTTP ${response.status()}`);
            }
            
            // Wait for main content with fallback
            try {
                await page.waitForSelector(
                    '.product-show, .product-detail, [data-product-detail], #product-main',
                    { timeout: 10000 }
                );
            } catch (e) {
                this.log('warn', 'Product detail selector timeout, trying alternate selectors');
            }
            
            // Extract all product data
            const productData = await page.evaluate(() => {
                const data = {};
                
                // Helper function to safely query selector
                const safeQuery = (selector) => {
                    try {
                        return document.querySelector(selector);
                    } catch (e) {
                        return null;
                    }
                };
                
                // Basic info with multiple fallbacks
                data.name = safeQuery('h1.product-title, h1[itemprop="name"], h1.product-name, .product-detail__title')?.textContent.trim();
                data.brand = safeQuery('.product-brand a, [itemprop="brand"], .brand-name, .product-detail__brand')?.textContent.trim();
                data.sku = safeQuery('.product-sku, [data-sku], .sku-number')?.textContent.replace(/SKU:?\s*/i, '').trim();
                
                // Pricing with error handling
                try {
                    const priceEl = safeQuery('.product-price__retail, [data-price], .regular-price');
                    const salePriceEl = safeQuery('.product-price__sale, [data-sale-price], .sale-price');
                    data.price = {
                        regular: priceEl ? parseFloat(priceEl.textContent.replace(/[^0-9.]/g, '')) : null,
                        sale: salePriceEl ? parseFloat(salePriceEl.textContent.replace(/[^0-9.]/g, '')) : null,
                        currency: 'USD'
                    };
                } catch (e) {
                    data.price = { regular: null, sale: null, currency: 'USD' };
                }
                
                // Stock status
                const stockEl = safeQuery('.product-stock, [data-in-stock], .availability');
                data.price.in_stock = stockEl ? !stockEl.textContent.toLowerCase().includes('out of stock') : true;
                
                // Rating with safe parsing
                try {
                    const ratingEl = safeQuery('.star-rating, [data-rating], .rating');
                    const reviewCountEl = safeQuery('.product-rating__count, [data-review-count], .review-count');
                    data.rating = {
                        average: ratingEl ? parseFloat(ratingEl.getAttribute('data-rating') || ratingEl.textContent.match(/[\d.]+/)?.[0] || '0') : null,
                        count: reviewCountEl ? parseInt(reviewCountEl.textContent.match(/\d+/)?.[0] || '0') : 0
                    };
                } catch (e) {
                    data.rating = { average: null, count: 0 };
                }
                
                // Description
                data.description = safeQuery('.product-description__content, [data-product-description], .product-info__description, .description')?.textContent.trim();
                
                // Features
                data.features = [];
                try {
                    document.querySelectorAll('.product-features li, .feature-list li, .features li').forEach(li => {
                        const text = li.textContent.trim();
                        if (text && text.length > 0) data.features.push(text);
                    });
                } catch (e) {}
                
                // Specifications
                data.specifications = {};
                try {
                    document.querySelectorAll('.product-specs tr, .specs-table tr, .specifications tr').forEach(row => {
                        const cells = row.querySelectorAll('td');
                        if (cells.length >= 2) {
                            const label = cells[0].textContent.trim();
                            const value = cells[1].textContent.trim();
                            if (label && value) {
                                data.specifications[label] = value;
                            }
                        }
                    });
                } catch (e) {}
                
                // Images
                data.images = {
                    main: null,
                    gallery: []
                };
                
                try {
                    // Main image
                    const mainImg = safeQuery('.product-images__main img, .main-image img, .product-image-main');
                    if (mainImg) {
                        data.images.main = mainImg.src || mainImg.dataset.src || mainImg.dataset.zoom;
                    }
                    
                    // Gallery images
                    const imageSelectors = [
                        '.product-images__thumb img',
                        '.product-gallery img',
                        '[data-gallery-image]',
                        '.thumbnail-image',
                        '.product-thumbnails img'
                    ];
                    
                    const seenUrls = new Set();
                    
                    for (const selector of imageSelectors) {
                        document.querySelectorAll(selector).forEach(img => {
                            const src = img.src || img.dataset.src || img.dataset.zoom || img.dataset.fullsize;
                            if (src && !src.includes('placeholder') && !seenUrls.has(src)) {
                                // Try to get high-res version
                                const highRes = src.replace('/thumb/', '/large/')
                                    .replace('_thumb', '')
                                    .replace('small', 'large')
                                    .replace('thumbnail', 'large');
                                data.images.gallery.push(highRes);
                                seenUrls.add(src);
                            }
                        });
                    }
                } catch (e) {}
                
                // Sizes
                data.sizes = [];
                try {
                    document.querySelectorAll('.product-options__size option, [data-option-size] option, select[name*="size"] option').forEach(option => {
                        if (option.value && !option.textContent.toLowerCase().includes('select')) {
                            data.sizes.push({
                                value: option.value,
                                text: option.textContent.trim(),
                                available: !option.disabled
                            });
                        }
                    });
                } catch (e) {}
                
                // Colors
                data.colors = [];
                try {
                    document.querySelectorAll('.product-options__color option, [data-option-color] option, select[name*="color"] option').forEach(option => {
                        if (option.value && !option.textContent.toLowerCase().includes('select')) {
                            data.colors.push({
                                value: option.value,
                                text: option.textContent.trim(),
                                available: !option.disabled
                            });
                        }
                    });
                } catch (e) {}
                
                // Extract JSON-LD structured data
                try {
                    const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
                    for (const script of jsonLdScripts) {
                        try {
                            const jsonData = JSON.parse(script.textContent);
                            if (jsonData['@type'] === 'Product' || jsonData.name) {
                                data.json_ld = jsonData;
                                break;
                            }
                        } catch (e) {}
                    }
                } catch (e) {}
                
                // Meta tags
                data.meta = {
                    title: safeQuery('meta[property="og:title"]')?.content || document.title,
                    description: safeQuery('meta[name="description"]')?.content,
                    keywords: safeQuery('meta[name="keywords"]')?.content?.split(',').map(k => k.trim()) || []
                };
                
                return data;
            });
            
            // Merge with schema
            const product = this.mergeWithSchema(productData);
            product.url = productUrl;
            product.scraped_at = new Date().toISOString();
            product.id = this.generateProductId(product);
            product.category = productUrl.match(/motorcycle-([^\/]+)/)?.[1] || 'unknown';
            
            await page.close();
            
            this.productsSinceRestart++;
            
            return product;
            
        } catch (error) {
            if (page) {
                try {
                    await page.close();
                } catch (e) {}
            }
            
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
        
        // Deep merge function
        const deepMerge = (target, source) => {
            for (const key in source) {
                if (source[key] !== null && source[key] !== undefined) {
                    if (typeof source[key] === 'object' && !Array.isArray(source[key])) {
                        if (!target[key]) target[key] = {};
                        deepMerge(target[key], source[key]);
                    } else {
                        target[key] = source[key];
                    }
                }
            }
            return target;
        };
        
        return deepMerge(product, data);
    }

    generateProductId(product) {
        const str = `${product.brand || 'unknown'}-${product.name || 'unknown'}-${product.sku || Date.now()}`.toLowerCase();
        return crypto.createHash('md5').update(str).digest('hex').substring(0, 12);
    }

    async downloadProductImages(product) {
        if (!product.images.gallery || product.images.gallery.length === 0) {
            return;
        }
        
        const category = product.category.replace('motorcycle-', '');
        const brandFolder = (product.brand || 'unknown').toLowerCase().replace(/[^a-z0-9]/g, '_');
        const productFolder = `${product.id}_${(product.name || 'product').toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
        
        const imageDir = path.join(this.config.imagesDir, category, brandFolder, productFolder);
        await fs.mkdir(imageDir, { recursive: true });
        
        product.images.local_paths = [];
        
        // Download images with concurrency control
        const downloadQueue = [...product.images.gallery];
        const downloading = [];
        let successCount = 0;
        
        while (downloadQueue.length > 0 || downloading.length > 0) {
            // Start new downloads if under limit
            while (downloading.length < this.config.maxConcurrentDownloads && downloadQueue.length > 0) {
                const imageUrl = downloadQueue.shift();
                const imageIndex = product.images.gallery.indexOf(imageUrl);
                
                let extension = '.jpg';
                try {
                    const url = new URL(imageUrl);
                    extension = path.extname(url.pathname) || '.jpg';
                } catch (e) {}
                
                const filename = `${product.id}_${imageIndex}${extension}`;
                const filepath = path.join(imageDir, filename);
                
                const downloadPromise = this.downloadImage(imageUrl, filepath)
                    .then(localPath => {
                        if (localPath) {
                            product.images.local_paths.push(localPath);
                            successCount++;
                        }
                        const index = downloading.indexOf(downloadPromise);
                        if (index > -1) downloading.splice(index, 1);
                    })
                    .catch(error => {
                        this.log('error', 'Image download failed', {
                            url: imageUrl,
                            error: error.message
                        });
                        const index = downloading.indexOf(downloadPromise);
                        if (index > -1) downloading.splice(index, 1);
                    });
                
                downloading.push(downloadPromise);
            }
            
            // Wait for at least one to complete
            if (downloading.length > 0) {
                await Promise.race(downloading);
            }
        }
        
        this.log('info', `Downloaded ${successCount}/${product.images.gallery.length} images for product ${product.id}`);
    }

    async downloadImage(url, filepath, retryCount = 0) {
        try {
            const response = await axios.get(url, {
                responseType: 'arraybuffer',
                timeout: 30000,
                headers: {
                    'User-Agent': this.getRandomUserAgent(),
                    'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Accept-Language': 'en-US,en;q=0.9'
                },
                maxRedirects: 5
            });
            
            await fs.writeFile(filepath, response.data);
            return filepath;
            
        } catch (error) {
            if (retryCount < 2) {
                await this.delay(2000);
                return this.downloadImage(url, filepath, retryCount + 1);
            }
            throw new Error(`Failed to download image after ${retryCount + 1} attempts: ${error.message}`);
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
        let consecutiveErrors = 0;
        
        this.log('info', `Starting category scrape: ${category}`);
        
        while (hasNextPage && currentPage <= maxPages && !this.shouldStop && consecutiveErrors < 3) {
            try {
                // Update state
                this.state.currentPage = currentPage;
                await this.saveState();
                
                // Scrape listing page
                const { products: pageProducts, hasNextPage: hasNext } = 
                    await this.scrapeProductListing(category, currentPage);
                
                hasNextPage = hasNext;
                consecutiveErrors = 0; // Reset error counter on success
                
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
                            if (downloadImages && !this.config.useMockData) {
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
                                ...this.mergeWithSchema(productInfo),
                                url: productInfo.url,
                                category: category,
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
                consecutiveErrors++;
                this.log('error', `Failed to scrape page ${currentPage}`, {
                    category,
                    error: error.message,
                    consecutiveErrors
                });
                
                if (consecutiveErrors < 3) {
                    // Longer delay on error
                    await this.delay(this.config.delays.onError);
                    
                    // Try restarting browser after errors
                    if (consecutiveErrors === 2) {
                        await this.restartBrowser();
                    }
                } else {
                    this.log('error', `Too many consecutive errors for category ${category}, moving to next`);
                    break;
                }
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
            
            // Clear error log if starting new session
            const lastUpdate = new Date(savedState.lastUpdated);
            const hoursSinceUpdate = (Date.now() - lastUpdate) / (1000 * 60 * 60);
            if (hoursSinceUpdate > 24) {
                this.state.errors = [];
            }
            
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
            
            // Run deduplication if not using mock data
            if (!this.config.useMockData) {
                await this.runDeduplication();
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

    async runDeduplication() {
        this.log('info', 'Running deduplication process...');
        
        try {
            const dedup = new DataDeduplicator(this.config.outputDir);
            const stats = await dedup.deduplicate({
                dryRun: false,
                backupOriginal: true
            });
            
            this.log('info', 'Deduplication complete', stats);
            
            return stats;
        } catch (error) {
            this.log('error', 'Deduplication failed', { error: error.message });
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
                averageTimePerProduct: duration / (this.state.scrapedProducts || 1),
                browserRestarts: this.browserLaunchCount - 1,
                errors: this.state.errors.length
            },
            categories: this.state.categories,
            topErrors: this.getTopErrors(),
            timestamp: new Date().toISOString()
        };
        
        const reportPath = path.join(
            this.config.outputDir,
            `scraper_report_v3_${new Date().toISOString().split('T')[0]}.json`
        );
        
        await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
        
        this.log('info', 'Generated final report', report.summary);
    }

    getTopErrors() {
        const errorCounts = {};
        
        this.state.errors.forEach(error => {
            const key = error.message.substring(0, 50);
            errorCounts[key] = (errorCounts[key] || 0) + 1;
        });
        
        return Object.entries(errorCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([error, count]) => ({ error, count }));
    }

    async validateData() {
        this.log('info', 'Validating scraped data...');
        
        const files = await fs.readdir(this.config.outputDir);
        const jsonFiles = files.filter(f => f.endsWith('.json') && !f.includes('report'));
        
        let totalProducts = 0;
        let validProducts = 0;
        const issues = [];
        
        for (const file of jsonFiles) {
            try {
                const data = JSON.parse(await fs.readFile(path.join(this.config.outputDir, file), 'utf-8'));
                
                if (Array.isArray(data)) {
                    for (const product of data) {
                        totalProducts++;
                        
                        const productIssues = [];
                        
                        // Validate required fields
                        if (!product.name) productIssues.push('Missing name');
                        if (!product.brand) productIssues.push('Missing brand');
                        if (!product.url) productIssues.push('Missing URL');
                        if (!product.price || (!product.price.regular && !product.price.sale)) {
                            productIssues.push('Missing price');
                        }
                        
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
            } catch (error) {
                this.log('error', `Failed to validate file: ${file}`, { error: error.message });
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
                this.log('info', 'Browser closed successfully');
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
export default RevZillaScraperV3;

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
    const scraper = new RevZillaScraperV3();
    
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
                    case '--mock':
                        scraper.config.useMockData = true;
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