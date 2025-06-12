// Data validation for cabin motorcycles

const VALID_CATEGORIES = ['cabin', 'enclosed'];
const VALID_SUBCATEGORIES = ['fully_enclosed', 'semi_enclosed', 'streamliner'];
const CURRENT_YEAR = new Date().getFullYear();
const MIN_YEAR = 1885; // First motorcycle

// Validate basic motorcycle data
function validateMotorcycleData(data) {
  const errors = [];
  
  // Required fields
  if (!data.year || typeof data.year !== 'number') {
    errors.push('Year is required and must be a number');
  } else if (data.year < MIN_YEAR || data.year > CURRENT_YEAR + 2) {
    errors.push(`Year must be between ${MIN_YEAR} and ${CURRENT_YEAR + 2}`);
  }
  
  if (!data.make || typeof data.make !== 'string' || data.make.trim().length === 0) {
    errors.push('Make is required and must be a non-empty string');
  } else if (data.make.length > 100) {
    errors.push('Make must be less than 100 characters');
  }
  
  if (!data.model || typeof data.model !== 'string' || data.model.trim().length === 0) {
    errors.push('Model is required and must be a non-empty string');
  } else if (data.model.length > 200) {
    errors.push('Model must be less than 200 characters');
  }
  
  if (!data.category || !VALID_CATEGORIES.includes(data.category)) {
    errors.push(`Category must be one of: ${VALID_CATEGORIES.join(', ')}`);
  }
  
  // Optional fields
  if (data.package && (typeof data.package !== 'string' || data.package.length > 100)) {
    errors.push('Package must be a string less than 100 characters');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// Validate specifications
function validateSpecifications(specs) {
  const errors = [];
  
  if (!specs || typeof specs !== 'object') {
    errors.push('Specifications must be an object');
    return { isValid: false, errors };
  }
  
  // Validate subcategory if present
  if (specs.subcategory && !VALID_SUBCATEGORIES.includes(specs.subcategory)) {
    errors.push(`Subcategory must be one of: ${VALID_SUBCATEGORIES.join(', ')}`);
  }
  
  // Validate engine specs if present
  if (specs.engine) {
    const engine = specs.engine;
    if (engine.displacement && (typeof engine.displacement !== 'number' || engine.displacement < 0 || engine.displacement > 10000)) {
      errors.push('Engine displacement must be a number between 0 and 10000');
    }
    if (engine.power && typeof engine.power !== 'string') {
      errors.push('Engine power must be a string');
    }
  }
  
  // Validate dimensions if present
  if (specs.dimensions) {
    const dims = specs.dimensions;
    const dimensionFields = ['length', 'width', 'height', 'wheelbase'];
    dimensionFields.forEach(field => {
      if (dims[field] && (typeof dims[field] !== 'number' || dims[field] < 0 || dims[field] > 10000)) {
        errors.push(`Dimension ${field} must be a number between 0 and 10000 mm`);
      }
    });
  }
  
  // Validate weight if present
  if (specs.weight) {
    const weight = specs.weight;
    if (weight.curb && (typeof weight.curb !== 'number' || weight.curb < 50 || weight.curb > 5000)) {
      errors.push('Curb weight must be a number between 50 and 5000 kg');
    }
  }
  
  // Validate performance if present
  if (specs.performance) {
    const perf = specs.performance;
    if (perf.top_speed && (typeof perf.top_speed !== 'number' || perf.top_speed < 0 || perf.top_speed > 600)) {
      errors.push('Top speed must be a number between 0 and 600 km/h');
    }
    if (perf.range && (typeof perf.range !== 'number' || perf.range < 0 || perf.range > 2000)) {
      errors.push('Range must be a number between 0 and 2000 km');
    }
  }
  
  // Validate cabin features if present
  if (specs.cabin_features && !Array.isArray(specs.cabin_features)) {
    errors.push('Cabin features must be an array');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// Sanitize string input
function sanitizeString(str) {
  if (typeof str !== 'string') return str;
  
  // Remove potential SQL injection attempts
  return str
    .replace(/[';\\]/g, '') // Remove quotes and backslashes
    .replace(/--/g, '') // Remove SQL comments
    .replace(/\/\*/g, '') // Remove block comments
    .trim();
}

// Sanitize motorcycle data
function sanitizeMotorcycleData(data) {
  return {
    ...data,
    make: sanitizeString(data.make),
    model: sanitizeString(data.model),
    package: data.package ? sanitizeString(data.package) : null,
    category: sanitizeString(data.category)
  };
}

// Validate and sanitize complete motorcycle entry
function validateAndSanitize(motorcycleData) {
  // Sanitize first
  const sanitized = sanitizeMotorcycleData(motorcycleData);
  
  // Validate basic data
  const dataValidation = validateMotorcycleData(sanitized);
  if (!dataValidation.isValid) {
    return {
      isValid: false,
      errors: dataValidation.errors,
      data: null
    };
  }
  
  // Validate specifications if present
  if (sanitized.specifications) {
    const specsValidation = validateSpecifications(sanitized.specifications);
    if (!specsValidation.isValid) {
      return {
        isValid: false,
        errors: [...dataValidation.errors, ...specsValidation.errors],
        data: null
      };
    }
  }
  
  return {
    isValid: true,
    errors: [],
    data: sanitized
  };
}

// Check for duplicate data
function isDuplicate(newData, existingData) {
  return existingData.some(existing => 
    existing.year === newData.year &&
    existing.make.toLowerCase() === newData.make.toLowerCase() &&
    existing.model.toLowerCase() === newData.model.toLowerCase() &&
    (existing.package || '').toLowerCase() === (newData.package || '').toLowerCase()
  );
}

module.exports = {
  validateMotorcycleData,
  validateSpecifications,
  sanitizeString,
  sanitizeMotorcycleData,
  validateAndSanitize,
  isDuplicate,
  VALID_CATEGORIES,
  VALID_SUBCATEGORIES
};