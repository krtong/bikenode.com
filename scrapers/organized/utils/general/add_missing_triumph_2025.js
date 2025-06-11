#!/usr/bin/env node

import fs from 'fs';

// Missing 2025 Triumph models from user's data
const missingTriumph2025 = [
    // Tiger models
    { model: 'Tiger 1200', package: 'GT PRO', category: 'Enduro/offroad', engine: '1160 ccm' },
    { model: 'Tiger 1200', package: 'Rally PRO', category: 'Enduro/offroad', engine: '1160 ccm' },
    { model: 'Tiger 1200', package: 'GT Explorer', category: 'Enduro/offroad', engine: '1160 ccm' },
    { model: 'Tiger 1200', package: 'Rally Explorer', category: 'Enduro/offroad', engine: '1160 ccm' },
    { model: 'Tiger 850', package: 'Sport', category: 'Sport touring', engine: '850 ccm' },
    { model: 'Tiger 900', package: 'GT Aragón Edition', category: 'Enduro/offroad', engine: '888 ccm' },
    { model: 'Tiger 900', package: 'Rally Aragón Edition', category: 'Enduro/offroad', engine: '888 ccm' },
    
    // Bonneville models
    { model: 'Bonneville', package: 'Bobber', category: 'Classic', engine: '1200 ccm' },
    { model: 'Bonneville', package: 'T120 Black', category: 'Classic', engine: '1200 ccm' },
    { model: 'Bonneville', package: 'Bobber TFC', category: 'Classic', engine: '1200 ccm' },
    { model: 'Bonneville', package: 'T120 Elvis Presley Limited Edition', category: 'Classic', engine: '1200 ccm' },
    
    // Scrambler models
    { model: 'Scrambler', package: '400 X', category: 'Classic', engine: '400 ccm' },
    
    // Speed models
    { model: 'Speed', package: '400', category: 'Naked bike', engine: '400 ccm' },
    { model: 'Speed Triple', package: '1200 RX Limited Edition', category: 'Naked bike', engine: '1160 ccm' },
    { model: 'Speed Triple', package: '1200 RS', category: 'Naked bike', engine: '1160 ccm' },
    { model: 'Speed Triple', package: '1200 RR', category: 'Naked bike', engine: '1160 ccm' },
    { model: 'Speed Triple', package: '1200 RR Breitling Limited Edition', category: 'Naked bike', engine: '1160 ccm' },
    
    // Daytona
    { model: 'Daytona', package: '660', category: 'Sport', engine: '660 ccm' },
    
    // Thruxton
    { model: 'Thruxton', package: 'RS', category: 'Classic', engine: '1200 ccm' },
    { model: 'Thruxton', package: 'Final Edition', category: 'Classic', engine: '1200 ccm' },
    
    // TF Electric models
    { model: 'TF', package: '250-E', category: 'Enduro/offroad', engine: 'Electric' },
    { model: 'TF', package: '450-E', category: 'Enduro/offroad', engine: 'Electric' },
    { model: 'TF', package: '450-RC Edition', category: 'Cross/motocross', engine: 'Electric' },
    
    // Rocket
    { model: 'Rocket 3', package: 'R 221', category: 'Custom/cruiser', engine: '2458 ccm' },
    
    // Special Editions
    { model: 'Icon Editions', package: '', category: 'Classic', engine: '900 ccm' },
    { model: 'Stealth Editions', package: '', category: 'Classic', engine: '900 ccm' }
];

function addMissingTriumphModels() {
    console.log('🏍️ Adding missing 2025 Triumph models to database...');
    
    const csvPath = '/Users/kevintong/Documents/Code/bikenode.com/database/data/motorcycles_updated.csv';
    const enhancementPath = '/Users/kevintong/Documents/Code/bikenode.com/scrapers/triumph_2025_additions.csv';
    
    // Create CSV content for new models
    const headers = 'Year,Make,Model,Package,Category,Engine';
    const newRows = missingTriumph2025.map(bike => 
        `2025,Triumph,${bike.model},${bike.package},${bike.category},${bike.engine}`
    );
    
    const csvContent = [headers, ...newRows].join('\n');
    
    try {
        // Save enhancement file for review
        fs.writeFileSync(enhancementPath, csvContent);
        
        console.log(`\n💾 Created enhancement file: ${enhancementPath}`);
        console.log(`🆕 Found ${missingTriumph2025.length} missing 2025 Triumph models`);
        
        // Show what we're adding
        console.log('\n📋 MISSING 2025 TRIUMPH MODELS TO ADD:');
        console.log('==========================================');
        
        missingTriumph2025.forEach(bike => {
            const packageStr = bike.package ? ` ${bike.package}` : '';
            console.log(`2025 Triumph ${bike.model}${packageStr} (${bike.category}) - ${bike.engine}`);
        });
        
        console.log(`\n✅ Review the enhancement file and manually append to main database if approved`);
        console.log(`📁 Enhancement file: ${enhancementPath}`);
        
    } catch (error) {
        console.error('Error creating enhancement file:', error.message);
    }
}

// Run the enhancement
addMissingTriumphModels();