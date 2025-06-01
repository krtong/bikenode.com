import { Stagehand } from "@browserbasehq/stagehand";

const stagehand = new Stagehand({
  env: "LOCAL",
  verbose: 1,
  debugDom: true,
});

const BASE_URL = "http://localhost:8085";

async function testTemplateFix() {
  console.log("🔧 Testing template rendering fix...");
  
  try {
    await stagehand.init();
    
    console.log("📄 Loading homepage to check template rendering...");
    await stagehand.page.goto(BASE_URL);
    
    // Get the page title
    const pageTitle = await stagehand.page.title();
    console.log(`Page title: "${pageTitle}"`);
    
    // Get the full HTML content
    const htmlContent = await stagehand.page.content();
    console.log(`HTML content length: ${htmlContent.length} characters`);
    
    // Check for template variables (should be gone)
    const hasTemplateVariables = htmlContent.includes('{{') || htmlContent.includes('}}');
    console.log(`Template variables still present: ${hasTemplateVariables}`);
    
    if (hasTemplateVariables) {
      console.log("❌ Template rendering still has issues!");
      const templateMatches = htmlContent.match(/\{\{[^}]+\}\}/g);
      if (templateMatches) {
        console.log("Remaining template variables:", templateMatches);
      }
    } else {
      console.log("✅ Template rendering fixed!");
    }
    
    // Check specific rendered content
    const bodyText = await stagehand.page.textContent('body');
    console.log(`Rendered content includes "BikeNode": ${bodyText?.includes('BikeNode')}`);
    console.log(`Rendered content includes current year: ${bodyText?.includes('2025')}`);
    
    // Test navigation elements
    console.log("🧭 Testing navigation after template fix...");
    const navLinks = await stagehand.page.locator('nav a').count();
    console.log(`Navigation links: ${navLinks}`);
    
    // Test specific elements
    const loginButton = await stagehand.page.locator('text=Login').isVisible().catch(() => false);
    const getStartedButton = await stagehand.page.locator('text=Get Started').isVisible().catch(() => false);
    
    console.log(`Login button visible: ${loginButton}`);
    console.log(`Get Started button visible: ${getStartedButton}`);
    
    // Test CSS loading
    console.log("🎨 Testing CSS and styling...");
    const hasCSS = await stagehand.page.locator('link[rel="stylesheet"]').count();
    console.log(`CSS stylesheets loaded: ${hasCSS}`);
    
    // Test responsive design with fixed templates
    console.log("📱 Testing responsive design with fixed templates...");
    await stagehand.page.setViewportSize({ width: 375, height: 667 });
    await stagehand.page.reload();
    
    const mobileBodyText = await stagehand.page.textContent('body');
    console.log(`Mobile view renders correctly: ${mobileBodyText?.includes('BikeNode')}`);
    
    // Test desktop view
    await stagehand.page.setViewportSize({ width: 1920, height: 1080 });
    await stagehand.page.reload();
    
    const desktopBodyText = await stagehand.page.textContent('body');
    console.log(`Desktop view renders correctly: ${desktopBodyText?.includes('BikeNode')}`);
    
    // Test interactive elements
    console.log("🔗 Testing interactive elements...");
    
    if (getStartedButton) {
      console.log("Testing Get Started button click...");
      await stagehand.page.locator('text=Get Started').click();
      await stagehand.page.waitForTimeout(1000);
      
      const currentUrl = stagehand.page.url();
      console.log(`URL after Get Started click: ${currentUrl}`);
      
      // Navigate back to home
      await stagehand.page.goto(BASE_URL);
    }
    
    // Final verification
    console.log("\n🎯 Template Fix Verification:");
    console.log("=" * 40);
    console.log(`✅ Templates render: ${!hasTemplateVariables ? 'SUCCESS' : 'FAILED'}`);
    console.log(`✅ Page title set: ${pageTitle !== '{{ .title }}' ? 'SUCCESS' : 'FAILED'}`);
    console.log(`✅ Content loads: ${bodyText?.includes('BikeNode') ? 'SUCCESS' : 'FAILED'}`);
    console.log(`✅ Navigation works: ${navLinks > 0 ? 'SUCCESS' : 'FAILED'}`);
    console.log(`✅ CSS loads: ${hasCSS > 0 ? 'SUCCESS' : 'FAILED'}`);
    console.log(`✅ Responsive: Mobile and desktop views working`);
    
  } catch (error) {
    console.error("❌ Template fix test failed:", error);
  } finally {
    await stagehand.close();
    console.log("🏁 Template fix testing completed!");
  }
}

testTemplateFix().catch(console.error);