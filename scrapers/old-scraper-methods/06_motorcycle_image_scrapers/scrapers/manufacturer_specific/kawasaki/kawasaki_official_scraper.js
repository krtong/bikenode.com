import fs from 'fs';
import path from 'path';
import axios from 'axios';
import * as cheerio from 'cheerio';
import csv from 'csv-parser';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class KawasakiOfficialScraper {
    constructor() {
        this.csvPath = '/Users/kevintong/Documents/Code/bikenode.com/database/data/motorcycles_updated.csv';
        this.baseImageDir = '/Users/kevintong/Documents/Code/bikenode.com/images/motorcycles';
        this.progressFile = '/Users/kevintong/Documents/Code/bikenode.com/scrapers/06_motorcycle_image_scrapers/data/progress/kawasaki_official_progress.json';
        this.failedUrlsFile = '/Users/kevintong/Documents/Code/bikenode.com/scrapers/06_motorcycle_image_scrapers/data/failed_urls/kawasaki_official_failed_urls.json';
        this.specDataFile = '/Users/kevintong/Documents/Code/bikenode.com/scrapers/06_motorcycle_image_scrapers/data/analysis_results/kawasaki_specs.json';
        this.logFile = '/Users/kevintong/Documents/Code/bikenode.com/scrapers/06_motorcycle_image_scrapers/logs/kawasaki_scraper.log';
        
        this.motorcycles = [];
        this.progress = { processed: 0, downloaded: 0, failed: 0, skipped: 0, specs_collected: 0 };
        this.failedUrls = [];
        this.specData = [];
        this.delayBetweenRequests = 3000; // 3 seconds between requests
        this.maxRetries = 3;
        
        this.userAgents = [
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
        ];
        
        // Kawasaki motorcycle categories
        this.kawasakiCategories = {
            sport: 'https://www.kawasaki.com/en-us/motorcycle/ninja',
            touring: 'https://www.kawasaki.com/en-us/motorcycle/versys',
            cruiser: 'https://www.kawasaki.com/en-us/motorcycle/vulcan',
            naked: 'https://www.kawasaki.com/en-us/motorcycle/z',
            adventure: 'https://www.kawasaki.com/en-us/motorcycle/klr',
            motocross: 'https://www.kawasaki.com/en-us/motorcycle/kx',
            dual_sport: 'https://www.kawasaki.com/en-us/motorcycle/klx',
            electric: 'https://www.kawasaki.com/en-us/motorcycle/electric'
        };

        this.setupLogging();
    }

    setupLogging() {
        // Create logs directory
        const logDir = path.dirname(this.logFile);
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
    }

    log(message) {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] ${message}`;
        console.log(logMessage);
        
        // Also write to log file
        try {
            fs.appendFileSync(this.logFile, logMessage + '\n');
        } catch (error) {
            console.error('Failed to write to log file:', error.message);
        }
    }

    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    getRandomUserAgent() {
        return this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
    }

    loadProgress() {
        try {
            if (fs.existsSync(this.progressFile)) {
                this.progress = JSON.parse(fs.readFileSync(this.progressFile, 'utf8'));
                this.log(`Loaded progress: ${this.progress.processed} processed, ${this.progress.downloaded} downloaded`);
            }
        } catch (error) {
            this.log(`Error loading progress: ${error.message}`);
        }
    }

    saveProgress() {
        try {
            const dir = path.dirname(this.progressFile);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(this.progressFile, JSON.stringify(this.progress, null, 2));
        } catch (error) {
            this.log(`Error saving progress: ${error.message}`);
        }
    }

    async scrapeKawasakiModels() {
        this.log('🏍️ Scraping current Kawasaki models from official website...');
        const currentModels = [];

        for (const [category, url] of Object.entries(this.kawasakiCategories)) {
            try {
                this.log(`Scraping ${category} category: ${url}`);
                await this.delay(this.delayBetweenRequests);

                const response = await axios.get(url, {
                    headers: {
                        'User-Agent': this.getRandomUserAgent(),
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                        'Accept-Language': 'en-US,en;q=0.5',
                        'Accept-Encoding': 'gzip, deflate',
                        'Connection': 'keep-alive',
                        'Referer': 'https://www.kawasaki.com/'
                    },
                    timeout: 30000
                });

                const $ = cheerio.load(response.data);
                
                // Kawasaki website structure analysis - try multiple selectors
                const selectors = [
                    '.product-card',
                    '.model-card',
                    '.vehicle-card',
                    '.motorcycle-card',
                    '.product-tile',
                    '.bike-card',
                    '[data-model]',
                    '.listing-item'
                ];

                let foundModels = 0;
                selectors.forEach(selector => {
                    $(selector).each((index, element) => {
                        const $card = $(element);
                        const modelName = $card.find('h2, h3, h4, .title, .model-name, .product-title').first().text().trim();
                        const modelLink = $card.find('a').first().attr('href');
                        const imageUrl = $card.find('img').first().attr('src') || $card.find('img').first().attr('data-src');
                        const price = $card.find('.price, .msrp, .starting-at').first().text().trim();

                        if (modelName && modelName.length > 2 && !currentModels.find(m => m.model === modelName)) {
                            const fullUrl = modelLink && modelLink.startsWith('http') ? modelLink : 
                                          modelLink ? `https://www.kawasaki.com${modelLink}` : url;
                            const fullImageUrl = imageUrl && imageUrl.startsWith('http') ? imageUrl : 
                                               imageUrl ? `https://www.kawasaki.com${imageUrl}` : null;

                            currentModels.push({
                                category,
                                model: modelName,
                                url: fullUrl,
                                imageUrl: fullImageUrl,
                                price,
                                year: 2025,
                                selector: selector // Track which selector worked
                            });
                            foundModels++;
                        }
                    });
                });

                this.log(`Found ${foundModels} models in ${category} using various selectors`);

                // If no models found with cards, try direct product links
                if (foundModels === 0) {
                    $('a[href*="/motorcycle/"], a[href*="/bike/"], a[href*="/model/"]').each((index, link) => {
                        const href = $(link).attr('href');
                        const text = $(link).text().trim();
                        
                        if (text && text.length > 2 && href && !currentModels.find(m => m.model === text)) {
                            currentModels.push({
                                category,
                                model: text,
                                url: href.startsWith('http') ? href : `https://www.kawasaki.com${href}`,
                                imageUrl: null,
                                price: null,
                                year: 2025,
                                selector: 'link-text'
                            });
                            foundModels++;
                        }
                    });
                    
                    if (foundModels > 0) {
                        this.log(`Found ${foundModels} additional models via direct links in ${category}`);
                    }
                }

            } catch (error) {
                this.log(`Error scraping ${category}: ${error.message}`);
                if (error.response) {
                    this.log(`Response status: ${error.response.status}`);
                }
            }
        }

        this.log(`Total current Kawasaki models found: ${currentModels.length}`);
        
        // Log some sample models for debugging
        if (currentModels.length > 0) {
            this.log('Sample models found:');
            currentModels.slice(0, 5).forEach(model => {
                this.log(`  - ${model.model} (${model.category}) via ${model.selector}`);
            });
        }
        
        return currentModels;
    }

    async scrapeModelDetails(modelData) {
        try {
            this.log(`Scraping details for: ${modelData.model}`);
            await this.delay(this.delayBetweenRequests);

            const response = await axios.get(modelData.url, {
                headers: {
                    'User-Agent': this.getRandomUserAgent(),
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Referer': 'https://www.kawasaki.com/'
                },
                timeout: 30000
            });

            const $ = cheerio.load(response.data);
            
            const specs = {
                model: modelData.model,
                category: modelData.category,
                url: modelData.url,
                year: modelData.year,
                images: [],
                specifications: {},
                variants: [],
                colors: [],
                features: []
            };

            // Extract images with multiple strategies
            const imageSelectors = [
                '.hero-image img',
                '.gallery img',
                '.model-image img',
                '.product-image img',
                '.bike-image img',
                '[data-gallery] img',
                '.carousel img',
                '.slider img'
            ];

            imageSelectors.forEach(selector => {
                $(selector).each((index, img) => {
                    const src = $(img).attr('src') || $(img).attr('data-src') || $(img).attr('data-lazy');
                    if (src && !specs.images.includes(src)) {
                        const fullUrl = src.startsWith('http') ? src : `https://www.kawasaki.com${src}`;
                        if (fullUrl.includes('motorcycle') || fullUrl.includes('bike') || fullUrl.includes('.jpg') || fullUrl.includes('.png')) {
                            specs.images.push(fullUrl);
                        }
                    }
                });
            });

            // Extract specifications
            $('.spec-table tr, .specifications tr, .details tr, .tech-specs tr').each((index, row) => {
                const $row = $(row);
                const label = $row.find('td:first-child, th:first-child, .spec-label').text().trim();
                const value = $row.find('td:last-child, th:last-child, .spec-value').text().trim();
                if (label && value && label !== value) {
                    specs.specifications[label] = value;
                }
            });

            // Extract features
            $('.feature-list li, .features li, .highlights li, .benefits li').each((index, feature) => {
                const featureText = $(feature).text().trim();
                if (featureText && featureText.length > 5) {
                    specs.features.push(featureText);
                }
            });

            this.specData.push(specs);
            this.progress.specs_collected++;
            this.saveProgress();

            return specs;

        } catch (error) {
            this.log(`Error scraping model details for ${modelData.model}: ${error.message}`);
            return null;
        }
    }

    async downloadImage(imageUrl, savePath) {
        try {
            const response = await axios.get(imageUrl, {
                responseType: 'stream',
                headers: {
                    'User-Agent': this.getRandomUserAgent(),
                    'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
                    'Referer': 'https://www.kawasaki.com/'
                },
                timeout: 30000
            });

            const dir = path.dirname(savePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            const writer = fs.createWriteStream(savePath);
            response.data.pipe(writer);

            return new Promise((resolve, reject) => {
                writer.on('finish', () => {
                    this.log(`Downloaded: ${path.basename(savePath)}`);
                    resolve(savePath);
                });
                writer.on('error', reject);
            });

        } catch (error) {
            this.log(`Error downloading image ${imageUrl}: ${error.message}`);
            throw error;
        }
    }

    async processModel(modelData) {
        try {
            this.log(`Processing Kawasaki ${modelData.model} (${modelData.category})`);

            const specs = await this.scrapeModelDetails(modelData);
            if (!specs) {
                this.progress.failed++;
                return;
            }

            // Download images
            const modelDir = path.join(
                this.baseImageDir,
                'Kawasaki',
                modelData.year.toString(),
                this.sanitizeFilename(modelData.model),
                'Official'
            );

            let downloadedCount = 0;
            for (let i = 0; i < Math.min(specs.images.length, 5); i++) {
                try {
                    const imageUrl = specs.images[i];
                    const extension = path.extname(new URL(imageUrl).pathname) || '.jpg';
                    const imagePath = path.join(modelDir, `official_${i + 1}${extension}`);

                    await this.downloadImage(imageUrl, imagePath);
                    downloadedCount++;
                    await this.delay(1000);

                } catch (error) {
                    this.log(`Failed to download image ${i + 1} for ${modelData.model}: ${error.message}`);
                }
            }

            this.progress.processed++;
            this.progress.downloaded += downloadedCount;
            
            if (downloadedCount === 0) {
                this.progress.failed++;
            }

            this.saveProgress();
            this.log(`Completed ${modelData.model}: ${downloadedCount} images downloaded`);

        } catch (error) {
            this.log(`Error processing ${modelData.model}: ${error.message}`);
            this.progress.failed++;
            this.saveProgress();
        }
    }

    sanitizeFilename(name) {
        return name.replace(/[^a-zA-Z0-9\-_\s]/g, '').replace(/\s+/g, '_').substring(0, 50);
    }

    async saveSpecData() {
        try {
            const dir = path.dirname(this.specDataFile);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(this.specDataFile, JSON.stringify(this.specData, null, 2));
            this.log(`Saved specification data for ${this.specData.length} Kawasaki models`);
        } catch (error) {
            this.log(`Error saving spec data: ${error.message}`);
        }
    }

    async run() {
        try {
            this.log('🚀 Starting Kawasaki Official Website Scraper...');
            this.loadProgress();

            const currentModels = await this.scrapeKawasakiModels();
            
            if (currentModels.length === 0) {
                this.log('❌ No Kawasaki models found on official website');
                return;
            }

            this.log(`📋 Found ${currentModels.length} current Kawasaki models to process`);

            // Process each model
            for (const modelData of currentModels) {
                await this.processModel(modelData);
                await this.delay(this.delayBetweenRequests);
            }

            await this.saveSpecData();

            this.log('✅ Kawasaki official scraper completed!');
            this.log(`📊 Final Stats: ${this.progress.processed} processed, ${this.progress.downloaded} images downloaded, ${this.progress.specs_collected} specs collected`);

        } catch (error) {
            this.log(`❌ Fatal error: ${error.message}`);
            console.error(error);
        }
    }
}

// Run the scraper
const scraper = new KawasakiOfficialScraper();
scraper.run().catch(console.error);
