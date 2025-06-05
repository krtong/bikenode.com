import puppeteer from 'puppeteer';

async function findLargeImages() {
  console.log('=== SEARCHING FOR CRAIGSLIST LARGE IMAGES ===\n');
  
  const browser = await puppeteer.launch({
    headless: false,
    devtools: true
  });

  try {
    const page = await browser.newPage();
    
    // Monitor ALL network requests
    const imageRequests = new Map();
    page.on('request', request => {
      const url = request.url();
      if (url.includes('.jpg') || url.includes('.png') || url.includes('.webp')) {
        console.log('[REQUEST]', url);
      }
    });
    
    page.on('response', response => {
      const url = response.url();
      if (url.includes('.jpg') || url.includes('.png') || url.includes('.webp')) {
        imageRequests.set(url, response.status());
        console.log('[RESPONSE]', response.status(), url);
        
        // Check for large images
        if (url.includes('1200') || url.includes('900') || url.includes('full') || url.includes('large')) {
          console.log('>>> LARGE IMAGE FOUND:', url);
        }
      }
    });
    
    await page.goto('https://sfbay.craigslist.org/scz/mcy/d/santa-cruz-2014-bmw-r1200rt-motorcycle/7855748254.html', {
      waitUntil: 'networkidle2'
    });
    
    console.log('\nPage loaded. Initial image count:', imageRequests.size);
    
    // Monitor DOM for changes
    await page.evaluateOnNewDocument(() => {
      // Override appendChild to catch dynamically added elements
      const originalAppendChild = Element.prototype.appendChild;
      Element.prototype.appendChild = function(child) {
        if (child.tagName === 'IMG' && child.src) {
          console.log('[DOM] New image added:', child.src);
        }
        return originalAppendChild.apply(this, arguments);
      };
      
      // Monitor for modals/overlays
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === 1) { // Element node
              // Check for high z-index or fixed positioning
              const style = window.getComputedStyle(node);
              const zIndex = parseInt(style.zIndex) || 0;
              const position = style.position;
              
              if (zIndex > 100 || position === 'fixed' || position === 'absolute') {
                console.log('[DOM] Potential overlay added:', {
                  tag: node.tagName,
                  class: node.className,
                  id: node.id,
                  zIndex: zIndex,
                  position: position
                });
                
                // Check for images inside
                const images = node.querySelectorAll('img');
                images.forEach(img => {
                  if (img.src) {
                    console.log('[DOM] Image in overlay:', img.src);
                  }
                });
              }
            }
          });
        });
      });
      
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    });
    
    // Wait for gallery to load
    await page.waitForSelector('.gallery .slide img', { timeout: 10000 });
    
    console.log('\n=== CLICKING MAIN IMAGE ===\n');
    
    // Get the main image
    const mainImage = await page.$('.gallery .slide.first img, .gallery .slide.visible img');
    if (!mainImage) {
      console.log('No main image found!');
      return;
    }
    
    // Get image info before click
    const beforeClick = await page.evaluate(() => {
      const img = document.querySelector('.gallery .slide.first img, .gallery .slide.visible img');
      return {
        src: img?.src,
        naturalWidth: img?.naturalWidth,
        naturalHeight: img?.naturalHeight
      };
    });
    
    console.log('Main image before click:', beforeClick);
    
    // Clear previous requests to see new ones
    imageRequests.clear();
    
    // Try different click methods
    console.log('\nTrying regular click...');
    await mainImage.click();
    await page.waitForTimeout(2000);
    
    // Check what changed
    let foundLightbox = await checkForLightbox(page);
    
    if (!foundLightbox) {
      console.log('\nTrying force click...');
      await page.evaluate(() => {
        const img = document.querySelector('.gallery .slide.first img, .gallery .slide.visible img');
        if (img) {
          const event = new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            view: window
          });
          img.dispatchEvent(event);
        }
      });
      await page.waitForTimeout(2000);
      foundLightbox = await checkForLightbox(page);
    }
    
    if (!foundLightbox) {
      console.log('\nTrying to click parent element...');
      await page.evaluate(() => {
        const img = document.querySelector('.gallery .slide.first img, .gallery .slide.visible img');
        if (img && img.parentElement) {
          img.parentElement.click();
        }
      });
      await page.waitForTimeout(2000);
      foundLightbox = await checkForLightbox(page);
    }
    
    // Final check for all images in DOM
    console.log('\n=== FINAL IMAGE INVENTORY ===\n');
    
    const allImages = await page.evaluate(() => {
      const images = [];
      document.querySelectorAll('img').forEach(img => {
        if (img.src && img.src.includes('craigslist')) {
          images.push({
            src: img.src,
            naturalSize: `${img.naturalWidth}x${img.naturalHeight}`,
            displayed: img.offsetWidth > 0 && img.offsetHeight > 0,
            parent: img.parentElement?.className || 'no-class'
          });
        }
      });
      return images;
    });
    
    console.log(`Total images in DOM: ${allImages.length}`);
    
    // Group by size
    const bySize = {};
    allImages.forEach(img => {
      const sizeMatch = img.src.match(/(\d+x\d+)/);
      const size = sizeMatch ? sizeMatch[1] : 'unknown';
      if (!bySize[size]) bySize[size] = [];
      bySize[size].push(img);
    });
    
    console.log('\nImages by size:');
    Object.entries(bySize).forEach(([size, imgs]) => {
      console.log(`${size}: ${imgs.length} images`);
      if (size === '1200x900') {
        imgs.forEach(img => {
          console.log(`  - ${img.src}`);
          console.log(`    Displayed: ${img.displayed}, Parent: ${img.parent}`);
        });
      }
    });
    
    console.log('\nAll network requests:', imageRequests.size);
    
    console.log('\n\nKeeping browser open for manual inspection...');
    console.log('Check the DevTools Network tab and Elements panel');
    console.log('Press Ctrl+C to exit');
    
    await new Promise(() => {}); // Keep open
    
  } catch (error) {
    console.error('Error:', error);
  }
}

async function checkForLightbox(page) {
  const lightboxSelectors = [
    '.lightbox',
    '.modal',
    '.overlay',
    '.popup',
    '.gallery-fullscreen',
    '.image-viewer',
    '[class*="lightbox"]',
    '[class*="modal"]',
    '[class*="overlay"]',
    '[class*="full"]',
    '[role="dialog"]',
    '[aria-modal="true"]',
    'div[style*="z-index: 9"]',
    'div[style*="position: fixed"]'
  ];
  
  for (const selector of lightboxSelectors) {
    try {
      const element = await page.$(selector);
      if (element) {
        const isVisible = await page.evaluate(el => {
          const style = window.getComputedStyle(el);
          return el.offsetWidth > 0 && el.offsetHeight > 0 && style.display !== 'none';
        }, element);
        
        if (isVisible) {
          console.log(`\nFound potential lightbox: ${selector}`);
          
          // Check for images inside
          const images = await page.evaluate(sel => {
            const container = document.querySelector(sel);
            const imgs = container.querySelectorAll('img');
            return Array.from(imgs).map(img => ({
              src: img.src,
              size: `${img.naturalWidth}x${img.naturalHeight}`
            }));
          }, selector);
          
          if (images.length > 0) {
            console.log('Images in lightbox:', images);
            return true;
          }
        }
      }
    } catch (e) {
      // Selector not found
    }
  }
  
  return false;
}

findLargeImages();