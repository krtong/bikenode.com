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

// Sources with different scraping strategies
const SCRAPE_TARGETS = [
  {
    name: 'Alien Rides',
    url: 'https://alienrides.com/collections/electric-bikes',
    strategy: 'product-grid',
    selectors: {
      products: '.product-item, .grid__item',
      title: 'h3, .product__title, .product-item__title',
      price: '.price__regular, .product__price, .price',
      link: 'a[href*="/products/"]',
      image: 'img'
    }
  },
  {
    name: 'Luna Cycle',
    url: 'https://lunacycle.com/',
    strategy: 'search',
    searchTerms: ['sur-ron', 'talaria', 'stealth'],
    selectors: {
      products: '.product-item',
      title: '.product-title',
      price: '.price',
      specs: '.product-specs'
    }
  },
  {
    name: 'Zero Motorcycles',
    url: 'https://www.zeromotorcycles.com/model/zero-sr',
    strategy: 'direct-page',
    pages: [
      '/model/zero-sr',
      '/model/zero-s', 
      '/model/zero-ds',
      '/model/zero-fx'
    ]
  }
];

async function scrapeWithPuppeteer() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
  });

  const allResults = [];

  for (const target of SCRAPE_TARGETS) {
    console.log(`\n🔍 Scraping ${target.name}...`);
    console.log(`   URL: ${target.url}`);
    console.log(`   Strategy: ${target.strategy}`);

    const page = await browser.newPage();
    
    try {
      // Set viewport and user agent
      await page.setViewport({ width: 1920, height: 1080 });
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

      // Navigate to page
      await page.goto(target.url, {
        waitUntil: 'networkidle0',
        timeout: 30000
      });

      // Wait for dynamic content
      await page.waitForTimeout(3000);

      // Take screenshot for debugging
      const timestamp = new Date().getTime();
      await page.screenshot({
        path: path.join(__dirname, 'downloads', `screenshot_${target.name.replace(/\s+/g, '_')}_${timestamp}.png`)
      });

      let products = [];

      switch (target.strategy) {
        case 'product-grid':
          products = await scrapeProductGrid(page, target.selectors);
          break;
        case 'search':
          products = await scrapeWithSearch(page, target);
          break;
        case 'direct-page':
          products = await scrapeDirectPages(page, target, browser);
          break;
      }

      console.log(`   ✓ Found ${products.length} products`);
      
      allResults.push({
        source: target.name,
        url: target.url,
        products,
        scrapedAt: new Date().toISOString()
      });

    } catch (error) {
      console.error(`   ✗ Error: ${error.message}`);
      allResults.push({
        source: target.name,
        url: target.url,
        error: error.message,
        products: [],
        scrapedAt: new Date().toISOString()
      });
    } finally {
      await page.close();
    }
  }

  await browser.close();
  return allResults;
}

async function scrapeProductGrid(page, selectors) {
  return await page.evaluate((sel) => {
    const products = [];
    const elements = document.querySelectorAll(sel.products);
    
    elements.forEach(el => {
      const product = {};
      
      // Get title
      const titleEl = el.querySelector(sel.title);
      if (titleEl) {
        product.title = titleEl.textContent.trim();
      }
      
      // Get price
      const priceEl = el.querySelector(sel.price);
      if (priceEl) {
        const priceText = priceEl.textContent.trim();
        const priceMatch = priceText.match(/[\d,]+\.?\d*/);
        if (priceMatch) {
          product.price = priceMatch[0].replace(',', '');
        }
      }
      
      // Get link
      const linkEl = el.querySelector(sel.link);
      if (linkEl) {
        product.url = linkEl.href;
      }
      
      // Get image
      const imgEl = el.querySelector(sel.image);
      if (imgEl) {
        product.image = imgEl.src || imgEl.dataset.src;
      }
      
      if (product.title) {
        products.push(product);
      }
    });
    
    return products;
  }, selectors);
}

async function scrapeWithSearch(page, target) {
  const allProducts = [];
  
  for (const term of target.searchTerms) {
    try {
      // Search for the term
      const searchUrl = `${target.url}search?q=${encodeURIComponent(term)}`;
      await page.goto(searchUrl, { waitUntil: 'networkidle0' });
      await page.waitForTimeout(2000);
      
      const products = await scrapeProductGrid(page, target.selectors);
      allProducts.push(...products);
      
    } catch (error) {
      console.log(`     Search error for "${term}": ${error.message}`);
    }
  }
  
  return allProducts;
}

