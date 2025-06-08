// Gear Page JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Initialize page
    initializeBikeTypeTabs();
    initializeCategories();
    initializeSearch();
    initializeViewToggle();
    initializeSort();
    initializeModal();
    loadGearItems();
});

// Category filtering
function initializeCategories() {
    const categoryButtons = document.querySelectorAll('.category-btn');
    
    categoryButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Update active state
            categoryButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            
            // Filter gear items
            const category = this.dataset.category;
            filterGearByCategory(category);
        });
    });
}

// Search functionality
function initializeSearch() {
    const searchInput = document.getElementById('gearSearch');
    
    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        filterGearBySearch(searchTerm);
    });
}

// View toggle (grid/list)
function initializeViewToggle() {
    const viewButtons = document.querySelectorAll('.view-btn');
    const gearGrid = document.getElementById('gearGrid');
    
    viewButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Update active state
            viewButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            
            // Update grid view
            const view = this.dataset.view;
            if (view === 'list') {
                gearGrid.classList.add('list-view');
            } else {
                gearGrid.classList.remove('list-view');
            }
        });
    });
}

// Sort functionality
function initializeSort() {
    const sortSelect = document.getElementById('sortGear');
    
    sortSelect.addEventListener('change', function() {
        const sortBy = this.value;
        sortGearItems(sortBy);
    });
}

// Modal functionality
function initializeModal() {
    const addGearBtn = document.getElementById('addGearBtn');
    const modal = document.getElementById('addGearModal');
    const closeModal = document.getElementById('closeModal');
    
    addGearBtn.addEventListener('click', () => {
        modal.style.display = 'block';
    });
    
    closeModal.addEventListener('click', () => {
        modal.style.display = 'none';
    });
    
    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
}

// Filter gear by category
function filterGearByCategory(category) {
    const gearItems = document.querySelectorAll('.gear-item');
    
    gearItems.forEach(item => {
        if (category === 'all' || item.dataset.category === category) {
            item.style.display = 'block';
        } else {
            item.style.display = 'none';
        }
    });
}

// Filter gear by search term
function filterGearBySearch(searchTerm) {
    const gearItems = document.querySelectorAll('.gear-item');
    
    gearItems.forEach(item => {
        const name = item.querySelector('.gear-name').textContent.toLowerCase();
        const brand = item.querySelector('.gear-brand').textContent.toLowerCase();
        
        if (name.includes(searchTerm) || brand.includes(searchTerm)) {
            item.style.display = 'block';
        } else {
            item.style.display = 'none';
        }
    });
}

// Sort gear items
function sortGearItems(sortBy) {
    const gearGrid = document.getElementById('gearGrid');
    const gearItems = Array.from(document.querySelectorAll('.gear-item'));
    
    gearItems.sort((a, b) => {
        switch(sortBy) {
            case 'name':
                return a.querySelector('.gear-name').textContent.localeCompare(
                    b.querySelector('.gear-name').textContent
                );
            case 'brand':
                return a.querySelector('.gear-brand').textContent.localeCompare(
                    b.querySelector('.gear-brand').textContent
                );
            case 'price':
                const priceA = parseFloat(a.querySelector('.gear-price').textContent.replace('$', ''));
                const priceB = parseFloat(b.querySelector('.gear-price').textContent.replace('$', ''));
                return priceB - priceA;
            default:
                return 0;
        }
    });
    
    // Re-append sorted items
    gearItems.forEach(item => {
        gearGrid.appendChild(item);
    });
}

// Load more gear items
function loadGearItems() {
    const loadMoreBtn = document.getElementById('loadMoreGear');
    
    loadMoreBtn.addEventListener('click', function() {
        // Simulate loading more items
        console.log('Loading more gear items...');
        // In real implementation, this would fetch more items from the server
    });
}

