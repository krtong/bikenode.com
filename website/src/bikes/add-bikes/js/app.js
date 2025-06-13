// Add Bike V2 - Main Application
import { initializeApp, updateBreadcrumb, showStage, showLoading, hideLoading } from './utils.js';
import { loadCategories, loadBrands, loadYears, loadModels, loadVariants, loadSpecs } from './api.js';
import { 
    renderBrands, 
    renderYears, 
    renderModels, 
    renderVariants, 
    renderSpecs 
} from './views.js';

// Application state
const state = {
    currentStage: 'type',
    selectedType: null,
    selectedBrand: null,
    selectedYear: null,
    selectedModel: null,
    selectedVariant: null,
    vehicleData: null,
    fullModelData: null,
    breadcrumb: ['Select Type']
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Add Bike V2 initializing...');
    
    // Initialize UI
    initializeApp();
    
    // Load initial data
    await loadInitialData();
    
    // Set up event listeners
    setupEventListeners();
    
    // Check API status
    checkAPIStatus();
    setInterval(checkAPIStatus, 10000); // Check every 10 seconds
});

// Load initial data
async function loadInitialData() {
    try {
        showLoading('Loading vehicle data...');
        
        // Load categories and counts
        const stats = await loadCategories();
        
        // Update counts in UI
        if (stats.motorcycles !== undefined) {
            document.getElementById('motorcycle-count').textContent = stats.motorcycles.toLocaleString();
        }
        if (stats.bicycles !== undefined) {
            document.getElementById('bicycle-count').textContent = stats.bicycles.toLocaleString();
        }
        if (stats.electrified !== undefined) {
            document.getElementById('electrified-count').textContent = stats.electrified.toLocaleString();
        }
        
        hideLoading();
    } catch (error) {
        console.error('Error loading initial data:', error);
        hideLoading();
    }
}

// Check API status
async function checkAPIStatus() {
    const statusDot = document.getElementById('api-status-dot');
    const statusText = document.querySelector('.add-bike-api-status-v2 .add-bike-status-text');
    
    try {
        const response = await fetch('http://localhost:8080/api/health');
        if (response.ok) {
            const data = await response.json();
            if (data.status === 'healthy') {
                statusDot.style.color = '#4ade80';
                statusText.textContent = 'Connected';
                statusDot.title = `${data.motorcycles} motorcycles, ${data.bicycles} bicycles`;
            } else {
                statusDot.style.color = '#fbbf24';
                statusText.textContent = 'Degraded';
            }
        } else {
            statusDot.style.color = '#f87171';
            statusText.textContent = 'Error';
        }
    } catch (error) {
        statusDot.style.color = '#f87171';
        statusText.textContent = 'Offline';
    }
}

// Set up event listeners
function setupEventListeners() {
    // Type selection
    document.querySelectorAll('.add-bike-type-card').forEach(card => {
        card.addEventListener('click', () => selectType(card.dataset.type));
    });
    
    // Breadcrumb navigation
    document.getElementById('v2-breadcrumb').addEventListener('click', (e) => {
        if (e.target.classList.contains('add-bike-breadcrumb-item') && !e.target.classList.contains('active')) {
            const index = Array.from(e.target.parentElement.children).indexOf(e.target);
            navigateToBreadcrumb(index);
        }
    });
    
    // Filter inputs
    document.getElementById('brand-filter')?.addEventListener('input', (e) => {
        filterBrands(e.target.value);
    });
    
    document.getElementById('model-filter')?.addEventListener('input', (e) => {
        filterModels(e.target.value);
    });
    
    // View toggle
    document.querySelectorAll('.add-bike-view-btn').forEach(btn => {
        btn.addEventListener('click', () => toggleView(btn.dataset.view));
    });
    
    // Global search
    document.querySelector('.add-bike-global-search-input')?.addEventListener('input', (e) => {
        if (e.target.value.length > 2) {
            performGlobalSearch(e.target.value);
        }
    });
}

