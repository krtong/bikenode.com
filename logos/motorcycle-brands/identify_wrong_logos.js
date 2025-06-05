const fs = require('fs');

// Known incorrect logos based on manual inspection
const KNOWN_WRONG_LOGOS = {
  'abc.png': {
    actualCompany: 'ABC Radio',
    shouldBe: 'ABC Motors (British motorcycle manufacturer)',
    identifiedBy: 'Contains radio station branding and phone number'
  },
  'access.png': {
    actualCompany: 'Access Group (career services)',
    shouldBe: 'Access Motor (likely Suzuki Access scooter brand)',
    identifiedBy: 'Contains "we care for careers" text'
  },
  'abarth.png': {
    actualCompany: 'Abarth (Fiat car tuning company)',
    shouldBe: 'Abarth motorcycles (if they exist)',
    identifiedBy: 'Scorpion logo is for the car brand',
    note: 'Abarth is primarily known for cars, verify if they made motorcycles'
  }
};

// Search queries to find correct logos
const CORRECT_LOGO_SEARCHES = {
  'ABC': [
    '"ABC motorcycles" logo UK',
    '"All British Cycles" logo',
    'ABC Motors motorcycle manufacturer logo',
    'ABC British motorcycle brand 1913-1923'
  ],
  'Access': [
    'Suzuki Access logo',
    'Access Motor scooter logo',
    'Access 125 motorcycle logo'
  ],
  'Abarth': [
    'Abarth motorcycle logo -car -auto',
    'Abarth two wheeler logo',
    // Note: Abarth might not have made motorcycles
  ]
};

// Generate report
function generateReport() {
  console.log('=== Wrong Logo Identification Report ===\n');
  
  Object.entries(KNOWN_WRONG_LOGOS).forEach(([file, info]) => {
    console.log(`File: ${file}`);
    console.log(`  Current: ${info.actualCompany}`);
    console.log(`  Should be: ${info.shouldBe}`);
    console.log(`  How identified: ${info.identifiedBy}`);
    if (info.note) console.log(`  Note: ${info.note}`);
    console.log('');
  });
  
  console.log('\n=== Search Queries for Correct Logos ===\n');
  
  Object.entries(CORRECT_LOGO_SEARCHES).forEach(([brand, searches]) => {
    console.log(`${brand}:`);
    searches.forEach(search => console.log(`  - ${search}`));
    console.log('');
  });
  
  // Create action list
  const actions = [
    '1. Delete wrong logos: rm abc.png access.png abarth.png',
    '2. Research if these brands actually made motorcycles',
    '3. Download correct logos using the search queries above',
    '4. Verify new logos show motorcycle-related branding'
  ];
  
  console.log('\n=== Recommended Actions ===\n');
  actions.forEach(action => console.log(action));
  
  // Save to file for tracking
  const report = {
    wrongLogos: KNOWN_WRONG_LOGOS,
    searchQueries: CORRECT_LOGO_SEARCHES,
    timestamp: new Date().toISOString()
  };
  
  fs.writeFileSync('wrong_logos_report.json', JSON.stringify(report, null, 2));
}

// Quick check function
function checkLogo(filename) {
  if (KNOWN_WRONG_LOGOS[filename]) {
    return {
      isWrong: true,
      ...KNOWN_WRONG_LOGOS[filename]
    };
  }
  return { isWrong: false };
}

generateReport();

module.exports = { checkLogo, KNOWN_WRONG_LOGOS };