async function scrapeDirectPages(page, target, browser) {
  const products = [];
  
  for (const pagePath of target.pages) {
    try {
      const fullUrl = `https://www.zeromotorcycles.com${pagePath}`;
      const newPage = await browser.newPage();
      await newPage.goto(fullUrl, { waitUntil: 'networkidle0' });
      
      // Extract Zero Motorcycles specific data
      const productData = await newPage.evaluate(() => {
        const data = {};
        
        // Get model name
        const titleEl = document.querySelector('h1, .model-name, .page-title');
        if (titleEl) {
          data.title = titleEl.textContent.trim();
        }
        
        // Get specs from the page
        const specElements = document.querySelectorAll('.spec-item, .specification, [class*="spec"]');
        data.specs = {};
        
        specElements.forEach(el => {
          const text = el.textContent.trim();
          
          // Extract motor power
          if (text.match(/motor|power/i)) {
            const powerMatch = text.match(/(\d+)\s*kW/);
            if (powerMatch) {
              data.specs.motor_power = `${powerMatch[1]}kW`;
            }
          }
          
          // Extract battery
          if (text.match(/battery|capacity/i)) {
            const batteryMatch = text.match(/(\d+\.?\d*)\s*kWh/);
            if (batteryMatch) {
              data.specs.battery = `${batteryMatch[1]} kWh`;
            }
          }
          
          // Extract range
          if (text.match(/range/i)) {
            const rangeMatch = text.match(/(\d+)\s*miles/);
            if (rangeMatch) {
              data.specs.range = `${rangeMatch[1]} miles`;
            }
          }
          
          // Extract top speed
          if (text.match(/top speed|max speed/i)) {
            const speedMatch = text.match(/(\d+)\s*mph/);
            if (speedMatch) {
              data.specs.top_speed = `${speedMatch[1]} mph`;
            }
          }
        });
        
        return data;
      });
      
      if (productData.title) {
        products.push({
          ...productData,
          url: fullUrl,
          brand: 'Zero Motorcycles'
        });
      }
      
      await newPage.close();
      
    } catch (error) {
      console.log(`     Page error for "${pagePath}": ${error.message}`);
    }
  }
  
  return products;
}

async function parseAndSaveResults(results) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputPath = path.join(__dirname, 'downloads', `electrified_scrape_${timestamp}.json`);
  
  // Save raw results
  await fs.writeFile(outputPath, JSON.stringify(results, null, 2));
  console.log(`\n💾 Saved raw data to: ${outputPath}`);
  
  // Parse products to extract brand/model/specs
  const parsedProducts = [];
  
  for (const source of results) {
    if (source.products && source.products.length > 0) {
      for (const product of source.products) {
        const parsed = parseProduct(product);
        if (parsed.brand && parsed.model) {
          parsedProducts.push({
            ...parsed,
            source: source.source,
            sourceUrl: source.url
          });
        }
      }
    }
  }
  
  console.log(`\n📊 Parsed ${parsedProducts.length} valid products`);
  return parsedProducts;
}

function parseProduct(product) {
  const result = {
    brand: null,
    model: null,
    year: null,
    specs: {},
    price: null
  };
  
  // Extract from title
  if (product.title) {
    // Brand patterns
    const brandPatterns = {
      'Sur-Ron': /sur[\s-]?ron/i,
      'Talaria': /talaria/i,
      'Segway': /segway/i,
      'Zero Motorcycles': /zero/i,
      'Super73': /super\s?73/i,
      'ONYX': /onyx/i,
      'Stealth': /stealth/i,
      'Monday Motorbikes': /monday/i,
      'Cake': /cake/i,
      'Stark Future': /stark/i,
      'Volcon': /volcon/i,
      'Kuberg': /kuberg/i,
      'Electric Motion': /electric\s+motion/i
    };
    
    // Find brand
    for (const [brand, pattern] of Object.entries(brandPatterns)) {
      if (pattern.test(product.title)) {
        result.brand = brand;
        break;
      }
    }
    
    // Extract year
    const yearMatch = product.title.match(/20\d{2}/);
    if (yearMatch) {
      result.year = parseInt(yearMatch[0]);
    } else {
      result.year = 2024; // Default to current year
    }
    
    // Extract model
    let modelText = product.title;
    if (result.brand) {
      // Remove brand from title
      modelText = modelText.replace(new RegExp(result.brand, 'gi'), '').trim();
    }
    if (result.year) {
      // Remove year
      modelText = modelText.replace(new RegExp(result.year, 'g'), '').trim();
    }
    
    // Clean up model name
    modelText = modelText.replace(/^\W+|\W+$/g, '').trim();
    if (modelText && modelText.length > 2) {
      result.model = modelText;
    }
  }
  
  // Get price
  if (product.price) {
    result.price = parseFloat(product.price);
  }
  
  // Get specs if available
  if (product.specs) {
    result.specs = product.specs;
  }
  
  return result;
}

