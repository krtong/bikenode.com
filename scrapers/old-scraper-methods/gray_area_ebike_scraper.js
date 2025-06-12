const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

// Gray Area E-Bike Scraper
// Targets: manufacturer sites, retailers, review sites, forums

class GrayAreaEBikeScraper {
  constructor() {
    this.browser = null;
    this.results = {
      manufacturers: {},
      retailers: {},
      reviews: {},
      forums: {}
    };
  }

  async init() {
    this.browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  // MANUFACTURER SCRAPERS
  async scrapeSurRon() {
    console.log('Scraping Sur-Ron USA...');
    const page = await this.browser.newPage();
    try {
      await page.goto('https://sur-ronusa.com/collections/all', { waitUntil: 'networkidle2' });
      
      const products = await page.evaluate(() => {
        const items = [];
        document.querySelectorAll('.product-item').forEach(item => {
          const name = item.querySelector('.product-item__title')?.textContent?.trim();
          const price = item.querySelector('.price')?.textContent?.trim();
          const link = item.querySelector('a')?.href;
          if (name) {
            items.push({ name, price, link });
          }
        });
        return items;
      });

      // Get details for each product
      for (const product of products) {
        if (product.link) {
          await page.goto(product.link, { waitUntil: 'networkidle2' });
          const details = await page.evaluate(() => {
            const specs = {};
            document.querySelectorAll('.product__description li').forEach(li => {
              const text = li.textContent;
              if (text.includes('Motor:')) specs.motor = text.split('Motor:')[1]?.trim();
              if (text.includes('Battery:')) specs.battery = text.split('Battery:')[1]?.trim();
              if (text.includes('Top Speed:')) specs.topSpeed = text.split('Top Speed:')[1]?.trim();
              if (text.includes('Weight:')) specs.weight = text.split('Weight:')[1]?.trim();
            });
            return specs;
          });
          product.specs = details;
        }
      }

      this.results.manufacturers['Sur-Ron'] = products;
    } catch (error) {
      console.error('Error scraping Sur-Ron:', error);
    }
    await page.close();
  }

  async scrapeTalaria() {
    console.log('Scraping Talaria...');
    const page = await this.browser.newPage();
    try {
      await page.goto('https://talaria.bike/pages/bikes', { waitUntil: 'networkidle2' });
      
      const products = await page.evaluate(() => {
        const items = [];
        document.querySelectorAll('.product-card').forEach(card => {
          const name = card.querySelector('.product-card__title')?.textContent?.trim();
          const specs = card.querySelector('.product-card__description')?.textContent?.trim();
          if (name) {
            items.push({ name, specs });
          }
        });
        return items;
      });

      this.results.manufacturers['Talaria'] = products;
    } catch (error) {
      console.error('Error scraping Talaria:', error);
    }
    await page.close();
  }

  async scrapeSegway() {
    console.log('Scraping Segway Powersports...');
    const page = await this.browser.newPage();
    try {
      await page.goto('https://powersports.segway.com/off-road/', { waitUntil: 'networkidle2' });
      
      const products = await page.evaluate(() => {
        const items = [];
        document.querySelectorAll('.product-item').forEach(item => {
          const name = item.querySelector('.product-name')?.textContent?.trim();
          const price = item.querySelector('.price')?.textContent?.trim();
          if (name) {
            items.push({ name, price });
          }
        });
        return items;
      });

      this.results.manufacturers['Segway'] = products;
    } catch (error) {
      console.error('Error scraping Segway:', error);
    }
    await page.close();
  }

  // RETAILER SCRAPERS
  async scrapeLunaCycle() {
    console.log('Scraping Luna Cycle...');
    const page = await this.browser.newPage();
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

      this.results.retailers['Luna Cycle'] = products;
    } catch (error) {
      console.error('Error scraping Luna Cycle:', error);
    }
    await page.close();
  }

