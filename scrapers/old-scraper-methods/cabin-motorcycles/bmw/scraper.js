const { fetchPage, parseHTML, cleanText } = require('../shared/utils');
const { validateModels, isValidYear } = require('../shared/scraper-validation');

const BMW_SOURCES = {
  wikipedia: 'https://en.wikipedia.org/wiki/BMW_C1',
  wikipedia_de: 'https://de.wikipedia.org/wiki/BMW_C1',
  cycleworld: 'https://www.cycleworld.com/bmw-c1-scooter-history/',
  motorcycle_specs: 'https://www.motorcyclespecs.co.za/model/bmw/bmw_c1_125_00.htm',
  archive_bmw: 'https://web.archive.org/web/*/https://www.bmw-motorrad.com/*/c1/*'
};

// Scrape BMW C1 data from multiple sources
async function scrapeBMWC1() {
  const results = {
    models: [],
    errors: [],
    metadata: {
      source: 'web_scraping',
      timestamp: new Date().toISOString()
    }
  };
  
  try {
    console.log('Scraping BMW C1 data from multiple sources...');
    
    // 1. Try Wikipedia first
    const wikiModels = await scrapeWikipedia();
    if (wikiModels.length > 0) {
      results.models.push(...wikiModels);
      console.log(`✓ Found ${wikiModels.length} models from Wikipedia`);
    }
    
    // 2. Try motorcycle spec databases
    const specDbModels = await scrapeMotorcycleSpecsDB();
    if (specDbModels.length > 0) {
      results.models.push(...specDbModels);
      console.log(`✓ Found ${specDbModels.length} models from spec databases`);
    }
    
    // 3. Try Archive.org for historical BMW pages
    const archiveModels = await scrapeArchiveOrg();
    if (archiveModels.length > 0) {
      results.models.push(...archiveModels);
      console.log(`✓ Found ${archiveModels.length} models from Archive.org`);
    }
    
    // Deduplicate and validate models
    results.models = deduplicateModels(results.models);
    results.models = validateModels(results.models);
    
    if (results.models.length === 0) {
      console.log('ℹ️  No BMW C1 models found from any source.');
      console.log('ℹ️  This is expected for discontinued models.');
      console.log('ℹ️  Try: npm run analyze to check website structures');
      results.metadata.data_found = false;
    }
    
    console.log(`\nTotal BMW C1 models found: ${results.models.length}`);
    
  } catch (error) {
    console.error('Error in BMW C1 scraper:', error);
    results.errors.push({
      manufacturer: 'BMW',
      error: error.message,
      timestamp: new Date()
    });
  }
  
  return results;
}

// Scrape Wikipedia (English and German) - FIXED to extract real data
async function scrapeWikipedia() {
  const models = [];
  
  for (const [lang, url] of Object.entries({ en: BMW_SOURCES.wikipedia, de: BMW_SOURCES.wikipedia_de })) {
    try {
      console.log(`Scraping Wikipedia (${lang})...`);
      const html = await fetchPage(url);
      const $ = parseHTML(html);
      
      // Extract from infobox - look for actual data
      const infobox = $('.infobox');
      if (infobox.length > 0) {
        const extractedData = {
          productionYears: [],
          variants: [],
          specifications: {}
        };
        
        // Extract all rows from infobox
        infobox.find('tr').each((i, row) => {
          const label = cleanText($(row).find('th').text()).toLowerCase();
          const value = cleanText($(row).find('td').text());
          
          if (!label || !value) return;
          
          // Production years
          if (label.includes('production') || label.includes('produktion')) {
            const yearMatches = value.match(/\d{4}/g);
            if (yearMatches) {
              extractedData.productionYears = yearMatches.map(y => parseInt(y));
            }
          }
          
          // Engine variants - extract actual displacement values
          if (label.includes('engine') || label.includes('motor')) {
            const displacementMatches = value.match(/(\d+)\s*cc/gi);
            if (displacementMatches) {
              displacementMatches.forEach(match => {
                const displacement = parseInt(match);
                if (!extractedData.variants.find(v => v.displacement === displacement)) {
                  extractedData.variants.push({
                    displacement,
                    name: `C1 ${displacement}`
                  });
                }
              });
            }
          }
          
          // Store all specifications
          extractedData.specifications[label.replace(/\s+/g, '_')] = value;
        });
        
        // Also check the article body for variant information
        const bodyText = $('#mw-content-text').text();
        
        // Look for C1 125 and C1 200 mentions
        if (bodyText.match(/C1\s*125/i)) {
          if (!extractedData.variants.find(v => v.displacement === 125)) {
            extractedData.variants.push({ displacement: 125, name: 'C1 125' });
          }
        }
        
        if (bodyText.match(/C1\s*200/i) || bodyText.match(/176\s*cc/i)) {
          if (!extractedData.variants.find(v => v.displacement === 176)) {
            extractedData.variants.push({ displacement: 176, name: 'C1 200' });
          }
        }
        
        // Extract actual production years from the text if not found in infobox
        if (extractedData.productionYears.length === 0) {
          const yearRangeMatch = bodyText.match(/(\d{4})[–-](\d{4})/);
          if (yearRangeMatch) {
            const startYear = parseInt(yearRangeMatch[1]);
            const endYear = parseInt(yearRangeMatch[2]);
            for (let year = startYear; year <= endYear; year++) {
              // BMW C1 was only produced 2000-2002
              if (isValidYear(year) && year >= 1999 && year <= 2003) {
                extractedData.productionYears.push(year);
              }
            }
          }
        }
        
        // Create models only from extracted data
        extractedData.variants.forEach(variant => {
          extractedData.productionYears.forEach(year => {
            models.push({
              make: 'BMW',
              model: 'C1',
              package: variant.name.replace('C1 ', ''),
              year: year,
              category: 'cabin',
              specifications: {
                ...extractedData.specifications,
                source: `wikipedia_${lang}`,
                source_url: url,
                scraped_at: new Date().toISOString(),
                displacement: variant.displacement,
                displacement_unit: 'cc',
                variant_name: variant.name
              }
            });
          });
        });
      }
      
    } catch (error) {
      console.error(`Error scraping Wikipedia (${lang}):`, error.message);
    }
  }
  
  return models;
}

