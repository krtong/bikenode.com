import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import csv from 'csv-parser';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class Ducati2025ImageScraper {
    constructor() {
        this.csvPath = '/Users/kevintong/Documents/Code/bikenode.com/database/data/motorcycles_updated.csv';
        this.baseImageDir = '/Users/kevintong/Documents/Code/bikenode.com/images/motorcycles';
        this.progressFile = '/Users/kevintong/Documents/Code/bikenode.com/scrapers/06_motorcycle_image_scrapers/data/progress/ducati_2025_progress.json';
        this.failedUrlsFile = '/Users/kevintong/Documents/Code/bikenode.com/scrapers/06_motorcycle_image_scrapers/data/failed_urls/ducati_2025_failed_urls.json';
        
        this.motorcycles = [];
        this.progress = { processed: 0, downloaded: 0, failed: 0, skipped: 0 };
        this.failedUrls = [];
        this.delayBetweenRequests = 3000; // 3 seconds delay
        this.maxRetries = 3;
        
        this.userAgents = [
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        ];
        
        // Load progress if exists
        this.loadProgress();
        this.loadFailedUrls();
        
        // Create base directory
        if (!fs.existsSync(this.baseImageDir)) {
            fs.mkdirSync(this.baseImageDir, { recursive: true });
        }
    }

    loadProgress() {
        try {
            if (fs.existsSync(this.progressFile)) {
                this.progress = JSON.parse(fs.readFileSync(this.progressFile, 'utf8'));
                console.log(`📊 Loaded progress: ${this.progress.processed} processed, ${this.progress.downloaded} downloaded`);
            }
        } catch (error) {
            console.error('Error loading progress:', error.message);
        }
    }

    saveProgress() {
        try {
            fs.writeFileSync(this.progressFile, JSON.stringify(this.progress, null, 2));
        } catch (error) {
            console.error('Error saving progress:', error.message);
        }
    }

    loadFailedUrls() {
        try {
            if (fs.existsSync(this.failedUrlsFile)) {
                this.failedUrls = JSON.parse(fs.readFileSync(this.failedUrlsFile, 'utf8'));
                console.log(`⚠️  Loaded ${this.failedUrls.length} failed URLs`);
            }
        } catch (error) {
            console.error('Error loading failed URLs:', error.message);
            this.failedUrls = [];
        }
    }

    saveFailedUrls() {
        try {
            fs.writeFileSync(this.failedUrlsFile, JSON.stringify(this.failedUrls, null, 2));
        } catch (error) {
            console.error('Error saving failed URLs:', error.message);
        }
    }

    async loadDucati2025Motorcycles() {
        return new Promise((resolve, reject) => {
            const motorcycles = [];
            
            fs.createReadStream(this.csvPath)
                .pipe(csv())
                .on('data', (row) => {
                    // Filter for 2025 Ducati motorcycles only
                    if (row.Year === '2025' && row.Make === 'Ducati') {
                        motorcycles.push({
                            year: row.Year,
                            make: row.Make,
                            model: row.Model,
                            package: row.Package || '',
                            category: row.Category,
                            engine: row.Engine
                        });
                    }
                })
                .on('end', () => {
                    this.motorcycles = motorcycles;
                    console.log(`🏍️  Loaded ${motorcycles.length} 2025 Ducati motorcycles from CSV`);
                    resolve(motorcycles);
                })
                .on('error', reject);
        });
    }

    generateSearchQuery(motorcycle) {
        let query = `${motorcycle.year} Ducati ${motorcycle.model}`;
        if (motorcycle.package && motorcycle.package.trim()) {
            query += ` ${motorcycle.package}`;
        }
        return query.replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
    }

    async searchDucatiWebsite(motorcycle) {
        try {
            // Try Ducati's official website first
            const query = `${motorcycle.model} ${motorcycle.package || ''}`.trim();
            const searchUrl = `https://www.ducati.com/us/en/bikes/search?q=${encodeURIComponent(query)}`;
            
            const userAgent = this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
            const response = await axios.get(searchUrl, {
                headers: { 'User-Agent': userAgent },
                timeout: 15000
            });

            const $ = cheerio.load(response.data);
            const imageUrls = [];

            // Extract images from Ducati website
            $('img').each((i, elem) => {
                if (imageUrls.length >= 5) return false;
                
                const src = $(elem).attr('src');
                const dataSrc = $(elem).attr('data-src');
                const url = dataSrc || src;
                
                if (url && (url.includes('ducati') || url.startsWith('http'))) {
                    const fullUrl = url.startsWith('/') ? `https://www.ducati.com${url}` : url;
                    if (fullUrl.match(/\.(jpg|jpeg|png|webp)/i)) {
                        imageUrls.push(fullUrl);
                    }
                }
            });

            return imageUrls;
        } catch (error) {
            console.log(`Ducati website search failed: ${error.message}`);
            return [];
        }
    }

    async searchBingImages(query, maxResults = 5) {
        try {
            const searchUrl = `https://www.bing.com/images/search?q=${encodeURIComponent(query)}&form=HDRSC2&first=1&tsc=ImageBasicHover`;
            const userAgent = this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
            
            const response = await axios.get(searchUrl, {
                headers: {
                    'User-Agent': userAgent,
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
                },
                timeout: 15000
            });

            const $ = cheerio.load(response.data);
            const imageUrls = [];

            // Extract image URLs from Bing Images results
            $('img.mimg').each((i, elem) => {
                if (imageUrls.length >= maxResults) return false;
                
                const src = $(elem).attr('src');
                if (src && src.startsWith('http') && !src.includes('bing.com/th')) {
                    imageUrls.push(src);
                }
            });

            return imageUrls;
        } catch (error) {
            throw new Error(`Bing Images search failed: ${error.message}`);
        }
    }

    createDirectoryStructure(motorcycle) {
        const dirPath = path.join(
            this.baseImageDir,
            this.sanitizeFilename(motorcycle.make),
            motorcycle.year.toString(),
            this.sanitizeFilename(motorcycle.model),
            motorcycle.package ? this.sanitizeFilename(motorcycle.package) : 'base'
        );
        
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
        
        return dirPath;
    }

    sanitizeFilename(name) {
        return name.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_').toLowerCase();
    }

    async downloadImage(url, filePath, retries = 0) {
        try {
            const userAgent = this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
            
            const response = await axios({
                method: 'GET',
                url: url,
                responseType: 'stream',
                headers: {
                    'User-Agent': userAgent,
                    'Accept': 'image/*,*/*;q=0.8'
                },
                timeout: 30000,
                maxRedirects: 5
            });

            // Ensure the directory exists
            const dir = path.dirname(filePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            // Create a write stream with the exact filename
            const writer = fs.createWriteStream(filePath);
            
            // Pipe the response data to the file
            response.data.pipe(writer);

            return new Promise((resolve, reject) => {
                writer.on('finish', () => {
                    // Verify file was created and has content
                    if (fs.existsSync(filePath) && fs.statSync(filePath).size > 0) {
                        resolve(true);
                    } else {
                        reject(new Error('File was not created properly'));
                    }
                });
                
                writer.on('error', (error) => {
                    // Clean up partial file
                    fs.unlink(filePath, () => {});
                    reject(error);
                });
                
                response.data.on('error', (error) => {
                    writer.destroy();
                    fs.unlink(filePath, () => {});
                    reject(error);
                });
            });

        } catch (error) {
            if (retries < this.maxRetries && (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT')) {
                console.log(`⏳ Retrying download (${retries + 1}/${this.maxRetries}): ${url}`);
                await new Promise(resolve => setTimeout(resolve, 1000 * (retries + 1)));
                return this.downloadImage(url, filePath, retries + 1);
            }
            throw error;
        }
    }

    getFileExtension(url) {
        try {
            // First try to get extension from URL path
            const urlObj = new URL(url);
            let pathname = urlObj.pathname.toLowerCase();
            
            // Remove query parameters if they exist
            pathname = pathname.split('?')[0];
            
            // Extract extension
            const match = pathname.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i);
            if (match) {
                return match[1];
            }
            
            // Try to detect from query parameters (sometimes extensions are in query params)
            const searchParams = urlObj.searchParams;
            for (const [key, value] of searchParams) {
                const extMatch = value.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i);
                if (extMatch) {
                    return extMatch[1];
                }
            }
            
            // Check for common image hosting patterns
            if (url.includes('images.unsplash') || url.includes('imgur')) {
                return 'jpg';
            }
            if (url.includes('.webp')) {
                return 'webp';
            }
            
            // Default fallback
            return 'jpg';
        } catch (error) {
            return 'jpg';
        }
    }

    async processMotorcycle(motorcycle, index) {
        try {
            const searchQuery = this.generateSearchQuery(motorcycle);
            console.log(`🔍 [${index + 1}/${this.motorcycles.length}] Searching for: ${searchQuery}`);
            
            // Try multiple sources
            let imageUrls = [];
            
            // First try Ducati's official website
            try {
                imageUrls = await this.searchDucatiWebsite(motorcycle);
                if (imageUrls.length > 0) {
                    console.log(`✅ Found ${imageUrls.length} images from Ducati website`);
                }
            } catch (error) {
                console.log(`Ducati website failed: ${error.message}`);
            }
            
            // If no images from Ducati site, try Bing
            if (imageUrls.length === 0) {
                try {
                    imageUrls = await this.searchBingImages(searchQuery, 3);
                    if (imageUrls.length > 0) {
                        console.log(`✅ Found ${imageUrls.length} images from Bing`);
                    }
                } catch (error) {
                    console.log(`Bing search failed: ${error.message}`);
                }
            }
            
            if (imageUrls.length === 0) {
                console.log(`⚠️  No images found for ${searchQuery}`);
                this.progress.failed++;
                return;
            }

            // Create directory structure
            const targetDir = this.createDirectoryStructure(motorcycle);
            let downloadedCount = 0;

            // Download images
            for (let i = 0; i < imageUrls.length && downloadedCount < 3; i++) {
                const imageUrl = imageUrls[i];
                const fileExtension = this.getFileExtension(imageUrl) || 'jpg';
                const fileName = `hero_${i + 1}.${fileExtension}`;
                const filePath = path.join(targetDir, fileName);

                // Skip if file already exists
                if (fs.existsSync(filePath)) {
                    console.log(`⏭️  Skipping existing file: ${fileName}`);
                    this.progress.skipped++;
                    downloadedCount++;
                    continue;
                }

                try {
                    await this.downloadImage(imageUrl, filePath);
                    console.log(`✅ Downloaded: ${fileName}`);
                    downloadedCount++;
                    this.progress.downloaded++;
                } catch (error) {
                    console.log(`❌ Failed to download ${imageUrl}: ${error.message}`);
                    this.failedUrls.push({
                        motorcycle: searchQuery,
                        url: imageUrl,
                        error: error.message,
                        timestamp: new Date().toISOString()
                    });
                }
            }

            if (downloadedCount === 0) {
                this.progress.failed++;
            }

        } catch (error) {
            console.error(`Error processing motorcycle ${index + 1}:`, error.message);
            this.progress.failed++;
        }

        this.progress.processed++;
    }

    async run() {
        console.log('🏍️  Starting 2025 Ducati Image Scraper...');
        
        try {
            await this.loadDucati2025Motorcycles();
            
            if (this.motorcycles.length === 0) {
                console.log('❌ No 2025 Ducati motorcycles found in database');
                return;
            }
            
            const startIndex = this.progress.processed || 0;
            const motorcyclesToProcess = this.motorcycles.slice(startIndex);
            
            console.log(`🚀 Processing ${motorcyclesToProcess.length} 2025 Ducati motorcycles (starting from index ${startIndex})`);
            
            for (let i = 0; i < motorcyclesToProcess.length; i++) {
                await this.processMotorcycle(motorcyclesToProcess[i], startIndex + i);
                
                // Save progress every 5 motorcycles
                if ((i + 1) % 5 === 0) {
                    this.saveProgress();
                    this.saveFailedUrls();
                    console.log(`📊 Progress: ${this.progress.processed}/${this.motorcycles.length} processed, ${this.progress.downloaded} downloaded, ${this.progress.failed} failed, ${this.progress.skipped} skipped`);
                }
                
                // Delay between requests
                if (i < motorcyclesToProcess.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, this.delayBetweenRequests));
                }
            }
            
            // Final save
            this.saveProgress();
            this.saveFailedUrls();
            
            console.log('🎉 2025 Ducati image scraping completed!');
            console.log(`📊 Final Stats: ${this.progress.processed} processed, ${this.progress.downloaded} downloaded, ${this.progress.failed} failed, ${this.progress.skipped} skipped`);
            
        } catch (error) {
            console.error('Fatal error:', error);
            this.saveProgress();
            this.saveFailedUrls();
        }
    }
}

// Run the scraper
if (import.meta.url === `file://${process.argv[1]}`) {
    const scraper = new Ducati2025ImageScraper();
    scraper.run().catch(console.error);
}

export default Ducati2025ImageScraper;
