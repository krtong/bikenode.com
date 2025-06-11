// Inline version without modules for testing
console.log('app-inline.js loaded!');

// Check API status
async function checkAPIStatus() {
    console.log('Checking API status...');
    const statusIndicator = document.querySelector('.status-indicator');
    try {
        const response = await fetch('http://localhost:8080/api/health');
        if (response.ok) {
            const data = await response.json();
            console.log('API health data:', data);
            if (data.status === 'healthy') {
                statusIndicator.textContent = '🟢';
                statusIndicator.title = `Connected - ${data.motorcycles} motorcycles, ${data.bicycles} bicycles`;
            } else {
                statusIndicator.textContent = '🟡';
                statusIndicator.title = 'API is running but unhealthy';
            }
        } else {
            statusIndicator.textContent = '🔴';
            statusIndicator.title = 'API returned an error';
        }
    } catch (error) {
        console.error('API check error:', error);
        statusIndicator.textContent = '🔴';
        statusIndicator.title = 'Cannot connect to API';
    }
}

// Load vehicle data
async function loadVehicleData() {
    console.log('Loading vehicle data...');
    const bikeData = {
        categories: [
            { 
                id: 'bicycle', 
                icon: '🚴', 
                title: 'Bicycle', 
                description: 'Traditional and electric bicycles',
                preview: { icon: '🚴', name: 'Bicycle', desc: 'Eco-friendly transportation and recreation' }
            },
            { 
                id: 'motorcycle', 
                icon: '🏍️', 
                title: 'Motorcycle', 
                description: 'Motorcycles and scooters',
                preview: { icon: '🏍️', name: 'Motorcycle', desc: 'High-performance road machines' }
            }
        ],
        brands: {
            bicycle: [],
            motorcycle: []
        }
    };

    try {
        // Load motorcycle brands
        const motorcycleResp = await fetch('http://localhost:8080/api/motorcycles/makes');
        const motorcycleData = await motorcycleResp.json();
        bikeData.brands.motorcycle = (motorcycleData || []).map(brand => ({
            id: brand.toLowerCase().replace(/[^a-z0-9]/g, ''),
            title: brand,
            description: `${brand} motorcycles`,
            preview: { icon: '🏍️', name: brand, desc: `Explore ${brand} motorcycles` }
        }));
        
        console.log(`Loaded ${bikeData.brands.motorcycle.length} motorcycle brands`);
        
        // Load bicycle brands
        const bicycleResp = await fetch('http://localhost:8080/api/bicycles/manufacturers');
        const bicycleData = await bicycleResp.json();
        bikeData.brands.bicycle = (bicycleData.manufacturers || []).map(brand => ({
            id: brand.toLowerCase().replace(/[^a-z0-9]/g, ''),
            title: brand,
            description: `${brand} bicycles`,
            preview: { icon: '🚴', name: brand, desc: `Explore ${brand} bicycles` }
        }));
        
        console.log(`Loaded ${bikeData.brands.bicycle.length} bicycle brands`);
        
    } catch (error) {
        console.error('Error loading vehicle data:', error);
    }

    return bikeData;
}

// Show categories
function showCategories(bikeData) {
    console.log('Showing categories...');
    const content = document.getElementById('menu-content');
    content.innerHTML = '';
    
    if (!bikeData || !bikeData.categories) {
        content.innerHTML = '<div style="padding: 20px; color: #ff4444;">No categories available</div>';
        return;
    }
    
    bikeData.categories.forEach(category => {
        const option = document.createElement('div');
        option.className = 'menu-option';
        option.innerHTML = `
            <div class="option-icon">${category.icon}</div>
            <div class="option-content">
                <div class="option-title">${category.title}</div>
                <div class="option-description">${category.description}</div>
            </div>
            <div class="option-arrow">→</div>
        `;
        option.onclick = () => {
            console.log(`Category clicked: ${category.id}`);
            alert(`${category.title} clicked! (Brands would load here)`);
        };
        content.appendChild(option);
    });
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', async function() {
    console.log('DOMContentLoaded fired!');
    
    try {
        // Check API status
        checkAPIStatus();
        setInterval(checkAPIStatus, 10000);
        
        // Load and show data
        const bikeData = await loadVehicleData();
        showCategories(bikeData);
        
        console.log('Initialization complete');
    } catch (error) {
        console.error('Error during initialization:', error);
        document.getElementById('menu-content').innerHTML = `
            <div style="color: #ff4444; padding: 20px;">
                <h3>Initialization Error</h3>
                <p>${error.message}</p>
            </div>
        `;
    }
});

console.log('app-inline.js setup complete');