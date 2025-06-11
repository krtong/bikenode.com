// Main application entry point
console.log('app.js starting to load modules...');

import { loadVehicleData } from './data-loader.js';
import { showCategories, showBrands, showYears, showModels, showVariants, showSpecs, showAllSpecs } from './views.js';
import { navigationStack, navigationState } from './navigation.js';
import './actions.js';
import './specs-submission.js';

console.log('app.js modules loaded successfully');

// Global bike data
let bikeData = null;

// Make goBack function global for the back button
window.goBack = function() {
    if (navigationStack.length === 0) return;
    
    const previous = navigationStack.pop();
    
    if (previous.view === 'categories') {
        showCategories(bikeData);
    } else if (previous.view === 'brands') {
        showBrands(bikeData, previous.categoryId);
    } else if (previous.view === 'years') {
        showYears(bikeData, previous.categoryId, previous.brandName);
    } else if (previous.view === 'models') {
        showModels(bikeData, previous.categoryId, previous.brandName, previous.year);
    } else if (previous.view === 'variants') {
        showVariants(bikeData, previous.categoryId, previous.brandName, previous.year, previous.model);
    }
}

// Make showSpecs and showAllSpecs globally available
window.showSpecs = showSpecs;
window.showAllSpecs = showAllSpecs;

// Breadcrumb navigation
window.breadcrumbClick = function(index) {
    // Don't navigate if clicking the last item (current page)
    if (index === navigationState.currentBreadcrumb.length - 1) return;
    
    // Navigate based on breadcrumb index
    if (index === 0) {
        // "Add Bike" - go to categories
        showCategories(bikeData);
    } else if (index === 1) {
        // Category - go to brands
        const category = bikeData.categories.find(c => c.title === navigationState.currentBreadcrumb[1]);
        if (category) showBrands(bikeData, category.id);
    } else if (index === 2) {
        // Brand - go to years
        const category = bikeData.categories.find(c => c.title === navigationState.currentBreadcrumb[1]);
        if (category) showYears(bikeData, category.id, navigationState.currentBreadcrumb[2]);
    } else if (index === 3) {
        // Year - go to models
        const category = bikeData.categories.find(c => c.title === navigationState.currentBreadcrumb[1]);
        if (category) showModels(bikeData, category.id, navigationState.currentBreadcrumb[2], parseInt(navigationState.currentBreadcrumb[3]));
    } else if (index === 4) {
        // Model - go to variants
        const category = bikeData.categories.find(c => c.title === navigationState.currentBreadcrumb[1]);
        if (category) showVariants(bikeData, category.id, navigationState.currentBreadcrumb[2], parseInt(navigationState.currentBreadcrumb[3]), navigationState.currentBreadcrumb[4]);
    }
}

// Check API status
async function checkAPIStatus() {
    const statusIndicator = document.querySelector('.status-indicator');
    try {
        const response = await fetch('http://localhost:8080/api/health');
        if (response.ok) {
            const data = await response.json();
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
        statusIndicator.textContent = '🔴';
        statusIndicator.title = 'Cannot connect to API';
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', async function() {
    console.log('DOMContentLoaded fired, starting initialization...');
    
    try {
        // Check API status
        checkAPIStatus();
        // Check API status every 10 seconds
        setInterval(checkAPIStatus, 10000);
        
        console.log('Loading vehicle data...');
        bikeData = await loadVehicleData();
        console.log('Vehicle data loaded:', bikeData);
        
        console.log('Showing categories...');
        showCategories(bikeData);
        console.log('Initialization complete');
    } catch (error) {
        console.error('Error during initialization:', error);
        document.getElementById('menu-content').innerHTML = `
            <div style="color: #ff4444; padding: 20px;">
                <h3>Initialization Error</h3>
                <p>${error.message}</p>
                <p>Check browser console for details</p>
            </div>
        `;
    }
});

console.log('app.js fully loaded');