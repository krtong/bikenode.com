const BaseScraper = require('./base-scraper');
const fs = require('fs').promises;
const path = require('path');

class ElectricBikeReviewScraper extends BaseScraper {
  constructor() {
    super('Electric Bike Review');
    this.baseUrl = 'https://electricbikereview.com';
    this.targetBrands = [
      'Sur-Ron', 'Talaria', 'Segway', 'Zero Motorcycles', 'Super73', 
      'ONYX', 'Cake', 'Stark Future', 'Delfast', 'Stealth Electric Bikes',
      'Monday Motorbikes', 'Volcon', 'Electric Motion', 'Kuberg', 
      'Flux Performance', '79Bike', 'HappyRun', 'Rawrr', 'E-Ride Pro',
      'Qulbix', 'Stage 2', 'Arctic Leopard', 'Ventus', 'Altis'
    ];
  }

  async scrape() {
    await this.initialize();
    
    try {
      console.log(`🔍 Scraping ${this.name} (Review Site)...`);
      console.log(`   Target brands: ${this.targetBrands.length} brands`);
      
      const allResults = {
        metadata: {
          source: this.baseUrl,
          type: 'review-aggregator',
          brands: {}
        }
      };
      
      // Search for each brand
      for (const brand of this.targetBrands) {
        console.log(`\n   Searching for ${brand}...`);
        
        const searchQuery = brand.replace(/\s+/g, '+');
        const searchUrl = `${this.baseUrl}/?s=${searchQuery}`;
        
        try {
          const brandProducts = await this.scrapeUrl(searchUrl, async (page) => {
            // Wait for search results
            await page.waitForSelector('article, .post, .review-item', { timeout: 10000 }).catch(() => {});
            
            // Extract review links
            const reviews = await page.evaluate((brandName) => {
              const results = [];
              const articles = document.querySelectorAll('article, .post');
              
              articles.forEach(article => {
                const titleEl = article.querySelector('h2 a, h3 a, .entry-title a');
                const linkEl = article.querySelector('a[href*="/reviews/"], a[href*="/electric-bikes/"]');
                
                if (titleEl && linkEl) {
                  const title = titleEl.textContent.trim();
                  const href = linkEl.getAttribute('href');
                  
                  // Check if this review is for our brand
                  if (title.toLowerCase().includes(brandName.toLowerCase())) {
                    results.push({
                      title,
                      url: href,
                      brand: brandName
                    });
                  }
                }
              });
              
              return results;
            }, brand);
            
            return reviews;
          });
          
          console.log(`   Found ${brandProducts.length} reviews for ${brand}`);
          
          // Initialize brand in results
          if (!allResults.metadata.brands[brand]) {
            allResults.metadata.brands[brand] = {
              brand,
              models: [],
              errors: []
            };
          }
          
          // Scrape each review page
          for (const review of brandProducts.slice(0, 5)) { // Limit to 5 reviews per brand
            try {
              console.log(`   Scraping review: ${review.title}`);
              
              const modelData = await this.scrapeUrl(review.url, async (page) => {
                const data = await page.evaluate(() => {
                  const model = {
                    name: null,
                    specs: {},
                    images: [],
                    url: window.location.href,
                    reviewData: {}
                  };
                  
                  // Get product name from review title
                  const titleEl = document.querySelector('h1, .entry-title');
                  if (titleEl) {
                    model.name = titleEl.textContent.trim();
                  }
                  
                  // Electric Bike Review often has specs in tables
                  const specTables = document.querySelectorAll('table');
                  specTables.forEach(table => {
                    const rows = table.querySelectorAll('tr');
                    rows.forEach(row => {
                      const cells = row.querySelectorAll('td');
                      if (cells.length >= 2) {
                        const key = cells[0].textContent.trim().toLowerCase();
                        const value = cells[1].textContent.trim();
                        
                        if (key.includes('motor')) {
                          model.specs.motor_power = value;
                        } else if (key.includes('battery')) {
                          model.specs.battery = value;
                        } else if (key.includes('top speed') || key.includes('max speed')) {
                          model.specs.top_speed = value;
                        } else if (key.includes('range')) {
                          model.specs.range = value;
                        } else if (key.includes('weight')) {
                          model.specs.weight = value;
                        } else if (key.includes('price')) {
                          model.reviewData.price = value;
                        }
                      }
                    });
                  });
                  
                  // Get review content for additional spec extraction
                  const content = document.querySelector('.entry-content, .review-content, article');
                  if (content) {
                    model.fullText = content.textContent;
                  }
                  
                  // Get rating if available
                  const ratingEl = document.querySelector('.rating, .score, [class*="rating"]');
                  if (ratingEl) {
                    model.reviewData.rating = ratingEl.textContent.trim();
                  }
                  
                  // Get images
                  const images = document.querySelectorAll('.entry-content img, article img');
                  model.images = Array.from(images)
                    .map(img => img.src)
                    .filter(src => !src.includes('avatar') && !src.includes('logo'))
                    .slice(0, 3);
                  
                  return model;
                });
                
                // Extract specs from full text
                if (data.fullText) {
                  const extractedSpecs = this.extractSpecs(data.fullText);
                  data.specs = { ...extractedSpecs, ...data.specs };
                  delete data.fullText;
                }
                
                return data;
              });
              
              if (modelData.name && Object.keys(modelData.specs).length > 0) {
                // Clean model name
                const cleanName = modelData.name
                  .replace(/review/gi, '')
                  .replace(new RegExp(brand, 'gi'), '')
                  .replace(/electric\s*bike/gi, '')
                  .replace(/\d{4}/, '') // Remove year
                  .trim();
                
                allResults.metadata.brands[brand].models.push({
                  model: cleanName,
                  year: modelData.name.match(/20\d{2}/) ? 
                    parseInt(modelData.name.match(/20\d{2}/)[0]) : 
                    new Date().getFullYear(),
                  specs: modelData.specs,
                  url: modelData.url,
                  images: modelData.images,
                  reviewData: modelData.reviewData,
                  source: 'Electric Bike Review'
                });
                
                console.log(`   ✅ Extracted: ${cleanName}`);
              }
              
            } catch (error) {
              console.log(`   ❌ Error scraping review: ${error.message}`);
              allResults.metadata.brands[brand].errors.push({
                url: review.url,
                error: error.message
              });
            }
          }
          
          // Small delay between brands
          await new Promise(resolve => setTimeout(resolve, 2000));
          
        } catch (error) {
          console.log(`   ❌ Error searching for ${brand}: ${error.message}`);
        }
      }
      
      // Save results for each brand that has data
      for (const [brand, brandData] of Object.entries(allResults.metadata.brands)) {
        if (brandData.models.length > 0) {
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const outputDir = path.join(__dirname, '../data/raw', brand.toLowerCase().replace(/\s+/g, '-'));
          await fs.mkdir(outputDir, { recursive: true });
          
          const outputPath = path.join(outputDir, `electric-bike-review-${timestamp}.json`);
          await fs.writeFile(outputPath, JSON.stringify(brandData, null, 2));
          
          console.log(`\n💾 Saved ${brand} results to: ${outputPath}`);
        }
      }
      
      // Summary
      const totalModels = Object.values(allResults.metadata.brands)
        .reduce((sum, brand) => sum + brand.models.length, 0);
      
      console.log('\n📊 Electric Bike Review Summary:');
      console.log(`   Total models found: ${totalModels}`);
      console.log(`   Brands with data: ${
        Object.values(allResults.metadata.brands)
          .filter(b => b.models.length > 0).length
      }`);
      
    } catch (error) {
      console.error(`❌ Fatal error scraping ${this.name}:`, error);
    } finally {
      await this.close();
    }
    
    return this.results;
  }
}

// Run if called directly
if (require.main === module) {
  const scraper = new ElectricBikeReviewScraper();
  scraper.scrape().then(() => {
    console.log('\n✅ Electric Bike Review scraping complete');
  }).catch(console.error);
}

module.exports = ElectricBikeReviewScraper;