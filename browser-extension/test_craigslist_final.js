import puppeteer from 'puppeteer';

async function testCraigslistFinal() {
  console.log('=== FINAL CRAIGSLIST IMAGE TEST ===\n');
  
  const browser = await puppeteer.launch({
    headless: false,
    devtools: true
  });

  try {
    const page = await browser.newPage();
    
    // Track all images
    const allImages = new Set();
    page.on('response', response => {
      const url = response.url();
      if (url.includes('.jpg') && response.status() === 200) {
        allImages.add(url);
        if (!url.includes('50x50') && !url.includes('600x450')) {
          console.log('🎯 NON-STANDARD IMAGE:', url);
        }
      }
    });
    
    await page.goto('https://sfbay.craigslist.org/scz/mcy/d/santa-cruz-2014-bmw-r1200rt-motorcycle/7855748254.html', {
      waitUntil: 'networkidle2'
    });
    
    console.log('Page loaded. Let me check the gallery arrows...\n');
    
    // Click the forward arrow
    console.log('Clicking forward arrow...');
    await page.click('.slider-forward.arrow');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check current image
    const afterForward = await page.evaluate(() => {
      const visible = document.querySelector('.slide.visible img');
      return visible ? visible.src : null;
    });
    console.log('Image after forward:', afterForward);
    
    // Click on the visible slide image
    console.log('\nClicking on the visible slide image...');
    await page.click('.slide.visible img');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check all images in DOM
    const domImages = await page.evaluate(() => {
      const images = [];
      document.querySelectorAll('img').forEach(img => {
        if (img.src.includes('craigslist')) {
          images.push({
            src: img.src,
            visible: img.offsetWidth > 0 && img.offsetHeight > 0,
            parent: img.parentElement?.className || 'no-parent',
            size: img.src.match(/(\d+x\d+)/)?.[1] || 'unknown'
          });
        }
      });
      return images;
    });
    
    console.log('\n=== ALL IMAGES IN DOM ===');
    const bySize = {};
    domImages.forEach(img => {
      if (!bySize[img.size]) bySize[img.size] = [];
      bySize[img.size].push(img);
    });
    
    Object.entries(bySize).forEach(([size, imgs]) => {
      console.log(`\n${size}: ${imgs.length} images`);
      if (size !== '50x50c' && size !== '600x450') {
        imgs.forEach(img => {
          console.log(`  - ${img.src}`);
          console.log(`    Visible: ${img.visible}, Parent: ${img.parent}`);
        });
      }
    });
    
    // Try direct URL test
    console.log('\n=== TESTING DIRECT URL ACCESS ===');
    const testResult = await page.evaluate(async () => {
      const img = document.querySelector('.slide.visible img');
      if (img && img.src.includes('600x450')) {
        const base = img.src.replace('_600x450.jpg', '');
        const tests = [
          { size: '1200x900', url: base + '_1200x900.jpg' },
          { size: 'original', url: base + '.jpg' },
          { size: '800x600', url: base + '_800x600.jpg' },
          { size: 'full', url: base + '_full.jpg' }
        ];
        
        const results = [];
        for (const test of tests) {
          try {
            const response = await fetch(test.url, { method: 'HEAD' });
            results.push({
              size: test.size,
              url: test.url,
              exists: response.ok,
              status: response.status
            });
          } catch (e) {
            results.push({
              size: test.size,
              url: test.url,
              exists: false,
              error: e.message
            });
          }
        }
        return results;
      }
      return null;
    });
    
    if (testResult) {
      console.log('\nURL test results:');
      testResult.forEach(result => {
        console.log(`${result.size}: ${result.exists ? '✓' : '✗'} ${result.status || result.error}`);
      });
    }
    
    console.log('\n\nFINAL VERDICT:');
    console.log(`Total images loaded: ${allImages.size}`);
    console.log('Available sizes:', Object.keys(bySize).join(', '));
    
    console.log('\nBrowser will stay open. Please:');
    console.log('1. Click on the main gallery image');
    console.log('2. Check if any modal/lightbox opens');
    console.log('3. Look in DevTools Network tab for any new image requests');
    console.log('4. Tell me what you see!');
    console.log('\nPress Ctrl+C to exit');
    
    await new Promise(() => {});
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testCraigslistFinal();