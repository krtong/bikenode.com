// Debug script to test the add-bike UI flow

async function testMotorcycleFlow() {
    console.log('=== Testing Motorcycle Flow ===');
    
    // Test 1: Check if loadVehicleData was called
    console.log('1. Checking if vehicle data loaded...');
    console.log('   Categories:', bikeData.categories);
    console.log('   Motorcycle brands:', bikeData.brands.motorcycle?.length || 0);
    
    // Test 2: Simulate clicking Motorcycle
    console.log('\n2. Clicking Motorcycle category...');
    showBrands('motorcycle');
    
    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Test 3: Check if Honda is in the list
    const menuContent = document.getElementById('menu-content');
    const brandOptions = menuContent.querySelectorAll('.menu-option');
    console.log(`   Found ${brandOptions.length} brands`);
    
    const hondaFound = Array.from(brandOptions).some(opt => 
        opt.textContent.includes('Honda')
    );
    console.log(`   Honda found: ${hondaFound}`);
    
    if (!hondaFound) {
        console.error('   ERROR: Honda not found in brands!');
        return;
    }
    
    // Test 4: Click Honda
    console.log('\n3. Clicking Honda...');
    await showYears('motorcycle', 'Honda');
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Test 5: Check years
    const yearOptions = menuContent.querySelectorAll('.menu-option');
    console.log(`   Found ${yearOptions.length} years`);
    
    const year2001Found = Array.from(yearOptions).some(opt => 
        opt.textContent.includes('2001')
    );
    console.log(`   2001 found: ${year2001Found}`);
    
    if (!year2001Found) {
        console.error('   ERROR: 2001 not found in years!');
        return;
    }
    
    // Test 6: Click 2001
    console.log('\n4. Clicking 2001...');
    await showModels('motorcycle', 'Honda', 2001);
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test 7: Check models
    const modelOptions = menuContent.querySelectorAll('.menu-option');
    console.log(`   Found ${modelOptions.length} models`);
    
    // Log first 10 models
    console.log('   First 10 models:');
    Array.from(modelOptions).slice(0, 10).forEach((model, i) => {
        console.log(`     ${i + 1}. ${model.textContent.trim()}`);
    });
    
    // Test 8: Check breadcrumb
    const breadcrumb = document.getElementById('breadcrumb');
    console.log('\n5. Breadcrumb:', breadcrumb.textContent);
    
    // Test 9: Test breadcrumb clicking
    console.log('\n6. Testing breadcrumb navigation...');
    const breadcrumbItems = breadcrumb.querySelectorAll('.breadcrumb-item');
    console.log(`   Found ${breadcrumbItems.length} breadcrumb items`);
    
    // Try clicking on "Motorcycle"
    if (breadcrumbItems.length > 1) {
        console.log('   Clicking on second breadcrumb item (Motorcycle)...');
        breadcrumbItems[1].click();
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const newBreadcrumb = document.getElementById('breadcrumb').textContent;
        console.log('   New breadcrumb:', newBreadcrumb);
        console.log('   Current view:', currentView);
    }
}

// Add to window for easy testing
window.testMotorcycleFlow = testMotorcycleFlow;

// Run test after page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(testMotorcycleFlow, 1000);
    });
} else {
    setTimeout(testMotorcycleFlow, 1000);
}