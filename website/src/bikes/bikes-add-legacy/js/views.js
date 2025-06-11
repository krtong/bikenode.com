// View management functions
import { updateHeader, updateBreadcrumb, showBackButton, hideBackButton, updateDisplay, navigationStack, navigationState } from './navigation.js';
import { createMenuOption, renderItemsWithSearch, renderItemsWithCategoryGrouping } from './menu-rendering.js';
import { displayBicycleSpecs, displayBasicBikeInfo, displayAllDatabaseFields } from './specs-display.js';
import { checkSpecsCompleteness } from './specs-submission.js';
import { toTitleCase, normalizeVehicleNames } from './text-utils.js';

export function showCategories(bikeData) {
    console.log('=== VIEWS: showCategories called ===');
    console.log('bikeData:', bikeData);
    console.log('bikeData.categories:', bikeData?.categories);
    navigationState.currentView = 'categories';
    updateHeader('Vehicle Selection', 'Choose your vehicle category to get started');
    updateBreadcrumb(['Add Bike']);
    hideBackButton();
    
    const content = document.getElementById('menu-content');
    content.innerHTML = '';
    
    if (!bikeData || !bikeData.categories) {
        content.innerHTML = '<div style="padding: 20px; color: #ff4444;">No categories available</div>';
        return;
    }
    
    bikeData.categories.forEach(category => {
        const option = createMenuOption(category, () => showBrands(bikeData, category.id));
        content.appendChild(option);
    });
    
    updateDisplay('🚗', 'Select Category', 'Choose a vehicle category from the menu to begin your selection');
}

export function showBrands(bikeData, categoryId) {
    navigationStack.push({ view: 'categories' });
    navigationState.currentView = 'brands';
    navigationState.selectedVehicle.category = categoryId;
    
    const categoryData = bikeData.categories.find(c => c.id === categoryId);
    updateHeader('Select Brand', `Choose a ${categoryData.title.toLowerCase()} manufacturer`);
    updateBreadcrumb(['Add Bike', categoryData.title]);
    showBackButton();
    
    const brands = bikeData.brands[categoryId] || [];
    
    if (brands.length === 0) {
        document.getElementById('menu-content').innerHTML = '<div class="menu-option" style="opacity: 0.5; cursor: default;">No brands available</div>';
        return;
    }
    
    renderItemsWithSearch(
        brands,
        (brand) => showYears(bikeData, categoryId, brand.title),
        `Search ${categoryData.title.toLowerCase()} brands...`,
        true // Show alphabetical separators
    );
}

export async function showYears(bikeData, categoryId, brandName) {
    navigationStack.push({ view: 'brands', categoryId });
    navigationState.currentView = 'years';
    
    // Normalize brand name
    const normalizedBrand = toTitleCase(brandName);
    navigationState.selectedVehicle.brand = normalizedBrand;
    
    const categoryData = bikeData.categories.find(c => c.id === categoryId);
    updateHeader('Select Year', `Choose the model year for ${normalizedBrand}`);
    updateBreadcrumb(['Add Bike', categoryData.title, normalizedBrand]);
    showBackButton();
    
    // Show loading indicator
    const content = document.getElementById('menu-content');
    content.innerHTML = `
        <div class="menu-loading">
            <div class="menu-loading-spinner"></div>
            <div class="menu-loading-text">Loading ${normalizedBrand} years...</div>
        </div>
    `;
    
    try {
        // Load years for this brand
        let years = [];
        if (categoryId === 'bicycle') {
            const resp = await fetch(`http://localhost:8080/api/bicycles/years/${brandName}`);
            const data = await resp.json();
            years = data.years || [];
        } else {
            // For motorcycles, load years for this specific make
            const resp = await fetch(`http://localhost:8080/api/motorcycles/years/${encodeURIComponent(brandName)}`);
            const data = await resp.json();
            years = data || [];
        }
        
        if (years.length === 0) {
            document.getElementById('menu-content').innerHTML = '<div class="menu-option" style="opacity: 0.5; cursor: default;">No years available</div>';
            return;
        }
        
        // Convert years to menu items
        const yearItems = years.map(year => ({
            id: year.toString(),
            title: year.toString(),
            description: '',
            preview: { icon: '📅', name: `${year} Models`, desc: `View ${year} ${normalizedBrand} models` }
        }));
        
        renderItemsWithSearch(
            yearItems,
            (yearItem) => showModels(bikeData, categoryId, brandName, parseInt(yearItem.title)),
            'Search years...',
            false // No alphabetical separators for years
        );
        
    } catch (error) {
        console.error('Error loading years:', error);
        document.getElementById('menu-content').innerHTML = '<div class="menu-option" style="opacity: 0.5; cursor: default;">Error loading years</div>';
    }
}

