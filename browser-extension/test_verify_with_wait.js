import puppeteer from 'puppeteer';

async function testVerifyWithWait() {
  console.log('=== VERIFYING IMAGE DIMENSIONS WITH PROPER WAIT ===\n');
  
  const browser = await puppeteer.launch({
    headless: false,
    devtools: false
  });

  try {
    const page = await browser.newPage();
    
    // Monitor image loads
    let largeImageCount = 0;
    page.on('response', response => {
      if (response.url().includes('1200x900')) {
        largeImageCount++;
        console.log(`[LOADED] 1200x900 image #${largeImageCount}`);
      }
    });
    
    await page.goto('https://sfbay.craigslist.org/scz/mcy/d/santa-cruz-2014-bmw-r1200rt-motorcycle/7855748254.html', {
      waitUntil: 'networkidle2'
    });
    
    console.log('Page loaded. Triggering full-size images...\n');
    
    // Click sequence with verification
    const arrowExists = await page.$('.slider-forward.arrow');
    if (arrowExists) {
      console.log('Clicking forward arrow...');
      await page.click('.slider-forward.arrow');
      await page.waitForTimeout(1000);
    }
    
    const mainImageExists = await page.$('.slide.visible img');
    if (mainImageExists) {
      console.log('Clicking main image...');
      await page.click('.slide.visible img');
    } else {
      console.log('No visible slide image found!');
    }
    
    // Wait for images to load
    console.log('Waiting for 1200x900 images to load...');
    await page.waitForTimeout(5000);
    
    // Verify dimensions of all images
    const verification = await page.evaluate(() => {
      const results = {
        total: 0,
        bySize: {},
        largeImages: [],
        allImages: []
      };
      
      // Check ALL images on page
      document.querySelectorAll('img').forEach((img, index) => {
        if (img.src.includes('craigslist')) {
          const info = {
            index: index,
            src: img.src,
            naturalWidth: img.naturalWidth,
            naturalHeight: img.naturalHeight,
            urlSize: img.src.match(/(\d+x\d+)/)?.[1] || 'unknown',
            actualSize: `${img.naturalWidth}x${img.naturalHeight}`,
            loaded: img.complete && img.naturalWidth > 0,
            parent: img.parentElement?.className || 'unknown'
          };
          
          results.allImages.push(info);
          results.total++;
          
          // Count by URL size
          if (!results.bySize[info.urlSize]) results.bySize[info.urlSize] = 0;
          results.bySize[info.urlSize]++;
          
          // Track large images
          if (info.urlSize === '1200x900') {
            results.largeImages.push(info);
          }
        }
      });
      
      return results;
    });
    
    console.log('\nVERIFICATION RESULTS:');
    console.log(`Total Craigslist images: ${verification.total}`);
    console.log('\nImages by URL size:');
    Object.entries(verification.bySize).forEach(([size, count]) => {
      console.log(`  ${size}: ${count} images`);
    });
    
    if (verification.largeImages.length > 0) {
      console.log(`\n1200x900 images found: ${verification.largeImages.length}`);
      console.log('Verifying actual dimensions...');
      
      let verified = 0;
      verification.largeImages.forEach((img, i) => {
        if (img.loaded && img.naturalWidth === 1200) {
          verified++;
          console.log(`✅ Image ${i + 1}: ${img.actualSize} - Verified!`);
        } else {
          console.log(`❌ Image ${i + 1}: ${img.actualSize} - ${img.loaded ? 'Wrong size' : 'Not loaded'}`);
        }
      });
      
      console.log(`\n✅ ${verified}/${verification.largeImages.length} large images verified as 1200px wide`);
    } else {
      console.log('\n❌ No 1200x900 images found in DOM');
      console.log('The click sequence may not have worked properly');
    }
    
    console.log('\nPress Ctrl+C to close...');
    await new Promise(() => {});
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testVerifyWithWait();