/**
 * Validates a motorcycle object against expected schema
 * @param {Object} motorcycle - Motorcycle object to validate
 * @returns {boolean} Whether the motorcycle is valid
 */
function validateMotorcycle(motorcycle) {
  // Basic structure check
  if (!motorcycle || typeof motorcycle !== 'object') {
    return false;
  }

  // Required fields
  const requiredFields = ['Year', 'Make', 'Model'];
  for (const field of requiredFields) {
    if (!motorcycle[field]) {
      return false;
    }
  }

  // Type validations
  if (motorcycle.Year && !/^\d{4}$/.test(motorcycle.Year.toString())) {
    return false;
  }

  // Make and Model must be strings
  if (motorcycle.Make && typeof motorcycle.Make !== 'string') {
    return false;
  }

  if (motorcycle.Model && typeof motorcycle.Model !== 'string') {
    return false;
  }
  
  // If engine is specified, it should be a string
  if (motorcycle.Engine && typeof motorcycle.Engine !== 'string') {
    return false;
  }
  
  // If category is specified, it should be a string
  if (motorcycle.Category && typeof motorcycle.Category !== 'string') {
    return false;
  }

  // All checks passed
  return true;
}

/**
 * Validates an array of motorcycle objects
 * @param {Array} motorcycles - Array of motorcycle objects to validate
 * @returns {Array} Array of invalid motorcycles with their indices
 */
function validateMotorcycleCollection(motorcycles) {
  if (!Array.isArray(motorcycles)) {
    throw new Error('Expected an array of motorcycle objects');
  }
  
  const invalidEntries = [];
  
  motorcycles.forEach((motorcycle, index) => {
    if (!validateMotorcycle(motorcycle)) {
      invalidEntries.push({
        index,
        motorcycle
      });
    }
  });
  
  return invalidEntries;
}

module.exports = {
  validateMotorcycle,
  validateMotorcycleCollection
};
