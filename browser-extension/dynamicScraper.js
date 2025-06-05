/**
 * Dynamic Classified Ad Scraper
 * Interacts with page elements to extract full-resolution content
 */

class DynamicScraper {
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

  async extractImages() {
    const images = [];
    
    // For Craigslist, collect ALL images from ALL slides
    if (this.domain.includes('craigslist')) {
      console.log('Craigslist detected - collecting all gallery images');
      
      // Get ALL images from ALL slides (not just visible ones)
      const allSlideImages = this.document.querySelectorAll('.slide img');
      console.log(`Found ${allSlideImages.length} total slide images`);
      
      // Group by size to understand what we have
      const imagesBySize = {};
      allSlideImages.forEach(img => {
        if (img.src && img.src.includes('craigslist')) {
          const sizeMatch = img.src.match(/(\d+x\d+)/);  
          const size = sizeMatch ? sizeMatch[1] : 'unknown';
          if (!imagesBySize[size]) imagesBySize[size] = [];
          
          if (!img.src.includes('50x50') && !images.includes(img.src)) {
            images.push(img.src);
            imagesBySize[size].push(img.src);
          }
        }
      });
      
      // Report what we found
      Object.entries(imagesBySize).forEach(([size, urls]) => {
        console.log(`${size}: ${urls.length} images`);
      });
      
      // If we have 1200x900 images, great! If not, let user know
      if (imagesBySize['1200x900'] && imagesBySize['1200x900'].length > 0) {
        console.log('✅ Full-size (1200x900) images found!');
      } else if (imagesBySize['600x450'] && imagesBySize['600x450'].length > 0) {
        console.log('ℹ️ Medium (600x450) images found. Click main image for full-size versions.');
      }
      
      console.log(`Total extracted: ${images.length} Craigslist images`)
    } else {
      // For other platforms, use standard image extraction
      const imageSelectors = [
        '#icImg', // eBay main image
        '[data-visualcompletion="media-vc-image"]', // Facebook
        '.gallery img', '.images img', '.photos img',
        '.listing-images img', '.ad-images img', 'img'
      ];

      const uniqueUrls = new Set();
      for (const selector of imageSelectors) {
        const elements = this.document.querySelectorAll(selector);
        for (const img of elements) {
          if (img.src && img.src.startsWith('http')) {
            // Skip thumbnails
            if (this.isThumbnail(img)) {
              continue;
            }
            uniqueUrls.add(img.src);
          }
        }
      }
      
      images.push(...Array.from(uniqueUrls));
    }
    
    return images;
  }

  isThumbnail(img) {
    const src = img.src.toLowerCase();
    const className = (img.className || '').toLowerCase();
    const alt = (img.alt || '').toLowerCase();
    const title = (img.title || '').toLowerCase();
    
    // Check URL patterns
    if (src.includes('thumb') || 
        src.includes('thumbnail') ||
        src.includes('small') ||
        src.includes('icon') || 
        src.includes('logo') ||
        src.includes('_s.') ||
        src.includes('_t.')) {
      return true;
    }
    
    // Check HTML attributes
    if (className.includes('thumb') || 
        alt.includes('thumb') || 
        title.includes('thumb')) {
      return true;
    }
    
    // Check dimensions in URL
    const dimensionMatch = src.match(/(\d+)x(\d+)/);
    if (dimensionMatch) {
      const width = parseInt(dimensionMatch[1]);
      const height = parseInt(dimensionMatch[2]);
      if (width <= 600 && height <= 450) {
        return true;
      }
    }
    
    return false;
  }

  wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

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
        title = title.replace(/^Details about\s*/i, '');
        title = title.replace(/^\$\d+\s*/i, '');
        if (title.length > 10) {
          return title;
        }
      }
    }

    return this.document.title.split('|')[0].split('-')[0].trim();
  }

  extractPrice() {
    const priceSelectors = [
      '.price', '[data-testid*="price"]', '[class*="price"]',
      '#prcIsum', '.vi-price', '.display-price', '[itemprop="price"]',
      '.buysell-details .price', '.listing-price', '.ad-price'
    ];

    for (const selector of priceSelectors) {
      const element = this.document.querySelector(selector);
      if (element && element.textContent.trim()) {
        const priceText = element.textContent.trim();
        const fullMatch = priceText.match(/(US\s*\$|USD\s*|€|£|¥)[\s]*[\d,]+(?:\.\d{2})?/i);
        if (fullMatch) {
          return fullMatch[0];
        }
        const dollarMatch = priceText.match(/\$[\d,]+(?:\.\d{2})?/);
        if (dollarMatch) {
          return dollarMatch[0];
        }
      }
    }

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
        return matches.sort((a, b) => b.length - a.length)[0];
      }
    }

    return '';
  }

  extractLocation() {
    const titleText = this.document.title || '';
    const h1Text = this.document.querySelector('h1')?.textContent || '';
    const titleSources = [titleText, h1Text];
    
    for (const source of titleSources) {
      const locationMatch = source.match(/\(([^)]+)\)\s*$/);
      if (locationMatch && locationMatch[1].length < 50) {
        const location = locationMatch[1].trim();
        if (!location.toLowerCase().includes('map') && !location.match(/^\d+$/)) {
          return location;
        }
      }
    }
    
    const locationSelectors = [
      '.postingtitletext small',
      '.mapaddress',
      '.location', '[data-testid*="location"]', '.address',
      '.listing-location', '.ad-location', '.post-location',
      '[class*="location"]', '[id*="location"]'
    ];

    for (const selector of locationSelectors) {
      const element = this.document.querySelector(selector);
      if (element && element.textContent.trim()) {
        let location = element.textContent.trim();
        location = location.replace(/[()]/g, '').trim();
        if (location && location.length < 100) {
          return location;
        }
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

  extractContactInfo() {
    const contentElement = this.document.querySelector('#postingbody') || 
                          this.document.querySelector('.description') || 
                          this.document.body;
    const allText = contentElement.textContent;
    const contact = {};

    const phonePattern = /\b(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b/g;
    const phoneMatches = allText.match(phonePattern);
    if (phoneMatches) {
      const validPhones = phoneMatches.filter(phone => {
        return phone.includes('(') || phone.includes('-') || phone.includes(' ') || phone.includes('.');
      });
      if (validPhones.length > 0) {
        contact.phone = validPhones[0];
      }
    }

    const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const emailMatches = allText.match(emailPattern);
    if (emailMatches) {
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
    
    const attrGroups = this.document.querySelectorAll('.attrgroup');
    for (const group of attrGroups) {
      const yearSpan = group.querySelector('span.year');
      if (yearSpan) {
        attributes.year = yearSpan.textContent.trim();
      }
      
      const makeModelSpan = group.querySelector('span.makemodel');
      if (makeModelSpan) {
        const makeModel = makeModelSpan.textContent.trim();
        const parts = makeModel.split(/\\s+/);
        if (parts.length > 0) {
          attributes.make = parts[0];
          attributes.model = parts.slice(1).join(' ');
        }
      }
      
      const attrDivs = group.querySelectorAll('.attr');
      for (const div of attrDivs) {
        const label = div.querySelector('.labl');
        const value = div.querySelector('.valu');
        
        if (label && value) {
          const key = label.textContent.replace(':', '').trim().toLowerCase();
          const val = value.textContent.trim();
          
          if (key && val) {
            attributes[key] = val;
            
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
    
    const title = this.extractTitle();
    const yearMatch = title.match(/\b(19|20)\d{2}\b/);
    if (yearMatch) {
      attributes.year = yearMatch[0];
    }
    
    const brands = ['BMW', 'Honda', 'Yamaha', 'Suzuki', 'Kawasaki', 'Harley', 'Ducati', 
                    'Trek', 'Specialized', 'Giant', 'Cannondale', 'Santa Cruz'];
    for (const brand of brands) {
      if (title.toUpperCase().includes(brand.toUpperCase())) {
        attributes.make = brand;
        const regex = new RegExp(brand + '\\s+([A-Z0-9]+)', 'i');
        const modelMatch = title.match(regex);
        if (modelMatch) {
          attributes.model = modelMatch[1];
        }
        break;
      }
    }
    
    const attributeSelectors = [
      '.attributes', '.specs', '.details', '.specifications',
      '.item-specifics', '.features', '.props', '[class*="spec"]'
    ];

    for (const selector of attributeSelectors) {
      const container = this.document.querySelector(selector);
      if (container) {
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

    if (allText.match(/\b(car|auto|vehicle|sedan|suv|truck|motorcycle|bike|bicycle)\b/)) {
      if (allText.match(/\b(bicycle|bike|cycling|mountain bike|road bike)\b/) && !allText.includes('motor')) {
        return 'bicycle';
      } else if (allText.match(/\b(motorcycle|motorbike|scooter)\b/)) {
        return 'motorcycle';
      } else {
        return 'vehicle';
      }
    }

    if (allText.match(/\b(phone|laptop|computer|tablet|tv|electronic|iphone|android)\b/)) {
      return 'electronics';
    }

    if (allText.match(/\b(furniture|couch|table|chair|bed|appliance|refrigerator)\b/)) {
      return 'home_garden';
    }

    if (allText.match(/\b(clothing|shirt|pants|dress|shoes|jacket)\b/)) {
      return 'clothing';
    }

    if (allText.match(/\b(sports|equipment|fitness|golf|tennis|baseball)\b/)) {
      return 'sports';
    }

    return 'other';
  }

  async extractAll() {
    const startTime = Date.now();
    
    try {
      // Extract images dynamically
      const images = await this.extractImages();
      
      this.data = {
        // Basic info
        title: this.extractTitle(),
        price: this.extractPrice(),
        location: this.extractLocation(),
        description: this.extractDescription(),
        
        // Media
        images: images,
        
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
        scraperVersion: '3.0-dynamic'
      };

      return this.data;
    } catch (error) {
      return {
        error: error.message,
        url: this.url,
        domain: this.domain,
        timestamp: new Date().toISOString(),
        scraperVersion: '3.0-dynamic'
      };
    }
  }
}

// Main extraction function that can be called from popup
async function extractClassifiedAd() {
  console.log('Dynamic scraper starting extraction...');
  
  try {
    const scraper = new DynamicScraper(document);
    const data = await scraper.extractAll();
    
    console.log('Extraction completed:', data);
    return data;
  } catch (error) {
    console.error('Dynamic scraper error:', error);
    return {
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

// Export for use in other scripts
if (typeof module !== 'undefined') {
  module.exports = { DynamicScraper, extractClassifiedAd };
}

// Make globally available
window.extractClassifiedAd = extractClassifiedAd;
window.DynamicScraper = DynamicScraper;