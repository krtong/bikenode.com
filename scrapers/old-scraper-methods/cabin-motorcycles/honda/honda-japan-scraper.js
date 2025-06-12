/**
 * Honda Japan Official Website Scraper
 * Scrapes Honda Gyro Canopy data from honda.co.jp
 */

const { fetchJapanesePage, extractJapaneseSpecs, extractJapaneseYear } = require('./japanese-utils');
const { parseHTML, cleanText } = require('../shared/utils');
const AdaptiveScraper = require('../shared/adaptive-scraper');

class HondaJapanScraper {
  constructor(options = {}) {
    this.adaptiveScraper = new AdaptiveScraper(options);
    this.sources = {
      gyroCanopy: 'https://www.honda.co.jp/CANOPY/',
      gyroCanopySpec: 'https://www.honda.co.jp/CANOPY/spec/',
      gyroCanopyType: 'https://www.honda.co.jp/CANOPY/type/',
      gyroCanopyE: 'https://www.honda.co.jp/GYROCANOPYe/',
      gyroCanopyESpec: 'https://www.honda.co.jp/GYROCANOPYe/spec/',
      gyroX: 'https://www.honda.co.jp/GYROX/',
      newsArchive: 'https://www.honda.co.jp/news/search/?q=ジャイロ'
    };
  }

  /**
   * Scrape all Honda Japan sources
   */
  async scrapeAll() {
    console.log('\n🇯🇵 Scraping Honda Japan Official Website');
    console.log('=' .repeat(50));
    
    const results = {
      models: [],
      sources: [],
      errors: [],
      metadata: {
        start_time: new Date().toISOString(),
        language: 'Japanese'
      }
    };

    // 1. Scrape current Gyro Canopy (gasoline)
    console.log('\n📍 Scraping Gyro Canopy (Gasoline)...');
    try {
      const canopyModels = await this.scrapeGyroCanopy();
      if (canopyModels.length > 0) {
        results.models.push(...canopyModels);
        results.sources.push({
          name: 'Honda Japan - Gyro Canopy',
          url: this.sources.gyroCanopy,
          count: canopyModels.length
        });
        console.log(`✅ Found ${canopyModels.length} Gyro Canopy models`);
      }
    } catch (error) {
      console.error('❌ Error scraping Gyro Canopy:', error.message);
      results.errors.push({ source: 'gyro_canopy', error: error.message });
    }

    // 2. Scrape Gyro Canopy e: (electric)
    console.log('\n📍 Scraping Gyro Canopy e: (Electric)...');
    try {
      const canopyEModels = await this.scrapeGyroCanopyE();
      if (canopyEModels.length > 0) {
        results.models.push(...canopyEModels);
        results.sources.push({
          name: 'Honda Japan - Gyro Canopy e:',
          url: this.sources.gyroCanopyE,
          count: canopyEModels.length
        });
        console.log(`✅ Found ${canopyEModels.length} Gyro Canopy e: models`);
      }
    } catch (error) {
      console.error('❌ Error scraping Gyro Canopy e:', error.message);
      results.errors.push({ source: 'gyro_canopy_e', error: error.message });
    }

    // 3. Search news archive for historical data
    console.log('\n📍 Searching Honda news archive...');
    try {
      const newsModels = await this.searchNewsArchive();
      if (newsModels.length > 0) {
        results.models.push(...newsModels);
        results.sources.push({
          name: 'Honda News Archive',
          url: this.sources.newsArchive,
          count: newsModels.length
        });
        console.log(`✅ Found ${newsModels.length} models from news archive`);
      }
    } catch (error) {
      console.error('❌ Error searching news:', error.message);
      results.errors.push({ source: 'news_archive', error: error.message });
    }

    // Deduplicate models
    results.models = this.deduplicateModels(results.models);
    results.metadata.total_models = results.models.length;
    results.metadata.end_time = new Date().toISOString();

    console.log(`\n✅ Total unique models found: ${results.models.length}`);
    
    return results;
  }

