// Text formatting utilities

/**
 * Converts a string to title case (capital first letter, lowercase rest for each word)
 * @param {string} str - The string to convert
 * @returns {string} - The title-cased string
 */
export function toTitleCase(str) {
    if (!str) return str;
    
    // Special cases that should remain uppercase
    const allCapsWords = ['AJS', 'BMW', 'BSA', 'CF', 'CZ', 'GAS', 'KTM', 'MV', 'MZ', 'UM', 'USA', 'UK', 'EU', 'ATV', 'UTV', 'EFI', 'ABS', 'DTC', 'TCS', 'LED', 'USD', 'WP'];
    
    // Special cases with specific formatting
    const specialCases = {
        'cf moto': 'CF Moto',
        'cfmoto': 'CFMoto',
        'mv agusta': 'MV Agusta',
        'gas gas': 'GAS GAS',
        'gasgas': 'GASGAS',
        'bmw': 'BMW',
        'ktm': 'KTM',
        'atv': 'ATV',
        'utv': 'UTV',
        'harley-davidson': 'Harley-Davidson',
        'harley davidson': 'Harley-Davidson',
        'can-am': 'Can-Am',
        'can am': 'Can-Am',
        'e-bike': 'E-Bike',
        'e bike': 'E-Bike',
        'ebike': 'E-Bike'
    };
    
    // Check if the entire string matches a special case
    const lowerStr = str.toLowerCase();
    if (specialCases[lowerStr]) {
        return specialCases[lowerStr];
    }
    
    // Convert to title case
    return str
        .split(/[\s-]+/) // Split on spaces and hyphens
        .map((word, index, array) => {
            // Check if word should remain all caps
            if (allCapsWords.includes(word.toUpperCase())) {
                return word.toUpperCase();
            }
            
            // Check special cases for individual words
            const lowerWord = word.toLowerCase();
            if (specialCases[lowerWord]) {
                return specialCases[lowerWord];
            }
            
            // Handle hyphenated words
            if (word.includes('-')) {
                return word.split('-')
                    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
                    .join('-');
            }
            
            // Standard title case
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        })
        .join(' ');
}

/**
 * Normalizes motorcycle/bicycle naming for display
 * @param {string} make - The manufacturer/brand name
 * @param {string} model - The model name
 * @param {string} variant - The variant name (optional)
 * @returns {object} - Object with normalized make, model, and variant
 */
export function normalizeVehicleNames(make, model, variant) {
    return {
        make: toTitleCase(make),
        model: toTitleCase(model),
        variant: variant ? toTitleCase(variant) : variant
    };
}