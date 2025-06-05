const puppeteer = require('puppeteer');

async function testGalleryClick() {
  console.log('=== TESTING CRAIGSLIST GALLERY CLICKS ===\n');
  
  const browser = await puppeteer.launch({
    headless: false,
    devtools: true
  });

  try {
    const page = await browser.newPage();
    
    // Enable request interception to see all network requests
    await page.setRequestInterception(true);
    const imageRequests = [];
    
    page.on('request', request => {
      if (request.resourceType() === 'image') {
        imageRequests.push(request.url());
      }
      request.continue();
    });
    
    console.log('Loading Craigslist listing...');
    await page.goto('https://sfbay.craigslist.org/scz/mcy/d/santa-cruz-2014-bmw-r1200rt-motorcycle/7855748254.html', {
      waitUntil: 'networkidle2'
    });

    console.log('\nInitial images loaded:');
    imageRequests.forEach(url => {
      if (url.includes('craigslist')) {
        console.log(`- ${url}`);
      }
    });
    
    // Clear the array to track new requests
    imageRequests.length = 0;
    
    console.log('\nClicking on second thumbnail...');
    await page.click('#thumbs a:nth-child(2)');
    await page.waitForTimeout(1000);
    
    console.log('\nNew images loaded after click:');
    imageRequests.forEach(url => {
      console.log(`- ${url}`);
    });
    
    // Check what's in the visible slide now
    const visibleImage = await page.evaluate(() => {
      const visible = document.querySelector('.slide.visible img');
      return visible ? visible.src : 'No image found';
    });
    
    console.log(`\nVisible image after click: ${visibleImage}`);
    
    // Check if clicking the main image does anything
    console.log('\nClicking on the main image...');
    imageRequests.length = 0;
    await page.click('.slide.visible img').catch(() => console.log('Could not click main image'));
    await page.waitForTimeout(1000);
    
    console.log('New requests after clicking main image:');
    imageRequests.forEach(url => {
      console.log(`- ${url}`);
    });
    
    console.log('\nKeep browser open to inspect network tab...');
    await new Promise(() => {}); // Keep open

  } catch (error) {
    console.error('Error:', error);
  }
}

testGalleryClick();