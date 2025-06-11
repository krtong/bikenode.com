// Navigation management
export const navigationStack = [];

// Use an object to hold all mutable state
export const navigationState = {
    currentBreadcrumb: ['Add Bike'],
    currentView: 'categories',
    selectedVehicle: {}
};


export function updateBreadcrumb(items) {
    navigationState.currentBreadcrumb = items;
    const breadcrumb = document.getElementById('breadcrumb');
    breadcrumb.innerHTML = items.map((item, index) => 
        `<span class="breadcrumb-item" data-index="${index}" onclick="breadcrumbClick(${index})">${item}</span>`
    ).join('');
}

export function showBackButton() {
    document.getElementById('back-button').style.display = 'block';
}

export function hideBackButton() {
    document.getElementById('back-button').style.display = 'none';
}

export function updateHeader(title, subtitle) {
    document.getElementById('menu-title').textContent = title;
    document.getElementById('menu-subtitle').textContent = subtitle;
}

export function updateDisplay(icon, name, description, active = false) {
    document.getElementById('vehicle-icon').textContent = icon;
    document.getElementById('vehicle-name').textContent = name;
    document.getElementById('vehicle-description').textContent = description;
    
    const iconEl = document.getElementById('vehicle-icon');
    if (active) {
        iconEl.classList.add('active');
    } else {
        iconEl.classList.remove('active');
    }
}

export function resetDisplay() {
    if (navigationState.currentView === 'categories') {
        updateDisplay('🚗', 'Select Category', 'Choose a vehicle category from the menu to begin your selection');
    }
}