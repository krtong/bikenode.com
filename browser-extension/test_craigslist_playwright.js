const { chromium } = require('playwright');

async function testCraigslistImages() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  console.log('\n=== CRAIGSLIST IMAGE VIEWING TEST ===\n');
  
  // Track all image requests
  const imageRequests = [];
  page.on('response', response => {
    const url = response.url();
    if (url.match(/\.(jpg|jpeg|png|webp)$/i)) {
      imageRequests.push({
        url: url,
        status: response.status(),
        timestamp: new Date().toISOString()
      });
      console.log(`Image loaded: ${url}`);
    }
  });
  
  // Navigate to the listing
  await page.goto('https://sfbay.craigslist.org/scz/mcy/d/santa-cruz-2014-bmw-r1200rt-motorcycle/7855748254.html');
  await page.waitForLoadState('networkidle');
  
  console.log('\n1. INITIAL PAGE LOAD:');
  
  // Get the main displayed image
  const mainImage = await page.$eval('.gallery .slide.first img', img => ({
    src: img.src,
    naturalSize: `${img.naturalWidth}x${img.naturalHeight}`,
    displaySize: `${img.width}x${img.height}`
  }));
  
  console.log(`Main image: ${mainImage.src}`);
  console.log(`  Natural size: ${mainImage.naturalSize}`);
  console.log(`  Display size: ${mainImage.displaySize}`);
  
  // Get thumbnail info
  const thumbnails = await page.$$eval('.thumb img', imgs => 
    imgs.map(img => ({
      src: img.src,
      size: `${img.naturalWidth}x${img.naturalHeight}`
    }))
  );
  
  console.log(`\nThumbnails (${thumbnails.length} total):`);
  thumbnails.slice(0, 3).forEach((thumb, i) => {
    console.log(`  ${i + 1}. ${thumb.src} (${thumb.size})`);
  });
  
  // Clear previous requests to track new ones
  imageRequests.length = 0;
  
  console.log('\n2. CLICKING SECOND THUMBNAIL:');
  
  // Click the second thumbnail
  const secondThumb = await page.$('.thumb:nth-child(2) a');
  if (secondThumb) {
    await secondThumb.click();
    await page.waitForTimeout(1000);
    
    // Check what changed
    const newMainImage = await page.$eval('.gallery .slide.first img', img => ({
      src: img.src,
      naturalSize: `${img.naturalWidth}x${img.naturalHeight}`,
      displaySize: `${img.width}x${img.height}`
    }));
    
    console.log(`New main image: ${newMainImage.src}`);
    console.log(`  Natural size: ${newMainImage.naturalSize}`);
    console.log(`  Display size: ${newMainImage.displaySize}`);
  }
  
  // Clear requests again
  imageRequests.length = 0;
  
  console.log('\n3. CLICKING THE MAIN IMAGE:');
  
  // Click on the main image
  await page.click('.gallery .slide.first img');
  await page.waitForTimeout(2000);
  
  // Check for modal or lightbox
  const possibleSelectors = [
    '.gallery .slide.active img',
    '.lightbox img',
    '.modal img',
    '#lightbox img',
    '.fullsize img'
  ];
  
  let foundLargerImage = false;
  for (const selector of possibleSelectors) {
    try {
      const element = await page.$(selector);
      if (element) {
        const imageInfo = await page.$eval(selector, img => ({
          src: img.src,
          naturalSize: `${img.naturalWidth}x${img.naturalHeight}`,
          displaySize: `${img.width}x${img.height}`,
          visible: img.offsetWidth > 0 && img.offsetHeight > 0
        }));
        
        if (imageInfo.visible) {
          console.log(`Found image with selector "${selector}":`);
          console.log(`  URL: ${imageInfo.src}`);
          console.log(`  Natural size: ${imageInfo.naturalSize}`);
          console.log(`  Display size: ${imageInfo.displaySize}`);
          foundLargerImage = true;
        }
      }
    } catch (e) {
      // Selector not found
    }
  }
  
  if (!foundLargerImage) {
    // Check if main image changed
    const currentMainImage = await page.$eval('.gallery .slide.first img', img => ({
      src: img.src,
      naturalSize: `${img.naturalWidth}x${img.naturalHeight}`,
      displaySize: `${img.width}x${img.height}`
    }));
    
    console.log('No modal found. Current main image:');
    console.log(`  URL: ${currentMainImage.src}`);
    console.log(`  Natural size: ${currentMainImage.naturalSize}`);
    console.log(`  Display size: ${currentMainImage.displaySize}`);
  }
  
  console.log('\n4. URL PATTERN ANALYSIS:');
  
  // Analyze the URL patterns
  const allImages = await page.$$eval('img', imgs => 
    imgs.map(img => img.src).filter(src => src.includes('craigslist.org'))
  );
  
  const patterns = {
    thumbnails: [],
    medium: [],
    large: [],
    original: []
  };
  
  allImages.forEach(url => {
    if (url.includes('_50x50c.jpg')) {
      patterns.thumbnails.push(url);
    } else if (url.includes('_600x450.jpg')) {
      patterns.medium.push(url);
    } else if (url.includes('_1200x900.jpg')) {
      patterns.large.push(url);
    } else if (url.match(/\/[a-zA-Z0-9_]+\.jpg$/)) {
      patterns.original.push(url);
    }
  });
  
  console.log('URL patterns found:');
  console.log(`  Thumbnails (_50x50c): ${patterns.thumbnails.length} images`);
  console.log(`  Medium (_600x450): ${patterns.medium.length} images`);
  console.log(`  Large (_1200x900): ${patterns.large.length} images`);
  console.log(`  Original/Other: ${patterns.original.length} images`);
  
  // Try to construct full-size URLs
  console.log('\n5. CONSTRUCTING FULL-SIZE URLs:');
  
  if (patterns.medium.length > 0) {
    const mediumUrl = patterns.medium[0];
    const possibleFullUrl = mediumUrl.replace('_600x450.jpg', '_1200x900.jpg');
    console.log(`Medium URL: ${mediumUrl}`);
    console.log(`Possible full URL: ${possibleFullUrl}`);
    
    // Test if the full URL exists
    try {
      const response = await page.request.get(possibleFullUrl);
      if (response.ok()) {
        console.log(`✓ Full-size URL exists! Status: ${response.status()}`);
      } else {
        console.log(`✗ Full-size URL returned status: ${response.status()}`);
      }
    } catch (e) {
      console.log(`✗ Error fetching full-size URL: ${e.message}`);
    }
  }
  
  await page.waitForTimeout(5000); // Give time to observe
  await browser.close();
}

testCraigslistImages().catch(console.error);