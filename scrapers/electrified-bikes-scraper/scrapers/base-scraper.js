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
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
      await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
      
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