export async function showModels(bikeData, categoryId, brandName, year) {
    navigationStack.push({ view: 'years', categoryId, brandName });
    navigationState.currentView = 'models';
    navigationState.selectedVehicle.year = year;
    
    // Normalize brand name
    const normalizedBrand = toTitleCase(brandName);
    
    const categoryData = bikeData.categories.find(c => c.id === categoryId);
    updateHeader('Select Model', `${year} ${normalizedBrand} models`);
    updateBreadcrumb(['Add Bike', categoryData.title, normalizedBrand, year.toString()]);
    showBackButton();
    
    // Show loading indicator
    const content = document.getElementById('menu-content');
    content.innerHTML = `
        <div class="menu-loading">
            <div class="menu-loading-spinner"></div>
            <div class="menu-loading-text">Loading ${year} ${normalizedBrand} models...</div>
        </div>
    `;
    
    try {
        let models = [];
        if (categoryId === 'bicycle') {
            const resp = await fetch(`http://localhost:8080/api/bicycles/models/${brandName}/${year}`);
            const data = await resp.json();
            models = data.models || [];
        } else {
            // For motorcycles, store the full data and extract unique models
            console.log(`Fetching motorcycle models for ${brandName} ${year}...`);
            
            const resp = await fetch(`http://localhost:8080/api/motorcycles/models/${encodeURIComponent(brandName)}/${year}`);
            const motorcycleData = await resp.json();
            console.log(`API returned ${motorcycleData?.length || 0} motorcycle records`);
            
            // Store full data for later use
            navigationState.selectedVehicle.fullModelData = motorcycleData;
            
            // Extract unique model names (without package)
            const modelMap = new Map();
            
            if (Array.isArray(motorcycleData)) {
                motorcycleData.forEach(m => {
                    if (!modelMap.has(m.model)) {
                        modelMap.set(m.model, []);
                    }
                    modelMap.get(m.model).push(m);
                });
            }
            
            models = Array.from(modelMap.keys()).sort();
            console.log(`Found ${models.length} unique models for ${brandName} ${year}`);
        }
        
        if (models.length === 0) {
            document.getElementById('menu-content').innerHTML = '<div class="menu-option" style="opacity: 0.5; cursor: default;">No models available</div>';
            return;
        }
        
        console.log(`Displaying ${models.length} models`);
        if (models.length > 0) {
            console.log('Sample models:', models.slice(0, 5));
        }
        
        // Convert models to menu items with category/engine info
        const modelItems = models.map(model => {
            // Normalize model name
            const normalizedModel = toTitleCase(model);
            
            // Get category and engine info for this model
            let modelInfo = { category: '', engine: '' };
            if (categoryId === 'motorcycle' && navigationState.selectedVehicle.fullModelData) {
                const modelData = navigationState.selectedVehicle.fullModelData.find(m => m.model === model);
                if (modelData) {
                    modelInfo.category = modelData.category || '';
                    modelInfo.engine = modelData.engine || '';
                }
            }
            
            const description = modelInfo.category && modelInfo.engine 
                ? `${modelInfo.category} - ${modelInfo.engine}`
                : modelInfo.category || modelInfo.engine || 'Details available';
                
            return {
                id: model.toLowerCase().replace(/[^a-z0-9]/g, ''),
                title: normalizedModel,
                description: description,
                category: modelInfo.category,
                preview: { icon: categoryId === 'bicycle' ? '🚴' : '🏍️', name: normalizedModel, desc: `View variants` },
                _originalModel: model  // Keep original for API calls
            };
        });
        
        if (categoryId === 'motorcycle') {
            // For motorcycles, render with category grouping
            renderItemsWithCategoryGrouping(
                modelItems,
                (modelItem) => showVariants(bikeData, categoryId, brandName, year, modelItem._originalModel),
                `Search ${normalizedBrand} models...`
            );
        } else {
            // For bicycles, use the regular alphabetical rendering
            renderItemsWithSearch(
                modelItems,
                (modelItem) => showVariants(bikeData, categoryId, brandName, year, modelItem._originalModel),
                `Search ${normalizedBrand} models...`,
                true // Show alphabetical separators for models
            );
        }
        
    } catch (error) {
        console.error('Error loading models:', error);
        document.getElementById('menu-content').innerHTML = '<div class="menu-option" style="opacity: 0.5; cursor: default;">Error loading models</div>';
    }
}

