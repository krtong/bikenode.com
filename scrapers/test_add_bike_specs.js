// Test script to verify the add-bike motorcycle specs integration

async function testMotorcycleSpecs() {
    console.log('🏍️  Testing Motorcycle Specs Integration');
    console.log('=====================================\n');
    
    try {
        // 1. Get a motorcycle brand that has specs
        console.log('1. Testing brands with specs...');
        const brands = ['Honda', 'Yamaha', 'Kawasaki', 'Suzuki', 'Harley-Davidson'];
        
        for (const brand of brands) {
            console.log(`\n🔍 Checking ${brand}...`);
            
            // Get years for this brand
            const yearsResp = await fetch(`http://localhost:8080/api/motorcycles/years/${brand}`);
            const years = await yearsResp.json();
            
            if (!years || years.length === 0) continue;
            
            // Try a few years
            const testYears = years.slice(0, 3);
            
            for (const year of testYears) {
                // Get models for this year
                const modelsResp = await fetch(`http://localhost:8080/api/motorcycles/models/${brand}/${year}`);
                const motorcycles = await modelsResp.json();
                
                if (!motorcycles || motorcycles.length === 0) continue;
                
                // Test first few motorcycles
                const testBikes = motorcycles.slice(0, 3);
                
                for (const bike of testBikes) {
                    // Check if this bike has specs
                    const specsResp = await fetch(`http://localhost:8080/api/motorcycles/${bike.id}/specs`);
                    const specsData = await specsResp.json();
                    
                    if (specsData.hasSpecs) {
                        console.log(`\n✅ FOUND SPECS: ${year} ${brand} ${bike.model}`);
                        console.log(`   Spec ID: ${specsData.specId}`);
                        console.log(`   Total specifications: ${Object.keys(specsData.specifications).length}`);
                        
                        // Show some sample specs
                        const importantSpecs = ['Engine', 'Capacity', 'Max Power', 'Max Torque', 'Transmission'];
                        console.log('   Sample specifications:');
                        importantSpecs.forEach(key => {
                            if (specsData.specifications[key]) {
                                console.log(`     ${key}: ${specsData.specifications[key]}`);
                            }
                        });
                        
                        return bike; // Return first bike with specs for further testing
                    }
                }
            }
        }
        
        console.log('\n❌ No motorcycles with specs found in test brands');
        
    } catch (error) {
        console.error('Error during test:', error);
    }
}

// Run the test
testMotorcycleSpecs().then(bikeWithSpecs => {
    if (bikeWithSpecs) {
        console.log('\n🎉 Integration test successful!');
        console.log('The add-bike page should now show detailed specs for motorcycles like this one.');
    }
});