/**
 * Platform-specific handlers for different classified/listing websites
 */

// Base extractor interface that all platform handlers will implement
class ListingExtractor {
  constructor(document) {
    this.document = document;
    this.url = document.location.href;
  }
  
  // Extract all the raw text content from the listing
  extractTextContent() {
    throw new Error('Method not implemented');
  }
  
  // Extract listing title
  extractTitle() {
    throw new Error('Method not implemented');
  }
  
  // Extract listing price
  extractPrice() {
    throw new Error('Method not implemented');
  }
  
  // Extract listing images
  extractImages() {
    throw new Error('Method not implemented');
  }
  
  // Detect if this is a bike listing
  isBikeListing() {
    throw new Error('Method not implemented');
  }
  
  // Extract all data
  extractAll() {
    throw new Error('Method not implemented');
  }
}

/**
 * Craigslist-specific listing extractor
 */
class CraigslistExtractor extends ListingExtractor {
  extractTextContent() {
    // Main content body
    const postingBody = this.document.querySelector('#postingbody');
    const bodyText = postingBody ? postingBody.textContent.trim() : '';
    
    // Title
    const titleElement = this.document.querySelector('.postingtitletext');
    const titleText = titleElement ? titleElement.textContent.trim() : '';
    
    // Attributes section
    const attrGroupElements = this.document.querySelectorAll('.attrgroup span');
    const attrText = Array.from(attrGroupElements)
      .map(el => el.textContent.trim())
      .join('\n');
    
    return `${titleText}\n\n${bodyText}\n\n${attrText}`;
  }
  
  extractTitle() {
    const titleElement = this.document.querySelector('.postingtitletext');
    return titleElement ? titleElement.textContent.trim() : '';
  }
  
  extractPrice() {
    const priceElement = this.document.querySelector('.price');
    return priceElement ? priceElement.textContent.trim() : '';
  }
  
  extractImages() {
    const imageElements = this.document.querySelectorAll('.gallery img, .swipe img');
    return Array.from(imageElements).map(img => img.src);
  }
  
  isBikeListing() {
    // Check URL for bike category
    if (this.url.includes('/bik/') || this.url.includes('/bia/')) {
      return true;
    }
    
    // Check breadcrumbs
    const breadcrumbs = this.document.querySelector('.breadcrumbs');
    if (breadcrumbs && breadcrumbs.textContent.toLowerCase().includes('bike')) {
      return true;
    }
    
    // Check title and body for bike keywords
    const title = this.extractTitle().toLowerCase();
    const bikeKeywords = ['bike', 'bicycle', 'trek', 'specialized', 'cannondale', 'giant', 'santa cruz'];
    
    // Check if any bike keywords are in the title
    for (const keyword of bikeKeywords) {
      if (title.includes(keyword)) {
        return true;
      }
    }
    
    return false;
  }
  
  extractAll() {
    const isListing = this.isBikeListing();
    if (!isListing) {
      return {
        isBikeListing: false,
        url: this.url,
        title: this.extractTitle(),
        timestamp: new Date().toISOString()
      };
    }
    
    return {
      isBikeListing: true,
      url: this.url,
      title: this.extractTitle(),
      price: this.extractPrice(),
      images: this.extractImages(),
      fullText: this.extractTextContent(),
      timestamp: new Date().toISOString(),
      source: 'craigslist'
    };
  }
}

/**
 * Facebook Marketplace-specific listing extractor
 */
class FacebookMarketplaceExtractor extends ListingExtractor {
  extractTextContent() {
    // Extract main content and description
    // Facebook's structure is more complex and changes frequently
    // We'll use more robust methods to find the content
    const contentSelectors = [
      '[data-testid="marketplace-listing-item-description"]',
      '[data-testid="listing-details"]',
      '[data-testid="marketplace_listing_title"]',
      'span[dir="auto"]'
    ];
    
    let contentElements = [];
    for (const selector of contentSelectors) {
      const elements = this.document.querySelectorAll(selector);
      if (elements.length > 0) {
        contentElements = [...contentElements, ...Array.from(elements)];
      }
    }
    
    // Get text from all found elements
    const texts = contentElements.map(el => el.textContent.trim()).filter(Boolean);
    return texts.join('\n\n');
  }
  
