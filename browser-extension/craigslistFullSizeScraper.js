/**
 * Craigslist Full-Size Image Scraper
 * Extracts 1200x900 images by clicking and waiting
 */

class CraigslistFullSizeScraper {
  constructor(document) {
    this.document = document;
    this.window = window;
  }

  /**
   * Wait for a specific number of 1200x900 images to load
   */
  waitForLargeImages(expectedCount = 23, timeout = 10000) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const checkInterval = setInterval(() => {
        const largeImages = this.document.querySelectorAll('.slide img[src*="1200x900"]');
        console.log(`Checking for images... found ${largeImages.length}/${expectedCount}`);
        
        if (largeImages.length >= expectedCount) {
          clearInterval(checkInterval);
          resolve(largeImages);
        }
        
        if (Date.now() - startTime > timeout) {
          clearInterval(checkInterval);
          reject(new Error(`Timeout waiting for images. Found ${largeImages.length}/${expectedCount}`));
        }
      }, 100);
    });
  }

  /**
   * Monitor DOM mutations for image src changes
   */
  setupMutationObserver() {
    return new Promise((resolve) => {
      const imageChanges = new Map();
      
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'attributes' && 
              mutation.attributeName === 'src' && 
              mutation.target.tagName === 'IMG') {
            
            const img = mutation.target;
            const oldSrc = mutation.oldValue || '';
            const newSrc = img.src;
            
            // Track 600x450 -> 1200x900 changes
            if (oldSrc.includes('600x450') && newSrc.includes('1200x900')) {
              imageChanges.set(img, newSrc);
              console.log(`Image updated: ${oldSrc} -> ${newSrc}`);
            }
          }
        });
        
        // Check if all slides have been updated
        const totalSlides = this.document.querySelectorAll('.slide').length;
        const updatedSlides = this.document.querySelectorAll('.slide img[src*="1200x900"]').length;
        
        if (updatedSlides === totalSlides) {
          observer.disconnect();
          resolve(imageChanges);
        }
      });
      
      // Observe all slide elements
      const slides = this.document.querySelectorAll('.slide');
      slides.forEach(slide => {
        observer.observe(slide, { 
          attributes: true, 
          attributeOldValue: true, 
          subtree: true 
        });
      });
    });
  }

  /**
   * Extract full-size images from Craigslist
   */
  async extractFullSizeImages() {
    console.log('Starting Craigslist full-size image extraction...');
    
    // Check current state
    const initialLargeImages = this.document.querySelectorAll('.slide img[src*="1200x900"]');
    if (initialLargeImages.length > 0) {
      console.log(`Already have ${initialLargeImages.length} large images loaded`);
      return this.collectAllImages();
    }
    
    // Find elements to click
    const mainImage = this.document.querySelector('.slide.visible img, .slide.first img');
    const forwardArrow = this.document.querySelector('.slider-forward.arrow');
    
    if (!mainImage) {
      console.log('No main image found');
      return [];
    }
    
    try {
      // Set up mutation observer before clicking
      const mutationPromise = this.setupMutationObserver();
      
      // Try arrow navigation first (as in successful test)
      if (forwardArrow) {
        console.log('Clicking forward arrow...');
        forwardArrow.click();
        await this.wait(500);
      }
      
      // Click the main image
      console.log('Clicking main image to trigger full-size loading...');
      mainImage.click();
      
      // Wait for images to load using multiple strategies
      try {
        // Strategy 1: Wait for expected number of images
        await this.waitForLargeImages(23, 5000);
      } catch (e) {
        console.log('Strategy 1 failed:', e.message);
        
        // Strategy 2: Wait for any large images
        try {
          await this.waitForLargeImages(1, 3000);
        } catch (e2) {
          console.log('Strategy 2 failed:', e2.message);
        }
      }
      
      // Collect all images
      return this.collectAllImages();
      
    } catch (error) {
      console.error('Error extracting full-size images:', error);
      return this.collectAllImages(); // Return whatever we have
    }
  }

  /**
   * Collect all images from slides
   */
  collectAllImages() {
    const images = [];
    const slides = this.document.querySelectorAll('.slide img');
    
    slides.forEach(img => {
      if (img.src && img.src.includes('craigslist') && !img.src.includes('50x50')) {
        // Only add 1200x900 images, skip 600x450 thumbnails
        if (img.src.includes('1200x900')) {
          images.push(img.src);
        }
      }
    });
    
    console.log(`Collected ${images.length} full-size images`);
    
    // If no 1200x900 found, warn user
    if (images.length === 0) {
      console.warn('No 1200x900 images found. The page may need manual interaction.');
    }
    
    return images;
  }

  /**
   * Wait helper
   */
  wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export for use in browser extension
if (typeof window !== 'undefined') {
  window.CraigslistFullSizeScraper = CraigslistFullSizeScraper;
}