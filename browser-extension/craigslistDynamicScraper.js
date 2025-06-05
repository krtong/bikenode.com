/**
 * Craigslist-specific dynamic scraper that interacts with the lightbox
 */

class CraigslistDynamicScraper {
  constructor(document) {
    this.document = document;
    this.window = window;
  }

  async extractFullSizeImages() {
    const images = [];
    
    console.log('Craigslist dynamic scraper: Looking for gallery...');
    
    // Check if we have a gallery
    const mainImage = this.document.querySelector('.slide.visible img');
    const thumbnails = this.document.querySelectorAll('#thumbs a');
    
    if (!mainImage || thumbnails.length === 0) {
      console.log('No Craigslist gallery found');
      return images;
    }
    
    console.log(`Found gallery with ${thumbnails.length} images`);
    
    // Click the main image to open the lightbox
    console.log('Clicking main image to open lightbox...');
    mainImage.click();
    
    // Wait for lightbox to open
    await this.waitForLightbox();
    
    // Extract all large images from the lightbox
    const lightboxImages = this.document.querySelectorAll('.gallery img[src*="1200x900"]');
    
    if (lightboxImages.length > 0) {
      console.log(`Found ${lightboxImages.length} full-size images in lightbox`);
      
      lightboxImages.forEach(img => {
        if (img.src && !images.includes(img.src)) {
          images.push(img.src);
        }
      });
    } else {
      // Fallback: Try to find images in the swipe gallery
      console.log('Checking for swipe gallery images...');
      
      const swipeImages = this.document.querySelectorAll('.swipe img');
      swipeImages.forEach(img => {
        if (img.src && img.src.includes('1200x900') && !images.includes(img.src)) {
          images.push(img.src);
        }
      });
    }
    
    // Close the lightbox if it's open
    const closeButton = this.document.querySelector('.gallery .close, .lightbox .close, [aria-label="Close"]');
    if (closeButton) {
      closeButton.click();
    }
    
    console.log(`Extracted ${images.length} full-size images`);
    return images;
  }

  async waitForLightbox(timeout = 5000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      // Check for various lightbox selectors
      const lightbox = this.document.querySelector(
        '.gallery.open, .lightbox, .modal.gallery, .image-viewer, [class*="lightbox"]'
      );
      
      if (lightbox) {
        console.log('Lightbox opened');
        // Give it a moment to load images
        await this.wait(500);
        return true;
      }
      
      // Also check if large images are present
      const largeImages = this.document.querySelectorAll('img[src*="1200x900"]');
      if (largeImages.length > 0) {
        console.log('Large images detected');
        await this.wait(500);
        return true;
      }
      
      await this.wait(100);
    }
    
    console.log('Lightbox did not open within timeout');
    return false;
  }

  wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Integrate with main scraper
if (typeof DynamicScraper !== 'undefined') {
  // Override the extractImages method for Craigslist
  const originalExtractImages = DynamicScraper.prototype.extractImages;
  
  DynamicScraper.prototype.extractImages = async function() {
    // For Craigslist, use the specialized scraper
    if (this.domain.includes('craigslist')) {
      const clScraper = new CraigslistDynamicScraper(this.document);
      const fullSizeImages = await clScraper.extractFullSizeImages();
      
      if (fullSizeImages.length > 0) {
        return fullSizeImages;
      }
    }
    
    // For other sites, use the original method
    return originalExtractImages.call(this);
  };
}

// Export for testing
if (typeof module !== 'undefined') {
  module.exports = { CraigslistDynamicScraper };
}