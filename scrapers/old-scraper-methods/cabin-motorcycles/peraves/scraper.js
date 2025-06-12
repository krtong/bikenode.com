const { fetchPage, fetchPageWithJS, parseHTML, cleanText, extractImages } = require('../shared/utils');
const { validateModels, cleanSpecifications } = require('../shared/scraper-validation');

const PERAVES_BASE_URL = 'https://www.peravescz.com';

// Scrape current models from Peraves website
async function scrapeCurrentModels() {
  try {
    console.log('Scraping Peraves website for current models...');
    
    // Try to fetch with Puppeteer for JavaScript-rendered content
    const modelsPageHtml = await fetchPageWithJS(`${PERAVES_BASE_URL}/models/`);
    const $ = parseHTML(modelsPageHtml);
    
    const scrapedModels = [];
    
    // Look for actual model data structures
    const modelSelectors = [
      '.monoracer-model',
      '.model-container',
      'section[class*="model"]',
      'div[class*="product"]',
      '.content-section',
      'article'
    ];
    
    // Try multiple selectors to find model data
    for (const selector of modelSelectors) {
      $(selector).each((i, elem) => {
        const $elem = $(elem);
        const text = $elem.text();
        
        // Only process if element contains meaningful content
        if (text.length < 20) return;
        
        const modelData = {
          specifications: {},
          images: []
        };
        
        // Extract model name from headings
        const heading = $elem.find('h1, h2, h3').first().text();
        if (heading) {
          modelData.name = cleanText(heading);
        }
        
        // Extract specifications from lists or tables
        $elem.find('ul li, .spec-list li, table tr').each((j, specElem) => {
          const specText = cleanText($(specElem).text());
          
          // Parse key-value pairs
          if (specText.includes(':')) {
            const [key, value] = specText.split(':').map(s => s.trim());
            if (key && value) {
              modelData.specifications[key.toLowerCase().replace(/\s+/g, '_')] = value;
            }
          }
        });
        
        // Extract images
        $elem.find('img').each((k, img) => {
          const src = $(img).attr('src') || $(img).attr('data-src');
          const alt = $(img).attr('alt') || '';
          if (src && !src.includes('logo') && !src.includes('icon')) {
            modelData.images.push({
              url: src.startsWith('http') ? src : new URL(src, PERAVES_BASE_URL).href,
              alt: alt
            });
          }
        });
        
        // Only add if we found meaningful data
        if (modelData.name && Object.keys(modelData.specifications).length > 0) {
          scrapedModels.push({
            make: 'Peraves',
            model: modelData.name,
            specifications: {
              ...modelData.specifications,
              source: 'peraves_website',
              source_url: `${PERAVES_BASE_URL}/models/`,
              scraped_at: new Date().toISOString()
            },
            images: modelData.images
          });
        }
      });
    }
    
    return scrapedModels;
    
  } catch (error) {
    console.error('Error scraping Peraves models:', error.message);
    return [];
  }
}

