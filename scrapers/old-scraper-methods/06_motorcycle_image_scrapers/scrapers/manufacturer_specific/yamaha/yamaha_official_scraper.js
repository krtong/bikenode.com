import fs from 'fs';
import path from 'path';
import axios from 'axios';
import * as cheerio from 'cheerio';
import csv from 'csv-parser';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class YamahaOfficialScraper {
    constructor() {
        this.csvPath = '/Users/kevintong/Documents/Code/bikenode.com/database/data/motorcycles_updated.csv';
        this.baseImageDir = '/Users/kevintong/Documents/Code/bikenode.com/images/motorcycles';
        this.progressFile = '/Users/kevintong/Documents/Code/bikenode.com/scrapers/06_motorcycle_image_scrapers/data/progress/yamaha_official_progress.json';
        this.failedUrlsFile = '/Users/kevintong/Documents/Code/bikenode.com/scrapers/06_motorcycle_image_scrapers/data/failed_urls/yamaha_official_failed_urls.json';
        this.specDataFile = '/Users/kevintong/Documents/Code/bikenode.com/scrapers/06_motorcycle_image_scrapers/data/analysis_results/yamaha_specs.json';
        
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
        
        // Yamaha motorcycle categories and their official pages
        this.yamahaCategories = {
            supersport: 'https://www.yamahamotorsports.com/motorcycles/supersport',
            sport: 'https://www.yamahamotorsports.com/motorcycles/sport',
            touring: 'https://www.yamahamotorsports.com/motorcycles/sport-touring',
            adventure: 'https://www.yamahamotorsports.com/motorcycles/adventure-touring',
            cruiser: 'https://www.yamahamotorsports.com/motorcycles/cruiser',
            standard: 'https://www.yamahamotorsports.com/motorcycles/sport-heritage',
            dual_sport: 'https://www.yamahamotorsports.com/motorcycles/dual-sport',
            trail: 'https://www.yamahamotorsports.com/motorcycles/trail',
            motocross: 'https://www.yamahamotorsports.com/motorcycles/motocross',
            scooter: 'https://www.yamahamotorsports.com/scooters'
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

    async scrapeYamahaCurrentModels() {
        this.log('🏍️ Scraping current Yamaha models from official website...');
        const currentModels = [];

        for (const [category, url] of Object.entries(this.yamahaCategories)) {
            try {
                this.log(`Scraping ${category} category: ${url}`);
                await this.delay(this.delayBetweenRequests);

                const response = await axios.get(url, {
                    headers: {
                        'User-Agent': this.getRandomUserAgent(),
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                        'Accept-Language': 'en-US,en;q=0.5',
                        'Accept-Encoding': 'gzip, deflate',
                        'Connection': 'keep-alive'
                    },
                    timeout: 30000
                });

                const $ = cheerio.load(response.data);
                
                // Yamaha website structure analysis
                $('.vehicle-tile, .model-card, .product-card, .bike-card').each((index, element) => {
                    const $card = $(element);
                    const modelName = $card.find('h3, .model-name, .title, .bike-name').text().trim();
                    const modelLink = $card.find('a').attr('href');
                    const imageUrl = $card.find('img').attr('src') || $card.find('img').attr('data-src');
                    const price = $card.find('.price, .msrp, .starting-at').text().trim();

                    if (modelName && modelLink) {
                        currentModels.push({
                            category,
                            model: modelName,
                            url: modelLink.startsWith('http') ? modelLink : `https://www.yamahamotorsports.com${modelLink}`,
                            imageUrl: imageUrl && imageUrl.startsWith('http') ? imageUrl : 
                                     imageUrl ? `https://www.yamahamotorsports.com${imageUrl}` : null,
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

        this.log(`Total current Yamaha models found: ${currentModels.length}`);
        return currentModels;
    }

    async scrapeModelDetails(modelData) {
        try {
            this.log(`Scraping details for: ${modelData.model}`);
            await this.delay(this.delayBetweenRequests);

            const response = await axios.get(modelData.url, {
                headers: {
                    'User-Agent': this.getRandomUserAgent(),
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
                },
                timeout: 30000
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

            // Extract images from various Yamaha page structures
            $('.hero-image img, .gallery img, .model-image img, .bike-image img, .product-image img').each((index, img) => {
                const src = $(img).attr('src') || $(img).attr('data-src');
                if (src && !specs.images.includes(src)) {
                    specs.images.push(src.startsWith('http') ? src : `https://www.yamahamotorsports.com${src}`);
                }
            });

            // Extract specifications from Yamaha's spec tables
            $('.spec-table tr, .specifications tr, .details-table tr, .tech-specs tr').each((index, row) => {
                const $row = $(row);
                const label = $row.find('td:first-child, th:first-child, .spec-label').text().trim();
                const value = $row.find('td:last-child, th:last-child, .spec-value').text().trim();
                if (label && value && label !== value) {
                    specs.specifications[label] = value;
                }
            });

            // Extract color options
            $('.color-option, .color-selector, .paint-option, .color-choice').each((index, colorEl) => {
                const colorName = $(colorEl).attr('title') || $(colorEl).attr('alt') || $(colorEl).text().trim();
                if (colorName) {
                    specs.colors.push(colorName);
                }
            });

            // Extract key features
            $('.feature-list li, .key-features li, .highlights li, .features li').each((index, feature) => {
                const featureText = $(feature).text().trim();
                if (featureText) {
                    specs.features.push(featureText);
                }
            });

            // Extract variants/trims
            $('.trim-selector option, .variant-option, .package-option, .model-variant').each((index, variant) => {
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
            this.log(`Processing Yamaha ${modelData.model} (${modelData.category})`);

            // Scrape detailed model information
            const specs = await this.scrapeModelDetails(modelData);
            if (!specs) {
                this.progress.failed++;
                return;
            }

            // Download images
            const modelDir = path.join(
                this.baseImageDir,
                'Yamaha',
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
            this.log(`Saved specification data for ${this.specData.length} Yamaha models`);
        } catch (error) {
            this.log(`Error saving spec data: ${error.message}`);
        }
    }

    async run() {
        try {
            this.log('🚀 Starting Yamaha Official Website Scraper...');
            this.loadProgress();

            // Scrape current Yamaha models from official website
            const currentModels = await this.scrapeYamahaCurrentModels();
            
            if (currentModels.length === 0) {
                this.log('❌ No Yamaha models found on official website');
                return;
            }

            this.log(`📋 Found ${currentModels.length} current Yamaha models to process`);

            // Process each model
            for (const modelData of currentModels) {
                await this.processModel(modelData);
                await this.delay(this.delayBetweenRequests);
            }

            // Save collected specification data
            await this.saveSpecData();

            this.log('✅ Yamaha official scraper completed!');
            this.log(`📊 Final Stats: ${this.progress.processed} processed, ${this.progress.downloaded} images downloaded, ${this.progress.specs_collected} specs collected`);

        } catch (error) {
            this.log(`❌ Fatal error: ${error.message}`);
            console.error(error);
        }
    }
}

// Run the scraper
const scraper = new YamahaOfficialScraper();
scraper.run().catch(console.error);
