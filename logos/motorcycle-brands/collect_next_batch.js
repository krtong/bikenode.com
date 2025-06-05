const fs = require('fs');

// Brands we can likely find logos for easily (less trademark-protected)
const NEXT_BATCH_BRANDS = [
    'Peugeot',      // Made motorcycles historically
    'Derbi',        // Spanish manufacturer
    'Montesa',      // Spanish trials bikes
    'Sherco',       // French trials bikes
    'TM Racing',    // Italian manufacturer
    'Ossa',         // Spanish manufacturer
    'Gas Gas',      // Spanish manufacturer
    'Scorpa',       // French trials bikes
    'Beta',         // Italian manufacturer (we have this)
    'Fantic',       // Italian manufacturer
    'Rieju',        // Spanish manufacturer
    'Ural',         // Russian sidecars
    'MZ',           // German manufacturer
    'Jawa',         // Czech manufacturer
    'CZ',           // Czech manufacturer
    'Maico',        // German manufacturer
    'Puch',         // Austrian manufacturer
    'Tomos',        // Slovenian manufacturer
    'Simson',       // East German manufacturer
    'DKW',          // German manufacturer
];

// Smaller/custom brands that might be easier to get logos for
const SMALLER_BRANDS = [
    'Confederate',   // American custom
    'Arch',         // We have this already
    'Boss',         // Boss Hoss - we have this
    'Rokon',        // American utility bikes
    'Cleveland',    // Cleveland CycleWerks
    'SSR',          // Chinese manufacturer
    'Magni',        // Italian custom
    'Ghezzi-Brian', // Italian custom
    'Mash',         // French retro bikes
    'FB Mondial',   // Italian manufacturer
    'SWM',          // Italian manufacturer
    'Husaberg',     // Austrian (now KTM)
    'Vertemati',    // Italian trials
    'Jotagas',      // Spanish trials
];

// Generate search commands for easier manual collection
function generateSearchCommands() {
    console.log('=== Manual Search Commands for Next Batch ===\n');
    
    const allBrands = [...NEXT_BATCH_BRANDS, ...SMALLER_BRANDS];
    
    allBrands.forEach(brand => {
        console.log(`# ${brand}`);
        console.log(`# Search: "${brand} motorcycle logo PNG"`);
        console.log(`# Alternative: "${brand} motorcycles official logo"`);
        console.log(`# Wikipedia: https://en.wikipedia.org/wiki/${brand.replace(' ', '_')}_motorcycles`);
        console.log(`# Download as: ${brand.toLowerCase().replace(' ', '_').replace('-', '_')}.png`);
        console.log('');
    });
}

// Check which brands from our list we already have
function checkExistingLogos() {
    const existingFiles = fs.readdirSync('.').filter(f => f.endsWith('.png'));
    const existingBrands = existingFiles.map(f => 
        f.replace('.png', '').replace(/_/g, ' ').toLowerCase()
    );
    
    console.log('=== Brands We Already Have ===');
    existingFiles.forEach(file => {
        const brand = file.replace('.png', '').replace(/_/g, ' ');
        console.log(`✓ ${brand}`);
    });
    
    console.log('\n=== Priority Brands Still Missing ===');
    const highPriority = ['Norton', 'Royal Enfield', 'Vespa', 'Husqvarna', 'Zero', 'Peugeot', 'Derbi'];
    
    highPriority.forEach(brand => {
        const hasLogo = existingBrands.includes(brand.toLowerCase());
        console.log(`${hasLogo ? '✓' : '✗'} ${brand}`);
    });
    
    console.log(`\nTotal logos: ${existingFiles.length}/682 brands (${(existingFiles.length/682*100).toFixed(1)}%)`);
}

// Run the analysis
checkExistingLogos();
console.log('\n' + '='.repeat(50) + '\n');
generateSearchCommands();

module.exports = { NEXT_BATCH_BRANDS, SMALLER_BRANDS };