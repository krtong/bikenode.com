const { fetchPage, parseHTML, cleanText } = require('../shared/utils');
const AdaptiveScraper = require('../shared/adaptive-scraper');

// Lit Motors sources
const LIT_SOURCES = {
  official: 'https://litmotors.com',
  wikipedia: 'https://en.wikipedia.org/wiki/Lit_Motors',
  news_sources: [
    'https://techcrunch.com/tag/lit-motors',
    'https://www.engadget.com/search?search=lit+motors'
  ]
};

// Scrape Lit Motors C-1 data from real sources only
async function scrapeLitMotors() {
  const results = {
    models: [],
    errors: [],
    metadata: {
      sources_attempted: [],
      sources_succeeded: [],
      last_updated: new Date().toISOString()
    }
  };
  
  try {
    console.log('Scraping Lit Motors C-1 data from web sources...');
    
    // 1. Try official website
    console.log('\n📍 Attempting to scrape Lit Motors official website...');
    try {
      const officialModels = await scrapeOfficialSite();
      if (officialModels.length > 0) {
        results.models.push(...officialModels);
        results.metadata.sources_succeeded.push('litmotors.com');
        console.log(`✅ Found ${officialModels.length} models from official site`);
      }
    } catch (error) {
      console.error('Error scraping official site:', error.message);
      results.errors.push({ source: 'official', error: error.message });
    }
    results.metadata.sources_attempted.push('litmotors.com');
    
    // 2. Try Wikipedia
    console.log('\n📍 Attempting to scrape Wikipedia...');
    try {
      const wikiModels = await scrapeWikipedia();
      if (wikiModels.length > 0) {
        results.models.push(...wikiModels);
        results.metadata.sources_succeeded.push('wikipedia');
        console.log(`✅ Found ${wikiModels.length} models from Wikipedia`);
      }
    } catch (error) {
      console.error('Error scraping Wikipedia:', error.message);
      results.errors.push({ source: 'wikipedia', error: error.message });
    }
    results.metadata.sources_attempted.push('wikipedia');
    
    // 3. Try news sources
    console.log('\n📍 Attempting to scrape news sources...');
    try {
      const newsModels = await scrapeNewsSources();
      if (newsModels.length > 0) {
        results.models.push(...newsModels);
        results.metadata.sources_succeeded.push('news');
        console.log(`✅ Found ${newsModels.length} models from news sources`);
      }
    } catch (error) {
      console.error('Error scraping news:', error.message);
      results.errors.push({ source: 'news', error: error.message });
    }
    results.metadata.sources_attempted.push('news');
    
    // Deduplicate models
    results.models = deduplicateModels(results.models);
    
    // Return empty results if no data found - this is correct behavior
    if (results.models.length === 0) {
      console.log('ℹ️  No Lit Motors models found from any source.');
      console.log('ℹ️  This may be normal for a startup with limited public information.');
      results.metadata.data_found = false;
    } else {
      console.log(`\n✅ Total unique models found: ${results.models.length}`);
      results.metadata.data_found = true;
    }
    
  } catch (error) {
    console.error('Error in Lit Motors scraper:', error);
    results.errors.push({
      manufacturer: 'Lit Motors',
      error: error.message,
      timestamp: new Date()
    });
  }
  
  return results;
}

// Scrape official Lit Motors website
async function scrapeOfficialSite() {
  const models = [];
  
  try {
    const adaptiveScraper = new AdaptiveScraper();
    const scraped = await adaptiveScraper.scrape(LIT_SOURCES.official, {
      enhance: true,
      javascript: true // Lit Motors site may use JS
    });
    
    if (scraped.data && scraped.data.length > 0) {
      scraped.data.forEach(item => {
        const model = normalizeLitMotorsData(item, LIT_SOURCES.official);
        if (model) {
          models.push(model);
        }
      });
    }
    
    // Also try direct extraction
    const html = await fetchPage(LIT_SOURCES.official);
    const $ = parseHTML(html);
    
    // Look for C-1 information
    const c1Selectors = [
      '.c1-specs',
      '.vehicle-specs',
      '[class*="specifications"]',
      '.product-info',
      'section[data-vehicle="c1"]'
    ];
    
    c1Selectors.forEach(selector => {
      $(selector).each((i, elem) => {
        const $elem = $(elem);
        const model = {
          make: 'Lit Motors',
          model: 'C-1',
          category: 'cabin',
          specifications: {
            source_url: LIT_SOURCES.official,
            scraped_at: new Date().toISOString(),
            source_type: 'web_scraping',
            extraction_method: selector
          }
        };
        
        // Extract specifications
        $elem.find('li, tr, .spec-item').each((j, spec) => {
          const text = cleanText($(spec).text());
          const match = text.match(/([^:]+):\s*(.+)/);
          if (match) {
            const key = match[1].toLowerCase().replace(/\s+/g, '_');
            model.specifications[key] = match[2];
          }
        });
        
        if (Object.keys(model.specifications).length > 4) { // Has real specs beyond metadata
          models.push(model);
        }
      });
    });
    
  } catch (error) {
    console.error('Official site scraping error:', error.message);
  }
  
  return models;
}

