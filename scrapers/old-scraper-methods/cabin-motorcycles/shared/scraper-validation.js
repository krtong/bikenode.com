/**
 * Validation functions for scraped data
 * Ensures data quality and filters out nonsense extractions
 */

/**
 * Validate a model name is reasonable
 */
function isValidModelName(name) {
  if (!name || typeof name !== 'string') return false;
  
  // Too short or too long
  if (name.length < 2 || name.length > 50) return false;
  
  // Contains CSS or HTML artifacts
  if (name.includes('.mw-parser-output') || name.includes('::') || name.includes('{')) return false;
  
  // Looks like a sentence fragment
  const sentencePatterns = [
    /\b(is|was|are|were|has|have|had|with|for|and|the)\s*$/i,
    /^\s*(is|was|are|were|has|have|had|with|for|and|the)\b/i
  ];
  
  for (const pattern of sentencePatterns) {
    if (pattern.test(name)) return false;
  }
  
  // Must contain at least one letter
  if (!/[a-zA-Z]/.test(name)) return false;
  
  return true;
}

/**
 * Validate year is reasonable for cabin motorcycles
 */
function isValidYear(year) {
  if (!year || typeof year !== 'number') return true; // Year is optional
  
  // Cabin motorcycles are a relatively modern concept
  if (year < 1970 || year > new Date().getFullYear() + 2) return false;
  
  return true;
}

/**
 * Clean CSS and HTML artifacts from specifications
 */
function cleanSpecifications(specs) {
  if (!specs || typeof specs !== 'object') return {};
  
  const cleaned = {};
  
  for (const [key, value] of Object.entries(specs)) {
    // Skip if value contains CSS
    if (typeof value === 'string' && (
      value.includes('.mw-parser-output') ||
      value.includes('{') ||
      value.includes('}') ||
      value.length > 500
    )) {
      continue;
    }
    
    // Keep clean values
    cleaned[key] = value;
  }
  
  return cleaned;
}

/**
 * Validate and clean a scraped model
 */
function validateModel(model) {
  if (!model || typeof model !== 'object') return null;
  
  // Check required fields
  if (!model.make || !model.model) return null;
  
  // Validate model name
  if (!isValidModelName(model.model)) return null;
  
  // Validate year
  if (!isValidYear(model.year)) {
    // Remove invalid year rather than rejecting the model
    delete model.year;
  }
  
  // Clean specifications
  if (model.specifications) {
    model.specifications = cleanSpecifications(model.specifications);
  }
  
  // Ensure required metadata
  if (model.specifications) {
    if (!model.specifications.source) {
      return null; // Must have source
    }
    if (!model.specifications.scraped_at) {
      model.specifications.scraped_at = new Date().toISOString();
    }
  }
  
  return model;
}

/**
 * Filter and validate an array of models
 */
function validateModels(models) {
  if (!Array.isArray(models)) return [];
  
  return models
    .map(model => validateModel(model))
    .filter(model => model !== null);
}

/**
 * Check if displacement value is reasonable
 */
function isValidDisplacement(displacement) {
  if (!displacement) return true; // Optional
  
  const value = typeof displacement === 'string' ? parseInt(displacement) : displacement;
  
  // Cabin motorcycles typically use motorcycle engines
  // Range: 50cc to 2000cc
  return !isNaN(value) && value >= 50 && value <= 2000;
}

module.exports = {
  isValidModelName,
  isValidYear,
  cleanSpecifications,
  validateModel,
  validateModels,
  isValidDisplacement
};