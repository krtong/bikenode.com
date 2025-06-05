const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Test specifically for thumbnail elimination
const thumbnailTest = {
  name: 'Aggressive Thumbnail Filtering Test',
  html: `
    <html>
    <body>
      <h1>Bike For Sale - $1,500</h1>
      <div class="gallery">
        <!-- These should all be REJECTED -->
        <img src="https://example.com/bike_50x50.jpg">
        <img src="https://example.com/bike_100x100.jpg">
        <img src="https://example.com/bike_150x150.jpg">
        <img src="https://example.com/bike_200x200.jpg">
        <img src="https://example.com/bike_300x300.jpg">
        <img src="https://example.com/bike_400x400.jpg">
        <img src="https://example.com/bike_600x450.jpg">
        <img src="https://example.com/bike_thumb.jpg">
        <img src="https://example.com/bike_thumbnail.jpg">
        <img src="https://example.com/bike_small.jpg">
        <img src="https://example.com/bike_s.jpg">
        <img src="https://example.com/bike_t.jpg">
        <img src="https://example.com/bike_m.jpg">
        <img src="https://example.com/bike_preview.jpg">
        <img src="https://example.com/icon.jpg">
        <img src="https://example.com/logo.jpg">
        
        <!-- These should be ACCEPTED -->
        <img src="https://example.com/bike_800x600.jpg">
        <img src="https://example.com/bike_1200x900.jpg">
        <img src="https://example.com/bike_1920x1080.jpg">
        <img src="https://example.com/bike_original.jpg">
        <img src="https://example.com/bike_large.jpg">
        <img src="https://example.com/bike_full.jpg">
      </div>
    </body>
    </html>
  `,
  expected: {
    imageCount: 6, // Only the 6 large images should be accepted
    shouldRejectThumbnails: true
  }
};

async function testThumbnailFiltering() {
  console.log('=== THUMBNAIL ELIMINATION TEST ===\n');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const scraperCode = fs.readFileSync(path.join(__dirname, 'universalScraper.js'), 'utf8');
  
  try {
    console.log('Testing aggressive thumbnail filtering...');
    console.log('─'.repeat(60));
    
    const page = await browser.newPage();
    
    await page.setContent(thumbnailTest.html);
    await page.evaluate(scraperCode);
    const data = await page.evaluate(() => extractClassifiedAd());
    
    console.log(`Total images found: ${data.images.length}`);
    console.log(`Expected: ${thumbnailTest.expected.imageCount}`);
    
    // List all images found
    console.log('\nImages extracted:');
    data.images.forEach((url, index) => {
      console.log(`  ${index + 1}. ${url}`);
    });
    
    // Check for any thumbnails that slipped through
    const thumbnailPatterns = [
      '50x50', '100x100', '150x150', '200x200', '300x300', '400x400', '600x450',
      'thumb', 'thumbnail', 'small', '_s.', '_t.', '_m.', 'preview', 'icon', 'logo'
    ];
    
    const foundThumbnails = [];
    data.images.forEach(url => {
      thumbnailPatterns.forEach(pattern => {
        if (url.includes(pattern)) {
          foundThumbnails.push({ url, pattern });
        }
      });
    });
    
    console.log('\nThumbnail Detection Results:');
    if (foundThumbnails.length === 0) {
      console.log('✅ SUCCESS: No thumbnails detected in results');
    } else {
      console.log('❌ FAILURE: Found thumbnails that should have been filtered:');
      foundThumbnails.forEach(thumb => {
        console.log(`  - ${thumb.url} (contains: ${thumb.pattern})`);
      });
    }
    
    // Validate expected large images are present
    const expectedLargeImages = [
      'bike_800x600.jpg',
      'bike_1200x900.jpg', 
      'bike_1920x1080.jpg',
      'bike_original.jpg',
      'bike_large.jpg',
      'bike_full.jpg'
    ];
    
    console.log('\nLarge Image Detection:');
    expectedLargeImages.forEach(expected => {
      const found = data.images.some(url => url.includes(expected));
      console.log(`  ${found ? '✅' : '❌'} ${expected}`);
    });
    
    // Final verdict
    const success = (data.images.length === thumbnailTest.expected.imageCount) && 
                   (foundThumbnails.length === 0);
    
    console.log(`\n${success ? '✅ PASSED' : '❌ FAILED'}: Thumbnail filtering test`);
    console.log(`Expected ${thumbnailTest.expected.imageCount} images, got ${data.images.length}`);
    console.log(`Thumbnails leaked through: ${foundThumbnails.length}`);
    
    await page.close();
    
  } catch (error) {
    console.error('Test error:', error);
  } finally {
    await browser.close();
  }
}

testThumbnailFiltering();