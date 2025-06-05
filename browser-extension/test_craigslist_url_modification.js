const puppeteer = require('puppeteer');

async function testCraigslistImageURLs() {
  console.log('=== TESTING CRAIGSLIST URL MODIFICATION ===\n');
  
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    
    // Test with a real Craigslist motorcycle listing
    console.log('Loading real Craigslist listing...');
    await page.goto('https://sfbay.craigslist.org/scz/mcy/d/santa-cruz-2014-bmw-r1200rt-motorcycle/7855748254.html', {
      waitUntil: 'networkidle2'
    });

    // Get the original image URLs from the page
    const imageData = await page.evaluate(() => {
      const results = {
        original: [],
        modified: []
      };
      
      // Find the imgList in scripts
      const scripts = document.querySelectorAll('script');
      for (const script of scripts) {
        if (script.textContent.includes('var imgList =')) {
          const match = script.textContent.match(/var imgList = (\[[\s\S]*?\]);/);
          if (match) {
            const imgList = eval(match[1]);
            imgList.forEach(img => {
              if (img.url) {
                results.original.push(img.url);
                
                // Apply the same modification logic
                let modified = img.url;
                modified = modified.replace('_600x450', '_1200x900');
                if (modified === img.url) {
                  modified = modified.replace('.jpg', '_1200x900.jpg');
                }
                results.modified.push(modified);
              }
            });
          }
        }
      }
      return results;
    });

    console.log(`Found ${imageData.original.length} images\n`);

    // Test each URL modification
    for (let i = 0; i < Math.min(3, imageData.original.length); i++) {
      console.log(`\nImage ${i + 1}:`);
      console.log(`Original:  ${imageData.original[i]}`);
      console.log(`Modified:  ${imageData.modified[i]}`);
      
      // Test if the modified URL actually works
      try {
        const response = await page.goto(imageData.modified[i], {
          waitUntil: 'load',
          timeout: 5000
        });
        
        if (response.ok()) {
          console.log(`✅ Modified URL works! Status: ${response.status()}`);
        } else {
          console.log(`❌ Modified URL failed! Status: ${response.status()}`);
        }
      } catch (error) {
        console.log(`❌ Modified URL error: ${error.message}`);
      }
      
      // Go back to the listing page
      await page.goBack();
    }
    
    // Try different size variations
    console.log('\n\nTesting various size patterns:');
    if (imageData.original[0]) {
      const baseURL = imageData.original[0];
      const variations = [
        baseURL,
        baseURL.replace('_600x450', '_1200x900'),
        baseURL.replace('_600x450', '_800x600'),
        baseURL.replace('_600x450', ''),
        baseURL.replace('_600x450.jpg', '.jpg')
      ];
      
      for (const url of variations) {
        try {
          const response = await page.goto(url, {
            waitUntil: 'load',
            timeout: 5000
          });
          console.log(`${response.ok() ? '✅' : '❌'} ${url.substring(url.lastIndexOf('/') + 1)}`);
        } catch (error) {
          console.log(`❌ ${url.substring(url.lastIndexOf('/') + 1)} - Error`);
        }
        await page.goBack();
      }
    }

  } catch (error) {
    console.error('Test error:', error);
  } finally {
    console.log('\nPress Ctrl+C to close browser...');
    // Keep browser open to see results
    await new Promise(() => {});
  }
}

testCraigslistImageURLs();