// Advanced filter toggle
document.getElementById('advancedFilterBtn')?.addEventListener('click', function() {
    // Toggle advanced filter panel
    console.log('Toggle advanced filters');
    // Implementation would show/hide an advanced filter panel
});

// Initialize bike type tabs
function initializeBikeTypeTabs() {
    const bikeTypeTabs = document.querySelectorAll('.bike-type-tab');
    
    bikeTypeTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            // Update active state
            bikeTypeTabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            // Get selected bike type
            const bikeType = this.dataset.type;
            
            // Update gear categories based on bike type
            updateGearCategories(bikeType);
            
            // Reload gear items for selected bike type
            loadGearItemsByType(bikeType);
        });
    });
}

// Update gear categories based on bike type
function updateGearCategories(bikeType) {
    const categoriesContainer = document.querySelector('.gear-categories');
    if (!categoriesContainer) return;
    
    // Clear existing categories
    categoriesContainer.innerHTML = '';
    
    // Define categories for each bike type
    const categories = {
        motorcycle: [
            { id: 'all', label: 'All Gear', icon: '🌍', count: 24 },
            { id: 'helmets', label: 'Helmets', icon: '🪖', count: 5 },
            { id: 'jackets', label: 'Jackets', icon: '🧪', count: 6 },
            { id: 'gloves', label: 'Gloves', icon: '🧝', count: 4 },
            { id: 'pants', label: 'Pants', icon: '👖', count: 5 },
            { id: 'boots', label: 'Boots', icon: '🥾', count: 4 }
        ],
        bicycle: [
            { id: 'all', label: 'All Gear', icon: '🌍', count: 18 },
            { id: 'helmets', label: 'Helmets', icon: '🪖', count: 3 },
            { id: 'jerseys', label: 'Jerseys', icon: '🎽', count: 5 },
            { id: 'shorts', label: 'Shorts', icon: '🩳', count: 4 },
            { id: 'shoes', label: 'Shoes', icon: '👟', count: 3 },
            { id: 'gloves', label: 'Gloves', icon: '🧝', count: 3 }
        ],
        ebike: [
            { id: 'all', label: 'All Gear', icon: '🌍', count: 15 },
            { id: 'helmets', label: 'Helmets', icon: '🪖', count: 3 },
            { id: 'jackets', label: 'Jackets', icon: '🧪', count: 4 },
            { id: 'gloves', label: 'Gloves', icon: '🧝', count: 3 },
            { id: 'rain-gear', label: 'Rain Gear', icon: '☔', count: 5 }
        ],
        scooter: [
            { id: 'all', label: 'All Gear', icon: '🌍', count: 12 },
            { id: 'helmets', label: 'Helmets', icon: '🪖', count: 3 },
            { id: 'jackets', label: 'Jackets', icon: '🧪', count: 4 },
            { id: 'gloves', label: 'Gloves', icon: '🧝', count: 3 },
            { id: 'storage', label: 'Storage', icon: '🎒', count: 2 }
        ]
    };
    
    // Get categories for selected bike type
    const selectedCategories = categories[bikeType] || categories.motorcycle;
    
    // Create category buttons
    selectedCategories.forEach((cat, index) => {
        const button = document.createElement('button');
        button.className = 'category-btn' + (index === 0 ? ' active' : '');
        button.dataset.category = cat.id;
        button.innerHTML = `
            <span class="category-icon">${cat.icon}</span>
            <span class="category-label">${cat.label}</span>
            <span class="category-count">${cat.count}</span>
        `;
        categoriesContainer.appendChild(button);
    });
    
    // Re-initialize category click handlers
    initializeCategories();
}

// Load gear items based on bike type
function loadGearItemsByType(bikeType) {
    // This would typically fetch gear items from server based on bike type
    console.log('Loading gear for:', bikeType);
    // For now, just filter existing items
    const gearItems = document.querySelectorAll('.gear-item');
    gearItems.forEach(item => {
        // Show all items for now, in real implementation would filter by bike type
        item.style.display = 'block';
    });
}