/**
 * Test helper functions
 */

/**
 * Apply test patches to the testing environment to enable certain tests to run
 * @param {Object} env - The test environment object
 */
function applyTestPatches(env) {
  // Add any missing functions or properties needed for tests
  if (!env.extractWheelSize) {
    env.extractWheelSize = (text, title) => {
      if (!text) return null;
      
      const wheelSizePatterns = [
        /\b700c\b/i,
        /\b650b\b/i,
        /\b(26|27\.5|29)(\s*|"|inch|\")?\s*(wheels|wheel)?/i
      ];
      
      for (const pattern of wheelSizePatterns) {
        const match = text.match(pattern);
        if (match) {
          // Return the numeric part or the whole match, removing quotes
          let result = match[1] || match[0];
          // Clean up any quotes from the result
          return result.replace(/"/g, '');
        }
      }
      
      return null;
    };
  }
  
  // Other test patches can be added here as needed
  return env;
}

module.exports = {
  applyTestPatches
};