// Scrape motorcycle specification databases
async function scrapeMotorcycleSpecsDB() {
  const models = [];
  
  try {
    console.log('Scraping motorcycle specs database...');
    const html = await fetchPage(BMW_SOURCES.motorcycle_specs);
    const $ = parseHTML(html);
    
    // Extract specifications from the actual page structure
    const specifications = {};
    let year = null;
    let displacement = null;
    
    // Look for specification tables or lists
    $('table tr, .specs tr, .spec-item').each((i, row) => {
      const $row = $(row);
      const label = cleanText($row.find('td:first, .spec-label').text()).toLowerCase();
      const value = cleanText($row.find('td:last, .spec-value').text());
      
      if (!label || !value || label === value) return;
      
      // Extract year
      if (label.includes('year') || label.includes('model year')) {
        const yearMatch = value.match(/\d{4}/);
        if (yearMatch) year = parseInt(yearMatch[0]);
      }
      
      // Extract displacement
      if (label.includes('displacement') || label.includes('capacity')) {
        const dispMatch = value.match(/(\d+)/);
        if (dispMatch) displacement = parseInt(dispMatch[1]);
      }
      
      // Store all specifications
      specifications[label.replace(/[^a-z0-9]/g, '_')] = value;
    });
    
    // Only create model if we found actual data
    if (Object.keys(specifications).length > 0) {
      models.push({
        make: 'BMW',
        model: 'C1',
        package: displacement ? displacement.toString() : null,
        year: year,
        category: 'cabin',
        specifications: {
          ...specifications,
          source: 'motorcycle_specs_db',
          source_url: BMW_SOURCES.motorcycle_specs,
          scraped_at: new Date().toISOString()
        }
      });
    }
    
  } catch (error) {
    console.error('Error scraping motorcycle specs DB:', error.message);
  }
  
  return models;
}

// Scrape Archive.org for historical BMW pages
async function scrapeArchiveOrg() {
  const models = [];
  
  try {
    console.log('Checking Archive.org for historical BMW C1 pages...');
    
    // This would need proper implementation to:
    // 1. Use Archive.org's CDX API to find snapshots
    // 2. Fetch specific snapshots
    // 3. Parse historical BMW pages
    
    // For now, return empty array as this requires additional implementation
    console.log('Archive.org scraping not yet implemented');
    
  } catch (error) {
    console.error('Error scraping Archive.org:', error.message);
  }
  
  return models;
}

// Deduplicate models based on year, model, and package
function deduplicateModels(models) {
  const seen = new Set();
  return models.filter(model => {
    const key = `${model.year}-${model.model}-${model.package || ''}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

module.exports = {
  scrapeBMWC1,
  scrapeWikipedia,
  scrapeMotorcycleSpecsDB,
  scrapeArchiveOrg
};