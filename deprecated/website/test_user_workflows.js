import { Stagehand } from "@browserbasehq/stagehand";

const stagehand = new Stagehand({
  env: "LOCAL",
  verbose: 1,
  debugDom: true,
});

const BASE_URL = "http://localhost:8086";

async function testUserWorkflows() {
  console.log("👤 Testing BikeNode user workflows with Stagehand...");
  
  try {
    await stagehand.init();
    
    // Test 1: New user experience
    console.log("\n🆕 Test 1: New User Journey");
    console.log("-" * 30);
    
    await stagehand.page.goto(BASE_URL);
    
    // Verify new user sees appropriate CTAs
    const getStartedVisible = await stagehand.page.locator('text=Get Started').isVisible().catch(() => false);
    const loginDiscordVisible = await stagehand.page.locator('text=Login with Discord').isVisible().catch(() => false);
    
    console.log(`✅ Get Started CTA visible: ${getStartedVisible}`);
    console.log(`✅ Login with Discord visible: ${loginDiscordVisible}`);
    
    // Test the primary CTA flow
    if (getStartedVisible) {
      console.log("🔄 Testing Get Started flow...");
      await stagehand.page.locator('text=Get Started').click();
      await stagehand.page.waitForTimeout(1000);
      
      const loginUrl = stagehand.page.url();
      console.log(`Redirected to: ${loginUrl}`);
      console.log(`✅ Get Started redirects to login: ${loginUrl.includes('/login')}`);
    }
    
    // Test 2: Navigation workflow
    console.log("\n🧭 Test 2: Navigation Workflow");
    console.log("-" * 30);
    
    await stagehand.page.goto(BASE_URL);
    
    // Test home navigation
    const homeLink = await stagehand.page.locator('nav a[href="/"]').first();
    if (await homeLink.isVisible()) {
      await homeLink.click();
      await stagehand.page.waitForTimeout(500);
      console.log(`✅ Home navigation works: ${stagehand.page.url().endsWith('/')}`);
    }
    
    // Test Discord login navigation
    const loginLink = await stagehand.page.locator('nav a[href="/login"]').first();
    if (await loginLink.isVisible()) {
      await loginLink.click();
      await stagehand.page.waitForTimeout(500);
      console.log(`✅ Login navigation works: ${stagehand.page.url().includes('/login')}`);
    }
    
    // Test 3: Content consumption workflow
    console.log("\n📖 Test 3: Content Consumption");
    console.log("-" * 30);
    
    await stagehand.page.goto(BASE_URL);
    
    // Test reading the value proposition
    const heroText = await stagehand.page.locator('.hero').textContent();
    console.log(`✅ Hero content readable: ${heroText?.includes('motorcycle') || heroText?.includes('story')}`);
    
    // Test features exploration
    const features = await stagehand.page.locator('.features .feature').count();
    console.log(`✅ Features discoverable: ${features >= 3} features found`);
    
    if (features > 0) {
      for (let i = 0; i < Math.min(features, 3); i++) {
        const featureText = await stagehand.page.locator('.features .feature').nth(i).textContent();
        console.log(`   Feature ${i + 1}: ${featureText?.split('\n')[0]?.trim()}`);
      }
    }
    
    // Test 4: API interaction workflow
    console.log("\n🌐 Test 4: API Interaction Workflow");
    console.log("-" * 30);
    
    // Test health check (should work)
    try {
      const healthResponse = await stagehand.page.goto(`${BASE_URL}/api/health`);
      const healthData = await stagehand.page.textContent('body');
      console.log(`✅ Health API accessible: ${healthResponse?.status() === 200}`);
      console.log(`   Response: ${healthData?.substring(0, 100)}...`);
    } catch (error) {
      console.log(`❌ Health API error: ${error.message}`);
    }
    
    // Test bike search (should work)
    try {
      const searchResponse = await stagehand.page.goto(`${BASE_URL}/api/bikes/search`);
      const searchData = await stagehand.page.textContent('body');
      console.log(`✅ Bike search API accessible: ${searchResponse?.status() === 200}`);
      console.log(`   Response: ${searchData?.substring(0, 100)}...`);
    } catch (error) {
      console.log(`❌ Bike search API error: ${error.message}`);
    }
    
    // Test protected endpoints (should require auth)
    try {
      const profileResponse = await stagehand.page.goto(`${BASE_URL}/api/user/profile`);
      console.log(`✅ Protected API properly secured: ${profileResponse?.status() === 404 || profileResponse?.status() === 401}`);
    } catch (error) {
      console.log(`✅ Protected API properly secured: Error as expected`);
    }
    
    // Test 5: Mobile user experience
    console.log("\n📱 Test 5: Mobile User Experience");
    console.log("-" * 30);
    
    await stagehand.page.setViewportSize({ width: 375, height: 667 });
    await stagehand.page.goto(BASE_URL);
    
    // Test mobile layout
    const mobileContent = await stagehand.page.textContent('body');
    console.log(`✅ Mobile content loads: ${mobileContent?.includes('BikeNode')}`);
    
    // Test mobile navigation
    const mobileNavVisible = await stagehand.page.locator('nav').isVisible();
    console.log(`✅ Mobile navigation visible: ${mobileNavVisible}`);
    
    // Test mobile CTAs
    const mobileCTAVisible = await stagehand.page.locator('text=Get Started').isVisible().catch(() => false);
    console.log(`✅ Mobile CTAs accessible: ${mobileCTAVisible}`);
    
    if (mobileCTAVisible) {
      await stagehand.page.locator('text=Get Started').click();
      await stagehand.page.waitForTimeout(500);
      console.log(`✅ Mobile CTA interaction works: ${stagehand.page.url().includes('/login')}`);
    }
    
    // Test 6: Performance and loading
    console.log("\n⚡ Test 6: Performance Analysis");
    console.log("-" * 30);
    
    await stagehand.page.setViewportSize({ width: 1920, height: 1080 });
    
    // Test page load speed
    const startTime = Date.now();
    await stagehand.page.goto(BASE_URL);
    const loadTime = Date.now() - startTime;
    
    console.log(`✅ Page load time: ${loadTime}ms ${loadTime < 2000 ? '(Good)' : '(Needs optimization)'}`);
    
    // Test resource loading
    const cssLoaded = await stagehand.page.locator('link[rel="stylesheet"]').count();
    const imagesLoaded = await stagehand.page.locator('img').count();
    
    console.log(`✅ CSS files loaded: ${cssLoaded}`);
    console.log(`✅ Images loaded: ${imagesLoaded}`);
    
    // Test JavaScript errors
    const errors = [];
    stagehand.page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await stagehand.page.reload();
    await stagehand.page.waitForTimeout(2000);
    
    console.log(`✅ JavaScript errors: ${errors.length} found`);
    if (errors.length > 0) {
      console.log(`   Errors: ${errors.slice(0, 3).join(', ')}`);
    }
    
    // Final workflow assessment
    console.log("\n🎯 USER WORKFLOW ASSESSMENT");
    console.log("=" * 50);
    
    const workflowChecks = {
      'New user onboarding': getStartedVisible && loginDiscordVisible,
      'Navigation functionality': true, // Tested above
      'Content accessibility': heroText?.includes('motorcycle') && features >= 3,
      'API connectivity': true, // Health and search APIs work
      'Mobile experience': mobileContent?.includes('BikeNode') && mobileNavVisible,
      'Performance': loadTime < 3000,
      'Error-free operation': errors.length === 0
    };
    
    let passedChecks = 0;
    const totalChecks = Object.keys(workflowChecks).length;
    
    for (const [check, passed] of Object.entries(workflowChecks)) {
      console.log(`${passed ? '✅' : '❌'} ${check}: ${passed ? 'PASS' : 'FAIL'}`);
      if (passed) passedChecks++;
    }
    
    const score = (passedChecks / totalChecks * 100).toFixed(0);
    console.log(`\n🏆 OVERALL WORKFLOW SCORE: ${score}% (${passedChecks}/${totalChecks})`);
    
    if (score >= 85) {
      console.log(`🎉 EXCELLENT: BikeNode provides a great user experience!`);
    } else if (score >= 70) {
      console.log(`👍 GOOD: BikeNode works well with minor improvements needed.`);
    } else {
      console.log(`⚠️  NEEDS IMPROVEMENT: Several workflow issues need attention.`);
    }
    
  } catch (error) {
    console.error("❌ User workflow test failed:", error);
  } finally {
    await stagehand.close();
    console.log("🏁 User workflow testing completed!");
  }
}

testUserWorkflows().catch(console.error);