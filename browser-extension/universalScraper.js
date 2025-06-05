/**
 * Universal Classified Ad Scraper
 * Works on any classified ad platform to extract structured data
 */

class UniversalScraper {
  constructor(document) {
    this.document = document;
    this.url = document.location.href;
    this.domain = this.extractDomain(this.url);
    this.data = {};
  }

  extractDomain(url) {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch (e) {
      return 'unknown';
    }
  }

  // Universal extraction methods that work across platforms
  extractTitle() {
    const selectors = [
      'h1', '.title', '[data-testid*="title"]', '[data-testid*="listing"]',
      '.listing-title', '.ad-title', '.post-title', '.item-title',
      '.postingtitletext', '#itemTitle', '.buysell-details h1',
      '[class*="title"]', '[id*="title"]', 'title'
    ];

    for (const selector of selectors) {
      const element = this.document.querySelector(selector);
      if (element && element.textContent.trim()) {
        let title = element.textContent.trim();
        // Clean common prefixes
        title = title.replace(/^Details about\s*/i, '');
        title = title.replace(/^\$\d+\s*/i, ''); // Remove price from title
        if (title.length > 10) { // Ensure it's substantial
          return title;
        }
      }
    }

    // Fallback to document title
    return this.document.title.split('|')[0].split('-')[0].trim();
  }

  extractPrice() {
    // Look for price patterns in text and specific selectors
    const priceSelectors = [
      '.price', '[data-testid*="price"]', '[class*="price"]',
      '#prcIsum', '.vi-price', '.display-price', '[itemprop="price"]',
      '.buysell-details .price', '.listing-price', '.ad-price'
    ];

    // First try specific selectors
    for (const selector of priceSelectors) {
      const element = this.document.querySelector(selector);
      if (element && element.textContent.trim()) {
        const priceText = element.textContent.trim();
        // Look for currency patterns with prefix
        const fullMatch = priceText.match(/(US\s*\$|USD\s*|€|£|¥)[\s]*[\d,]+(?:\.\d{2})?/i);
        if (fullMatch) {
          return fullMatch[0];
        }
        // Fallback to simple dollar amount
        const dollarMatch = priceText.match(/\$[\d,]+(?:\.\d{2})?/);
        if (dollarMatch) {
          return dollarMatch[0];
        }
      }
    }

    // Then search through all text for price patterns
    const allText = this.document.body.textContent;
    const pricePatterns = [
      /(US\s*\$|USD\s*)[\s]*[\d,]+(?:\.\d{2})?/gi,
      /\$[\d,]+(?:\.\d{2})?/g,
      /€[\d,]+(?:\.\d{2})?/g,
      /£[\d,]+(?:\.\d{2})?/g,
      /¥[\d,]+(?:\.\d{2})?/g
    ];

    for (const pattern of pricePatterns) {
      const matches = allText.match(pattern);
      if (matches && matches.length > 0) {
        // Return the most substantial price found
        return matches.sort((a, b) => b.length - a.length)[0];
      }
    }

    return '';
  }

  extractLocation() {
    // First try to extract from title for Craigslist
    const titleText = this.document.title || '';
    const h1Text = this.document.querySelector('h1')?.textContent || '';
    const titleSources = [titleText, h1Text];
    
    for (const source of titleSources) {
      // Look for location in parentheses
      const locationMatch = source.match(/\(([^)]+)\)\s*$/);
      if (locationMatch && locationMatch[1].length < 50) {
        const location = locationMatch[1].trim();
        // Filter out non-location parentheses content
        if (!location.toLowerCase().includes('map') && !location.match(/^\d+$/)) {
          return location;
        }
      }
    }
    
    // Platform-specific selectors
    const locationSelectors = [
      // Craigslist specific
      '.postingtitletext small', // Craigslist location in parentheses
      '.mapaddress', // Craigslist map address
      // General selectors
      '.location', '[data-testid*="location"]', '.address',
      '.listing-location', '.ad-location', '.post-location',
      '[class*="location"]', '[id*="location"]'
    ];

    for (const selector of locationSelectors) {
      const element = this.document.querySelector(selector);
      if (element && element.textContent.trim()) {
        let location = element.textContent.trim();
        // Clean up Craigslist location format
        location = location.replace(/[()]/g, '').trim();
        if (location && location.length < 100) { // Ensure it's not picking up full page content
          return location;
        }
      }
    }

