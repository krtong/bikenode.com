// View rendering functions

// Render brand grid/list
export function renderBrands(brands, type) {
    const brandGrid = document.getElementById('brand-grid');
    if (!brandGrid) return;
    
    brandGrid.innerHTML = '';
    
    // Sort brands alphabetically
    brands.sort((a, b) => a.name.localeCompare(b.name));
    
    // Group by first letter
    const grouped = {};
    brands.forEach(brand => {
        const firstLetter = brand.name[0].toUpperCase();
        if (!grouped[firstLetter]) {
            grouped[firstLetter] = [];
        }
        grouped[firstLetter].push(brand);
    });
    
    // Render grouped brands
    Object.keys(grouped).sort().forEach(letter => {
        // Add letter separator
        const separator = document.createElement('div');
        separator.className = 'add-bikes-brand-letter-separator';
        separator.textContent = letter;
        brandGrid.appendChild(separator);
        
        // Add brands for this letter
        grouped[letter].forEach(brand => {
            const brandItem = document.createElement('div');
            brandItem.className = 'add-bikes-brand-item';
            const icons = {
                'motorcycle': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="18" r="3"></circle><circle cx="6" cy="18" r="3"></circle><path d="M6 15h12v-4l-3-3h-6l-3 3v4z"></path></svg>',
                'bicycle': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="18" r="3"></circle><circle cx="12" cy="6" r="3"></circle><path d="M12 9v6"></path></svg>',
                'electrified': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path></svg>'
            };
            
            brandItem.innerHTML = `
                <div class="add-bikes-brand-icon">${icons[type] || icons['bicycle']}</div>
                <div class="add-bikes-brand-name">${brand.name}</div>
                ${brand.count ? `<div class="add-bikes-brand-count">${brand.count} models</div>` : ''}
            `;
            brandItem.onclick = () => window.selectBrand(brand.name);
            brandGrid.appendChild(brandItem);
        });
    });
}

// Render year timeline
export function renderYears(years) {
    const yearTimeline = document.getElementById('year-timeline');
    if (!yearTimeline) return;
    
    yearTimeline.innerHTML = '';
    
    // Group years by decade
    const decades = {};
    years.forEach(year => {
        const decade = Math.floor(year / 10) * 10;
        if (!decades[decade]) {
            decades[decade] = [];
        }
        decades[decade].push(year);
    });
    
    // Render by decade
    Object.keys(decades).sort((a, b) => b - a).forEach(decade => {
        const decadeSection = document.createElement('div');
        decadeSection.className = 'add-bikes-decade-section';
        decadeSection.innerHTML = `<h3>${decade}s</h3>`;
        
        const yearGrid = document.createElement('div');
        yearGrid.className = 'add-bikes-year-grid';
        
        decades[decade].sort((a, b) => b - a).forEach(year => {
            const yearItem = document.createElement('div');
            yearItem.className = 'add-bikes-year-item';
            yearItem.textContent = year;
            yearItem.onclick = () => window.selectYear(year);
            yearGrid.appendChild(yearItem);
        });
        
        decadeSection.appendChild(yearGrid);
        yearTimeline.appendChild(decadeSection);
    });
}

// Render model grid
export function renderModels(modelData, type) {
    const modelGrid = document.getElementById('model-grid');
    const categoryFilter = document.getElementById('category-filter');
    if (!modelGrid) return;
    
    modelGrid.innerHTML = '';
    
    let models = [];
    let categories = new Set();
    
    if (type === 'bicycle') {
        models = (modelData.models || []).map(model => ({
            name: model,
            category: '',
            engine: ''
        }));
    } else {
        // For motorcycles, extract unique models
        const modelMap = new Map();
        const fullData = modelData.raw || modelData.models || [];
        
        fullData.forEach(m => {
            if (!modelMap.has(m.model)) {
                modelMap.set(m.model, {
                    name: m.model,
                    category: m.category || '',
                    engine: m.engine || '',
                    data: m
                });
                if (m.category) categories.add(m.category);
            }
        });
        
        models = Array.from(modelMap.values());
        
        // Update category filter
        if (categoryFilter && categories.size > 0) {
            categoryFilter.innerHTML = '<option value="">All Categories</option>';
            Array.from(categories).sort().forEach(cat => {
                const option = document.createElement('option');
                option.value = cat;
                option.textContent = cat;
                categoryFilter.appendChild(option);
            });
            categoryFilter.onchange = (e) => window.filterByCategory(e.target.value);
        }
    }
    
    // Sort models alphabetically
    models.sort((a, b) => a.name.localeCompare(b.name));
    
    // Render models
    models.forEach(model => {
        const modelCard = document.createElement('div');
        modelCard.className = 'add-bikes-model-card';
        modelCard.dataset.category = model.category;
        
        const description = model.category && model.engine 
            ? `${model.category} - ${model.engine}`
            : model.category || model.engine || 'View details';
            
        modelCard.innerHTML = `
            <div class="add-bikes-model-icon">${type === 'motorcycle' ? 
                '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="18" r="3"></circle><circle cx="6" cy="18" r="3"></circle><path d="M6 15h12v-4l-3-3h-6l-3 3v4z"></path></svg>' : 
                '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="18" r="3"></circle><circle cx="12" cy="6" r="3"></circle><path d="M12 9v6"></path></svg>'}</div>
            <h3>${model.name}</h3>
            <p>${description}</p>
        `;
        
        modelCard.onclick = () => window.selectModel(model.name, model.data || model);
        modelGrid.appendChild(modelCard);
    });
}

