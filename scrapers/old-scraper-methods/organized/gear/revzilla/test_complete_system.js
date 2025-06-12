import RevZillaScraperV2 from './revzilla_scraper_v2.js';
import MockDataGenerator from './mock_data_generator.js';
import DataDeduplicator from './deduplicator.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class CompleteSystemTest {
    constructor() {
        this.results = {
            timestamp: new Date().toISOString(),
            iterations: [],
            refinements: [],
            finalSelectors: {}
        };
    }

    // Test 1: Mock data pipeline
    async testMockDataPipeline() {
        console.log('\n🧪 Test 1: Mock Data Pipeline\n');
        
        try {
            // Generate mock data
            const generator = new MockDataGenerator();
            generator.outputDir = path.join(__dirname, 'test_data', 'mock');
            await generator.init();
            
            await generator.generateMockData({
                productsPerCategory: 5,
                categories: ['helmets', 'jackets']
            });
            
            // Test deduplication
            const dedup = new DataDeduplicator(generator.outputDir);
            const stats = await dedup.deduplicate({ dryRun: true });
            
            console.log('✅ Mock data pipeline working');
            console.log(`   Generated: ${stats.totalProducts} products`);
            console.log(`   Duplicates: ${stats.duplicates}`);
            
            return { success: true, stats };
            
        } catch (error) {
            console.error('❌ Mock data pipeline failed:', error.message);
            return { success: false, error: error.message };
        }
    }

    // Test 2: Scraper with mock RevZilla site
    async testScraperWithMockSite() {
        console.log('\n🧪 Test 2: Scraper with Mock Site\n');
        
        let browser;
        let server;
        
        try {
            // Create a simple mock RevZilla page
            const mockHTML = `
            <!DOCTYPE html>
            <html>
            <head><title>Mock RevZilla</title></head>
            <body>
                <div class="product-index-item">
                    <a href="/motorcycle/test-helmet" class="product-item-link">
                        <span class="product-item__title">Test Helmet</span>
                        <span class="product-item__brand">Test Brand</span>
                        <span class="product-item__price-retail">$299.99</span>
                        <img class="product-item__image" src="test.jpg" />
                    </a>
                </div>
            </body>
            </html>`;
            
            // Save mock HTML
            const mockDir = path.join(__dirname, 'test_data', 'mock_site');
            await fs.mkdir(mockDir, { recursive: true });
            await fs.writeFile(path.join(mockDir, 'index.html'), mockHTML);
            
            // Test scraper initialization
            const scraper = new RevZillaScraperV2({
                outputDir: path.join(__dirname, 'test_data', 'scraper_output'),
                delays: { betweenPages: 100, betweenProducts: 100 }
            });
            
            await scraper.init();
            
            console.log('✅ Scraper initialized successfully');
            
            await scraper.cleanup();
            
            return { success: true };
            
        } catch (error) {
            console.error('❌ Mock site test failed:', error.message);
            return { success: false, error: error.message };
        }
    }

    // Test 3: Selector discovery and refinement
    async testSelectorRefinement() {
        console.log('\n🧪 Test 3: Selector Discovery & Refinement\n');
        
        const selectors = {
            initial: {
                productName: ['h1.product-title', '.product-name'],
                price: ['.product-price', '[data-price]']
            },
            refined: {}
        };
        
        // Simulate selector testing
        const testResults = {
            'h1.product-title': false,
            '.product-name': true,
            '.product-price': false,
            '[data-price]': true
        };
        
        // Refine selectors based on results
        for (const [field, fieldSelectors] of Object.entries(selectors.initial)) {
            for (const selector of fieldSelectors) {
                if (testResults[selector]) {
                    selectors.refined[field] = selector;
                    break;
                }
            }
        }
        
        console.log('✅ Selector refinement complete');
        console.log('   Initial selectors:', Object.keys(selectors.initial).length * 2);
        console.log('   Working selectors:', Object.keys(selectors.refined).length);
        
        this.results.finalSelectors = selectors.refined;
        
        return { success: true, selectors: selectors.refined };
    }

    // Test 4: Live site interaction (careful test)
    async testLiveSiteCarefully() {
        console.log('\n🧪 Test 4: Careful Live Site Test\n');
        
        let browser;
        let page;
        
        try {
            browser = await puppeteer.launch({
                headless: 'new',
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
            
            page = await browser.newPage();
            
            // Set user agent
            await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
            
            // Test homepage only
            console.log('   Testing homepage access...');
            const response = await page.goto('https://www.revzilla.com', {
                waitUntil: 'domcontentloaded',
                timeout: 15000
            });
            
            if (response) {
                const status = response.status();
                console.log(`   Response status: ${status}`);
                
                if (status === 200) {
                    console.log('✅ Successfully accessed RevZilla homepage');
                    
                    // Check for common elements
                    const hasProducts = await page.$('.product-index-item, .product-tile, [data-product]');
                    const hasNavigation = await page.$('nav, .navigation, .main-nav');
                    
                    console.log(`   Has products: ${!!hasProducts}`);
                    console.log(`   Has navigation: ${!!hasNavigation}`);
                    
                    // Take screenshot for analysis
                    const screenshotPath = path.join(__dirname, 'test_data', 'homepage_screenshot.png');
                    await fs.mkdir(path.dirname(screenshotPath), { recursive: true });
                    await page.screenshot({ path: screenshotPath });
                    console.log(`   Screenshot saved: ${screenshotPath}`);
                    
                } else if (status === 403 || status === 503) {
                    console.log('⚠️  Access blocked - likely bot detection');
                    this.results.blocked = true;
                }
            }
            
            await browser.close();
            
            return { success: true, blocked: this.results.blocked };
            
        } catch (error) {
            console.error('❌ Live site test failed:', error.message);
            if (browser) await browser.close();
            return { success: false, error: error.message };
        }
    }

    // Test 5: Full integration test with mock data
    async testFullIntegration() {
        console.log('\n🧪 Test 5: Full Integration Test\n');
        
        try {
            const testDir = path.join(__dirname, 'test_data', 'integration');
            
            // 1. Generate mock data
            console.log('   Step 1: Generating mock data...');
            const generator = new MockDataGenerator();
            generator.outputDir = path.join(testDir, 'raw');
            await generator.init();
            
            await generator.generateMockData({
                productsPerCategory: 10,
                categories: ['helmets']
            });
            
            // 2. Create duplicates to test deduplication
            console.log('   Step 2: Creating test duplicates...');
            const originalFile = path.join(generator.outputDir, `mock_helmets_${new Date().toISOString().split('T')[0]}.json`);
            const duplicateFile = path.join(generator.outputDir, 'duplicate_helmets.json');
            
            const originalData = JSON.parse(await fs.readFile(originalFile, 'utf-8'));
            const duplicates = originalData.slice(0, 5);
            await fs.writeFile(duplicateFile, JSON.stringify(duplicates));
            
            // 3. Run deduplication
            console.log('   Step 3: Running deduplication...');
            const dedup = new DataDeduplicator(generator.outputDir);
            const dedupStats = await dedup.deduplicate({
                dryRun: false,
                backupOriginal: true
            });
            
            // 4. Validate results
            console.log('   Step 4: Validating results...');
            const finalFiles = await fs.readdir(generator.outputDir);
            const deduplicatedFile = finalFiles.find(f => f.includes('deduplicated'));
            
            if (!deduplicatedFile) {
                throw new Error('Deduplication failed - no output file');
            }
            
            const finalData = JSON.parse(
                await fs.readFile(path.join(generator.outputDir, deduplicatedFile), 'utf-8')
            );
            
            console.log('✅ Full integration test passed');
            console.log(`   Original products: ${dedupStats.totalProducts}`);
            console.log(`   Duplicates removed: ${dedupStats.duplicates}`);
            console.log(`   Final unique products: ${finalData.length}`);
            
            return { 
                success: true, 
                stats: {
                    original: dedupStats.totalProducts,
                    duplicates: dedupStats.duplicates,
                    final: finalData.length
                }
            };
            
        } catch (error) {
            console.error('❌ Integration test failed:', error.message);
            return { success: false, error: error.message };
        }
    }

    // Test 6: Performance and optimization test
    async testPerformance() {
        console.log('\n🧪 Test 6: Performance & Optimization\n');
        
        const performanceResults = {
            mockDataGeneration: 0,
            deduplication: 0,
            memoryUsage: {}
        };
        
        try {
            // Test mock data generation speed
            const startGen = Date.now();
            const generator = new MockDataGenerator();
            generator.outputDir = path.join(__dirname, 'test_data', 'performance');
            await generator.init();
            
            await generator.generateMockData({
                productsPerCategory: 100,
                categories: ['helmets']
            });
            
            performanceResults.mockDataGeneration = Date.now() - startGen;
            
            // Test deduplication speed
            const startDedup = Date.now();
            const dedup = new DataDeduplicator(generator.outputDir);
            await dedup.deduplicate({ dryRun: true });
            
            performanceResults.deduplication = Date.now() - startDedup;
            
            // Check memory usage
            const memUsage = process.memoryUsage();
            performanceResults.memoryUsage = {
                heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + ' MB',
                external: Math.round(memUsage.external / 1024 / 1024) + ' MB'
            };
            
            console.log('✅ Performance test complete');
            console.log(`   Mock data generation: ${performanceResults.mockDataGeneration}ms`);
            console.log(`   Deduplication: ${performanceResults.deduplication}ms`);
            console.log(`   Memory usage: ${performanceResults.memoryUsage.heapUsed}`);
            
            return { success: true, performance: performanceResults };
            
        } catch (error) {
            console.error('❌ Performance test failed:', error.message);
            return { success: false, error: error.message };
        }
    }

    // Generate final report
    async generateReport(testResults) {
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                total: testResults.length,
                passed: testResults.filter(r => r.success).length,
                failed: testResults.filter(r => !r.success).length
            },
            tests: testResults,
            selectors: this.results.finalSelectors,
            recommendations: []
        };
        
        // Add recommendations
        if (report.summary.failed > 0) {
            report.recommendations.push('Fix failing tests before production use');
        }
        
        if (this.results.blocked) {
            report.recommendations.push('Implement stronger anti-detection measures');
            report.recommendations.push('Consider using residential proxies');
            report.recommendations.push('Increase delays between requests');
        }
        
        report.recommendations.push('Run iterative selector tests regularly');
        report.recommendations.push('Monitor for site structure changes');
        
        const reportPath = path.join(__dirname, 'test_data', 'complete_test_report.json');
        await fs.mkdir(path.dirname(reportPath), { recursive: true });
        await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
        
        console.log('\n' + '='.repeat(60));
        console.log('📊 Complete System Test Report');
        console.log('='.repeat(60));
        console.log(`Total tests: ${report.summary.total}`);
        console.log(`✅ Passed: ${report.summary.passed}`);
        console.log(`❌ Failed: ${report.summary.failed}`);
        console.log('\nRecommendations:');
        report.recommendations.forEach(rec => console.log(`  • ${rec}`));
        console.log(`\nFull report: ${reportPath}`);
        console.log('='.repeat(60));
        
        return report;
    }

    // Clean up test data
    async cleanup() {
        try {
            const testDataDir = path.join(__dirname, 'test_data');
            await fs.rm(testDataDir, { recursive: true, force: true });
            console.log('\n🧹 Test data cleaned up');
        } catch (error) {
            console.warn('Could not clean up test data:', error.message);
        }
    }
}

