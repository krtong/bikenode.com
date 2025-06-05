const puppeteer = require('puppeteer');

async function debugAttributes() {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.goto('https://sfbay.craigslist.org/scz/mcy/d/santa-cruz-2014-bmw-r1200rt-motorcycle/7855748254.html', {
      waitUntil: 'networkidle2'
    });

    // Debug attribute structure
    const attrStructure = await page.evaluate(() => {
      const results = {
        attrgroups: [],
        spans: []
      };
      
      // Get all attrgroup elements
      const groups = document.querySelectorAll('.attrgroup');
      groups.forEach((group, i) => {
        const groupData = {
          index: i,
          html: group.innerHTML,
          text: group.textContent.trim(),
          spans: []
        };
        
        const spans = group.querySelectorAll('span');
        spans.forEach(span => {
          groupData.spans.push({
            text: span.textContent.trim(),
            html: span.innerHTML
          });
        });
        
        results.attrgroups.push(groupData);
      });
      
      return results;
    });

    console.log('=== ATTRIBUTE STRUCTURE DEBUG ===\n');
    console.log(JSON.stringify(attrStructure, null, 2));

  } catch (error) {
    console.error('Debug failed:', error);
  } finally {
    await browser.close();
  }
}

debugAttributes();