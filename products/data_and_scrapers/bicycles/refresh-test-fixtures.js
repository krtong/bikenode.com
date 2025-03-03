/**
 * Script to refresh test fixtures with real DOM data
 */
const { archiveUrls } = require('../utils/domArchiver');
const fs = require('fs');
const path = require('path');

// Default URLs to archive - common bike listing sites
const DEFAULT_URLS = [
  'https://sfbay.craigslist.org/search/bia',
  'https://seattle.craigslist.org/search/bia',
  'https://newyork.craigslist.org/search/bia',
  'https://chicago.craigslist.org/search/bia',
  'https://losangeles.craigslist.org/search/bia'
];

/**
 * Refresh the test fixtures with real DOM data
 */
async function refreshTestFixtures(options = {}) {
  console.log('Refreshing test fixtures with real DOM data...');
  
  const urls = options.urls || DEFAULT_URLS;
  
  const results = await archiveUrls(urls, {
    maxUrls: options.maxUrls || 5,
    outputDir: path.join(__dirname, '../__tests__/fixtures/archived-dom'),
    screenshotDir: path.join(__dirname, '../__tests__/fixtures/screenshots')
  });
  
  console.log(`Archived ${results.length} URLs with their listings`);
  return results;
}

// Run if called directly
if (require.main === module) {
  // Parse command-line arguments
  const args = process.argv.slice(2);
  const options = {
    urls: [],
    maxUrls: 5
  };
  
  for (const arg of args) {
    if (arg.startsWith('--max=')) {
      options.maxUrls = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('http')) {
      options.urls.push(arg);
    }
  }
  
  // Use default URLs if none provided
  if (options.urls.length === 0) {
    options.urls = DEFAULT_URLS;
  }
  
  refreshTestFixtures(options)
    .then(() => {
      console.log('Test fixtures successfully refreshed');
    })
    .catch(error => {
      console.error('Error refreshing test fixtures:', error);
      process.exit(1);
    });
}

module.exports = { refreshTestFixtures };
