#!/usr/bin/env node
/*  Bicycle Brand Scraper - Comprehensive brand data collection  */

import { Stagehand } from "@browserbasehq/stagehand";
import pg from 'pg';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
  NAV_DELAY: 2000,
  RETRY_DELAY: 3000,
  MAX_RETRIES: 3,
  TIMEOUT: 60000,
  BATCH_SIZE: 50,
  IMAGES_DIR: path.join(__dirname, '../images/brands')
};

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'bikenode',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres'
};

class BicycleBrandScraper {
  constructor() {
    this.pool = new pg.Pool(dbConfig);
    this.stagehand = null;
    this.lastWikipediaUrl = null;
    this.stats = {
      total: 0,
      processed: 0,
      successful: 0,
      failed: 0,
      errors: []
    };
  }

  async initialize() {
    // Test database connection
    try {
      const client = await this.pool.connect();
      console.log(chalk.green("✅ Database connection established"));
      client.release();
    } catch (err) {
      console.error(chalk.red("❌ Database connection failed:"), err.message);
      throw err;
    }

    // Create brands table
    await this.createBrandsTable();

    // Create images directory
    await fs.mkdir(CONFIG.IMAGES_DIR, { recursive: true });
    console.log(chalk.green(`✅ Images directory ready: ${CONFIG.IMAGES_DIR}`));

    // Initialize Stagehand
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is required");
    }

    this.stagehand = new Stagehand({ 
      env: "LOCAL", 
      apiKey: process.env.OPENAI_API_KEY,
      verbose: 0
    });
    
