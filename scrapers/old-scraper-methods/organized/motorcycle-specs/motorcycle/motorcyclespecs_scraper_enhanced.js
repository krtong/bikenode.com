const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');
const https = require('https');
const http = require('http');
const { URL } = require('url');
const crypto = require('crypto');
const cliProgress = require('cli-progress');
const pLimit = require('p-limit');
const sharp = require('sharp');

class EnhancedMotorcycleSpecsScraper {
    constructor() {
        this.baseUrl = 'https://www.motorcyclespecs.co.za';
        this.browser = null;
        this.page = null;
        this.scraped_data = {
            motorcycles: [],
            manufacturers: new Set(),
            models: new Set(),
            images: [],
            categories: new Map()
        };
        
        // Progress tracking
        this.progress = {
            totalManufacturers: 0,
            processedManufacturers: 0,
            totalModels: 0,
            processedModels: 0,
            totalImages: 0,
            downloadedImages: 0,
            failedImages: 0,
            skippedImages: 0
        };
        
        // Image deduplication
        this.imageHashes = new Map();
        
        // Connection pooling
        this.downloadLimit = pLimit(5); // Max 5 concurrent downloads
        
        // Progress bars
        this.multibar = new cliProgress.MultiBar({
            clearOnComplete: false,
            hideCursor: true,
            format: '{bar} | {percentage}% | {value}/{total} | {task}'
        }, cliProgress.Presets.shades_grey);
        
        this.manufacturerBar = null;
        this.modelBar = null;
        this.imageBar = null;
        
        // Resume capability
        this.resumeFile = './scraped_data/logs/scraper_progress.json';
        this.resumeData = null;
        
        this.setupDirectories();
    }

    async setupDirectories() {
        const dirs = [
            './scraped_data',
            './scraped_data/motorcycles',
            './scraped_data/images',
            './scraped_data/images/motorcycles',
            './scraped_data/images/thumbnails',
            './scraped_data/images/originals',
            './scraped_data/database',
            './scraped_data/logs',
            './scraped_data/cache'
        ];
        
        for (const dir of dirs) {
            try {
                await fs.mkdir(dir, { recursive: true });
            } catch (error) {
                // Directory exists, continue
            }
        }
    }

    async loadProgress() {
        try {
            const data = await fs.readFile(this.resumeFile, 'utf8');
            this.resumeData = JSON.parse(data);
            console.log('📂 Found previous scraping session, resuming...');
            return true;
        } catch (error) {
            console.log('🆕 Starting fresh scraping session');
            return false;
        }
    }

    async saveProgress() {
        const progressData = {
            timestamp: new Date().toISOString(),
            progress: this.progress,
            lastProcessed: {
                manufacturer: this.lastManufacturer,
                model: this.lastModel
            },
            scraped_data: {
                motorcycles: this.scraped_data.motorcycles.length,
                manufacturers: Array.from(this.scraped_data.manufacturers),
                models: Array.from(this.scraped_data.models),
                categories: Array.from(this.scraped_data.categories.entries())
            }
        };
        
        await fs.writeFile(this.resumeFile, JSON.stringify(progressData, null, 2));
    }

    async initBrowser() {
        console.log('🚀 Initializing browser with enhanced settings...');
        this.browser = await puppeteer.launch({
            headless: "new",
            defaultViewport: { width: 1920, height: 1080 },
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu',
                '--enable-features=NetworkService',
                '--disable-blink-features=AutomationControlled'
            ]
        });
        
        this.page = await this.browser.newPage();
        
        // Enhanced page settings
        await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        // Enable request interception for better control
        await this.page.setRequestInterception(true);
        
        this.page.on('request', (request) => {
            // Block unnecessary resources
            const resourceType = request.resourceType();
            if (['font', 'stylesheet'].includes(resourceType)) {
                request.abort();
            } else {
                request.continue();
            }
        });
        
        // Set extra headers
        await this.page.setExtraHTTPHeaders({
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br'
        });
        