// Scrape Wikipedia
async function scrapeWikipedia() {
  const models = [];
  
  try {
    const html = await fetchPage(LIT_SOURCES.wikipedia);
    const $ = parseHTML(html);
    
    // Extract from infobox
    const infobox = $('.infobox');
    if (infobox.length > 0) {
      const model = {
        make: 'Lit Motors',
        model: 'C-1',
        category: 'cabin',
        specifications: {
          source_url: LIT_SOURCES.wikipedia,
          scraped_at: new Date().toISOString(),
          source_type: 'web_scraping',
          extraction_method: 'wikipedia_infobox'
        }
      };
      
      infobox.find('tr').each((i, row) => {
        const $row = $(row);
        const label = cleanText($row.find('th').text());
        const value = cleanText($row.find('td').text());
        
        if (label && value) {
          const key = label.toLowerCase().replace(/\s+/g, '_');
          model.specifications[key] = value;
          
          // Extract year if mentioned
          if (label.toLowerCase().includes('year') || label.toLowerCase().includes('introduced')) {
            const yearMatch = value.match(/\d{4}/);
            if (yearMatch) {
              model.year = parseInt(yearMatch[0]);
            }
          }
        }
      });
      
      if (Object.keys(model.specifications).length > 4) {
        models.push(model);
      }
    }
    
    // Look for specifications in article content
    const content = $('#mw-content-text');
    const specPatterns = [
      /top speed[:\s]+(\d+\s*mph)/i,
      /range[:\s]+(\d+\s*miles)/i,
      /0-60[:\s]+(\d+\.?\d*\s*seconds)/i,
      /motor[:\s]+([^.]+\.)/i,
      /battery[:\s]+([^.]+\.)/i
    ];
    
    const contentText = content.text();
    const specs = {};
    
    specPatterns.forEach(pattern => {
      const match = contentText.match(pattern);
      if (match) {
        const key = pattern.source.split('[')[0].replace(/\\/g, '').toLowerCase();
        specs[key] = match[1];
      }
    });
    
    if (Object.keys(specs).length > 0) {
      models.push({
        make: 'Lit Motors',
        model: 'C-1',
        category: 'cabin',
        specifications: {
          ...specs,
          source_url: LIT_SOURCES.wikipedia,
          scraped_at: new Date().toISOString(),
          source_type: 'web_scraping',
          extraction_method: 'wikipedia_content_patterns'
        }
      });
    }
    
  } catch (error) {
    console.error('Wikipedia scraping error:', error.message);
  }
  
  return models;
}

// Scrape news sources
async function scrapeNewsSources() {
  const models = [];
  
  // Note: Actual implementation would need to handle each news site's structure
  // This is a placeholder showing the approach without generating fake data
  
  for (const newsUrl of LIT_SOURCES.news_sources) {
    try {
      console.log(`  Checking ${newsUrl}...`);
      
      // News sites often require different approaches
      // Some may have APIs, others need careful HTML parsing
      // For now, we acknowledge this limitation
      
    } catch (error) {
      console.error(`Error scraping ${newsUrl}:`, error.message);
    }
  }
  
  return models;
}

// Normalize Lit Motors data
function normalizeLitMotorsData(item, sourceUrl) {
  if (!item || (!item.title && !item.model && !item.name)) {
    return null;
  }
  
  const model = {
    make: 'Lit Motors',
    model: 'C-1', // Their main product
    category: 'cabin',
    specifications: {
      source_url: sourceUrl,
      scraped_at: item.extracted_at || new Date().toISOString(),
      source_type: 'web_scraping',
      extraction_method: 'adaptive_scraper'
    }
  };
  
  // Extract year if present
  const yearMatch = JSON.stringify(item).match(/\b20\d{2}\b/);
  if (yearMatch) {
    const year = parseInt(yearMatch[0]);
    if (year >= 2010 && year <= new Date().getFullYear()) {
      model.year = year;
    }
  }
  
  // Merge any specifications found
  if (item.specifications) {
    Object.assign(model.specifications, item.specifications);
  }
  
  return model;
}

// Deduplicate models
function deduplicateModels(models) {
  const seen = new Map();
  
  models.forEach(model => {
    const key = `${model.model}-${model.year || 'unknown'}`;
    
    if (!seen.has(key)) {
      seen.set(key, model);
    } else {
      // Merge specifications from duplicate
      const existing = seen.get(key);
      Object.assign(existing.specifications, model.specifications);
    }
  });
  
  return Array.from(seen.values());
}

// Verify Lit Motors data from multiple sources
async function verifyLitMotorsSpecs() {
  // This function would cross-reference data from multiple sources
  // Currently returns empty as we only trust scraped data
  return {
    verified: [],
    unverified: [],
    conflicts: []
  };
}

module.exports = {
  scrapeLitMotors,
  scrapeOfficialSite,
  scrapeWikipedia,
  verifyLitMotorsSpecs
};