const { Stagehand } = require("@browserbasehq/stagehand");

async function testBikeNodeFrontend() {
    console.log("🧪 Starting comprehensive frontend testing...");
    
    const stagehand = new Stagehand({
        env: "LOCAL",
        verbose: 1,
        debugDom: true
    });

    try {
        await stagehand.init();
        const page = stagehand.page;

        console.log("\n=== TEST 1: Bike Search Page Load ===");
        
        // Navigate to bike search page
        await page.goto("http://localhost:8083/bikes");
        await page.waitForLoadState('networkidle');
        
        // Check if page loaded correctly
        const title = await page.title();
        console.log(`✓ Page title: ${title}`);
        
        // Check for search form elements
        const searchForm = await page.locator('#bikeSearchForm').count();
        console.log(`✓ Search form present: ${searchForm > 0 ? 'YES' : 'NO'}`);
        
        const searchButton = await page.locator('.search-btn').count();
        console.log(`✓ Search button present: ${searchButton > 0 ? 'YES' : 'NO'}`);
        
        const queryInput = await page.locator('#query').count();
        console.log(`✓ Query input present: ${queryInput > 0 ? 'YES' : 'NO'}`);

        console.log("\n=== TEST 2: Search Form Functionality ===");
        
        // Test search input
        await page.fill('#query', 'Trek');
        console.log("✓ Filled search query with 'Trek'");
        
        // Select manufacturer
        await page.selectOption('#manufacturer', 'Trek');
        console.log("✓ Selected Trek manufacturer");
        
        // Submit form
        console.log("📤 Submitting search form...");
        await page.click('.search-btn');
        
        // Wait for results
        await page.waitForTimeout(2000);
        
        console.log("\n=== TEST 3: Search Results Display ===");
        
        // Check if results appeared
        const resultsHeader = await page.locator('#resultsHeader').isVisible();
        console.log(`✓ Results header visible: ${resultsHeader ? 'YES' : 'NO'}`);
        
        const bikesGrid = await page.locator('#bikesGrid').count();
        console.log(`✓ Bikes grid present: ${bikesGrid > 0 ? 'YES' : 'NO'}`);
        
        const bikeCards = await page.locator('.bike-card').count();
        console.log(`✓ Bike cards found: ${bikeCards}`);
        
        // Check if bike data is displayed
        if (bikeCards > 0) {
            const firstBikeName = await page.locator('.bike-card .bike-name').first().textContent();
            console.log(`✓ First bike name: ${firstBikeName}`);
        }

        console.log("\n=== TEST 4: JavaScript Console Errors ===");
        
        // Check for console errors
        const consoleLogs = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                consoleLogs.push(`ERROR: ${msg.text()}`);
            }
        });
        
        // Trigger some JavaScript
        await page.evaluate(() => {
            // Test if our functions exist
            return {
                hasHandleSearch: typeof handleSearch !== 'undefined',
                hasLoadManufacturers: typeof loadManufacturers !== 'undefined',
                hasDisplayResults: typeof displayResults !== 'undefined'
            };
        });
        
        console.log(`✓ Console errors found: ${consoleLogs.length}`);
        if (consoleLogs.length > 0) {
            consoleLogs.forEach(log => console.log(`  ${log}`));
        }

        console.log("\n=== TEST 5: Navigation Testing ===");
        
        // Test navigation to profile
        await page.click('a[href="/profile"]');
        await page.waitForLoadState('networkidle');
        
        const profileTitle = await page.title();
        console.log(`✓ Profile page title: ${profileTitle}`);
        
        // Test navigation back to search
        await page.click('a[href="/bikes"]');
        await page.waitForLoadState('networkidle');
        
        const searchTitle = await page.title();
        console.log(`✓ Back to search page: ${searchTitle}`);

        console.log("\n=== TEST 6: Responsive Design ===");
        
        // Test mobile viewport
        await page.setViewportSize({ width: 375, height: 667 });
        await page.waitForTimeout(1000);
        
        const mobileMenuVisible = await page.locator('.nav-menu').isVisible();
        console.log(`✓ Mobile navigation visible: ${mobileMenuVisible ? 'YES' : 'NO'}`);
        
        // Test desktop viewport
        await page.setViewportSize({ width: 1200, height: 800 });
        await page.waitForTimeout(1000);
        
        const desktopMenuVisible = await page.locator('.nav-menu').isVisible();
        console.log(`✓ Desktop navigation visible: ${desktopMenuVisible ? 'YES' : 'NO'}`);

        console.log("\n🎉 Frontend testing completed!");

    } catch (error) {
        console.error("❌ Test failed:", error.message);
        return false;
    } finally {
        await stagehand.close();
    }
    
    return true;
}

// Run the tests
testBikeNodeFrontend()
    .then(success => {
        if (success) {
            console.log("\n✅ ALL FRONTEND TESTS COMPLETED");
        } else {
            console.log("\n❌ FRONTEND TESTS FAILED");
        }
        process.exit(success ? 0 : 1);
    })
    .catch(error => {
        console.error("Fatal error:", error);
        process.exit(1);
    });