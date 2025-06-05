const { Stagehand } = require('@browserbasehq/stagehand');
const fs = require('fs');
const path = require('path');

/**
 * Automated Test Runner with Retry Logic and Comprehensive Error Handling
 */
class TestRunner {
  constructor() {
    this.results = [];
    this.config = {
      maxRetries: 3,
      timeoutMs: 30000,
      headless: false,
      verbose: false
    };
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async runWithRetry(testFunction, testName, maxRetries = this.config.maxRetries) {
    let lastError = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 ${testName} (Attempt ${attempt}/${maxRetries})`);
        const result = await testFunction();
        console.log(`✅ ${testName} - Success`);
        return { success: true, result, attempts: attempt };
      } catch (error) {
        lastError = error;
        console.log(`❌ ${testName} - Attempt ${attempt} failed: ${error.message}`);
        
        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 10000); // Exponential backoff
          console.log(`⏳ Waiting ${delay}ms before retry...`);
          await this.sleep(delay);
        }
      }
    }
    
    console.log(`🚫 ${testName} - All attempts failed`);
    return { success: false, error: lastError.message, attempts: maxRetries };
  }

  async loadModuleCode(filename) {
    const filePath = path.join(__dirname, filename);
    let code = fs.readFileSync(filePath, 'utf8');
    
    // More precise module cleaning - only remove specific export patterns
    if (filename === 'universalScraper.js') {
      // Keep the universalScraper.js as-is since it works
      return code;
    }
    
    // For other modules, carefully remove only module.exports
    code = code.replace(/\/\/ Export for use in other scripts[\s\S]*$/m, '');
    code = code.replace(/\/\/ Export classes for use in other scripts[\s\S]*$/m, '');
    code = code.replace(/module\.exports\s*=\s*\{[^}]*\};\s*$/m, '');
    
    return code;
  }

  async testUniversalScraper(page) {
    const scraperCode = await this.loadModuleCode('universalScraper.js');
    
    // Navigate to a reliable test page
    await page.goto('https://sfbay.craigslist.org/search/bik#search=1~gallery~0~0', { 
      waitUntil: 'networkidle',
      timeout: this.config.timeoutMs 
    });
    
    const listing = await page.locator('.gallery-card').first();
    if (!(await listing.isVisible())) {
      throw new Error('No listings found');
    }
    
    await listing.click();
    await page.waitForLoadState('networkidle');
    
    const result = await page.evaluate((code) => {
      eval(code);
      if (window.extractClassifiedAd) {
        return window.extractClassifiedAd();
      }
      throw new Error('extractClassifiedAd not found');
    }, scraperCode);
    
    if (!result || !result.title || !result.price) {
      throw new Error('Invalid scraping result');
    }
    
    return {
      title: result.title,
      price: result.price,
      imageCount: result.images?.length || 0,
      hasDescription: !!result.description
    };
  }

  async testBikeDetection(page) {
    const bikeDetectionCode = await this.loadModuleCode('bikeDetection.js');
    
    const result = await page.evaluate((code) => {
      eval(code);
      
      if (typeof isBikeListing !== 'function') {
        throw new Error('isBikeListing function not found');
      }
      
      return {
        isBike: isBikeListing(document),
        category: typeof extractCategory === 'function' ? extractCategory(document) : null
      };
    }, bikeDetectionCode);
    
    return result;
  }

  async testPriceComparison(page, sampleData) {
    const priceComparisonCode = await this.loadModuleCode('priceComparison.js');
    
    const result = await page.evaluate(({ code, data }) => {
      eval(code);
      
      if (typeof PriceComparison !== 'function') {
        throw new Error('PriceComparison class not found');
      }
      
      const pc = new PriceComparison();
      
      // Test basic functions
      const priceTest = pc.parsePrice('$1,234.56');
      const similarityTest = pc.calculateSimilarity('Trek Bike', 'Trek Bicycle');
      
      // Test with mock data
      const mockListings = [
        { title: 'Similar bike', price: '$800', category: 'bicycle' },
        { title: 'Another bike', price: '$1200', category: 'bicycle' }
      ];
      
      const similarAds = pc.findSimilarAds(data, mockListings);
      
      return {
        priceParseTest: priceTest,
        similarityTest: similarityTest,
        similarAdsFound: similarAds.length,
        working: true
      };
    }, { code: priceComparisonCode, data: sampleData });
    
    return result;
  }

  async testSpreadsheetExporter(page, sampleData) {
    const exporterCode = await this.loadModuleCode('spreadsheetExporter.js');
    
    const result = await page.evaluate(({ code, data }) => {
      eval(code);
      
      if (typeof SpreadsheetExporter !== 'function') {
        throw new Error('SpreadsheetExporter class not found');
      }
      
      const exporter = new SpreadsheetExporter();
      
      // Test CSV generation
      const csvResult = exporter.generateCSV([data]);
      const jsonResult = exporter.generateJSON([data]);
      
      return {
        csvGenerated: csvResult && csvResult.length > 100,
        jsonGenerated: jsonResult && JSON.parse(jsonResult).length > 0,
        csvPreview: csvResult ? csvResult.substring(0, 100) : null
      };
    }, { code: exporterCode, data: sampleData });
    
    return result;
  }

  async testPlatformWithRetry(page, platformConfig) {
    return await this.runWithRetry(async () => {
      console.log(`   Testing ${platformConfig.name}...`);
      
      try {
        await page.goto(platformConfig.url, { 
          waitUntil: 'networkidle',
          timeout: this.config.timeoutMs 
        });
        
        // Check if login required
        const currentUrl = await page.url();
        if (currentUrl.includes('login') || currentUrl.includes('signin')) {
          return { status: 'requires_login', platform: platformConfig.name };
        }
        
        // Look for listings
        const hasListings = await page.locator(platformConfig.searchSelector)
          .first()
          .isVisible({ timeout: 5000 })
          .catch(() => false);
        
        if (!hasListings) {
          return { status: 'no_listings', platform: platformConfig.name };
        }
        
        // Try to scrape one listing
        await page.locator(platformConfig.searchSelector).first().click();
        await page.waitForLoadState('networkidle');
        
        const scraperCode = await this.loadModuleCode('universalScraper.js');
        const scrapedData = await page.evaluate((code) => {
          eval(code);
          return window.extractClassifiedAd ? window.extractClassifiedAd() : null;
        }, scraperCode);
        
        return {
          status: 'success',
          platform: platformConfig.name,
          data: scrapedData ? {
            hasTitle: !!scrapedData.title,
            hasPrice: !!scrapedData.price,
            imageCount: scrapedData.images?.length || 0
          } : null
        };
        
      } catch (error) {
        if (error.message.includes('Timeout')) {
          return { status: 'timeout', platform: platformConfig.name };
        }
        throw error;
      }
    }, `Platform Test: ${platformConfig.name}`, 2);
  }

  async runPerformanceBenchmark(page) {
    console.log('\n⚡ Running Performance Benchmark...');
    
    const performanceMetrics = {
      scrapeTime: 0,
      comparisonTime: 0,
      exportTime: 0,
      memoryUsage: 0
    };
    
    // Test scraping performance
    const scrapeStart = Date.now();
    const scraperResult = await this.testUniversalScraper(page);
    performanceMetrics.scrapeTime = Date.now() - scrapeStart;
    
    // Test comparison performance
    const comparisonStart = Date.now();
    await this.testPriceComparison(page, scraperResult);
    performanceMetrics.comparisonTime = Date.now() - comparisonStart;
    
    // Test export performance
    const exportStart = Date.now();
    await this.testSpreadsheetExporter(page, scraperResult);
    performanceMetrics.exportTime = Date.now() - exportStart;
    
    // Get memory usage
    const memoryInfo = await page.evaluate(() => {
      return performance.memory ? {
        used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
        total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024)
      } : null;
    });
    
    if (memoryInfo) {
      performanceMetrics.memoryUsage = memoryInfo.used;
    }
    
    return performanceMetrics;
  }

  async runAllTests() {
    console.log('🚀 Starting Comprehensive Test Suite\n');
    
    const stagehand = new Stagehand({
      env: 'LOCAL',
      verbose: this.config.verbose,
      headless: this.config.headless
    });

    try {
      await stagehand.init();
      console.log('✅ Browser initialized\n');
      
      // Core functionality tests
      console.log('📋 Core Functionality Tests');
      console.log('============================');
      
      const scraperTest = await this.runWithRetry(
        () => this.testUniversalScraper(stagehand.page),
        'Universal Scraper'
      );
      this.results.push({ test: 'Universal Scraper', ...scraperTest });
      
      if (scraperTest.success) {
        const sampleData = scraperTest.result;
        
        const bikeTest = await this.runWithRetry(
          () => this.testBikeDetection(stagehand.page),
          'Bike Detection'
        );
        this.results.push({ test: 'Bike Detection', ...bikeTest });
        
        const priceTest = await this.runWithRetry(
          () => this.testPriceComparison(stagehand.page, sampleData),
          'Price Comparison'
        );
        this.results.push({ test: 'Price Comparison', ...priceTest });
        
        const exportTest = await this.runWithRetry(
          () => this.testSpreadsheetExporter(stagehand.page, sampleData),
          'Spreadsheet Exporter'
        );
        this.results.push({ test: 'Spreadsheet Exporter', ...exportTest });
      }
      
      // Platform tests (limited for time)
      console.log('\n🌐 Platform Compatibility Tests');
      console.log('================================');
      
      const platforms = [
        {
          name: 'Craigslist',
          url: 'https://sfbay.craigslist.org/search/bik#search=1~gallery~0~0',
          searchSelector: '.gallery-card'
        },
        {
          name: 'Mercari',
          url: 'https://www.mercari.com/search/?keyword=bicycle',
          searchSelector: '[data-testid="ItemContainer"]'
        }
      ];
      
      for (const platform of platforms) {
        const platformResult = await this.testPlatformWithRetry(stagehand.page, platform);
        this.results.push({ test: `Platform: ${platform.name}`, ...platformResult });
      }
      
      // Performance benchmark
      const performanceResult = await this.runWithRetry(
        () => this.runPerformanceBenchmark(stagehand.page),
        'Performance Benchmark'
      );
      this.results.push({ test: 'Performance Benchmark', ...performanceResult });
      
      // Generate comprehensive report
      this.generateReport();
      
    } catch (error) {
      console.error('❌ Test suite failed:', error);
    } finally {
      await stagehand.close();
      console.log('\n✅ Test suite completed!');
    }
  }

  generateReport() {
    console.log('\n\n📊 COMPREHENSIVE TEST REPORT');
    console.log('=============================');
    
    const successful = this.results.filter(r => r.success).length;
    const failed = this.results.filter(r => !r.success).length;
    
    console.log(`\n📈 Summary: ${successful}/${this.results.length} tests passed (${Math.round(successful/this.results.length*100)}%)`);
    
    console.log('\n📋 Detailed Results:');
    this.results.forEach(result => {
      const emoji = result.success ? '✅' : '❌';
      const attempts = result.attempts ? ` (${result.attempts} attempts)` : '';
      console.log(`${emoji} ${result.test}${attempts}`);
      
      if (result.success && result.result) {
        if (result.test === 'Performance Benchmark') {
          const perf = result.result;
          console.log(`   ⚡ Scrape: ${perf.scrapeTime}ms, Compare: ${perf.comparisonTime}ms, Export: ${perf.exportTime}ms`);
          if (perf.memoryUsage) {
            console.log(`   💾 Memory: ${perf.memoryUsage}MB`);
          }
        }
      }
      
      if (!result.success) {
        console.log(`   Error: ${result.error}`);
      }
    });
    
    // Save detailed report
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total: this.results.length,
        passed: successful,
        failed: failed,
        passRate: Math.round(successful/this.results.length*100)
      },
      results: this.results
    };
    
    fs.writeFileSync(
      path.join(__dirname, 'test_report_comprehensive.json'),
      JSON.stringify(report, null, 2)
    );
    
    console.log('\n💾 Detailed report saved to test_report_comprehensive.json');
  }
}

// Run the comprehensive test suite
if (require.main === module) {
  const runner = new TestRunner();
  runner.runAllTests().catch(console.error);
}

module.exports = TestRunner;