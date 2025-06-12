// Enhanced Manufacturer Website Scraper
// Directly scrapes official manufacturer websites for highest quality product images

import axios from 'axios';
import * as cheerio from 'cheerio';
import { QUALITY_STANDARDS } from '../config/quality_standards.js';

export class ManufacturerWebsiteScraper {
    constructor() {
        this.userAgents = [
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        ];
        this.requestDelay = 2000; // 2 second delay between requests to be respectful
    }

    /**
     * Search manufacturer's official website for motorcycle images
     */
    async searchManufacturerSite(motorcycle) {
        const make = motorcycle.make.toLowerCase();
        const manufacturerDomains = QUALITY_STANDARDS.MANUFACTURER_DOMAINS[make];
        
        if (!manufacturerDomains || manufacturerDomains.length === 0) {
            console.log(`No official domains configured for ${motorcycle.make}`);
            return [];
        }

        const allImages = [];
        
        for (const domain of manufacturerDomains) {
            try {
                console.log(`🔍 Searching ${domain} for ${motorcycle.year} ${motorcycle.make} ${motorcycle.model}`);
                const images = await this.scrapeManufacturerDomain(domain, motorcycle);
                allImages.push(...images);
                
                // Add delay between domains
                await this.delay(this.requestDelay);
            } catch (error) {
                console.error(`Error scraping ${domain}:`, error.message);
                continue;
            }
        }

        return this.deduplicateImages(allImages);
    }

    /**
     * Scrape a specific manufacturer domain
     */
    async scrapeManufacturerDomain(domain, motorcycle) {
        const searchStrategies = [
            () => this.searchModelPage(domain, motorcycle),
            () => this.searchPressKit(domain, motorcycle),
            () => this.searchGallery(domain, motorcycle),
            () => this.searchSiteSearch(domain, motorcycle)
        ];

        const allImages = [];
        
        for (const strategy of searchStrategies) {
            try {
                const images = await strategy();
                allImages.push(...images);
                
                if (allImages.length >= 5) break; // Enough images found
            } catch (error) {
                console.log(`Search strategy failed for ${domain}:`, error.message);
                continue;
            }
        }

        return allImages;
    }

    /**
     * Search for dedicated model page
     */
    async searchModelPage(domain, motorcycle) {
        const possiblePaths = [
            `/motorcycles/${motorcycle.year}/${motorcycle.model.toLowerCase()}`,
            `/models/${motorcycle.model.toLowerCase()}`,
            `/bikes/${motorcycle.model.toLowerCase()}`,
            `/${motorcycle.model.toLowerCase()}`,
            `/lineup/${motorcycle.model.toLowerCase()}`,
            `/products/${motorcycle.model.toLowerCase()}`
        ];

        for (const path of possiblePaths) {
            try {
                const url = `https://${domain}${path}`;
                const response = await this.makeRequest(url);
                
                if (response && response.status === 200) {
                    const images = this.extractImagesFromPage(response.data, motorcycle);
                    if (images.length > 0) {
                        console.log(`✅ Found model page: ${url}`);
                        return images;
                    }
                }
            } catch (error) {
                // Try next path
                continue;
            }
        }

        return [];
    }

    /**
     * Search press kit or media section
     */
    async searchPressKit(domain, motorcycle) {
        const pressKitPaths = [
            '/press',
            '/media',
            '/press-kit',
            '/media-kit',
            '/news-media'
        ];

        for (const path of pressKitPaths) {
            try {
                const url = `https://${domain}${path}`;
                const response = await this.makeRequest(url);
                
                if (response && response.status === 200) {
                    const $ = cheerio.load(response.data);
                    
                    // Look for model-specific press releases or media
                    const modelLinks = $(`a[href*="${motorcycle.model.toLowerCase()}"], a:contains("${motorcycle.model}")`).toArray();
                    
                    for (const link of modelLinks.slice(0, 3)) { // Check first 3 relevant links
                        const href = $(link).attr('href');
                        if (href) {
                            const fullUrl = href.startsWith('http') ? href : `https://${domain}${href}`;
                            const pageResponse = await this.makeRequest(fullUrl);
                            
                            if (pageResponse && pageResponse.status === 200) {
                                const images = this.extractImagesFromPage(pageResponse.data, motorcycle);
                                if (images.length > 0) {
                                    console.log(`✅ Found press kit page: ${fullUrl}`);
                                    return images;
                                }
                            }
                        }
                    }
                }
            } catch (error) {
                continue;
            }
        }

        return [];
    }

    /**
     * Search gallery or image sections
     */
    async searchGallery(domain, motorcycle) {
        const galleryPaths = [
            '/gallery',
            '/images',
            '/photos',
            '/media-gallery'
        ];

        for (const path of galleryPaths) {
            try {
                const url = `https://${domain}${path}`;
                const response = await this.makeRequest(url);
                
                if (response && response.status === 200) {
                    const images = this.extractImagesFromPage(response.data, motorcycle);
                    if (images.length > 0) {
                        console.log(`✅ Found gallery: ${url}`);
                        return images;
                    }
                }
            } catch (error) {
                continue;
            }
        }

        return [];
    }

