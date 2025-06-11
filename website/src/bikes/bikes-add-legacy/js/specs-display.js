// Specifications display functions
import { navigationState } from './navigation.js';

// Display comprehensive bicycle specifications
export function displayBicycleSpecs(specs) {
    const specGrid = document.getElementById('spec-grid');
    specGrid.innerHTML = '';
    
    // Store full specs for later use
    navigationState.selectedVehicle.fullSpecs = specs;
    
    // If specs is a raw object from the database, display ALL fields
    if (!specs.basic && !specs.components) {
        displayAllDatabaseFields(specs);
        return;
    }
    
    // Display header with bike info
    const basic = specs.basic;
    const headerDiv = document.createElement('div');
    headerDiv.style.cssText = 'grid-column: span 3; margin-bottom: 20px; text-align: center;';
    headerDiv.innerHTML = `
        <h2 style="color: white; margin: 0 0 10px 0;">${basic.manufacturer_name} ${basic.model}</h2>
        ${basic.description ? `<p style="color: #999; margin: 0 0 20px 0; line-height: 1.5;">${basic.description}</p>` : ''}
        ${basic.primary_thumbnail_url ? `<img src="${basic.primary_thumbnail_url}" style="max-width: 100%; height: auto; border-radius: 8px;">` : ''}
    `;
    specGrid.appendChild(headerDiv);
    
    // Key Specifications Bar
    const keySpecs = document.createElement('div');
    keySpecs.style.cssText = 'grid-column: span 3; display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-bottom: 20px;';
    
    const keySpecItems = [
        { label: 'Price', value: basic.msrp ? `$${basic.msrp}` : 'N/A' },
        { label: 'Frame', value: basic.frame_material || 'N/A' },
        { label: 'Category', value: basic.category || 'N/A' },
        { label: 'Type', value: basic.is_ebike ? 'E-Bike' : 'Traditional' },
        { label: 'Suspension', value: basic.suspension_config || 'N/A' },
        { label: 'Wheel Size', value: specs.wheel_kinds?.join(', ') || 'N/A' }
    ];
    
    keySpecItems.forEach(item => {
        const card = document.createElement('div');
        card.className = 'spec-item';
        card.style.background = '#2a2a2a';
        card.innerHTML = `
            <div class="spec-label">${item.label}</div>
            <div class="spec-value" style="font-size: 20px; font-weight: 600;">${item.value}</div>
        `;
        keySpecs.appendChild(card);
    });
    
    specGrid.appendChild(keySpecs);
    
    // Components Section
    if (specs.components && Object.keys(specs.components).length > 0) {
        const componentsHeader = document.createElement('div');
        componentsHeader.style.cssText = 'grid-column: span 3; margin: 20px 0 10px 0;';
        componentsHeader.innerHTML = '<h3 style="color: var(--accent); margin: 0;">Components</h3>';
        specGrid.appendChild(componentsHeader);
        
        // Group components by type
        const componentGroups = {
            'Drivetrain': ['rearDerailleur', 'frontDerailleur', 'shifters', 'crank', 'cassette', 'chain'],
            'Brakes': ['brakes', 'discRotors'],
            'Wheels & Tires': ['rims', 'tires'],
            'Cockpit': ['handlebar', 'stem', 'headset', 'grips'],
            'Seating': ['saddle', 'seatpost'],
            'Suspension': ['fork', 'rearShock'],
            'Other': []
        };
        
        // Categorize components
        const categorized = {};
        Object.entries(specs.components).forEach(([type, desc]) => {
            let added = false;
            for (const [group, types] of Object.entries(componentGroups)) {
                if (types.includes(type)) {
                    if (!categorized[group]) categorized[group] = {};
                    categorized[group][type] = desc;
                    added = true;
                    break;
                }
            }
            if (!added) {
                if (!categorized['Other']) categorized['Other'] = {};
                categorized['Other'][type] = desc;
            }
        });
        
        // Display categorized components
        Object.entries(categorized).forEach(([group, components]) => {
            if (Object.keys(components).length === 0) return;
            
            const groupDiv = document.createElement('div');
            groupDiv.style.cssText = 'grid-column: span 1;';
            groupDiv.innerHTML = `<h4 style="color: #ccc; margin: 0 0 10px 0; font-size: 14px;">${group}</h4>`;
            
            Object.entries(components).forEach(([type, desc]) => {
                const componentDiv = document.createElement('div');
                componentDiv.style.cssText = 'margin-bottom: 10px; padding: 10px; background: #1a1a1a; border-radius: 4px;';
                componentDiv.innerHTML = `
                    <div style="color: #666; font-size: 11px; text-transform: uppercase; margin-bottom: 3px;">${type.replace(/([A-Z])/g, ' $1').trim()}</div>
                    <div style="color: white; font-size: 13px;">${desc}</div>
                `;
                groupDiv.appendChild(componentDiv);
            });
            
            specGrid.appendChild(groupDiv);
        });
    }
    
    // Gearing Section
    if (specs.gearing && (specs.gearing.front_count || specs.gearing.rear_count)) {
        const gearingHeader = document.createElement('div');
        gearingHeader.style.cssText = 'grid-column: span 3; margin: 20px 0 10px 0;';
        gearingHeader.innerHTML = '<h3 style="color: var(--accent); margin: 0;">Gearing</h3>';
        specGrid.appendChild(gearingHeader);
        
        const gearingDiv = document.createElement('div');
        gearingDiv.style.cssText = 'grid-column: span 3; display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;';
        
        const gearingSpecs = [
            { label: 'Front Gears', value: specs.gearing.front_count ? `${specs.gearing.front_count} (${specs.gearing.front_min}-${specs.gearing.front_max}T)` : 'N/A' },
            { label: 'Rear Gears', value: specs.gearing.rear_count ? `${specs.gearing.rear_count} (${specs.gearing.rear_min}-${specs.gearing.rear_max}T)` : 'N/A' },
            { label: 'Total Speeds', value: (specs.gearing.front_count && specs.gearing.rear_count) ? specs.gearing.front_count * specs.gearing.rear_count : 'N/A' },
            { label: 'Gear Inches', value: (specs.gearing.gear_inches_low && specs.gearing.gear_inches_high) ? `${specs.gearing.gear_inches_low.toFixed(1)} - ${specs.gearing.gear_inches_high.toFixed(1)}` : 'N/A' }
        ];
        
        gearingSpecs.forEach(spec => {
            const card = document.createElement('div');
            card.className = 'spec-item';
            card.innerHTML = `
                <div class="spec-label">${spec.label}</div>
                <div class="spec-value">${spec.value}</div>
            `;
            gearingDiv.appendChild(card);
        });
        
        specGrid.appendChild(gearingDiv);
    }
    
    // Sizes and Geometry Section
    if (specs.sizes && specs.sizes.length > 0) {
        const geoHeader = document.createElement('div');
        geoHeader.style.cssText = 'grid-column: span 3; margin: 20px 0 10px 0;';
        geoHeader.innerHTML = `<h3 style="color: var(--accent); margin: 0;">Available Sizes & Geometry (${specs.sizes.length} sizes)</h3>`;
        specGrid.appendChild(geoHeader);
        
        const sizesDiv = document.createElement('div');
        sizesDiv.style.cssText = 'grid-column: span 3;';
        
        // Create a summary of available sizes
        const sizesList = specs.sizes.map(size => {
            let sizeText = size.name;
            if (size.rider_height) {
                sizeText += ` (${size.rider_height.min_cm}-${size.rider_height.max_cm}cm)`;
            }
            return sizeText;
        }).join(', ');
        
        sizesDiv.innerHTML = `
            <div style="background: #1a1a1a; padding: 15px; border-radius: 4px; margin-bottom: 10px;">
                <div style="color: #666; font-size: 12px; margin-bottom: 5px;">AVAILABLE SIZES</div>
                <div style="color: white;">${sizesList}</div>
            </div>
        `;
        
        // Add a button to view detailed geometry
        if (basic.has_full_geometry) {
            const geoButton = document.createElement('button');
            geoButton.textContent = 'View Detailed Geometry Chart';
            geoButton.style.cssText = 'padding: 10px 20px; background: var(--accent); border: none; border-radius: 4px; color: white; cursor: pointer; margin-top: 10px;';
            geoButton.onclick = () => showGeometryChart(specs.sizes);
            sizesDiv.appendChild(geoButton);
        }
        
        specGrid.appendChild(sizesDiv);
    }
    
    // Analysis Section
    if (specs.analysis && specs.analysis.spec_level) {
        const analysisHeader = document.createElement('div');
        analysisHeader.style.cssText = 'grid-column: span 3; margin: 20px 0 10px 0;';
        analysisHeader.innerHTML = '<h3 style="color: var(--accent); margin: 0;">Performance Analysis</h3>';
        specGrid.appendChild(analysisHeader);
        
        const analysisDiv = document.createElement('div');
        analysisDiv.style.cssText = 'grid-column: span 3;';
        
        if (specs.analysis.spec_level.value !== undefined) {
            const specLevel = (specs.analysis.spec_level.value * 100).toFixed(0);
            analysisDiv.innerHTML = `
                <div style="background: #1a1a1a; padding: 15px; border-radius: 4px;">
                    <div style="color: #666; font-size: 12px; margin-bottom: 5px;">OVERALL SPEC LEVEL</div>
                    <div style="display: flex; align-items: center;">
                        <div style="flex: 1; background: #333; height: 20px; border-radius: 10px; overflow: hidden;">
                            <div style="background: var(--accent); width: ${specLevel}%; height: 100%;"></div>
                        </div>
                        <div style="color: white; font-size: 20px; font-weight: 600; margin-left: 15px;">${specLevel}%</div>
                    </div>
                </div>
            `;
        }
        
        specGrid.appendChild(analysisDiv);
    }
    
    // Action buttons
    const actionsDiv = document.createElement('div');
    actionsDiv.style.cssText = 'grid-column: span 3; margin-top: 20px;';
    actionsDiv.className = 'action-grid';
    specGrid.appendChild(actionsDiv);
    
    // Update the actions container
    document.querySelector('.action-grid').style.marginTop = '20px';
}

