import { Stagehand } from "@browserbasehq/stagehand";
import { z } from "zod";

const stagehand = new Stagehand({
  env: "LOCAL", // or "BROWSERBASE"
  verbose: 1,
  debugDom: true,
});

// Test configuration
const BASE_URL = "http://localhost:8084";

async function testBikeNodeUI() {
  console.log("🚀 Starting BikeNode UI testing with Stagehand...");
  
  try {
    await stagehand.init();
    
    // Test 1: Homepage loading and navigation
    console.log("📋 Test 1: Loading homepage...");
    await stagehand.page.goto(BASE_URL);
    
    const pageTitle = await stagehand.page.title();
    console.log(`Page title: ${pageTitle}`);
    
    // Check if the page loads correctly
    const bodyText = await stagehand.page.textContent('body');
    console.log(`Page loaded with content length: ${bodyText?.length || 0} characters`);
    
    // Test 2: Authentication system
    console.log("🔐 Test 2: Testing authentication...");
    
    // Look for login/auth buttons
    const loginExists = await stagehand.page.locator('text=Login').isVisible().catch(() => false);
    const signupExists = await stagehand.page.locator('text=Sign Up').isVisible().catch(() => false);
    const discordAuthExists = await stagehand.page.locator('text=Discord').isVisible().catch(() => false);
    
    console.log(`Authentication elements found:`);
    console.log(`- Login button: ${loginExists}`);
    console.log(`- Signup button: ${signupExists}`);
    console.log(`- Discord auth: ${discordAuthExists}`);
    
    // Test 3: Navigation and UI structure
    console.log("🧭 Test 3: Testing navigation structure...");
    
    // Check for common navigation elements
    const navElements = await stagehand.page.locator('nav').count();
    const headerElements = await stagehand.page.locator('header').count();
    const footerElements = await stagehand.page.locator('footer').count();
    
    console.log(`Navigation structure:`);
    console.log(`- Nav elements: ${navElements}`);
    console.log(`- Header elements: ${headerElements}`);
    console.log(`- Footer elements: ${footerElements}`);
    
    // Test 4: Search functionality
    console.log("🔍 Test 4: Testing search functionality...");
    
    // Look for search elements
    const searchInput = await stagehand.page.locator('input[type="search"], input[placeholder*="search"], input[placeholder*="Search"]').first().isVisible().catch(() => false);
    const searchButton = await stagehand.page.locator('button:has-text("Search"), input[type="submit"]').first().isVisible().catch(() => false);
    
    console.log(`Search functionality:`);
    console.log(`- Search input: ${searchInput}`);
    console.log(`- Search button: ${searchButton}`);
    
    if (searchInput) {
      console.log("🎯 Testing search interaction...");
      await stagehand.page.locator('input[type="search"], input[placeholder*="search"], input[placeholder*="Search"]').first().fill("Trek");
      
      // Check if search produces results or updates UI
      await stagehand.page.waitForTimeout(1000);
      const updatedBodyText = await stagehand.page.textContent('body');
      console.log(`Search interaction completed, content length: ${updatedBodyText?.length || 0}`);
    }
    
    // Test 5: API endpoints and connectivity
    console.log("🌐 Test 5: Testing API connectivity...");
    
    // Test health check endpoint
    const healthResponse = await stagehand.page.goto(`${BASE_URL}/api/health`);
    const healthStatus = healthResponse?.status();
    console.log(`Health check status: ${healthStatus}`);
    
    if (healthStatus === 200) {
      const healthData = await stagehand.page.textContent('body');
      console.log(`Health check response: ${healthData}`);
    }
    
    // Test 6: Responsive design and mobile layout
    console.log("📱 Test 6: Testing responsive design...");
    
    // Test mobile viewport
    await stagehand.page.setViewportSize({ width: 375, height: 667 });
    await stagehand.page.goto(BASE_URL);
    
    const mobileBodyText = await stagehand.page.textContent('body');
    console.log(`Mobile view loaded, content length: ${mobileBodyText?.length || 0}`);
    
    // Test desktop viewport
    await stagehand.page.setViewportSize({ width: 1920, height: 1080 });
    await stagehand.page.goto(BASE_URL);
    
    const desktopBodyText = await stagehand.page.textContent('body');
    console.log(`Desktop view loaded, content length: ${desktopBodyText?.length || 0}`);
    
    // Test 7: Form interactions
    console.log("📝 Test 7: Testing form interactions...");
    
    // Look for forms on the page
    const formCount = await stagehand.page.locator('form').count();
    console.log(`Forms found: ${formCount}`);
    
    if (formCount > 0) {
      // Test first form interaction
      const firstFormInputs = await stagehand.page.locator('form').first().locator('input').count();
      console.log(`First form has ${firstFormInputs} input fields`);
    }
    
    // Test 8: JavaScript functionality
    console.log("⚡ Test 8: Testing JavaScript functionality...");
    
    // Check for console errors
    const consoleErrors = [];
    stagehand.page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Navigate and interact to trigger JS
    await stagehand.page.goto(BASE_URL);
    await stagehand.page.waitForTimeout(2000);
    
    console.log(`JavaScript errors found: ${consoleErrors.length}`);
    if (consoleErrors.length > 0) {
      console.log("Console errors:", consoleErrors);
    }
    
    // Test 9: Performance metrics
    console.log("⚡ Test 9: Basic performance metrics...");
    
    const startTime = Date.now();
    await stagehand.page.goto(BASE_URL);
    const loadTime = Date.now() - startTime;
    
    console.log(`Page load time: ${loadTime}ms`);
    
    // Summary report
    console.log("\n📊 UI Testing Summary:");
    console.log("=" * 50);
    console.log(`✅ Homepage accessible: ${pageTitle ? 'Yes' : 'No'}`);
    console.log(`🔐 Authentication UI: ${loginExists || signupExists || discordAuthExists ? 'Present' : 'Missing'}`);
    console.log(`🔍 Search functionality: ${searchInput ? 'Present' : 'Missing'}`);
    console.log(`🌐 API health: ${healthStatus === 200 ? 'Healthy' : 'Issues detected'}`);
    console.log(`📱 Responsive design: Tested mobile + desktop`);
    console.log(`⚡ Page performance: ${loadTime}ms load time`);
    console.log(`🐛 JavaScript errors: ${consoleErrors.length} found`);
    
  } catch (error) {
    console.error("❌ Test failed:", error);
  } finally {
    await stagehand.close();
    console.log("🏁 UI testing completed!");
  }
}

// Run the tests
testBikeNodeUI().catch(console.error);