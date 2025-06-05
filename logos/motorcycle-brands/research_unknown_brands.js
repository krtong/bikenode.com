const fs = require('fs');
const validation = require('./logo_validation_results.json');

// Create research list
const researchList = validation.needsResearch.map(item => {
  return {
    brand: item.brand,
    file: item.logoPath,
    searchQueries: [
      `"${item.brand}" motorcycle manufacturer history`,
      `"${item.brand}" motorcycles Wikipedia`,
      `"${item.brand}" motorbike brand logo official`,
      `site:motorcyclespecs.co.za "${item.brand}"`,
      `site:bikez.com "${item.brand}"`
    ],
    verificationSteps: [
      '1. Check if brand appears in motorcycle databases',
      '2. Verify if current logo matches motorcycle division',
      '3. Look for motorcycle model listings',
      '4. Check founding year and motorcycle production dates'
    ]
  };
});

// Save research checklist
fs.writeFileSync('brand_research_checklist.json', JSON.stringify(researchList, null, 2));

// Create CSV for easier tracking
const csv = ['Brand,Current File,Status,Is Motorcycle Brand?,Correct Logo?,Notes'];
validation.needsResearch.forEach(item => {
  csv.push(`${item.brand},${item.logoPath},Needs Research,,,`);
});

fs.writeFileSync('logo_research_tracking.csv', csv.join('\n'));

console.log('Research files created:');
console.log('- brand_research_checklist.json: Detailed research queries');
console.log('- logo_research_tracking.csv: Track your research progress');
console.log(`\nTotal brands to research: ${validation.needsResearch.length}`);