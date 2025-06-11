const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

class BaseScraper {
  constructor(name) {
    this.name = name;
    this.browser = null;
    this.results = {
      brand: name,
      models: [],
      errors: [],
      metadata: {
        scrapedAt: new Date().toISOString(),
        source: null
      }
    };
  }

  async initialize() {
    this.browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  }

  async scrapeUrl(url, extractionFunction) {
    const page = await this.browser.newPage();
    
    try {
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      
      const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      
      // Check response status
      if (response) {
        const status = response.status();
        if (status >= 400) {
          const statusText = response.statusText();
          console.log(`   ⚠️  HTTP ${status} ${statusText} for ${url}`);
          
          // Get page content for debugging
          const content = await page.content();
          const title = await page.title();
          
          if (status === 404) {
            throw new Error(`Page not found (404): ${url}`);
          } else if (status === 403) {
            throw new Error(`Access denied (403): ${url}`);
          } else if (title && title.match(/\d{3}/)) {
            // Title might be the status code
            throw new Error(`HTTP error ${title}: ${url}`);
          }
        }
      }
      
      // Run custom extraction function
      const data = await extractionFunction(page);
      
      return data;
      
    } catch (error) {
      this.results.errors.push({
        url,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      throw error;
    } finally {
      await page.close();
    }
  }

  // Common spec extraction patterns
  extractSpecs(text) {
    const specs = {};
    
    // Motor Power patterns
    const motorPatterns = [
      /(\d+(?:\.\d+)?)\s*(?:k)?W(?:att)?(?:\s*(?:peak|motor|power))?/i,
      /(?:motor|power)[:\s]+(\d+(?:\.\d+)?)\s*(?:k)?W/i
    ];
    
    for (const pattern of motorPatterns) {
      const match = text.match(pattern);
      if (match) {
        const value = parseFloat(match[1]);
        if (text.toLowerCase().includes('kw')) {
          specs.motor_power = `${value}kW`;
        } else {
          specs.motor_power = `${value}W`;
        }
        break;
      }
    }
    
    // Battery patterns
    const batteryPatterns = [
      /(\d+(?:\.\d+)?)\s*V\s*(\d+(?:\.\d+)?)\s*Ah/i,
      /(\d+(?:\.\d+)?)\s*V\s*\/\s*(\d+(?:\.\d+)?)\s*Ah/i,
      /battery[:\s]+(\d+(?:\.\d+)?)\s*V\s*(\d+(?:\.\d+)?)\s*Ah/i
    ];
    
    for (const pattern of batteryPatterns) {
      const match = text.match(pattern);
      if (match) {
        specs.battery = `${match[1]}V ${match[2]}Ah`;
        break;
      }
    }
    
    // Top Speed patterns
    const speedPatterns = [
      /(?:top\s*speed|max\s*speed)[:\s]+(\d+)\s*mph/i,
      /(\d+)\s*mph\s*(?:top\s*speed|max)/i,
      /speed[:\s]+(\d+)\s*mph/i
    ];
    
    for (const pattern of speedPatterns) {
      const match = text.match(pattern);
      if (match) {
        specs.top_speed = `${match[1]} mph`;
        break;
      }
    }
    
    // Range patterns
    const rangePatterns = [
      /range[:\s]+(\d+)(?:-(\d+))?\s*miles?/i,
      /(\d+)(?:-(\d+))?\s*miles?\s*range/i,
      /up\s*to\s*(\d+)\s*miles?/i
    ];
    
    for (const pattern of rangePatterns) {
      const match = text.match(pattern);
      if (match) {
        if (match[2]) {
          specs.range = `${match[1]}-${match[2]} miles`;
        } else {
          specs.range = `${match[1]} miles`;
        }
        break;
      }
    }
    
    // Weight patterns
    const weightPatterns = [
      /weight[:\s]+(\d+(?:\.\d+)?)\s*(?:lbs?|pounds?)/i,
      /(\d+(?:\.\d+)?)\s*(?:lbs?|pounds?)\s*weight/i,
      /weighs?\s*(\d+(?:\.\d+)?)\s*(?:lbs?|pounds?)/i
    ];
    
    for (const pattern of weightPatterns) {
      const match = text.match(pattern);
      if (match) {
        specs.weight = `${match[1]} lbs`;
        break;
      }
    }
    
    return specs;
  }

  async saveResults() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputDir = path.join(__dirname, '../data/raw', this.name.toLowerCase().replace(/\s+/g, '-'));
    await fs.mkdir(outputDir, { recursive: true });
    
    const outputPath = path.join(outputDir, `${timestamp}.json`);
    await fs.writeFile(outputPath, JSON.stringify(this.results, null, 2));
    
    console.log(`💾 Saved results to: ${outputPath}`);
    return outputPath;
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

module.exports = BaseScraper;