export async function showVariants(bikeData, categoryId, brandName, year, model) {
    navigationStack.push({ view: 'models', categoryId, brandName, year });
    navigationState.currentView = 'variants';
    
    // Normalize names
    const normalizedBrand = toTitleCase(brandName);
    const normalizedModel = toTitleCase(model);
    navigationState.selectedVehicle.model = normalizedModel;
    
    const categoryData = bikeData.categories.find(c => c.id === categoryId);
    updateHeader('Select Variant', `${year} ${normalizedBrand} ${normalizedModel} variants`);
    updateBreadcrumb(['Add Bike', categoryData.title, normalizedBrand, year.toString(), normalizedModel]);
    showBackButton();
    
    if (categoryId === 'bicycle') {
        // For bicycles, fetch variants from the API
        const content = document.getElementById('menu-content');
        content.innerHTML = `
            <div class="menu-loading">
                <div class="menu-loading-spinner"></div>
                <div class="menu-loading-text">Loading ${normalizedModel} variants...</div>
            </div>
        `;
        
        try {
            const resp = await fetch(`http://localhost:8080/api/bicycles/variants/${encodeURIComponent(brandName)}/${year}/${encodeURIComponent(model)}`);
            const data = await resp.json();
            const variants = data.variants || [];
            
            console.log(`Found ${variants.length} variants for ${model}`);
            
            if (variants.length === 0) {
                content.innerHTML = '<div class="menu-option" style="opacity: 0.5; cursor: default;">No variants available</div>';
                return;
            }
            
            // Convert variants to menu items
            const variantItems = variants.map(variant => {
                // Extract just the variant-specific part (remove the base model name if it's at the start)
                let variantDisplay = variant;
                if (variant.toLowerCase().startsWith(model.toLowerCase())) {
                    variantDisplay = variant.substring(model.length).trim() || 'Standard';
                }
                
                // Normalize the variant names
                const normalizedVariantDisplay = toTitleCase(variantDisplay || variant);
                const normalizedFullVariant = toTitleCase(variant);
                
                return {
                    id: variant.toLowerCase().replace(/[^a-z0-9]/g, ''),
                    title: normalizedVariantDisplay,
                    description: 'View specifications',
                    preview: { icon: '🚴', name: normalizedFullVariant, desc: 'View full specifications' },
                    _fullVariantName: variant
                };
            });
            
            renderItemsWithSearch(
                variantItems,
                (variantItem) => showSpecs(categoryId, brandName, year, model, variantItem._fullVariantName),
                `Search ${model} variants...`,
                false // No alphabetical separators for variants
            );
        } catch (error) {
            console.error('Error loading bicycle variants:', error);
            content.innerHTML = '<div class="menu-option" style="opacity: 0.5; cursor: default;">Error loading variants</div>';
        }
    } else if (categoryId === 'motorcycle' && navigationState.selectedVehicle.fullModelData) {
        // Filter variants for this specific model
        const variants = navigationState.selectedVehicle.fullModelData.filter(m => m.model === model);
        
        console.log(`Found ${variants.length} variants for ${model}`);
        
        if (variants.length === 0) {
            document.getElementById('menu-content').innerHTML = '<div class="menu-option" style="opacity: 0.5; cursor: default;">No variants available</div>';
            return;
        }
        
        // Convert variants to menu items
        const variantItems = variants.map(variant => {
            const variantName = variant.package || 'Standard';
            const normalizedVariantName = toTitleCase(variantName);
            const fullTitle = variant.package ? `${normalizedModel} ${normalizedVariantName}` : normalizedModel;
            return {
                id: `${model}-${variantName}`.toLowerCase().replace(/[^a-z0-9]/g, ''),
                title: fullTitle,
                description: variant.category ? `${variant.category} - ${variant.engine || 'Engine info not available'}` : 'Details available',
                preview: { icon: '🏍️', name: fullTitle, desc: 'View full specifications' },
                _variantData: variant,
                _variantName: variantName
            };
        });
        
        renderItemsWithSearch(
            variantItems,
            (variantItem) => showSpecs(categoryId, brandName, year, model, variantItem._variantName, variantItem._variantData),
            `Search ${model} variants...`,
            false // No alphabetical separators for variants
        );
    } else {
        // For bicycles or if no data, show single option
        const content = document.getElementById('menu-content');
        content.innerHTML = '';
        const standardOption = {
            id: `${model}-standard`,
            title: 'Standard',
            description: 'Standard configuration',
            preview: { icon: categoryId === 'bicycle' ? '🚴' : '🏍️', name: `${model} Standard`, desc: 'View specifications' }
        };
        const option = createMenuOption(standardOption, () => showSpecs(categoryId, brandName, year, model, 'Standard'));
        content.appendChild(option);
    }
}

