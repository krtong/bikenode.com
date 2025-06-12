const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs').promises;

// Simple scraper focused on getting basic brand/model data
class SimpleGrayAreaScraper {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      brands: [],
      sources: []
    };
    this.timeout = 10000; // 10 second timeout
  }

  async fetchPage(url) {
    try {
      const response = await axios.get(url, {
        timeout: this.timeout,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      return response.data;
    } catch (error) {
      console.log(`Failed to fetch ${url}: ${error.message}`);
      return null;
    }
  }

  // Extract brand and model info from text
  extractBrandModel(text) {
    const brands = [];
    
    // Known gray area brand patterns
    const patterns = [
      /sur-?ron\s+([^,\n]+)/gi,
      /talaria\s+([^,\n]+)/gi,
      /segway\s+x(\d+)/gi,
      /onyx\s+([^,\n]+)/gi,
      /stealth\s+([^,\n]+)/gi,
      /cake\s+([^,\n]+)/gi,
      /super\s?73\s+([^,\n]+)/gi,
      /ariel\s+rider\s+([^,\n]+)/gi,
      /monday\s+([^,\n]+)/gi
    ];
    
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const brandModel = match[0].trim();
        if (brandModel.length < 100) { // Reasonable length
          brands.push(brandModel);
        }
      }
    }
    
    return [...new Set(brands)]; // Remove duplicates
  }

  // Scrape Reddit for brand mentions
  async scrapeReddit() {
    console.log('Scraping Reddit...');
    const subreddits = ['ebikes', 'Surron', 'Super73', 'ElectricScooters'];
    
    for (const sub of subreddits) {
      const url = `https://www.reddit.com/r/${sub}/.json?limit=100`;
      const data = await this.fetchPage(url);
      
      if (data) {
        try {
          const posts = JSON.parse(data);
          if (posts.data && posts.data.children) {
            for (const post of posts.data.children) {
              const title = post.data.title;
              const content = post.data.selftext;
              const fullText = `${title} ${content}`;
              
              const brands = this.extractBrandModel(fullText);
              if (brands.length > 0) {
                this.results.brands.push(...brands);
              }
            }
          }
        } catch (e) {
          console.log(`Error parsing Reddit data for r/${sub}`);
        }
      }
    }
  }

  // Scrape electric bike forums
  async scrapeForums() {
    console.log('Scraping forums...');
    const forums = [
      'https://endless-sphere.com/forums/viewforum.php?f=28',
      'https://www.electricbikeforum.com/'
    ];
    
    for (const url of forums) {
      const html = await this.fetchPage(url);
      if (html) {
        const $ = cheerio.load(html);
        const text = $('body').text();
        const brands = this.extractBrandModel(text);
        this.results.brands.push(...brands);
      }
    }
  }

  // Create manual brand/model database from known info
  createManualDatabase() {
    console.log('Creating manual database from known gray area brands...');
    
    const manualData = {
      'Sur-Ron': [
        'Light Bee X', 'Light Bee S', 'Storm Bee', 'Ultra Bee'
      ],
      'Talaria': [
        'Sting MX3', 'Sting R MX4', 'XXX Dragon Light', 'XXX Dragon'
      ],
      'Segway': [
        'X160', 'X260'
      ],
      'Onyx': [
        'RCR', 'CTY2', 'LZR'
      ],
      'Cake': [
        'Kalk OR', 'Kalk&', 'Kalk INK', 'Osa+', 'Osa Lite', 'Makka'
      ],
      'Stealth': [
        'F-37 Fighter', 'B-52 Bomber', 'H-52 Hurricane'
      ],
      'Super73': [
        'S2', 'RX', 'ZX', 'Z1'
      ],
      'Monday Motorbikes': [
        'Gateway', 'Presidio', 'Anza'
      ],
      'Ariel Rider': [
        'Grizzly', 'X-Class', 'D-Class'
      ],
      'Juiced Bikes': [
        'Scorpion', 'HyperScorpion'
      ],
      'Luna Cycle': [
        'X-1 Enduro', 'Z-1', 'Eclipse'
      ],
      'Vintage Electric': [
        'Roadster', 'Tracker', 'Scrambler'
      ],
      'Michael Blast': [
        'Outsider', 'Villain', 'Greaser'
      ],
      'Delfast': [
        'Top 3.0', 'Top 3.0i', 'Prime 2.0'
      ],
      'HPC (Hi Power Cycles)': [
        'Revolution X', 'Revolution M', 'Scout Pro'
      ],
      'Biktrix': [
        'Juggernaut Ultra Beast', 'Juggernaut Ultra FS Pro'
      ],
      'QuietKat': [
        'Apex Sport', 'Apex Pro', 'Jeep E-Bike'
      ]
    };

    for (const [brand, models] of Object.entries(manualData)) {
      this.results.sources.push({
        brand: brand,
        models: models,
        source: 'manual_compilation',
        category: 'gray_area_ebike'
      });
    }
  }

  async run() {
    console.log('Starting simple gray area e-bike data collection...\n');
    
    // Add manual database first
    this.createManualDatabase();
    
    // Try to scrape some online sources
    await this.scrapeReddit();
    await this.scrapeForums();
    
    // Clean up and deduplicate
    this.results.brands = [...new Set(this.results.brands)];
    
    // Save results
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `gray_area_brands_${timestamp}.json`;
    
    await fs.writeFile(filename, JSON.stringify(this.results, null, 2));
    
    console.log('\n=== RESULTS ===');
    console.log(`Brands collected: ${this.results.sources.length}`);
    console.log(`Additional mentions: ${this.results.brands.length}`);
    console.log(`Data saved to: ${filename}`);
    
    // Also create a simple brand list
    const brandList = this.results.sources.map(s => s.brand).sort();
    await fs.writeFile(`gray_area_brand_list_${timestamp}.txt`, brandList.join('\n'));
    
    return this.results;
  }
}

// Run the scraper
if (require.main === module) {
  const scraper = new SimpleGrayAreaScraper();
  scraper.run()
    .then(() => {
      console.log('Data collection completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('Error:', error);
      process.exit(1);
    });
}

module.exports = SimpleGrayAreaScraper;