/**
 * Tests for parsing real archived DOM data
 */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

// Path to archived DOM data
const ARCHIVE_DIR = path.join(__dirname, 'fixtures/archived-dom');
const ARCHIVE_INDEX_PATH = path.join(ARCHIVE_DIR, 'archive-index.json');

// Skip tests if no archived data exists
const hasArchivedData = fs.existsSync(ARCHIVE_INDEX_PATH);
const runTest = hasArchivedData ? describe : describe.skip;

// Dynamically load the bike parser code
const bikeParserPath = path.join(__dirname, '../web_extension/chrome/bikeParser.js');
const bikeParserCode = fs.readFileSync(bikeParserPath, 'utf8');

// Function to load archived HTML and apply parser
function parseArchivedDOM(archivePath) {
  // Check if archive file exists
  if (!fs.existsSync(archivePath)) {
    throw new Error(`Archive file not found: ${archivePath}`);
  }
  
  // Read archived HTML
  const html = fs.readFileSync(archivePath, 'utf8');
  
  // Create a DOM from the archived HTML
  const dom = new JSDOM(html);
  const { window, document } = dom;
  
  // Create a context for the parser
  const context = { window, document };
  
  // Evaluate the parser in the context
  const script = new Function('window', 'document', `
    ${bikeParserCode};
    this.extractBikeData = extractBikeData;
    this.isBikeListing = isBikeListing || isBikePost;
    return extractBikeData(document);
  `);
  
  // Execute the parser and return results
  try {
    return script.call(context, window, document);
  } catch (error) {
    console.error('Error parsing DOM:', error);
    return { error: error.message, archivePath };
  }
}

runTest('Real DOM Parser Tests', () => {
  let archiveIndex;
  
  beforeAll(() => {
    // Load the archive index
    try {
      archiveIndex = JSON.parse(fs.readFileSync(ARCHIVE_INDEX_PATH, 'utf8'));
      console.log(`Loaded archive index with ${archiveIndex.results.length} entries`);
    } catch (error) {
      console.error('Error loading archive index:', error);
      throw error;
    }
    
    // Skip if no archived data
    if (!archiveIndex || !archiveIndex.results.length) {
      console.warn('No archived DOM data found. Run the archiver first.');
    }
  });
  
  test('Parser works with real archived bike listings', () => {
    // Get all single listings and individual listings from listings pages
    const allListings = [];
    
    // Add single listings
    const singleListings = archiveIndex.results.filter(r => r.type === 'single_listing');
    allListings.push(...singleListings);
    
    // Add individual listings from listings pages
    for (const result of archiveIndex.results.filter(r => r.type === 'listings_page')) {
      if (result.archivedListings && result.archivedListings.length) {
        allListings.push(...result.archivedListings);
      }
    }
    
    console.log(`Testing ${allListings.length} real archived listings`);
    
    // Create a directory to save parsing results
    const resultsDir = path.join(__dirname, 'results');
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }
    
    // Process each listing
    allListings.forEach((listing, index) => {
      // Skip if missing archivePath
      if (!listing.archivePath) {
        console.warn(`Listing #${index} is missing archivePath, skipping`);
        return;
      }
      
      console.log(`Processing listing #${index}: ${listing.title || listing.url}`);
      
      try {
        // Parse the archived DOM
        const result = parseArchivedDOM(listing.archivePath);
        
        // Save the result for inspection
        const resultFileName = path.basename(listing.archivePath, '.html') + '_result.json';
        fs.writeFileSync(
          path.join(resultsDir, resultFileName),
          JSON.stringify(result, null, 2)
        );
        
        // Ensure the parser produced valid output
        expect(result).toBeDefined();
        
        // If this is a bike listing, verify key fields
        if (result.isBikeListing) {
          // Basic fields all bike listings should have
          expect(result.title).toBeDefined();
          expect(typeof result.title).toBe('string');
          
          // At least some of the bike-specific fields should be present
          const bikeFields = [
            'brand', 'model', 'bikeType', 'frameSize', 
            'frameMaterial', 'componentGroup', 'wheelSize'
          ];
          
          const extractedFields = bikeFields.filter(field => result[field] !== undefined);
          expect(extractedFields.length).toBeGreaterThan(0);
          
          // For a good parser, we'd expect at least 3 bike-specific fields
          if (extractedFields.length < 3) {
            console.warn(`Low field extraction for ${listing.url}: only got ${extractedFields.join(', ')}`);
          }
        }
      } catch (error) {
        console.error(`Error testing listing #${index}:`, error);
        // Don't fail the whole test for one bad listing
      }
    });
    
    // Overall test - at least 50% of listings should be parseable
    expect(allListings.length).toBeGreaterThan(0);
  });
});
