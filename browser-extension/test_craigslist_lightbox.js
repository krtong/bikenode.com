import { test, expect } from '@playwright/test';
import { chromium } from 'playwright';

test.describe('Craigslist Lightbox Image Detection', () => {
  test('Find larger images in Craigslist lightbox', async () => {
    const browser = await chromium.launch({ 
      headless: false,
      devtools: true 
    });
    const context = await browser.newContext();
    const page = await context.newPage();

    // Track all network requests for images
    const imageRequests = [];
    page.on('request', request => {
      const url = request.url();
      if (request.resourceType() === 'image' || url.includes('.jpg') || url.includes('.jpeg') || url.includes('.png')) {
        console.log('Image request:', url);
        imageRequests.push({
          url,
          method: request.method(),
          resourceType: request.resourceType()
        });
      }
    });

    // Monitor DOM mutations to catch dynamically added elements
    await page.evaluateOnNewDocument(() => {
      window.domMutations = [];
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'childList') {
            mutation.addedNodes.forEach((node) => {
              if (node.nodeType === 1) { // Element node
                const info = {
                  tagName: node.tagName,
                  id: node.id,
                  className: node.className,
                  innerHTML: node.innerHTML?.substring(0, 200)
                };
                
                // Check for common lightbox/modal indicators
                if (node.tagName === 'DIV' && 
                    (node.className?.includes('lightbox') ||
                     node.className?.includes('modal') ||
                     node.className?.includes('overlay') ||
                     node.className?.includes('gallery') ||
                     node.className?.includes('zoom') ||
                     node.className?.includes('full') ||
                     node.id?.includes('lightbox') ||
                     node.id?.includes('modal'))) {
                  console.log('Potential lightbox element added:', info);
                  window.domMutations.push(info);
                }
                
                // Check for img tags within added nodes
                const images = node.querySelectorAll ? node.querySelectorAll('img') : [];
                images.forEach(img => {
                  if (img.src) {
                    console.log('New image found:', img.src, 'Dimensions:', img.naturalWidth, 'x', img.naturalHeight);
                  }
                });
              }
            });
          }
        });
      });
      observer.observe(document.body, { 
        childList: true, 
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class']
      });
    });

    // Navigate to a Craigslist listing with images
    const testUrl = 'https://sfbay.craigslist.org/eby/mcy/d/hayward-2020-harley-davidson-road-glide/7806008826.html';
    console.log('Navigating to:', testUrl);
    await page.goto(testUrl, { waitUntil: 'networkidle' });

    // Wait for main image to load
    await page.waitForSelector('.swipe img, .slide img, .thumb img, img[data-imgid], .iw img', { timeout: 10000 });

    // Get initial state of all images
    const initialImages = await page.evaluate(() => {
      const images = Array.from(document.querySelectorAll('img'));
      return images.map(img => ({
        src: img.src,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        className: img.className,
        id: img.id,
        parentClassName: img.parentElement?.className
      }));
    });
    console.log('Initial images found:', initialImages.length);
    initialImages.forEach(img => {
      console.log(`Image: ${img.src} (${img.naturalWidth}x${img.naturalHeight})`);
    });

    // Try multiple selectors for the main image
    const mainImageSelectors = [
      '.swipe img',
      '.slide img:first-child',
      '.thumb img:first-child',
      'img[data-imgid="1"]',
      '.iw img:first-child',
      '.gallery img:first-child',
      'img[src*="600x450"]',
      'img[src*="images.craigslist.org"]'
    ];

    let mainImage = null;
    for (const selector of mainImageSelectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          mainImage = element;
          console.log('Found main image with selector:', selector);
          break;
        }
      } catch (e) {
        // Continue trying other selectors
      }
    }

    if (!mainImage) {
      throw new Error('Could not find main image');
    }

    // Get main image details
    const mainImageInfo = await mainImage.evaluate(el => ({
      src: el.src,
      naturalWidth: el.naturalWidth,
      naturalHeight: el.naturalHeight,
      clickable: window.getComputedStyle(el).cursor === 'pointer'
    }));
    console.log('Main image info:', mainImageInfo);

    // Clear previous requests to track new ones after click
    imageRequests.length = 0;

    // Try different click methods
    console.log('\n=== Attempting regular click ===');
    await mainImage.click();
    await page.waitForTimeout(3000); // Wait for any animations

    // Check for new elements
    let lightboxFound = await checkForLightbox(page);
    
    if (!lightboxFound) {
      console.log('\n=== Attempting force click ===');
      await mainImage.click({ force: true });
      await page.waitForTimeout(3000);
      lightboxFound = await checkForLightbox(page);
    }

    if (!lightboxFound) {
      console.log('\n=== Attempting double click ===');
      await mainImage.dblclick();
      await page.waitForTimeout(3000);
      lightboxFound = await checkForLightbox(page);
    }

    if (!lightboxFound) {
      console.log('\n=== Attempting JavaScript click ===');
      await mainImage.evaluate(el => el.click());
      await page.waitForTimeout(3000);
      lightboxFound = await checkForLightbox(page);
    }

    // Check for any new images in the DOM
    const finalImages = await page.evaluate(() => {
      const images = Array.from(document.querySelectorAll('img'));
      return images.map(img => ({
        src: img.src,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        className: img.className,
        id: img.id,
        display: window.getComputedStyle(img).display,
        visibility: window.getComputedStyle(img).visibility,
        parentDisplay: img.parentElement ? window.getComputedStyle(img.parentElement).display : 'none'
      }));
    });

    console.log('\n=== Final image analysis ===');
    console.log('Total images found:', finalImages.length);
    
    // Find new or changed images
    const newImages = finalImages.filter(img => 
      !initialImages.some(initial => initial.src === img.src)
    );
    
    console.log('New images after click:', newImages.length);
    newImages.forEach(img => {
      console.log(`New image: ${img.src} (${img.naturalWidth}x${img.naturalHeight}) Display: ${img.display} Visibility: ${img.visibility}`);
    });

    // Find larger versions of the same image
    const largerImages = finalImages.filter(img => 
      img.naturalWidth > 600 || img.naturalHeight > 450
    );
    
    console.log('\nLarger images found:', largerImages.length);
    largerImages.forEach(img => {
      console.log(`Large image: ${img.src} (${img.naturalWidth}x${img.naturalHeight})`);
    });

    // Check DOM mutations
    const mutations = await page.evaluate(() => window.domMutations);
    console.log('\nDOM mutations detected:', mutations.length);
    mutations.forEach(m => console.log('Mutation:', m));

    // Network requests analysis
    console.log('\n=== Network image requests ===');
    console.log('Total image requests:', imageRequests.length);
    imageRequests.forEach(req => {
      if (req.url.includes('1200x900') || req.url.includes('full')) {
        console.log('LARGE IMAGE REQUEST:', req.url);
      } else {
        console.log('Image request:', req.url);
      }
    });

    // Check for hidden elements that might contain images
    const hiddenElements = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('*'));
      return elements.filter(el => {
        const style = window.getComputedStyle(el);
        const hasImage = el.querySelector('img') || el.tagName === 'IMG';
        const isHidden = style.display === 'none' || 
                        style.visibility === 'hidden' || 
                        style.opacity === '0' ||
                        el.hidden;
        return hasImage && isHidden;
      }).map(el => ({
        tagName: el.tagName,
        id: el.id,
        className: el.className,
        innerHTML: el.innerHTML?.substring(0, 200)
      }));
    });

    console.log('\n=== Hidden elements with images ===');
    console.log('Found:', hiddenElements.length);
    hiddenElements.forEach(el => console.log('Hidden element:', el));

    // Wait for user to inspect
    console.log('\n=== Keeping browser open for manual inspection ===');
    console.log('Check the DevTools Network tab for any 1200x900 images');
    console.log('Check the Elements tab for any lightbox/modal elements');
    await page.waitForTimeout(30000); // Keep open for 30 seconds

    await browser.close();
  });
});

