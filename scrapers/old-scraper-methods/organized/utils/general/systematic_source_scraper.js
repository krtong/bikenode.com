const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs').promises;
const { targetSources, validationCriteria, scrapingOrder } = require('./gray_area_target_sources');

// Systematic scraper to work through target sources in priority order
class SystematicSourceScraper {
  constructor() {
    this.browser = null;
    this.scrapedData = {
      sourceResults: {},
      brandMentions: {},
      crossReferences: {},
      completionStatus: {
        sourcesCovered: 0,
        brandsFound: 0,
        brandsValidated: 0,
        lastUpdated: null
      }
    };
  }

  async init() {
    this.browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  }

  async close() {
    if (this.browser) await this.browser.close();
  }

  // Scrape Electric Bike Review systematically
  async scrapeElectricBikeReview() {
    console.log('Scraping Electric Bike Review...');
    const page = await this.browser.newPage();
    const results = { brands: [], models: [], reviews: [] };

    try {
      // Scrape high-speed category
      await page.goto('https://electricbikereview.com/category/high-speed/', { waitUntil: 'networkidle2' });
      
      const highSpeedBikes = await page.evaluate(() => {
        const bikes = [];
        document.querySelectorAll('article').forEach(article => {
          const title = article.querySelector('h2 a')?.textContent?.trim();
          const link = article.querySelector('h2 a')?.href;
          const excerpt = article.querySelector('.entry-summary')?.textContent?.trim();
          
          if (title && link) {
            bikes.push({ title, link, excerpt, category: 'high-speed' });
          }
        });
        return bikes;
      });

      // Scrape moped-style category  
      await page.goto('https://electricbikereview.com/category/moped-style/', { waitUntil: 'networkidle2' });
      
      const mopedBikes = await page.evaluate(() => {
        const bikes = [];
        document.querySelectorAll('article').forEach(article => {
          const title = article.querySelector('h2 a')?.textContent?.trim();
          const link = article.querySelector('h2 a')?.href;
          const excerpt = article.querySelector('.entry-summary')?.textContent?.trim();
          
          if (title && link) {
            bikes.push({ title, link, excerpt, category: 'moped-style' });
          }
        });
        return bikes;
      });

      // Extract brand names from titles
      const allBikes = [...highSpeedBikes, ...mopedBikes];
      const brandPattern = /(Sur-?Ron|Talaria|Super\s?73|Onyx|Ariel\s+Rider|Juiced|Monday|Cake|Stealth|Delfast|Watt\s+Wagons|Biktrix|Luna|Vintage\s+Electric|Michael\s+Blast)/gi;
      
      allBikes.forEach(bike => {
        const matches = bike.title.match(brandPattern);
        if (matches) {
          matches.forEach(brand => {
            if (!results.brands.includes(brand)) {
              results.brands.push(brand);
            }
          });
        }
      });

      results.reviews = allBikes;
      this.scrapedData.sourceResults['electricbikereview.com'] = results;
      this.scrapedData.completionStatus.sourcesCovered++;

    } catch (error) {
      console.error('Error scraping Electric Bike Review:', error);
    }

    await page.close();
    return results;
  }

  // Scrape Endless Sphere forums
  async scrapeEndlessSphere() {
    console.log('Scraping Endless Sphere...');
    const page = await this.browser.newPage();
    const results = { topics: [], brands: [] };

    try {
      // General e-bike discussion
      await page.goto('https://endless-sphere.com/forums/viewforum.php?f=2', { waitUntil: 'networkidle2' });
      
      const topics = await page.evaluate(() => {
        const topicList = [];
        document.querySelectorAll('.topictitle').forEach(topic => {
          const title = topic.textContent?.trim();
          const link = topic.href;
          if (title && link) {
            topicList.push({ title, link });
          }
        });
        return topicList.slice(0, 50); // Latest 50 topics
      });

      // Extract brand mentions
      const brandPattern = /(Sur-?Ron|Talaria|Super\s?73|Onyx|Ariel\s+Rider|Juiced|Monday|Cake|Stealth|Delfast|Luna|BBSHD|QS\s+Motor|Bafang)/gi;
      
      topics.forEach(topic => {
        const matches = topic.title.match(brandPattern);
        if (matches) {
          matches.forEach(brand => {
            if (!results.brands.includes(brand)) {
              results.brands.push(brand);
            }
          });
        }
      });

      results.topics = topics;
      this.scrapedData.sourceResults['endless-sphere.com'] = results;
      this.scrapedData.completionStatus.sourcesCovered++;

    } catch (error) {
      console.error('Error scraping Endless Sphere:', error);
    }

    await page.close();
    return results;
  }

