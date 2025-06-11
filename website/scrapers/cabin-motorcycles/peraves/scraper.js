const { fetchPage, fetchPageWithJS, parseHTML, cleanText, extractImages } = require('../shared/utils');
const { PERAVES_MODELS, generateModelData } = require('./models');

const PERAVES_BASE_URL = 'https://www.peravescz.com';

// Scrape current models from Peraves website
async function scrapeCurrentModels() {
  try {
    console.log('Scraping Peraves website for current models...');
    
    // Fetch models page
    const modelsPageHtml = await fetchPage(`${PERAVES_BASE_URL}/models/`);
    const $ = parseHTML(modelsPageHtml);
    
    const scrapedModels = [];
    
    // Extract model information from the page
    $('.model-section, .product-item, article').each((i, elem) => {
      const modelName = cleanText($(elem).find('h2, h3, .model-name').text());
      const description = cleanText($(elem).find('p, .description').text());
      const specs = {};
      
      // Extract specifications from lists or tables
      $(elem).find('li, .spec-item').each((j, specElem) => {
        const text = cleanText($(specElem).text());
        
        // Parse common specifications
        if (text.includes('range') || text.includes('km')) {
          const rangeMatch = text.match(/(\d+)\s*km/i);
          if (rangeMatch) specs.range = parseInt(rangeMatch[1]);
        }
        if (text.includes('seat') || text.includes('height')) {
          specs.seatHeight = text;
        }
        if (text.includes('person') || text.includes('passenger')) {
          const capacityMatch = text.match(/(\d+)\s*person/i);
          if (capacityMatch) specs.passengers = parseInt(capacityMatch[1]);
        }
      });
      
      // Extract images
      const images = extractImages($(elem), PERAVES_BASE_URL);
      
      if (modelName) {
        scrapedModels.push({
          name: modelName,
          description,
          specifications: specs,
          images,
          sourceUrl: `${PERAVES_BASE_URL}/models/`
        });
      }
    });
    
    // Also check for model links
    $('a[href*="model"], a[href*="racer"]').each((i, elem) => {
      const href = $(elem).attr('href');
      const text = cleanText($(elem).text());
      
      if (href && !href.startsWith('http')) {
        const fullUrl = new URL(href, PERAVES_BASE_URL).href;
        console.log(`Found model link: ${text} -> ${fullUrl}`);
      }
    });
    
    return scrapedModels;
  } catch (error) {
    console.error('Error scraping Peraves models:', error);
    return [];
  }
}

// Scrape detailed model page
async function scrapeModelDetails(modelUrl) {
  try {
    const html = await fetchPage(modelUrl);
    const $ = parseHTML(html);
    
    const details = {
      name: cleanText($('h1, .model-title').text()),
      specifications: {},
      features: [],
      images: extractImages($, modelUrl)
    };
    
    // Extract specifications table
    $('table.specs, .specifications table').find('tr').each((i, row) => {
      const label = cleanText($(row).find('td:first-child, th').text());
      const value = cleanText($(row).find('td:last-child').text());
      
      if (label && value) {
        details.specifications[label.toLowerCase().replace(/\s+/g, '_')] = value;
      }
    });
    
    // Extract features list
    $('.features li, .feature-list li').each((i, elem) => {
      details.features.push(cleanText($(elem).text()));
    });
    
    return details;
  } catch (error) {
    console.error(`Error scraping model details from ${modelUrl}:`, error);
    return null;
  }
}

// Main scraping function
async function scrapePeraves() {
  const results = {
    historical: [],
    current: [],
    errors: []
  };
  
  try {
    // 1. Scrape current models from website
    const currentModels = await scrapeCurrentModels();
    console.log(`Found ${currentModels.length} current models on website`);
    
    // 2. Generate historical model data from our database
    console.log('Generating historical model data...');
    
    // Ecomobile models (1984-2005)
    for (let year = 1984; year <= 2005; year++) {
      const ecomobileData = generateModelData('ECOMOBILE', year);
      if (ecomobileData) {
        results.historical.push(ecomobileData);
      }
    }
    
    // MonoTracer models (2005-2019)
    for (let year = 2005; year <= 2019; year++) {
      const monotracerData = generateModelData('MONOTRACER', year);
      if (monotracerData) {
        results.historical.push(monotracerData);
      }
    }
    
    // E-Tracer (2010+)
    for (let year = 2010; year <= new Date().getFullYear(); year++) {
      const etracerData = generateModelData('E_TRACER', year);
      if (etracerData) {
        results.current.push(etracerData);
      }
    }
    
    // Current MonoRacer models
    const currentYear = new Date().getFullYear();
    const monoracer130e = generateModelData('MONORACER_130E', currentYear);
    if (monoracer130e) {
      results.current.push(monoracer130e);
    }
    
    console.log(`Generated ${results.historical.length} historical models`);
    console.log(`Generated ${results.current.length} current models`);
    
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

module.exports = {
  scrapePeraves,
  scrapeCurrentModels,
  scrapeModelDetails
};