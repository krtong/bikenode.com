import { test, expect } from '@playwright/test';
import { chromium } from 'playwright';

test.describe('Craigslist Gallery Detection', () => {
  test('Find Craigslist image gallery implementation', async () => {
    const browser = await chromium.launch({ 
      headless: false,
      devtools: true 
    });
    
    const context = await browser.newContext();
    const page = await context.newPage();

    // Track image loads via Performance API
    await page.evaluateOnNewDocument(() => {
      window.imageLoads = [];
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name.includes('.jpg') || entry.name.includes('.jpeg') || entry.name.includes('.png')) {
            window.imageLoads.push({
              url: entry.name,
              size: entry.transferSize,
              duration: entry.duration
            });
            console.log('Performance API - Image loaded:', entry.name, 'Size:', entry.transferSize);
          }
        }
      });
      observer.observe({ entryTypes: ['resource'] });
    });

    const testUrl = 'https://sfbay.craigslist.org/eby/mcy/d/hayward-2020-harley-davidson-road-glide/7806008826.html';
    await page.goto(testUrl);
    await page.waitForLoadState('networkidle');

    // Check for Craigslist's specific gallery implementation
    const galleryInfo = await page.evaluate(() => {
      // Look for Craigslist's gallery container
      const possibleGallerySelectors = [
        '.gallery',
        '.swipe',
        '.swipe-wrapper',
        '.slide',
        '.slides',
        '.thumbs',
        '.thumb',
        '[class*="gallery"]',
        '[class*="swipe"]',
        '[class*="slide"]',
        '[id*="gallery"]',
        '[id*="swipe"]'
      ];

      const galleries = {};
      possibleGallerySelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          galleries[selector] = Array.from(elements).map(el => ({
            className: el.className,
            id: el.id,
            childrenCount: el.children.length,
            hasImages: el.querySelectorAll('img').length,
            innerHTML: el.innerHTML.substring(0, 100)
          }));
        }
      });

      // Check for any data attributes that might indicate gallery functionality
      const elementsWithDataAttrs = Array.from(document.querySelectorAll('[data-imgid], [data-index], [data-slide]'));
      
      // Look for event listeners
      const clickableElements = Array.from(document.querySelectorAll('*')).filter(el => {
        const listeners = getEventListeners ? getEventListeners(el) : {};
        return listeners.click && listeners.click.length > 0;
      });

      return {
        galleries,
        dataElements: elementsWithDataAttrs.map(el => ({
          tagName: el.tagName,
          dataAttributes: Object.entries(el.dataset)
        })),
        clickableCount: clickableElements.length
      };
    });

    console.log('Gallery analysis:', JSON.stringify(galleryInfo, null, 2));

    // Try clicking on the main image area
    const mainImageArea = await page.$('.swipe, .slide, .iw');
    if (mainImageArea) {
      console.log('\n=== Clicking main image area ===');
      
      // Monitor for any iframe creation
      page.on('frameattached', frame => {
        console.log('New frame attached:', frame.url());
      });

      // Set up promise to wait for any navigation or popup
      const navigationPromise = page.waitForNavigation({ 
        waitUntil: 'networkidle',
        timeout: 5000 
      }).catch(() => null);

      const popupPromise = page.waitForEvent('popup', { timeout: 5000 }).catch(() => null);

      // Click and wait
      await mainImageArea.click();
      
      // Check if new page or popup opened
      const [navigation, popup] = await Promise.all([navigationPromise, popupPromise]);
      
      if (popup) {
        console.log('Popup opened!');
        await popup.waitForLoadState();
        const popupUrl = popup.url();
        console.log('Popup URL:', popupUrl);
        
        // Check popup content
        const popupImages = await popup.$$eval('img', imgs => 
          imgs.map(img => ({
            src: img.src,
            width: img.naturalWidth,
            height: img.naturalHeight
          }))
        );
        console.log('Images in popup:', popupImages);
      }

      if (navigation) {
        console.log('Navigation occurred to:', page.url());
      }

      // Wait and check for any overlay
      await page.waitForTimeout(3000);

      // Check if body has any new classes (common for lightbox implementations)
      const bodyClasses = await page.evaluate(() => document.body.className);
      console.log('Body classes after click:', bodyClasses);

      // Look for common fullscreen/lightbox implementations
      const fullscreenCheck = await page.evaluate(() => {
        // Check if any element is in fullscreen
        const fullscreenElement = document.fullscreenElement || 
                                 document.webkitFullscreenElement || 
                                 document.mozFullScreenElement;
        
        // Check for elements that cover the viewport
        const coveringElements = Array.from(document.querySelectorAll('*')).filter(el => {
          const rect = el.getBoundingClientRect();
          const style = window.getComputedStyle(el);
          return rect.width >= window.innerWidth * 0.9 &&
                 rect.height >= window.innerHeight * 0.9 &&
                 (style.position === 'fixed' || style.position === 'absolute') &&
                 style.zIndex && parseInt(style.zIndex) > 1;
        });

        return {
          hasFullscreen: !!fullscreenElement,
          coveringElements: coveringElements.map(el => ({
            tagName: el.tagName,
            id: el.id,
            className: el.className,
            zIndex: window.getComputedStyle(el).zIndex
          }))
        };
      });

      console.log('Fullscreen check:', fullscreenCheck);
    }

    // Get all loaded images from Performance API
    const loadedImages = await page.evaluate(() => window.imageLoads);
    console.log('\n=== All images loaded (via Performance API) ===');
    loadedImages.forEach(img => {
      console.log(`${img.url} (${img.size} bytes)`);
      if (img.url.includes('1200') || img.url.includes('900')) {
        console.log('*** LARGE IMAGE FOUND ***');
      }
    });

    // Try programmatic inspection of image elements
    const imageAnalysis = await page.evaluate(() => {
      const images = Array.from(document.querySelectorAll('img'));
      return images.map(img => {
        // Get all event listeners if possible
        let hasClickHandler = false;
        try {
          // Check for onclick attribute
          hasClickHandler = !!img.onclick;
          
          // Check parent for click handler
          let parent = img.parentElement;
          while (parent && !hasClickHandler) {
            hasClickHandler = !!parent.onclick;
            parent = parent.parentElement;
          }
        } catch (e) {}

        // Check computed styles
        const style = window.getComputedStyle(img);
        const parentStyle = img.parentElement ? window.getComputedStyle(img.parentElement) : null;

        return {
          src: img.src,
          naturalSize: `${img.naturalWidth}x${img.naturalHeight}`,
          displaySize: `${img.width}x${img.height}`,
          cursor: style.cursor,
          parentCursor: parentStyle?.cursor,
          hasClickHandler,
          dataAttributes: Object.entries(img.dataset),
          srcset: img.srcset,
          sizes: img.sizes
        };
      });
    });

    console.log('\n=== Detailed image analysis ===');
    imageAnalysis.forEach((img, i) => {
      console.log(`Image ${i + 1}:`, img);
    });

    // Keep open for manual testing
    console.log('\n=== Keeping browser open ===');
    console.log('Try clicking on images manually and watch the console/network tab');
    await page.waitForTimeout(60000);

    await browser.close();
  });
});