// Navigation functions
async function selectType(type) {
    state.selectedType = type;
    const typeNames = {
        'motorcycle': 'Motorcycles',
        'bicycle': 'Bicycles',
        'electrified': 'Electrified'
    };
    state.breadcrumb = ['Select Type', typeNames[type] || type];
    updateBreadcrumb(state.breadcrumb);
    
    showLoading(`Loading ${type} brands...`);
    
    try {
        const brands = await loadBrands(type);
        renderBrands(brands, type);
        showStage('brand');
        hideLoading();
    } catch (error) {
        console.error('Error loading brands:', error);
        hideLoading();
    }
}

async function selectBrand(brand) {
    state.selectedBrand = brand;
    state.breadcrumb = state.breadcrumb.slice(0, 2);
    state.breadcrumb.push(brand);
    updateBreadcrumb(state.breadcrumb);
    
    // Update UI
    document.getElementById('selected-brand-name').textContent = brand;
    document.getElementById('selected-brand-name-2').textContent = brand;
    
    showLoading(`Loading ${brand} years...`);
    
    try {
        const years = await loadYears(state.selectedType, brand);
        renderYears(years);
        showStage('year');
        hideLoading();
    } catch (error) {
        console.error('Error loading years:', error);
        hideLoading();
    }
}

async function selectYear(year) {
    state.selectedYear = year;
    state.breadcrumb = state.breadcrumb.slice(0, 3);
    state.breadcrumb.push(year.toString());
    updateBreadcrumb(state.breadcrumb);
    
    // Update UI
    document.getElementById('selected-year').textContent = year;
    
    showLoading(`Loading ${year} ${state.selectedBrand} models...`);
    
    try {
        const models = await loadModels(state.selectedType, state.selectedBrand, year);
        renderModels(models, state.selectedType);
        showStage('model');
        hideLoading();
    } catch (error) {
        console.error('Error loading models:', error);
        hideLoading();
    }
}

async function selectModel(model, modelData) {
    state.selectedModel = model;
    state.vehicleData = modelData;
    state.breadcrumb = state.breadcrumb.slice(0, 4);
    state.breadcrumb.push(model);
    updateBreadcrumb(state.breadcrumb);
    
    // Update UI
    document.getElementById('selected-model-info').textContent = 
        `${state.selectedYear} ${state.selectedBrand} ${model}`;
    
    showLoading(`Loading ${model} variants...`);
    
    try {
        const variants = await loadVariants(state.selectedType, state.selectedBrand, state.selectedYear, model, modelData);
        
        if (variants && variants.length > 1) {
            renderVariants(variants, state.selectedType);
            showStage('variant');
        } else {
            // No variants or single variant, go directly to specs
            await selectVariant(model, modelData);
        }
        hideLoading();
    } catch (error) {
        console.error('Error loading variants:', error);
        hideLoading();
    }
}

async function selectVariant(variant, variantData) {
    state.selectedVariant = variant;
    if (variantData) {
        state.vehicleData = variantData;
    }
    
    state.breadcrumb = state.breadcrumb.slice(0, 5);
    if (variant !== state.selectedModel) {
        state.breadcrumb.push(variant);
    }
    updateBreadcrumb(state.breadcrumb);
    
    showLoading('Loading specifications...');
    
    try {
        const specs = await loadSpecs(
            state.selectedType, 
            state.selectedBrand, 
            state.selectedYear, 
            state.selectedModel,
            variant,
            state.vehicleData
        );
        
        renderSpecs(specs, state);
        showStage('specs');
        hideLoading();
    } catch (error) {
        console.error('Error loading specs:', error);
        hideLoading();
    }
}

