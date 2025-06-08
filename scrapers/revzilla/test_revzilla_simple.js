import puppeteer from 'puppeteer';

async function testSimple() {
    let browser;
    try {
        console.log('Launching browser...');
        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        console.log('Navigating to RevZilla...');
        await page.goto('https://www.revzilla.com/motorcycle-helmets', { 
            waitUntil: 'domcontentloaded',
            timeout: 30000 
        });
        
        console.log('Page loaded, checking for products...');
        
        // Wait a bit for dynamic content
        await page.waitForTimeout(3000);
        
        // Try different selectors
        const selectors = [
            '.product-index-item',
            '[data-testid="product-card"]',
            '.product-tile',
            'article[data-product]',
            '[class*="product"]',
            'a[href*="/motorcycle/"]'
        ];
        
        let products = [];
        for (const selector of selectors) {
            const count = await page.$$eval(selector, els => els.length).catch(() => 0);
            console.log(`Selector "${selector}": found ${count} elements`);
            if (count > 0) {
                // Extract basic info
                products = await page.$$eval(selector, (elements) => {
                    return elements.slice(0, 5).map(el => {
                        const text = el.textContent || '';
                        const link = el.querySelector('a')?.href || el.href || '';
                        return { text: text.substring(0, 100), link };
                    });
                });
                break;
            }
        }
        
        console.log('\nFound products:', products.length);
        products.forEach((p, i) => {
            console.log(`${i + 1}. ${p.text.trim()}`);
        });
        
        // Take screenshot for debugging
        await page.screenshot({ path: 'revzilla_test.png' });
        console.log('\nScreenshot saved as revzilla_test.png');
        
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

testSimple();