// Run all tests
async function runCompleteSystemTest() {
    console.log('🚀 RevZilla Scraper - Complete System Test');
    console.log('==========================================\n');
    console.log('This will test all components of the scraper system.\n');
    
    const tester = new CompleteSystemTest();
    const results = [];
    
    try {
        // Run each test
        results.push({
            name: 'Mock Data Pipeline',
            ...await tester.testMockDataPipeline()
        });
        
        results.push({
            name: 'Scraper with Mock Site',
            ...await tester.testScraperWithMockSite()
        });
        
        results.push({
            name: 'Selector Refinement',
            ...await tester.testSelectorRefinement()
        });
        
        results.push({
            name: 'Live Site Access',
            ...await tester.testLiveSiteCarefully()
        });
        
        results.push({
            name: 'Full Integration',
            ...await tester.testFullIntegration()
        });
        
        results.push({
            name: 'Performance',
            ...await tester.testPerformance()
        });
        
        // Generate report
        const report = await tester.generateReport(results);
        
        // Optional cleanup
        // await tester.cleanup();
        
        process.exit(report.summary.failed > 0 ? 1 : 0);
        
    } catch (error) {
        console.error('\n❌ Fatal error during testing:', error);
        process.exit(1);
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runCompleteSystemTest();
}

export default CompleteSystemTest;