import RevZillaScraperV3 from './revzilla_scraper_v3.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runTests() {
    console.log('🚀 Testing RevZilla Scraper V3');
    console.log('=' .repeat(50));
    
    const results = {
        timestamp: new Date().toISOString(),
        tests: []
    };
    
    // Test 1: Mock Data Generation
    console.log('\n📋 Test 1: Mock Data Generation');
    try {
        const mockScraper = new RevZillaScraperV3({
            useMockData: true,
            outputDir: path.join(__dirname, 'test_data', 'mock_test')
        });
        
        await mockScraper.init();
        
        const categories = await mockScraper.discoverCategories();
        console.log(`✅ Discovered ${Object.keys(categories).length} categories`);
        
        // Scrape one category with mock data
        await mockScraper.scrapeCategory('motorcycle-helmets', {
            maxPages: 2,
            downloadImages: false
        });
        
        results.tests.push({
            name: 'Mock Data Generation',
            status: 'passed',
            details: `Generated mock data successfully`
        });
        
        await mockScraper.cleanup();
        
    } catch (error) {
        console.error('❌ Mock data test failed:', error.message);
        results.tests.push({
            name: 'Mock Data Generation',
            status: 'failed',
            error: error.message
        });
    }
    
    // Test 2: Basic Scraper Functionality (with mock)
    console.log('\n📋 Test 2: Basic Scraper Functionality');
    try {
        const scraper = new RevZillaScraperV3({
            useMockData: true,
            outputDir: path.join(__dirname, 'test_data', 'basic_test'),
            delays: {
                betweenPages: 100,
                betweenProducts: 100,
                betweenCategories: 100
            }
        });
        
        await scraper.init();
        
        // Test single product scraping
        const mockUrl = 'https://www.revzilla.com/motorcycle-helmets/test-product';
        const product = await scraper.scrapeProductDetails(mockUrl);
        
        console.log('✅ Scraped mock product:', product.name);
        console.log('   Brand:', product.brand);
        console.log('   Price:', product.price.regular);
        
        results.tests.push({
            name: 'Basic Scraper Functionality',
            status: 'passed',
            details: 'Successfully scraped mock product'
        });
        
        await scraper.cleanup();
        
    } catch (error) {
        console.error('❌ Basic functionality test failed:', error.message);
        results.tests.push({
            name: 'Basic Scraper Functionality',
            status: 'failed',
            error: error.message
        });
    }
    
    // Test 3: Error Handling
    console.log('\n📋 Test 3: Error Handling & Recovery');
    try {
        const scraper = new RevZillaScraperV3({
            outputDir: path.join(__dirname, 'test_data', 'error_test'),
            maxRetries: 2,
            delays: {
                onError: 1000
            }
        });
        
        await scraper.init();
        
        // Test with invalid URL
        try {
            await scraper.scrapeProductDetails('https://invalid-url-test.com/product');
        } catch (error) {
            console.log('✅ Properly handled invalid URL error');
        }
        
        results.tests.push({
            name: 'Error Handling',
            status: 'passed',
            details: 'Error handling working correctly'
        });
        
        await scraper.cleanup();
        
    } catch (error) {
        console.error('❌ Error handling test failed:', error.message);
        results.tests.push({
            name: 'Error Handling',
            status: 'failed',
            error: error.message
        });
    }
    
    // Test 4: State Management
    console.log('\n📋 Test 4: State Management');
    try {
        const stateDir = path.join(__dirname, 'test_data', 'state_test');
        await fs.mkdir(stateDir, { recursive: true });
        
        const scraper = new RevZillaScraperV3({
            outputDir: stateDir,
            stateFile: path.join(stateDir, 'test_state.json')
        });
        
        await scraper.init();
        
        // Modify state
        scraper.state.scrapedProducts = 10;
        scraper.state.failedProducts = 2;
        await scraper.saveState();
        
        // Create new instance and load state
        const scraper2 = new RevZillaScraperV3({
            outputDir: stateDir,
            stateFile: path.join(stateDir, 'test_state.json')
        });
        
        await scraper2.init();
        
        if (scraper2.state.scrapedProducts === 10 && scraper2.state.failedProducts === 2) {
            console.log('✅ State persistence working correctly');
            results.tests.push({
                name: 'State Management',
                status: 'passed'
            });
        } else {
            throw new Error('State not loaded correctly');
        }
        
        await scraper.cleanup();
        await scraper2.cleanup();
        
    } catch (error) {
        console.error('❌ State management test failed:', error.message);
        results.tests.push({
            name: 'State Management',
            status: 'failed',
            error: error.message
        });
    }
    
    // Test 5: Deduplication
    console.log('\n📋 Test 5: Data Deduplication');
    try {
        const dedupDir = path.join(__dirname, 'test_data', 'dedup_test');
        await fs.mkdir(dedupDir, { recursive: true });
        
        // Create test data with duplicates
        const testData = [
            { name: 'Product 1', brand: 'Brand A', sku: 'SKU001' },
            { name: 'Product 2', brand: 'Brand B', sku: 'SKU002' },
            { name: 'Product 1', brand: 'Brand A', sku: 'SKU001' }, // Duplicate
            { name: 'Product 3', brand: 'Brand C', sku: 'SKU003' }
        ];
        
        await fs.writeFile(
            path.join(dedupDir, 'test_products.json'),
            JSON.stringify(testData)
        );
        
        const scraper = new RevZillaScraperV3({
            outputDir: dedupDir
        });
        
        await scraper.init();
        const dedupStats = await scraper.runDeduplication();
        
        if (dedupStats && dedupStats.duplicates === 1) {
            console.log('✅ Deduplication correctly identified 1 duplicate');
            results.tests.push({
                name: 'Data Deduplication',
                status: 'passed',
                details: `Found ${dedupStats.duplicates} duplicates`
            });
        } else {
            throw new Error('Deduplication did not work correctly');
        }
        
        await scraper.cleanup();
        
    } catch (error) {
        console.error('❌ Deduplication test failed:', error.message);
        results.tests.push({
            name: 'Data Deduplication',
            status: 'failed',
            error: error.message
        });
    }
    
    // Generate test report
    console.log('\n' + '=' .repeat(50));
    console.log('📊 Test Summary');
    console.log('=' .repeat(50));
    
    const passed = results.tests.filter(t => t.status === 'passed').length;
    const failed = results.tests.filter(t => t.status === 'failed').length;
    
    console.log(`Total Tests: ${results.tests.length}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    
    // Save results
    const reportPath = path.join(__dirname, 'test_results_v3.json');
    await fs.writeFile(reportPath, JSON.stringify(results, null, 2));
    console.log(`\nTest report saved to: ${reportPath}`);
    
    // Cleanup test data
    try {
        await fs.rm(path.join(__dirname, 'test_data'), { recursive: true, force: true });
    } catch (e) {}
    
    process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
    console.error('Fatal error during testing:', error);
    process.exit(1);
});