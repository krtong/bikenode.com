import fs from 'fs';
import path from 'path';
import axios from 'axios';
import * as cheerio from 'cheerio';
import csv from 'csv-parser';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class CycleTraderScraper {
    constructor() {
        this.csvPath = '/Users/kevintong/Documents/Code/bikenode.com/database/data/motorcycles_updated.csv';
        this.baseImageDir = '/Users/kevintong/Documents/Code/bikenode.com/images/motorcycles';
        this.progressFile = '/Users/kevintong/Documents/Code/bikenode.com/scrapers/06_motorcycle_image_scrapers/data/progress/cycletrader_progress.json';
        this.failedUrlsFile = '/Users/kevintong/Documents/Code/bikenode.com/scrapers/06_motorcycle_image_scrapers/data/failed_urls/cycletrader_failed_urls.json';
        this.newMotorcyclesFile = '/Users/kevintong/Documents/Code/bikenode.com/scrapers/06_motorcycle_image_scrapers/data/analysis_results/cycletrader_new_motorcycles.json';
        
        this.motorcycles = [];
        this.newMotorcycles = [];
        this.progress = { processed: 0, downloaded: 0, failed: 0, skipped: 0, new_found: 0 };
        this.failedUrls = [];
        this.delayBetweenRequests = 2000; // 2 seconds between requests
        this.maxRetries = 3;
        
        this.userAgents = [
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
        ];
        
        // Popular motorcycle brands to search
        this.targetBrands = [
            'Honda', 'Yamaha', 'Kawasaki', 'Suzuki', 'Ducati', 'BMW', 'KTM', 
            'Harley-Davidson', 'Triumph', 'Aprilia', 'Indian', 'Buell', 'MV Agusta',
            'Can-Am', 'Royal Enfield', 'Husqvarna', 'Beta', 'Sherco', 'GasGas'
        ];
        
        // Recent model years to focus on
        this.targetYears = [2023, 2024, 2025];
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
                this.log(`Loaded progress: ${this.progress.processed} processed, ${this.progress.new_found} new motorcycles found`);
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

    async loadExistingMotorcycles() {
        return new Promise((resolve, reject) => {
            const motorcycles = new Set();
            
            fs.createReadStream(this.csvPath)
                .pipe(csv())
                .on('data', (row) => {
                    // Create unique identifier for existing motorcycles
                    const id = `${row.Make}_${row.Year}_${row.Model}_${row.Package}`.toLowerCase().replace(/\s+/g, '_');
                    motorcycles.add(id);
                })
                .on('end', () => {
                    this.existingMotorcycles = motorcycles;
                    this.log(`Loaded ${motorcycles.size} existing motorcycles for comparison`);
                    resolve();
                })
                .on('error', reject);
        });
    }

    async searchBrandModels(brand, year) {
        try {
            // CycleTrader search URL for specific brand and year
            const searchUrl = `https://www.cycletrader.com/motorcycles-for-sale/${brand.toLowerCase()}/${year}/`;
            
            this.log(`Searching ${brand} ${year} motorcycles: ${searchUrl}`);
            await this.delay(this.delayBetweenRequests);

            const response = await axios.get(searchUrl, {
                headers: {
                    'User-Agent': this.getRandomUserAgent(),
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Accept-Encoding': 'gzip, deflate',
                    'Connection': 'keep-alive',
                    'Upgrade-Insecure-Requests': '1'
                },
                timeout: 30000
            });

            const $ = cheerio.load(response.data);
            const foundModels = [];

            // CycleTrader listing structure
            $('.listing-row, .item-card, .vehicle-card').each((index, element) => {
                const $card = $(element);
                const title = $card.find('.item-title, .listing-title, h3, h4').text().trim();
                const link = $card.find('a').attr('href');
                const price = $card.find('.price, .asking-price').text().trim();
                const location = $card.find('.dealer-info, .location').text().trim();
                const imageUrl = $card.find('img').attr('src') || $card.find('img').attr('data-src');

                if (title && title.toLowerCase().includes(brand.toLowerCase())) {
                    // Parse title to extract model information
                    const titleParts = title.split(' ');
                    const modelMatch = title.match(new RegExp(`${brand}\\s+(.+?)(?:\\s+\\d|$)`, 'i'));
                    const model = modelMatch ? modelMatch[1].trim() : titleParts.slice(1, 3).join(' ');

                    foundModels.push({
                        brand,
                        year,
                        model,
                        title,
                        url: link ? (link.startsWith('http') ? link : `https://www.cycletrader.com${link}`) : null,
                        price,
                        location,
                        imageUrl: imageUrl ? (imageUrl.startsWith('http') ? imageUrl : `https://www.cycletrader.com${imageUrl}`) : null,
                        source: 'CycleTrader'
                    });
                }
            });

            this.log(`Found ${foundModels.length} ${brand} ${year} models on CycleTrader`);
            return foundModels;

        } catch (error) {
            this.log(`Error searching ${brand} ${year}: ${error.message}`);
            return [];
        }
    }

    async getModelDetails(modelData) {
        try {
            if (!modelData.url) return null;

            this.log(`Getting details for: ${modelData.title}`);
            await this.delay(this.delayBetweenRequests);

            const response = await axios.get(modelData.url, {
                headers: {
                    'User-Agent': this.getRandomUserAgent(),
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
                },
                timeout: 30000
            });

            const $ = cheerio.load(response.data);
            
            // Extract detailed information
            const details = {
                ...modelData,
                images: [],
                specifications: {},
                description: '',
                vin: '',
                mileage: '',
                engine: '',
                transmission: ''
            };

            // Extract multiple images
            $('.gallery img, .photo-gallery img, .vehicle-photos img').each((index, img) => {
                const src = $(img).attr('src') || $(img).attr('data-src');
                if (src && !details.images.includes(src)) {
                    details.images.push(src.startsWith('http') ? src : `https://www.cycletrader.com${src}`);
                }
            });

            // Extract specifications
            $('.specs-table tr, .vehicle-details tr, .specifications tr').each((index, row) => {
                const $row = $(row);
                const label = $row.find('td:first-child, th:first-child').text().trim();
                const value = $row.find('td:last-child, th:last-child').text().trim();
                if (label && value && label !== value) {
                    details.specifications[label] = value;
                }
            });

            // Extract description
            details.description = $('.description, .vehicle-description').text().trim();

            // Extract specific details
            details.vin = $('.vin, .vehicle-id').text().trim();
            details.mileage = $('.mileage, .odometer').text().trim();
            details.engine = $('.engine-size, .displacement').text().trim();
            details.transmission = $('.transmission-type').text().trim();

            return details;

        } catch (error) {
            this.log(`Error getting details for ${modelData.title}: ${error.message}`);
            return null;
        }
    }

    isNewMotorcycle(modelData) {
        const id = `${modelData.brand}_${modelData.year}_${modelData.model}_standard`.toLowerCase().replace(/\s+/g, '_');
        return !this.existingMotorcycles.has(id);
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
            // Get detailed information
            const details = await this.getModelDetails(modelData);
            if (!details) {
                this.progress.failed++;
                return;
            }

            // Check if this is a new motorcycle not in our database
            if (this.isNewMotorcycle(modelData)) {
                this.newMotorcycles.push(details);
                this.progress.new_found++;
                this.log(`NEW MOTORCYCLE FOUND: ${modelData.brand} ${modelData.year} ${modelData.model}`);
            }

            // Download images if available
            const modelDir = path.join(
                this.baseImageDir,
                modelData.brand,
                modelData.year.toString(),
                this.sanitizeFilename(modelData.model),
                'CycleTrader'
            );

            let downloadedCount = 0;
            for (let i = 0; i < Math.min(details.images.length, 3); i++) {
                try {
                    const imageUrl = details.images[i];
                    const extension = path.extname(new URL(imageUrl).pathname) || '.jpg';
                    const imagePath = path.join(modelDir, `cycletrader_${i + 1}${extension}`);

                    await this.downloadImage(imageUrl, imagePath);
                    downloadedCount++;
                    await this.delay(500); // Small delay between image downloads

                } catch (error) {
                    this.log(`Failed to download image ${i + 1} for ${modelData.title}: ${error.message}`);
                }
            }

            this.progress.processed++;
            this.progress.downloaded += downloadedCount;
            this.saveProgress();

        } catch (error) {
            this.log(`Error processing ${modelData.title}: ${error.message}`);
            this.progress.failed++;
            this.saveProgress();
        }
    }

    sanitizeFilename(name) {
        return name.replace(/[^a-zA-Z0-9\-_\s]/g, '').replace(/\s+/g, '_').substring(0, 50);
    }

    async saveNewMotorcycles() {
        try {
            const dir = path.dirname(this.newMotorcyclesFile);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(this.newMotorcyclesFile, JSON.stringify(this.newMotorcycles, null, 2));
            this.log(`Saved ${this.newMotorcycles.length} new motorcycles to JSON file`);
        } catch (error) {
            this.log(`Error saving new motorcycles: ${error.message}`);
        }
    }

    async run() {
        try {
            this.log('🚀 Starting CycleTrader Motorcycle Scraper...');
            this.loadProgress();

            // Load existing motorcycles for comparison
            await this.loadExistingMotorcycles();

            // Search each brand and year combination
            for (const brand of this.targetBrands) {
                for (const year of this.targetYears) {
                    const models = await this.searchBrandModels(brand, year);
                    
                    // Process each model found
                    for (const modelData of models.slice(0, 5)) { // Limit to 5 per brand/year for testing
                        await this.processModel(modelData);
                        await this.delay(this.delayBetweenRequests);
                    }
                }
            }

            // Save new motorcycles found
            await this.saveNewMotorcycles();

            this.log('✅ CycleTrader scraper completed!');
            this.log(`📊 Final Stats: ${this.progress.processed} processed, ${this.progress.downloaded} images downloaded, ${this.progress.new_found} new motorcycles found`);

        } catch (error) {
            this.log(`❌ Fatal error: ${error.message}`);
            console.error(error);
        }
    }
}

// Run the scraper
const scraper = new CycleTraderScraper();
scraper.run().catch(console.error);