async function updateDatabase(parsedProducts) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('\n📝 Updating database with scraped data...');
    
    let updateCount = 0;
    let newCount = 0;
    
    for (const product of parsedProducts) {
      // Check if exists
      const checkQuery = `
        SELECT id FROM electrified_data 
        WHERE brand = $1 AND model = $2 AND year = $3
      `;
      
      const existing = await client.query(checkQuery, [
        product.brand,
        product.model,
        product.year
      ]);
      
      if (existing.rows.length > 0) {
        // Update existing with any new data
        const updateQuery = `
          UPDATE electrified_data
          SET msrp = COALESCE($1, msrp),
              motor_power = COALESCE($2, motor_power),
              battery = COALESCE($3, battery),
              top_speed = COALESCE($4, top_speed),
              range = COALESCE($5, range)
          WHERE brand = $6 AND model = $7 AND year = $8
            AND ($1 IS NOT NULL OR $2 IS NOT NULL OR $3 IS NOT NULL OR $4 IS NOT NULL OR $5 IS NOT NULL)
        `;
        
        const result = await client.query(updateQuery, [
          product.price ? product.price * 100 : null,
          product.specs.motor_power || null,
          product.specs.battery || null,
          product.specs.top_speed || null,
          product.specs.range || null,
          product.brand,
          product.model,
          product.year
        ]);
        
        if (result.rowCount > 0) {
          updateCount++;
          console.log(`  📝 Updated: ${product.year} ${product.brand} ${product.model}`);
        }
      } else {
        // Insert new
        const insertQuery = `
          INSERT INTO electrified_data (brand, model, year, category, msrp, motor_power, battery, top_speed, range)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `;
        
        await client.query(insertQuery, [
          product.brand,
          product.model,
          product.year,
          'off-road', // Default category
          product.price ? product.price * 100 : null,
          product.specs.motor_power || null,
          product.specs.battery || null,
          product.specs.top_speed || null,
          product.specs.range || null
        ]);
        
        newCount++;
        console.log(`  ✅ Added: ${product.year} ${product.brand} ${product.model}`);
      }
    }
    
    await client.query('COMMIT');
    console.log(`\n✅ Database update complete:`);
    console.log(`   New entries: ${newCount}`);
    console.log(`   Updated entries: ${updateCount}`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Database error:', error.message);
  } finally {
    client.release();
  }
}

async function main() {
  console.log('🚀 Starting electrified bike data scraping...\n');
  
  try {
    // Scrape data
    const results = await scrapeWithPuppeteer();
    
    // Parse and save results
    const parsedProducts = await parseAndSaveResults(results);
    
    // Update database
    await updateDatabase(parsedProducts);
    
    // Show final stats
    const client = await pool.connect();
    try {
      const stats = await client.query(`
        SELECT 
          COUNT(DISTINCT brand) as brands,
          COUNT(DISTINCT model) as models,
          COUNT(*) as total,
          COUNT(msrp) as with_price,
          COUNT(motor_power) as with_specs
        FROM electrified_data
      `);
      
      const s = stats.rows[0];
      console.log('\n📊 Final database statistics:');
      console.log(`   Brands: ${s.brands}`);
      console.log(`   Models: ${s.models}`);
      console.log(`   Total entries: ${s.total}`);
      console.log(`   With prices: ${s.with_price}`);
      console.log(`   With specs: ${s.with_specs}`);
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
  } finally {
    await pool.end();
  }
}

main().catch(console.error);