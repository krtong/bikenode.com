/**
 * Wrapper for extraction functions that provides error handling
 * 
 * @param {Function} extractorFn - The extractor function to call
 * @param {string} extractorName - Name of the extractor for logging
 * @param {any[]} args - Arguments to pass to the extractor function
 * @returns {any} - Result from the extractor or null on error
 */
function safeExtract(extractorFn, extractorName, ...args) {
  try {
    return extractorFn(...args);
  } catch (error) {
    console.error(`Error in ${extractorName}:`, error);
    return null;
  }
}

/**
 * Creates an error result object for cases where extraction fails completely
 * 
 * @param {Error} error - The error that occurred
 * @returns {Object} - An object with error information
 */
function createErrorResult(error) {
  return {
    isBikeListing: false,
    error: `Extraction failed: ${error.message || 'Unknown error'}`,
    errorStack: error.stack,
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  safeExtract,
  createErrorResult
};
