const puppeteer = require('puppeteer');

async function investigate() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    console.log('🔍 Investigating Sur-Ron USA website structure...\n');
    
    // Set user agent
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
    
    // Visit Sur-Ron X product page
    console.log('Visiting https://sur-ronusa.com/sur-ron-light-bee/ ...');
    const response = await page.goto('https://sur-ronusa.com/sur-ron-light-bee/', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    console.log(`Status: ${response.status()}`);
    console.log(`URL: ${page.url()}\n`);
    
    // Get all links
    const links = await page.evaluate(() => {
      const allLinks = Array.from(document.querySelectorAll('a'));
      return allLinks
        .map(a => ({
          href: a.href,
          text: a.textContent.trim(),
          classes: a.className
        }))
        .filter(link => link.href && link.href.includes('sur-ron'))
        .slice(0, 50); // Limit to first 50 links
    });
    
    console.log(`Found ${links.length} links:\n`);
    
    // Group links by type
    const productLinks = links.filter(l => 
      l.text.toLowerCase().includes('bee') || 
      l.text.toLowerCase().includes('storm') ||
      l.href.includes('product') ||
      l.href.includes('-bee') ||
      l.href.includes('model') ||
      l.href.includes('bike')
    );
    
    console.log('Product/Model Links:');
    productLinks.forEach(link => {
      console.log(`  - ${link.text || 'No text'}: ${link.href}`);
    });
    
    // Check page structure
    const pageInfo = await page.evaluate(() => {
      return {
        title: document.title,
        h1: Array.from(document.querySelectorAll('h1')).map(h => h.textContent.trim()),
        h2: Array.from(document.querySelectorAll('h2')).map(h => h.textContent.trim()).slice(0, 10),
        navLinks: Array.from(document.querySelectorAll('nav a, .nav a, .menu a'))
          .map(a => ({ text: a.textContent.trim(), href: a.href }))
          .filter(l => l.text.length > 0)
          .slice(0, 20)
      };
    });
    
    console.log('\nPage Structure:');
    console.log(`Title: ${pageInfo.title}`);
    console.log(`H1 tags: ${pageInfo.h1.join(', ')}`);
    console.log(`\nH2 tags (first 10):`);
    pageInfo.h2.forEach(h => console.log(`  - ${h}`));
    
    console.log(`\nNavigation Links:`);
    pageInfo.navLinks.forEach(link => {
      console.log(`  - ${link.text}: ${link.href}`);
    });
    
    // Check for product cards
    const products = await page.evaluate(() => {
      const productCards = [];
      
      // Common product card selectors
      const selectors = [
        '.product', '.product-item', '.product-card',
        'article[data-product]', '.grid-item',
        '.card[data-entity-id]', '[data-product-id]'
      ];
      
      selectors.forEach(selector => {
        const cards = document.querySelectorAll(selector);
        cards.forEach(card => {
          const link = card.querySelector('a');
          const title = card.querySelector('h2, h3, h4, .card-title, .product-name');
          const price = card.querySelector('.price, .product-price, [data-product-price]');
          
          if (link && title) {
            productCards.push({
              title: title.textContent.trim(),
              url: link.href,
              price: price ? price.textContent.trim() : 'No price',
              selector: selector
            });
          }
        });
      });
      
      return productCards;
    });
    
    console.log(`\nProduct Cards Found:`);
    products.forEach(p => {
      console.log(`  - ${p.title}: ${p.url} (${p.price}) [${p.selector}]`);
    });
    
    // Look for specs on the page
    const specs = await page.evaluate(() => {
      const specsData = {};
      
      // Look for specs in various formats
      // 1. Description sections
      const descSections = document.querySelectorAll('.productView-description, .product-description, .tab-content');
      descSections.forEach(section => {
        const text = section.textContent;
        console.log('Description text sample:', text.substring(0, 200));
      });
      
      // 2. Look for lists
      const lists = document.querySelectorAll('ul li');
      const specsList = [];
      lists.forEach(li => {
        const text = li.textContent.trim();
        if (text.includes(':') || text.includes('Power') || text.includes('Battery') || 
            text.includes('Speed') || text.includes('Weight') || text.includes('Range')) {
          specsList.push(text);
        }
      });
      
      // 3. Look for tables
      const tables = document.querySelectorAll('table');
      const tableData = [];
      tables.forEach(table => {
        const rows = table.querySelectorAll('tr');
        rows.forEach(row => {
          const cells = row.querySelectorAll('td, th');
          if (cells.length >= 2) {
            tableData.push({
              label: cells[0].textContent.trim(),
              value: cells[1].textContent.trim()
            });
          }
        });
      });
      
      return {
        lists: specsList,
        tables: tableData,
        hasDescription: descSections.length > 0
      };
    });
    
    console.log('\nSpecs found:');
    console.log('Lists:', specs.lists);
    console.log('Tables:', specs.tables);
    console.log('Has description:', specs.hasDescription);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

investigate();