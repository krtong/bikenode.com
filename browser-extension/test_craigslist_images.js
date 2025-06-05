const { Stagehand } = require("@browserbasehq/stagehand");

async function testCraigslistImages() {
  const stagehand = new Stagehand({
    env: "LOCAL",
    verbose: 1,
    debugDom: true
  });

  try {
    await stagehand.init();
    await stagehand.page.goto('https://sfbay.craigslist.org/scz/mcy/d/santa-cruz-2014-bmw-r1200rt-motorcycle/7855748254.html');
    
    console.log('\n=== CRAIGSLIST IMAGE ANALYSIS ===\n');
    
    // Wait for the page to fully load
    await stagehand.page.waitForSelector('.gallery', { timeout: 10000 });
    
    // Get all image URLs on initial load
    const initialImages = await stagehand.page.evaluate(() => {
      const images = [];
      document.querySelectorAll('img').forEach(img => {
        images.push({
          src: img.src,
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
          displayWidth: img.width,
          displayHeight: img.height,
          alt: img.alt,
          class: img.className
        });
      });
      return images;
    });
    
    console.log('Initial images found:');
    initialImages.forEach(img => {
      console.log(`- ${img.src}`);
      console.log(`  Natural size: ${img.naturalWidth}x${img.naturalHeight}`);
      console.log(`  Display size: ${img.displayWidth}x${img.displayHeight}`);
      console.log(`  Class: ${img.class || 'none'}`);
    });
    
    // Monitor network requests for images
    const imageRequests = [];
    stagehand.page.on('response', response => {
      const url = response.url();
      if (url.includes('.jpg') || url.includes('.png') || url.includes('.webp')) {
        imageRequests.push({
          url: url,
          status: response.status(),
          timestamp: new Date().toISOString()
        });
      }
    });
    
    // Click on the second thumbnail
    console.log('\n\nClicking on second thumbnail...');
    const thumbnails = await stagehand.page.$$('.thumb a');
    if (thumbnails.length > 1) {
      await thumbnails[1].click();
      await stagehand.page.waitForTimeout(2000);
      
      // Check what image is displayed now
      const mainImage = await stagehand.page.evaluate(() => {
        const img = document.querySelector('.gallery .slide.first img');
        if (img) {
          return {
            src: img.src,
            naturalWidth: img.naturalWidth,
            naturalHeight: img.naturalHeight,
            displayWidth: img.width,
            displayHeight: img.height
          };
        }
        return null;
      });
      
      if (mainImage) {
        console.log('\nMain image after thumbnail click:');
        console.log(`- ${mainImage.src}`);
        console.log(`  Natural size: ${mainImage.naturalWidth}x${mainImage.naturalHeight}`);
        console.log(`  Display size: ${mainImage.displayWidth}x${mainImage.displayHeight}`);
      }
      
      // Now click on the main image
      console.log('\n\nClicking on the main image...');
      await stagehand.page.click('.gallery .slide.first img');
      await stagehand.page.waitForTimeout(2000);
      
      // Check if a modal or new image opened
      const modalImage = await stagehand.page.evaluate(() => {
        // Check for various possible modal selectors
        const selectors = [
          '.gallery-modal img',
          '.lightbox img',
          '.modal img',
          '#lightbox img',
          '.slide.active img'
        ];
        
        for (const selector of selectors) {
          const img = document.querySelector(selector);
          if (img) {
            return {
              selector: selector,
              src: img.src,
              naturalWidth: img.naturalWidth,
              naturalHeight: img.naturalHeight,
              displayWidth: img.width,
              displayHeight: img.height
            };
          }
        }
        
        // Check if the main image changed
        const mainImg = document.querySelector('.gallery .slide.first img');
        if (mainImg) {
          return {
            selector: '.gallery .slide.first img',
            src: mainImg.src,
            naturalWidth: mainImg.naturalWidth,
            naturalHeight: mainImg.naturalHeight,
            displayWidth: mainImg.width,
            displayHeight: mainImg.height,
            note: 'Main image after click'
          };
        }
        
        return null;
      });
      
      if (modalImage) {
        console.log('\nImage after clicking main image:');
        console.log(`- Selector: ${modalImage.selector}`);
        console.log(`- ${modalImage.src}`);
        console.log(`  Natural size: ${modalImage.naturalWidth}x${modalImage.naturalHeight}`);
        console.log(`  Display size: ${modalImage.displayWidth}x${modalImage.displayHeight}`);
        if (modalImage.note) console.log(`  Note: ${modalImage.note}`);
      }
    }
    
    // Check all network requests for images
    console.log('\n\nAll image requests made:');
    imageRequests.forEach(req => {
      console.log(`- ${req.url} (Status: ${req.status})`);
    });
    
    // Analyze image URL patterns
    console.log('\n\nImage URL patterns:');
    const patterns = new Set();
    imageRequests.forEach(req => {
      const url = req.url;
      if (url.includes('_50x50c.jpg')) patterns.add('50x50 thumbnail');
      else if (url.includes('_600x450.jpg')) patterns.add('600x450 medium');
      else if (url.includes('_1200x900.jpg')) patterns.add('1200x900 large');
      else if (!url.includes('_') && url.endsWith('.jpg')) patterns.add('Original/full size');
    });
    
    console.log('Found patterns:', Array.from(patterns).join(', '));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await stagehand.close();
  }
}

testCraigslistImages();