const fs = require('fs');
const path = require('path');

// Known motorcycle manufacturers database
const KNOWN_MOTORCYCLE_BRANDS = [
  'Aprilia', 'BMW', 'Benelli', 'Beta', 'Bimota', 'Buell', 'Cagiva',
  'Ducati', 'Gilera', 'Harley-Davidson', 'Honda', 'Husqvarna', 'Indian',
  'KTM', 'Kawasaki', 'Laverda', 'MV Agusta', 'Moto Guzzi', 'Suzuki',
  'Triumph', 'Yamaha', 'BSA', 'Norton', 'Royal Enfield', 'Vespa',
  'Piaggio', 'Derbi', 'Montesa', 'Ossa', 'Bultaco', 'Gas Gas'
];

// Known non-motorcycle brands that might appear
const NON_MOTORCYCLE_BRANDS = [
  'Abarth', // Car manufacturer
  'SEAT', // Car manufacturer
  'Mini', // Car brand
  'Opel', // Car manufacturer
];

// Ambiguous brands that made both cars and motorcycles
const AMBIGUOUS_BRANDS = [
  'BMW', 'Peugeot', 'Honda', 'Suzuki', 'Yamaha'
];

// Terms that indicate non-motorcycle content
const EXCLUDE_TERMS = [
  'radio', 'broadcasting', 'career', 'careers', 'software', 
  'consulting', 'services', 'food', 'restaurant'
];

async function validateMotorcycleLogo(brandName, logoPath) {
  const validation = {
    brand: brandName,
    logoPath: logoPath,
    status: 'unknown',
    confidence: 0,
    notes: []
  };

  // Check if it's a known motorcycle brand
  if (KNOWN_MOTORCYCLE_BRANDS.some(b => b.toLowerCase() === brandName.toLowerCase())) {
    validation.status = 'valid';
    validation.confidence = 90;
    validation.notes.push('Known motorcycle manufacturer');
  }
  
  // Check if it's a known non-motorcycle brand
  else if (NON_MOTORCYCLE_BRANDS.some(b => b.toLowerCase() === brandName.toLowerCase())) {
    validation.status = 'invalid';
    validation.confidence = 90;
    validation.notes.push('Known non-motorcycle brand');
  }
  
  // Check if it's ambiguous
  else if (AMBIGUOUS_BRANDS.some(b => b.toLowerCase() === brandName.toLowerCase())) {
    validation.status = 'needs_review';
    validation.confidence = 50;
    validation.notes.push('Manufacturer of both motorcycles and other vehicles');
  }
  
  // Unknown brand - needs research
  else {
    validation.status = 'needs_research';
    validation.confidence = 0;
    validation.notes.push('Unknown brand - requires verification');
  }

  return validation;
}

async function validateAllLogos() {
  const logoDir = __dirname;
  const files = fs.readdirSync(logoDir).filter(f => f.endsWith('.png'));
  const results = {
    valid: [],
    invalid: [],
    needsReview: [],
    needsResearch: []
  };

  for (const file of files) {
    const brandName = path.basename(file, '.png')
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    
    const validation = await validateMotorcycleLogo(brandName, file);
    
    switch (validation.status) {
      case 'valid':
        results.valid.push(validation);
        break;
      case 'invalid':
        results.invalid.push(validation);
        break;
      case 'needs_review':
        results.needsReview.push(validation);
        break;
      case 'needs_research':
        results.needsResearch.push(validation);
        break;
    }
  }

  // Generate report
  console.log('\n=== Motorcycle Logo Validation Report ===\n');
  console.log(`Valid motorcycle logos: ${results.valid.length}`);
  console.log(`Invalid (non-motorcycle): ${results.invalid.length}`);
  console.log(`Needs manual review: ${results.needsReview.length}`);
  console.log(`Needs research: ${results.needsResearch.length}`);
  
  // Save detailed results
  fs.writeFileSync('logo_validation_results.json', JSON.stringify(results, null, 2));
  
  // Create action items
  if (results.invalid.length > 0) {
    console.log('\n=== Invalid Logos to Remove ===');
    results.invalid.forEach(v => {
      console.log(`- ${v.logoPath}: ${v.brand} (${v.notes.join(', ')})`);
    });
  }
  
  if (results.needsReview.length > 0) {
    console.log('\n=== Logos Needing Manual Review ===');
    results.needsReview.forEach(v => {
      console.log(`- ${v.logoPath}: ${v.brand} (${v.notes.join(', ')})`);
    });
  }

  return results;
}

// Add function to search for correct motorcycle logos
async function findCorrectMotorcycleLogo(brandName) {
  const searchStrings = [
    `${brandName} motorcycle logo`,
    `${brandName} motorcycles official logo`,
    `${brandName} motorbike brand logo`,
    `${brandName} two wheeler logo`
  ];
  
  console.log(`Searching for correct logo for: ${brandName}`);
  console.log('Suggested search terms:', searchStrings);
  
  // In practice, this would interface with image search APIs
  // or scraping tools to find the correct logo
}

// Run validation if called directly
if (require.main === module) {
  validateAllLogos().then(results => {
    console.log('\nValidation complete! Check logo_validation_results.json for details.');
  }).catch(err => {
    console.error('Validation failed:', err);
  });
}

module.exports = {
  validateMotorcycleLogo,
  validateAllLogos,
  findCorrectMotorcycleLogo,
  KNOWN_MOTORCYCLE_BRANDS,
  NON_MOTORCYCLE_BRANDS,
  AMBIGUOUS_BRANDS
};