        console.log('✅ Browser initialized with enhanced configuration');
    }

    detectMotorcycleCategory(data) {
        const categories = {
            'sport': ['sport', 'supersport', 'racing', 'race', 'track', 'rr', 'gp'],
            'cruiser': ['cruiser', 'chopper', 'bobber', 'custom', 'classic'],
            'touring': ['touring', 'tourer', 'grand', 'glide', 'bagger'],
            'adventure': ['adventure', 'adv', 'enduro', 'dual-sport', 'rally'],
            'naked': ['naked', 'streetfighter', 'standard', 'roadster'],
            'dirt': ['dirt', 'motocross', 'mx', 'cross', 'off-road'],
            'scooter': ['scooter', 'moped', 'step-through'],
            'electric': ['electric', 'zero', 'ev', 'e-bike']
        };
        
        const searchText = `${data.title} ${data.model} ${data.content} ${Object.values(data.specifications).join(' ')}`.toLowerCase();
        
        for (const [category, keywords] of Object.entries(categories)) {
            for (const keyword of keywords) {
                if (searchText.includes(keyword)) {
                    return category;
                }
            }
        }
        
        // Try to detect from engine size
        const engineSize = this.extractEngineSize(data);
        if (engineSize) {
            if (engineSize < 250) return 'small-displacement';
            if (engineSize > 1000) return 'large-displacement';
        }
        
        return 'standard';
    }

    extractEngineSize(data) {
        const enginePatterns = [
            /(\d+)\s*cc/i,
            /(\d+)\s*cm³/i,
            /(\d+)\s*cubic/i
        ];
        
        const searchText = JSON.stringify(data.specifications);
        
        for (const pattern of enginePatterns) {
            const match = searchText.match(pattern);
            if (match) {
                return parseInt(match[1]);
            }
        }
        
        return null;
    }

    extractYearFromModel(modelName, content) {
        // Multiple year extraction patterns
        const yearPatterns = [
            /\b(19[5-9]\d|20[0-2]\d)\b/g,
            /model\s+year[:\s]+(\d{4})/i,
            /year[:\s]+(\d{4})/i,
            /\((\d{4})\)/,
            /(\d{4})\s*-\s*(\d{4})/,
            /(\d{4})\s*model/i
        ];
        
        const years = new Set();
        
        // Search in model name
        for (const pattern of yearPatterns) {
            const matches = modelName.matchAll(pattern);
            for (const match of matches) {
                const year = parseInt(match[1]);
                if (year >= 1950 && year <= new Date().getFullYear() + 1) {
                    years.add(year);
                }
            }
        }
        
        // Search in content
        if (content) {
            for (const pattern of yearPatterns) {
                const matches = content.matchAll(pattern);
                for (const match of matches) {
                    const year = parseInt(match[1]);
                    if (year >= 1950 && year <= new Date().getFullYear() + 1) {
                        years.add(year);
                    }
                }
            }
        }
        
        return Array.from(years).sort();
    }

    async getManufacturerList() {
        console.log('🔍 Extracting manufacturer list with enhanced filtering...');
        
        await this.page.goto(`${this.baseUrl}/Manufacturer.htm`, { 
            waitUntil: 'networkidle2',
            timeout: 60000 
        });
        
        const manufacturers = await this.page.evaluate(() => {
            const manufacturerLinks = [];
            const processedUrls = new Set();
            
            const links = document.querySelectorAll('a[href*="bikes/"]');
            
            links.forEach(link => {
                const name = link.textContent.trim();
                const href = link.getAttribute('href');
                
                if (name && href && !processedUrls.has(href)) {
                    processedUrls.add(href);
                    
                    // Enhanced filtering
                    const isValid = !href.includes('javascript') && 
                                  !href.includes('mailto') && 
                                  !href.includes('#') &&
                                  !name.toLowerCase().match(/bikes|classic|custom|racing|individual|video|technical|index|home|main/) &&
                                  name.length > 1 && 
                                  name.length < 50 &&
                                  /^[a-zA-Z0-9\s\-&\.]+$/.test(name); // Valid manufacturer name pattern
                    
                    if (isValid) {
                        manufacturerLinks.push({
                            name: name,
                            url: href,
                            fullUrl: href.startsWith('http') ? href : new URL(href, window.location.origin).href
                        });
                    }
                }
            });
            
            return manufacturerLinks;
        });
        
        console.log(`✅ Found ${manufacturers.length} valid manufacturers`);
        return manufacturers;
    }

    async scrapeMotorcycleDetails(modelUrl, manufacturerName, modelName) {
        console.log(`🔍 Scraping motorcycle details: ${modelName}`);
        
        try {
            await this.page.goto(modelUrl, { 
                waitUntil: 'networkidle2', 
                timeout: 45000 
            });
            
            await this.delay(2000);
            
            const motorcycleData = await this.page.evaluate(() => {
                const data = {
                    title: '',
                    description: '',
                    specifications: {},
                    images: [],
                    content: '',
                    metadata: {},
                    technicalSpecs: {},
                    features: []
                };
                
                // Enhanced title extraction
                const titleSelectors = ['h1', '.title', '.model-name', '[itemprop="name"]'];
                for (const selector of titleSelectors) {
                    const element = document.querySelector(selector);
                    if (element) {
                        data.title = element.textContent.trim();
                        break;
                    }
                }
                
                // Extract all text content
                const contentElements = document.querySelectorAll('p, .description, .content, article');
                let content = '';
                contentElements.forEach(el => {
                    const text = el.textContent.trim();
                    if (text.length > 20 && !text.includes('adsbygoogle')) {
                        content += text + '\n\n';
                    }
                });
                data.content = content.trim();
                
                // Enhanced image extraction with quality checks
                const images = document.querySelectorAll('img');
                images.forEach(img => {
                    const src = img.getAttribute('src') || img.getAttribute('data-src');
                    const alt = img.getAttribute('alt') || '';
                    
                    if (src) {
                        const fullUrl = src.startsWith('http') ? src : new URL(src, window.location.origin).href;
                        
                        // Skip logos, icons, and small images
                        const skipPatterns = ['logo', 'icon', 'banner', 'ad', 'button', 'arrow', 'nav'];
                        const shouldSkip = skipPatterns.some(pattern => 
                            fullUrl.toLowerCase().includes(pattern) || 
                            alt.toLowerCase().includes(pattern)
                        );
                        
                        if (!shouldSkip) {
                            // Get actual dimensions
                            const width = img.naturalWidth || img.width || 0;
                            const height = img.naturalHeight || img.height || 0;
                            
                            // Only include images larger than 100x100
                            if (width > 100 || height > 100) {
                                data.images.push({
                                    url: fullUrl,
                                    alt: alt,
                                    width: width,
                                    height: height,
                                    quality: width * height > 250000 ? 'high' : 'medium'
                                });
                            }
                        }
                    }
                });
                
                // Enhanced specification extraction
                const specTables = document.querySelectorAll('table');
                const skipTablePatterns = ['Complete Manufacturer List', 'Classic Bikes', 'Racing Bikes', 'navigation'];
                
                specTables.forEach(table => {
                    const tableText = table.textContent;
                    const shouldSkip = skipTablePatterns.some(pattern => 
                        tableText.includes(pattern)
                    );
                    
                    if (!shouldSkip) {
                        const rows = table.querySelectorAll('tr');
                        rows.forEach(row => {
                            const cells = row.querySelectorAll('td, th');
                            if (cells.length >= 2) {
                                const key = cells[0].textContent.trim()
                                    .replace(/[:\s]+$/, '') // Remove trailing colons
                                    .replace(/\s+/g, ' '); // Normalize spaces
                                    
                                const value = cells[1].textContent.trim();
                                
                                // Enhanced validation
                                if (key && value && 
                                    key.length < 50 && 
                                    !key.includes('\n') && 
                                    key !== '.' && 
                                    !value.includes('adsbygoogle') &&
                                    value.length < 500) {
                                    
                                    // Categorize specifications
                                    const engineSpecs = ['engine', 'displacement', 'bore', 'stroke', 'compression', 'power', 'torque'];
                                    const dimensionSpecs = ['length', 'width', 'height', 'wheelbase', 'seat', 'weight'];
                                    const performanceSpecs = ['speed', 'acceleration', '0-60', '0-100', 'quarter'];
                                    
                                    const keyLower = key.toLowerCase();
                                    
                                    if (engineSpecs.some(spec => keyLower.includes(spec))) {
                                        data.technicalSpecs[key] = value;
                                    } else if (dimensionSpecs.some(spec => keyLower.includes(spec))) {
                                        data.specifications[key] = value;
                                    } else if (performanceSpecs.some(spec => keyLower.includes(spec))) {
                                        data.technicalSpecs[key] = value;
                                    } else {
                                        data.specifications[key] = value;
                                    }
                                }
                            }
                        });
                    }
                });
                
                // Extract lists as features
                const lists = document.querySelectorAll('ul li, ol li');
                lists.forEach(li => {
                    const text = li.textContent.trim();
                    if (text.length > 10 && text.length < 200) {
                        data.features.push(text);
                    }
                });
                
                // Enhanced metadata extraction
                const metaTags = document.querySelectorAll('meta');
                metaTags.forEach(meta => {
                    const name = meta.getAttribute('name') || meta.getAttribute('property');
                    const content = meta.getAttribute('content');
                    if (name && content) {
                        data.metadata[name] = content;
                    }
                });
                
                // Extract structured data
                const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
                jsonLdScripts.forEach(script => {
                    try {
                        const jsonData = JSON.parse(script.textContent);
                        data.metadata.structuredData = jsonData;
                    } catch (e) {
                        // Invalid JSON, skip
                    }
                });
                
                return data;
            });
            
            // Add additional processing
            motorcycleData.manufacturer = manufacturerName;
            motorcycleData.model = modelName;
            motorcycleData.url = modelUrl;
            motorcycleData.scraped_at = new Date().toISOString();
            
            // Extract years
            motorcycleData.years = this.extractYearFromModel(modelName, motorcycleData.content);
            
            // Detect category
            motorcycleData.category = this.detectMotorcycleCategory(motorcycleData);
            
            // Calculate data quality score
            motorcycleData.dataQuality = this.calculateDataQuality(motorcycleData);
            
            console.log(`✅ Successfully scraped: ${modelName} (${motorcycleData.category}, Quality: ${motorcycleData.dataQuality}%)`);
            return motorcycleData;
            
        } catch (error) {
            console.error(`❌ Error scraping ${modelUrl}:`, error.message);
            return null;
        }
    }

    calculateDataQuality(data) {
        let score = 0;
        const weights = {
            title: 10,
            content: 15,
            specifications: 25,
            technicalSpecs: 20,
            images: 15,
            features: 10,
            category: 5
        };
        
        if (data.title) score += weights.title;
        if (data.content && data.content.length > 100) score += weights.content;
        if (Object.keys(data.specifications).length > 5) score += weights.specifications;
        if (Object.keys(data.technicalSpecs).length > 3) score += weights.technicalSpecs;
        if (data.images.length > 0) score += weights.images;
        if (data.features.length > 3) score += weights.features;
        if (data.category !== 'standard') score += weights.category;
        
        return Math.round(score);
    }

    async downloadImage(imageData, savePath) {
        return new Promise((resolve, reject) => {
            const imageUrl = imageData.url;
            const protocol = imageUrl.startsWith('https:') ? https : http;
            
            const options = {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Connection': 'keep-alive'
                }
            };
            
            protocol.get(imageUrl, options, async (response) => {
                if (response.statusCode === 200) {
                    const chunks = [];
                    
                    response.on('data', chunk => chunks.push(chunk));
                    response.on('end', async () => {
                        try {
                            const buffer = Buffer.concat(chunks);
                            
                            // Calculate hash for deduplication
                            const hash = crypto.createHash('md5').update(buffer).digest('hex');
                            
                            // Check if we've already downloaded this image
                            if (this.imageHashes.has(hash)) {
                                resolve({ 
                                    status: 'duplicate', 
                                    originalPath: this.imageHashes.get(hash),
                                    hash: hash 
                                });
                                return;
                            }
                            
                            // Save original
                            const originalPath = savePath.replace('/images/', '/images/originals/');
                            await fs.writeFile(originalPath, buffer);
                            
                            // Create optimized version with sharp
                            try {
                                const image = sharp(buffer);
                                const metadata = await image.metadata();
                                
                                // Only resize if larger than 1920px
                                if (metadata.width > 1920) {
                                    await image
                                        .resize(1920, null, { withoutEnlargement: true })
                                        .jpeg({ quality: 85, progressive: true })
                                        .toFile(savePath);
                                } else {
                                    await fs.writeFile(savePath, buffer);
                                }
                                
                                // Create thumbnail
                                const thumbnailPath = savePath.replace('/images/', '/images/thumbnails/');
                                await image
                                    .resize(300, 200, { fit: 'cover' })
                                    .jpeg({ quality: 70 })
                                    .toFile(thumbnailPath);
                                
                                // Store hash
                                this.imageHashes.set(hash, savePath);
                                
                                resolve({ 
                                    status: 'success', 
                                    path: savePath,
                                    originalPath: originalPath,
                                    thumbnailPath: thumbnailPath,
                                    size: metadata.width * metadata.height,
                                    hash: hash
                                });
                                
                            } catch (sharpError) {
                                // If sharp fails, just save the original
                                await fs.writeFile(savePath, buffer);
                                this.imageHashes.set(hash, savePath);
                                resolve({ status: 'success', path: savePath, hash: hash });
                            }
                            
                        } catch (error) {
                            reject(error);
                        }
                    });
                    
                    response.on('error', reject);
                    
                } else if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                    // Handle redirects
                    const redirectUrl = new URL(response.headers.location, imageUrl).href;
                    resolve(this.downloadImage({ ...imageData, url: redirectUrl }, savePath));
                } else {
                    reject(new Error(`HTTP ${response.statusCode}`));
                }
            }).on('error', reject);
        });
    }

    async downloadImagesForMotorcycle(motorcycleData) {
        if (!motorcycleData.images || motorcycleData.images.length === 0) {
            return [];
        }
        
        const downloadResults = [];
        const imagePromises = [];
        
        // Prepare download tasks
        motorcycleData.images.forEach((image, index) => {
            const downloadTask = this.downloadLimit(async () => {
                try {
                    const sanitizedManufacturer = motorcycleData.manufacturer.replace(/[^a-zA-Z0-9]/g, '_');
                    const sanitizedModel = motorcycleData.model.replace(/[^a-zA-Z0-9]/g, '_');
                    const imageDir = `./scraped_data/images/motorcycles/${sanitizedManufacturer}`;
                    
                    await fs.mkdir(imageDir, { recursive: true });
                    await fs.mkdir(imageDir.replace('/images/', '/images/originals/'), { recursive: true });
                    await fs.mkdir(imageDir.replace('/images/', '/images/thumbnails/'), { recursive: true });
                    
                    const extension = path.extname(new URL(image.url).pathname) || '.jpg';
                    const imagePath = `${imageDir}/${sanitizedModel}_${index + 1}${extension}`;
                    
                    const result = await this.downloadImage(image, imagePath);
                    
                    if (result.status === 'success') {
                        this.progress.downloadedImages++;
                        console.log(`✅ Downloaded: ${path.basename(imagePath)}`);
                    } else if (result.status === 'duplicate') {
                        this.progress.skippedImages++;
                        console.log(`⏭️  Skipped duplicate: ${path.basename(imagePath)}`);
                    }
                    
                    if (this.imageBar) {
                        this.imageBar.update(this.progress.downloadedImages + this.progress.skippedImages + this.progress.failedImages);
                    }
                    
                    return { ...result, index, url: image.url };
                    
                } catch (error) {
                    this.progress.failedImages++;
                    console.error(`❌ Failed to download image ${index + 1}:`, error.message);
                    
                    if (this.imageBar) {
                        this.imageBar.update(this.progress.downloadedImages + this.progress.skippedImages + this.progress.failedImages);
                    }
                    
                    return { status: 'failed', error: error.message, index, url: image.url };
                }
            });
            
            imagePromises.push(downloadTask);
        });
        
        // Wait for all downloads to complete
        const results = await Promise.all(imagePromises);
        
        return results;
    }

    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async saveData() {
        console.log('\n💾 Saving all scraped data...');
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        
        // Main data file
        const dataToSave = {
            scraped_at: new Date().toISOString(),
            scraper_version: '2.0.0',
            total_motorcycles: this.scraped_data.motorcycles.length,
            manufacturers: Array.from(this.scraped_data.manufacturers),
            models: Array.from(this.scraped_data.models),
            categories: Array.from(this.scraped_data.categories.entries()),
            statistics: {
                averageDataQuality: this.calculateAverageDataQuality(),
                categoriesBreakdown: this.getCategoriesBreakdown(),
                yearsRange: this.getYearsRange(),
                imageStats: {
                    total: this.progress.totalImages,
                    downloaded: this.progress.downloadedImages,
                    failed: this.progress.failedImages,
                    skipped: this.progress.skippedImages
                }
            },
            motorcycles: this.scraped_data.motorcycles
        };
        
        const filename = `./scraped_data/motorcycles/motorcyclespecs_enhanced_${timestamp}.json`;
        await fs.writeFile(filename, JSON.stringify(dataToSave, null, 2));
        
        // Save image mapping
        const imageMapping = {
            timestamp: new Date().toISOString(),
            hashes: Array.from(this.imageHashes.entries()),
            totalImages: this.imageHashes.size
        };
        
        await fs.writeFile(
            `./scraped_data/logs/image_mapping_${timestamp}.json`,
            JSON.stringify(imageMapping, null, 2)
        );
        
        // Save summary report
        const report = this.generateReport();
        await fs.writeFile(
            `./scraped_data/logs/scraping_report_${timestamp}.txt`,
            report
        );
        
        console.log(`✅ Data saved to ${filename}`);
        console.log(`📊 Total: ${this.scraped_data.motorcycles.length} motorcycles from ${this.scraped_data.manufacturers.size} manufacturers`);
        
        // Clean up progress file
        try {
            await fs.unlink(this.resumeFile);
        } catch (error) {
            // File doesn't exist, ignore
        }
        
        return filename;
    }

    calculateAverageDataQuality() {
        if (this.scraped_data.motorcycles.length === 0) return 0;
        
        const totalQuality = this.scraped_data.motorcycles.reduce(
            (sum, moto) => sum + (moto.dataQuality || 0), 
            0
        );
        
        return Math.round(totalQuality / this.scraped_data.motorcycles.length);
    }

    getCategoriesBreakdown() {
        const breakdown = {};
        
        this.scraped_data.motorcycles.forEach(moto => {
            const category = moto.category || 'uncategorized';
            breakdown[category] = (breakdown[category] || 0) + 1;
        });
        
        return breakdown;
    }

    getYearsRange() {
        const allYears = [];
        
        this.scraped_data.motorcycles.forEach(moto => {
            if (moto.years && moto.years.length > 0) {
                allYears.push(...moto.years);
            }
        });
        
        if (allYears.length === 0) return { min: null, max: null };
        
        return {
            min: Math.min(...allYears),
            max: Math.max(...allYears)
        };
    }

    generateReport() {
        const report = `
MOTORCYCLE SPECS ENHANCED SCRAPER REPORT
========================================
Generated: ${new Date().toISOString()}

SUMMARY
-------
Total Manufacturers: ${this.scraped_data.manufacturers.size}
Total Models: ${this.scraped_data.models.size}
Total Motorcycles: ${this.scraped_data.motorcycles.length}
Average Data Quality: ${this.calculateAverageDataQuality()}%

CATEGORIES BREAKDOWN
-------------------
${JSON.stringify(this.getCategoriesBreakdown(), null, 2)}

YEARS RANGE
-----------
${JSON.stringify(this.getYearsRange(), null, 2)}

IMAGE STATISTICS
----------------
Total Images Found: ${this.progress.totalImages}
Successfully Downloaded: ${this.progress.downloadedImages}
Skipped (Duplicates): ${this.progress.skippedImages}
Failed Downloads: ${this.progress.failedImages}
Unique Images: ${this.imageHashes.size}

PERFORMANCE
-----------
Total Processing Time: ${this.getProcessingTime()}
Average Time per Motorcycle: ${this.getAverageProcessingTime()}

TOP MANUFACTURERS BY MODEL COUNT
--------------------------------
${this.getTopManufacturers()}
`;
        
        return report;
    }

    getProcessingTime() {
        if (!this.startTime) return 'N/A';
        const duration = Date.now() - this.startTime;
        const hours = Math.floor(duration / 3600000);
        const minutes = Math.floor((duration % 3600000) / 60000);
        const seconds = Math.floor((duration % 60000) / 1000);
        return `${hours}h ${minutes}m ${seconds}s`;
    }

    getAverageProcessingTime() {
        if (!this.startTime || this.scraped_data.motorcycles.length === 0) return 'N/A';
        const duration = Date.now() - this.startTime;
        const avgMs = duration / this.scraped_data.motorcycles.length;
        return `${(avgMs / 1000).toFixed(2)}s`;
    }

    getTopManufacturers() {
        const manufacturerCounts = {};
        
        this.scraped_data.motorcycles.forEach(moto => {
            const manufacturer = moto.manufacturer;
            manufacturerCounts[manufacturer] = (manufacturerCounts[manufacturer] || 0) + 1;
        });
        
        const sorted = Object.entries(manufacturerCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);
        
        return sorted.map(([name, count]) => `${name}: ${count} models`).join('\n');
    }

    async run(options = {}) {
        const {
            maxManufacturers = null,
            maxModelsPerManufacturer = null,
            downloadImages = true,
            startFromManufacturer = null,
            resume = true
        } = options;
        
        this.startTime = Date.now();
        
        try {
            await this.initBrowser();
            
            console.log('🏁 Starting Enhanced MotorcycleSpecs Scraper v2.0...\n');
            
            // Load previous progress if resuming
            if (resume) {
                const hasProgress = await this.loadProgress();
                if (hasProgress && this.resumeData) {
                    // Restore previous data
                    this.progress = this.resumeData.progress;
                    if (this.resumeData.scraped_data) {
                        this.scraped_data.manufacturers = new Set(this.resumeData.scraped_data.manufacturers);
                        this.scraped_data.models = new Set(this.resumeData.scraped_data.models);
                        this.scraped_data.categories = new Map(this.resumeData.scraped_data.categories);
                    }
                }
            }
            
            // Get manufacturer list
            const manufacturers = await this.getManufacturerList();
            this.progress.totalManufacturers = manufacturers.length;
            
            let manufacturersToProcess = manufacturers;
            if (startFromManufacturer || (this.resumeData && this.resumeData.lastProcessed)) {
                const startName = startFromManufacturer || this.resumeData.lastProcessed.manufacturer;
                const startIndex = manufacturers.findIndex(m => 
                    m.name.toLowerCase().includes(startName.toLowerCase())
                );
                if (startIndex >= 0) {
                    manufacturersToProcess = manufacturers.slice(startIndex);
                    console.log(`🎯 Starting from manufacturer: ${manufacturers[startIndex].name}`);
                }
            }
            
            if (maxManufacturers) {
                manufacturersToProcess = manufacturersToProcess.slice(0, maxManufacturers);
                console.log(`🎯 Processing first ${maxManufacturers} manufacturers`);
            }
            
            // Initialize progress bars
            this.manufacturerBar = this.multibar.create(manufacturersToProcess.length, 0, { task: 'Manufacturers' });
            
            for (const manufacturer of manufacturersToProcess) {
                console.log(`\n🏭 Processing manufacturer: ${manufacturer.name}`);
                this.scraped_data.manufacturers.add(manufacturer.name);
                this.lastManufacturer = manufacturer.name;
                
                try {
                    const models = await this.getModelList(manufacturer.fullUrl);
                    
                    let modelsToProcess = models;
                    if (maxModelsPerManufacturer) {
                        modelsToProcess = models.slice(0, maxModelsPerManufacturer);
                    }
                    
                    this.progress.totalModels += modelsToProcess.length;
                    
                    if (this.modelBar) {
                        this.multibar.remove(this.modelBar);
                    }
                    this.modelBar = this.multibar.create(modelsToProcess.length, 0, { task: `${manufacturer.name} Models` });
                    
                    for (const model of modelsToProcess) {
                        this.scraped_data.models.add(model.name);
                        this.lastModel = model.name;
                        
                        const motorcycleData = await this.scrapeMotorcycleDetails(
                            model.fullUrl, 
                            manufacturer.name, 
                            model.name
                        );
                        
                        if (motorcycleData) {
                            this.scraped_data.motorcycles.push(motorcycleData);
                            
                            // Update category tracking
                            const category = motorcycleData.category;
                            this.scraped_data.categories.set(
                                category,
                                (this.scraped_data.categories.get(category) || 0) + 1
                            );
                            
                            // Download images if requested
                            if (downloadImages && motorcycleData.images.length > 0) {
                                this.progress.totalImages += motorcycleData.images.length;
                                
                                if (this.imageBar) {
                                    this.multibar.remove(this.imageBar);
                                }
                                this.imageBar = this.multibar.create(
                                    motorcycleData.images.length, 
                                    0, 
                                    { task: `Images for ${model.name}` }
                                );
                                
                                const imageResults = await this.downloadImagesForMotorcycle(motorcycleData);
                                motorcycleData.downloadedImages = imageResults;
                            }
                        }
                        
                        this.progress.processedModels++;
                        if (this.modelBar) {
                            this.modelBar.increment();
                        }
                        
                        // Save progress periodically
                        if (this.progress.processedModels % 10 === 0) {
                            await this.saveProgress();
                        }
                        
                        // Rate limiting
                        await this.delay(2000 + Math.random() * 1000);
                    }
                    
                } catch (manufacturerError) {
                    console.error(`❌ Error processing manufacturer ${manufacturer.name}:`, manufacturerError.message);
                }
                
                this.progress.processedManufacturers++;
                if (this.manufacturerBar) {
                    this.manufacturerBar.increment();
                }
                
                await this.delay(3000 + Math.random() * 2000);
            }
            
            // Stop all progress bars
            this.multibar.stop();
            
            // Save final data
            await this.saveData();
            
        } catch (error) {
            console.error('❌ Fatal error:', error);
            await this.saveProgress(); // Save progress on error
        } finally {
            if (this.browser) {
                await this.browser.close();
                console.log('🔄 Browser closed');
            }
        }
    }
}

// CLI usage
if (require.main === module) {
    const args = process.argv.slice(2);
    const options = {};
    
    for (let i = 0; i < args.length; i += 2) {
        const key = args[i]?.replace('--', '');
        const value = args[i + 1];
        
        if (key === 'max-manufacturers') options.maxManufacturers = parseInt(value);
        if (key === 'max-models') options.maxModelsPerManufacturer = parseInt(value);
        if (key === 'download-images') options.downloadImages = value === 'true';
        if (key === 'start-from') options.startFromManufacturer = value;
        if (key === 'no-resume') options.resume = false;
    }
    
    console.log('🚀 Starting Enhanced MotorcycleSpecs Scraper with options:', options);
    
    const scraper = new EnhancedMotorcycleSpecsScraper();
    scraper.run(options).then(() => {
        console.log('\n🎉 Scraping completed successfully!');
        process.exit(0);
    }).catch(error => {
        console.error('\n💥 Scraping failed:', error);
        process.exit(1);
    });
}

module.exports = EnhancedMotorcycleSpecsScraper;