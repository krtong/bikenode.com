#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class SuzukiOfficialScraper {
    constructor() {
        this.baseUrl = 'https://suzukicycles.com';
        this.imageDir = '/Users/kevintong/Documents/Code/bikenode.com/images/motorcycles/suzuki';
        this.progressFile = path.join(__dirname, '../../../data/progress/suzuki_scraper_progress.json');
        this.logFile = path.join(__dirname, '../../../logs/suzuki_scraper.log');
        
        this.progress = { processed: 0, downloaded: 0, failed: 0, skipped: 0 };
        this.userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
        this.delayBetweenRequests = 2000; // 2 seconds
        
        this.loadProgress();
        this.ensureDirectories();
    }

    ensureDirectories() {
        if (!fs.existsSync(this.imageDir)) {
            fs.mkdirSync(this.imageDir, { recursive: true });
        }
        
        const logDir = path.dirname(this.logFile);
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
        
        const progressDir = path.dirname(this.progressFile);
        if (!fs.existsSync(progressDir)) {
            fs.mkdirSync(progressDir, { recursive: true });
        }
    }

    log(message) {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] ${message}`;
        console.log(logMessage);
        
        try {
            fs.appendFileSync(this.logFile, logMessage + '\n');
        } catch (error) {
            console.error('Failed to write to log file:', error);
        }
    }

    loadProgress() {
        try {
            if (fs.existsSync(this.progressFile)) {
                this.progress = JSON.parse(fs.readFileSync(this.progressFile, 'utf8'));
                this.log(`📊 Loaded progress: ${this.progress.processed} processed, ${this.progress.downloaded} downloaded`);
            }
        } catch (error) {
            this.log('Error loading progress: ' + error.message);
        }
    }

    saveProgress() {
        try {
            fs.writeFileSync(this.progressFile, JSON.stringify(this.progress, null, 2));
        } catch (error) {
            this.log('Error saving progress: ' + error.message);
        }
    }

    async makeRequest(url, retries = 3) {
        for (let i = 0; i < retries; i++) {
            try {
                await this.sleep(this.delayBetweenRequests);
                
                const response = await axios.get(url, {
                    headers: {
                        'User-Agent': this.userAgent,
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                        'Accept-Language': 'en-US,en;q=0.5',
                        'Accept-Encoding': 'gzip, deflate',
                        'DNT': '1',
                        'Connection': 'keep-alive',
                        'Upgrade-Insecure-Requests': '1'
                    },
                    timeout: 30000
                });

                return response;
            } catch (error) {
                this.log(`❌ Request failed (attempt ${i + 1}/${retries}): ${error.message}`);
                if (i === retries - 1) throw error;
                await this.sleep(5000 * (i + 1)); // Exponential backoff
            }
        }
    }

    async downloadImage(imageUrl, fileName, category, year = 'unknown') {
        try {
            // Create category and year subdirectories
            const categoryDir = path.join(this.imageDir, category, year);
            if (!fs.existsSync(categoryDir)) {
                fs.mkdirSync(categoryDir, { recursive: true });
            }

            const filePath = path.join(categoryDir, fileName);
            
            // Skip if file already exists
            if (fs.existsSync(filePath)) {
                this.log(`⏭️  Skipping existing file: ${fileName}`);
                this.progress.skipped++;
                return true;
            }

            const response = await axios.get(imageUrl, {
                responseType: 'stream',
                headers: { 'User-Agent': this.userAgent },
                timeout: 30000
            });

            const writer = fs.createWriteStream(filePath);
            response.data.pipe(writer);

            return new Promise((resolve, reject) => {
                writer.on('finish', () => {
                    // Check file size
                    const stats = fs.statSync(filePath);
                    if (stats.size < 5000) { // Less than 5KB
                        fs.unlinkSync(filePath);
                        this.log(`🗑️  Deleted small image: ${fileName} (${stats.size} bytes)`);
                        this.progress.failed++;
                        resolve(false);
                    } else {
                        this.log(`✅ Downloaded: ${fileName} (${stats.size} bytes)`);
                        this.progress.downloaded++;
                        resolve(true);
                    }
                });
                writer.on('error', reject);
            });

        } catch (error) {
            this.log(`❌ Failed to download ${fileName}: ${error.message}`);
            this.progress.failed++;
            return false;
        }
    }

    async scrapeMotorcycleCategories() {
        try {
            this.log('🔍 Fetching Suzuki motorcycle categories...');
            
            // Try multiple Suzuki motorcycle URLs
            const urlsToTry = [
                'https://suzukicycles.com/motorcycles',
                'https://suzukicycles.com/street',
                'https://suzukicycles.com/sportbike',
                'https://suzukicycles.com/cruiser',
                'https://suzukicycles.com/adventure',
                'https://suzukicycles.com/touring',
                'https://suzukicycles.com/sport',
                'https://suzukicycles.com/naked',
                'https://suzukicycles.com/dual-sport'
            ];

            const categories = [];
            
            for (const url of urlsToTry) {
                try {
                    const response = await this.makeRequest(url);
                    const $ = cheerio.load(response.data);

                    // Multiple selectors for category detection
                    const categorySelectors = [
                        'a[href*="/motorcycle"]',
                        'a[href*="/bike"]',
                        'a[href*="/model"]',
                        'a[href*="/product"]',
                        '.category-link',
                        '.product-category',
                        '.bike-category',
                        '.model-link',
                        'nav a',
                        '.navigation a',
                        '.menu a'
                    ];

                    categorySelectors.forEach(selector => {
                        $(selector).each((index, element) => {
                            const href = $(element).attr('href');
                            const text = $(element).text().trim();
                            
                            if (href && text && text.length > 2 && !categories.some(cat => cat.url === href)) {
                                const fullUrl = href.startsWith('http') ? href : `${this.baseUrl}${href}`;
                                if (this.isValidCategoryUrl(fullUrl, text)) {
                                    categories.push({
                                        name: text,
                                        url: fullUrl,
                                        source: url
                                    });
                                }
                            }
                        });
                    });

                    // Also look for direct motorcycle model links
                    $('a').each((index, element) => {
                        const href = $(element).attr('href');
                        const text = $(element).text().trim();
                        
                        if (href && text && this.isMotorcycleModel(text)) {
                            const fullUrl = href.startsWith('http') ? href : `${this.baseUrl}${href}`;
                            if (!categories.some(cat => cat.url === fullUrl)) {
                                categories.push({
                                    name: text,
                                    url: fullUrl,
                                    source: url,
                                    type: 'model'
                                });
                            }
                        }
                    });

                    this.log(`Found ${categories.filter(c => c.source === url).length} categories/models from ${url}`);
                    await this.sleep(1000);

                } catch (error) {
                    this.log(`Failed to fetch ${url}: ${error.message}`);
                }
            }

            this.log(`📋 Found ${categories.length} total motorcycle categories/models`);
            
            // Log some examples
            if (categories.length > 0) {
                this.log('Sample categories found:');
                categories.slice(0, 10).forEach(cat => {
                    this.log(`  - ${cat.name} (${cat.type || 'category'}) from ${cat.source}`);
                });
            }
            
            return categories;

        } catch (error) {
            this.log(`❌ Error fetching categories: ${error.message}`);
            return [];
        }
    }

    isValidCategoryUrl(url, text) {
        const validPatterns = [
            'motorcycle', 'bike', 'sport', 'cruiser', 'touring', 'adventure',
            'naked', 'dual', 'street', 'gsxr', 'gsx', 'sv', 'burgman', 'katana'
        ];
        
        const urlLower = url.toLowerCase();
        const textLower = text.toLowerCase();
        
        return validPatterns.some(pattern => 
            urlLower.includes(pattern) || textLower.includes(pattern)
        );
    }

    isMotorcycleModel(text) {
        const modelPatterns = [
            'gsx', 'gsxr', 'sv650', 'sv1000', 'katana', 'burgman', 'hayabusa',
            'boulevard', 'v-strom', 'vstrom', 'dr', 'rmz', 'rm-z'
        ];
        
        const textLower = text.toLowerCase();
        return modelPatterns.some(pattern => textLower.includes(pattern)) ||
               /\b(gsx|sv|dr|rm)\s*-?\s*\d+/i.test(text);
    }

    async scrapeModelImages(categoryUrl, categoryName) {
        try {
            this.log(`🔍 Scraping images from category: ${categoryName}`);
            const response = await this.makeRequest(categoryUrl);
            const $ = cheerio.load(response.data);

            const imageUrls = [];
            
            // Look for high-quality motorcycle images
            $('img').each((index, element) => {
                const src = $(element).attr('src') || $(element).attr('data-src');
                const alt = $(element).attr('alt') || '';
                
                if (src && this.isValidMotorcycleImage(src, alt)) {
                    const fullUrl = src.startsWith('http') ? src : `${this.baseUrl}${src}`;
                    imageUrls.push(fullUrl);
                }
            });

            this.log(`📷 Found ${imageUrls.length} potential images in ${categoryName}`);

            // Download images
            for (let i = 0; i < imageUrls.length; i++) {
                const imageUrl = imageUrls[i];
                const fileName = `${categoryName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${i + 1}.jpg`;
                
                await this.downloadImage(imageUrl, fileName, categoryName.toLowerCase());
                this.progress.processed++;
                
                // Save progress every 10 images
                if (this.progress.processed % 10 === 0) {
                    this.saveProgress();
                }
            }

        } catch (error) {
            this.log(`❌ Error scraping category ${categoryName}: ${error.message}`);
        }
    }

    isValidMotorcycleImage(src, alt) {
        // Skip thumbnails, icons, and low-quality images
        const lowQualityPatterns = [
            'thumb', 'icon', 'logo', 'banner', 'nav', 'menu',
            'button', 'arrow', 'search', 'social', 'footer',
            '/small/', '/xs/', '/thumbnail/', '/150x', '/200x',
            'pixel.gif', 'spacer.gif', 'transparent.png'
        ];

        const srcLower = src.toLowerCase();
        const altLower = alt.toLowerCase();

        // Check for low-quality patterns
        if (lowQualityPatterns.some(pattern => srcLower.includes(pattern))) {
            return false;
        }

        // Must be an image file
        if (!srcLower.match(/\.(jpg|jpeg|png|webp)(\?|$)/)) {
            return false;
        }

        // Prefer images with motorcycle-related alt text
        const motorcycleKeywords = ['motorcycle', 'bike', 'suzuki', 'model', 'sport', 'touring', 'adventure', 'cruiser'];
        const hasMotorcycleKeyword = motorcycleKeywords.some(keyword => 
            altLower.includes(keyword) || srcLower.includes(keyword)
        );

        return hasMotorcycleKeyword || altLower.length > 5; // Accept if has motorcycle keywords or descriptive alt text
    }

    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async start() {
        this.log('🚀 Starting Suzuki Official Scraper...');
        
        try {
            const categories = await this.scrapeMotorcycleCategories();
            
            if (categories.length === 0) {
                this.log('❌ No categories found. Exiting.');
                return;
            }

            for (const category of categories) {
                await this.scrapeModelImages(category.url, category.name);
                await this.sleep(3000); // Wait between categories
            }

            this.log('✅ Suzuki scraper completed successfully!');
            this.log(`📊 Final stats: ${this.progress.downloaded} downloaded, ${this.progress.failed} failed, ${this.progress.skipped} skipped`);

        } catch (error) {
            this.log(`💥 Fatal error: ${error.message}`);
        } finally {
            this.saveProgress();
        }
    }
}

// Run the scraper
if (import.meta.url === `file://${process.argv[1]}`) {
    const scraper = new SuzukiOfficialScraper();
    scraper.start().catch(console.error);
}

export default SuzukiOfficialScraper;
