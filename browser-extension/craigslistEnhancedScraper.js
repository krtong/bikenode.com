/**
 * Enhanced Craigslist-specific scraper that loads full-size images
 */

async function extractCraigslistImages(document) {
  const images = [];
  
  console.log('Craigslist: Attempting to load full-size images...');
  
  // Check if we have a gallery
  const mainImage = document.querySelector('.slide.visible img, .slide.first img');
  const slides = document.querySelectorAll('.slide');
  
  if (!mainImage || slides.length === 0) {
    console.log('No Craigslist gallery found');
    return images;
  }
  
  console.log(`Found gallery with ${slides.length} slides`);
  
  try {
    // Store initial image count
    const initialImageCount = document.querySelectorAll('.slide img').length;
    
    // Click on the main image to trigger loading
    console.log('Clicking main image...');
    
    // Try multiple click methods
    // Method 1: Direct click
    mainImage.click();
    
    // Method 2: Dispatch click event
    const clickEvent = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      view: window
    });
    mainImage.dispatchEvent(clickEvent);
    
    // Wait for images to load
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check if new images loaded
    const afterClickCount = document.querySelectorAll('.slide img').length;
    console.log(`Images before click: ${initialImageCount}, after: ${afterClickCount}`);
    
    // Collect all large images
    const largeImages = document.querySelectorAll('.slide img[src*="1200x900"]');
    console.log(`Found ${largeImages.length} full-size (1200x900) images`);
    
    if (largeImages.length > 0) {
      // We got the full-size images!
      largeImages.forEach(img => {
        if (img.src && !images.includes(img.src)) {
          images.push(img.src);
        }
      });
    } else {
      // Check if images were replaced in-place
      const allSlideImages = document.querySelectorAll('.slide img');
      allSlideImages.forEach(img => {
        if (img.src && img.src.includes('1200x900') && !images.includes(img.src)) {
          images.push(img.src);
        }
      });
      
      // If still no 1200x900 images, try URL modification as last resort
      if (images.length === 0) {
        console.log('No 1200x900 images found after click, checking for 600x450...');
        const mediumImages = document.querySelectorAll('.slide img[src*="600x450"]');
        
        if (mediumImages.length > 0) {
          console.log(`Found ${mediumImages.length} medium (600x450) images`);
          console.log('Note: Full-size images may require manual interaction in a real browser');
          
          mediumImages.forEach(img => {
            if (img.src && !images.includes(img.src)) {
              images.push(img.src);
            }
          });
        }
      }
    }
    
  } catch (e) {
    console.log('Error in Craigslist image extraction:', e);
    // Fallback: collect whatever images are available
    const allImages = document.querySelectorAll('.slide img');
    allImages.forEach(img => {
      if (img.src && !img.src.includes('50x50') && !images.includes(img.src)) {
        images.push(img.src);
      }
    });
  }
  
  console.log(`Total Craigslist images extracted: ${images.length}`);
  return images;
}

// Export for use in dynamicScraper.js
if (typeof window !== 'undefined') {
  window.extractCraigslistImages = extractCraigslistImages;
}