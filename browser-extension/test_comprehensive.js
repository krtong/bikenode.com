const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Test with various types of listings
const testListings = [
  {
    name: 'Craigslist - High-end Motorcycle',
    url: 'https://sfbay.craigslist.org/scz/mcy/d/santa-cruz-2014-bmw-r1200rt-motorcycle/7855748254.html',
    platform: 'craigslist'
  },
  {
    name: 'Craigslist - Search for more bikes',
    searchUrl: 'https://sfbay.craigslist.org/search/mca',
    platform: 'craigslist',
    isSearch: true
  }
];

async function comprehensiveTest() {
  console.log('=== COMPREHENSIVE SCRAPER TEST ===\n');
  
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const allResults = [];
  
  try {
    // First test the known working URL
    console.log('1. Testing known working Craigslist motorcycle listing...');
    const page = await browser.newPage();
    const scraperCode = fs.readFileSync(path.join(__dirname, 'universalScraper.js'), 'utf8');
    
    await page.goto(testListings[0].url, { waitUntil: 'networkidle2' });
    await page.evaluate(scraperCode);
    const data = await page.evaluate(() => extractClassifiedAd());
    
    console.log(`✓ Title: ${data.title}`);
    console.log(`✓ Price: ${data.price}`);
    console.log(`✓ Location: ${data.location}`);
    console.log(`✓ Images: ${data.images.length}`);
    console.log(`✓ Full resolution images: ${!data.images.some(url => url.includes('600x450'))}`);
    
    await page.close();
    
    // Now search for more listings
    console.log('\n2. Searching for more Craigslist listings...');
    const searchPage = await browser.newPage();
    await searchPage.goto('https://sfbay.craigslist.org/search/mca', { waitUntil: 'networkidle2' });
    
    // Get first 10 listing URLs
    const listingUrls = await searchPage.evaluate(() => {
      const links = document.querySelectorAll('a.result-title.hdrlnk');
      return Array.from(links).slice(0, 10).map(link => ({
        url: link.href,
        title: link.textContent.trim()
      }));
    });
    
    console.log(`Found ${listingUrls.length} listings\n`);
    await searchPage.close();
    
    // Test each listing
    for (let i = 0; i < Math.min(listingUrls.length, 5); i++) {
      console.log(`\n3.${i + 1}. Testing: ${listingUrls[i].title}`);
      console.log(`     URL: ${listingUrls[i].url}`);
      
      const testPage = await browser.newPage();
      
      try {
        await testPage.goto(listingUrls[i].url, { waitUntil: 'networkidle2' });
        
        // Check if it's a valid listing page
        const isListing = await testPage.evaluate(() => {
          return document.querySelector('.postingtitletext') !== null;
        });
        
        if (!isListing) {
          console.log('     ⚠️  Not a listing page, skipping...');
          continue;
        }
        
        await testPage.evaluate(scraperCode);
        const listingData = await testPage.evaluate(() => extractClassifiedAd());
        
        const result = {
          url: listingUrls[i].url,
          originalTitle: listingUrls[i].title,
          scraped: {
            title: listingData.title,
            price: listingData.price,
            location: listingData.location,
            imageCount: listingData.images ? listingData.images.length : 0,
            hasAttributes: Object.keys(listingData.attributes || {}).length > 0,
            category: listingData.category
          },
          issues: []
        };
        
        // Validate
        if (!result.scraped.title) result.issues.push('No title');
        if (!result.scraped.price) result.issues.push('No price');
        if (!result.scraped.location || result.scraped.location === 'google map') {
          result.issues.push('Location issue');
        }
        if (result.scraped.imageCount === 0) result.issues.push('No images');
        
        // Check for thumbnails
        if (listingData.images && listingData.images.length > 0) {
          const hasThumbnails = listingData.images.some(url => 
            url.includes('50x50') || url.includes('300x300') || url.includes('600x450')
          );
          if (hasThumbnails) result.issues.push('Has thumbnails');
        }
        
        // Print results
        console.log(`     Title: ${result.scraped.title ? '✓' : '✗'} ${result.scraped.title || 'NOT FOUND'}`);
        console.log(`     Price: ${result.scraped.price ? '✓' : '✗'} ${result.scraped.price || 'NOT FOUND'}`);
        console.log(`     Location: ${result.scraped.location && result.scraped.location !== 'google map' ? '✓' : '✗'} ${result.scraped.location || 'NOT FOUND'}`);
        console.log(`     Images: ${result.scraped.imageCount > 0 ? '✓' : '✗'} ${result.scraped.imageCount}`);
        console.log(`     Attributes: ${result.scraped.hasAttributes ? '✓' : '✗'}`);
        console.log(`     Category: ${result.scraped.category}`);
        
        if (result.issues.length > 0) {
          console.log(`     Issues: ${result.issues.join(', ')}`);
        }
        
        allResults.push(result);
        
      } catch (error) {
        console.log(`     ❌ Error: ${error.message}`);
      } finally {
        await testPage.close();
      }
    }
    
    // Summary
    console.log('\n\n=== FINAL SUMMARY ===');
    console.log(`Total listings tested: ${allResults.length}`);
    
    const perfectResults = allResults.filter(r => r.issues.length === 0);
    console.log(`Perfect extractions: ${perfectResults.length}`);
    
    const commonIssues = {};
    allResults.forEach(r => {
      r.issues.forEach(issue => {
        commonIssues[issue] = (commonIssues[issue] || 0) + 1;
      });
    });
    
    console.log('\nIssue breakdown:');
    Object.entries(commonIssues).forEach(([issue, count]) => {
      const percentage = Math.round((count / allResults.length) * 100);
      console.log(`- ${issue}: ${count}/${allResults.length} (${percentage}%)`);
    });
    
    // Category detection
    const categories = {};
    allResults.forEach(r => {
      const cat = r.scraped.category || 'unknown';
      categories[cat] = (categories[cat] || 0) + 1;
    });
    
    console.log('\nCategory detection:');
    Object.entries(categories).forEach(([cat, count]) => {
      console.log(`- ${cat}: ${count}`);
    });
    
    // Save results
    fs.writeFileSync('comprehensive_test_results.json', JSON.stringify({
      timestamp: new Date().toISOString(),
      summary: {
        total: allResults.length,
        perfect: perfectResults.length,
        issues: commonIssues,
        categories: categories
      },
      details: allResults
    }, null, 2));
    
    console.log('\nFull results saved to comprehensive_test_results.json');
    
  } catch (error) {
    console.error('Test suite error:', error);
  } finally {
    await browser.close();
  }
}

comprehensiveTest();