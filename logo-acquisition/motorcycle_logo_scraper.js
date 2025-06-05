/**
 * Motorcycle Logo Acquisition System
 * High-quality PNG logo scraper with manual verification
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { createCanvas, loadImage } = require('canvas');
const sharp = require('sharp');

class MotorcycleLogoScraper {
  constructor() {
    this.baseDir = path.join(__dirname, '..');
    this.imagesDir = {
      raw: path.join(this.baseDir, 'images', 'raw'),
      verified: path.join(this.baseDir, 'images', 'verified'),
      processed: path.join(this.baseDir, 'images', 'processed')
    };
    
    this.brands = this.loadBrands();
    this.logoSources = this.initializeLogoSources();
    this.qualityStandards = {
      minWidth: 200,
      minHeight: 200,
      preferredWidth: 512,
      preferredHeight: 512,
      maxFileSize: 2 * 1024 * 1024, // 2MB
      requiredFormat: 'png'
    };
    
    this.verificationResults = [];
  }

  loadBrands() {
    // Load from multiple sources
    const sources = [
      '../database/data/motorcycle_brands.csv',
      '../all_motorcycle_brands.txt'
    ];

    let brands = new Set();
    
    sources.forEach(source => {
      const filePath = path.join(this.baseDir, source);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        
        if (source.endsWith('.csv')) {
          const lines = content.split('\n');
          lines.slice(1).forEach(line => { // Skip header
            const brandName = line.split(',')[0]?.trim();
            if (brandName && brandName !== '') {
              brands.add(brandName);
            }
          });
        } else {
          content.split('\n').forEach(brand => {
            const cleanBrand = brand.trim();
            if (cleanBrand) brands.add(cleanBrand);
          });
        }
      }
    });

    return Array.from(brands).sort();
  }

  initializeLogoSources() {
    return {
      // Primary sources for motorcycle logos
      wikipedia: {
        baseUrl: 'https://en.wikipedia.org/wiki/',
        searchPattern: brand => `${brand.replace(/ /g, '_')}_motorcycles`,
        logoSelectors: [
          '.infobox img',
          '.vcard img',
          '.logo img',
          'img[alt*="logo"]',
          'img[src*="logo"]'
        ]
      },
      
      // Motorcycle manufacturer websites (to be populated)
      official: {
        // Will be populated with known manufacturer URLs
        websites: {}
      },
      
      // Logo databases
      logoSources: [
        'https://logos-world.net/motorcycle-logos/',
        'https://www.brandsoftheworld.com/search/logos?search=',
        'https://seeklogo.com/search?q=',
        'https://worldvectorlogo.com/search?q='
      ],
      
      // Image search APIs (requires API keys)
      imageSearch: {
        google: 'https://www.googleapis.com/customsearch/v1',
        bing: 'https://api.bing.microsoft.com/v7.0/images/search'
      }
    };
  }

  async searchBrandLogo(brandName) {
    console.log(`🔍 Searching logo for: ${brandName}`);
    
    const results = {
      brand: brandName,
      candidates: [],
      verified: false,
      finalLogo: null
    };

    // 1. Try Wikipedia first
    try {
      const wikipediaResults = await this.searchWikipedia(brandName);
      results.candidates.push(...wikipediaResults);
    } catch (error) {
      console.log(`Wikipedia search failed for ${brandName}:`, error.message);
    }

    // 2. Try manufacturer website
    try {
      const officialResults = await this.searchOfficialWebsite(brandName);
      results.candidates.push(...officialResults);
    } catch (error) {
      console.log(`Official website search failed for ${brandName}:`, error.message);
    }

    // 3. Try logo databases
    try {
      const logoDbResults = await this.searchLogoDatabase(brandName);
      results.candidates.push(...logoDbResults);
    } catch (error) {
      console.log(`Logo database search failed for ${brandName}:`, error.message);
    }

    return results;
  }

  async searchWikipedia(brandName) {
    const candidates = [];
    const searchTerms = [
      brandName,
      `${brandName} motorcycles`,
      `${brandName} motors`,
      `${brandName} motor company`
    ];

    for (const term of searchTerms) {
      try {
        const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(term)}`;
        const response = await this.fetchWithTimeout(url);
        const data = JSON.parse(response);
        
        if (data.thumbnail) {
          candidates.push({
            url: data.thumbnail.source,
            source: 'wikipedia_thumbnail',
            confidence: 0.7,
            width: data.thumbnail.width,
            height: data.thumbnail.height
          });
        }

        // Also try to get the main page image
        if (data.originalimage) {
          candidates.push({
            url: data.originalimage.source,
            source: 'wikipedia_main',
            confidence: 0.8,
            width: data.originalimage.width,
            height: data.originalimage.height
          });
        }
      } catch (error) {
        console.log(`Wikipedia API failed for ${term}:`, error.message);
      }
    }

    return candidates;
  }

  async searchOfficialWebsite(brandName) {
    // Known manufacturer websites
    const knownWebsites = {
      'Honda': 'https://powersports.honda.com',
      'Yamaha': 'https://www.yamahamotorsports.com',
      'Kawasaki': 'https://www.kawasaki.com',
      'Suzuki': 'https://www.suzukimotorcycles.com',
      'Harley-Davidson': 'https://www.harley-davidson.com',
      'BMW': 'https://www.bmw-motorrad.com',
      'Ducati': 'https://www.ducati.com',
      'KTM': 'https://www.ktm.com',
      'Aprilia': 'https://www.aprilia.com',
      'Triumph': 'https://www.triumphmotorcycles.com',
      'Indian': 'https://www.indianmotorcycle.com',
      'Can-Am': 'https://can-am.brp.com',
      'Husqvarna': 'https://www.husqvarnamotorcycles.com',
      'Royal Enfield': 'https://www.royalenfield.com',
      'Zero': 'https://www.zeromotorcycles.com'
    };

    const candidates = [];
    const website = knownWebsites[brandName];
    
    if (website) {
      // This would require web scraping - for now return placeholder
      candidates.push({
        url: `${website}/favicon.ico`,
        source: 'official_favicon',
        confidence: 0.9,
        needsManualVerification: true
      });
    }

    return candidates;
  }

  async searchLogoDatabase(brandName) {
    // This would integrate with logo database APIs
    // For now, return search URLs for manual verification
    const candidates = [];
    
    const searchUrls = [
      `https://seeklogo.com/search?q=${encodeURIComponent(brandName + ' motorcycle')}`,
      `https://worldvectorlogo.com/search?q=${encodeURIComponent(brandName)}`,
      `https://logos-world.net/search/?s=${encodeURIComponent(brandName)}`
    ];

    searchUrls.forEach((url, index) => {
      candidates.push({
        url: url,
        source: 'logo_database_search',
        confidence: 0.6,
        searchUrl: true,
        needsManualVerification: true
      });
    });

    return candidates;
  }

  async downloadImage(url, filename) {
    return new Promise((resolve, reject) => {
      const filepath = path.join(this.imagesDir.raw, filename);
      const protocol = url.startsWith('https:') ? https : http;
      
      const request = protocol.get(url, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
          return;
        }

        const fileStream = fs.createWriteStream(filepath);
        response.pipe(fileStream);

        fileStream.on('finish', () => {
          fileStream.close();
          resolve(filepath);
        });

        fileStream.on('error', reject);
      });

      request.on('error', reject);
      request.setTimeout(10000, () => {
        request.abort();
        reject(new Error('Download timeout'));
      });
    });
  }

  async validateImageQuality(imagePath) {
    try {
      const metadata = await sharp(imagePath).metadata();
      
      const quality = {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        size: fs.statSync(imagePath).size,
        isValid: false,
        issues: []
      };

      // Check minimum dimensions
      if (metadata.width < this.qualityStandards.minWidth) {
        quality.issues.push(`Width too small: ${metadata.width}px (min: ${this.qualityStandards.minWidth}px)`);
      }
      
      if (metadata.height < this.qualityStandards.minHeight) {
        quality.issues.push(`Height too small: ${metadata.height}px (min: ${this.qualityStandards.minHeight}px)`);
      }

      // Check file size
      if (quality.size > this.qualityStandards.maxFileSize) {
        quality.issues.push(`File too large: ${(quality.size / 1024 / 1024).toFixed(1)}MB (max: 2MB)`);
      }

      // Check format
      if (metadata.format !== 'png') {
        quality.issues.push(`Wrong format: ${metadata.format} (required: PNG)`);
      }

      quality.isValid = quality.issues.length === 0;
      return quality;
    } catch (error) {
      return {
        isValid: false,
        issues: [`Image validation failed: ${error.message}`]
      };
    }
  }

  async convertToPng(inputPath, outputPath, targetSize = null) {
    try {
      let pipeline = sharp(inputPath);
      
      if (targetSize) {
        pipeline = pipeline.resize(targetSize.width, targetSize.height, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 } // Transparent background
        });
      }
      
      await pipeline.png({ quality: 100 }).toFile(outputPath);
      return outputPath;
    } catch (error) {
      throw new Error(`PNG conversion failed: ${error.message}`);
    }
  }

  generateManualVerificationReport() {
    const report = {
      timestamp: new Date().toISOString(),
      totalBrands: this.brands.length,
      searchResults: this.verificationResults,
      manualTasks: [],
      completed: 0,
      pending: 0
    };

    this.verificationResults.forEach(result => {
      if (result.finalLogo) {
        report.completed++;
      } else {
        report.pending++;
        
        // Generate manual tasks
        if (result.candidates.length === 0) {
          report.manualTasks.push({
            brand: result.brand,
            task: 'manual_search',
            priority: 'high',
            description: `No logo candidates found. Manual search required.`,
            searchUrls: [
              `https://www.google.com/search?q=${encodeURIComponent(result.brand + ' motorcycle logo')}&tbm=isch`,
              `https://duckduckgo.com/?q=${encodeURIComponent(result.brand + ' logo')}&ia=images`
            ]
          });
        } else {
          report.manualTasks.push({
            brand: result.brand,
            task: 'manual_verification',
            priority: 'medium',
            description: `${result.candidates.length} candidates found. Manual verification needed.`,
            candidates: result.candidates.map(c => ({
              url: c.url,
              source: c.source,
              confidence: c.confidence
            }))
          });
        }
      }
    });

    return report;
  }

  async processAllBrands() {
    console.log(`🚀 Starting logo acquisition for ${this.brands.length} motorcycle brands...`);
    
    for (let i = 0; i < this.brands.length; i++) {
      const brand = this.brands[i];
      console.log(`\n[${i + 1}/${this.brands.length}] Processing: ${brand}`);
      
      try {
        const result = await this.searchBrandLogo(brand);
        this.verificationResults.push(result);
        
        // Save progress every 10 brands
        if ((i + 1) % 10 === 0) {
          await this.saveProgress();
        }
        
        // Rate limiting
        await this.sleep(1000);
      } catch (error) {
        console.error(`Error processing ${brand}:`, error.message);
        this.verificationResults.push({
          brand: brand,
          candidates: [],
          verified: false,
          error: error.message
        });
      }
    }

    // Final save and report
    await this.saveProgress();
    const report = this.generateManualVerificationReport();
    
    // Save verification report
    const reportPath = path.join(this.baseDir, 'logo_verification_report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`\n✅ Logo acquisition complete!`);
    console.log(`📊 Results: ${report.completed} completed, ${report.pending} pending manual verification`);
    console.log(`📋 Report saved to: ${reportPath}`);
    
    return report;
  }

  async saveProgress() {
    const progressPath = path.join(this.baseDir, 'logo_acquisition_progress.json');
    const progress = {
      timestamp: new Date().toISOString(),
      processed: this.verificationResults.length,
      total: this.brands.length,
      results: this.verificationResults
    };
    
    fs.writeFileSync(progressPath, JSON.stringify(progress, null, 2));
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async fetchWithTimeout(url, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const protocol = url.startsWith('https:') ? https : http;
      
      const request = protocol.get(url, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`HTTP ${response.statusCode}`));
          return;
        }

        let data = '';
        response.on('data', chunk => data += chunk);
        response.on('end', () => resolve(data));
      });

      request.on('error', reject);
      request.setTimeout(timeout, () => {
        request.abort();
        reject(new Error('Request timeout'));
      });
    });
  }
}

// Manual verification helper functions
function createManualVerificationInterface() {
  return `
<!DOCTYPE html>
<html>
<head>
    <title>Motorcycle Logo Manual Verification</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .brand-section { border: 1px solid #ddd; margin: 20px 0; padding: 15px; }
        .candidate { display: inline-block; margin: 10px; text-align: center; }
        .candidate img { max-width: 200px; max-height: 200px; border: 1px solid #ccc; }
        .approve-btn { background: #28a745; color: white; padding: 5px 10px; border: none; cursor: pointer; }
        .reject-btn { background: #dc3545; color: white; padding: 5px 10px; border: none; cursor: pointer; }
        .manual-search { background: #ffc107; padding: 10px; margin: 10px 0; }
    </style>
</head>
<body>
    <h1>Motorcycle Logo Manual Verification</h1>
    <div id="verification-interface">
        <!-- Will be populated by JavaScript -->
    </div>
    
    <script>
        // Manual verification interface logic
        async function loadVerificationData() {
            // Load the verification report and create interface
        }
        
        function approveCandidate(brandName, candidateIndex) {
            // Mark candidate as approved
        }
        
        function rejectCandidate(brandName, candidateIndex) {
            // Mark candidate as rejected
        }
        
        function openManualSearch(brandName) {
            // Open search URLs in new tabs
        }
    </script>
</body>
</html>
  `;
}

module.exports = { MotorcycleLogoScraper };

// If run directly
if (require.main === module) {
  const scraper = new MotorcycleLogoScraper();
  scraper.processAllBrands().catch(console.error);
}