// Display basic bike info when full specs aren't available
export function displayBasicBikeInfo(bike, brandName, year, model, variant) {
    const specGrid = document.getElementById('spec-grid');
    specGrid.innerHTML = '';
    
    const specs = {
        'Brand': brandName,
        'Model': model,
        'Year': year,
        'Variant': bike.variant || variant,
        'Catalog ID': bike.keyid,
        '📊 Data Status': '⏳ Full specifications coming soon'
    };
    
    Object.entries(specs).forEach(([label, value]) => {
        const card = document.createElement('div');
        card.className = 'spec-item';
        if (label === '📊 Data Status') {
            card.style.gridColumn = 'span 2';
            card.style.background = '#2f2f1a';
        }
        card.innerHTML = `
            <div class="spec-label">${label}</div>
            <div class="spec-value">${value}</div>
        `;
        specGrid.appendChild(card);
    });
}

// Show detailed geometry chart
export function showGeometryChart(sizes) {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.9);
        z-index: 10000;
        overflow-y: auto;
        padding: 40px;
    `;
    
    const content = document.createElement('div');
    content.style.cssText = `
        max-width: 1200px;
        margin: 0 auto;
        background: #111;
        border-radius: 8px;
        padding: 30px;
        position: relative;
    `;
    
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕ Close';
    closeBtn.style.cssText = `
        position: absolute;
        top: 20px;
        right: 20px;
        background: none;
        border: none;
        color: #666;
        font-size: 16px;
        cursor: pointer;
        padding: 8px;
    `;
    closeBtn.onclick = () => modal.remove();
    
    const title = document.createElement('h2');
    title.textContent = 'Geometry Chart';
    title.style.cssText = 'color: white; margin-bottom: 20px;';
    
    // Create geometry table
    const table = document.createElement('table');
    table.style.cssText = `
        width: 100%;
        border-collapse: collapse;
        color: white;
    `;
    
    // Get all unique measurements
    const allMeasurements = new Set();
    sizes.forEach(size => {
        if (size.geometry) {
            Object.keys(size.geometry).forEach(m => allMeasurements.add(m));
        }
    });
    
    // Header row
    const headerRow = document.createElement('tr');
    headerRow.innerHTML = '<th style="text-align: left; padding: 10px; border-bottom: 2px solid #333;">Measurement</th>';
    sizes.forEach(size => {
        const th = document.createElement('th');
        th.style.cssText = 'text-align: center; padding: 10px; border-bottom: 2px solid #333;';
        th.innerHTML = `${size.name}<br><small style="color: #666;">${size.frame_size || ''}</small>`;
        headerRow.appendChild(th);
    });
    table.appendChild(headerRow);
    
    // Measurement rows
    const measurementLabels = {
        'stackMM': 'Stack (mm)',
        'reachMM': 'Reach (mm)',
        'topTubeLengthMM': 'Top Tube (mm)',
        'seatTubeLengthMM': 'Seat Tube (mm)',
        'seatTubeAngle': 'Seat Angle (°)',
        'headTubeLengthMM': 'Head Tube (mm)',
        'headTubeAngle': 'Head Angle (°)',
        'chainstayLengthMM': 'Chainstay (mm)',
        'wheelbaseMM': 'Wheelbase (mm)',
        'bottomBracketDropMM': 'BB Drop (mm)',
        'bottomBracketHeightMM': 'BB Height (mm)',
        'standoverHeightMM': 'Standover (mm)',
        'rakeMM': 'Fork Rake (mm)',
        'trailMM': 'Trail (mm)'
    };
    
    allMeasurements.forEach(measurement => {
        const row = document.createElement('tr');
        const label = measurementLabels[measurement] || measurement;
        row.innerHTML = `<td style="padding: 8px; border-bottom: 1px solid #222;">${label}</td>`;
        
        sizes.forEach(size => {
            const value = size.geometry?.[measurement];
            const td = document.createElement('td');
            td.style.cssText = 'text-align: center; padding: 8px; border-bottom: 1px solid #222;';
            td.textContent = value !== undefined ? value : '-';
            row.appendChild(td);
        });
        
        table.appendChild(row);
    });
    
    content.appendChild(closeBtn);
    content.appendChild(title);
    content.appendChild(table);
    modal.appendChild(content);
    document.body.appendChild(modal);
}

// Display all database fields in an organized way
export function displayAllDatabaseFields(data) {
    const specGrid = document.getElementById('spec-grid');
    specGrid.innerHTML = '';
    
    // Store full specs for later use
    navigationState.selectedVehicle.fullSpecs = data;
    
    // Header with basic info
    const headerDiv = document.createElement('div');
    headerDiv.style.cssText = 'grid-column: span 3; margin-bottom: 20px; text-align: center;';
    headerDiv.innerHTML = `
        <h2 style="color: white; margin: 0 0 10px 0;">
            ${data.manufacturer || ''} ${data.model || ''}
        </h2>
        ${data.year ? `<p style="color: #999; margin: 0;">Year: ${data.year}</p>` : ''}
        ${data.family ? `<p style="color: #999; margin: 0;">Family: ${typeof data.family === 'object' ? data.family.familyName : data.family}</p>` : ''}
    `;
    specGrid.appendChild(headerDiv);
    
    // Group fields by category
    const categories = {
        'Basic Information': ['manufacturer', 'brand', 'model', 'year', 'family', 'category', 'type', 'material', 'source', 'catalog_id'],
        'Pricing': ['msrp', 'price', 'cost', 'retail_price'],
        'Frame & Fork': ['frame', 'frame_material', 'fork', 'fork_material', 'suspension', 'suspension_travel', 'rear_suspension'],
        'Drivetrain': ['drivetrain', 'gears', 'speeds', 'shifters', 'front_derailleur', 'rear_derailleur', 'crankset', 'cassette', 'chain', 'chainrings'],
        'Brakes': ['brakes', 'brake_type', 'disc_brakes', 'rotors', 'brake_levers'],
        'Wheels & Tires': ['wheels', 'wheel_size', 'rims', 'tires', 'tire_size', 'tire_width', 'hubs', 'spokes'],
        'Components': ['handlebars', 'stem', 'grips', 'saddle', 'seatpost', 'pedals', 'headset', 'bottom_bracket'],
        'Weight & Dimensions': ['weight', 'weight_kg', 'weight_lbs', 'size', 'sizes', 'geometry'],
        'Electric': ['motor', 'battery', 'range', 'assist_levels', 'charge_time', 'top_speed', 'motor_power', 'battery_capacity'],
        'Other': []
    };
    
    // Categorize all fields
    const categorizedFields = {};
    const processedFields = new Set();
    
    // Initialize categories
    Object.keys(categories).forEach(cat => {
        categorizedFields[cat] = {};
    });
    
    // Process each field in the data
    Object.entries(data).forEach(([key, value]) => {
        if (value === null || value === undefined || value === '') return;
        
        let categorized = false;
        for (const [category, fields] of Object.entries(categories)) {
            if (fields.includes(key.toLowerCase())) {
                categorizedFields[category][key] = value;
                processedFields.add(key);
                categorized = true;
                break;
            }
        }
        
        if (!categorized) {
            categorizedFields['Other'][key] = value;
        }
    });
    
    // Display categorized fields
    Object.entries(categorizedFields).forEach(([category, fields]) => {
        if (Object.keys(fields).length === 0) return;
        
        // Category header
        const categoryHeader = document.createElement('div');
        categoryHeader.style.cssText = 'grid-column: span 3; margin: 20px 0 10px 0;';
        categoryHeader.innerHTML = `<h3 style="color: var(--accent); margin: 0;">${category}</h3>`;
        specGrid.appendChild(categoryHeader);
        
        // Fields in this category
        const categoryGrid = document.createElement('div');
        categoryGrid.style.cssText = 'grid-column: span 3; display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px; margin-bottom: 20px;';
        
        Object.entries(fields).forEach(([fieldName, fieldValue]) => {
            const card = document.createElement('div');
            card.className = 'spec-item';
            
            // Format the field name
            const formattedName = fieldName
                .replace(/_/g, ' ')
                .replace(/\b\w/g, l => l.toUpperCase())
                .replace(/Msrp/g, 'MSRP')
                .replace(/Id$/g, 'ID');
            
            // Format the value
            let formattedValue = fieldValue;
            if (typeof fieldValue === 'object' && fieldValue !== null) {
                if (Array.isArray(fieldValue)) {
                    formattedValue = fieldValue.join(', ');
                } else {
                    formattedValue = JSON.stringify(fieldValue, null, 2);
                }
            } else if (typeof fieldValue === 'boolean') {
                formattedValue = fieldValue ? 'Yes' : 'No';
            } else if (fieldName.toLowerCase().includes('price') || fieldName.toLowerCase() === 'msrp') {
                // Format price fields
                const numValue = parseFloat(fieldValue);
                if (!isNaN(numValue)) {
                    formattedValue = `$${numValue.toLocaleString()}`;
                }
            } else if (fieldName.toLowerCase().includes('weight')) {
                // Format weight fields
                const numValue = parseFloat(fieldValue);
                if (!isNaN(numValue)) {
                    const unit = fieldName.toLowerCase().includes('kg') ? 'kg' : 'lbs';
                    formattedValue = `${numValue} ${unit}`;
                }
            }
            
            card.innerHTML = `
                <div class="spec-label">${formattedName}</div>
                <div class="spec-value" ${typeof fieldValue === 'object' ? 'style="font-size: 12px; white-space: pre-wrap;"' : ''}>${formattedValue}</div>
            `;
            categoryGrid.appendChild(card);
        });
        
        specGrid.appendChild(categoryGrid);
    });
    
    // Add view raw data button
    const actionsDiv = document.createElement('div');
    actionsDiv.style.cssText = 'grid-column: span 3; margin-top: 20px; text-align: center;';
    
    const viewRawBtn = document.createElement('button');
    viewRawBtn.textContent = 'View Raw Database Data';
    viewRawBtn.style.cssText = 'padding: 10px 20px; background: var(--accent); border: none; border-radius: 6px; color: white; cursor: pointer; margin-right: 10px;';
    viewRawBtn.onclick = () => showRawData(data);
    
    const totalFields = Object.keys(data).filter(k => data[k] !== null && data[k] !== undefined && data[k] !== '').length;
    const infoText = document.createElement('p');
    infoText.style.cssText = 'color: #666; margin-top: 10px;';
    infoText.textContent = `Total fields in database: ${totalFields}`;
    
    actionsDiv.appendChild(viewRawBtn);
    actionsDiv.appendChild(infoText);
    specGrid.appendChild(actionsDiv);
    
    // Check specs completeness
    checkSpecsCompleteness(data);
}

// Show raw database data in a modal
function showRawData(data) {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.9);
        z-index: 10000;
        overflow-y: auto;
        padding: 40px;
    `;
    
    const content = document.createElement('div');
    content.style.cssText = `
        max-width: 800px;
        margin: 0 auto;
        background: #111;
        border-radius: 8px;
        padding: 30px;
        position: relative;
    `;
    
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕ Close';
    closeBtn.style.cssText = `
        position: absolute;
        top: 20px;
        right: 20px;
        background: none;
        border: none;
        color: #666;
        font-size: 16px;
        cursor: pointer;
        padding: 8px;
    `;
    closeBtn.onclick = () => modal.remove();
    
    const title = document.createElement('h2');
    title.textContent = 'Raw Database Data';
    title.style.cssText = 'color: white; margin-bottom: 20px;';
    
    const pre = document.createElement('pre');
    pre.style.cssText = `
        background: #1a1a1a;
        padding: 20px;
        border-radius: 4px;
        overflow-x: auto;
        color: #0f0;
        font-family: 'Courier New', monospace;
        font-size: 12px;
        line-height: 1.5;
    `;
    pre.textContent = JSON.stringify(data, null, 2);
    
    content.appendChild(closeBtn);
    content.appendChild(title);
    content.appendChild(pre);
    modal.appendChild(content);
    document.body.appendChild(modal);
}

