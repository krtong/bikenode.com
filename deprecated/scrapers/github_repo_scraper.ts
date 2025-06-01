import { Browser } from "browser";

/**
 * This script navigates to the Stage Hands GitHub repository
 * and extracts the repository description.
 */
async function main() {
  console.log("Starting GitHub repo scraper...");
  const browser = new Browser();
  
  try {
    // Navigate to the Stage Hands GitHub repo
    console.log("Navigating to Stage Hands GitHub repository...");
    await browser.goto("https://github.com/browser-base/stage-hands");
    
    // Extract the repository description
    console.log("Extracting repository information...");
    const repoInfo = await browser.extract({
      description: "string",
      stars: "string",
      lastUpdated: "string" 
    });
    
    console.log("\nRepository Information:");
    console.log(`Description: ${repoInfo.description}`);
    console.log(`Stars: ${repoInfo.stars}`);
    console.log(`Last Updated: ${repoInfo.lastUpdated}`);
    
  } catch (error) {
    console.error("Error occurred:", error);
  } finally {
    // Always close the browser
    await browser.close();
    console.log("Browser closed.");
  }
}

main();
