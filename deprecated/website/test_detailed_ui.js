import { Stagehand } from "@browserbasehq/stagehand";

const stagehand = new Stagehand({
  env: "LOCAL",
  verbose: 1,
  debugDom: true,
});

const BASE_URL = "http://localhost:8084";

async function testDetailedUI() {
  console.log("🔍 Starting detailed BikeNode UI analysis...");
  
  try {
    await stagehand.init();
    
    // Test the actual UI content and structure
    console.log("📄 Loading homepage and analyzing content...");
    await stagehand.page.goto(BASE_URL);
    
    // Get the full HTML content for analysis
    const htmlContent = await stagehand.page.content();
    console.log(`Full HTML length: ${htmlContent.length} characters`);
    
    // Check for template rendering issues
    const hasTemplateVariables = htmlContent.includes('{{') || htmlContent.includes('}}');
    console.log(`Template variables found: ${hasTemplateVariables}`);
    
    if (hasTemplateVariables) {
      console.log("⚠️  Template rendering issue detected!");
      
      // Extract template variables
      const templateMatches = htmlContent.match(/\{\{[^}]+\}\}/g);
      if (templateMatches) {
        console.log("Template variables found:", templateMatches);
      }
    }
    
    // Check specific UI elements
    console.log("🎯 Analyzing specific UI elements...");
    
    // Look for main content areas
    const mainContent = await stagehand.page.locator('main, .main, #main').count();
    const contentDiv = await stagehand.page.locator('div.content, .content-wrapper').count();
    
    console.log(`Main content areas: ${mainContent}`);
    console.log(`Content divs: ${contentDiv}`);
    
    // Check for navigation
    const navLinks = await stagehand.page.locator('nav a, header a').count();
    console.log(`Navigation links: ${navLinks}`);
    
    // Test authentication flows
    console.log("🔐 Testing authentication interface...");
    
    const loginButtonExists = await stagehand.page.locator('text=Login').isVisible().catch(() => false);
    if (loginButtonExists) {
      console.log("🔓 Found Login button, testing interaction...");
      await stagehand.page.locator('text=Login').click();
      await stagehand.page.waitForTimeout(1000);
      
      // Check if login form or redirect occurred
      const currentUrl = stagehand.page.url();
      console.log(`URL after login click: ${currentUrl}`);
      
      // Look for login form elements
      const usernameField = await stagehand.page.locator('input[type="text"], input[type="email"], input[name*="user"], input[name*="email"]').isVisible().catch(() => false);
      const passwordField = await stagehand.page.locator('input[type="password"]').isVisible().catch(() => false);
      
      console.log(`Username/email field: ${usernameField}`);
      console.log(`Password field: ${passwordField}`);
    }
    
    // Test bike search if available
    console.log("🚲 Testing bike search interface...");
    
    // Navigate to bike search page if it exists
    const bikeSearchLink = await stagehand.page.locator('a[href*="search"], a[href*="bike"], text="Search"').first().isVisible().catch(() => false);
    
    if (bikeSearchLink) {
      console.log("🔍 Found bike search link, testing...");
      await stagehand.page.locator('a[href*="search"], a[href*="bike"], text="Search"').first().click();
      await stagehand.page.waitForTimeout(1000);
      
      const searchUrl = stagehand.page.url();
      console.log(`Search page URL: ${searchUrl}`);
      
      // Test search functionality
      const searchForm = await stagehand.page.locator('form').count();
      const searchInputs = await stagehand.page.locator('input').count();
      
      console.log(`Search forms: ${searchForm}`);
      console.log(`Search inputs: ${searchInputs}`);
    }
    
    // Test API endpoints that should be available
    console.log("🌐 Testing API endpoints...");
    
    const endpoints = [
      '/api/health',
      '/api/bikes/search',
      '/api/user/profile',
      '/auth/login',
      '/auth/discord'
    ];
    
    for (const endpoint of endpoints) {
      try {
        const response = await stagehand.page.goto(`${BASE_URL}${endpoint}`);
        const status = response?.status();
        console.log(`${endpoint}: ${status}`);
        
        if (status === 200 && endpoint === '/api/bikes/search') {
          const searchContent = await stagehand.page.textContent('body');
          console.log(`Search API response length: ${searchContent?.length || 0}`);
        }
      } catch (error) {
        console.log(`${endpoint}: Error - ${error.message}`);
      }
    }
    
    // Test JavaScript functionality and interactions
    console.log("⚡ Testing JavaScript interactions...");
    
    await stagehand.page.goto(BASE_URL);
    
    // Try to interact with dynamic elements
    const buttons = await stagehand.page.locator('button').count();
    const clickableElements = await stagehand.page.locator('[onclick], .btn, .button').count();
    
    console.log(`Buttons found: ${buttons}`);
    console.log(`Clickable elements: ${clickableElements}`);
    
    // Test form submissions if any forms exist
    const forms = await stagehand.page.locator('form').count();
    if (forms > 0) {
      console.log(`📝 Testing form interaction (${forms} forms found)...`);
      
      // Test first form if it has inputs
      const firstFormInputs = await stagehand.page.locator('form').first().locator('input').count();
      if (firstFormInputs > 0) {
        console.log(`First form has ${firstFormInputs} inputs`);
        
        // Try to fill out and submit
        const firstInput = stagehand.page.locator('form input').first();
        const inputType = await firstInput.getAttribute('type');
        console.log(`First input type: ${inputType}`);
        
        if (inputType === 'text' || inputType === 'email' || !inputType) {
          await firstInput.fill('test@example.com');
          console.log("Filled first input with test data");
        }
      }
    }
    
    // Check for mobile responsiveness
    console.log("📱 Testing mobile responsiveness...");
    
    await stagehand.page.setViewportSize({ width: 375, height: 667 });
    await stagehand.page.goto(BASE_URL);
    
    const mobileBodyContent = await stagehand.page.textContent('body');
    const mobileNavigationVisible = await stagehand.page.locator('nav').isVisible().catch(() => false);
    
    console.log(`Mobile view content length: ${mobileBodyContent?.length || 0}`);
    console.log(`Mobile navigation visible: ${mobileNavigationVisible}`);
    
    // Check for hamburger menu or mobile navigation
    const hamburgerMenu = await stagehand.page.locator('.hamburger, .menu-toggle, .mobile-menu').isVisible().catch(() => false);
    console.log(`Mobile hamburger menu: ${hamburgerMenu}`);
    
    // Generate detailed report
    console.log("\n🔍 Detailed UI Analysis Report:");
    console.log("=" * 60);
    console.log(`🏠 Homepage Status: ${hasTemplateVariables ? 'Template rendering issues' : 'Rendering correctly'}`);
    console.log(`🔐 Authentication: ${loginButtonExists ? 'UI present' : 'Missing UI elements'}`);
    console.log(`🚲 Bike Search: ${bikeSearchLink ? 'Available' : 'Not found'}`);
    console.log(`📱 Mobile Support: ${mobileNavigationVisible ? 'Responsive' : 'Needs improvement'}`);
    console.log(`⚡ Interactivity: ${buttons > 0 ? `${buttons} interactive elements` : 'Limited interactivity'}`);
    console.log(`📝 Forms: ${forms > 0 ? `${forms} forms available` : 'No forms found'}`);
    
  } catch (error) {
    console.error("❌ Detailed test failed:", error);
  } finally {
    await stagehand.close();
    console.log("🏁 Detailed UI testing completed!");
  }
}

testDetailedUI().catch(console.error);