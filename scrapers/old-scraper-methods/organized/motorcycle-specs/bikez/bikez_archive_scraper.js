#!/usr/bin/env node

import { Stagehand } from "@browserbasehq/stagehand";
import fs from 'fs';
import path from 'path';

class BikezArchiveScraper {
    constructor(archiveUrl = null) {
        this.stagehand = new Stagehand({
            env: "LOCAL",
            enableCaching: false,
            debugDom: true
        });
        
        // Support both regular bikez.com and archive.org URLs
        this.baseUrl = archiveUrl || 'https://www.bikez.com';
        this.isArchive = archiveUrl && archiveUrl.includes('web.archive.org');
        
        console.log(`🔧 Using ${this.isArchive ? 'archive' : 'live'} URL: ${this.baseUrl}`);
    }

    async initialize() {
        await this.stagehand.init();
        console.log('🏍️ Bikez archive scraper initialized');
    }

    // Convert relative URLs to absolute URLs (handling archive.org structure)
    makeAbsoluteUrl(relativeUrl) {
        if (!relativeUrl) return null;
        
        // If already absolute, return as-is
        if (relativeUrl.startsWith('http://') || relativeUrl.startsWith('https://')) {
            return relativeUrl;
        }
        
        if (this.isArchive) {
            // For archive.org, we need to maintain the wayback structure
            const baseMatch = this.baseUrl.match(/(https:\/\/web\.archive\.org\/web\/\d+\/)(.*)/);
            if (baseMatch) {
                const archivePrefix = baseMatch[1];
                const originalDomain = baseMatch[2].replace(/\/$/, '');
                
                // Handle relative URLs starting with /
                if (relativeUrl.startsWith('/')) {
                    return archivePrefix + originalDomain + relativeUrl;
                } else {
                    // Handle relative URLs without leading /
                    const currentPath = this.baseUrl.substring(0, this.baseUrl.lastIndexOf('/'));
                    return currentPath + '/' + relativeUrl;
                }
            }
        } else {
            // For regular bikez.com
            const domain = 'https://www.bikez.com';
            return relativeUrl.startsWith('/') ? domain + relativeUrl : domain + '/' + relativeUrl;
        }
        
        return relativeUrl;
    }

    async scrapeMotorcyclePage(url) {
        try {
            console.log(`📄 Scraping: ${url}`);
            await this.stagehand.page.goto(url, { waitUntil: 'domcontentloaded' });
            await this.stagehand.page.waitForTimeout(2000);

            const motorcycleData = await this.stagehand.page.evaluate(() => {
                const data = {
                    specs: {},
                    images: []
                };

                // Extract title/model info
                const titleElement = document.querySelector('h1, .title, [class*="model"]');
                if (titleElement) {
                    data.title = titleElement.textContent.trim();
                }

                // Extract specifications from table
                const specRows = document.querySelectorAll('table tr, .spec-row, [class*="specification"]');
                specRows.forEach(row => {
                    const cells = row.querySelectorAll('td');
                    if (cells.length >= 2) {
                        const key = cells[0].textContent.trim().replace(':', '');
                        const value = cells[1].textContent.trim();
                        if (key && value) {
                            data.specs[key] = value;
                        }
                    }
                });

                // Extract images
                const images = document.querySelectorAll('img[src*="pictures"], img[src*="image"], .gallery img');
                images.forEach(img => {
                    if (img.src && !img.src.includes('logo') && !img.src.includes('icon')) {
                        data.images.push(img.src);
                    }
                });

                // Extract any additional details from the page
                const descriptionElement = document.querySelector('.description, .details, [class*="description"]');
                if (descriptionElement) {
                    data.description = descriptionElement.textContent.trim();
                }

                return data;
            });

            // Convert relative image URLs to absolute
            if (motorcycleData.images) {
                motorcycleData.images = motorcycleData.images.map(img => this.makeAbsoluteUrl(img));
            }

            return motorcycleData;

        } catch (error) {
            console.error(`❌ Error scraping ${url}:`, error.message);
            return null;
        }
    }

    async scrapeManufacturerPage(manufacturerUrl) {
        try {
            console.log(`🏭 Scraping manufacturer page: ${manufacturerUrl}`);
            await this.stagehand.page.goto(manufacturerUrl, { waitUntil: 'domcontentloaded' });
            await this.stagehand.page.waitForTimeout(2000);

            const modelLinks = await this.stagehand.page.evaluate(() => {
                const links = [];
                const modelElements = document.querySelectorAll('a[href*="model"], a[href*="php"], .model-link, td a');
                
                modelElements.forEach(link => {
                    const href = link.getAttribute('href');
                    const text = link.textContent.trim();
                    
                    if (href && text && !href.includes('#')) {
                        links.push({
                            text: text,
                            href: href
                        });
                    }
                });
                
                return links;
            });

            // Convert relative URLs to absolute
            const absoluteLinks = modelLinks.map(link => ({
                ...link,
                href: this.makeAbsoluteUrl(link.href)
            }));

            console.log(`  Found ${absoluteLinks.length} model links`);
            return absoluteLinks;

        } catch (error) {
            console.error(`❌ Error scraping manufacturer page:`, error.message);
            return [];
        }
    }

    async scrapeMultiplePages(urls) {
        const results = [];
        
        for (const url of urls) {
            const data = await this.scrapeMotorcyclePage(url);
            if (data) {
                results.push({
                    url: url,
                    ...data
                });
            }
            
            // Be respectful with rate limiting
            await this.stagehand.page.waitForTimeout(1000);
        }
        
        return results;
    }

    async close() {
        await this.stagehand.close();
        console.log('✅ Scraper closed');
    }

    // Save results to file
    saveResults(data, filename = 'bikez_scraped_data.json') {
        const outputPath = path.join(process.cwd(), filename);
        fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
        console.log(`💾 Results saved to: ${outputPath}`);
    }
}

// Example usage
async function main() {
    // Example with archive.org URL
    const archiveUrl = 'https://web.archive.org/web/20241107124610/https://bikez.com/motorcycles/cf_moto_leader_150_2015.php';
    
    // You can also use regular bikez.com URLs
    // const regularUrl = 'https://www.bikez.com/motorcycles/cf_moto_leader_150_2015.php';
    
    const scraper = new BikezArchiveScraper();
    
    try {
        await scraper.initialize();
        
        // Scrape a single motorcycle page
        if (archiveUrl) {
            const data = await scraper.scrapeMotorcyclePage(archiveUrl);
            console.log('\n📊 Scraped data:', JSON.stringify(data, null, 2));
            scraper.saveResults(data, 'cf_moto_leader_150_2015.json');
        }
        
        // Or scrape multiple pages
        // const urls = [
        //     'https://web.archive.org/web/20241107124610/https://bikez.com/motorcycles/cf_moto_leader_150_2015.php',
        //     'https://web.archive.org/web/20241107124610/https://bikez.com/motorcycles/honda_cbr1000rr_2024.php'
        // ];
        // const results = await scraper.scrapeMultiplePages(urls);
        // scraper.saveResults(results, 'multiple_bikes.json');
        
    } catch (error) {
        console.error('Fatal error:', error);
    } finally {
        await scraper.close();
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export default BikezArchiveScraper;