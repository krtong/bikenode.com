#!/usr/bin/env node

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

// Manual research tool to visit sites and capture data structure
class ManualResearcher {
  constructor() {
    this.browser = null;
    this.results = {
      timestamp: new Date().toISOString(),
      sites: {}
    };
  }

  async initialize() {
    this.browser = await puppeteer.launch({
      headless: false, // Show browser for manual inspection
      devtools: true,  // Open DevTools
      defaultViewport: null
    });
  }

  async researchSite(name, url, instructions) {
    console.log(`\n📍 Researching ${name}`);
    console.log(`   URL: ${url}`);
    console.log(`   Instructions: ${instructions}\n`);

    const page = await this.browser.newPage();
    
    try {
      await page.goto(url, { waitUntil: 'networkidle0' });
      
      // Capture initial HTML structure
      const htmlStructure = await page.evaluate(() => {
        const findSelectors = (element, prefix = '') => {
          const selectors = {};
          
          // Look for product listings
          const productContainers = document.querySelectorAll('[class*="product"], [class*="bike"], [class*="model"]');
          if (productContainers.length > 0) {
            selectors.products = Array.from(productContainers).map(el => ({
              selector: el.className,
              count: document.querySelectorAll(`.${el.className.split(' ')[0]}`).length
            }));
          }
          
          // Look for spec tables
          const tables = document.querySelectorAll('table');
          if (tables.length > 0) {
            selectors.specTables = tables.length;
          }
          
          // Look for spec lists
          const specLists = document.querySelectorAll('[class*="spec"], [class*="feature"], ul li');
          if (specLists.length > 0) {
            selectors.specElements = specLists.length;
          }
          
          return selectors;
        };
        
        return {
          title: document.title,
          url: window.location.href,
          selectors: findSelectors(document.body)
        };
      });
      
      this.results.sites[name] = {
        url,
        htmlStructure,
        timestamp: new Date().toISOString()
      };
      
      // Wait for manual inspection
      console.log('🔍 Browser is open for manual inspection...');
      console.log('   - Look for product listings');
      console.log('   - Identify spec locations');
      console.log('   - Note any JavaScript requirements');
      console.log('   - Press Enter when done\n');
      
      await this.waitForEnter();
      
      // Capture any notes
      const notes = await this.promptForNotes();
      this.results.sites[name].notes = notes;
      
      // Take screenshot
      const screenshotPath = path.join(__dirname, '../data/screenshots', `${name.replace(/\s+/g, '_')}.png`);
      await fs.mkdir(path.dirname(screenshotPath), { recursive: true });
      await page.screenshot({ path: screenshotPath, fullPage: true });
      this.results.sites[name].screenshot = screenshotPath;
      
    } catch (error) {
      console.error(`   ❌ Error: ${error.message}`);
      this.results.sites[name] = {
        url,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    } finally {
      await page.close();
    }
  }

  async waitForEnter() {
    return new Promise((resolve) => {
      process.stdin.once('data', resolve);
    });
  }

  async promptForNotes() {
    console.log('📝 Enter any notes about this site (press Enter twice when done):');
    const notes = [];
    
    return new Promise((resolve) => {
      const rl = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      let emptyLineCount = 0;
      
      rl.on('line', (line) => {
        if (line === '') {
          emptyLineCount++;
          if (emptyLineCount >= 2) {
            rl.close();
            resolve(notes.join('\n'));
          }
        } else {
          emptyLineCount = 0;
          notes.push(line);
        }
      });
    });
  }

  async saveResults() {
    const outputPath = path.join(__dirname, '../data/manual-research-results.json');
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, JSON.stringify(this.results, null, 2));
    console.log(`\n💾 Results saved to: ${outputPath}`);
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

async function main() {
  const researcher = new ManualResearcher();
  
  // Priority sites to research
  const sitesToResearch = [
    {
      name: 'Segway Store',
      url: 'https://store.segway.com/',
      instructions: 'Look for X160, X260 models and their specs'
    },
    {
      name: 'Rawrr Bikes',
      url: 'https://www.riderawrr.com/',
      instructions: 'Find Mantis models and spec locations'
    },
    {
      name: 'REV Rides',
      url: 'https://revrides.com/',
      instructions: 'Check how they list specs for multiple brands'
    },
    {
      name: 'Electric Bike Review',
      url: 'https://electricbikereview.com/',
      instructions: 'Look for review structure and spec tables'
    }
  ];
  
  try {
    await researcher.initialize();
    
    console.log('🚀 Starting Manual Research Session\n');
    console.log('This tool will open websites for manual inspection.');
    console.log('For each site, examine the HTML structure and note:');
    console.log('  - Product listing selectors');
    console.log('  - Spec table/list locations');
    console.log('  - JavaScript requirements');
    console.log('  - URL patterns\n');
    
    for (const site of sitesToResearch) {
      await researcher.researchSite(site.name, site.url, site.instructions);
    }
    
    await researcher.saveResults();
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
  } finally {
    await researcher.close();
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}