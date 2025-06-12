/**
 * Minimal seed data for development and testing
 * This is NOT meant to be used as primary data source
 * Real data should come from web scraping
 */

const SEED_DATA = {
  // Only include minimal examples for testing
  peraves: {
    exampleUrl: 'https://www.peravescz.com',
    knownModels: ['MonoRacer', 'MonoTracer', 'E-Tracer', 'Ecomobile'],
    note: 'Must scrape actual website for real data'
  },
  
  bmw: {
    exampleUrl: 'https://en.wikipedia.org/wiki/BMW_C1',
    knownModels: ['C1 125', 'C1 200'],
    productionYears: '2000-2002',
    note: 'Discontinued model - use Wikipedia and archives'
  },
  
  honda: {
    exampleUrl: 'https://www.honda.co.jp/GYRO/',
    knownModels: ['Gyro Canopy', 'Gyro X', 'Gyro UP'],
    note: 'Japanese site - needs proper encoding'
  },
  
  litMotors: {
    exampleUrl: 'https://litmotors.com',
    knownModels: ['C-1'],
    status: 'In development',
    note: 'Check news sources for updates'
  }
};

// Helper to check if we're using seed data
function isUsingSeedData() {
  console.warn('⚠️  WARNING: Using seed data instead of scraped data!');
  console.warn('⚠️  This should only happen during development.');
  return true;
}

module.exports = {
  SEED_DATA,
  isUsingSeedData
};