async function checkForLightbox(page) {
  // Common lightbox selectors
  const lightboxSelectors = [
    '.lightbox',
    '.modal',
    '.overlay',
    '.gallery-modal',
    '.image-modal',
    '.zoom-modal',
    '.fullscreen',
    '.fancybox',
    '.magnific-popup',
    '[role="dialog"]',
    '.lb-container',
    '.pswp',
    '.mfp-container',
    'div[style*="z-index: 9999"]',
    'div[style*="z-index: 10000"]',
    'div[style*="position: fixed"]',
    '.carousel-modal',
    '.image-viewer',
    '.photo-viewer'
  ];

  for (const selector of lightboxSelectors) {
    try {
      const element = await page.$(selector);
      if (element) {
        const isVisible = await element.isVisible();
        if (isVisible) {
          console.log(`Found visible lightbox element: ${selector}`);
          
          // Check for images within the lightbox
          const lightboxImages = await element.$$eval('img', imgs => 
            imgs.map(img => ({
              src: img.src,
              naturalWidth: img.naturalWidth,
              naturalHeight: img.naturalHeight
            }))
          );
          
          console.log('Images in lightbox:', lightboxImages);
          return true;
        }
      }
    } catch (e) {
      // Continue checking
    }
  }
  
  // Check for any element covering the viewport
  const coveringElement = await page.evaluate(() => {
    const elements = Array.from(document.querySelectorAll('*'));
    return elements.filter(el => {
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return rect.width > window.innerWidth * 0.8 &&
             rect.height > window.innerHeight * 0.8 &&
             style.position === 'fixed' &&
             style.display !== 'none';
    }).map(el => ({
      tagName: el.tagName,
      id: el.id,
      className: el.className,
      hasImages: el.querySelectorAll('img').length
    }));
  });
  
  if (coveringElement.length > 0) {
    console.log('Found covering elements:', coveringElement);
    return true;
  }
  
  return false;
}