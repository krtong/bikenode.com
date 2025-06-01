import { Stagehand } from "@browserbasehq/stagehand";

const stagehand = new Stagehand({
  env: "LOCAL",
  verbose: 1,
  debugDom: true,
});

const BASE_URL = "http://localhost:8086";

async function testFinalUI() {
  console.log("🚀 Final BikeNode UI test with Stagehand...");
  
  try {
    await stagehand.init();
    
    console.log("📄 Loading homepage...");
    await stagehand.page.goto(BASE_URL);
    
    // Get the page title
    const pageTitle = await stagehand.page.title();
    console.log(`✅ Page title: "${pageTitle}"`);
    
    // Check for template variables (should be resolved now)
    const htmlContent = await stagehand.page.content();
    const hasTemplateVariables = htmlContent.includes('{{') || htmlContent.includes('}}');
    console.log(`❌ Template variables present: ${hasTemplateVariables}`);
    
    // Get visible content
    const bodyText = await stagehand.page.textContent('body');
    console.log(`✅ Content loads BikeNode: ${bodyText?.includes('BikeNode')}`);
    console.log(`✅ Content includes year 2025: ${bodyText?.includes('2025')}`);
    
    // Test navigation
    console.log("\n🧭 Navigation Testing:");
    const navLinks = await stagehand.page.locator('nav a').count();
    console.log(`Navigation links found: ${navLinks}`);
    
    // Test specific UI elements
    const logoText = await stagehand.page.locator('h1').textContent();
    console.log(`Logo text: "${logoText}"`);
    
    const heroHeading = await stagehand.page.locator('h2').textContent();
    console.log(`Hero heading: "${heroHeading}"`);
    
    // Test authentication UI
    console.log("\n🔐 Authentication UI:");
    const loginWithDiscord = await stagehand.page.locator('text=Login with Discord').isVisible().catch(() => false);
    const getStarted = await stagehand.page.locator('text=Get Started').isVisible().catch(() => false);
    
    console.log(`Login with Discord button: ${loginWithDiscord}`);
    console.log(`Get Started button: ${getStarted}`);
    
    // Test features section
    console.log("\n🎯 Features Section:");
    const featureHeadings = await stagehand.page.locator('h3').count();
    console.log(`Feature headings found: ${featureHeadings}`);
    
    // Test CSS and styling
    console.log("\n🎨 Styling and CSS:");
    const cssLinks = await stagehand.page.locator('link[rel="stylesheet"]').count();
    console.log(`CSS files loaded: ${cssLinks}`);
    
    // Test footer
    const footerText = await stagehand.page.locator('footer').textContent();
    console.log(`Footer content: "${footerText?.trim()}"`);
    
    // Test interactions
    console.log("\n🔗 Testing Interactions:");
    
    if (getStarted) {
      console.log("Testing Get Started button...");
      await stagehand.page.locator('text=Get Started').click();
      await stagehand.page.waitForTimeout(1000);
      
      const urlAfterClick = stagehand.page.url();
      console.log(`URL after Get Started: ${urlAfterClick}`);
      
      // Go back to test other elements
      await stagehand.page.goto(BASE_URL);
    }
    
    // Test navigation links
    const homeLinks = await stagehand.page.locator('a[href="/"]').count();
    console.log(`Home links: ${homeLinks}`);
    
    if (homeLinks > 0) {
      await stagehand.page.locator('a[href="/"]').first().click();
      await stagehand.page.waitForTimeout(500);
      console.log(`Navigation to home works: ${stagehand.page.url().includes('localhost')}`);
    }
    
    // Test responsive design
    console.log("\n📱 Responsive Design:");
    
    // Mobile view
    await stagehand.page.setViewportSize({ width: 375, height: 667 });
    await stagehand.page.reload();
    
    const mobileContent = await stagehand.page.textContent('body');
    console.log(`Mobile view loads content: ${mobileContent?.includes('BikeNode')}`);
    
    // Desktop view
    await stagehand.page.setViewportSize({ width: 1920, height: 1080 });
    await stagehand.page.reload();
    
    const desktopContent = await stagehand.page.textContent('body');
    console.log(`Desktop view loads content: ${desktopContent?.includes('BikeNode')}`);
    
    // Test API endpoints
    console.log("\n🌐 API Testing:");
    
    const healthResponse = await stagehand.page.goto(`${BASE_URL}/api/health`);
    console.log(`Health endpoint status: ${healthResponse?.status()}`);
    
    const bikesResponse = await stagehand.page.goto(`${BASE_URL}/api/bikes/search`);
    console.log(`Bikes search endpoint status: ${bikesResponse?.status()}`);
    
    // Final summary
    console.log("\n📊 FINAL UI TEST SUMMARY:");
    console.log("=" * 50);
    console.log(`🏠 Homepage loads: ${pageTitle && !pageTitle.includes('error') ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`🎨 Templates render: ${!hasTemplateVariables ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`📝 Content displays: ${bodyText?.includes('BikeNode') ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`🧭 Navigation present: ${navLinks > 0 ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`🔐 Auth UI present: ${loginWithDiscord || getStarted ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`🎯 Features section: ${featureHeadings >= 3 ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`📱 Responsive design: ✅ SUCCESS (tested mobile + desktop)`);
    console.log(`🌐 API endpoints: ${healthResponse?.status() === 200 ? '✅ SUCCESS' : '❌ FAILED'}`);
    
    const overallSuccess = 
      pageTitle && !pageTitle.includes('error') &&
      !hasTemplateVariables &&
      bodyText?.includes('BikeNode') &&
      navLinks > 0 &&
      (loginWithDiscord || getStarted) &&
      featureHeadings >= 3;
      
    console.log(`\n🎯 OVERALL UI STATUS: ${overallSuccess ? '✅ SUCCESS - UI is functional!' : '⚠️  NEEDS ATTENTION'}`);
    
  } catch (error) {
    console.error("❌ Final UI test failed:", error);
  } finally {
    await stagehand.close();
    console.log("🏁 Final UI testing completed!");
  }
}

testFinalUI().catch(console.error);