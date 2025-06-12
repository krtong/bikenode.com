import fs from 'fs';
import path from 'path';
import axios from 'axios';
import * as cheerio from 'cheerio';
import csv from 'csv-parser';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class HondaOfficialScraper {
    constructor() {
        this.csvPath = '/Users/kevintong/Documents/Code/bikenode.com/database/data/motorcycles_updated.csv';
        this.baseImageDir = '/Users/kevintong/Documents/Code/bikenode.com/images/motorcycles';
        this.progressFile = '/Users/kevintong/Documents/Code/bikenode.com/scrapers/06_motorcycle_image_scrapers/data/progress/honda_official_progress.json';
        this.failedUrlsFile = '/Users/kevintong/Documents/Code/bikenode.com/scrapers/06_motorcycle_image_scrapers/data/failed_urls/honda_official_failed_urls.json';
        this.specDataFile = '/Users/kevintong/Documents/Code/bikenode.com/scrapers/06_motorcycle_image_scrapers/data/analysis_results/honda_specs.json';
        
        this.motorcycles = [];
        this.progress = { processed: 0, downloaded: 0, failed: 0, skipped: 0, specs_collected: 0 };
        this.failedUrls = [];
        this.specData = [];
        this.delayBetweenRequests = 5000; // 5 seconds between requests (increased)
        this.maxRetries = 3;
        
        this.userAgents = [
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
        ];
        
        // Create axios instance with better anti-bot evasion
        this.axiosInstance = axios.create({
            timeout: 30000,
            headers: {
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Cache-Control': 'max-age=0'
            }
        });
        
        // Honda motorcycle categories and their official pages
        this.hondaCategories = {
            sport: 'https://powersports.honda.com/street/sport',
            touring: 'https://powersports.honda.com/street/touring',
            standard: 'https://powersports.honda.com/street/standard',
            cruiser: 'https://powersports.honda.com/street/cruiser',
            adventure: 'https://powersports.honda.com/street/adventure',
            scooter: 'https://powersports.honda.com/scooter',
            trail: 'https://powersports.honda.com/off-road/trail',
            motocross: 'https://powersports.honda.com/off-road/motocross',
            supermoto: 'https://powersports.honda.com/off-road/supermoto'
        };
    }

    log(message) {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] ${message}`);
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
            fs.writeFileSync(this.progressFile, JSON.stringify(this.progress, null, 2));
        } catch (error) {
            this.log(`Error saving progress: ${error.message}`);
        }
    }

    loadFailedUrls() {
        try {
            if (fs.existsSync(this.failedUrlsFile)) {
                this.failedUrls = JSON.parse(fs.readFileSync(this.failedUrlsFile, 'utf8'));
                this.log(`Loaded ${this.failedUrls.length} failed URLs`);
            }
        } catch (error) {
            this.log(`Error loading failed URLs: ${error.message}`);
        }
    }

    saveFailedUrls() {
        try {
            fs.writeFileSync(this.failedUrlsFile, JSON.stringify(this.failedUrls, null, 2));
        } catch (error) {
            this.log(`Error saving failed URLs: ${error.message}`);
        }
    }

    async loadMotorcycles() {
        return new Promise((resolve, reject) => {
            const motorcycles = [];
            
            fs.createReadStream(this.csvPath)
                .pipe(csv())
                .on('data', (row) => {
                    // Only process Honda motorcycles from 2020 onwards for current models
                    if (row.Make && row.Make.toLowerCase().includes('honda') && 
                        parseInt(row.Year) >= 2020) {
                        motorcycles.push({
                            year: row.Year,
                            make: row.Make,
                            model: row.Model,
                            variant: row.Package,
                            category: row.Category,
                            engine: row.Engine
                        });
                    }
                })
                .on('end', () => {
                    this.motorcycles = motorcycles;
                    this.log(`Loaded ${motorcycles.length} Honda motorcycles (2020+) from CSV`);
                    resolve();
                })
                .on('error', reject);
        });
    }

    async scrapeHondaCurrentModels() {
        this.log('🏍️ Scraping current Honda models from official website...');
        const currentModels = [];

        for (const [category, url] of Object.entries(this.hondaCategories)) {
            try {
                this.log(`Scraping ${category} category: ${url}`);
                await this.delay(this.delayBetweenRequests);

                const response = await this.axiosInstance.get(url, {
                    headers: {
                        'User-Agent': this.getRandomUserAgent(),
                        'Referer': 'https://powersports.honda.com/',
                        'DNT': '1',
                        'Sec-GPC': '1'
                    }
                });

                const $ = cheerio.load(response.data);
                
                // Honda website structure analysis
                $('.vehicle-card, .model-card, .product-card').each((index, element) => {
                    const $card = $(element);
                    const modelName = $card.find('h3, .model-name, .title').text().trim();
                    const modelLink = $card.find('a').attr('href');
                    const imageUrl = $card.find('img').attr('src') || $card.find('img').attr('data-src');
                    const price = $card.find('.price, .msrp').text().trim();

                    if (modelName && modelLink) {
                        currentModels.push({
                            category,
                            model: modelName,
                            url: modelLink.startsWith('http') ? modelLink : `https://powersports.honda.com${modelLink}`,
                            imageUrl: imageUrl && imageUrl.startsWith('http') ? imageUrl : 
                                     imageUrl ? `https://powersports.honda.com${imageUrl}` : null,
                            price,
                            year: 2025 // Current model year
                        });
                    }
                });

                this.log(`Found ${currentModels.filter(m => m.category === category).length} models in ${category}`);

            } catch (error) {
                this.log(`Error scraping ${category}: ${error.message}`);
            }
        }

        this.log(`Total current Honda models found: ${currentModels.length}`);
        return currentModels;
    }

    async scrapeModelDetails(modelData) {
        try {
            this.log(`Scraping details for: ${modelData.model}`);
            await this.delay(this.delayBetweenRequests);

            const response = await this.axiosInstance.get(modelData.url, {
                headers: {
                    'User-Agent': this.getRandomUserAgent(),
                    'Referer': 'https://powersports.honda.com/',
                    'DNT': '1',
                    'Sec-GPC': '1'
                }
            });

            const $ = cheerio.load(response.data);
            
            // Extract detailed specifications
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

            // Extract images
            $('.hero-image img, .gallery img, .model-image img').each((index, img) => {
                const src = $(img).attr('src') || $(img).attr('data-src');
                if (src && !specs.images.includes(src)) {
                    specs.images.push(src.startsWith('http') ? src : `https://powersports.honda.com${src}`);
                }
            });

            // Extract specifications
            $('.spec-table tr, .specifications tr, .details-table tr').each((index, row) => {
                const $row = $(row);
                const label = $row.find('td:first-child, th:first-child').text().trim();
                const value = $row.find('td:last-child, th:last-child').text().trim();
                if (label && value && label !== value) {
                    specs.specifications[label] = value;
                }
            });

            // Extract color options
            $('.color-option, .color-selector, .paint-option').each((index, colorEl) => {
                const colorName = $(colorEl).attr('title') || $(colorEl).text().trim();
                if (colorName) {
                    specs.colors.push(colorName);
                }
            });

            // Extract key features
            $('.feature-list li, .key-features li, .highlights li').each((index, feature) => {
                const featureText = $(feature).text().trim();
                if (featureText) {
                    specs.features.push(featureText);
                }
            });

            // Extract variants/trims
            $('.trim-selector option, .variant-option, .package-option').each((index, variant) => {
                const variantName = $(variant).text().trim();
                const variantValue = $(variant).attr('value');
                if (variantName && variantName !== 'Select') {
                    specs.variants.push({
                        name: variantName,
                        value: variantValue
                    });
                }
            });

            this.specData.push(specs);
            this.progress.specs_collected++;
            this.saveProgress();

            return specs;

        } catch (error) {
            this.log(`Error scraping model details for ${modelData.model}: ${error.message}`);
            this.failedUrls.push({
                url: modelData.url,
                model: modelData.model,
                error: error.message,
                timestamp: new Date().toISOString()
            });
            this.saveFailedUrls();
            return null;
        }
    }

    async downloadImage(imageUrl, savePath) {
        try {
            const response = await axios.get(imageUrl, {
                responseType: 'stream',
                headers: {
                    'User-Agent': this.getRandomUserAgent(),
                    'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8'
                },
                timeout: 30000
            });

            // Ensure directory exists
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
            this.log(`Processing Honda ${modelData.model} (${modelData.category})`);

            // Scrape detailed model information
            const specs = await this.scrapeModelDetails(modelData);
            if (!specs) {
                this.progress.failed++;
                return;
            }

            // Download images
            const modelDir = path.join(
                this.baseImageDir,
                'Honda',
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
                    await this.delay(1000); // Small delay between image downloads

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
            this.log(`Saved specification data for ${this.specData.length} Honda models`);
        } catch (error) {
            this.log(`Error saving spec data: ${error.message}`);
        }
    }

    async run() {
        try {
            this.log('🚀 Starting Honda Official Website Scraper...');
            this.loadProgress();
            this.loadFailedUrls();

            // Scrape current Honda models from official website
            const currentModels = await this.scrapeHondaCurrentModels();
            
            if (currentModels.length === 0) {
                this.log('❌ No Honda models found on official website');
                return;
            }

            this.log(`📋 Found ${currentModels.length} current Honda models to process`);

            // Process each model
            for (const modelData of currentModels) {
                await this.processModel(modelData);
                await this.delay(this.delayBetweenRequests);
            }

            // Save collected specification data
            await this.saveSpecData();

            this.log('✅ Honda official scraper completed!');
            this.log(`📊 Final Stats: ${this.progress.processed} processed, ${this.progress.downloaded} images downloaded, ${this.progress.specs_collected} specs collected`);

        } catch (error) {
            this.log(`❌ Fatal error: ${error.message}`);
            console.error(error);
        }
    }
}

// Run the scraper
const scraper = new HondaOfficialScraper();
scraper.run().catch(console.error);