    /**
     * Use site search functionality
     */
    async searchSiteSearch(domain, motorcycle) {
        const searchPaths = [
            `/search?q=${encodeURIComponent(motorcycle.model)}`,
            `/search?query=${encodeURIComponent(motorcycle.model)}`,
            `/?s=${encodeURIComponent(motorcycle.model)}`
        ];

        for (const path of searchPaths) {
            try {
                const url = `https://${domain}${path}`;
                const response = await this.makeRequest(url);
                
                if (response && response.status === 200) {
                    const $ = cheerio.load(response.data);
                    
                    // Find first few relevant result links
                    const resultLinks = $('a[href*="/"], a[href^="http"]').toArray()
                        .filter(link => {
                            const text = $(link).text().toLowerCase();
                            const href = $(link).attr('href') || '';
                            return text.includes(motorcycle.model.toLowerCase()) || 
                                   href.includes(motorcycle.model.toLowerCase());
                        })
                        .slice(0, 2);

                    for (const link of resultLinks) {
                        const href = $(link).attr('href');
                        if (href) {
                            const fullUrl = href.startsWith('http') ? href : `https://${domain}${href}`;
                            const pageResponse = await this.makeRequest(fullUrl);
                            
                            if (pageResponse && pageResponse.status === 200) {
                                const images = this.extractImagesFromPage(pageResponse.data, motorcycle);
                                if (images.length > 0) {
                                    console.log(`✅ Found via site search: ${fullUrl}`);
                                    return images;
                                }
                            }
                        }
                    }
                }
            } catch (error) {
                continue;
            }
        }

        return [];
    }

    /**
     * Extract relevant images from a webpage
     */
    extractImagesFromPage(html, motorcycle) {
        const $ = cheerio.load(html);
        const images = [];
        const modelName = motorcycle.model.toLowerCase();
        
        // Look for images with model-related alt text or file names
        $('img').each((i, elem) => {
            const src = $(elem).attr('src') || $(elem).attr('data-src') || $(elem).attr('data-lazy-src');
            const alt = $(elem).attr('alt') || '';
            const title = $(elem).attr('title') || '';
            
            if (!src || !src.startsWith('http')) return;
            
            // Check if image is relevant to the motorcycle model
            const relevantText = (alt + ' ' + title + ' ' + src).toLowerCase();
            const isRelevant = relevantText.includes(modelName) || 
                             relevantText.includes(motorcycle.make.toLowerCase()) ||
                             this.isProductImage(src, alt);
            
            if (isRelevant && this.isHighQualityImageUrl(src)) {
                images.push({
                    url: src,
                    alt: alt,
                    title: title,
                    source: 'manufacturer_official',
                    relevanceScore: this.calculateRelevanceScore(relevantText, motorcycle)
                });
            }
        });

        // Sort by relevance and return top images
        return images
            .sort((a, b) => b.relevanceScore - a.relevanceScore)
            .slice(0, 5);
    }

    /**
     * Check if URL suggests a high-quality image
     */
    isHighQualityImageUrl(url) {
        // Check for quality indicators
        for (const pattern of QUALITY_STANDARDS.QUALITY_URL_PATTERNS) {
            if (pattern.test(url)) return true;
        }
        
        // Check for avoid patterns
        for (const pattern of QUALITY_STANDARDS.AVOID_URL_PATTERNS) {
            if (pattern.test(url)) return false;
        }
        
        return true; // Default to including if no clear indicators
    }

    /**
     * Check if this looks like a product image
     */
    isProductImage(src, alt) {
        const text = (src + ' ' + alt).toLowerCase();
        const productKeywords = ['hero', 'product', 'main', 'featured', 'gallery', 'official'];
        return productKeywords.some(keyword => text.includes(keyword));
    }

    /**
     * Calculate relevance score for an image
     */
    calculateRelevanceScore(text, motorcycle) {
        let score = 0;
        
        if (text.includes(motorcycle.model.toLowerCase())) score += 3;
        if (text.includes(motorcycle.make.toLowerCase())) score += 2;
        if (text.includes(motorcycle.year.toString())) score += 1;
        if (text.includes('hero') || text.includes('product')) score += 2;
        if (text.includes('official') || text.includes('press')) score += 1;
        
        return score;
    }

    /**
     * Make HTTP request with proper headers and error handling
     */
    async makeRequest(url, retries = 2) {
        const userAgent = this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
        
        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                const response = await axios.get(url, {
                    headers: {
                        'User-Agent': userAgent,
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                        'Accept-Language': 'en-US,en;q=0.9',
                        'Accept-Encoding': 'gzip, deflate',
                        'Connection': 'keep-alive',
                        'Cache-Control': 'no-cache'
                    },
                    timeout: 15000,
                    maxRedirects: 5
                });
                
                return response;
            } catch (error) {
                if (attempt === retries) {
                    throw error;
                }
                
                await this.delay(1000 * (attempt + 1)); // Exponential backoff
            }
        }
    }

    /**
     * Remove duplicate images
     */
    deduplicateImages(images) {
        const seen = new Set();
        return images.filter(img => {
            const key = img.url;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }

    /**
     * Delay utility
     */
    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