// Render variant list
export function renderVariants(variants, type) {
    const variantList = document.getElementById('variant-list');
    if (!variantList) return;
    
    variantList.innerHTML = '';
    
    if (type === 'bicycle') {
        // For bicycles, variants are variant names
        variants.forEach(variant => {
            const variantItem = document.createElement('div');
            variantItem.className = 'add-bikes-variant-item';
            variantItem.innerHTML = `
                <div class="add-bikes-variant-icon"><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="18" r="3"></circle><circle cx="12" cy="6" r="3"></circle><path d="M12 9v6"></path></svg></div>
                <div class="add-bikes-variant-info">
                    <h4>${variant}</h4>
                    <p>View specifications</p>
                </div>
                <div class="add-bikes-variant-arrow"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg></div>
            `;
            variantItem.onclick = () => window.selectVariant(variant);
            variantList.appendChild(variantItem);
        });
    } else {
        // For motorcycles, variants have more data
        variants.forEach(variant => {
            const variantName = variant.package || 'Standard';
            const variantItem = document.createElement('div');
            variantItem.className = 'add-bikes-variant-item';
            variantItem.innerHTML = `
                <div class="add-bikes-variant-icon"><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="18" r="3"></circle><circle cx="6" cy="18" r="3"></circle><path d="M6 15h12v-4l-3-3h-6l-3 3v4z"></path></svg></div>
                <div class="add-bikes-variant-info">
                    <h4>${variant.model} ${variantName !== 'Standard' ? variantName : ''}</h4>
                    <p>${variant.category ? `${variant.category} - ${variant.engine || 'Engine info not available'}` : 'View specifications'}</p>
                </div>
                <div class="add-bikes-variant-arrow"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg></div>
            `;
            variantItem.onclick = () => window.selectVariant(variantName, variant);
            variantList.appendChild(variantItem);
        });
    }
}

// Render specifications
export function renderSpecs(specsData, state) {
    const specsTitle = document.getElementById('specs-title');
    const specsSubtitle = document.getElementById('specs-subtitle');
    const specsDetails = document.getElementById('specs-details');
    const specsIcon = document.querySelector('.add-bikes-vehicle-icon-large');
    
    // Update title
    specsTitle.textContent = `${state.selectedYear} ${state.selectedBrand} ${state.selectedModel}`;
    if (state.selectedVariant && state.selectedVariant !== state.selectedModel) {
        specsTitle.textContent += ` ${state.selectedVariant}`;
    }
    
    // Update icon
    if (specsIcon) {
        const icons = {
            'motorcycle': '<svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="18" r="3"></circle><circle cx="6" cy="18" r="3"></circle><path d="M6 15h12v-4l-3-3h-6l-3 3v4z"></path></svg>',
            'bicycle': '<svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="18" r="3"></circle><circle cx="12" cy="6" r="3"></circle><path d="M12 9v6"></path></svg>',
            'electrified': '<svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path></svg>'
        };
        specsIcon.innerHTML = icons[state.selectedType] || icons['bicycle'];
    }
    
    // Clear previous specs
    specsDetails.innerHTML = '';
    
    if (specsData.hasSpecs && specsData.specifications) {
        specsSubtitle.textContent = 'Full specifications available';
        renderDetailedSpecs(specsData.specifications, specsDetails, state.selectedType);
    } else {
        specsSubtitle.textContent = 'Basic information';
        renderBasicSpecs(specsData, specsDetails, state);
    }
}

