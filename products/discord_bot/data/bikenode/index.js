const fs = require('fs');
const path = require('path');

// Load motorcycle data
const motorcycleData = {};

// Load and parse motorcycle data
function loadMotorcycleData() {
  const csvPath = path.join(__dirname, 'motorcycles.csv');
  const csvData = fs.readFileSync(csvPath, 'utf8');
  const lines = csvData.split('\n').filter(line => line.trim() !== '');
  
  // Skip header row
  const headers = lines[0].split(',');
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    const year = parseInt(values[0]);
    const make = values[1];
    const model = values[2];
    const packageName = values[3];
    const category = values[4];
    const engine = values[5];
    
    if (!motorcycleData[year]) {
      motorcycleData[year] = {};
    }
    
    if (!motorcycleData[year][make]) {
      motorcycleData[year][make] = [];
    }
    
    motorcycleData[year][make].push({
      model,
      package: packageName,
      category,
      engine
    });
  }
}

// Initialize data on module load
loadMotorcycleData();

/**
 * Get all available years
 * @returns {number[]} Array of years
 */
function getYears() {
  return Object.keys(motorcycleData).map(Number).sort((a, b) => a - b);
}

/**
 * Get all makes for a specific year
 * @param {number} year 
 * @returns {string[]} Array of makes
 */
function getMakes(year) {
  if (!motorcycleData[year]) return [];
  return Object.keys(motorcycleData[year]).sort();
}

/**
 * Get all models for a specific year and make
 * @param {number} year 
 * @param {string} make 
 * @returns {object[]} Array of model objects
 */
function getModels(year, make) {
  if (!motorcycleData[year] || !motorcycleData[year][make]) return [];
  return motorcycleData[year][make];
}

/**
 * Search motorcycles by criteria
 * @param {Object} criteria - Search criteria
 * @param {number} [criteria.year] - Year to filter by
 * @param {string} [criteria.make] - Make to filter by
 * @param {string} [criteria.model] - Model to filter by
 * @param {string} [criteria.category] - Category to filter by
 * @returns {Object[]} Matching motorcycles
 */
function searchMotorcycles(criteria = {}) {
  const results = [];
  
  const years = criteria.year ? [criteria.year] : Object.keys(motorcycleData).map(Number);
  
  years.forEach(year => {
    if (!motorcycleData[year]) return;
    
    const makes = criteria.make ? [criteria.make] : Object.keys(motorcycleData[year]);
    
    makes.forEach(make => {
      if (!motorcycleData[year][make]) return;
      
      motorcycleData[year][make].forEach(motorcycle => {
        if (
          (!criteria.model || motorcycle.model.includes(criteria.model)) &&
          (!criteria.category || motorcycle.category === criteria.category)
        ) {
          results.push({
            year,
            make,
            ...motorcycle
          });
        }
      });
    });
  });
  
  return results;
}

module.exports = {
  getYears,
  getMakes,
  getModels,
  searchMotorcycles
};
