const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');
const https = require('https');
const http = require('http');
const { URL } = require('url');

class MotorcycleSpecsScraper {
    constructor() {
        this.baseUrl = 'https://www.motorcyclespecs.co.za';
        this.browser = null;
        this.page = null;
        this.scraped_data = {
            motorcycles: [],
            manufacturers: new Set(),
            models: new Set(),
            images: []
        };
        
        this.setupDirectories();
    }

    async setupDirectories() {
        const dirs = [
            './scraped_data',
            './scraped_data/motorcycles',
            './scraped_data/images',
            './scraped_data/images/motorcycles',
            './scraped_data/database',
            './scraped_data/logs'
        ];
        
        for (const dir of dirs) {
            try {
                await fs.mkdir(dir, { recursive: true });
            } catch (error) {
                console.log(`Directory ${dir} already exists or error creating:`, error.message);
            }
        }
    }

    async initBrowser() {
        console.log('🚀 Initializing browser...');
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
                '--disable-gpu'
            ]
        });
        
        this.page = await this.browser.newPage();
        
        await this.page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        console.log('✅ Browser initialized successfully');
    }

    async getManufacturerList() {
        console.log('🔍 Extracting manufacturer list...');
        
        // Go to the manufacturer page which has the proper brand listings
        await this.page.goto(`${this.baseUrl}/Manufacturer.htm`, { waitUntil: 'networkidle2' });
        
        // Extract manufacturer links from the manufacturer page
        const manufacturers = await this.page.evaluate(() => {
            const manufacturerLinks = [];
            
            // Look for links to bike brand pages (bikes/bmw.htm, bikes/honda.html, etc.)
            const links = document.querySelectorAll('a[href*="bikes/"]');
            
            links.forEach(link => {
                const name = link.textContent.trim();
                const href = link.getAttribute('href');
                
                // Filter for actual manufacturer links, excluding generic pages
                if (name && href && 
                    !href.includes('javascript') && 
                    !href.includes('mailto') && 
                    !href.includes('#') &&
                    !name.toLowerCase().includes('bikes') &&
                    !name.toLowerCase().includes('classic') &&
                    !name.toLowerCase().includes('custom') &&
                    !name.toLowerCase().includes('racing') &&
                    !name.toLowerCase().includes('individual') &&
                    !name.toLowerCase().includes('video') &&
                    !name.toLowerCase().includes('technical') &&
                    name.length > 1 && name.length < 50) {
                    
                    manufacturerLinks.push({
                        name: name,
                        url: href,
                        fullUrl: href.startsWith('http') ? href : new URL(href, window.location.origin).href
                    });
                }
            });
            
            return manufacturerLinks;
        });
        
        console.log(`✅ Found ${manufacturers.length} manufacturers`);
        return manufacturers;
    }

    async getModelList(manufacturerUrl) {
        console.log(`🔍 Getting models from: ${manufacturerUrl}`);
        
        try {
            await this.page.goto(manufacturerUrl, { waitUntil: 'networkidle2', timeout: 30000 });
            await this.delay(2000);
            
            const models = await this.page.evaluate(() => {
                const modelLinks = [];
                
                // Look for model links - these typically point to individual motorcycle model pages
                const links = document.querySelectorAll('a[href*="model/"]');
                
                if (links.length === 0) {
                    // Alternative approach: look for links with .htm or .html extensions that might be models
                    const altLinks = document.querySelectorAll('a[href]');
                    altLinks.forEach(link => {
                        const href = link.getAttribute('href');
                        const text = link.textContent.trim();
                        
                        if (href && text && 
                            (href.endsWith('.htm') || href.endsWith('.html')) &&
                            !href.includes('javascript') && 
                            !href.includes('mailto') &&
                            !href.includes('index') &&
                            !href.includes('main') &&
                            !href.includes('home') &&
                            text.length > 2 && text.length < 100) {
                            modelLinks.push({
                                name: text,
                                url: href,
                                fullUrl: href.startsWith('http') ? href : new URL(href, window.location.origin).href
                            });
                        }
                    });
                } else {
                    links.forEach(link => {
                        const name = link.textContent.trim();
                        const href = link.getAttribute('href');
                        if (name && href) {
                            modelLinks.push({
                                name: name,
                                url: href,
                                fullUrl: href.startsWith('http') ? href : new URL(href, window.location.origin).href
                            });
                        }
                    });
                }
                
                return modelLinks;
            });
            
            console.log(`✅ Found ${models.length} models`);
            return models;
            
        } catch (error) {
            console.error(`❌ Error getting models from ${manufacturerUrl}:`, error.message);
            return [];
        }
    }

    async scrapeMotorcycleDetails(modelUrl, manufacturerName, modelName) {
        console.log(`🔍 Scraping motorcycle details: ${modelName}`);
        
        try {
            await this.page.goto(modelUrl, { waitUntil: 'networkidle2', timeout: 30000 });
            await this.delay(2000);
            
            const motorcycleData = await this.page.evaluate(() => {
                const data = {
                    title: '',
                    description: '',
                    specifications: {},
                    images: [],
                    content: '',
                    metadata: {}
                };
                
                // Extract title
                const titleElement = document.querySelector('h1, .title, .model-name');
                if (titleElement) {
                    data.title = titleElement.textContent.trim();
                }
                
                // Extract description/content
                const contentElements = document.querySelectorAll('p, .description, .content');
                let content = '';
                contentElements.forEach(el => {
                    const text = el.textContent.trim();
                    if (text.length > 20) {
                        content += text + '\n\n';
                    }
                });
                data.content = content.trim();
                
                // Extract images
                const images = document.querySelectorAll('img');
                images.forEach(img => {
                    const src = img.getAttribute('src');
                    const alt = img.getAttribute('alt') || '';
                    if (src && !src.includes('logo') && !src.includes('icon')) {
                        data.images.push({
                            url: src.startsWith('http') ? src : new URL(src, window.location.origin).href,
                            alt: alt,
                            width: img.naturalWidth || img.width || 0,
                            height: img.naturalHeight || img.height || 0
                        });
                    }
                });
                
                // Extract specifications from tables or structured data
                const specTables = document.querySelectorAll('table');
                specTables.forEach(table => {
                    // Skip navigation tables
                    if (table.textContent.includes('Complete Manufacturer List') || 
                        table.textContent.includes('Classic Bikes') ||
                        table.textContent.includes('Racing Bikes')) {
                        return;
                    }
                    
                    const rows = table.querySelectorAll('tr');
                    rows.forEach(row => {
                        const cells = row.querySelectorAll('td');
                        if (cells.length >= 2) {
                            const key = cells[0].textContent.trim();
                            const value = cells[1].textContent.trim();
                            
                            // Filter out invalid keys
                            if (key && value && 
                                key.length < 50 && // Reasonable key length
                                !key.includes('\n') && // No multi-line keys
                                key !== '.' && // Not just a period
                                value !== '(adsbygoogle = window.adsbygoogle || []).push({});') { // Not ad code
                                data.specifications[key] = value;
                            }
                        }
                    });
                });
                
                // Extract metadata
                const metaTags = document.querySelectorAll('meta');
                metaTags.forEach(meta => {
                    const name = meta.getAttribute('name') || meta.getAttribute('property');
                    const content = meta.getAttribute('content');
                    if (name && content) {
                        data.metadata[name] = content;
                    }
                });
                
                return data;
            });
            
            // Add additional data
            motorcycleData.manufacturer = manufacturerName;
            motorcycleData.model = modelName;
            motorcycleData.url = modelUrl;
            motorcycleData.scraped_at = new Date().toISOString();
            
            console.log(`✅ Successfully scraped: ${modelName}`);
            return motorcycleData;
            
        } catch (error) {
            console.error(`❌ Error scraping ${modelUrl}:`, error.message);
            return null;
        }
    }

    async downloadImage(imageUrl, filename) {
        return new Promise((resolve, reject) => {
            const protocol = imageUrl.startsWith('https:') ? https : http;
            
            protocol.get(imageUrl, (response) => {
                if (response.statusCode === 200) {
                    const fileStream = require('fs').createWriteStream(filename);
                    response.pipe(fileStream);
                    fileStream.on('finish', () => {
                        fileStream.close();
                        resolve(filename);
                    });
                    fileStream.on('error', reject);
                } else {
                    reject(new Error(`HTTP ${response.statusCode}`));
                }
            }).on('error', reject);
        });
    }

    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async saveData() {
        console.log('💾 Saving scraped data...');
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const dataToSave = {
            scraped_at: new Date().toISOString(),
            total_motorcycles: this.scraped_data.motorcycles.length,
            manufacturers: Array.from(this.scraped_data.manufacturers),
            models: Array.from(this.scraped_data.models),
            motorcycles: this.scraped_data.motorcycles
        };
        
        const filename = `./scraped_data/motorcycles/motorcyclespecs_${timestamp}.json`;
        await fs.writeFile(filename, JSON.stringify(dataToSave, null, 2));
        
        console.log(`✅ Data saved to ${filename}`);
        console.log(`📊 Scraped ${this.scraped_data.motorcycles.length} motorcycles from ${this.scraped_data.manufacturers.size} manufacturers`);
        
        return filename;
    }

    async run(options = {}) {
        const {
            maxManufacturers = null,
            maxModelsPerManufacturer = null,
            downloadImages = false,
            startFromManufacturer = null
        } = options;
        
        try {
            await this.initBrowser();
            
            console.log('🏁 Starting MotorcycleSpecs.co.za scraper...');
            
            // Get manufacturer list
            const manufacturers = await this.getManufacturerList();
            
            let manufacturersToProcess = manufacturers;
            if (startFromManufacturer) {
                const startIndex = manufacturers.findIndex(m => 
                    m.name.toLowerCase().includes(startFromManufacturer.toLowerCase())
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
            
            for (const manufacturer of manufacturersToProcess) {
                console.log(`\n🏭 Processing manufacturer: ${manufacturer.name}`);
                this.scraped_data.manufacturers.add(manufacturer.name);
                
                try {
                    const models = await this.getModelList(manufacturer.fullUrl);
                    
                    let modelsToProcess = models;
                    if (maxModelsPerManufacturer) {
                        modelsToProcess = models.slice(0, maxModelsPerManufacturer);
                    }
                    
                    for (const model of modelsToProcess) {
                        this.scraped_data.models.add(model.name);
                        
                        const motorcycleData = await this.scrapeMotorcycleDetails(
                            model.fullUrl, 
                            manufacturer.name, 
                            model.name
                        );
                        
                        if (motorcycleData) {
                            this.scraped_data.motorcycles.push(motorcycleData);
                            
                            // Download images if requested
                            if (downloadImages && motorcycleData.images.length > 0) {
                                console.log(`📸 Downloading ${motorcycleData.images.length} images for ${model.name}`);
                                
                                for (let i = 0; i < motorcycleData.images.length; i++) {
                                    const image = motorcycleData.images[i];
                                    try {
                                        const sanitizedManufacturer = manufacturer.name.replace(/[^a-zA-Z0-9]/g, '_');
                                        const sanitizedModel = model.name.replace(/[^a-zA-Z0-9]/g, '_');
                                        const imageDir = `./scraped_data/images/motorcycles/${sanitizedManufacturer}`;
                                        
                                        await fs.mkdir(imageDir, { recursive: true });
                                        
                                        const extension = path.extname(new URL(image.url).pathname) || '.jpg';
                                        const imagePath = `${imageDir}/${sanitizedModel}_${i + 1}${extension}`;
                                        
                                        await this.downloadImage(image.url, imagePath);
                                        console.log(`✅ Downloaded: ${imagePath}`);
                                        
                                        await this.delay(500); // Delay between image downloads
                                        
                                    } catch (imageError) {
                                        console.error(`❌ Error downloading image ${image.url}:`, imageError.message);
                                    }
                                }
                            }
                        }
                        
                        await this.delay(3000); // Delay between models
                    }
                    
                } catch (manufacturerError) {
                    console.error(`❌ Error processing manufacturer ${manufacturer.name}:`, manufacturerError.message);
                }
                
                await this.delay(2000); // Delay between manufacturers
            }
            
            await this.saveData();
            
        } catch (error) {
            console.error('❌ Fatal error:', error);
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
    }
    
    console.log('🚀 Starting MotorcycleSpecs.co.za scraper with options:', options);
    
    const scraper = new MotorcycleSpecsScraper();
    scraper.run(options).then(() => {
        console.log('🎉 Scraping completed!');
        process.exit(0);
    }).catch(error => {
        console.error('💥 Scraping failed:', error);
        process.exit(1);
    });
}

module.exports = MotorcycleSpecsScraper;