// Render detailed specifications
function renderDetailedSpecs(specs, container, type) {
    // Group specifications by category
    const categories = {
        'Engine': ['Engine', 'Capacity', 'Max Power', 'Max Torque', 'Compression', 'Bore x Stroke', 'Fuel System', 'Cooling'],
        'Transmission': ['Transmission', 'Gearbox', 'Clutch', 'Final Drive'],
        'Chassis': ['Frame', 'Front Suspension', 'Rear Suspension', 'Front Brakes', 'Rear Brakes', 'ABS'],
        'Dimensions': ['Wheelbase', 'Seat Height', 'Ground Clearance', 'Wet Weight', 'Dry Weight', 'Fuel Capacity'],
        'Wheels & Tires': ['Front Tyre', 'Rear Tyre', 'Front Wheel', 'Rear Wheel'],
        'Performance': ['Top Speed', '0-100 km/h', 'Fuel Consumption', 'CO2 Emissions'],
        'Electrical': ['Battery', 'Alternator', 'Headlight'],
        'Other': []
    };
    
    // For bicycles, use different categories
    if (type === 'bicycle') {
        Object.assign(categories, {
            'Frame': ['frame', 'frame_material', 'fork', 'fork_material'],
            'Drivetrain': ['drivetrain', 'shifters', 'front_derailleur', 'rear_derailleur', 'crankset', 'cassette', 'chain'],
            'Brakes': ['brakes', 'brake_type', 'rotors'],
            'Wheels & Tires': ['wheels', 'wheel_size', 'rims', 'tires', 'tire_size'],
            'Components': ['handlebars', 'stem', 'saddle', 'seatpost', 'pedals'],
            'Pricing': ['msrp', 'price']
        });
    }
    
    // For electrified bikes, use specialized categories
    if (type === 'electrified') {
        Object.assign(categories, {
            'Power System': ['motor_power', 'battery', 'battery_capacity', 'charging_time'],
            'Performance': ['top_speed', 'range', 'modes'],
            'Chassis': ['frame', 'suspension_front', 'suspension_rear'],
            'Brakes': ['brakes', 'brake_type'],
            'Wheels & Tires': ['tires', 'wheels', 'wheel_size'],
            'Features': ['display', 'features', 'lights'],
            'Dimensions': ['weight', 'seat_height', 'wheelbase'],
            'Pricing': ['price', 'msrp']
        });
    }
    
    // Categorize all specs
    const categorizedSpecs = {};
    const usedKeys = new Set();
    
    // Initialize categories
    Object.keys(categories).forEach(cat => {
        categorizedSpecs[cat] = {};
    });
    
    // Process each spec
    Object.entries(specs).forEach(([key, value]) => {
        if (value === null || value === undefined || value === '') return;
        
        let categorized = false;
        for (const [category, keys] of Object.entries(categories)) {
            if (keys.some(k => key.toLowerCase().includes(k.toLowerCase()))) {
                categorizedSpecs[category][key] = value;
                usedKeys.add(key);
                categorized = true;
                break;
            }
        }
        
        if (!categorized) {
            categorizedSpecs['Other'][key] = value;
        }
    });
    
    // Render categorized specs
    Object.entries(categorizedSpecs).forEach(([category, categorySpecs]) => {
        if (Object.keys(categorySpecs).length === 0) return;
        
        const section = document.createElement('div');
        section.className = 'add-bikes-specs-category';
        section.innerHTML = `<h3>${category}</h3>`;
        
        const specGrid = document.createElement('div');
        specGrid.className = 'add-bikes-specs-grid';
        
        Object.entries(categorySpecs).forEach(([key, value]) => {
            const specItem = document.createElement('div');
            specItem.className = 'add-bikes-spec-item';
            
            // Format the key
            const formattedKey = key
                .replace(/_/g, ' ')
                .replace(/([A-Z])/g, ' $1')
                .trim()
                .split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
                
            // Format the value
            let formattedValue = value;
            if (typeof value === 'object') {
                formattedValue = JSON.stringify(value);
            } else if (key.toLowerCase().includes('price') || key.toLowerCase() === 'msrp') {
                const numValue = parseFloat(value);
                if (!isNaN(numValue)) {
                    formattedValue = `$${numValue.toLocaleString()}`;
                }
            }
            
            specItem.innerHTML = `
                <div class="add-bikes-spec-label">${formattedKey}</div>
                <div class="add-bikes-spec-value">${formattedValue}</div>
            `;
            specGrid.appendChild(specItem);
        });
        
        section.appendChild(specGrid);
        container.appendChild(section);
    });
}

// Render basic specifications
function renderBasicSpecs(specsData, container, state) {
    const section = document.createElement('div');
    section.className = 'add-bikes-specs-category';
    section.innerHTML = '<h3>Basic Information</h3>';
    
    const specGrid = document.createElement('div');
    specGrid.className = 'add-bikes-specs-grid';
    
    const basicSpecs = {
        'Type': state.selectedType === 'motorcycle' ? 'Motorcycle' : 'Bicycle',
        'Brand': state.selectedBrand,
        'Model': state.selectedModel,
        'Year': state.selectedYear,
        'Variant': state.selectedVariant || 'Standard'
    };
    
    // Add any additional data from vehicleData
    if (specsData.vehicleData) {
        if (specsData.vehicleData.category) basicSpecs['Category'] = specsData.vehicleData.category;
        if (specsData.vehicleData.engine) basicSpecs['Engine'] = specsData.vehicleData.engine;
    }
    
    Object.entries(basicSpecs).forEach(([label, value]) => {
        const specItem = document.createElement('div');
        specItem.className = 'add-bikes-spec-item';
        specItem.innerHTML = `
            <div class="add-bikes-spec-label">${label}</div>
            <div class="add-bikes-spec-value">${value}</div>
        `;
        specGrid.appendChild(specItem);
    });
    
    section.appendChild(specGrid);
    container.appendChild(section);
    
    // Add notice about missing specs
    const notice = document.createElement('div');
    notice.className = 'add-bikes-specs-notice';
    notice.innerHTML = `
        <p><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: inline-block; vertical-align: text-bottom;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg> Detailed specifications are not yet available for this model.</p>
        <p>Would you like to contribute specifications for this ${state.selectedType}?</p>
        <button class="add-bikes-btn-secondary" onclick="alert('Specification submission coming soon!')">Submit Specifications</button>
    `;
    container.appendChild(notice);
}