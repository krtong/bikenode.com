const puppeteer = require('puppeteer');
const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'bikenode',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || ''
});

// Working sources that we can actually scrape
const WORKING_SOURCES = [
  {
    name: 'Luna Cycle',
    url: 'https://lunacycle.com/electric-bikes/',
    description: 'Retailer with Sur-Ron, Talaria models',
    selectors: {
      products: '.product-item',
      title: '.product-item-link',
      price: '.price',
      link: 'a.product-item-link'
    }
  },
  {
    name: 'Electric Bike Company',
    url: 'https://electricbikecompany.com/pages/e-bikes',
    description: 'US manufacturer',
    selectors: {
      products: '.product-item',
      title: '.product-item__title',
      price: '.product-price'
    }
  }
];

async function scrapeRealData() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const allData = [];
  
  for (const source of WORKING_SOURCES) {
    console.log(`\n📍 Scraping ${source.name}...`);
    console.log(`   URL: ${source.url}`);
    
    try {
      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
      
      await page.goto(source.url, {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });
      
      // Wait for content
      await page.waitForSelector('body', { timeout: 5000 }).catch(() => {});
      
      // Extract data
      const products = await page.evaluate((selectors) => {
        const items = [];
        const productElements = document.querySelectorAll(selectors.products || '.product');
        
        productElements.forEach(element => {
          const item = {
            title: '',
            price: null,
            url: null
          };
          
          // Get title
          const titleEl = element.querySelector(selectors.title || 'h3, h4, .title');
          if (titleEl) {
            item.title = titleEl.textContent.trim();
          }
          
          // Get price
          const priceEl = element.querySelector(selectors.price || '.price');
          if (priceEl) {
            const priceText = priceEl.textContent.trim();
            const priceMatch = priceText.match(/\$?([\d,]+)/);
            if (priceMatch) {
              item.price = parseInt(priceMatch[1].replace(',', ''));
            }
          }
          
          // Get URL
          const linkEl = element.querySelector(selectors.link || 'a');
          if (linkEl && linkEl.href) {
            item.url = linkEl.href;
          }
          
          if (item.title) {
            items.push(item);
          }
        });
        
        return items;
      }, source.selectors);
      
      console.log(`   ✓ Found ${products.length} products`);
      
      // Parse products to extract brand/model
      const parsedProducts = products.map(product => {
        const parsed = parseProductTitle(product.title);
        return {
          ...product,
          ...parsed,
          source: source.name,
          sourceUrl: source.url
        };
      });
      
      allData.push({
        source: source.name,
        url: source.url,
        products: parsedProducts,
        scrapedAt: new Date().toISOString()
      });
      
      await page.close();
      
    } catch (error) {
      console.error(`   ✗ Error: ${error.message}`);
    }
  }
  
  await browser.close();
  
  // Save raw scraped data
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputPath = path.join(__dirname, 'downloads', `real_scrape_${timestamp}.json`);
  await fs.writeFile(outputPath, JSON.stringify(allData, null, 2));
  console.log(`\n💾 Saved raw data to: ${outputPath}`);
  
  return allData;
}

// Parse product titles to extract brand and model
function parseProductTitle(title) {
  const result = {
    brand: null,
    model: null,
    year: null
  };
  
  // Known brand patterns
  const brandPatterns = {
    'Sur-Ron': /sur[\s-]?ron/i,
    'Talaria': /talaria/i,
    'Segway': /segway/i,
    'Super73': /super\s?73/i,
    'ONYX': /onyx/i,
    'Monday Motorbikes': /monday/i,
    'Stealth': /stealth/i,
    'Luna': /luna/i,
    'Bakcou': /bakcou/i,
    'QuietKat': /quietkat/i,
    'Rambo': /rambo/i
  };
  
  // Extract brand
  for (const [brand, pattern] of Object.entries(brandPatterns)) {
    if (pattern.test(title)) {
      result.brand = brand;
      break;
    }
  }
  
  // Extract year
  const yearMatch = title.match(/20\d{2}/);
  if (yearMatch) {
    result.year = parseInt(yearMatch[0]);
  }
  
  // Extract model (remove brand and year from title)
  let modelText = title;
  if (result.brand) {
    modelText = modelText.replace(new RegExp(result.brand, 'gi'), '').trim();
  }
  if (result.year) {
    modelText = modelText.replace(new RegExp(result.year, 'g'), '').trim();
  }
  
  // Clean up model name
  modelText = modelText.replace(/^\W+|\W+$/g, '').trim();
  if (modelText) {
    result.model = modelText;
  }
  
  return result;
}

// Update database with real scraped data
async function updateDatabaseWithRealData(scrapedData) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('\n📝 Updating database with real scraped data...');
    
    let addedCount = 0;
    
    for (const source of scrapedData) {
      for (const product of source.products) {
        if (product.brand && product.model) {
          // Check if this is an electrified bike (not a regular e-bike)
          const isElectrified = /sur-ron|talaria|segway.*x\d+|stealth|onyx/i.test(product.title);
          
          if (isElectrified) {
            const query = `
              INSERT INTO electrified_data (brand, model, year, category, msrp)
              VALUES ($1, $2, $3, $4, $5)
              ON CONFLICT (brand, model, year, variant) DO UPDATE
              SET msrp = EXCLUDED.msrp
              WHERE electrified_data.msrp IS NULL
            `;
            
            const result = await client.query(query, [
              product.brand,
              product.model,
              product.year || 2024,
              'off-road', // Default category
              product.price ? product.price * 100 : null
            ]);
            
            if (result.rowCount > 0) {
              addedCount++;
              console.log(`  ✓ Added: ${product.year || 2024} ${product.brand} ${product.model}`);
            }
          }
        }
      }
    }
    
    await client.query('COMMIT');
    console.log(`\n✅ Added/updated ${addedCount} real products`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Database error:', error.message);
  } finally {
    client.release();
  }
}

async function main() {
  console.log('🚀 Starting real data collection...\n');
  
  // Scrape real data
  const scrapedData = await scrapeRealData();
  
  // Update database
  await updateDatabaseWithRealData(scrapedData);
  
  // Show final stats
  const client = await pool.connect();
  try {
    const stats = await client.query(`
      SELECT COUNT(*) as total, COUNT(msrp) as with_price 
      FROM electrified_data
    `);
    
    console.log('\n📊 Final database stats:');
    console.log(`   Total entries: ${stats.rows[0].total}`);
    console.log(`   With prices: ${stats.rows[0].with_price}`);
    
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);