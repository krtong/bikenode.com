import puppeteer from 'puppeteer';

async function testClickBehavior() {
  console.log('=== TESTING CRAIGSLIST CLICK BEHAVIOR ===\n');
  
  const browser = await puppeteer.launch({
    headless: false,
    devtools: true
  });

  try {
    const page = await browser.newPage();
    
    await page.goto('https://sfbay.craigslist.org/scz/mcy/d/santa-cruz-2014-bmw-r1200rt-motorcycle/7855748254.html', {
      waitUntil: 'networkidle2'
    });
    
    console.log('Checking initial state...');
    let imageCount = await page.evaluate(() => {
      const all = document.querySelectorAll('.slide img');
      const large = document.querySelectorAll('.slide img[src*="1200x900"]');
      const medium = document.querySelectorAll('.slide img[src*="600x450"]');
      return { all: all.length, large: large.length, medium: medium.length };
    });
    
    console.log('Before click:', imageCount);
    
    // Monitor what happens when we click
    page.on('framenavigated', () => console.log('⚠️ Frame navigated!'));
    page.on('load', () => console.log('⚠️ Page loaded!'));
    
    console.log('\nClicking main image...');
    
    // Check if clicking causes navigation
    const navigationPromise = page.waitForNavigation({ timeout: 1000 }).catch(() => null);
    
    await page.click('.slide.visible img, .slide.first img');
    
    const navigated = await navigationPromise;
    if (navigated) {
      console.log('❌ Click caused navigation!');
      return;
    }
    
    console.log('✓ No navigation occurred');
    
    // Check images at different intervals
    for (let i = 1; i <= 5; i++) {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      imageCount = await page.evaluate(() => {
        const all = document.querySelectorAll('.slide img');
        const large = document.querySelectorAll('.slide img[src*="1200x900"]');
        const medium = document.querySelectorAll('.slide img[src*="600x450"]');
        const visible = document.querySelector('.slide.visible img');
        return { 
          all: all.length, 
          large: large.length, 
          medium: medium.length,
          visibleSrc: visible ? visible.src : 'none'
        };
      });
      
      console.log(`After ${i * 0.5}s:`, imageCount);
      
      if (imageCount.large > 0) {
        console.log('✅ 1200x900 images loaded!');
        break;
      }
    }
    
    // Check what's actually in the DOM
    console.log('\nFinal DOM check:');
    const domInfo = await page.evaluate(() => {
      const slides = document.querySelectorAll('.slide');
      const info = {
        slideCount: slides.length,
        slides: []
      };
      
      slides.forEach((slide, i) => {
        const img = slide.querySelector('img');
        if (img) {
          info.slides.push({
            index: i,
            src: img.src,
            size: img.src.match(/(\d+x\d+)/)?.[1] || 'unknown',
            visible: slide.classList.contains('visible')
          });
        }
      });
      
      return info;
    });
    
    console.log(`Total slides: ${domInfo.slideCount}`);
    console.log('First 5 slides:');
    domInfo.slides.slice(0, 5).forEach(slide => {
      console.log(`  Slide ${slide.index}: ${slide.size} ${slide.visible ? '(visible)' : ''}`);
    });
    
    console.log('\nConclusion:');
    if (imageCount.large > 0) {
      console.log('Craigslist DOES load 1200x900 images when clicking the main image');
      console.log('The scraper needs to wait for these to load and collect ALL slide images');
    } else {
      console.log('Craigslist may have changed their behavior');
      console.log('Or the click needs to be done differently');
    }
    
    console.log('\nKeeping browser open...');
    await new Promise(() => {});
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testClickBehavior();