  /**
   * Scrape current Gyro Canopy (gasoline)
   */
  async scrapeGyroCanopy() {
    const models = [];
    
    try {
      // Fetch specifications page
      const specHtml = await fetchJapanesePage(this.sources.gyroCanopySpec);
      const $ = parseHTML(specHtml);
      
      const model = {
        make: 'Honda',
        model: 'Gyro Canopy',
        category: 'cabin',
        specifications: {
          source: 'honda.co.jp',
          url: this.sources.gyroCanopySpec,
          language: 'Japanese'
        }
      };

      // Extract model type/code
      const modelType = $('.model-type, .type-name, h2').first().text();
      if (modelType) {
        const typeMatch = modelType.match(/2BH-TA03|TA03|JBH-TA03/);
        if (typeMatch) {
          model.package = typeMatch[0];
          model.specifications.model_code = typeMatch[0];
        }
      }

      // Extract specifications
      const specs = extractJapaneseSpecs($);
      Object.assign(model.specifications, specs);

      // Extract year from various sources
      const pageText = $('body').text();
      const year = extractJapaneseYear(pageText);
      if (year) {
        model.year = year;
      } else {
        // Check for model year in specs
        if (specs.model_type) {
          const yearMatch = specs.model_type.match(/\b20\d{2}\b/);
          if (yearMatch) {
            model.year = parseInt(yearMatch[0]);
          }
        }
      }

      // Try type/price page for additional info
      try {
        const typeHtml = await fetchJapanesePage(this.sources.gyroCanopyType);
        const $type = parseHTML(typeHtml);
        
        // Extract price
        const priceText = $type('.price, .price-num').first().text();
        if (priceText) {
          model.specifications.price_jpy = priceText;
        }

        // Extract color options
        const colors = [];
        $type('.color-item, .color-name').each((i, elem) => {
          const color = cleanText($type(elem).text());
          if (color) colors.push(color);
        });
        if (colors.length > 0) {
          model.specifications.available_colors = colors;
        }
      } catch (typeError) {
        console.log('Could not fetch type/price page');
      }

      // Add to models if we have meaningful data
      if (Object.keys(model.specifications).length > 3) {
        models.push(model);
      }

      // Also use adaptive scraper for additional extraction
      const adaptiveResults = await this.adaptiveScraper.scrape(this.sources.gyroCanopy, {
        enhance: true
      });

      if (adaptiveResults.data && adaptiveResults.data.length > 0) {
        adaptiveResults.data.forEach(item => {
          const adaptiveModel = this.normalizeAdaptiveData(item, 'Gyro Canopy');
          if (adaptiveModel) {
            models.push(adaptiveModel);
          }
        });
      }

    } catch (error) {
      console.error('Error scraping Gyro Canopy:', error.message);
      throw error;
    }

    return models;
  }

  /**
   * Scrape Gyro Canopy e: (electric)
   */
  async scrapeGyroCanopyE() {
    const models = [];
    
    try {
      // Fetch specifications page
      const specHtml = await fetchJapanesePage(this.sources.gyroCanopyESpec);
      const $ = parseHTML(specHtml);
      
      const model = {
        make: 'Honda',
        model: 'Gyro Canopy e:',
        category: 'cabin',
        specifications: {
          source: 'honda.co.jp',
          url: this.sources.gyroCanopyESpec,
          language: 'Japanese',
          propulsion: 'electric'
        }
      };

      // Extract model type/code
      const modelType = $('.model-type, .type-name, h2').first().text();
      if (modelType) {
        const typeMatch = modelType.match(/ZAD-EF14|EF14/);
        if (typeMatch) {
          model.package = typeMatch[0];
          model.specifications.model_code = typeMatch[0];
        }
      }

      // Extract specifications
      const specs = extractJapaneseSpecs($);
      Object.assign(model.specifications, specs);

      // Electric-specific specs
      if (specs.battery || pageText.includes('バッテリー')) {
        model.specifications.battery_type = 'Honda Mobile Power Pack e:';
        model.specifications.battery_count = 2;
      }

      // Extract year
      const pageText = $('body').text();
      const year = extractJapaneseYear(pageText);
      if (year) {
        model.year = year;
      }

      // Look for range information
      const rangeMatch = pageText.match(/(\d+)\s*km.*航続/);
      if (rangeMatch) {
        model.specifications.range_km = parseInt(rangeMatch[1]);
      }

      // Add to models if we have meaningful data
      if (Object.keys(model.specifications).length > 3) {
        models.push(model);
      }

    } catch (error) {
      console.error('Error scraping Gyro Canopy e:', error.message);
      throw error;
    }

    return models;
  }