export async function showSpecs(categoryId, brandName, year, model, variant, fullData) {
    navigationState.selectedVehicle.model = model;
    navigationState.selectedVehicle.variant = variant;
    document.getElementById('specs-panel').classList.add('active');
    
    // Normalize all names for display
    const normalizedBrand = toTitleCase(brandName);
    const normalizedModel = toTitleCase(model);
    const normalizedVariant = toTitleCase(variant);
    
    // For bicycles, variant contains the full model name
    let displayTitle = categoryId === 'bicycle' 
        ? `${year} ${normalizedBrand} ${normalizedVariant}`
        : `${year} ${normalizedBrand} ${normalizedModel} ${normalizedVariant}`;
        
    document.getElementById('specs-title').textContent = displayTitle;
    
    const specGrid = document.getElementById('spec-grid');
    specGrid.innerHTML = '<div style="padding: 20px;">Loading specifications...</div>';
    
    try {
        // For bicycles, fetch detailed specs from our normalized database
        if (categoryId === 'bicycle') {
            try {
                // For bicycles, use the full variant name as the model in the API call
                console.log(`Fetching specs for bicycle: ${brandName} ${year} ${variant}`);
                const specsResp = await fetch(`http://localhost:8080/api/bicycles/specs/${encodeURIComponent(brandName)}/${year}/${encodeURIComponent(variant)}`);
                
                if (specsResp.ok) {
                    const specsData = await specsResp.json();
                    console.log('Received bicycle specs data:', specsData);
                    
                    if (specsData && specsData.hasSpecs && specsData.specifications) {
                        // Display ALL fields from the database
                        displayBicycleSpecs(specsData.specifications);
                        return;
                    } else if (specsData && specsData.hasBasicInfo) {
                        // Display basic info from catalog
                        displayBasicBikeInfo(specsData.bike, normalizedBrand, year, normalizedModel, normalizedVariant);
                        return;
                    } else {
                        // Clear loading message if no specs data
                        specGrid.innerHTML = '';
                    }
                }
            } catch (specError) {
                console.error('Error fetching bicycle specs:', specError);
            }
        }
        
        // Default specs display (for motorcycles or fallback)
        let specs = {
            'Brand': normalizedBrand,
            'Model': normalizedModel,
            'Variant': normalizedVariant,
            'Year': year,
            'Type': categoryId === 'bicycle' ? 'Bicycle' : 'Motorcycle'
        };
        
        // Add motorcycle-specific data if available
        if (fullData) {
            if (fullData.category) specs['Category'] = fullData.category;
            if (fullData.engine) specs['Engine'] = fullData.engine;
            navigationState.selectedVehicle.motorcycleId = fullData.id; // Store the motorcycle ID
        }
        
        // For motorcycles, try to fetch detailed specs from the database
        if (categoryId === 'motorcycle' && fullData && fullData.id) {
            try {
                console.log(`Fetching specs for motorcycle ID: ${fullData.id}`);
                const specsResp = await fetch(`http://localhost:8080/api/motorcycles/${fullData.id}/specs`);
                
                if (specsResp.ok) {
                    const specsData = await specsResp.json();
                    console.log('Received specs data:', specsData);
                    
                    if (specsData && specsData.hasSpecs) {
                        // Clear loading message before adding specs
                        specGrid.innerHTML = '';
                        
                        // Add a visual indicator that we have detailed specs
                        specs['📊 Data Available'] = '✅ Full Specifications';
                        
                        // Add key specifications if available
                        if (specsData.specifications) {
                            const importantSpecs = [
                                'Engine', 'Capacity', 'Max Power', 'Max Torque',
                                'Transmission', 'Final Drive', 'Fuel Capacity',
                                'Seat Height', 'Wet Weight', 'Dry Weight',
                                'Front Suspension', 'Rear Suspension',
                                'Front Brakes', 'Rear Brakes',
                                'Front Tyre', 'Rear Tyre'
                            ];
                            
                            importantSpecs.forEach(specKey => {
                                if (specsData.specifications[specKey]) {
                                    specs[specKey] = specsData.specifications[specKey];
                                }
                            });
                            
                            // Store full specs for later use
                            navigationState.selectedVehicle.fullSpecs = specsData.specifications;
                            
                            // Add a "View All Specs" indicator
                            const totalSpecs = Object.keys(specsData.specifications).length;
                            specs[''] = `${totalSpecs} total specifications available`;
                        }
                    } else {
                        specs['📊 Data Available'] = '❌ No detailed specs';
                    }
                }
            } catch (specError) {
                console.error('Error fetching detailed specs:', specError);
                // Continue with basic specs if detailed fetch fails
            }
        }
        
        specGrid.innerHTML = '';
        let hasDetailedSpecs = false;
        
        Object.entries(specs).forEach(([label, value]) => {
            if (label === '' && value.includes('specifications available')) {
                // Special styling for the total specs count
                const card = document.createElement('div');
                card.className = 'spec-item';
                card.style.gridColumn = 'span 2';
                card.style.textAlign = 'center';
                card.style.background = '#1a1a1a';
                card.style.border = '2px solid var(--accent)';
                card.innerHTML = `
                    <div class="spec-value" style="color: var(--accent); font-size: 16px;">${value}</div>
                    <button onclick="window.showAllSpecs()" style="margin-top: 10px; padding: 8px 16px; background: var(--accent); border: none; border-radius: 4px; color: white; cursor: pointer;">View All Specifications</button>
                `;
                specGrid.appendChild(card);
                hasDetailedSpecs = true;
            } else if (label) {
                const card = document.createElement('div');
                card.className = 'spec-item';
                if (label === '📊 Data Available') {
                    card.style.gridColumn = 'span 2';
                    card.style.background = value.includes('✅') ? '#1a2f1a' : '#2f1a1a';
                }
                card.innerHTML = `
                    <div class="spec-label">${label}</div>
                    <div class="spec-value">${value}</div>
                `;
                specGrid.appendChild(card);
            }
        });
        
        // Check specs completeness and show notice if needed
        checkSpecsCompleteness(specs);
        
        // Update action buttons based on spec availability
        if (hasDetailedSpecs) {
            // Update the compare button to be more prominent
            const compareBtn = document.querySelector('.action-button:nth-child(2)');
            if (compareBtn) {
                compareBtn.style.background = 'var(--accent)';
                compareBtn.style.color = 'white';
                compareBtn.textContent = 'Compare Specs';
            }
        }
        
    } catch (error) {
        console.error('Error loading specifications:', error);
        specGrid.innerHTML = '<div style="color: red; padding: 20px;">Error loading specifications</div>';
    }
}

// Function to show all specifications in a modal or expanded view
export function showAllSpecs() {
    if (!navigationState.selectedVehicle.fullSpecs) {
        alert('Full specifications not available');
        return;
    }
    
    // For now, just log the specs - you can implement a modal later
    console.log('Full specifications:', navigationState.selectedVehicle.fullSpecs);
    alert(`${Object.keys(navigationState.selectedVehicle.fullSpecs).length} specifications available. Check console for details.`);
}

// Expose showAllSpecs to window for onclick handler
window.showAllSpecs = showAllSpecs;