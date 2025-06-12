// Comprehensive test script for motorcycle specs integration

const API_BASE = 'http://localhost:8080/api';

// Test motorcycles with known specs
const testCases = [
    { name: 'Honda Monkey 2022', id: '189c16c7-4b30-5cbb-965b-ce869d5903f0', expectedSpecId: 3521 },
    { name: 'Honda Benly 2022', id: '2e6cbfef-89c2-5d9f-92c7-e6fc0b898a36', expectedSpecId: 1546 },
    { name: 'Harley-Davidson CVO Road Glide 2024', id: '8c5b2d02-554f-5726-bf51-6531f6fc210d', expectedSpecId: 1385 },
    { name: 'BMW C 400 2025', id: 'f3a61d26-e9c3-5908-ad73-650c7f2d2b1a', expectedSpecId: 478 },
    { name: 'Triumph Bonneville Speedmaster 2025', id: 'f8698f33-f31e-57bc-8987-a2bcf430fee2', expectedSpecId: 3154 }
];

async function testSpecsEndpoint(motorcycle) {
    console.log(`\n🔍 Testing ${motorcycle.name}...`);
    
    try {
        const response = await fetch(`${API_BASE}/motorcycles/${motorcycle.id}/specs`);
        const data = await response.json();
        
        if (!response.ok) {
            console.error(`❌ HTTP Error: ${response.status}`);
            return false;
        }
        
        if (data.hasSpecs) {
            console.log(`✅ Specs found! Spec ID: ${data.specId}`);
            if (data.specId !== motorcycle.expectedSpecId) {
                console.warn(`⚠️  Expected spec ID ${motorcycle.expectedSpecId}, got ${data.specId}`);
            }
            
            // Show some key specs
            const keySpecs = ['Engine', 'Capacity', 'Max Power'];
            console.log('   Key specifications:');
            keySpecs.forEach(key => {
                if (data.specifications && data.specifications[key]) {
                    console.log(`   - ${key}: ${data.specifications[key]}`);
                }
            });
            
            // Count total specs
            if (data.specifications) {
                const specCount = Object.keys(data.specifications).length;
                console.log(`   Total specifications: ${specCount}`);
            }
            
            return true;
        } else {
            console.log(`❌ No specs found: ${data.message || 'Unknown reason'}`);
            return false;
        }
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        return false;
    }
}

async function testBrandFlow(brand, year) {
    console.log(`\n📋 Testing full flow for ${brand} ${year}...`);
    
    try {
        // 1. Get years for brand
        console.log(`1. Getting years for ${brand}...`);
        const yearsResp = await fetch(`${API_BASE}/motorcycles/years/${encodeURIComponent(brand)}`);
        const years = await yearsResp.json();
        
        if (!Array.isArray(years) || years.length === 0) {
            console.error('❌ No years found');
            return;
        }
        
        console.log(`✅ Found ${years.length} years`);
        
        if (!years.includes(year)) {
            console.warn(`⚠️  Year ${year} not found, using ${years[0]} instead`);
            year = years[0];
        }
        
        // 2. Get models for year
        console.log(`\n2. Getting models for ${brand} ${year}...`);
        const modelsResp = await fetch(`${API_BASE}/motorcycles/models/${encodeURIComponent(brand)}/${year}`);
        const models = await modelsResp.json();
        
        if (!Array.isArray(models) || models.length === 0) {
            console.error('❌ No models found');
            return;
        }
        
        console.log(`✅ Found ${models.length} models`);
        
        // 3. Test first few models for specs
        console.log(`\n3. Testing specs for first 3 models...`);
        let specsFound = 0;
        const testModels = models.slice(0, 3);
        
        for (const model of testModels) {
            console.log(`\n   Testing ${model.model}...`);
            const specsResp = await fetch(`${API_BASE}/motorcycles/${model.id}/specs`);
            const specs = await specsResp.json();
            
            if (specs.hasSpecs) {
                specsFound++;
                console.log(`   ✅ Has specs! (ID: ${specs.specId})`);
            } else {
                console.log(`   ❌ No specs`);
            }
        }
        
        console.log(`\n📊 Summary: ${specsFound}/${testModels.length} models have specs`);
        
    } catch (error) {
        console.error(`❌ Error in brand flow test: ${error.message}`);
    }
}

async function testAddBikeWorkflow() {
    console.log('\n🚀 Testing Add-Bike Page Workflow...');
    console.log('=====================================');
    
    // Test individual motorcycles
    console.log('\n1️⃣ Testing individual motorcycles with known specs:');
    let successCount = 0;
    
    for (const testCase of testCases) {
        const success = await testSpecsEndpoint(testCase);
        if (success) successCount++;
    }
    
    console.log(`\n✅ ${successCount}/${testCases.length} motorcycles returned specs successfully`);
    
    // Test brand flows
    console.log('\n\n2️⃣ Testing complete brand flows:');
    
    const brandsToTest = [
        { brand: 'Honda', year: 2022 },
        { brand: 'Harley-Davidson', year: 2024 },
        { brand: 'BMW', year: 2025 }
    ];
    
    for (const { brand, year } of brandsToTest) {
        await testBrandFlow(brand, year);
    }
    
    // Test error cases
    console.log('\n\n3️⃣ Testing error cases:');
    
    console.log('\n🔍 Testing invalid motorcycle ID...');
    try {
        const response = await fetch(`${API_BASE}/motorcycles/invalid-uuid/specs`);
        const data = await response.json();
        console.log(`Response: ${JSON.stringify(data)}`);
    } catch (error) {
        console.log(`Error handled: ${error.message}`);
    }
    
    console.log('\n🔍 Testing non-existent motorcycle...');
    try {
        const response = await fetch(`${API_BASE}/motorcycles/00000000-0000-0000-0000-000000000000/specs`);
        const data = await response.json();
        console.log(`Response: ${JSON.stringify(data)}`);
    } catch (error) {
        console.log(`Error handled: ${error.message}`);
    }
    
    console.log('\n\n✅ Integration test complete!');
    console.log('\nTo test in the add-bike page:');
    console.log('1. Go to http://localhost:8081/add-bike/');
    console.log('2. Select Motorcycle');
    console.log('3. Try these brands with specs:');
    console.log('   - Honda (especially Monkey for 2019-2025)');
    console.log('   - Harley-Davidson');
    console.log('   - BMW');
    console.log('   - Triumph');
}

// Run the tests
testAddBikeWorkflow();