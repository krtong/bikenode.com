const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');
const https = require('https');
const { URL } = require('url');

class BennettsScraper {
    constructor() {
        this.baseUrl = 'https://www.bennetts.co.uk';
        this.reviewsUrl = '/bikesocial/reviews/bikes';
        this.browser = null;
        this.page = null;
        this.scraped_data = {
            reviews: [],
            images: [],
            manufacturers: new Set(),
            models: new Set()
        };
        
        // Ensure output directories exist
        this.setupDirectories();
    }

    async setupDirectories() {
        const dirs = [
            './scraped_data',
            './scraped_data/reviews',
            './scraped_data/images',
            './scraped_data/images/motorcycles',
            './scraped_data/images/thumbnails',
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
            headless: true,
            defaultViewport: { width: 1920, height: 1080 },
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage'
            ]
        });
        
        this.page = await this.browser.newPage();
        await this.page.setUserAgent(
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        );
        
        // Block unnecessary resources to speed up scraping
        await this.page.setRequestInterception(true);
        this.page.on('request', (req) => {
            const resourceType = req.resourceType();
            if (['stylesheet', 'font'].includes(resourceType)) {
                req.abort();
            } else {
                req.continue();
            }
        });
    }

    async closeBrowser() {
        if (this.browser) {
            await this.browser.close();
        }
    }

    async getAllReviewUrls(maxPages = null) {
        console.log('📋 Getting all review URLs...');
        const reviewUrls = [];
        let currentPage = 1;
        let hasMorePages = true;

        while (hasMorePages && (maxPages === null || currentPage <= maxPages)) {
            console.log(`📄 Scraping page ${currentPage}...`);
            
            const pageUrl = currentPage === 1 
                ? `${this.baseUrl}${this.reviewsUrl}`
                : `${this.baseUrl}${this.reviewsUrl}?page=${currentPage}`;
            
            await this.page.goto(pageUrl, { waitUntil: 'networkidle2' });
            
            // Wait for content to load
            await this.page.waitForSelector('article', { timeout: 10000 });
            
            // Extract review URLs from current page
            const pageReviewUrls = await this.page.evaluate(() => {
                const links = document.querySelectorAll('a[href*="/reviews/bikes/"]');
                const urls = [];
                
                links.forEach(link => {
                    const href = link.getAttribute('href');
                    if (href && href.includes('/reviews/bikes/') && 
                        !href.includes('?') && !href.includes('#')) {
                        const fullUrl = href.startsWith('http') ? href : `https://www.bennetts.co.uk${href}`;
                        if (!urls.includes(fullUrl)) {
                            urls.push(fullUrl);
                        }
                    }
                });
                
                return urls;
            });
            
            if (pageReviewUrls.length === 0) {
                hasMorePages = false;
                console.log('❌ No more reviews found, stopping pagination');
            } else {
                reviewUrls.push(...pageReviewUrls);
                console.log(`✅ Found ${pageReviewUrls.length} review URLs on page ${currentPage}`);
                
                // Check if there's a next page
                const hasNextPage = await this.page.evaluate(() => {
                    const nextButton = document.querySelector('a[rel="next"]');
                    return nextButton !== null;
                });
                
                if (!hasNextPage) {
                    hasMorePages = false;
                    console.log('📄 No more pages available');
                } else {
                    currentPage++;
                    // Add delay to be respectful
                    await this.page.waitForTimeout(2000);
                }
            }
        }
        
        // Remove duplicates
        const uniqueUrls = [...new Set(reviewUrls)];
        console.log(`🎯 Total unique review URLs found: ${uniqueUrls.length}`);
        
        // Save URLs to file
        await fs.writeFile(
            './scraped_data/review_urls.json',
            JSON.stringify(uniqueUrls, null, 2)
        );
        
        return uniqueUrls;
    }

    async scrapeReviewDetails(reviewUrl) {
        console.log(`🔍 Scraping review: ${reviewUrl}`);
        
        try {
            await this.page.goto(reviewUrl, { waitUntil: 'networkidle2' });
            
            // Wait for main content
            await this.page.waitForSelector('h1', { timeout: 10000 });
            
            const reviewData = await this.page.evaluate((url) => {
                const data = {
                    url: url,
                    scrapedAt: new Date().toISOString(),
                    title: '',
                    manufacturer: '',
                    model: '',
                    year: '',
                    author: '',
                    publishDate: '',
                    rating: null,
                    price: '',
                    specifications: {},
                    prosAndCons: { pros: [], cons: [] },
                    content: '',
                    images: [],
                    rivals: [],
                    verdict: ''
                };
                
                // Extract title
                const titleElement = document.querySelector('h1');
                if (titleElement) {
                    data.title = titleElement.textContent.trim();
                    
                    // Extract manufacturer and model from title
                    const titleParts = data.title.split(' ');
                    if (titleParts.length > 0) {
                        data.manufacturer = titleParts[0];
                        if (titleParts.length > 1) {
                            data.model = titleParts.slice(1).join(' ').replace(/\s*\(\d{4}\).*/, '').trim();
                        }
                    }
                    
                    // Extract year from title
                    const yearMatch = data.title.match(/\((\d{4})\)/);
                    if (yearMatch) {
                        data.year = yearMatch[1];
                    }
                }
                
                // Extract author and publish date
                const authorElement = document.querySelector('[data-testid="author"]') || 
                                    document.querySelector('.author') ||
                                    document.querySelector('div:contains("By")');
                if (authorElement) {
                    data.author = authorElement.textContent.replace('By', '').trim();
                }
                
                const dateElement = document.querySelector('[data-testid="publish-date"]') ||
                                  document.querySelector('.publish-date') ||
                                  document.querySelector('time');
                if (dateElement) {
                    data.publishDate = dateElement.textContent.trim();
                }
                
                // Extract specifications table
                const specRows = document.querySelectorAll('table tr, .specification tr');
                specRows.forEach(row => {
                    const cells = row.querySelectorAll('td, th');
                    if (cells.length >= 2) {
                        const key = cells[0].textContent.trim();
                        const value = cells[1].textContent.trim();
                        if (key && value) {
                            data.specifications[key] = value;
                        }
                    }
                });
                
                // Extract price
                const priceElement = document.querySelector('.price') ||
                                   document.querySelector('[data-testid="price"]') ||
                                   document.querySelector('*:contains("£")');
                if (priceElement) {
                    const priceMatch = priceElement.textContent.match(/£[\d,]+/);
                    if (priceMatch) {
                        data.price = priceMatch[0];
                    }
                }
                
                // Extract pros and cons
                const prosElements = document.querySelectorAll('.pros li, .advantages li');
                prosElements.forEach(pro => {
                    data.prosAndCons.pros.push(pro.textContent.trim());
                });
                
                const consElements = document.querySelectorAll('.cons li, .disadvantages li');
                consElements.forEach(con => {
                    data.prosAndCons.cons.push(con.textContent.trim());
                });
                
                // Extract main content
                const contentElements = document.querySelectorAll('article p, .content p, .review-content p');
                const contentParagraphs = [];
                contentElements.forEach(p => {
                    const text = p.textContent.trim();
                    if (text.length > 50) { // Only include substantial paragraphs
                        contentParagraphs.push(text);
                    }
                });
                data.content = contentParagraphs.join('\n\n');
                
                // Extract images
                const imageElements = document.querySelectorAll('img[src*="datocms-assets"], img[src*="bennetts"], picture img');
                imageElements.forEach(img => {
                    const src = img.src || img.getAttribute('src');
                    if (src && !src.includes('placeholder') && !src.includes('logo')) {
                        data.images.push({
                            src: src,
                            alt: img.alt || '',
                            title: img.title || ''
                        });
                    }
                });
                
                // Extract rivals
                const rivalElements = document.querySelectorAll('.rivals .rival, .competitors .competitor');
                rivalElements.forEach(rival => {
                    const name = rival.querySelector('h3, h4, .name');
                    const price = rival.querySelector('.price');
                    if (name) {
                        data.rivals.push({
                            name: name.textContent.trim(),
                            price: price ? price.textContent.trim() : ''
                        });
                    }
                });
                
                // Extract verdict
                const verdictElement = document.querySelector('.verdict, .conclusion') ||
                                     document.querySelector('h2:contains("Verdict") + p, h3:contains("Verdict") + p');
                if (verdictElement) {
                    data.verdict = verdictElement.textContent.trim();
                }
                
                return data;
            }, reviewUrl);
            
            // Add to our collections
            this.scraped_data.manufacturers.add(reviewData.manufacturer);
            this.scraped_data.models.add(reviewData.model);
            this.scraped_data.reviews.push(reviewData);
            
            console.log(`✅ Successfully scraped: ${reviewData.title}`);
            return reviewData;
            
        } catch (error) {
            console.error(`❌ Error scraping ${reviewUrl}:`, error.message);
            return null;
        }
    }

    async downloadImage(imageUrl, filename) {
        return new Promise((resolve, reject) => {
            const file = fs.createWriteStream(filename);
            
            https.get(imageUrl, (response) => {
                response.pipe(file);
                
                file.on('finish', () => {
                    file.close();
                    resolve(filename);
                });
                
                file.on('error', (err) => {
                    fs.unlink(filename);
                    reject(err);
                });
            }).on('error', (err) => {
                reject(err);
            });
        });
    }

    async downloadAllImages() {
        console.log('📸 Downloading all images...');
        
        for (const review of this.scraped_data.reviews) {
            if (review.images && review.images.length > 0) {
                console.log(`📸 Downloading images for: ${review.title}`);
                
                for (let i = 0; i < review.images.length; i++) {
                    const image = review.images[i];
                    
                    try {
                        const url = new URL(image.src);
                        const extension = path.extname(url.pathname) || '.jpg';
                        const safeTitle = review.title.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
                        const filename = `${safeTitle}_${i + 1}${extension}`;
                        const filepath = path.join('./scraped_data/images/motorcycles', filename);
                        
                        await this.downloadImage(image.src, filepath);
                        
                        // Update image record with local path
                        image.localPath = filepath;
                        
                        console.log(`✅ Downloaded: ${filename}`);
                        
                        // Add delay to be respectful
                        await new Promise(resolve => setTimeout(resolve, 500));
                        
                    } catch (error) {
                        console.error(`❌ Error downloading image: ${error.message}`);
                    }
                }
            }
        }
    }

    async saveData() {
        console.log('💾 Saving scraped data...');
        
        // Save main reviews data
        await fs.writeFile(
            './scraped_data/reviews/all_reviews.json',
            JSON.stringify(this.scraped_data.reviews, null, 2)
        );
        
        // Save manufacturers
        await fs.writeFile(
            './scraped_data/manufacturers.json',
            JSON.stringify([...this.scraped_data.manufacturers], null, 2)
        );
        
        // Save models
        await fs.writeFile(
            './scraped_data/models.json',
            JSON.stringify([...this.scraped_data.models], null, 2)
        );
        
        // Save summary statistics
        const summary = {
            totalReviews: this.scraped_data.reviews.length,
            totalManufacturers: this.scraped_data.manufacturers.size,
            totalModels: this.scraped_data.models.size,
            totalImages: this.scraped_data.reviews.reduce((total, review) => total + review.images.length, 0),
            scrapedAt: new Date().toISOString()
        };
        
        await fs.writeFile(
            './scraped_data/summary.json',
            JSON.stringify(summary, null, 2)
        );
        
        console.log('✅ Data saved successfully');
        console.log(`📊 Summary: ${summary.totalReviews} reviews, ${summary.totalManufacturers} manufacturers, ${summary.totalImages} images`);
    }

    async run(maxReviews = null) {
        try {
            console.log('🏁 Starting Bennetts motorcycle review scraper...');
            
            await this.initBrowser();
            
            // Get all review URLs
            const reviewUrls = await this.getAllReviewUrls();
            
            // Limit number of reviews if specified
            const urlsToScrape = maxReviews ? reviewUrls.slice(0, maxReviews) : reviewUrls;
            
            console.log(`🎯 Will scrape ${urlsToScrape.length} reviews`);
            
            // Scrape each review
            for (let i = 0; i < urlsToScrape.length; i++) {
                const url = urlsToScrape[i];
                console.log(`📖 Progress: ${i + 1}/${urlsToScrape.length}`);
                
                await this.scrapeReviewDetails(url);
                
                // Save data periodically (every 10 reviews)
                if ((i + 1) % 10 === 0) {
                    await this.saveData();
                }
                
                // Add delay to be respectful
                await this.page.waitForTimeout(3000);
            }
            
            // Download all images
            await this.downloadAllImages();
            
            // Save final data
            await this.saveData();
            
            console.log('🎉 Scraping completed successfully!');
            
        } catch (error) {
            console.error('❌ Error during scraping:', error);
        } finally {
            await this.closeBrowser();
        }
    }
}

// Export for use in other modules
module.exports = BennettsScraper;

// Run directly if this file is executed
if (require.main === module) {
    const scraper = new BennettsScraper();
    
    // Parse command line arguments
    const args = process.argv.slice(2);
    const maxReviews = args.length > 0 ? parseInt(args[0]) : null;
    
    scraper.run(maxReviews).catch(console.error);
}
