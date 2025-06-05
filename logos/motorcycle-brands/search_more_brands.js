const fs = require('fs');

// Brands to search for on Wikipedia
const BRANDS_TO_SEARCH = [
    // Italian brands
    'Morini', 'Mondial', 'Malanca', 'Garelli', 'Malaguti',
    
    // German brands
    'Sachs', 'Kreidler', 'Hercules', 'NSU', 'Horex',
    
    // Spanish brands 
    'Bultaco', 'OSSA', 'Sanglas', 'Moto Morini',
    
    // British brands
    'Vincent', 'Matchless', 'AJS', 'Velocette', 'Francis-Barnett',
    
    // American brands
    'Excelsior', 'Henderson', 'Pierce', 'Pope', 'Thor',
    
    // Czech brands
    'CZ', 'ESO', 
    
    // French brands
    'Terrot', 'Motobecane', 'Solex',
    
    // Japanese lesser known
    'Meguro', 'Rikuo', 'Marusho',
    
    // Electric/Modern
    'Energica', 'Lightning', 'Gogoro', 'NIU',
    
    // Scooter brands
    'Kymco', 'SYM', 'PGO', 'Adly'
];

// Generate Wikipedia URLs to check
function generateWikipediaUrls() {
    console.log('=== Wikipedia URLs to Check for Logos ===\n');
    
    BRANDS_TO_SEARCH.forEach(brand => {
        const variations = [
            `https://en.wikipedia.org/wiki/${brand}`,
            `https://en.wikipedia.org/wiki/${brand}_(motorcycles)`,
            `https://en.wikipedia.org/wiki/${brand}_motorcycles`,
            `https://en.wikipedia.org/wiki/${brand}_(company)`
        ];
        
        console.log(`\n# ${brand}`);
        variations.forEach(url => {
            console.log(`- ${url}`);
        });
    });
}

// Check which logos we already have
function checkExisting() {
    const existing = fs.readdirSync('.').filter(f => f.endsWith('.png') || f.endsWith('.jpg'));
    const brandNames = existing.map(f => f.replace(/\.(png|jpg)/, '').toLowerCase());
    
    console.log('\n=== Brands We May Already Have ===');
    BRANDS_TO_SEARCH.forEach(brand => {
        const found = brandNames.some(b => b.includes(brand.toLowerCase()));
        if (found) {
            console.log(`✓ ${brand} - may already exist`);
        }
    });
    
    console.log('\n=== Priority Brands to Search ===');
    BRANDS_TO_SEARCH.forEach(brand => {
        const found = brandNames.some(b => b.includes(brand.toLowerCase()));
        if (!found) {
            console.log(`- ${brand}`);
        }
    });
}

// Run the search
checkExisting();
console.log('\n' + '='.repeat(50) + '\n');
generateWikipediaUrls();

module.exports = { BRANDS_TO_SEARCH };