// Filter functions
function filterBrands(searchTerm) {
    const brands = document.querySelectorAll('.brand-item');
    const letterSeparators = document.querySelectorAll('.brand-letter-separator');
    const term = searchTerm.toLowerCase();
    
    // If no search term, show everything
    if (!term) {
        brands.forEach(brand => brand.style.display = '');
        letterSeparators.forEach(separator => separator.style.display = '');
        return;
    }
    
    // Hide/show brands based on search
    brands.forEach(brand => {
        const name = brand.querySelector('.brand-name').textContent.toLowerCase();
        brand.style.display = name.includes(term) ? '' : 'none';
    });
    
    // Hide letter separators that have no visible brands
    letterSeparators.forEach(separator => {
        // Find the next siblings until we hit another separator or end
        let hasVisibleBrands = false;
        let nextElement = separator.nextElementSibling;
        
        while (nextElement && !nextElement.classList.contains('brand-letter-separator')) {
            if (nextElement.classList.contains('brand-item') && 
                nextElement.style.display !== 'none') {
                hasVisibleBrands = true;
                break;
            }
            nextElement = nextElement.nextElementSibling;
        }
        
        separator.style.display = hasVisibleBrands ? '' : 'none';
    });
}

function filterModels(searchTerm) {
    const models = document.querySelectorAll('.model-card');
    const term = searchTerm.toLowerCase();
    
    models.forEach(model => {
        const name = model.querySelector('h3').textContent.toLowerCase();
        const desc = model.querySelector('p').textContent.toLowerCase();
        model.style.display = (name.includes(term) || desc.includes(term)) ? '' : 'none';
    });
}

// Category filter for models
window.filterByCategory = function(category) {
    const models = document.querySelectorAll('.model-card');
    
    models.forEach(model => {
        if (!category || model.dataset.category === category) {
            model.style.display = '';
        } else {
            model.style.display = 'none';
        }
    });
};

// View toggle
function toggleView(view) {
    document.querySelectorAll('.add-bike-view-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === view);
    });
    
    const grid = document.getElementById('brand-grid');
    if (grid) {
        grid.classList.toggle('list-view', view === 'list');
    }
}

// Breadcrumb navigation
function navigateToBreadcrumb(index) {
    if (index === 0) {
        // Go back to type selection
        state.breadcrumb = ['Select Type'];
        updateBreadcrumb(state.breadcrumb);
        showStage('type');
    } else if (index === 1 && state.selectedType) {
        // Go back to brand selection
        selectType(state.selectedType);
    } else if (index === 2 && state.selectedBrand) {
        // Go back to year selection
        selectBrand(state.selectedBrand);
    } else if (index === 3 && state.selectedYear) {
        // Go back to model selection
        selectYear(state.selectedYear);
    } else if (index === 4 && state.selectedModel) {
        // Go back to variant selection if applicable
        selectModel(state.selectedModel, state.vehicleData);
    }
}

// Global search
async function performGlobalSearch(query) {
    // This could be implemented to search across all bikes
    console.log('Global search:', query);
}

// Global functions for actions
window.selectBrand = selectBrand;
window.selectYear = selectYear;
window.selectModel = selectModel;
window.selectVariant = selectVariant;

window.addToGarage = async function() {
    if (!state.vehicleData) {
        alert('No vehicle selected');
        return;
    }
    
    // Implement add to garage functionality
    console.log('Adding to garage:', state);
    alert(`Adding ${state.selectedYear} ${state.selectedBrand} ${state.selectedModel} to garage!`);
};

window.compareBikes = function() {
    alert('Compare functionality coming soon!');
};

window.shareSpecs = function() {
    if (navigator.share && state.selectedModel) {
        navigator.share({
            title: `${state.selectedYear} ${state.selectedBrand} ${state.selectedModel}`,
            text: `Check out the specs for this ${state.selectedType}!`,
            url: window.location.href
        }).catch(err => console.log('Error sharing:', err));
    } else {
        // Fallback to copying link
        navigator.clipboard.writeText(window.location.href);
        alert('Link copied to clipboard!');
    }
};

// Export for use in other modules
export { state };