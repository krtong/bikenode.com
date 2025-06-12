const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs').promises;
const path = require('path');
const https = require('https');
const { URL } = require('url');

class BennettsHttpScraper {
    constructor() {
        this.baseUrl = 'https://www.bennetts.co.uk';
        this.reviewsUrl = '/bikesocial/reviews/bikes';
        this.scraped_data = {
            reviews: [],
            images: [],
            manufacturers: new Set(),
            models: new Set()
        };
        
        // HTTP client with proper headers
        this.client = axios.create({
            timeout: 30000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1'
            }
        });
        
        this.setupDirectories();
    }
    
    async setupDirectories() {
        const dirs = [
            './scraped_data',
            './scraped_data/reviews', 
            './scraped_data/images',
            './scraped_data/images/motorcycles',
            './scraped_data/database',
            './scraped_data/logs'
        ];
        
        for (const dir of dirs) {
            await fs.mkdir(dir, { recursive: true });
        }
    }
    
    async getAllReviewUrls(maxPages = null) {
        console.log('📋 Getting all review URLs...');
        const reviewUrls = [];
        let currentPage = 1;
        let hasMorePages = true;

        while (hasMorePages && (maxPages === null || currentPage <= maxPages)) {
            console.log(`📄 Scraping page ${currentPage}...`);
            
            try {
                const pageUrl = currentPage === 1 
                    ? `${this.baseUrl}${this.reviewsUrl}`
                    : `${this.baseUrl}${this.reviewsUrl}?page=${currentPage}`;
                
                const response = await this.client.get(pageUrl);
                const $ = cheerio.load(response.data);
                
                // Find review links
                const pageReviewUrls = [];
                $('a[href*="/reviews/bikes/"]').each((i, element) => {
                    const href = $(element).attr('href');
                    if (href && href.includes('/reviews/bikes/') && 
                        !href.includes('?') && !href.includes('#')) {
                        const fullUrl = href.startsWith('http') ? href : `${this.baseUrl}${href}`;
                        if (!pageReviewUrls.includes(fullUrl)) {
                            pageReviewUrls.push(fullUrl);
                        }
                    }
                });
                
                if (pageReviewUrls.length === 0) {
                    hasMorePages = false;
                    console.log('❌ No more reviews found, stopping pagination');
                } else {
                    reviewUrls.push(...pageReviewUrls);
                    console.log(`✅ Found ${pageReviewUrls.length} review URLs on page ${currentPage}`);
                    
                    // Check for next page link
                    const hasNextPage = $('a[rel="next"]').length > 0;
                    
                    if (!hasNextPage) {
                        hasMorePages = false;
                        console.log('📄 No more pages available');
                    } else {
                        currentPage++;
                        // Add delay to be respectful
                        await this.delay(2000);
                    }
                }
                
            } catch (error) {
                console.error(`❌ Error on page ${currentPage}:`, error.message);
                hasMorePages = false;
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
            const response = await this.client.get(reviewUrl);
            const $ = cheerio.load(response.data);
            
            const data = {
                url: reviewUrl,
                scrapedAt: new Date().toISOString(),
                title: '',
                manufacturer: '',
                model: '',
                year: '',
                author: {
                    name: ''
                },
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
            const title = $('h1').first().text().trim();
            if (title) {
                data.title = title;
                
                // Extract manufacturer and model from title
                const titleParts = title.split(' ');
                if (titleParts.length > 0) {
                    data.manufacturer = titleParts[0];
                    if (titleParts.length > 1) {
                        data.model = titleParts.slice(1).join(' ').replace(/\s*\(\d{4}\).*/, '').trim();
                    }
                }
                
                // Extract year from title
                const yearMatch = title.match(/\((\d{4})\)/);
                if (yearMatch) {
                    data.year = yearMatch[1];
                }
            }
            
            // Extract author
            const author = $('[data-testid="author"], .author').first().text().replace('By', '').trim();
            if (author) {
                data.author.name = author;
            }
            
            // Extract publish date
            const publishDate = $('[data-testid="publish-date"], .publish-date, time').first().text().trim();
            if (publishDate) {
                data.publishDate = publishDate;
            }
            
            // Extract specifications
            $('table tr, .specification tr').each((i, row) => {
                const cells = $(row).find('td, th');
                if (cells.length >= 2) {
                    const key = $(cells[0]).text().trim();
                    const value = $(cells[1]).text().trim();
                    if (key && value) {
                        data.specifications[key] = value;
                    }
                }
            });
            
            // Extract price
            const priceText = $('.price, [data-testid="price"]').first().text();
            const priceMatch = priceText.match(/£[\d,]+/);
            if (priceMatch) {
                data.price = priceMatch[0];
            }
            
            // Extract pros and cons
            $('.pros li, .advantages li').each((i, element) => {
                const text = $(element).text().trim();
                if (text) data.prosAndCons.pros.push(text);
            });
            
            $('.cons li, .disadvantages li').each((i, element) => {
                const text = $(element).text().trim();
                if (text) data.prosAndCons.cons.push(text);
            });
            
            // Extract main content
            const contentParagraphs = [];
            $('article p, .content p, .review-content p').each((i, element) => {
                const text = $(element).text().trim();
                if (text.length > 50) {
                    contentParagraphs.push(text);
                }
            });
            data.content = contentParagraphs.join('\n\n');
            
            // Extract images
            $('img[src*="datocms-assets"], img[src*="bennetts"], picture img').each((i, element) => {
                const src = $(element).attr('src');
                if (src && !src.includes('placeholder') && !src.includes('logo')) {
                    data.images.push({
                        src: src,
                        alt: $(element).attr('alt') || '',
                        title: $(element).attr('title') || ''
                    });
                }
            });
            
            // Extract rivals
            $('.rivals .rival, .competitors .competitor').each((i, element) => {
                const name = $(element).find('h3, h4, .name').first().text().trim();
                const price = $(element).find('.price').first().text().trim();
                if (name) {
                    data.rivals.push({
                        name: name,
                        price: price
                    });
                }
            });
            
            // Extract verdict
            const verdict = $('.verdict, .conclusion').first().text().trim();
            if (verdict) {
                data.verdict = verdict;
            }
            
            // Add to collections
            this.scraped_data.manufacturers.add(data.manufacturer);
            this.scraped_data.models.add(data.model);
            this.scraped_data.reviews.push(data);
            
            console.log(`✅ Successfully scraped: ${data.title}`);
            return data;
            
        } catch (error) {
            console.error(`❌ Error scraping ${reviewUrl}:`, error.message);
            return null;
        }
    }
    
    async downloadImage(imageUrl, filename) {
        return new Promise((resolve, reject) => {
            const file = require('fs').createWriteStream(filename);
            
            https.get(imageUrl, (response) => {
                response.pipe(file);
                
                file.on('finish', () => {
                    file.close();
                    resolve(filename);
                });
                
                file.on('error', (err) => {
                    require('fs').unlink(filename, () => {});
                    reject(err);
                });
            }).on('error', (err) => {
                reject(err);
            });
        });
    }
    
    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
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
    
    async run(maxReviews = null, maxPages = null) {
        try {
            console.log('🏁 Starting Bennetts HTTP scraper...');
            
            // Get all review URLs
            const reviewUrls = await this.getAllReviewUrls(maxPages);
            
            // Limit number of reviews if specified
            const urlsToScrape = maxReviews ? reviewUrls.slice(0, maxReviews) : reviewUrls;
            
            console.log(`🎯 Will scrape ${urlsToScrape.length} reviews`);
            
            // Scrape each review
            for (let i = 0; i < urlsToScrape.length; i++) {
                const url = urlsToScrape[i];
                console.log(`📖 Progress: ${i + 1}/${urlsToScrape.length}`);
                
                await this.scrapeReviewDetails(url);
                
                // Save data periodically (every 5 reviews)
                if ((i + 1) % 5 === 0) {
                    await this.saveData();
                }
                
                // Add delay to be respectful
                await this.delay(3000);
            }
            
            // Save final data
            await this.saveData();
            
            console.log('🎉 Scraping completed successfully!');
            
        } catch (error) {
            console.error('❌ Error during scraping:', error);
        }
    }
}

module.exports = BennettsHttpScraper;

// Run directly if this file is executed
if (require.main === module) {
    const scraper = new BennettsHttpScraper();
    
    // Parse command line arguments
    const args = process.argv.slice(2);
    const maxReviews = args.length > 0 ? parseInt(args[0]) : null;
    const maxPages = args.length > 1 ? parseInt(args[1]) : null;
    
    scraper.run(maxReviews, maxPages).catch(console.error);
}
