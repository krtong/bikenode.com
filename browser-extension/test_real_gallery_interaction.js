const puppeteer = require('puppeteer');

async function testRealInteraction() {
  console.log('=== TESTING REAL CRAIGSLIST GALLERY INTERACTION ===\n');
  
  const browser = await puppeteer.launch({
    headless: false,
    devtools: true
  });

  try {
    const page = await browser.newPage();
    
    // Monitor network requests
    const imageRequests = [];
    page.on('response', response => {
      if (response.url().includes('images.craigslist.org')) {
        imageRequests.push({
          url: response.url(),
          status: response.status()
        });
      }
    });
    
    await page.goto('https://sfbay.craigslist.org/scz/mcy/d/santa-cruz-2014-bmw-r1200rt-motorcycle/7855748254.html', {
      waitUntil: 'networkidle2'
    });
    
    console.log('Initial page loaded. Images loaded so far:');
    imageRequests.forEach(req => console.log(`- ${req.url}`));
    
    // Clear for fresh tracking
    imageRequests.length = 0;
    
    // Try different interactions
    console.log('\n1. Clicking on the main gallery image...');
    await page.click('.slide.visible img').catch(() => console.log('Could not click main image'));
    await page.waitForTimeout(1000);
    
    console.log('New images after clicking main image:', imageRequests.length);
    imageRequests.forEach(req => console.log(`- ${req.url}`));
    imageRequests.length = 0;
    
    // Try clicking a thumbnail while preventing navigation
    console.log('\n2. Preventing thumbnail navigation and clicking...');
    await page.evaluate(() => {
      // Override all thumbnail links to prevent navigation
      document.querySelectorAll('#thumbs a').forEach(thumb => {
        thumb.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          // Trigger whatever Craigslist would do
          const imgId = thumb.id.replace('_thumb_', '_image_');
          const targetSlide = document.getElementById(imgId);
          if (targetSlide) {
            // Remove visible from all slides
            document.querySelectorAll('.slide').forEach(s => s.classList.remove('visible'));
            // Add visible to target
            targetSlide.classList.add('visible');
          }
        });
      });
    });
    
    // Click second thumbnail
    await page.click('#thumbs a:nth-child(2)');
    await page.waitForTimeout(1000);
    
    console.log('New images after modified click:', imageRequests.length);
    imageRequests.forEach(req => console.log(`- ${req.url}`));
    
    // Check what's in the second slide now
    const secondSlideInfo = await page.evaluate(() => {
      const slide = document.querySelector('#2_image_lMsuEGaFIHH_0CI0t2');
      const img = slide?.querySelector('img');
      return {
        hasImage: img !== null,
        imageUrl: img?.src,
        slideHTML: slide?.innerHTML.substring(0, 200)
      };
    });
    
    console.log('\nSecond slide info:', secondSlideInfo);
    
    // Check if there's a lightbox or modal
    console.log('\n3. Looking for lightbox/modal functionality...');
    const hasLightbox = await page.evaluate(() => {
      return document.querySelector('.lightbox, .modal, .image-viewer, .gallery-modal') !== null;
    });
    console.log('Lightbox found:', hasLightbox);
    
    // Try arrow keys
    console.log('\n4. Trying arrow key navigation...');
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(500);
    
    const afterArrowKey = await page.evaluate(() => {
      const visible = document.querySelector('.slide.visible');
      return {
        visibleId: visible?.id,
        hasImage: visible?.querySelector('img') !== null
      };
    });
    console.log('After arrow key:', afterArrowKey);
    
    console.log('\nKeep browser open to manually test...');
    console.log('Try clicking on thumbnails or the main image to see what happens.');
    await new Promise(() => {});
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testRealInteraction();