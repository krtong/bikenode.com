#!/usr/bin/env node
const puppeteer = require('puppeteer');

async function testWebsite() {
    console.log('🌐 Testing website access...\n');
    
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
        
        console.log('📄 Testing Bennetts homepage...');
        await page.goto('https://www.bennetts.co.uk', { waitUntil: 'networkidle2', timeout: 30000 });
        
        const title = await page.title();
        console.log(`✅ Homepage loaded: ${title}`);
        
        console.log('\n📄 Testing reviews page...');
        await page.goto('https://www.bennetts.co.uk/bikesocial/reviews/bikes', { 
            waitUntil: 'networkidle2', 
            timeout: 30000 
        });
        
        const reviewsTitle = await page.title();
        console.log(`✅ Reviews page loaded: ${reviewsTitle}`);
        
        // Check for content
        const articles = await page.$$('article, .review, [data-test*="review"]');
        console.log(`📊 Found ${articles.length} potential review elements`);
        
        // Get some links
        const links = await page.evaluate(() => {
            const allLinks = Array.from(document.querySelectorAll('a[href*="review"]'));
            return allLinks.slice(0, 5).map(link => ({
                href: link.href,
                text: link.textContent.trim().slice(0, 50)
            }));
        });
        
        console.log('\n🔗 Sample review links found:');
        links.forEach((link, i) => {
            console.log(`   ${i + 1}. ${link.text} -> ${link.href}`);
        });
        
        console.log('\n✅ Website is accessible and has content!');
        
    } catch (error) {
        console.error('❌ Error testing website:', error.message);
        if (error.message.includes('net::ERR_')) {
            console.log('\n💡 Possible issues:');
            console.log('   - Internet connection problem');
            console.log('   - Website is blocking automated requests');
            console.log('   - Firewall or proxy blocking access');
        }
    } finally {
        if (browser) {
            await browser.close();
        }
        process.exit(0);
    }
}

testWebsite();