    await this.stagehand.init();
    console.log(chalk.green("✅ Stagehand initialized"));
  }

  /**
   * Create brands table with comprehensive schema
   */
  async createBrandsTable() {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS bicycle_brands (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        normalized_name TEXT UNIQUE NOT NULL,
        
        -- Company Information
        official_name TEXT,
        year_established INTEGER,
        founder TEXT,
        headquarters_location TEXT,
        country TEXT,
        
        -- Business Information
        parent_company TEXT,
        subsidiaries TEXT[],
        annual_revenue_usd BIGINT,
        employees_count INTEGER,
        is_publicly_traded BOOLEAN DEFAULT FALSE,
        stock_symbol TEXT,
        market_cap_usd BIGINT,
        
        -- Contact & Web Presence
        website_url TEXT,
        wikipedia_url TEXT,
        social_media JSONB, -- {twitter, instagram, facebook, youtube}
        
        -- Brand Assets
        logo_url TEXT,
        logo_icon_url TEXT,
        brand_colors JSONB, -- {primary, secondary, accent}
        headquarters_image_url TEXT,
        
        -- Product Information
        specialties TEXT[], -- ['road', 'mountain', 'electric', 'bmx', etc.]
        price_range TEXT, -- 'budget', 'mid-range', 'premium', 'luxury'
        bike_count_in_db INTEGER DEFAULT 0,
        
        -- Scraped Data
        wikipedia_data JSONB,
        company_description TEXT,
        notable_achievements TEXT[],
        
        -- Status & Metadata
        scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        logo_downloaded BOOLEAN DEFAULT FALSE,
        icon_downloaded BOOLEAN DEFAULT FALSE,
        headquarters_image_downloaded BOOLEAN DEFAULT FALSE,
        data_quality_score DECIMAL(3,2), -- 0.00 to 1.00
        
        -- Raw scraped data for reference
        raw_scrape_data JSONB
      );
    `);
    
    // Create indexes
    await this.pool.query(`
      CREATE INDEX IF NOT EXISTS idx_bicycle_brands_name ON bicycle_brands(name);
      CREATE INDEX IF NOT EXISTS idx_bicycle_brands_normalized ON bicycle_brands(normalized_name);
      CREATE INDEX IF NOT EXISTS idx_bicycle_brands_country ON bicycle_brands(country);
      CREATE INDEX IF NOT EXISTS idx_bicycle_brands_established ON bicycle_brands(year_established);
      CREATE INDEX IF NOT EXISTS idx_bicycle_brands_quality ON bicycle_brands(data_quality_score);
    `);
    
    console.log(chalk.green('✅ Created bicycle_brands table with comprehensive schema'));
  }

  /**
   * Load brand list from maker_ids.js
   */
  async loadBrandList() {
    try {
      // Import maker_ids.js dynamically
      const { default: makerIds } = await import('./maker_ids.js');
      
      // Convert maker_ids object to brand array format
      const brands = Object.entries(makerIds).map(([makerId, brandName]) => ({
        name: brandName,           // Use actual brand name for searching
        normalized_name: makerId,  // Use makerId for database storage
        display_name: brandName,
        maker_id: makerId
      }));
      
      console.log(chalk.blue(`📂 Loaded ${brands.length} brands from maker_ids.js`));
      return brands;
    } catch (err) {
      console.error(chalk.red("✖  maker_ids.js not found or invalid"));
      throw err;
    }
  }

  /**
   * Get brands that need scraping
   */
  async getBrandsToScrape(limit = null, forceRescrape = false) {
    const allBrands = await this.loadBrandList();
    const brandsToScrape = [];
    const alreadyScrapedBrands = [];
    
    console.log(chalk.blue('🔍 Checking which brands need scraping...'));
    
    for (const brand of allBrands) {
      if (limit && brandsToScrape.length >= limit) break;
      
      // Check if already scraped (unless force rescrape)
      if (!forceRescrape) {
        const existing = await this.pool.query(
          'SELECT id, scraped_at, data_quality_score FROM bicycle_brands WHERE normalized_name = $1',
          [brand.normalized_name]
        );
        
        if (existing.rows.length > 0) {
          const existingBrand = existing.rows[0];
          alreadyScrapedBrands.push({
            name: brand.name,
            id: existingBrand.id,
            scraped_at: existingBrand.scraped_at,
            quality_score: existingBrand.data_quality_score
          });
          console.log(chalk.gray(`  ⏭️  Skipping ${brand.display_name} (${brand.maker_id}) - ID: ${existingBrand.id}, Quality: ${existingBrand.data_quality_score}`));
          continue; // Skip already scraped brands
        }
      }
      
      brandsToScrape.push(brand);
    }
    
    console.log(chalk.blue(`\n📊 Brand Scraping Status:`));
    console.log(`  Total brands in list: ${chalk.yellow(allBrands.length)}`);
    console.log(`  Already scraped: ${chalk.green(alreadyScrapedBrands.length)}`);
    console.log(`  Need scraping: ${chalk.yellow(brandsToScrape.length)}`);
    console.log(`  Will process: ${chalk.blue(limit ? Math.min(brandsToScrape.length, limit) : brandsToScrape.length)}`);
    
    if (alreadyScrapedBrands.length > 0) {
      console.log(chalk.blue(`\n✅ Previously Scraped Brands (${alreadyScrapedBrands.length}):`));
      for (const scraped of alreadyScrapedBrands.slice(0, 10)) { // Show first 10
        console.log(`  ${scraped.name} (ID: ${scraped.id}, Quality: ${scraped.quality_score})`);
      }
      if (alreadyScrapedBrands.length > 10) {
        console.log(`  ... and ${alreadyScrapedBrands.length - 10} more`);
      }
    }
    
    return brandsToScrape;
  }

  /**
   * Search for brand information using multiple strategies
   */
  async searchBrandInfo(brandName) {
    console.log(chalk.blue(`🔍 Searching for: ${brandName}`));
    
    const searchResults = {
      brand_name: brandName,
      wikipedia_data: null,
      official_website: null,
      logo_urls: [],
      company_info: {},
      search_queries_tried: []
    };

    // Strategy 1: Direct Wikipedia search
    try {
      const wikiData = await this.searchWikipedia(brandName);
      if (wikiData) {
        searchResults.wikipedia_data = wikiData;
        console.log(chalk.green(`  ✅ Found Wikipedia page for ${brandName}`));
      }
    } catch (error) {
      console.log(chalk.yellow(`  ⚠️ Wikipedia search failed: ${error.message}`));
    }

    // Strategy 2: Official website search
    try {
      const websiteData = await this.searchOfficialWebsite(brandName);
      if (websiteData) {
        searchResults.official_website = websiteData;
        console.log(chalk.green(`  ✅ Found official website for ${brandName}`));
      }
    } catch (error) {
      console.log(chalk.yellow(`  ⚠️ Website search failed: ${error.message}`));
    }

    // Strategy 3: Logo search
    try {
      const logoUrls = await this.searchLogos(brandName);
      searchResults.logo_urls = logoUrls;
      console.log(chalk.green(`  ✅ Found ${logoUrls.length} logo URLs for ${brandName}`));
    } catch (error) {
      console.log(chalk.yellow(`  ⚠️ Logo search failed: ${error.message}`));
    }

    return searchResults;
  }

  /**
   * Search Wikipedia for brand information
   */
  async searchWikipedia(brandName) {
    const page = this.stagehand.page;
    
    // Try multiple Wikipedia search variations
    const searchVariations = [
      `${brandName} bicycles`,
      `${brandName} bikes`, 
      `${brandName} cycling`,
      `${brandName} bicycle company`,
      `${brandName} bike manufacturer`,
      `${brandName} cycling brand`,
      brandName,
      `${brandName} corporation`,
      `${brandName} company`
    ];

    for (const searchTerm of searchVariations) {
      try {
        const searchUrl = `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(searchTerm)}&go=Go`;
        console.log(chalk.blue(`    🔍 Wikipedia search: "${searchTerm}"`));
        
        await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: CONFIG.TIMEOUT });
        await new Promise(resolve => setTimeout(resolve, CONFIG.NAV_DELAY));

        // Check if we landed on an article page or search results
        const currentUrl = page.url();
        
        if (currentUrl.includes('/wiki/') && !currentUrl.includes('Special:Search')) {
          // We found a direct article
          this.lastWikipediaUrl = currentUrl;
          const wikiData = await this.extractWikipediaData(page, currentUrl);
          if (wikiData && this.isRelevantToTerm(wikiData, brandName)) {
            return wikiData;
          }
        } else {
          // We're on search results, look for relevant links
          const relevantLink = await page.evaluate((brand) => {
            const links = Array.from(document.querySelectorAll('a[href*="/wiki/"]'));
            for (const link of links) {
              const text = link.textContent.toLowerCase();
              const href = link.href;
              if (text.includes(brand.toLowerCase()) && 
                  (text.includes('bicycle') || text.includes('bike') || text.includes('cycling'))) {
                return href;
              }
            }
            return null;
          }, brandName);
          
          if (relevantLink) {
            await page.goto(relevantLink, { waitUntil: "domcontentloaded" });
            this.lastWikipediaUrl = relevantLink;
            const wikiData = await this.extractWikipediaData(page, relevantLink);
            if (wikiData && this.isRelevantToTerm(wikiData, brandName)) {
              return wikiData;
            }
          }
        }
      } catch (error) {
        console.log(chalk.yellow(`    ⚠️ Wikipedia search variation failed: ${error.message}`));
        continue;
      }
    }
    
    return null;
  }

  /**
   * Extract data from Wikipedia page
   */
  async extractWikipediaData(page, url) {
    try {
      const wikiData = await page.evaluate(() => {
        const data = {
          url: window.location.href,
          title: document.title,
          extracted_at: new Date().toISOString()
        };

        // Extract infobox data
        const infobox = document.querySelector('.infobox');
        if (infobox) {
          data.infobox = {};
          const rows = infobox.querySelectorAll('tr');
          
          for (const row of rows) {
            const header = row.querySelector('th, .infobox-label');
            const content = row.querySelector('td, .infobox-data');
            
            if (header && content) {
              const key = header.textContent.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
              data.infobox[key] = content.textContent.trim();
            }
          }
        }

        // Extract first paragraph
        const firstPara = document.querySelector('.mw-parser-output > p');
        if (firstPara) {
          data.description = firstPara.textContent.trim();
        }

        // Extract images
        data.images = [];
        const images = document.querySelectorAll('img');
        for (const img of images) {
          if (img.src && (img.src.includes('upload.wikimedia.org') || img.src.includes('commons.wikimedia.org'))) {
            data.images.push({
              src: img.src,
              alt: img.alt || '',
              caption: img.closest('figure')?.querySelector('figcaption')?.textContent || ''
            });
          }
        }

        return data;
      });

      return wikiData;
    } catch (error) {
      console.log(chalk.yellow(`    ⚠️ Failed to extract Wikipedia data: ${error.message}`));
      return null;
    }
  }

  /**
   * Check if Wikipedia data is relevant to the brand
   */
  isRelevantToTerm(wikiData, brandName) {
    const content = (wikiData.title + ' ' + (wikiData.description || '')).toLowerCase();
    const brand = brandName.toLowerCase();
    
    return content.includes(brand) && 
           (content.includes('bicycle') || content.includes('bike') || content.includes('cycling'));
  }

  /**
   * Search for official website using multiple strategies
   */
  async searchOfficialWebsite(brandName) {
    const page = this.stagehand.page;
    
    // Strategy 1: Try direct domain guessing first
    const directUrls = [
      `https://www.${brandName.toLowerCase().replace(/\s+/g, '')}.com`,
      `https://www.${brandName.toLowerCase().replace(/\s+/g, '-')}.com`,
      `https://${brandName.toLowerCase().replace(/\s+/g, '')}.com`,
      `https://${brandName.toLowerCase().replace(/\s+/g, '-')}.com`,
      `https://www.${brandName.toLowerCase().replace(/\s+/g, '')}bikes.com`,
      `https://www.${brandName.toLowerCase().replace(/\s+/g, '')}bicycles.com`
    ];

    for (const url of directUrls) {
      try {
        console.log(chalk.blue(`    🔍 Testing direct URL: ${url}`));
        const response = await page.goto(url, { 
          waitUntil: "domcontentloaded", 
          timeout: 10000 
        });
        
        if (response && response.status() === 200) {
          // Check if this looks like a bicycle company website
          const isBikeWebsite = await page.evaluate(() => {
            const text = document.body.textContent.toLowerCase();
            return text.includes('bike') || text.includes('bicycle') || text.includes('cycling');
          });
          
          if (isBikeWebsite) {
            console.log(chalk.green(`    ✅ Found direct website: ${url}`));
            return [{
              url: url,
              title: brandName + ' Official Website',
              looks_official: true,
              search_method: 'direct_url'
            }];
          }
        }
      } catch (error) {
        // Ignore errors for direct URL tests
        continue;
      }
    }

    // Strategy 2: Use DuckDuckGo (more reliable than Google for automated searches)
    try {
      const searchQuery = `${brandName} bicycles official website`;
      console.log(chalk.blue(`    🔍 DuckDuckGo search: "${searchQuery}"`));
      const searchUrl = `https://duckduckgo.com/?q=${encodeURIComponent(searchQuery)}`;
      
      await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: CONFIG.TIMEOUT });
      await new Promise(resolve => setTimeout(resolve, CONFIG.NAV_DELAY));

      // Extract search results from DuckDuckGo
      const officialSites = await page.evaluate((brand) => {
        const results = [];
        const links = Array.from(document.querySelectorAll('a[href*="http"]'));
        const brandLower = brand.toLowerCase().replace(/[^a-z0-9]/g, '');
        
        for (const link of links) {
          const href = link.href;
          if (!href) continue;
          
          const urlLower = href.toLowerCase();
          const isOfficialDomain = 
            urlLower.includes(brandLower) ||
            urlLower.includes(brand.toLowerCase().replace(/\s+/g, '')) ||
            urlLower.includes(brand.toLowerCase().replace(/\s+/g, '-'));
          
          const isBadSite = 
            href.includes('duckduckgo.com') || 
            href.includes('wikipedia.org') ||
            href.includes('facebook.com') ||
            href.includes('amazon.com') ||
            href.includes('ebay.com');
          
          if (isOfficialDomain && !isBadSite) {
            results.push({
              url: href,
              title: link.textContent.trim(),
              looks_official: true,
              search_method: 'duckduckgo'
            });
          }
        }
        
        return results.slice(0, 3);
      }, brandName);

      if (officialSites && officialSites.length > 0) {
        console.log(chalk.green(`    ✅ Found ${officialSites.length} website candidates via DuckDuckGo`));
        return officialSites;
      }
    } catch (error) {
      console.log(chalk.yellow(`    ⚠️ DuckDuckGo search failed: ${error.message}`));
    }
    
    // Strategy 3: Wikipedia external links
    try {
      if (this.lastWikipediaUrl) {
        await page.goto(this.lastWikipediaUrl, { waitUntil: "domcontentloaded" });
        
        const externalLinks = await page.evaluate((brand) => {
          const brandLower = brand.toLowerCase().replace(/[^a-z0-9]/g, '');
          const links = Array.from(document.querySelectorAll('a[href*="http"]:not([href*="wikipedia.org"])'));
          
          for (const link of links) {
            const href = link.href;
            const urlLower = href.toLowerCase();
            
            if (urlLower.includes(brandLower) && 
                (urlLower.includes('.com') || urlLower.includes('.net') || urlLower.includes('.org'))) {
              return [{
                url: href,
                title: link.textContent.trim() || 'Official Website',
                looks_official: true,
                search_method: 'wikipedia_external'
              }];
            }
          }
          return [];
        }, brandName);
        
        if (externalLinks.length > 0) {
          console.log(chalk.green(`    ✅ Found website from Wikipedia external links`));
          return externalLinks;
        }
      }
    } catch (error) {
      console.log(chalk.yellow(`    ⚠️ Wikipedia external links search failed: ${error.message}`));
    }
    
    return null;
  }

  /**
   * Search for brand logos
   */
  async searchLogos(brandName) {
    const page = this.stagehand.page;
    
    try {
      const searchQuery = `${brandName} bicycle logo`;
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}&tbm=isch`;
      
      await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: CONFIG.TIMEOUT });
      await new Promise(resolve => setTimeout(resolve, CONFIG.NAV_DELAY));

      // Extract image URLs
      const logoUrls = await page.evaluate(() => {
        const images = [];
        const imgElements = document.querySelectorAll('img[src*="http"]');
        
        for (const img of imgElements) {
          if (img.src && img.src.includes('http') && !img.src.includes('google.com')) {
            images.push({
              url: img.src,
              alt: img.alt || '',
              width: img.naturalWidth || 0,
              height: img.naturalHeight || 0
            });
          }
        }
        
        return images.slice(0, 10); // Top 10 logo candidates
      });

      return logoUrls;
    } catch (error) {
      console.log(chalk.yellow(`    ⚠️ Logo search failed: ${error.message}`));
      return [];
    }
  }

  /**
   * Process and save brand data
   */
  async processBrandData(brand, searchResults) {
    const processedData = {
      name: brand.name,
      normalized_name: brand.normalized_name,
      bike_count_in_db: brand.catalog_count + brand.scraped_count,
      raw_scrape_data: searchResults
    };

    // Extract structured data from search results
    if (searchResults.wikipedia_data) {
      const wiki = searchResults.wikipedia_data;
      
      // Try to extract company information from Wikipedia infobox
      if (wiki.infobox) {
        const infobox = wiki.infobox;
        
        // Map common infobox fields with more variations
        const foundingFields = ['founded', 'established', 'inception', 'formation', 'founded_date', 'establishment'];
        for (const field of foundingFields) {
          if (infobox[field]) {
            const yearText = infobox[field];
            const yearMatch = yearText.match(/\d{4}/);
            if (yearMatch) {
              processedData.year_established = parseInt(yearMatch[0]);
              break;
            }
          }
        }
        
        const locationFields = ['headquarters', 'location', 'hq_location', 'base', 'headquarters_location'];
        for (const field of locationFields) {
          if (infobox[field]) {
            processedData.headquarters_location = infobox[field];
            break;
          }
        }
        
        const founderFields = ['founder', 'founders', 'founded_by', 'creator', 'established_by'];
        for (const field of founderFields) {
          if (infobox[field]) {
            processedData.founder = infobox[field];
            break;
          }
        }
        
        const parentFields = ['parent', 'parent_company', 'owner', 'parent_organization'];
        for (const field of parentFields) {
          if (infobox[field]) {
            processedData.parent_company = infobox[field];
            break;
          }
        }
      }
      
      processedData.wikipedia_url = wiki.url;
      processedData.company_description = wiki.description;
      processedData.wikipedia_data = wiki;
    }

    // Extract website information
    if (searchResults.official_website && searchResults.official_website.length > 0) {
      const topSite = searchResults.official_website[0];
      processedData.website_url = topSite.url;
    }

    // Extract logo information
    if (searchResults.logo_urls && searchResults.logo_urls.length > 0) {
      const bestLogo = searchResults.logo_urls[0]; // Take the first/best result
      processedData.logo_url = bestLogo.url;
    }

    // Calculate data quality score
    processedData.data_quality_score = this.calculateDataQuality(processedData);

    return processedData;
  }

  /**
   * Calculate data quality score based on available information
   */
  calculateDataQuality(data) {
    let score = 0;
    const maxScore = 10;

    if (data.year_established) score += 1;
    if (data.headquarters_location) score += 1;
    if (data.founder) score += 1;
    if (data.website_url) score += 2;
    if (data.wikipedia_url) score += 2;
    if (data.logo_url) score += 1;
    if (data.company_description) score += 1;
    if (data.bike_count_in_db > 0) score += 1;

    return (score / maxScore).toFixed(2);
  }

  /**
   * Save brand data to database
   */
  async saveBrandData(brandData) {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Insert new brand
      const insertResult = await client.query(`
        INSERT INTO bicycle_brands (
          name, normalized_name, year_established, founder, headquarters_location,
          parent_company, website_url, wikipedia_url, logo_url, bike_count_in_db,
          wikipedia_data, company_description, data_quality_score, raw_scrape_data
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING id
      `, [
        brandData.name,
        brandData.normalized_name,
        brandData.year_established || null,
        brandData.founder || null,
        brandData.headquarters_location || null,
        brandData.parent_company || null,
        brandData.website_url || null,
        brandData.wikipedia_url || null,
        brandData.logo_url || null,
        brandData.bike_count_in_db || 0,
        JSON.stringify(brandData.wikipedia_data || {}),
        brandData.company_description || null,
        brandData.data_quality_score || 0.0,
        JSON.stringify(brandData.raw_scrape_data || {})
      ]);

      await client.query('COMMIT');
      
      const brandId = insertResult.rows[0].id;
      console.log(chalk.green(`  ✅ Saved brand data for ${brandData.name} (ID: ${brandId})`));
      return brandId;
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.log(chalk.red(`  ❌ Failed to save brand ${brandData.name}: ${error.message}`));
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Main processing function
   */
  async processAll(options = {}) {
    const { limit = null, forceRescrape = false } = options;
    
    console.log(chalk.bold('\n🚀 Bicycle Brand Scraper\n'));
    
    // Get brands to scrape
    const brands = await this.getBrandsToScrape(limit, forceRescrape);
    this.stats.total = brands.length;
    
    console.log(chalk.blue(`Found ${this.stats.total} brands to process\n`));
    
    for (const brand of brands) {
      this.stats.processed++;
      const progress = `[${this.stats.processed}/${this.stats.total}]`;
      
      console.log(chalk.bold(`\n${progress} Processing: ${brand.display_name} (${brand.maker_id})`));
      
      try {
        // Search for brand information
        const searchResults = await this.searchBrandInfo(brand.name);
        
        // Process and structure the data
        const brandData = await this.processBrandData(brand, searchResults);
        
        // Save to database
        await this.saveBrandData(brandData);
        
        this.stats.successful++;
        
        // Log what we found
        console.log(chalk.green(`  ✅ Quality Score: ${brandData.data_quality_score}`));
        
      } catch (error) {
        this.stats.failed++;
        console.log(chalk.red(`  ❌ Error: ${error.message}`));
        
        this.stats.errors.push({
          brand: brand.name,
          error: error.message
        });
      }
      
      // Delay between requests to be respectful
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Print summary
    console.log(chalk.bold('\n📊 Brand Scraping Summary:'));
    console.log(`  Total processed: ${this.stats.processed}`);
    console.log(`  Successful: ${chalk.green(this.stats.successful)}`);
    console.log(`  Failed: ${chalk.red(this.stats.failed)}`);
    console.log(`  Success rate: ${((this.stats.successful / this.stats.processed) * 100).toFixed(1)}%`);
  }

  async cleanup() {
    await this.pool.end();
    if (this.stagehand) {
      await this.stagehand.close();
    }
  }
}

// Main execution
async function main() {
  const scraper = new BicycleBrandScraper();
  
  try {
    await scraper.initialize();
    
    // Parse command line arguments
    const args = process.argv.slice(2);
    const limit = args.find(arg => arg.startsWith('--limit='))?.split('=')[1];
    const forceRescrape = args.includes('--force-rescrape');
    
    if (args.includes('--help')) {
      console.log(`
${chalk.bold('Bicycle Brand Scraper')}

Usage: node bicycle_brand_scraper.js [options]

Options:
  --limit=N         Process only N brands (useful for testing)
  --force-rescrape  Re-scrape all brands, including already scraped ones
  --help            Show this help message

This scraper collects comprehensive information about bicycle brands including:
- Company information (founded, headquarters, founder)
- Wikipedia data and descriptions
- Official websites and contact info
- Brand logos and visual assets
- Business information where available
`);
      process.exit(0);
    }
    
    await scraper.processAll({
      limit: limit ? parseInt(limit) : null,
      forceRescrape: forceRescrape
    });
    
  } catch (error) {
    console.error(chalk.red('\n❌ Fatal error:'), error.message);
    console.error(error.stack);
  } finally {
    await scraper.cleanup();
  }
}

// Run the scraper
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default BicycleBrandScraper;