  // Scrape Reddit r/ebikes
  async scrapeRedditEbikes() {
    console.log('Scraping Reddit r/ebikes...');
    const results = { posts: [], brands: [] };

    try {
      // Use Reddit API
      const response = await axios.get('https://www.reddit.com/r/ebikes.json?limit=100');
      const posts = response.data.data.children;

      const brandPattern = /(Sur-?Ron|Talaria|Super\s?73|Onyx|Ariel\s+Rider|Juiced|Monday|Cake|Stealth|Delfast|Watt\s+Wagons|Biktrix|Luna|Vintage\s+Electric)/gi;

      posts.forEach(post => {
        const title = post.data.title;
        const selftext = post.data.selftext || '';
        const fullText = `${title} ${selftext}`;
        
        const matches = fullText.match(brandPattern);
        if (matches) {
          matches.forEach(brand => {
            if (!results.brands.includes(brand)) {
              results.brands.push(brand);
            }
          });
          
          results.posts.push({
            title: title,
            url: post.data.url,
            score: post.data.score,
            num_comments: post.data.num_comments
          });
        }
      });

      this.scrapedData.sourceResults['reddit.com/r/ebikes'] = results;
      this.scrapedData.completionStatus.sourcesCovered++;

    } catch (error) {
      console.error('Error scraping Reddit r/ebikes:', error);
    }

    return results;
  }

  // Scrape Luna Cycle for brands/models
  async scrapeLunaCycle() {
    console.log('Scraping Luna Cycle...');
    const page = await this.browser.newPage();
    const results = { products: [], brands: [] };

    try {
      await page.goto('https://lunacycle.com/electric-bikes/', { waitUntil: 'networkidle2' });
      
      const products = await page.evaluate(() => {
        const items = [];
        document.querySelectorAll('.product').forEach(product => {
          const name = product.querySelector('.woocommerce-loop-product__title')?.textContent?.trim();
          const price = product.querySelector('.price')?.textContent?.trim();
          const link = product.querySelector('a')?.href;
          
          if (name) {
            items.push({ name, price, link });
          }
        });
        return items;
      });

      // Extract any brand mentions
      products.forEach(product => {
        // Look for Sur-Ron, Talaria mentions
        if (product.name.toLowerCase().includes('sur-ron') || 
            product.name.toLowerCase().includes('surron')) {
          if (!results.brands.includes('Sur-Ron')) results.brands.push('Sur-Ron');
        }
        if (product.name.toLowerCase().includes('talaria')) {
          if (!results.brands.includes('Talaria')) results.brands.push('Talaria');
        }
      });

      results.products = products;
      this.scrapedData.sourceResults['lunacycle.com'] = results;
      this.scrapedData.completionStatus.sourcesCovered++;

    } catch (error) {
      console.error('Error scraping Luna Cycle:', error);
    }

    await page.close();
    return results;
  }

  // Cross-reference brands across sources
  updateCrossReferences() {
    const allBrands = new Set();
    
    // Collect all brand mentions
    Object.values(this.scrapedData.sourceResults).forEach(source => {
      if (source.brands) {
        source.brands.forEach(brand => allBrands.add(brand.toLowerCase()));
      }
    });

    // Count occurrences across sources
    allBrands.forEach(brand => {
      const sources = [];
      Object.entries(this.scrapedData.sourceResults).forEach(([sourceName, sourceData]) => {
        if (sourceData.brands && sourceData.brands.some(b => b.toLowerCase() === brand)) {
          sources.push(sourceName);
        }
      });
      
      this.scrapedData.crossReferences[brand] = {
        sources: sources,
        sourceCount: sources.length,
        validated: sources.length >= validationCriteria.brandValidation.minSourcesPerBrand
      };
    });

    // Update completion metrics
    this.scrapedData.completionStatus.brandsFound = allBrands.size;
    this.scrapedData.completionStatus.brandsValidated = Object.values(this.scrapedData.crossReferences)
      .filter(brand => brand.validated).length;
    this.scrapedData.completionStatus.lastUpdated = new Date().toISOString();
  }

