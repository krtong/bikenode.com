// Set dummy API key before requiring Stagehand
process.env.OPENAI_API_KEY = 'dummy-key-for-testing';

const stagehand = require('@browserbasehq/stagehand');

// Simple logging function
function log(message) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

// Test function
async function testBrowserOpen() {
  log('Attempting to open Chromium browser...');
  const browser = await stagehand.act('open chromium');
  log('Browser opened successfully');
  await stagehand.act('close browser', { browser });
  log('Browser closed');
}

// Run with error handling
testBrowserOpen().catch(err => {
  log(`Error: ${err.message}`);
  process.exit(1);
});