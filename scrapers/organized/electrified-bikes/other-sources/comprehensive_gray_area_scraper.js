const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs').promises;
const path = require('path');
const { dataSources, specPatterns } = require('./gray_area_ebike_data_sources');

class ComprehensiveGrayAreaScraper {
  constructor() {
    this.browser = null;
    this.results = {
      timestamp: new Date().toISOString(),
      brands: {},
      sources: {
        manufacturers: [],
        retailers: [],
        reviews: [],
        forums: []
      },
      stats: {
        totalBrands: 0,
        totalModels: 0,
        totalVariants: 0,
        sourcesScraped: 0
      }
    };
  }

  async init() {
    this.browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled'],
      defaultViewport: { width: 1920, height: 1080 }
    });
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  // Extract specs from text using patterns
  extractSpecs(text) {
    const specs = {};
    
    // Motor power
    for (const pattern of specPatterns.motor) {
      const match = text.match(pattern);
      if (match) {
        specs.motor = match[1] + 'W';
        break;
      }
    }
    
    // Battery
    for (const pattern of specPatterns.battery) {
      const match = text.match(pattern);
      if (match) {
        specs.battery = match[0];
        break;
      }
    }
    
    // Top speed
    for (const pattern of specPatterns.topSpeed) {
      const match = text.match(pattern);
      if (match) {
        specs.topSpeed = match[1] + 'mph';
        break;
      }
    }
    
    // Range
    for (const pattern of specPatterns.range) {
      const match = text.match(pattern);
      if (match) {
        specs.range = match[1] + ' miles';
        break;
      }
    }
    
    // Weight
    for (const pattern of specPatterns.weight) {
      const match = text.match(pattern);
      if (match) {
        specs.weight = match[1] + (match[0].includes('kg') ? 'kg' : 'lbs');
        break;
      }
    }
    
    return specs;
  }

  // Generic manufacturer scraper
  async scrapeManufacturer(manufacturer) {
    console.log(`Scraping ${manufacturer.name}...`);
    const page = await this.browser.newPage();
    const brandData = {
      name: manufacturer.name,
      models: [],
      source: manufacturer.urls[0],
      scrapedAt: new Date().toISOString()
    };

    try {
      for (const url of manufacturer.urls) {
        try {
          await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
          
          // Wait for content
          await page.waitForTimeout(2000);
          
          // Get page content
          const content = await page.content();
          const $ = cheerio.load(content);
          
          // Extract product links
          const productLinks = [];
          $('a').each((i, elem) => {
            const href = $(elem).attr('href');
            const text = $(elem).text();
            if (href && (text.toLowerCase().includes('bike') || 
                        text.toLowerCase().includes('model') ||
                        href.includes('/product') ||
                        href.includes('/model'))) {
              const fullUrl = href.startsWith('http') ? href : new URL(href, url).href;
              productLinks.push({ url: fullUrl, text: text.trim() });
            }
          });
          
          // Visit each product page
          for (const link of productLinks.slice(0, 10)) { // Limit to avoid overload
            try {
              await page.goto(link.url, { waitUntil: 'networkidle2', timeout: 30000 });
              const productContent = await page.content();
              const $product = cheerio.load(productContent);
              
              // Extract all text content
              const fullText = $product('body').text();
              const specs = this.extractSpecs(fullText);
              
              if (Object.keys(specs).length > 0) {
                brandData.models.push({
                  name: link.text,
                  url: link.url,
                  specs: specs
                });
              }
            } catch (err) {
              console.log(`Failed to scrape product ${link.text}`);
            }
          }
        } catch (err) {
          console.log(`Failed to access ${url}`);
        }
      }
      
      if (brandData.models.length > 0) {
        this.results.brands[manufacturer.name] = brandData;
        this.results.stats.totalBrands++;
        this.results.stats.totalModels += brandData.models.length;
      }
      
    } catch (error) {
      console.error(`Error scraping ${manufacturer.name}:`, error.message);
    }
    
    await page.close();
  }

  // Scrape retailer sites
  async scrapeRetailer(retailer) {
    console.log(`Scraping retailer: ${retailer.name}...`);
    try {
      const response = await axios.get(retailer.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      const $ = cheerio.load(response.data);
      const products = [];
      
      // Common product selectors
      const selectors = [
        '.product', '.product-item', '.product-card',
        '.grid-item', '.collection-item', '.bike-item'
      ];
      
      for (const selector of selectors) {
        $(selector).each((i, elem) => {
          const $elem = $(elem);
          const text = $elem.text();
          const specs = this.extractSpecs(text);
          
          if (specs.motor && parseInt(specs.motor) > 750) { // Gray area bikes
            products.push({
              retailer: retailer.name,
              text: text.substring(0, 200),
              specs: specs
            });
          }
        });
      }
      
      if (products.length > 0) {
        this.results.sources.retailers.push({
          name: retailer.name,
          url: retailer.url,
          products: products,
          count: products.length
        });
      }
      
    } catch (error) {
      console.error(`Error scraping retailer ${retailer.name}:`, error.message);
    }
  }

  // Scrape review sites
  async scrapeReviewSite(site) {
    console.log(`Scraping review site: ${site.name}...`);
    const reviews = [];
    
    for (const url of (site.categories || [site.url])) {
      try {
        const response = await axios.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        
        const $ = cheerio.load(response.data);
        
        // Extract review articles
        $('article, .post, .review').each((i, elem) => {
          const $elem = $(elem);
          const title = $elem.find('h1, h2, h3, .title').first().text().trim();
          const content = $elem.text();
          
          // Look for high-power e-bikes
          if (title && (content.includes('Sur-Ron') || 
                       content.includes('Talaria') ||
                       content.includes('high power') ||
                       content.match(/\d{4,}W/))) {
            const specs = this.extractSpecs(content);
            reviews.push({
              title: title,
              url: url,
              specs: specs
            });
          }
        });
        
      } catch (error) {
        console.error(`Error scraping ${url}:`, error.message);
      }
    }
    
    if (reviews.length > 0) {
      this.results.sources.reviews.push({
        name: site.name,
        reviews: reviews,
        count: reviews.length
      });
    }
  }

  // Scrape forums for brand mentions
  async scrapeForum(forum) {
    console.log(`Scraping forum: ${forum.name}...`);
    const page = await this.browser.newPage();
    const mentions = [];
    
    try {
      await page.goto(forum.url, { waitUntil: 'networkidle2', timeout: 30000 });
      
      const topics = await page.evaluate(() => {
        const items = [];
        document.querySelectorAll('a').forEach(link => {
          const text = link.textContent || '';
          if (text.match(/sur-ron|talaria|high power|5000w|8000w|stealth|onyx/i)) {
            items.push({
              text: text.trim(),
              url: link.href
            });
          }
        });
        return items.slice(0, 50); // Limit results
      });
      
      if (topics.length > 0) {
        this.results.sources.forums.push({
          name: forum.name,
          url: forum.url,
          topics: topics,
          count: topics.length
        });
      }
      
    } catch (error) {
      console.error(`Error scraping forum ${forum.name}:`, error.message);
    }
    
    await page.close();
  }

  // Main scraping orchestrator
  async scrapeAll() {
    await this.init();
    
    console.log('Starting comprehensive gray area e-bike data collection...\n');
    
    // Scrape manufacturers
    console.log('=== SCRAPING MANUFACTURERS ===');
    for (const manufacturer of dataSources.manufacturers) {
      await this.scrapeManufacturer(manufacturer);
      this.results.stats.sourcesScraped++;
    }
    
    // Scrape retailers
    console.log('\n=== SCRAPING RETAILERS ===');
    for (const retailer of dataSources.retailers) {
      await this.scrapeRetailer(retailer);
      this.results.stats.sourcesScraped++;
    }
    
    // Scrape review sites
    console.log('\n=== SCRAPING REVIEW SITES ===');
    for (const site of dataSources.reviewSites) {
      await this.scrapeReviewSite(site);
      this.results.stats.sourcesScraped++;
    }
    
    // Scrape forums
    console.log('\n=== SCRAPING FORUMS ===');
    for (const forum of dataSources.forums.slice(0, 3)) { // Limit forum scraping
      await this.scrapeForum(forum);
      this.results.stats.sourcesScraped++;
    }
    
    await this.close();
    
    // Save results
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `gray_area_ebikes_comprehensive_${timestamp}.json`;
    const filepath = path.join(__dirname, 'scraped_data', filename);
    
    await fs.mkdir(path.join(__dirname, 'scraped_data'), { recursive: true });
    await fs.writeFile(filepath, JSON.stringify(this.results, null, 2));
    
    // Generate summary
    console.log('\n=== SCRAPING SUMMARY ===');
    console.log(`Total sources scraped: ${this.results.stats.sourcesScraped}`);
    console.log(`Brands found: ${this.results.stats.totalBrands}`);
    console.log(`Models found: ${this.results.stats.totalModels}`);
    console.log(`Results saved to: ${filepath}`);
    
    return filepath;
  }
}

// Run if called directly
if (require.main === module) {
  const scraper = new ComprehensiveGrayAreaScraper();
  scraper.scrapeAll()
    .then(filepath => {
      console.log('\nScraping completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\nScraping failed:', error);
      process.exit(1);
    });
}

module.exports = ComprehensiveGrayAreaScraper;