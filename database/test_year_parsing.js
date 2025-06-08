// Test the year parsing logic

function parseYearRange(yearStr) {
  yearStr = yearStr.trim();
  
  // Handle single year
  if (/^\d{4}$/.test(yearStr)) {
    return [parseInt(yearStr)];
  }
  
  // Handle open-ended range (e.g., "2011 -")
  const openMatch = yearStr.match(/^(\d{4})\s*-\s*$/);
  if (openMatch) {
    const startYear = parseInt(openMatch[1]);
    const currentYear = new Date().getFullYear();
    const years = [];
    // Limit to reasonable future (current year + 2)
    for (let y = startYear; y <= Math.min(currentYear + 2, startYear + 10); y++) {
      years.push(y);
    }
    return years;
  }
  
  // Handle year range (e.g., "1948 - 63" or "2002 - 2003")
  const rangeMatch = yearStr.match(/(\d{4})\s*[-–]\s*(\d{2,4})/);
  if (rangeMatch) {
    const startYear = parseInt(rangeMatch[1]);
    let endYear = parseInt(rangeMatch[2]);
    
    // If end year is 2 digits, infer century
    if (rangeMatch[2].length === 2) {
      const startCentury = Math.floor(startYear / 100) * 100;
      endYear = startCentury + endYear;
      
      // Handle century wrap (e.g., 1998 - 02 means 1998-2002)
      if (endYear < startYear) {
        endYear += 100;
      }
    }
    
    // Generate array of years
    const years = [];
    for (let y = startYear; y <= endYear; y++) {
      years.push(y);
    }
    return years;
  }
  
  // Handle years with production notes (e.g., "1987  (production 153)")
  const yearWithNoteMatch = yearStr.match(/^(\d{4})\s*\(/);
  if (yearWithNoteMatch) {
    return [parseInt(yearWithNoteMatch[1])];
  }
  
  // Try to extract any 4-digit year
  const anyYearMatch = yearStr.match(/(\d{4})/);
  if (anyYearMatch) {
    return [parseInt(anyYearMatch[1])];
  }
  
  return null;
}

function parseComplexYearString(yearValue) {
  // Check if it contains variant information (colon pattern)
  if (!yearValue.includes(':')) {
    // Simple case - just parse the year(s)
    const years = parseYearRange(yearValue);
    return years ? { _default: years } : null;
  }
  
  // Complex case with variants
  const result = {};
  
  // First, fix line continuations (years split across lines)
  yearValue = yearValue.replace(/(\d+)\s*\n\s*-\s*(\d+)/g, '$1 - $2');
  yearValue = yearValue.replace(/:\s*\n\s*(\d)/g, ': $1');
  
  // Split by newlines and tabs
  const lines = yearValue.split(/[\n\r\t]+/).map(line => line.trim()).filter(line => line);
  
  for (const line of lines) {
    // Try to match variant pattern: "D1, BD1: 1948 - 63"
    const variantMatch = line.match(/^([^:]+):\s*(.+)$/);
    
    if (variantMatch) {
      const variantsPart = variantMatch[1].trim();
      const yearsPart = variantMatch[2].trim();
      
      // Parse the years
      const years = parseYearRange(yearsPart);
      
      if (years) {
        // Handle multiple variants separated by comma or &
        const variants = variantsPart.split(/[,&]/).map(v => v.trim());
        
        // Assign years to each variant
        for (let variant of variants) {
          if (variant) {
            // Keep the full variant name including (all) or other suffixes
            result[variant.trim()] = years;
          }
        }
      }
    } else {
      // Line doesn't match variant pattern, try to parse as simple year
      const years = parseYearRange(line);
      if (years && !result._default) {
        result._default = years;
      }
    }
  }
  
  return Object.keys(result).length > 0 ? result : null;
}

// Test with your example
const testCase = `D1, BD1: 1948 - 63
	D3: 1954 - 57
	D5: 1958
	D7: 1959 - 66
	D10 (all): 1967
	D14/4 (all): 1968 - 69
	D/B 175 (all): 1969 - 71`;

console.log('Testing BSA Bantam year parsing:\n');
console.log('Input:');
console.log(testCase);
console.log('\nParsed result:');
const parsed = parseComplexYearString(testCase);
console.log(JSON.stringify(parsed, null, 2));

// Test other examples
console.log('\n\nOther test cases:');

const testCases = [
  "2018",
  "2010 - 12",
  "2018 -",
  "1987  (production 153)",
  "CR: 1949 - 52\nSA: 1953 - 55",
  "2012 \n\t- 13"
];

testCases.forEach(test => {
  console.log(`\nInput: "${test}"`);
  console.log('Parsed:', JSON.stringify(parseComplexYearString(test), null, 2));
});