// Import the function if it's not already available
import { checkSpecsCompleteness } from './specs-submission.js';

// Show all specifications in a modal or expanded view
window.showAllSpecs = function() {
    if (!selectedVehicle.fullSpecs) {
        alert('No detailed specifications available');
        return;
    }
    
    // Create a modal to show all specs
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.9);
        z-index: 10000;
        overflow-y: auto;
        padding: 40px;
    `;
    
    const content = document.createElement('div');
    content.style.cssText = `
        max-width: 800px;
        margin: 0 auto;
        background: #111;
        border-radius: 8px;
        padding: 30px;
        position: relative;
    `;
    
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕ Close';
    closeBtn.style.cssText = `
        position: absolute;
        top: 20px;
        right: 20px;
        background: none;
        border: none;
        color: #666;
        font-size: 16px;
        cursor: pointer;
        padding: 8px;
    `;
    closeBtn.onclick = () => modal.remove();
    
    const title = document.createElement('h2');
    title.textContent = 'Complete Specifications';
    title.style.cssText = 'color: white; margin-bottom: 20px;';
    
    const specsGrid = document.createElement('div');
    specsGrid.style.cssText = `
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 15px;
    `;
    
    // Sort and display all specs
    const sortedSpecs = Object.entries(selectedVehicle.fullSpecs).sort((a, b) => a[0].localeCompare(b[0]));
    
    sortedSpecs.forEach(([key, value]) => {
        const item = document.createElement('div');
        item.style.cssText = `
            background: #1a1a1a;
            padding: 15px;
            border-radius: 4px;
            border: 1px solid #333;
        `;
        item.innerHTML = `
            <div style="color: #666; font-size: 12px; text-transform: uppercase; margin-bottom: 5px;">${key}</div>
            <div style="color: white; font-size: 14px;">${value}</div>
        `;
        specsGrid.appendChild(item);
    });
    
    content.appendChild(closeBtn);
    content.appendChild(title);
    content.appendChild(specsGrid);
    modal.appendChild(content);
    document.body.appendChild(modal);
}