// Debug script to test the exact API calls made by add-bike page

const API_BASE = 'http://localhost:8080/api';

async function testHondaMonkeyFlow() {
    console.log('🏍️  Testing Honda Monkey flow as it would work in add-bike page...\n');
    
    try {
        // 1. Get Honda years
        console.log('1. Fetching years for Honda...');
        const yearsResp = await fetch(`${API_BASE}/motorcycles/years/Honda`);
        const years = await yearsResp.json();
        console.log(`✅ Found ${years.length} years`);
        console.log('Recent years:', years.slice(0, 10));
        
        // 2. Get 2022 models
        console.log('\n2. Fetching Honda 2022 models...');
        const modelsResp = await fetch(`${API_BASE}/motorcycles/models/Honda/2022`);
        const models = await modelsResp.json();
        console.log(`✅ Found ${models.length} models`);
        
        // Find Monkey
        const monkeyModels = models.filter(m => m.model.includes('Monkey'));
        console.log(`\n🔍 Found ${monkeyModels.length} Monkey models:`);
        monkeyModels.forEach(m => {
            console.log(`  - ${m.model} (ID: ${m.id})`);
        });
        
        if (monkeyModels.length > 0) {
            // 3. Get specs for first Monkey
            const monkey = monkeyModels[0];
            console.log(`\n3. Fetching specs for ${monkey.model} (ID: ${monkey.id})...`);
            
            const specsResp = await fetch(`${API_BASE}/motorcycles/${monkey.id}/specs`);
            const specs = await specsResp.json();
            
            console.log('\nAPI Response:');
            console.log(JSON.stringify(specs, null, 2));
            
            if (specs.hasSpecs) {
                console.log('\n✅ SUCCESS! Specs are available');
                console.log(`Spec ID: ${specs.specId}`);
                console.log(`Total specs: ${Object.keys(specs.specifications).length}`);
                
                // Show some key specs
                console.log('\nSample specifications:');
                const keySpecs = ['Engine', 'Capacity', 'Max Power', 'Transmission', 'Seat Height'];
                keySpecs.forEach(key => {
                    if (specs.specifications[key]) {
                        console.log(`  ${key}: ${specs.specifications[key]}`);
                    }
                });
            } else {
                console.log('\n❌ No specs found');
            }
        }
        
        // Test the exact URL pattern from add-bike page
        console.log('\n\n4. Testing exact API pattern from add-bike page...');
        
        // The add-bike page uses these exact patterns:
        const testId = '189c16c7-4b30-5cbb-965b-ce869d5903f0'; // Honda Monkey 2022
        console.log(`Testing with ID: ${testId}`);
        
        const directResp = await fetch(`http://localhost:8080/api/motorcycles/${testId}/specs`);
        const directSpecs = await directResp.json();
        
        console.log('Direct API call result:');
        console.log(`  Status: ${directResp.status}`);
        console.log(`  Has Specs: ${directSpecs.hasSpecs}`);
        if (directSpecs.hasSpecs) {
            console.log(`  Spec ID: ${directSpecs.specId}`);
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
        console.error('Stack:', error.stack);
    }
}

// Also test a few other motorcycles with known specs
async function testOtherBrands() {
    console.log('\n\n🔍 Testing other motorcycles with known specs...\n');
    
    const testCases = [
        { brand: 'BMW', year: 2025, expectedModel: 'C 400' },
        { brand: 'Triumph', year: 2025, expectedModel: 'Bonneville' },
        { brand: 'Harley-Davidson', year: 2024, expectedModel: 'CVO' }
    ];
    
    for (const test of testCases) {
        console.log(`\nTesting ${test.brand} ${test.year}...`);
        
        try {
            const modelsResp = await fetch(`${API_BASE}/motorcycles/models/${encodeURIComponent(test.brand)}/${test.year}`);
            const models = await modelsResp.json();
            
            const targetModels = models.filter(m => m.model.includes(test.expectedModel));
            console.log(`Found ${targetModels.length} ${test.expectedModel} models`);
            
            if (targetModels.length > 0) {
                const specsResp = await fetch(`${API_BASE}/motorcycles/${targetModels[0].id}/specs`);
                const specs = await specsResp.json();
                console.log(`  ${targetModels[0].model}: ${specs.hasSpecs ? '✅ Has specs' : '❌ No specs'}`);
            }
        } catch (error) {
            console.error(`  Error: ${error.message}`);
        }
    }
}

// Run tests
async function runAllTests() {
    await testHondaMonkeyFlow();
    await testOtherBrands();
    
    console.log('\n\n✅ Debug complete!');
    console.log('\nIf specs are showing in these tests but not in the add-bike page:');
    console.log('1. Check browser console for errors');
    console.log('2. Check network tab for failed requests');
    console.log('3. Ensure you\'re accessing the correct port (8080 for API, 8081 for website)');
}

runAllTests();