  extractTitle() {
    // FB has various selectors for title over time
    const titleSelectors = [
      '[data-testid="marketplace_listing_title"]',
      'span[dir="auto"]'
    ];
    
    for (const selector of titleSelectors) {
      const titleElement = this.document.querySelector(selector);
      if (titleElement && titleElement.textContent.trim()) {
        return titleElement.textContent.trim();
      }
    }
    
    // Fallback to document title
    return this.document.title.replace(' | Facebook Marketplace', '').trim();
  }
  
  extractPrice() {
    // Various price selectors
    const priceSelectors = [
      '[data-testid="marketplace_listing_price"]',
      'span[dir="auto"]'
    ];
    
    for (const selector of priceSelectors) {
      const elements = this.document.querySelectorAll(selector);
      for (const el of elements) {
        // Look for price patterns
        if (el.textContent.match(/\$\d+/)) {
          return el.textContent.trim();
        }
      }
    }
    
    return '';
  }
  
  extractImages() {
    // FB loads images dynamically, so we need to find them in the current state
    const imageElements = this.document.querySelectorAll('img[data-visualcompletion="media-vc-image"]');
    return Array.from(imageElements)
      .map(img => img.src)
      .filter(src => src && !src.includes('empty.png'));
  }
  
  isBikeListing() {
    // Check title and content for bike keywords
    const content = this.extractTextContent().toLowerCase();
    const bikeKeywords = ['bike', 'bicycle', 'cycling', 'trek', 'specialized', 'cannondale', 'giant', 'santa cruz'];
    
    for (const keyword of bikeKeywords) {
      if (content.includes(keyword)) {
        return true;
      }
    }
    
    // Check URL for marketplace bike category
    if (this.url.includes('marketplace/category/bicycles')) {
      return true;
    }
    
    return false;
  }
  
  extractAll() {
    const isListing = this.isBikeListing();
    if (!isListing) {
      return {
        isBikeListing: false,
        url: this.url,
        title: this.extractTitle(),
        timestamp: new Date().toISOString()
      };
    }
    
    return {
      isBikeListing: true,
      url: this.url,
      title: this.extractTitle(),
      price: this.extractPrice(),
      images: this.extractImages(),
      fullText: this.extractTextContent(),
      timestamp: new Date().toISOString(),
      source: 'facebook_marketplace'
    };
  }
}

/**
 * eBay-specific listing extractor
 */
class EbayExtractor extends ListingExtractor {
  extractTextContent() {
    // Product title
    const titleElement = this.document.querySelector('h1#itemTitle');
    const titleText = titleElement ? titleElement.textContent.replace('Details about', '').trim() : '';
    
    // Description (can be in iframe, so we'll need to extract what we can)
    const descriptionElement = this.document.querySelector('#desc_ifr');
    let descriptionText = '';
    if (descriptionElement && descriptionElement.contentDocument) {
      descriptionText = descriptionElement.contentDocument.body.textContent.trim();
    } else {
      // Try to find description in the main document
      const descDiv = this.document.querySelector('#description, .item-description');
      if (descDiv) {
        descriptionText = descDiv.textContent.trim();
      }
    }
    
    // Item specifics table
    const itemSpecsRows = this.document.querySelectorAll('.item-spectables tr');
    const itemSpecsText = Array.from(itemSpecsRows)
      .map(row => {
        const label = row.querySelector('th');
        const value = row.querySelector('td');
        if (label && value) {
          return `${label.textContent.trim()}: ${value.textContent.trim()}`;
        }
        return '';
      })
      .filter(Boolean)
      .join('\n');
    
    return `${titleText}\n\n${descriptionText}\n\n${itemSpecsText}`;
  }
  
  extractTitle() {
    const titleElement = this.document.querySelector('h1#itemTitle');
    return titleElement ? titleElement.textContent.replace('Details about', '').trim() : '';
  }
  
  extractPrice() {
    const priceSelectors = [
      '#prcIsum',
      '.vi-price',
      '.display-price',
      '[itemprop="price"]'
    ];
    
    for (const selector of priceSelectors) {
      const priceElement = this.document.querySelector(selector);
      if (priceElement && priceElement.textContent.trim()) {
        return priceElement.textContent.trim();
      }
    }
    
    return '';
  }
  
  extractImages() {
    // Try different image selectors
    const imageSelectors = [
      '#icImg', // Main image
      '#viEnlargeImgLayer img', // Enlarged image
      '#mainImgHldr img', // Another potential main image
      '.img300, .img500' // Thumbnail images
    ];
    
    let images = [];
    for (const selector of imageSelectors) {
      const imageElements = this.document.querySelectorAll(selector);
      const srcs = Array.from(imageElements)
        .map(img => img.src)
        .filter(Boolean);
      images = [...images, ...srcs];
    }
    
    // Remove duplicates
    return [...new Set(images)];
  }
  