  // Scrape Electrek
  async scrapeElectrek() {
    console.log('Scraping Electrek...');
    const page = await this.browser.newPage();
    const results = { articles: [], brands: [] };

    try {
      await page.goto('https://electrek.co/guides/electric-bicycle/', { waitUntil: 'networkidle2' });
      
      const articles = await page.evaluate(() => {
        const items = [];
        document.querySelectorAll('article').forEach(article => {
          const title = article.querySelector('h2')?.textContent?.trim();
          const link = article.querySelector('a')?.href;
          if (title && title.toLowerCase().includes('bike')) {
            items.push({ title, link });
          }
        });
        return items.slice(0, 30);
      });

      const brandPattern = /(Sur-?Ron|Talaria|Super\s?73|Onyx|Ariel\s+Rider|Juiced|Monday|Cake|Stealth|Delfast|Watt\s+Wagons|Biktrix|Luna|Vintage\s+Electric|Michael\s+Blast|VanMoof|Cowboy|Rad\s+Power)/gi;
      
      articles.forEach(article => {
        const matches = article.title.match(brandPattern);
        if (matches) {
          matches.forEach(brand => {
            if (!results.brands.includes(brand)) {
              results.brands.push(brand);
            }
          });
        }
      });

      results.articles = articles;
      this.scrapedData.sourceResults['electrek.co'] = results;
      this.scrapedData.completionStatus.sourcesCovered++;

    } catch (error) {
      console.error('Error scraping Electrek:', error);
    }

    await page.close();
    return results;
  }

  // Scrape manufacturer sites
  async scrapeManufacturerSites() {
    console.log('Scraping manufacturer sites...');
    const manufacturers = [
      { name: 'Sur-Ron USA', url: 'https://sur-ronusa.com' },
      { name: 'Super73', url: 'https://super73.com' },
      { name: 'Onyx Motorbikes', url: 'https://onyxmotorbikes.com' },
      { name: 'Ariel Rider', url: 'https://arielrider.com' },
      { name: 'Juiced Bikes', url: 'https://www.juicedbikes.com' }
    ];

    for (const manufacturer of manufacturers) {
      const page = await this.browser.newPage();
      try {
        await page.goto(manufacturer.url, { waitUntil: 'networkidle2', timeout: 30000 });
        
        const content = await page.evaluate(() => {
          return document.body.textContent;
        });

        // Extract model names and specs
        const modelPattern = /(Light\s+Bee|Storm\s+Bee|Ultra\s+Bee|S2|RX|ZX|Z1|RCR|CTY2|LZR|Grizzly|X-Class|D-Class|Scorpion|HyperScorpion)/gi;
        const powerPattern = /(\d+)W|(\d+)\s*watts?|(\d+)kW/gi;
        
        const models = content.match(modelPattern) || [];
        const powerSpecs = content.match(powerPattern) || [];

        this.scrapedData.sourceResults[manufacturer.url] = {
          brand: manufacturer.name,
          models: [...new Set(models)],
          powerSpecs: [...new Set(powerSpecs)],
          brands: [manufacturer.name]
        };

        this.scrapedData.completionStatus.sourcesCovered++;
        console.log(`✓ ${manufacturer.name}: Found ${models.length} models`);

      } catch (error) {
        console.error(`Error scraping ${manufacturer.name}:`, error.message);
      }
      await page.close();
    }
  }

