/**
 * Filter functionality for Virtual Garage
 * Uses global button styling from global-components.css
 */

export function initializeFilters() {
    // Bike type filters
    const filterButtons = document.querySelectorAll('[data-filter]');
    filterButtons.forEach(button => {
        button.addEventListener('click', handleFilterClick);
    });
    
    // Maintenance filters
    const maintenanceFilters = document.querySelectorAll('[data-maintenance-filter]');
    maintenanceFilters.forEach(button => {
        button.addEventListener('click', handleMaintenanceFilterClick);
    });
}

function handleFilterClick(event) {
    const button = event.currentTarget;
    const filterType = button.dataset.filter;
    
    // Update active state using global CSS classes
    document.querySelectorAll('[data-filter]').forEach(btn => {
        btn.classList.remove('active');
    });
    button.classList.add('active');
    
    // Apply filter
    filterBikes(filterType);
}

function filterBikes(filterType) {
    const bikeCards = document.querySelectorAll('.bike-card:not(.add-bike-card)');
    
    bikeCards.forEach(card => {
        if (filterType === 'all') {
            card.style.display = 'block';
        } else {
            const bikeType = card.dataset.bikeType?.toLowerCase();
            const bikeCategory = card.dataset.bikeCategory?.toLowerCase();
            
            if (bikeType === filterType || bikeCategory === filterType) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        }
    });
}

function handleMaintenanceFilterClick(event) {
    const button = event.currentTarget;
    const filterType = button.dataset.maintenanceFilter;
    
    // Update active state
    document.querySelectorAll('[data-maintenance-filter]').forEach(btn => {
        btn.classList.remove('active');
    });
    button.classList.add('active');
    
    // Apply filter
    filterMaintenanceTasks(filterType);
}

function filterMaintenanceTasks(filterType) {
    const tasks = document.querySelectorAll('.maintenance-item');
    
    tasks.forEach(task => {
        if (filterType === 'all') {
            task.style.display = 'block';
        } else {
            const taskStatus = task.dataset.status;
            if (taskStatus === filterType) {
                task.style.display = 'block';
            } else {
                task.style.display = 'none';
            }
        }
    });
}

// Export additional filter utilities
export function resetFilters() {
    // Reset bike filters
    document.querySelector('[data-filter="all"]')?.click();
    
    // Reset maintenance filters
    document.querySelector('[data-maintenance-filter="all"]')?.click();
}

export function getActiveFilter() {
    const activeButton = document.querySelector('[data-filter].active');
    return activeButton?.dataset.filter || 'all';
}

export function getActiveMaintenanceFilter() {
    const activeButton = document.querySelector('[data-maintenance-filter].active');
    return activeButton?.dataset.maintenanceFilter || 'all';
}