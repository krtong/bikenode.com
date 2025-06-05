import { test, expect } from '@playwright/test';
import { chromium } from 'playwright';

test.describe('Advanced Craigslist Image Detection', () => {
  test('Monitor all DOM and network activity for larger images', async () => {
    const browser = await chromium.launch({ 
      headless: false,
      devtools: true,
      args: ['--enable-logging', '--v=1']
    });
    
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 }
    });
    
    const page = await context.newPage();

    // Enable console logging
    page.on('console', msg => {
      if (msg.type() === 'log') {
        console.log('Browser console:', msg.text());
      }
    });

    // Track ALL responses
    const responses = [];
    page.on('response', response => {
      const url = response.url();
      responses.push({
        url,
        status: response.status(),
        contentType: response.headers()['content-type']
      });
      
      // Log any image responses
      if (url.includes('.jpg') || url.includes('.jpeg') || url.includes('.png') || 
          response.headers()['content-type']?.includes('image')) {
        console.log(`IMAGE RESPONSE: ${url} (${response.status()})`);
        
        // Check for size indicators in URL
        if (url.includes('1200') || url.includes('900') || url.includes('full') || url.includes('large')) {
          console.log('*** LARGE IMAGE DETECTED IN URL ***');
        }
      }
    });

    // Intercept and log all requests
    await page.route('**/*', route => {
      const request = route.request();
      if (request.url().includes('images.craigslist.org')) {
        console.log('Craigslist image request:', request.url());
      }
      route.continue();
    });

    // Add comprehensive DOM monitoring
    await page.evaluateOnNewDocument(() => {
      // Override appendChild to catch dynamic elements
      const originalAppendChild = Element.prototype.appendChild;
      Element.prototype.appendChild = function(child) {
        if (child.tagName === 'IMG') {
          console.log('New IMG element added:', child.src);
        }
        if (child.tagName === 'DIV' && child.querySelector && child.querySelector('img')) {
          console.log('New DIV with image added');
        }
        return originalAppendChild.call(this, child);
      };

      // Monitor style changes
      const originalSetAttribute = Element.prototype.setAttribute;
      Element.prototype.setAttribute = function(name, value) {
        if (name === 'src' && this.tagName === 'IMG') {
          console.log('Image src changed to:', value);
        }
        return originalSetAttribute.call(this, name, value);
      };

      // Monitor for any click handlers on images
      document.addEventListener('click', (e) => {
        if (e.target.tagName === 'IMG') {
          console.log('Image clicked:', e.target.src);
          console.log('Image dimensions:', e.target.naturalWidth, 'x', e.target.naturalHeight);
        }
      }, true);
    });

    // Navigate to test URL
    const testUrl = 'https://sfbay.craigslist.org/eby/mcy/d/hayward-2020-harley-davidson-road-glide/7806008826.html';
    await page.goto(testUrl, { waitUntil: 'domcontentloaded' });

    // Wait for images to load
    await page.waitForLoadState('networkidle');

    // Find all clickable images
    const clickableImages = await page.evaluate(() => {
      const images = Array.from(document.querySelectorAll('img'));
      return images.filter(img => {
        const style = window.getComputedStyle(img);
        const parent = img.parentElement;
        const parentStyle = parent ? window.getComputedStyle(parent) : null;
        
        // Check if image or parent has click indicators
        const clickable = style.cursor === 'pointer' || 
                         (parentStyle && parentStyle.cursor === 'pointer') ||
                         img.onclick !== null ||
                         (parent && parent.onclick !== null);
        
        return clickable;
      }).map(img => ({
        src: img.src,
        selector: img.className ? `.${img.className}` : 'img',
        index: Array.from(document.querySelectorAll('img')).indexOf(img)
      }));
    });

    console.log('Found clickable images:', clickableImages.length);

    // Try clicking each clickable image
    for (let i = 0; i < clickableImages.length && i < 3; i++) {
      const imgInfo = clickableImages[i];
      console.log(`\n=== Clicking image ${i + 1}: ${imgInfo.src} ===`);
      
      // Clear responses before click
      responses.length = 0;
      
      // Click the image
      const img = await page.locator(`img`).nth(imgInfo.index);
      await img.click();
      
      // Wait for potential lightbox
      await page.waitForTimeout(2000);
      
      // Check what changed
      const changes = await page.evaluate(() => {
        // Find any new elements with high z-index
        const highZIndexElements = Array.from(document.querySelectorAll('*')).filter(el => {
          const zIndex = window.getComputedStyle(el).zIndex;
          return zIndex && parseInt(zIndex) > 100;
        });
        
        // Find any elements with position fixed
        const fixedElements = Array.from(document.querySelectorAll('*')).filter(el => {
          return window.getComputedStyle(el).position === 'fixed';
        });
        
        // Find all current images
        const allImages = Array.from(document.querySelectorAll('img')).map(img => ({
          src: img.src,
          width: img.naturalWidth,
          height: img.naturalHeight,
          displayed: img.offsetParent !== null
        }));
        
        return {
          highZIndexCount: highZIndexElements.length,
          fixedElementsCount: fixedElements.length,
          totalImages: allImages.length,
          largeImages: allImages.filter(img => img.width > 800 || img.height > 600),
          displayedImages: allImages.filter(img => img.displayed)
        };
      });
      
      console.log('DOM changes after click:', changes);
      
      // Log new responses
      const newImageResponses = responses.filter(r => 
        r.url.includes('.jpg') || r.url.includes('.jpeg') || r.url.includes('.png')
      );
      console.log('New image requests after click:', newImageResponses.length);
      newImageResponses.forEach(r => console.log(' -', r.url));
      
      // Try to close any lightbox
      await page.keyboard.press('Escape');
      await page.waitForTimeout(1000);
    }

    // Final check: Look for any hidden images in the page
    const allImageData = await page.evaluate(() => {
      const images = Array.from(document.querySelectorAll('img'));
      const imageData = images.map(img => {
        const rect = img.getBoundingClientRect();
        return {
          src: img.src,
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
          displayWidth: rect.width,
          displayHeight: rect.height,
          visible: rect.width > 0 && rect.height > 0,
          inViewport: rect.top < window.innerHeight && rect.bottom > 0,
          dataAttributes: Object.keys(img.dataset)
        };
      });
      
      // Also check for background images
      const elementsWithBgImages = Array.from(document.querySelectorAll('*')).filter(el => {
        const bg = window.getComputedStyle(el).backgroundImage;
        return bg && bg !== 'none';
      }).map(el => ({
        tagName: el.tagName,
        className: el.className,
        backgroundImage: window.getComputedStyle(el).backgroundImage
      }));
      
      return { images: imageData, backgroundImages: elementsWithBgImages };
    });

    console.log('\n=== Final Image Analysis ===');
    console.log('Total images found:', allImageData.images.length);
    
    const largeImages = allImageData.images.filter(img => 
      img.naturalWidth >= 1200 || img.naturalHeight >= 900
    );
    console.log('Images 1200x900 or larger:', largeImages.length);
    largeImages.forEach(img => {
      console.log(`Large image: ${img.src} (${img.naturalWidth}x${img.naturalHeight})`);
    });

    console.log('\nElements with background images:', allImageData.backgroundImages.length);

    // Keep browser open for inspection
    console.log('\n=== Browser staying open for 30 seconds ===');
    console.log('Please manually click on images and check DevTools');
    await page.waitForTimeout(30000);

    await browser.close();
  });
});