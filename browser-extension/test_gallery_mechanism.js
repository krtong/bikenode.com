const puppeteer = require('puppeteer');

async function testGalleryMechanism() {
  console.log('=== TESTING CRAIGSLIST GALLERY MECHANISM ===\n');
  
  const browser = await puppeteer.launch({
    headless: false,
    devtools: true
  });

  try {
    const page = await browser.newPage();
    
    await page.goto('https://sfbay.craigslist.org/scz/mcy/d/santa-cruz-2014-bmw-r1200rt-motorcycle/7855748254.html', {
      waitUntil: 'networkidle2'
    });
    
    // Check thumbnail structure
    const thumbnailInfo = await page.evaluate(() => {
      const thumbs = document.querySelectorAll('#thumbs a');
      const slides = document.querySelectorAll('.slide');
      const firstThumb = thumbs[0];
      
      return {
        thumbnailCount: thumbs.length,
        slideCount: slides.length,
        firstThumbHref: firstThumb ? firstThumb.href : null,
        firstThumbId: firstThumb ? firstThumb.id : null,
        visibleSlide: document.querySelector('.slide.visible')?.id
      };
    });
    
    console.log('Gallery structure:', thumbnailInfo);
    
    // Try clicking a thumbnail
    console.log('\nTrying to click second thumbnail...');
    
    // Before click
    const beforeClick = await page.evaluate(() => {
      const visible = document.querySelector('.slide.visible');
      return {
        visibleId: visible?.id,
        hasImage: visible?.querySelector('img') !== null,
        imageUrl: visible?.querySelector('img')?.src
      };
    });
    console.log('Before click:', beforeClick);
    
    // Click second thumbnail
    await page.evaluate(() => {
      const secondThumb = document.querySelector('#thumbs a:nth-child(2)');
      if (secondThumb) {
        secondThumb.click();
      }
    });
    
    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // After click
    const afterClick = await page.evaluate(() => {
      const visible = document.querySelector('.slide.visible');
      return {
        visibleId: visible?.id,
        hasImage: visible?.querySelector('img') !== null,
        imageUrl: visible?.querySelector('img')?.src,
        slideChanged: visible?.id !== '1_image_9SyqWVZhD0S_0CI0lM'
      };
    });
    console.log('After click:', afterClick);
    
    // Check if images are dynamically loaded
    console.log('\nChecking all slides for images...');
    const slideImages = await page.evaluate(() => {
      const slides = document.querySelectorAll('.slide');
      const result = [];
      
      slides.forEach((slide, index) => {
        const img = slide.querySelector('img');
        result.push({
          index: index,
          id: slide.id,
          hasImage: img !== null,
          imageUrl: img?.src,
          isVisible: slide.classList.contains('visible')
        });
      });
      
      return result;
    });
    
    console.log(`\nSlides with images: ${slideImages.filter(s => s.hasImage).length}/${slideImages.length}`);
    slideImages.slice(0, 5).forEach(slide => {
      console.log(`Slide ${slide.index}: ${slide.hasImage ? 'HAS IMAGE' : 'NO IMAGE'} ${slide.isVisible ? '(VISIBLE)' : ''}`);
    });
    
    console.log('\nKeep browser open to inspect...');
    await new Promise(() => {});
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testGalleryMechanism();