  isBikeListing() {
    // Check URL for bike category
    if (this.url.includes('/bicycles/') || 
        this.url.includes('/cycling/') || 
        this.url.includes('/bikes/')) {
      return true;
    }
    
    // Check breadcrumbs
    const breadcrumbs = this.document.querySelectorAll('.breadcrumbs a');
    for (const crumb of breadcrumbs) {
      if (crumb.textContent.toLowerCase().includes('bike') || 
          crumb.textContent.toLowerCase().includes('bicycles') ||
          crumb.textContent.toLowerCase().includes('cycling')) {
        return true;
      }
    }
    
    // Check title for bike keywords
    const title = this.extractTitle().toLowerCase();
    const bikeKeywords = [
      'bike', 'bicycle', 'cycling', 'trek', 'specialized', 'cannondale', 
      'giant', 'santa cruz', 'mountain bike', 'road bike', 'mtb'
    ];
    
    for (const keyword of bikeKeywords) {
      if (title.includes(keyword)) {
        return true;
      }
    }
    
    return false;
  }
  
  extractAll() {
    const isListing = this.isBikeListing();
    if (!isListing) {
      return {
        isBikeListing: false,
        url: this.url,
        title: this.extractTitle(),
        timestamp: new Date().toISOString()
      };
    }
    
    return {
      isBikeListing: true,
      url: this.url,
      title: this.extractTitle(),
      price: this.extractPrice(),
      images: this.extractImages(),
      fullText: this.extractTextContent(),
      timestamp: new Date().toISOString(),
      source: 'ebay'
    };
  }
}

/**
 * PinkBike-specific listing extractor for bike classifieds
 */
class PinkbikeExtractor extends ListingExtractor {
  extractTextContent() {
    // Extract title
    const titleElement = this.document.querySelector('.buysell-details h1');
    const titleText = titleElement ? titleElement.textContent.trim() : '';
    
    // Extract description
    const descriptionElement = this.document.querySelector('.buysell-details .description');
    const descriptionText = descriptionElement ? descriptionElement.textContent.trim() : '';
    
    // Extract specs
    const specsElements = this.document.querySelectorAll('.buysell-details .specs-list li');
    const specsText = Array.from(specsElements)
      .map(el => el.textContent.trim())
      .join('\n');
    
    return `${titleText}\n\n${descriptionText}\n\n${specsText}`;
  }
  
  extractTitle() {
    const titleElement = this.document.querySelector('.buysell-details h1');
    return titleElement ? titleElement.textContent.trim() : '';
  }
  
  extractPrice() {
    const priceElement = this.document.querySelector('.buysell-details .price');
    return priceElement ? priceElement.textContent.trim() : '';
  }
  
  extractImages() {
    const imageElements = this.document.querySelectorAll('.buysell-details .gallery img');
    return Array.from(imageElements).map(img => img.src);
  }
  
  isBikeListing() {
    // PinkBike is a cycling-specific site, so almost all listings are bike-related
    return true;
  }
  
  extractAll() {
    return {
      isBikeListing: true,
      url: this.url,
      title: this.extractTitle(),
      price: this.extractPrice(),
      images: this.extractImages(),
      fullText: this.extractTextContent(),
      timestamp: new Date().toISOString(),
      source: 'pinkbike'
    };
  }
}

/**
 * Create the appropriate extractor based on the current URL
 * @param {Document} document - The DOM document
 * @returns {ListingExtractor} The platform-specific extractor
 */
function createExtractor(document) {
  const url = document.location.href;
  
  if (url.includes('craigslist.org')) {
    return new CraigslistExtractor(document);
  } else if (url.includes('facebook.com/marketplace')) {
    return new FacebookMarketplaceExtractor(document);
  } else if (url.includes('ebay.com')) {
    return new EbayExtractor(document);
  } else if (url.includes('pinkbike.com')) {
    return new PinkbikeExtractor(document);
  } else {
    // Generic extractor as fallback
    return new CraigslistExtractor(document);
  }
}

module.exports = {
  createExtractor,
  CraigslistExtractor,
  FacebookMarketplaceExtractor,
  EbayExtractor,
  PinkbikeExtractor
};