  /**
   * Search Honda news archive for historical information
   */
  async searchNewsArchive() {
    const models = [];
    
    try {
      const html = await fetchJapanesePage(this.sources.newsArchive);
      const $ = parseHTML(html);
      
      // Look for news items about Gyro models
      $('.news-item, .result-item, article').each((i, elem) => {
        const $item = $(elem);
        const title = $item.find('.title, h3, h4').text();
        const date = $item.find('.date, .time').text();
        const link = $item.find('a').attr('href');
        
        if (title && (title.includes('ジャイロ') || title.includes('GYRO'))) {
          // Extract year from date
          const year = extractJapaneseYear(date);
          
          // Check for model information in title
          if (title.includes('キャノピー') || title.includes('CANOPY')) {
            const model = {
              make: 'Honda',
              model: 'Gyro Canopy',
              category: 'cabin',
              specifications: {
                source: 'honda_news',
                news_title: title,
                news_date: date
              }
            };
            
            if (year) {
              model.year = year;
            }
            
            // Check for specific model codes
            const modelMatch = title.match(/TA0[23]|EF14/);
            if (modelMatch) {
              model.package = modelMatch[0];
            }
            
            if (link) {
              model.specifications.news_url = new URL(link, 'https://www.honda.co.jp').href;
            }
            
            models.push(model);
          }
        }
      });
      
    } catch (error) {
      console.error('Error searching news archive:', error.message);
    }

    return models;
  }

  /**
   * Normalize adaptive scraper data
   */
  normalizeAdaptiveData(item, modelName) {
    if (!item || (!item.title && !item.model)) {
      return null;
    }

    const model = {
      make: 'Honda',
      model: modelName,
      category: 'cabin',
      specifications: {
        source: 'honda.co.jp_adaptive',
        extracted_at: item.extracted_at || new Date().toISOString()
      }
    };

    // Extract year
    if (item.year) {
      model.year = parseInt(item.year);
    } else {
      const year = extractJapaneseYear(JSON.stringify(item));
      if (year) model.year = year;
    }

    // Merge specifications
    if (item.specifications) {
      Object.assign(model.specifications, item.specifications);
    }

    // Extract model code
    const modelCodeMatch = JSON.stringify(item).match(/TA0[23]|2BH-TA03|JBH-TA03|ZAD-EF14/);
    if (modelCodeMatch) {
      model.package = modelCodeMatch[0];
    }

    return model;
  }

  /**
   * Deduplicate models
   */
  deduplicateModels(models) {
    const seen = new Map();
    
    models.forEach(model => {
      const key = `${model.model}-${model.package || 'base'}-${model.year || 'unknown'}`;
      
      if (!seen.has(key)) {
        seen.set(key, model);
      } else {
        // Merge specifications
        const existing = seen.get(key);
        Object.assign(existing.specifications, model.specifications);
      }
    });
    
    return Array.from(seen.values());
  }
}

// Export functions
async function scrapeHondaJapan(options = {}) {
  const scraper = new HondaJapanScraper(options);
  return await scraper.scrapeAll();
}

module.exports = {
  HondaJapanScraper,
  scrapeHondaJapan
};