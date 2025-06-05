const puppeteer = require('puppeteer');

async function findFullImages() {
  console.log('=== SEARCHING FOR CRAIGSLIST FULL IMAGES ===\n');
  
  const browser = await puppeteer.launch({
    headless: false,
    devtools: false
  });

  try {
    const page = await browser.newPage();
    
    await page.goto('https://sfbay.craigslist.org/scz/mcy/d/santa-cruz-2014-bmw-r1200rt-motorcycle/7855748254.html', {
      waitUntil: 'networkidle2'
    });
    
    console.log('Page loaded. Analyzing gallery...\n');
    
    // Get initial state
    const initialState = await page.evaluate(() => {
      const visible = document.querySelector('.slide.visible img');
      return {
        visibleSrc: visible?.src,
        totalSlides: document.querySelectorAll('.slide').length,
        slidesWithImages: document.querySelectorAll('.slide img').length
      };
    });
    
    console.log('Initial state:', initialState);
    
    // Inject code to intercept image loading
    await page.evaluate(() => {
      console.log('Setting up image load monitoring...');
      
      // Monitor all image loads
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node.tagName === 'IMG') {
              console.log('New image added:', node.src);
            }
          });
        });
      });
      
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
      
      // Override thumbnail clicks to prevent navigation
      document.querySelectorAll('#thumbs a').forEach((thumb, index) => {
        thumb.onclick = (e) => {
          e.preventDefault();
          console.log(`Thumbnail ${index} clicked`);
          
          // Find the corresponding slide
          const slideId = thumb.id.replace('_thumb_', '_image_');
          const targetSlide = document.getElementById(slideId);
          
          if (targetSlide && !targetSlide.querySelector('img')) {
            console.log(`Slide ${slideId} has no image yet`);
            
            // Craigslist loads images dynamically when needed
            // Try to trigger their image loading mechanism
            
            // Method 1: Change visible class
            document.querySelectorAll('.slide').forEach(s => s.classList.remove('visible'));
            targetSlide.classList.add('visible');
            
            // Method 2: Try to find and call their gallery function
            if (window.gallery && typeof window.gallery.slide === 'function') {
              console.log('Found gallery.slide function');
              window.gallery.slide(index);
            }
            
            // Method 3: Dispatch events
            targetSlide.dispatchEvent(new Event('show'));
            targetSlide.dispatchEvent(new Event('load'));
          }
          
          return false;
        };
      });
    });
    
    // Click through thumbnails
    console.log('\nClicking through thumbnails...\n');
    
    for (let i = 1; i <= 5; i++) {
      console.log(`\nClicking thumbnail ${i}...`);
      
      await page.click(`#thumbs a:nth-child(${i})`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const slideInfo = await page.evaluate((index) => {
        const slides = document.querySelectorAll('.slide');
        const targetSlide = slides[index - 1];
        const img = targetSlide?.querySelector('img');
        
        return {
          slideId: targetSlide?.id,
          hasImage: img !== null,
          imageSrc: img?.src,
          slideInnerHTML: targetSlide?.innerHTML.substring(0, 100)
        };
      }, i);
      
      console.log(`Slide ${i}:`, slideInfo);
    }
    
    // Check console logs
    console.log('\n\nChecking browser console for clues...');
    const consoleMessages = [];
    page.on('console', msg => consoleMessages.push(msg.text()));
    
    // Final check of all slides
    const finalState = await page.evaluate(() => {
      const slides = document.querySelectorAll('.slide');
      const result = [];
      
      slides.forEach((slide, i) => {
        const img = slide.querySelector('img');
        if (img) {
          result.push({
            index: i,
            src: img.src,
            size: img.src.match(/\d+x\d+/)?.[0]
          });
        }
      });
      
      return result;
    });
    
    console.log('\n\nFinal image inventory:');
    console.log(`Total images found: ${finalState.length}`);
    finalState.forEach(img => {
      console.log(`- Slide ${img.index}: ${img.size || 'no size'} - ${img.src.substring(0, 60)}...`);
    });
    
    console.log('\n\nCONCLUSION:');
    console.log('Craigslist appears to only provide 600x450 images in their gallery.');
    console.log('No larger images are loaded through interaction.');
    
    console.log('\nKeep browser open to explore manually...');
    await new Promise(() => {});
    
  } catch (error) {
    console.error('Error:', error);
  }
}

findFullImages();