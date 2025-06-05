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
        const match = priceText.match(/\$[\d,]+(?:\.\d{2})?/);
        if (match) {
          return match[0];
        }
      }
    }

    // Then search through all text for price patterns
    const allText = this.document.body.textContent;
    const pricePatterns = [
      /\$[\d,]+(?:\.\d{2})?/g,
      /USD[\s\$]*[\d,]+(?:\.\d{2})?/gi,
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
            // Use JSON.parse on the matched string after cleaning it up
            const imgListStr = imgListMatch[1]
              .replace(/(\w+):/g, '"$1":') // Add quotes to keys
              .replace(/'/g, '"'); // Replace single quotes with double
            const imgList = JSON.parse(imgListStr);
            
            // Extract unique full-size image URLs
            const uniqueUrls = new Set();
            imgList.forEach(img => {
              if (img.url && img.url.includes('600x450')) {
                // Get the 600x450 version (full size for Craigslist)
                uniqueUrls.add(img.url);
              }
            });
            
            return Array.from(uniqueUrls);
          } catch (e) {
            // If JSON parsing fails, try a more direct approach
            const urlMatches = content.match(/"url":"([^"]+600x450[^"]+)"/g);
            if (urlMatches) {
              const uniqueUrls = new Set();
              urlMatches.forEach(match => {
                const url = match.match(/"url":"([^"]+)"/)[1];
                uniqueUrls.add(url);
              });
              return Array.from(uniqueUrls);
            }
          }
        }
      }
    }
    
    // Fallback to checking for regular img tags if script parsing fails
    const imageSelectors = [
      '.gallery img[src*="600x450"]', // Craigslist full-size images
      '.swipe img[src*="600x450"]',
      'img[src*="600x450"]',
      // General selectors as last resort
      '.gallery img', '.images img', '.photos img',
      '.listing-images img', '.ad-images img'
    ];

    const uniqueUrls = new Set();
    for (const selector of imageSelectors) {
      const elements = this.document.querySelectorAll(selector);
      for (const img of elements) {
        if (img.src && img.src.startsWith('http') && !img.src.includes('icon') && !img.src.includes('logo')) {
          uniqueUrls.add(img.src);
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
    
    // Look for key-value pairs in the content
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
          const key = dts[i].textContent.trim();
          const value = dds[i].textContent.trim();
          if (key && value) {
            attributes[key] = value;
          }
        }

        // Look for label:value patterns in text
        const text = container.textContent;
        const pairs = text.match(/([^:\n]+):\s*([^:\n]+)/g);
        if (pairs) {
          for (const pair of pairs) {
            const [key, value] = pair.split(':').map(s => s.trim());
            if (key && value && key.length < 50 && value.length < 200) {
              attributes[key] = value;
            }
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