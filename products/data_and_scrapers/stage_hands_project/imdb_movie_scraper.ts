import { Browser } from "browser";

/**
 * This script navigates to IMDb's calendar page and extracts
 * the names of movies coming out this January.
 */
async function main() {
  console.log("Starting IMDb movie scraper...");
  const browser = new Browser();
  
  try {
    // Navigate to IMDb calendar page
    console.log("Navigating to IMDb...");
    await browser.goto("https://www.imdb.com/calendar/");
    
    // Extract movie names for January
    console.log("Extracting January movie releases...");
    const movieData = await browser.extract({
      movies: ["string"]
    });
    
    console.log("\nJanuary Movie Releases:");
    movieData.movies.forEach((movie: string, index: number) => {
      console.log(`${index + 1}. ${movie}`);
    });
    
  } catch (error) {
    console.error("Error occurred:", error);
  } finally {
    // Always close the browser
    await browser.close();
    console.log("Browser closed.");
  }
}

main();
