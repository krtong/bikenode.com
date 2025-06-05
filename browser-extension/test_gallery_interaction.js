import puppeteer from 'puppeteer';

async function testGalleryInteraction() {
  console.log('=== TESTING CRAIGSLIST GALLERY INTERACTION ===\n');
  
  const browser = await puppeteer.launch({
    headless: false,
    devtools: true
  });

  try {
    const page = await browser.newPage();
    
    // Set viewport to ensure consistent behavior
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Track all image loads
    const loadedImages = new Set();
    page.on('response', response => {
      const url = response.url();
      if (url.includes('.jpg') && response.status() === 200) {
        loadedImages.add(url);
        if (url.includes('1200') || url.includes('900')) {
          console.log('🎯 LARGE IMAGE LOADED:', url);
        }
      }
    });
    
    await page.goto('https://sfbay.craigslist.org/scz/mcy/d/santa-cruz-2014-bmw-r1200rt-motorcycle/7855748254.html', {
      waitUntil: 'networkidle2'
    });
    
    console.log('Page loaded. Analyzing gallery structure...\n');
    
    // Analyze the gallery
    const galleryInfo = await page.evaluate(() => {
      const gallery = document.querySelector('.gallery');
      const slides = document.querySelectorAll('.slide');
      const thumbs = document.querySelectorAll('#thumbs a');
      const mainImage = document.querySelector('.slide.first img, .slide.visible img');
      
      // Look for any onclick handlers
      const clickHandlers = [];
      if (mainImage) {
        const onclick = mainImage.getAttribute('onclick');
        const parent = mainImage.parentElement;
        const parentOnclick = parent ? parent.getAttribute('onclick') : null;
        
        clickHandlers.push({
          element: 'img',
          onclick: onclick,
          parentOnclick: parentOnclick,
          parentTag: parent ? parent.tagName : null,
          parentClass: parent ? parent.className : null
        });
      }
      
      // Check for event listeners
      const hasListeners = mainImage ? mainImage.onclick !== null : false;
      
      return {
        hasGallery: gallery !== null,
        slideCount: slides.length,
        thumbCount: thumbs.length,
        mainImageSrc: mainImage ? mainImage.src : null,
        clickHandlers: clickHandlers,
        hasListeners: hasListeners
      };
    });
    
    console.log('Gallery info:', JSON.stringify(galleryInfo, null, 2));
    
    // Try to find the gallery's JavaScript
    const scripts = await page.evaluate(() => {
      const scriptContents = [];
      document.querySelectorAll('script').forEach(script => {
        const content = script.textContent;
        if (content.includes('gallery') || content.includes('slide') || content.includes('image')) {
          scriptContents.push(content.substring(0, 200) + '...');
        }
      });
      return scriptContents;
    });
    
    console.log('\nScripts mentioning gallery/slide/image:', scripts.length);
    
    // Click on different parts of the gallery
    console.log('\n=== TESTING CLICKS ===\n');
    
    // 1. Click on the image itself
    console.log('1. Clicking on the main image...');
    const beforeClick = loadedImages.size;
    
    await page.click('.slide.first img, .slide.visible img');
    await page.waitForTimeout(2000);
    
    const afterImageClick = loadedImages.size;
    console.log(`   Images before: ${beforeClick}, after: ${afterImageClick}`);
    
    // Check if anything opened
    const overlayCheck1 = await checkForOverlay(page);
    console.log(`   Overlay found: ${overlayCheck1.found}`);
    if (overlayCheck1.found) {
      console.log(`   Overlay details:`, overlayCheck1.details);
    }
    
    // 2. Click on the slide container
    console.log('\n2. Clicking on the slide container...');
    const beforeSlideClick = loadedImages.size;
    
    await page.evaluate(() => {
      const slide = document.querySelector('.slide.first, .slide.visible');
      if (slide) slide.click();
    });
    await page.waitForTimeout(2000);
    
    const afterSlideClick = loadedImages.size;
    console.log(`   Images before: ${beforeSlideClick}, after: ${afterSlideClick}`);
    
    // 3. Try double-click
    console.log('\n3. Double-clicking on the main image...');
    const beforeDblClick = loadedImages.size;
    
    const mainImg = await page.$('.slide.first img, .slide.visible img');
    if (mainImg) {
      await mainImg.click({ clickCount: 2 });
      await page.waitForTimeout(2000);
    }
    
    const afterDblClick = loadedImages.size;
    console.log(`   Images before: ${beforeDblClick}, after: ${afterDblClick}`);
    
    // 4. Check keyboard navigation
    console.log('\n4. Testing keyboard navigation...');
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(1000);
    
    const currentImage = await page.evaluate(() => {
      const img = document.querySelector('.slide.visible img');
      return img ? img.src : null;
    });
    console.log(`   Current image after arrow key: ${currentImage}`);
    
    // Final analysis
    console.log('\n=== FINAL ANALYSIS ===\n');
    console.log(`Total unique images loaded: ${loadedImages.size}`);
    
    const imagesBySize = {};
    loadedImages.forEach(url => {
      const sizeMatch = url.match(/(\d+x\d+)/);
      const size = sizeMatch ? sizeMatch[1] : 'unknown';
      if (!imagesBySize[size]) imagesBySize[size] = 0;
      imagesBySize[size]++;
    });
    
    console.log('\nImages by size:');
    Object.entries(imagesBySize).forEach(([size, count]) => {
      console.log(`  ${size}: ${count} images`);
    });
    
    // Check all current images in DOM
    const allDomImages = await page.evaluate(() => {
      const images = [];
      document.querySelectorAll('img').forEach(img => {
        if (img.src.includes('craigslist')) {
          const sizeMatch = img.src.match(/(\d+x\d+)/);
          images.push({
            src: img.src,
            size: sizeMatch ? sizeMatch[1] : 'unknown',
            visible: img.offsetWidth > 0 && img.offsetHeight > 0
          });
        }
      });
      return images;
    });
    
    const visibleLargeImages = allDomImages.filter(img => 
      img.visible && (img.size === '1200x900' || img.size.includes('1200'))
    );
    
    console.log(`\nVisible large images in DOM: ${visibleLargeImages.length}`);
    visibleLargeImages.forEach(img => {
      console.log(`  - ${img.src}`);
    });
    
    console.log('\n\nKeeping browser open for manual testing...');
    console.log('Try clicking on images manually and watch the DevTools');
    console.log('Press Ctrl+C to exit');
    
    await new Promise(() => {});
    
  } catch (error) {
    console.error('Error:', error);
  }
}

async function checkForOverlay(page) {
  return await page.evaluate(() => {
    // Look for any element that might be an overlay
    const possibleOverlays = document.querySelectorAll([
      '[class*="lightbox"]',
      '[class*="modal"]',
      '[class*="overlay"]',
      '[class*="viewer"]',
      '[class*="full"]',
      '[style*="z-index: 9"]',
      '[style*="position: fixed"]',
      '[style*="position: absolute"]'
    ].join(','));
    
    for (const element of possibleOverlays) {
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      
      // Check if it's actually visible and large
      if (rect.width > 100 && rect.height > 100 && 
          style.display !== 'none' && 
          style.visibility !== 'hidden') {
        
        // Look for images inside
        const images = element.querySelectorAll('img');
        const imageInfo = Array.from(images).map(img => ({
          src: img.src,
          size: `${img.naturalWidth}x${img.naturalHeight}`
        }));
        
        return {
          found: true,
          details: {
            selector: element.className || element.id || 'unknown',
            zIndex: style.zIndex,
            position: style.position,
            size: `${rect.width}x${rect.height}`,
            images: imageInfo
          }
        };
      }
    }
    
    return { found: false };
  });
}

testGalleryInteraction();