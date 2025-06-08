// Filter Controller for Segments
export function initFilters() {
    initDropdowns();
    initFilterPills();
}

function initDropdowns() {
    // Distance filter
    const distanceBtn = document.getElementById('distanceFilterBtn');
    const distanceDropdown = document.getElementById('distanceDropdown');
    
    setupDropdown(distanceBtn, distanceDropdown, (value, label) => {
        distanceBtn.querySelector('.filter-label').textContent = label;
        applyDistanceFilter(value);
    });
    
    // Type filter
    const typeBtn = document.getElementById('typeFilterBtn');
    const typeDropdown = document.getElementById('typeDropdown');
    
    setupDropdown(typeBtn, typeDropdown, (value, label) => {
        typeBtn.querySelector('.filter-label').textContent = label;
        applyTypeFilter(value);
    });
    
    // Surface filter
    const surfaceBtn = document.getElementById('surfaceFilterBtn');
    const surfaceDropdown = document.getElementById('surfaceDropdown');
    
    setupDropdown(surfaceBtn, surfaceDropdown, (value, label) => {
        surfaceBtn.querySelector('.filter-label').textContent = label;
        applySurfaceFilter(value);
    });
}

function setupDropdown(button, dropdown, onSelect) {
    if (!button || !dropdown) return;
    
    // Toggle dropdown
    button.addEventListener('click', (e) => {
        e.stopPropagation();
        
        // Close other dropdowns
        document.querySelectorAll('.dropdown-menu').forEach(menu => {
            if (menu !== dropdown) menu.classList.remove('active');
        });
        
        dropdown.classList.toggle('active');
    });
    
    // Handle dropdown item clicks
    dropdown.querySelectorAll('.dropdown-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Update active state
            dropdown.querySelectorAll('.dropdown-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            
            // Call handler
            const value = item.dataset.value;
            const label = item.textContent;
            onSelect(value, label);
            
            // Close dropdown
            dropdown.classList.remove('active');
        });
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', () => {
        dropdown.classList.remove('active');
    });
}

function initFilterPills() {
    const pills = document.querySelectorAll('.filter-pill');
    
    pills.forEach(pill => {
        pill.addEventListener('click', () => {
            // Remove active from all pills
            pills.forEach(p => p.classList.remove('active'));
            
            // Add active to clicked pill
            pill.classList.add('active');
            
            // Apply filter
            const filter = pill.dataset.filter;
            applyPillFilter(filter);
        });
    });
}

// Filter functions
function applyDistanceFilter(distance) {
    console.log('Applying distance filter:', distance);
    // Implementation would filter segments by distance
    updateSegmentCount();
}

function applyTypeFilter(type) {
    console.log('Applying type filter:', type);
    // Implementation would filter segments by type
    updateSegmentCount();
}

function applySurfaceFilter(surface) {
    console.log('Applying surface filter:', surface);
    // Implementation would filter segments by surface
    updateSegmentCount();
}

function applyPillFilter(filter) {
    console.log('Applying pill filter:', filter);
    
    switch(filter) {
        case 'all':
            showAllSegments();
            break;
        case 'starred':
            showStarredSegments();
            break;
        case 'created':
            showCreatedSegments();
            break;
        case 'kom':
            showKOMSegments();
            break;
        case 'pr':
            showPRSegments();
            break;
        case 'trending':
            showTrendingSegments();
            break;
        case 'new':
            showNewSegments();
            break;
    }
    
    updateSegmentCount();
}

// Filter implementations
function showAllSegments() {
    document.querySelectorAll('.segment-card').forEach(card => {
        card.style.display = 'block';
    });
}

function showStarredSegments() {
    document.querySelectorAll('.segment-card').forEach(card => {
        card.style.display = card.classList.contains('starred') ? 'block' : 'none';
    });
}

function showCreatedSegments() {
    // Would filter for segments created by user
    console.log('Showing created segments');
}

function showKOMSegments() {
    document.querySelectorAll('.segment-card').forEach(card => {
        card.style.display = card.classList.contains('kom') ? 'block' : 'none';
    });
}

function showPRSegments() {
    // Would filter for segments with recent PRs
    console.log('Showing PR segments');
}

function showTrendingSegments() {
    // Would filter for trending segments
    console.log('Showing trending segments');
}

function showNewSegments() {
    // Would filter for new segments
    console.log('Showing new segments');
}

function updateSegmentCount() {
    const visibleSegments = document.querySelectorAll('.segment-card:not([style*="display: none"])').length;
    const listTitle = document.querySelector('.list-title');
    if (listTitle) {
        listTitle.textContent = `${visibleSegments} segments found`;
    }
}