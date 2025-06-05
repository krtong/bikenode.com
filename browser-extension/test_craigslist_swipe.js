import puppeteer from 'puppeteer';

async function testCraigslistSwipe() {
  console.log('=== TESTING CRAIGSLIST SWIPE/NAVIGATION ===\n');
  
  const browser = await puppeteer.launch({
    headless: false,
    devtools: true,
    args: ['--window-size=1920,1080']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Enhanced image tracking
    const imageLoads = new Map();
    page.on('response', response => {
      const url = response.url();
      if (url.includes('.jpg') && response.status() === 200) {
        if (!imageLoads.has(url)) {
          imageLoads.set(url, { 
            timestamp: Date.now(), 
            size: url.match(/(\d+x\d+)/)?.[1] || 'unknown' 
          });
          
          if (url.includes('1200') || url.includes('900') || 
              (!url.includes('50x50') && !url.includes('600x450'))) {
            console.log('🎯 POTENTIAL LARGE IMAGE:', url);
          }
        }
      }
    });
    
    await page.goto('https://sfbay.craigslist.org/scz/mcy/d/santa-cruz-2014-bmw-r1200rt-motorcycle/7855748254.html', {
      waitUntil: 'networkidle2'
    });
    
    console.log('Page loaded. Inspecting gallery implementation...\n');
    
    // Deep dive into the gallery structure
    const galleryAnalysis = await page.evaluate(() => {
      const analysis = {
        navigation: {},
        swipe: {},
        structure: {},
        scripts: []
      };
      
      // Check for swipe/touch handlers
      const gallery = document.querySelector('.gallery');
      if (gallery) {
        // Check computed styles for transform/transition
        const style = window.getComputedStyle(gallery);
        analysis.structure = {
          overflow: style.overflow,
          position: style.position,
          transform: style.transform,
          transition: style.transition
        };
        
        // Look for swipe containers
        const swipeElements = gallery.querySelectorAll('[class*="swipe"]');
        analysis.swipe.elements = Array.from(swipeElements).map(el => ({
          class: el.className,
          tag: el.tagName,
          childCount: el.children.length
        }));
      }
      
      // Check for navigation arrows
      const navElements = document.querySelectorAll('[class*="arrow"], [class*="nav"], [class*="next"], [class*="prev"]');
      analysis.navigation.arrows = Array.from(navElements).map(el => ({
        class: el.className,
        visible: el.offsetWidth > 0 && el.offsetHeight > 0,
        onclick: el.onclick ? 'has handler' : 'no handler'
      }));
      
      // Extract gallery-related scripts
      document.querySelectorAll('script').forEach(script => {
        const content = script.textContent;
        if (content.includes('swipe') || content.includes('gallery') || content.includes('slide')) {
          // Extract key parts
          const matches = content.match(/(swipe|gallery|slide|image)[^;{]*/gi);
          if (matches) {
            analysis.scripts.push(...matches.slice(0, 5));
          }
        }
      });
      
      return analysis;
    });
    
    console.log('Gallery Analysis:', JSON.stringify(galleryAnalysis, null, 2));
    
    // Test different interaction methods
    console.log('\n=== TESTING INTERACTION METHODS ===\n');
    
    // 1. Test swipe gestures
    console.log('1. Testing swipe gesture...');
    const initialImageCount = imageLoads.size;
    
    await page.evaluate(() => {
      const gallery = document.querySelector('.gallery');
      if (gallery) {
        // Simulate swipe
        const touchStart = new TouchEvent('touchstart', {
          bubbles: true,
          cancelable: true,
          touches: [{ clientX: 500, clientY: 300 }]
        });
        const touchMove = new TouchEvent('touchmove', {
          bubbles: true,
          cancelable: true,
          touches: [{ clientX: 200, clientY: 300 }]
        });
        const touchEnd = new TouchEvent('touchend', {
          bubbles: true,
          cancelable: true
        });
        
        gallery.dispatchEvent(touchStart);
        gallery.dispatchEvent(touchMove);
        gallery.dispatchEvent(touchEnd);
      }
    });
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log(`   New images loaded: ${imageLoads.size - initialImageCount}`);
    
    // 2. Check URL patterns
    console.log('\n2. Analyzing URL patterns...');
    const urlPatterns = await page.evaluate(() => {
      const patterns = new Set();
      
      // Check all image srcs
      document.querySelectorAll('img').forEach(img => {
        if (img.src.includes('craigslist')) {
          const match = img.src.match(/\/([^\/]+)_(\d+x\d+)\.jpg$/);
          if (match) {
            patterns.add(match[2]); // size pattern
          }
        }
      });
      
      // Check background images
      document.querySelectorAll('*').forEach(el => {
        const bg = window.getComputedStyle(el).backgroundImage;
        if (bg && bg.includes('craigslist')) {
          const match = bg.match(/(\d+x\d+)/);
          if (match) {
            patterns.add(match[1]);
          }
        }
      });
      
      return Array.from(patterns);
    });
    
    console.log('   Found size patterns:', urlPatterns);
    
    // 3. Try to construct and load a larger image
    console.log('\n3. Testing URL modification...');
    const testUrl = await page.evaluate(async () => {
      const img = document.querySelector('.slide.visible img');
      if (img && img.src.includes('600x450')) {
        const largeUrl = img.src.replace('600x450', '1200x900');
        
        // Try to load it
        try {
          const response = await fetch(largeUrl, { method: 'HEAD' });
          return { 
            original: img.src, 
            modified: largeUrl, 
            exists: response.ok,
            status: response.status 
          };
        } catch (e) {
          return { 
            original: img.src, 
            modified: largeUrl, 
            exists: false, 
            error: e.message 
          };
        }
      }
      return null;
    });
    
    console.log('   URL test result:', testUrl);
    
    // 4. Check mobile viewport
    console.log('\n4. Testing mobile viewport...');
    await page.setViewport({ width: 375, height: 667, isMobile: true });
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const mobileGallery = await page.evaluate(() => {
      const gallery = document.querySelector('.gallery');
      const slides = document.querySelectorAll('.slide img');
      return {
        galleryClass: gallery?.className,
        slideCount: slides.length,
        firstImageSrc: slides[0]?.src
      };
    });
    
    console.log('   Mobile gallery:', mobileGallery);
    
    // Final summary
    console.log('\n=== SUMMARY ===\n');
    console.log(`Total images loaded: ${imageLoads.size}`);
    
    const sizeBreakdown = {};
    imageLoads.forEach((info, url) => {
      if (!sizeBreakdown[info.size]) sizeBreakdown[info.size] = 0;
      sizeBreakdown[info.size]++;
    });
    
    console.log('\nImages by size:');
    Object.entries(sizeBreakdown).forEach(([size, count]) => {
      console.log(`  ${size}: ${count} images`);
    });
    
    // List any non-standard size images
    const nonStandardImages = Array.from(imageLoads.entries())
      .filter(([url, info]) => !['50x50c', '600x450'].includes(info.size))
      .map(([url, info]) => ({ url, ...info }));
    
    if (nonStandardImages.length > 0) {
      console.log('\nNon-standard size images:');
      nonStandardImages.forEach(img => {
        console.log(`  ${img.size}: ${img.url}`);
      });
    }
    
    console.log('\n\nKeep browser open to inspect manually...');
    console.log('Try these actions:');
    console.log('- Click directly on images');
    console.log('- Use arrow keys');
    console.log('- Try pinch-to-zoom on images');
    console.log('- Check mobile view');
    console.log('\nPress Ctrl+C to exit');
    
    await new Promise(() => {});
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testCraigslistSwipe();