  async scrapeElectricBikeCompany() {
    console.log('Scraping Electric Bike Company...');
    const page = await this.browser.newPage();
    try {
      await page.goto('https://electricbikecompany.com/collections/electric-bikes', { waitUntil: 'networkidle2' });
      
      const products = await page.evaluate(() => {
        const items = [];
        document.querySelectorAll('.grid-product').forEach(product => {
          const name = product.querySelector('.grid-product__title')?.textContent?.trim();
          const price = product.querySelector('.grid-product__price')?.textContent?.trim();
          if (name) {
            items.push({ name, price });
          }
        });
        return items;
      });

      this.results.retailers['Electric Bike Company'] = products;
    } catch (error) {
      console.error('Error scraping Electric Bike Company:', error);
    }
    await page.close();
  }

  // REVIEW SITE SCRAPERS
  async scrapeElectricBikeReview() {
    console.log('Scraping ElectricBikeReview.com...');
    const page = await this.browser.newPage();
    try {
      await page.goto('https://electricbikereview.com/category/high-speed/', { waitUntil: 'networkidle2' });
      
      const reviews = await page.evaluate(() => {
        const items = [];
        document.querySelectorAll('.post').forEach(post => {
          const title = post.querySelector('.entry-title')?.textContent?.trim();
          const link = post.querySelector('.entry-title a')?.href;
          const excerpt = post.querySelector('.entry-summary')?.textContent?.trim();
          if (title) {
            items.push({ title, link, excerpt });
          }
        });
        return items;
      });

      this.results.reviews['ElectricBikeReview'] = reviews;
    } catch (error) {
      console.error('Error scraping ElectricBikeReview:', error);
    }
    await page.close();
  }

  // FORUM SCRAPERS
  async scrapeEndlessSphere() {
    console.log('Scraping Endless Sphere forums...');
    const page = await this.browser.newPage();
    try {
      await page.goto('https://endless-sphere.com/forums/viewforum.php?f=2', { waitUntil: 'networkidle2' });
      
      const topics = await page.evaluate(() => {
        const items = [];
        document.querySelectorAll('.topictitle').forEach(topic => {
          const title = topic.textContent?.trim();
          const link = topic.href;
          if (title && (title.toLowerCase().includes('sur-ron') || 
                       title.toLowerCase().includes('talaria') ||
                       title.toLowerCase().includes('high power'))) {
            items.push({ title, link });
          }
        });
        return items.slice(0, 20); // Limit to recent relevant topics
      });

      this.results.forums['EndlessSphere'] = topics;
    } catch (error) {
      console.error('Error scraping Endless Sphere:', error);
    }
    await page.close();
  }

  // AGGREGATOR SCRAPERS
  async scrapeElectrek() {
    console.log('Scraping Electrek e-bike section...');
    const page = await this.browser.newPage();
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

      this.results.reviews['Electrek'] = articles;
    } catch (error) {
      console.error('Error scraping Electrek:', error);
    }
    await page.close();
  }

  // Save results
  async saveResults() {
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `gray_area_ebikes_scraped_${timestamp}.json`;
    const filepath = path.join(__dirname, 'scraped_data', filename);
    
    await fs.mkdir(path.join(__dirname, 'scraped_data'), { recursive: true });
    await fs.writeFile(filepath, JSON.stringify(this.results, null, 2));
    
    console.log(`Results saved to ${filepath}`);
    return filepath;
  }

  // Main scraping function
  async scrapeAll() {
    await this.init();
    
    console.log('Starting comprehensive gray area e-bike scraping...');
    
    // Manufacturer sites
    await this.scrapeSurRon();
    await this.scrapeTalaria();
    await this.scrapeSegway();
    
    // Retailer sites
    await this.scrapeLunaCycle();
    await this.scrapeElectricBikeCompany();
    
    // Review sites
    await this.scrapeElectricBikeReview();
    await this.scrapeElectrek();
    
    // Forums
    await this.scrapeEndlessSphere();
    
    await this.close();
    
    const filepath = await this.saveResults();
    return filepath;
  }
}

// Run the scraper
if (require.main === module) {
  const scraper = new GrayAreaEBikeScraper();
  scraper.scrapeAll()
    .then(filepath => {
      console.log('Scraping completed!');
      console.log(`Data saved to: ${filepath}`);
    })
    .catch(error => {
      console.error('Scraping failed:', error);
      process.exit(1);
    });
}

module.exports = GrayAreaEBikeScraper;