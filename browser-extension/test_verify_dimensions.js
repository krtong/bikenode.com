import puppeteer from 'puppeteer';

async function testVerifyDimensions() {
  console.log('=== VERIFYING IMAGE DIMENSIONS ===\n');
  
  const browser = await puppeteer.launch({
    headless: false,
    devtools: false
  });

  try {
    const page = await browser.newPage();
    
    await page.goto('https://sfbay.craigslist.org/scz/mcy/d/santa-cruz-2014-bmw-r1200rt-motorcycle/7855748254.html', {
      waitUntil: 'networkidle2'
    });
    
    console.log('Page loaded. Triggering full-size images...\n');
    
    // Click sequence
    await page.click('.slider-forward.arrow');
    await new Promise(resolve => setTimeout(resolve, 1000));
    await page.click('.slide.visible img');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Verify dimensions of all images
    const verification = await page.evaluate(() => {
      const results = {
        total: 0,
        verified1200x900: 0,
        other: [],
        details: []
      };
      
      const slideImages = document.querySelectorAll('.slide img');
      results.total = slideImages.length;
      
      slideImages.forEach((img, index) => {
        const info = {
          index: index,
          src: img.src,
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
          urlSize: img.src.match(/(\d+x\d+)/)?.[1] || 'unknown',
          actualSize: `${img.naturalWidth}x${img.naturalHeight}`,
          loaded: img.complete && img.naturalWidth > 0
        };
        
        results.details.push(info);
        
        if (img.naturalWidth === 1200 && img.naturalHeight <= 900) {
          results.verified1200x900++;
        } else if (img.naturalWidth > 0) {
          results.other.push(info);
        }
      });
      
      return results;
    });
    
    console.log('VERIFICATION RESULTS:');
    console.log(`Total images: ${verification.total}`);
    console.log(`Verified 1200x900: ${verification.verified1200x900}`);
    console.log(`Other sizes: ${verification.other.length}`);
    
    if (verification.other.length > 0) {
      console.log('\nImages with different dimensions:');
      verification.other.forEach(img => {
        console.log(`  - ${img.urlSize} URL but ${img.actualSize} actual (${img.src.substring(0, 60)}...)`);
      });
    }
    
    // Check first few images in detail
    console.log('\nFirst 5 images detailed check:');
    verification.details.slice(0, 5).forEach(img => {
      const match = img.naturalWidth === 1200 ? '✅' : '❌';
      console.log(`${match} Image ${img.index}: ${img.actualSize} (URL says ${img.urlSize})`);
    });
    
    // Summary
    console.log('\n=== SUMMARY ===');
    if (verification.verified1200x900 >= 20) {
      console.log(`✅ SUCCESS: ${verification.verified1200x900}/${verification.total} images are 1200 pixels wide`);
    } else {
      console.log(`⚠️ WARNING: Only ${verification.verified1200x900}/${verification.total} images verified as 1200px wide`);
    }
    
    console.log('\nNote: Height may vary (≤900) depending on image aspect ratio');
    console.log('\nPress Ctrl+C to close...');
    await new Promise(() => {});
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testVerifyDimensions();