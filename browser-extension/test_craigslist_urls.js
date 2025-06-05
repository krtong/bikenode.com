import { test, expect } from '@playwright/test';
import { chromium } from 'playwright';

test.describe('Craigslist Image URL Analysis', () => {
  test('Extract and analyze all image URLs', async () => {
    const browser = await chromium.launch({ 
      headless: false,
      devtools: true 
    });
    
    const page = await browser.newPage();

    // Intercept all requests
    const allRequests = [];
    await page.route('**/*', (route, request) => {
      const url = request.url();
      allRequests.push({
        url,
        method: request.method(),
        resourceType: request.resourceType()
      });
      route.continue();
    });

    const testUrl = 'https://sfbay.craigslist.org/eby/mcy/d/hayward-2020-harley-davidson-road-glide/7806008826.html';
    await page.goto(testUrl);
    await page.waitForLoadState('networkidle');

    // Extract all image URLs from the page
    const pageData = await page.evaluate(() => {
      // Get all img elements
      const imgElements = Array.from(document.querySelectorAll('img')).map(img => ({
        src: img.src,
        srcset: img.srcset,
        dataSrc: img.dataset.src,
        dataAttributes: Object.entries(img.dataset)
      }));

      // Get all elements with background images
      const bgImages = [];
      document.querySelectorAll('*').forEach(el => {
        const bg = window.getComputedStyle(el).backgroundImage;
        if (bg && bg !== 'none') {
          const urls = bg.match(/url\(['"]?([^'")]+)['"]?\)/g);
          if (urls) {
            bgImages.push({
              element: el.tagName + (el.className ? '.' + el.className : ''),
              urls: urls.map(u => u.replace(/url\(['"]?|['"]?\)/g, ''))
            });
          }
        }
      });

      // Look for any JavaScript that might contain image URLs
      const scripts = Array.from(document.querySelectorAll('script')).map(script => script.innerHTML);
      const imageUrlsInScripts = [];
      scripts.forEach(script => {
        const matches = script.match(/https?:\/\/[^\s"']+\.(jpg|jpeg|png)/gi);
        if (matches) {
          imageUrlsInScripts.push(...matches);
        }
      });

      // Check for data attributes that might contain image info
      const elementsWithData = Array.from(document.querySelectorAll('[data-*]')).map(el => {
        const data = {};
        for (let attr in el.dataset) {
          if (el.dataset[attr].includes('jpg') || el.dataset[attr].includes('jpeg') || 
              el.dataset[attr].includes('png') || el.dataset[attr].includes('image')) {
            data[attr] = el.dataset[attr];
          }
        }
        return Object.keys(data).length > 0 ? data : null;
      }).filter(Boolean);

      // Look for links that might open images
      const imageLinks = Array.from(document.querySelectorAll('a')).filter(a => {
        const href = a.href;
        return href && (href.includes('.jpg') || href.includes('.jpeg') || href.includes('.png'));
      }).map(a => a.href);

      return {
        imgElements,
        bgImages,
        imageUrlsInScripts: [...new Set(imageUrlsInScripts)],
        elementsWithData,
        imageLinks
      };
    });

    console.log('=== Image Analysis Results ===\n');
    
    console.log('IMG elements found:', pageData.imgElements.length);
    pageData.imgElements.forEach((img, i) => {
      console.log(`\nImage ${i + 1}:`);
      console.log('  src:', img.src);
      if (img.srcset) console.log('  srcset:', img.srcset);
      if (img.dataSrc) console.log('  data-src:', img.dataSrc);
      if (img.dataAttributes.length > 0) console.log('  data attributes:', img.dataAttributes);
      
      // Analyze URL for size indicators
      const url = img.src;
      if (url.includes('600x450')) {
        console.log('  → This is a 600x450 thumbnail');
        // Try to construct potential larger URL
        const largeUrl = url.replace('600x450', '1200x900');
        console.log('  → Potential large URL:', largeUrl);
      }
    });

    console.log('\n\nBackground images:', pageData.bgImages.length);
    pageData.bgImages.forEach(bg => {
      console.log(`${bg.element}:`, bg.urls);
    });

    console.log('\n\nImage URLs found in scripts:', pageData.imageUrlsInScripts.length);
    pageData.imageUrlsInScripts.forEach(url => {
      console.log(' -', url);
      if (url.includes('1200') || url.includes('900')) {
        console.log('   *** LARGE IMAGE URL IN SCRIPT ***');
      }
    });

    console.log('\n\nImage links:', pageData.imageLinks.length);
    pageData.imageLinks.forEach(link => console.log(' -', link));

    // Now try to load the larger versions directly
    console.log('\n\n=== Testing direct access to larger images ===');
    const thumbnailUrls = pageData.imgElements.filter(img => img.src.includes('600x450')).map(img => img.src);
    
    for (const thumbUrl of thumbnailUrls) {
      const largeUrl = thumbUrl.replace('600x450', '1200x900');
      console.log(`\nTrying to load: ${largeUrl}`);
      
      try {
        const response = await page.goto(largeUrl, { waitUntil: 'load', timeout: 5000 });
        if (response && response.ok()) {
          console.log('✓ Successfully loaded 1200x900 version!');
          console.log('  Status:', response.status());
          console.log('  Content-Type:', response.headers()['content-type']);
          
          // Go back to the listing
          await page.goBack();
          await page.waitForLoadState('networkidle');
        } else {
          console.log('✗ Failed to load:', response?.status());
        }
      } catch (e) {
        console.log('✗ Error loading:', e.message);
      }
    }

    // Try clicking and monitoring network
    console.log('\n\n=== Clicking image and monitoring network ===');
    const mainImage = await page.$('.swipe img, .slide img, img[src*="600x450"]');
    if (mainImage) {
      // Clear requests
      allRequests.length = 0;
      
      // Click
      await mainImage.click();
      await page.waitForTimeout(3000);
      
      // Check for new image requests
      const newImageRequests = allRequests.filter(req => 
        req.url.includes('.jpg') || req.url.includes('.jpeg') || req.url.includes('.png')
      );
      
      console.log('New image requests after click:', newImageRequests.length);
      newImageRequests.forEach(req => {
        console.log(` - ${req.method} ${req.url}`);
        if (req.url.includes('1200') || req.url.includes('900')) {
          console.log('   *** LARGE IMAGE REQUEST ***');
        }
      });
    }

    // Final check: See if we can find the pattern
    console.log('\n\n=== URL Pattern Analysis ===');
    const allImageUrls = allRequests.filter(req => 
      req.url.includes('images.craigslist.org')
    ).map(req => req.url);
    
    const uniqueUrls = [...new Set(allImageUrls)];
    console.log('All unique Craigslist image URLs:', uniqueUrls.length);
    uniqueUrls.forEach(url => {
      console.log(url);
      // Extract size from URL
      const sizeMatch = url.match(/(\d+)x(\d+)/);
      if (sizeMatch) {
        console.log(`  → Size: ${sizeMatch[1]}x${sizeMatch[2]}`);
      }
    });

    console.log('\n=== Keeping browser open for manual inspection ===');
    await page.waitForTimeout(30000);

    await browser.close();
  });
});