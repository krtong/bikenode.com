module.exports = {
    // Database configuration
    database: {
        path: './scraped_data/database/bennetts_reviews.db'
    },
    
    // Browser configuration
    browser: {
        headless: true,
        viewport: { width: 1920, height: 1080 },
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    },
    
    // Scraping configuration
    scraping: {
        delays: {
            betweenPages: 3000,  // 3 seconds between pages
            betweenReviews: 2000, // 2 seconds between reviews
            imageDownload: 500   // 0.5 seconds between image downloads
        },
        retries: {
            maxRetries: 3,
            retryDelay: 5000
        },
        limits: {
            maxReviews: null,     // null = no limit
            maxPages: null,       // null = no limit
            maxImagesPerReview: 20
        }
    },
    
    // Output configuration
    output: {
        directories: {
            reviews: './scraped_data/reviews',
            images: './scraped_data/images/motorcycles',
            database: './scraped_data/database',
            logs: './scraped_data/logs'
        },
        files: {
            allReviews: 'all_reviews.json',
            manufacturers: 'manufacturers.json',
            models: 'models.json',
            summary: 'summary.json'
        }
    },
    
    // Website configuration
    site: {
        baseUrl: 'https://www.bennetts.co.uk',
        reviewsPath: '/bikesocial/reviews/bikes',
        selectors: {
            reviewLinks: 'a[href*="/reviews/bikes/"]',
            title: 'h1',
            specifications: 'table tr, .specification tr',
            images: 'img[src*="datocms-assets"], img[src*="bennetts"], picture img',
            pros: '.pros li, .advantages li',
            cons: '.cons li, .disadvantages li',
            content: 'article p, .content p, .review-content p',
            rivals: '.rivals .rival, .competitors .competitor'
        }
    }
};
