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

class MotorcycleImageScraper {
    constructor() {
        this.csvPath = '/Users/kevintong/Documents/Code/bikenode.com/database/data/motorcycles_updated.csv';
        this.baseImageDir = '/Users/kevintong/Documents/Code/bikenode.com/images/motorcycles';
        this.progressFile = '/Users/kevintong/Documents/Code/bikenode.com/scrapers/06_motorcycle_image_scrapers/data/progress/motorcycle_scraper_progress.json';
        this.failedUrlsFile = '/Users/kevintong/Documents/Code/bikenode.com/scrapers/06_motorcycle_image_scrapers/data/failed_urls/motorcycle_failed_urls.json';
        
        this.motorcycles = [];
        this.progress = { processed: 0, downloaded: 0, failed: 0, skipped: 0 };
        this.failedUrls = [];
        this.batchSize = 50;
        this.delayBetweenRequests = 5000; // 5 seconds delay between requests
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

    async loadMotorcycles() {
        return new Promise((resolve, reject) => {
            const motorcycles = [];
            
            fs.createReadStream(this.csvPath)
                .pipe(csv())
                .on('data', (row) => {
                    motorcycles.push({
                        year: row.Year,
                        make: row.Make,
                        model: row.Model,
                        package: row.Package || '',
                        category: row.Category,
                        engine: row.Engine
                    });
                })
                .on('end', () => {
                    this.motorcycles = motorcycles;
                    console.log(`📊 Loaded ${motorcycles.length} motorcycles from CSV`);
                    resolve(motorcycles);
                })
                .on('error', reject);
        });
    }

    generateSearchQuery(motorcycle) {
        // Create more specific search query to reduce irrelevant results
        let query = `"${motorcycle.year} ${motorcycle.make} ${motorcycle.model}"`;
        if (motorcycle.package && motorcycle.package.trim()) {
            query += ` "${motorcycle.package}"`;
        }
        query += ' motorcycle -drawing -toy -model -miniature';
        
        return query.replace(/[^\w\s"-]/g, '').replace(/\s+/g, ' ').trim();
    }

    async searchGoogleImages(query, maxResults = 5) {
        try {
            // Use multiple search strategies to avoid rate limits
            const strategies = [
                () => this.searchBingImages(query, maxResults),
                () => this.searchDuckDuckGoImages(query, maxResults),
                () => this.searchGoogleImagesDirect(query, maxResults)
            ];

            for (const strategy of strategies) {
                try {
                    const images = await strategy();
                    if (images.length > 0) {
                        return images;
                    }
                } catch (error) {
                    console.log(`Search strategy failed: ${error.message}`);
                    continue;
                }
            }

            return [];
        } catch (error) {
            console.error(`Error in image search for "${query}":`, error.message);
            return [];
        }
    }

    async searchGoogleImagesDirect(query, maxResults = 5) {
        try {
            const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&tbm=isch&safe=active`;
            const userAgent = this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
            
            const response = await axios.get(searchUrl, {
                headers: {
                    'User-Agent': userAgent,
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Accept-Encoding': 'gzip, deflate',
                    'Connection': 'keep-alive'
                },
                timeout: 15000
            });

            const $ = cheerio.load(response.data);
            const imageUrls = [];

            // Extract image URLs from Google Images results
            $('img').each((i, elem) => {
                if (imageUrls.length >= maxResults) return false;
                
                const src = $(elem).attr('src');
                const dataSrc = $(elem).attr('data-src');
                const url = dataSrc || src;
                
                if (url && url.startsWith('http') && !url.includes('google.com') && !url.includes('gstatic.com')) {
                    imageUrls.push(url);
                }
            });

            return imageUrls;
        } catch (error) {
            throw new Error(`Google Images search failed: ${error.message}`);
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

            // Also try data attributes
            $('[data-src]').each((i, elem) => {
                if (imageUrls.length >= maxResults) return false;
                
                const dataSrc = $(elem).attr('data-src');
                if (dataSrc && dataSrc.startsWith('http') && !dataSrc.includes('bing.com')) {
                    imageUrls.push(dataSrc);
                }
            });

            return imageUrls;
        } catch (error) {
            throw new Error(`Bing Images search failed: ${error.message}`);
        }
    }

    async searchDuckDuckGoImages(query, maxResults = 5) {
        try {
            const searchUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query)}&t=h_&iax=images&ia=images`;
            const userAgent = this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
            
            const response = await axios.get(searchUrl, {
                headers: {
                    'User-Agent': userAgent
                },
                timeout: 15000
            });

            const $ = cheerio.load(response.data);
            const imageUrls = [];

            // DuckDuckGo uses different selectors
            $('img').each((i, elem) => {
                if (imageUrls.length >= maxResults) return false;
                
                const src = $(elem).attr('src');
                const dataSrc = $(elem).attr('data-src');
                const url = dataSrc || src;
                
                if (url && url.startsWith('http') && !url.includes('duckduckgo.com')) {
                    imageUrls.push(url);
                }
            });

            return imageUrls;
        } catch (error) {
            throw new Error(`DuckDuckGo Images search failed: ${error.message}`);
        }
    }

    async searchManufacturerWebsite(motorcycle) {
        try {
            const manufacturerUrls = {
                'Ducati': 'https://www.ducati.com',
                'Honda': 'https://www.honda.com',
                'Yamaha': 'https://www.yamaha-motor.com',
                'Kawasaki': 'https://www.kawasaki.com',
                'Suzuki': 'https://www.suzuki.com',
                'BMW': 'https://www.bmw-motorrad.com',
                'Harley-Davidson': 'https://www.harley-davidson.com',
                'KTM': 'https://www.ktm.com',
                'Triumph': 'https://www.triumphmotorcycles.com'
            };

            const baseUrl = manufacturerUrls[motorcycle.make];
            if (!baseUrl) return [];

            // Search for the specific motorcycle model on manufacturer website
            const searchQuery = `${motorcycle.model} ${motorcycle.year}`.toLowerCase();
            const searchUrl = `${baseUrl}/search?q=${encodeURIComponent(searchQuery)}`;
            
            // This is a simplified approach - in practice, each manufacturer has different URL structures
            return [];
        } catch (error) {
            console.error(`Error searching manufacturer website for ${motorcycle.make}:`, error.message);
            return [];
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

    async processMotorcycle(motorcycle, index) {
        try {
            const searchQuery = this.generateSearchQuery(motorcycle);
            console.log(`🔍 [${index + 1}/${this.motorcycles.length}] Searching for: ${searchQuery}`);
            
            // Search for images with retry logic
            let imageUrls = [];
            let retryCount = 0;
            
            while (imageUrls.length === 0 && retryCount < this.maxRetries) {
                try {
                    imageUrls = await this.searchGoogleImages(searchQuery, 3);
                    if (imageUrls.length === 0) {
                        retryCount++;
                        if (retryCount < this.maxRetries) {
                            console.log(`⏳ Retry ${retryCount}/${this.maxRetries} for ${searchQuery}`);
                            await new Promise(resolve => setTimeout(resolve, this.delayBetweenRequests * retryCount));
                        }
                    }
                } catch (error) {
                    retryCount++;
                    console.log(`❌ Search error (attempt ${retryCount}): ${error.message}`);
                    if (retryCount < this.maxRetries) {
                        await new Promise(resolve => setTimeout(resolve, this.delayBetweenRequests * retryCount));
                    }
                }
            }
            
            if (imageUrls.length === 0) {
                console.log(`⚠️  No images found for ${searchQuery} after ${this.maxRetries} attempts`);
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
                    // Validate image quality before downloading
                    const isValidImage = await this.validateImageQuality(imageUrl);
                    if (!isValidImage) {
                        console.log(`⚠️  Skipping low-quality image: ${imageUrl}`);
                        continue;
                    }
                    
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

    async validateImageQuality(url) {
        try {
            // Head request to check image dimensions without downloading
            const response = await axios.head(url, {
                timeout: 10000,
                headers: { 'User-Agent': this.userAgents[0] }
            });
            
            // Skip if content-length suggests tiny image - increased threshold
            const contentLength = parseInt(response.headers['content-length']);
            if (contentLength && contentLength < 5000) { // Less than 5KB likely thumbnail/icon
                console.log(`⚠️  Skipping small image (${contentLength} bytes): ${url}`);
                this.progress.skipped++;
                return false;
            }
            
            // Enhanced URL pattern filtering for thumbnails and low-quality images
            const lowQualityPatterns = [
                'thumb', 'small', 'tiny', 'icon', 'logo', 'badge',
                '150x', '200x', '100x', '50x', '75x', '120x',
                '_s.', '_t.', '_m.', '_xs.', '_sm.',
                'thumbnail', 'preview', 'mini', 'micro',
                'favicon', 'sprite', 'tile',
                '1x1', '2x2', '10x10', '20x20', '50x50'
            ];
            
            const urlLower = url.toLowerCase();
            for (const pattern of lowQualityPatterns) {
                if (urlLower.includes(pattern)) {
                    console.log(`⚠️  Skipping URL with pattern '${pattern}': ${url}`);
                    this.progress.skipped++;
                    return false;
                }
            }
            
            // Skip images from known ad/tracking domains
            const blacklistedDomains = [
                'doubleclick.net', 'googleadservices.com', 'googlesyndication.com',
                'facebook.com', 'fbcdn.net', 'twitter.com', 'instagram.com',
                'amazon-adsystem.com', 'googletagmanager.com', 'google-analytics.com'
            ];
            
            for (const domain of blacklistedDomains) {
                if (urlLower.includes(domain)) {
                    console.log(`⚠️  Skipping blacklisted domain: ${domain}`);
                    this.progress.skipped++;
                    return false;
                }
            }
            
            return true;
        } catch (error) {
            console.log(`⚠️  Error validating image quality: ${error.message}`);
            return false; // Skip problematic URLs
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

    async run() {
        console.log('🏍️  Starting Motorcycle Image Scraper...');
        
        try {
            await this.loadMotorcycles();
            
            // Filter motorcycles to focus on modern ones (1950+) for better image availability
            const modernMotorcycles = this.motorcycles.filter(motorcycle => {
                const year = parseInt(motorcycle.year);
                return year >= 1950; // Focus on motorcycles from 1950 onwards
            });
            
            console.log(`📊 Filtered to ${modernMotorcycles.length} modern motorcycles (1950+) out of ${this.motorcycles.length} total`);
            
            const startIndex = this.progress.processed || 0;
            const motorcyclesToProcess = modernMotorcycles.slice(startIndex);
            
            console.log(`🚀 Processing ${motorcyclesToProcess.length} motorcycles (starting from index ${startIndex})`);
            
            for (let i = 0; i < motorcyclesToProcess.length; i++) {
                await this.processMotorcycle(motorcyclesToProcess[i], startIndex + i);
                
                // Save progress every 10 motorcycles
                if ((i + 1) % 10 === 0) {
                    this.saveProgress();
                    this.saveFailedUrls();
                    console.log(`📊 Progress: ${this.progress.processed}/${modernMotorcycles.length} processed, ${this.progress.downloaded} downloaded, ${this.progress.failed} failed, ${this.progress.skipped} skipped`);
                }
                
                // Delay between requests to be respectful
                if (i < motorcyclesToProcess.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, this.delayBetweenRequests));
                }
            }
            
            // Final save
            this.saveProgress();
            this.saveFailedUrls();
            
            console.log('🎉 Motorcycle image scraping completed!');
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
    const scraper = new MotorcycleImageScraper();
    scraper.run().catch(console.error);
}

export default MotorcycleImageScraper;