// Scrape Wikipedia for Peraves data - FIXED to extract real model names
async function scrapeWikipedia() {
  const models = [];
  
  try {
    const urls = [
      'https://en.wikipedia.org/wiki/Peraves',
      'https://en.wikipedia.org/wiki/Ecomobile'
    ];
    
    for (const url of urls) {
      const html = await fetchPage(url);
      const $ = parseHTML(html);
      
      // Known Peraves models to look for
      const knownModels = [
        'MonoRacer',
        'MonoTracer', 
        'Ecomobile',
        'E-Tracer',
        'Super X'
      ];
      
      // Extract from infobox first
      const infobox = $('.infobox');
      const extractedInfo = {
        manufacturer: 'Peraves',
        specifications: {}
      };
      
      if (infobox.length > 0) {
        infobox.find('tr').each((i, row) => {
          const label = cleanText($(row).find('th').text()).toLowerCase();
          const value = cleanText($(row).find('td').text());
          
          if (label && value && !value.includes('.mw-parser-output')) {
            extractedInfo.specifications[label.replace(/\s+/g, '_')] = value;
          }
        });
      }
      
      // Search article text for model mentions
      const articleText = $('#mw-content-text').text();
      
      knownModels.forEach(modelName => {
        // Look for model name in various contexts
        const modelRegex = new RegExp(`${modelName}[\\s\\-]*(MTE[\\s\\-]*\\d+)?`, 'gi');
        const matches = articleText.match(modelRegex);
        
        if (matches) {
          // Extract unique model variants
          const uniqueModels = [...new Set(matches.map(m => cleanText(m)))];
          
          uniqueModels.forEach(variant => {
            // Extract year if mentioned near the model
            let year = null;
            const yearRegex = new RegExp(`${variant.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^.]{0,50}(19\\d{2}|20\\d{2})`, 'i');
            const yearMatch = articleText.match(yearRegex);
            if (yearMatch) {
              year = parseInt(yearMatch[1]);
            }
            
            // Extract engine info if available
            const engineRegex = new RegExp(`${variant.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^.]{0,100}(\\d+)\\s*cc`, 'i');
            const engineMatch = articleText.match(engineRegex);
            let displacement = null;
            if (engineMatch) {
              displacement = parseInt(engineMatch[1]);
            }
            
            models.push({
              make: 'Peraves',
              model: variant,
              year: year,
              specifications: {
                ...extractedInfo.specifications,
                source: 'wikipedia',
                source_url: url,
                scraped_at: new Date().toISOString(),
                displacement: displacement,
                model_variant: variant
              }
            });
          });
        }
      });
    }
    
  } catch (error) {
    console.error('Error scraping Wikipedia:', error.message);
  }
  
  // Deduplicate models
  const seen = new Set();
  return models.filter(model => {
    const key = `${model.model}-${model.year || 'unknown'}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// Main scraping function
async function scrapePeraves() {
  const results = {
    models: [],
    errors: [],
    metadata: {
      source: 'web_scraping',
      timestamp: new Date().toISOString()
    }
  };
  
  try {
    // 1. Scrape current models from website
    const currentModels = await scrapeCurrentModels();
    console.log(`Found ${currentModels.length} models on website`);
    
    if (currentModels.length > 0) {
      results.models = currentModels;
      results.metadata.scraped = true;
    } else {
      console.warn('No models found on website - site structure may have changed');
      
      // Try alternative sources
      console.log('Attempting to scrape Wikipedia...');
      const wikiModels = await scrapeWikipedia();
      if (wikiModels.length > 0) {
        results.models = wikiModels;
        results.metadata.source = 'wikipedia';
      }
    }
    
    // Validate all models
    results.models = validateModels(results.models);
    
    // Return empty results if no data found - this is correct behavior
    if (results.models.length === 0) {
      console.log('ℹ️  No models found from any source.');
      console.log('ℹ️  Website structure may have changed.');
      console.log('ℹ️  Run: npm run analyze to check website structures');
      results.metadata.data_found = false;
    }
    
  } catch (error) {
    console.error('Error in Peraves scraper:', error);
    results.errors.push({
      manufacturer: 'Peraves',
      error: error.message,
      timestamp: new Date()
    });
  }
  
  return results;
}

// Scrape Archive.org for historical Peraves pages
async function scrapeArchiveOrg() {
  const models = [];
  
  try {
    console.log('Checking Archive.org for historical Peraves pages...');
    
    // This would need proper implementation to:
    // 1. Use Archive.org's CDX API to find snapshots
    // 2. Fetch specific snapshots of Peraves sites
    // 3. Parse historical pages
    
    console.log('Archive.org scraping not yet implemented');
    
  } catch (error) {
    console.error('Error scraping Archive.org:', error.message);
  }
  
  return models;
}

module.exports = {
  scrapePeraves,
  scrapeCurrentModels,
  scrapeWikipedia,
  scrapeArchiveOrg
};