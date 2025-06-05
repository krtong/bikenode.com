#!/usr/bin/env node

// Test script to verify Honda 2001 motorcycle data

async function testHondaData() {
    console.log('Testing Honda 2001 motorcycle data...\n');
    
    try {
        // Test 1: Get all manufacturers
        console.log('1. Testing manufacturers endpoint...');
        const manuResp = await fetch('http://localhost:8080/api/motorcycles/manufacturers');
        const manuData = await manuResp.json();
        const hasHonda = manuData.manufacturers.includes('Honda');
        console.log(`   Total manufacturers: ${manuData.manufacturers.length}`);
        console.log(`   Honda found: ${hasHonda}\n`);
        
        // Test 2: Get years
        console.log('2. Testing years endpoint...');
        const yearsResp = await fetch('http://localhost:8080/api/motorcycles/years');
        const yearsData = await yearsResp.json();
        const has2001 = yearsData.years.includes(2001);
        console.log(`   Total years: ${yearsData.years.length}`);
        console.log(`   2001 found: ${has2001}\n`);
        
        // Test 3: Search for Honda motorcycles
        console.log('3. Testing search with limit 500...');
        const searchResp = await fetch('http://localhost:8080/api/motorcycles/search?q=&limit=500');
        const searchData = await searchResp.json();
        console.log(`   Total motorcycles returned: ${searchData.motorcycles.length}`);
        
        // Filter for Honda 2001
        const honda2001 = searchData.motorcycles.filter(m => 
            m.make === 'Honda' && m.year === 2001
        );
        
        console.log(`   Honda 2001 motorcycles found: ${honda2001.length}\n`);
        
        if (honda2001.length > 0) {
            console.log('4. Honda 2001 models:');
            // Group by model
            const models = {};
            honda2001.forEach(m => {
                const key = m.package ? `${m.model} ${m.package}` : m.model;
                if (!models[key]) {
                    models[key] = 0;
                }
                models[key]++;
            });
            
            Object.keys(models).sort().forEach(model => {
                console.log(`   - ${model}`);
            });
        } else {
            console.log('   ERROR: No Honda 2001 motorcycles found!');
            
            // Check if Honda exists at all
            const anyHonda = searchData.motorcycles.filter(m => m.make === 'Honda');
            console.log(`\n   Total Honda motorcycles (any year): ${anyHonda.length}`);
            
            if (anyHonda.length > 0) {
                // Show years available
                const hondaYears = [...new Set(anyHonda.map(m => m.year))].sort();
                console.log(`   Honda years available: ${hondaYears.slice(0, 10).join(', ')}...`);
            }
        }
        
        // Test 4: Check if API limit is the issue
        console.log('\n5. Testing if we need more than 500 results...');
        const bigSearchResp = await fetch('http://localhost:8080/api/motorcycles/search?q=&limit=1000');
        const bigSearchData = await bigSearchResp.json();
        console.log(`   Got ${bigSearchData.motorcycles.length} with limit=1000`);
        
        const honda2001Big = bigSearchData.motorcycles.filter(m => 
            m.make === 'Honda' && m.year === 2001
        );
        console.log(`   Honda 2001 found with bigger limit: ${honda2001Big.length}`);
        
    } catch (error) {
        console.error('Error:', error);
    }
}

// Run if called directly
if (typeof window === 'undefined') {
    // Node.js environment
    import('node-fetch').then(module => {
        global.fetch = module.default;
        testHondaData();
    });
} else {
    // Browser environment
    testHondaData();
}