    // For Craigslist, try to extract from title
    const titleElement = this.document.querySelector('.postingtitletext') || 
                         this.document.querySelector('h1') ||
                         this.document.querySelector('[class*="title"]');
    if (titleElement) {
      const titleText = titleElement.textContent;
      // Look for location in parentheses at end of title
      const locationMatch = titleText.match(/\(([^)]+)\)$/);
      if (locationMatch && locationMatch[1].length < 50) {
        return locationMatch[1].trim();
      }
    }

    // Look for common location patterns in text
    const textElement = this.document.querySelector('#postingbody') || this.document.body;
    const allText = textElement.textContent.substring(0, 1000); // Only check first 1000 chars
    const locationPatterns = [
      /\b[A-Z][a-z]+,\s*[A-Z]{2}\b/g, // City, State
      /\b\d{5}(?:-\d{4})?\b/g, // ZIP codes
    ];

    for (const pattern of locationPatterns) {
      const matches = allText.match(pattern);
      if (matches && matches.length > 0) {
        return matches[0];
      }
    }

    return '';
  }

  extractDescription() {
    const descriptionSelectors = [
      '#postingbody', '.description', '[data-testid*="description"]',
      '.listing-description', '.ad-description', '.post-body',
      '.item-description', '.buysell-details .description',
      '[class*="description"]', '[class*="body"]', '.content'
    ];

    for (const selector of descriptionSelectors) {
      const element = this.document.querySelector(selector);
      if (element && element.textContent.trim()) {
        return element.textContent.trim();
      }
    }

    // Fallback: get largest text block
    const paragraphs = this.document.querySelectorAll('p, div');
    let longestText = '';
    
    for (const p of paragraphs) {
      const text = p.textContent.trim();
      if (text.length > longestText.length && text.length > 50) {
        longestText = text;
      }
    }

    return longestText;
  }

  extractImages() {
    const images = [];
    
    // First check for script-based image data (common in Craigslist)
    const scripts = this.document.querySelectorAll('script');
    for (const script of scripts) {
      const content = script.textContent;
      if (content.includes('var imgList =')) {
        // Extract Craigslist image list from JavaScript
        const imgListMatch = content.match(/var imgList = (\[[\s\S]*?\]);/);
        if (imgListMatch) {
          try {
            // Parse the imgList JavaScript array
            const imgList = eval(imgListMatch[1]);
            
            // Extract the highest resolution image URLs
            const fullSizeUrls = [];
            imgList.forEach(img => {
              // Get the image ID and construct the full-size URL
              if (img.imgid) {
                // Craigslist stores full images at URLs like:
                // https://images.craigslist.org/00y0y_9SyqWVZhD0S_0CI0lM.jpg
                const imgIdParts = img.imgid.split(':');
                if (imgIdParts.length > 1) {
                  // Just use the URL as provided by Craigslist
                  if (img.url && !img.url.includes('50x50') && !img.url.includes('300x300')) {
                    fullSizeUrls.push(img.url);
                  }
                }
              } else if (img.url) {
                // Just use the URL as-is, filtering will handle thumbnails
                fullSizeUrls.push(img.url);
              }
            });
            
            // If we found full-size images, return them
            if (fullSizeUrls.length > 0) {
              return fullSizeUrls;
            }
          } catch (e) {
            console.log('Failed to parse imgList:', e);
          }
        }
      }
    }
    
    // Platform-specific image selectors
    const imageSelectors = [
      // eBay specific
      '#icImg', // Main eBay image
      // Facebook specific
      '[data-visualcompletion="media-vc-image"]', // Facebook Marketplace
      // General selectors
      '.gallery img', '.images img', '.photos img',
      '.listing-images img', '.ad-images img', 'img'
    ];

    const uniqueUrls = new Set();
    for (const selector of imageSelectors) {
      const elements = this.document.querySelectorAll(selector);
      for (const img of elements) {
        if (img.src && img.src.startsWith('http')) {
          // Skip thumbnails and small images by keywords in URL
          if (img.src.includes('thumb') || 
              img.src.includes('thumbnail') ||
              img.src.includes('small') ||
              img.src.includes('icon') || 
              img.src.includes('logo') ||
              img.src.includes('_s.') ||
              img.src.includes('_t.')) {
            continue;
          }
          
          // Skip thumbnails based on HTML attributes
          if (img.className && img.className.toLowerCase().includes('thumb')) {
            continue;
          }
          if (img.alt && img.alt.toLowerCase().includes('thumb')) {
            continue;
          }
          if (img.title && img.title.toLowerCase().includes('thumb')) {
            continue;
          }
          
          // Skip images with dimensions smaller than 600x450
          const dimensionMatch = img.src.match(/(\d+)x(\d+)/);
          if (dimensionMatch) {
            const width = parseInt(dimensionMatch[1]);
            const height = parseInt(dimensionMatch[2]);
            if (width <= 600 && height <= 450) {
              continue;
            }
          }
          
          let url = img.src;
          uniqueUrls.add(url);
        }
      }
    }

    return Array.from(uniqueUrls);
  }

  extractContactInfo() {
    // Focus on the main content area to avoid picking up post IDs
    const contentElement = this.document.querySelector('#postingbody') || 
                          this.document.querySelector('.description') || 
                          this.document.body;
    const allText = contentElement.textContent;
    const contact = {};

    // Phone numbers - be more specific to avoid post IDs
    const phonePattern = /\b(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b/g;
    const phoneMatches = allText.match(phonePattern);
    if (phoneMatches) {
      // Filter out numbers that look like post IDs (10 digits with no formatting)
      const validPhones = phoneMatches.filter(phone => {
        // Must have some formatting (parentheses, dashes, or spaces)
        return phone.includes('(') || phone.includes('-') || phone.includes(' ') || phone.includes('.');
      });
      if (validPhones.length > 0) {
        contact.phone = validPhones[0];
      }
    }

    // Email addresses
    const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const emailMatches = allText.match(emailPattern);
    if (emailMatches) {
      // Filter out common system emails
      const validEmails = emailMatches.filter(email => 
        !email.includes('noreply') && 
        !email.includes('craigslist') &&
        !email.includes('system')
      );
      if (validEmails.length > 0) {
        contact.email = validEmails[0];
      }
    }

    return contact;
  }

  extractMetadata() {
    const metadata = {};
    
    // Look for structured data
    const jsonLd = this.document.querySelectorAll('script[type="application/ld+json"]');
    for (const script of jsonLd) {
      try {
        const data = JSON.parse(script.textContent);
        if (data['@type'] === 'Product' || data['@type'] === 'Offer') {
          metadata.structuredData = data;
        }
      } catch (e) {
        // Ignore invalid JSON
      }
    }

    // Extract meta tags
    const metaTags = this.document.querySelectorAll('meta[property], meta[name]');
    for (const meta of metaTags) {
      const property = meta.getAttribute('property') || meta.getAttribute('name');
      const content = meta.getAttribute('content');
      if (property && content) {
        metadata[property] = content;
      }
    }

    return metadata;
  }

  extractAttributes() {
    const attributes = {};
    
    // Craigslist specific attribute groups
    const attrGroups = this.document.querySelectorAll('.attrgroup');
    for (const group of attrGroups) {
      // Look for year and make/model in the "important" attributes
      const yearSpan = group.querySelector('span.year');
      if (yearSpan) {
        attributes.year = yearSpan.textContent.trim();
      }
      
      const makeModelSpan = group.querySelector('span.makemodel');
      if (makeModelSpan) {
        const makeModel = makeModelSpan.textContent.trim();
        // Extract make and model from text like "BMW R 1200 RT K52"
        const parts = makeModel.split(/\s+/);
        if (parts.length > 0) {
          attributes.make = parts[0];
          attributes.model = parts.slice(1).join(' ');
        }
      }
      
      // Look for label/value pairs in attribute divs
      const attrDivs = group.querySelectorAll('.attr');
      for (const div of attrDivs) {
        const label = div.querySelector('.labl');
        const value = div.querySelector('.valu');
        
        if (label && value) {
          const key = label.textContent.replace(':', '').trim().toLowerCase();
          const val = value.textContent.trim();
          
          if (key && val) {
            attributes[key] = val;
            
            // Store common variations
            if (key === 'vin') {
              attributes.VIN = val;
              attributes.vin = val;
            }
            if (key === 'engine displacement (cc)') {
              attributes.displacement = val;
            }
          }
        }
      }
    }
    
    // Extract year/make/model from title if present
    const title = this.extractTitle();
    const yearMatch = title.match(/\b(19|20)\d{2}\b/);
    if (yearMatch) {
      attributes.year = yearMatch[0];
    }
    
    // Common motorcycle/bicycle brands
    const brands = ['BMW', 'Honda', 'Yamaha', 'Suzuki', 'Kawasaki', 'Harley', 'Ducati', 
                    'Trek', 'Specialized', 'Giant', 'Cannondale', 'Santa Cruz'];
    for (const brand of brands) {
      if (title.toUpperCase().includes(brand.toUpperCase())) {
        attributes.make = brand;
        // Try to extract model after brand
        const regex = new RegExp(brand + '\\s+([A-Z0-9]+)', 'i');
        const modelMatch = title.match(regex);
        if (modelMatch) {
          attributes.model = modelMatch[1];
        }
        break;
      }
    }
    
    // Look for generic key-value pairs
    const attributeSelectors = [
      '.attributes', '.specs', '.details', '.specifications',
      '.item-specifics', '.features', '.props', '[class*="spec"]'
    ];

    for (const selector of attributeSelectors) {
      const container = this.document.querySelector(selector);
      if (container) {
        // Look for dt/dd pairs
        const dts = container.querySelectorAll('dt');
        const dds = container.querySelectorAll('dd');
        
        for (let i = 0; i < Math.min(dts.length, dds.length); i++) {
          const key = dts[i].textContent.trim().toLowerCase();
          const value = dds[i].textContent.trim();
          if (key && value) {
            attributes[key] = value;
          }
        }
      }
    }

    return attributes;
  }

  categorizeItem() {
    const title = this.extractTitle().toLowerCase();
    const description = this.extractDescription().toLowerCase();
    const allText = (title + ' ' + description).toLowerCase();

    // Check for motorcycle brands first
    const motorcycleBrands = ['yamaha', 'honda', 'suzuki', 'kawasaki', 'harley', 'bmw', 'ducati', 'triumph', 'ktm'];
    const motorcycleModels = ['mt-07', 'mt-09', 'r1200rt', 'gsxr', 'ninja', 'cbr', 'sportster'];
    
    for (const brand of motorcycleBrands) {
      if (allText.includes(brand)) {
        return 'motorcycle';
      }
    }
    
    for (const model of motorcycleModels) {
      if (allText.includes(model)) {
        return 'motorcycle';
      }
    }

    // Vehicle categories
    if (allText.match(/\b(car|auto|vehicle|sedan|suv|truck|motorcycle|bike|bicycle)\b/)) {
      if (allText.match(/\b(bicycle|bike|cycling|mountain bike|road bike)\b/) && !allText.includes('motor')) {
        return 'bicycle';
      } else if (allText.match(/\b(motorcycle|motorbike|scooter)\b/)) {
        return 'motorcycle';
      } else {
        return 'vehicle';
      }
    }

    // Electronics
    if (allText.match(/\b(phone|laptop|computer|tablet|tv|electronic|iphone|android)\b/)) {
      return 'electronics';
    }

    // Home & Garden
    if (allText.match(/\b(furniture|couch|table|chair|bed|appliance|refrigerator)\b/)) {
      return 'home_garden';
    }

    // Clothing
    if (allText.match(/\b(clothing|shirt|pants|dress|shoes|jacket)\b/)) {
      return 'clothing';
    }

    // Sports
    if (allText.match(/\b(sports|equipment|fitness|golf|tennis|baseball)\b/)) {
      return 'sports';
    }

    return 'other';
  }

  extractAll() {
    const startTime = Date.now();
    
    try {
      this.data = {
        // Basic info
        title: this.extractTitle(),
        price: this.extractPrice(),
        location: this.extractLocation(),
        description: this.extractDescription(),
        
        // Media
        images: this.extractImages(),
        
        // Contact
        contact: this.extractContactInfo(),
        
        // Technical
        attributes: this.extractAttributes(),
        metadata: this.extractMetadata(),
        category: this.categorizeItem(),
        
        // Extraction metadata
        url: this.url,
        domain: this.domain,
        timestamp: new Date().toISOString(),
        extractionTime: Date.now() - startTime,
        scraperVersion: '2.0'
      };

      return this.data;
    } catch (error) {
      return {
        error: error.message,
        url: this.url,
        domain: this.domain,
        timestamp: new Date().toISOString(),
        scraperVersion: '2.0'
      };
    }
  }
}

// Main extraction function that can be called from popup
function extractClassifiedAd() {
  console.log('Universal scraper starting extraction...');
  
  try {
    const scraper = new UniversalScraper(document);
    const data = scraper.extractAll();
    
    console.log('Extraction completed:', data);
    return data;
  } catch (error) {
    console.error('Universal scraper error:', error);
    return {
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

// Export for use in other scripts
if (typeof module !== 'undefined') {
  module.exports = { UniversalScraper, extractClassifiedAd };
}

// Make globally available
window.extractClassifiedAd = extractClassifiedAd;
window.UniversalScraper = UniversalScraper;