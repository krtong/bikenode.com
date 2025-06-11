// Debug version of app.js
console.log('app-debug.js loading...');

// Add error handling
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    document.getElementById('menu-content').innerHTML = `
        <div style="color: red; padding: 20px;">
            <h3>JavaScript Error</h3>
            <p>${event.error.message}</p>
            <pre>${event.error.stack}</pre>
        </div>
    `;
});

// Simple inline version without module imports
document.addEventListener('DOMContentLoaded', async function() {
    console.log('DOM loaded, initializing...');
    
    const menuContent = document.getElementById('menu-content');
    const statusIndicator = document.querySelector('.status-indicator');
    
    // Check API
    try {
        const response = await fetch('http://localhost:8080/api/health');
        const data = await response.json();
        statusIndicator.textContent = '🟢';
        console.log('API healthy:', data);
    } catch (error) {
        statusIndicator.textContent = '🔴';
        console.error('API error:', error);
    }
    
    // Load categories directly
    const categories = [
        { 
            id: 'bicycle', 
            icon: '🚴', 
            title: 'Bicycle', 
            description: 'Traditional and electric bicycles'
        },
        { 
            id: 'motorcycle', 
            icon: '🏍️', 
            title: 'Motorcycle', 
            description: 'Motorcycles and scooters'
        }
    ];
    
    // Display categories
    menuContent.innerHTML = '';
    categories.forEach(category => {
        const div = document.createElement('div');
        div.className = 'menu-option';
        div.innerHTML = `
            <div class="option-icon">${category.icon}</div>
            <div class="option-content">
                <div class="option-title">${category.title}</div>
                <div class="option-description">${category.description}</div>
            </div>
            <div class="option-arrow">→</div>
        `;
        div.onclick = async () => {
            console.log('Category clicked:', category.id);
            await loadBrands(category.id);
        };
        menuContent.appendChild(div);
    });
    
    async function loadBrands(categoryId) {
        menuContent.innerHTML = '<div style="padding: 20px;">Loading brands...</div>';
        
        try {
            let brands = [];
            if (categoryId === 'motorcycle') {
                const response = await fetch('http://localhost:8080/api/motorcycles/makes');
                brands = await response.json();
            } else {
                const response = await fetch('http://localhost:8080/api/bicycles/manufacturers');
                const data = await response.json();
                brands = data.manufacturers || [];
            }
            
            console.log(`Loaded ${brands.length} ${categoryId} brands`);
            
            menuContent.innerHTML = '';
            brands.forEach(brand => {
                const div = document.createElement('div');
                div.className = 'menu-option';
                div.innerHTML = `
                    <div class="option-content">
                        <div class="option-title">${brand}</div>
                    </div>
                    <div class="option-arrow">→</div>
                `;
                menuContent.appendChild(div);
            });
            
        } catch (error) {
            console.error('Error loading brands:', error);
            menuContent.innerHTML = `
                <div style="color: red; padding: 20px;">
                    <h3>Error loading brands</h3>
                    <p>${error.message}</p>
                </div>
            `;
        }
    }
    
    console.log('Initialization complete');
});