  // Scrape EM3ev for high-power builds
  async scrapeEM3ev() {
    console.log('Scraping EM3ev...');
    const page = await this.browser.newPage();
    const results = { products: [], brands: [] };

    try {
      await page.goto('https://em3ev.com', { waitUntil: 'networkidle2' });
      
      const content = await page.evaluate(() => {
        return document.body.textContent;
      });

      // Look for high-power mentions
      const powerPattern = /(3000W|5000W|8000W|10000W)/gi;
      const brandPattern = /(Sur-?Ron|Talaria|BBSHD|QS\s+Motor|Bafang|Ultra)/gi;
      
      const powerMentions = content.match(powerPattern) || [];
      const brandMentions = content.match(brandPattern) || [];

      results.powerSpecs = [...new Set(powerMentions)];
      results.brands = [...new Set(brandMentions)];

      this.scrapedData.sourceResults['em3ev.com'] = results;
      this.scrapedData.completionStatus.sourcesCovered++;

    } catch (error) {
      console.error('Error scraping EM3ev:', error);
    }

    await page.close();
    return results;
  }

  // Scrape Grin Technologies
  async scrapeGrinTech() {
    console.log('Scraping Grin Technologies...');
    const page = await this.browser.newPage();
    const results = { products: [], brands: [] };

    try {
      await page.goto('https://ebikes.ca', { waitUntil: 'networkidle2' });
      
      const products = await page.evaluate(() => {
        const items = [];
        document.querySelectorAll('a').forEach(link => {
          const text = link.textContent;
          if (text && (text.includes('Motor') || text.includes('Controller') || text.includes('Battery'))) {
            items.push(text.trim());
          }
        });
        return items.slice(0, 20);
      });

      // Look for high-power components
      const highPowerProducts = products.filter(product => 
        product.match(/(\d+)W/) && parseInt(product.match(/(\d+)W/)[1]) >= 1000
      );

      results.products = highPowerProducts;
      results.brands = ['Grin Technologies'];

      this.scrapedData.sourceResults['ebikes.ca'] = results;
      this.scrapedData.completionStatus.sourcesCovered++;

    } catch (error) {
      console.error('Error scraping Grin Technologies:', error);
    }

    await page.close();
    return results;
  }

  // Run systematic scraping in priority order
  async runSystematicScraping() {
    await this.init();
    
    console.log('Starting systematic source scraping...\n');
    
    // Phase 1: Critical sources
    await this.scrapeElectricBikeReview();
    await this.scrapeEndlessSphere();
    await this.scrapeRedditEbikes();
    await this.scrapeLunaCycle();

    // Phase 2: Additional critical sources
    await this.scrapeElectrek();
    await this.scrapeEM3ev();
    await this.scrapeGrinTech();

    // Phase 3: Manufacturer sites
    await this.scrapeManufacturerSites();
    
    // Update cross-references after each phase
    this.updateCrossReferences();
    
    // Generate progress report
    const report = this.generateProgressReport();
    console.log('\n=== PROGRESS REPORT ===');
    console.log(`Sources scraped: ${report.sourcesCovered}/${validationCriteria.completenessCheck.sourcesCovered}`);
    console.log(`Brands found: ${report.brandsFound}`);
    console.log(`Brands validated: ${report.brandsValidated} (${report.validationRate}%)`);
    console.log(`Completion: ${report.overallCompletion}%`);
    
    await this.close();
    
    // Save results
    await this.saveResults();
    return this.scrapedData;
  }

  generateProgressReport() {
    const status = this.scrapedData.completionStatus;
    const criteria = validationCriteria.completenessCheck;
    
    return {
      sourcesCovered: status.sourcesCovered,
      brandsFound: status.brandsFound,
      brandsValidated: status.brandsValidated,
      validationRate: Math.round((status.brandsValidated / status.brandsFound) * 100),
      overallCompletion: Math.round((status.sourcesCovered / criteria.sourcesCovered) * 100),
      lastUpdated: status.lastUpdated
    };
  }

  async saveResults() {
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `systematic_scraping_results_${timestamp}.json`;
    await fs.writeFile(filename, JSON.stringify(this.scrapedData, null, 2));
    console.log(`\nResults saved to: ${filename}`);
  }
}

// Run if called directly
if (require.main === module) {
  const scraper = new SystematicSourceScraper();
  scraper.runSystematicScraping()
    .then(() => {
      console.log('\nSystematic scraping completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('Scraping failed:', error);
      process.exit(1);
    });
}

module.exports = SystematicSourceScraper;