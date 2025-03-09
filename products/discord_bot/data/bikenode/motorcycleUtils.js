const motorcycleData = require('./index');

/**
 * Get all available categories in the dataset
 * @returns {string[]} Unique categories
 */
function getAllCategories() {
  const categories = new Set();
  const years = motorcycleData.getYears();
  
  years.forEach(year => {
    const makes = motorcycleData.getMakes(year);
    
    makes.forEach(make => {
      const models = motorcycleData.getModels(year, make);
      
      models.forEach(model => {
        if (model.category) {
          categories.add(model.category);
        }
      });
    });
  });
  
  return Array.from(categories).sort();
}

/**
 * Get decade statistics - number of models per decade
 * @returns {Object} Decade statistics
 */
function getDecadeStats() {
  const stats = {};
  const years = motorcycleData.getYears();
  
  years.forEach(year => {
    const decade = Math.floor(year / 10) * 10;
    if (!stats[decade]) stats[decade] = 0;
    
    const makes = motorcycleData.getMakes(year);
    
    makes.forEach(make => {
      const models = motorcycleData.getModels(year, make);
      stats[decade] += models.length;
    });
  });
  
  return stats;
}

/**
 * Find motorcycles with similar engine displacement
 * @param {number} displacement - Engine displacement in cc
 * @param {number} tolerance - Tolerance in cc
 * @returns {Object[]} Similar motorcycles
 */
function findSimilarEngineSize(displacement, tolerance = 50) {
  const results = [];
  const years = motorcycleData.getYears();
  
  years.forEach(year => {
    const makes = motorcycleData.getMakes(year);
    
    makes.forEach(make => {
      const models = motorcycleData.getModels(year, make);
      
      models.forEach(model => {
        // Extract numeric displacement from engine string if possible
        const engineMatch = model.engine?.match(/(\d+)\s*ccm/);
        if (engineMatch) {
          const engineDisplacement = parseInt(engineMatch[1]);
          
          if (Math.abs(engineDisplacement - displacement) <= tolerance) {
            results.push({
              year,
              make,
              ...model,
              displacement: engineDisplacement
            });
          }
        }
      });
    });
  });
  
  return results;
}

/**
 * Format motorcycle data for Discord message
 * @param {Object} motorcycle - Motorcycle object
 * @returns {string} Formatted string
 */
function formatMotorcycleForDiscord(motorcycle) {
  const packageInfo = motorcycle.package ? ` (${motorcycle.package})` : '';
  return `**${motorcycle.year} ${motorcycle.make} ${motorcycle.model}${packageInfo}**
Category: ${motorcycle.category || 'Unknown'}
Engine: ${motorcycle.engine || 'Unknown'}`;
}

module.exports = {
  getAllCategories,
  getDecadeStats,
  findSimilarEngineSize,
  formatMotorcycleForDiscord
};
