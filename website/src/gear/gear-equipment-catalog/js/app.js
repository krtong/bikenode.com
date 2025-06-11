// Equipment Page JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Initialize page components
    initializeBikeTypeTabs();
    initializeCategories();
    initializeKits();
    initializeEquipmentList();
    initializeModal();
    updateSafetyScore();
});

// Category selection
function initializeCategories() {
    const categoryCards = document.querySelectorAll('.category-card');
    
    categoryCards.forEach(card => {
        card.addEventListener('click', function() {
            // Update active state
            categoryCards.forEach(c => c.classList.remove('active'));
            this.classList.add('active');
            
            // Filter equipment by category
            const category = this.dataset.category;
            filterEquipmentByCategory(category);
        });
    });
}

// Kit management
function initializeKits() {
    const kitActionButtons = document.querySelectorAll('.kit-action-btn');
    const addKitBtn = document.querySelector('.add-kit-btn');
    
    kitActionButtons.forEach(button => {
        button.addEventListener('click', function() {
            const kitCard = this.closest('.kit-card');
            const kitName = kitCard.querySelector('h3').textContent;
            viewKitDetails(kitName);
        });
    });
    
    addKitBtn?.addEventListener('click', function() {
        createNewKit();
    });
}

// Equipment list functionality
function initializeEquipmentList() {
    const searchInput = document.querySelector('.search-input');
    const filterSelect = document.querySelector('.filter-select');
    const actionButtons = document.querySelectorAll('.action-btn');
    
    // Search functionality
    searchInput?.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        searchEquipment(searchTerm);
    });
    
    // Filter functionality
    filterSelect?.addEventListener('change', function() {
        const category = this.value;
        filterEquipmentByCategory(category);
    });
    
    // Action buttons
    actionButtons.forEach(button => {
        button.addEventListener('click', function() {
            const item = this.closest('.equipment-item');
            const action = this.classList.contains('edit') ? 'edit' : 'check';
            handleEquipmentAction(item, action);
        });
    });
}

// Modal functionality
function initializeModal() {
    const addEquipmentBtn = document.getElementById('addEquipmentBtn');
    const checklistBtn = document.getElementById('checklistBtn');
    const modal = document.getElementById('addEquipmentModal');
    const closeModal = document.getElementById('closeModal');
    
    addEquipmentBtn?.addEventListener('click', () => {
        modal.style.display = 'block';
    });
    
    checklistBtn?.addEventListener('click', () => {
        openSafetyChecklist();
    });
    
    closeModal?.addEventListener('click', () => {
        modal.style.display = 'none';
    });
    
    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
}

// Update safety score animation
function updateSafetyScore() {
    const scoreElement = document.querySelector('.score-value');
    const targetScore = parseInt(scoreElement.textContent);
    let currentScore = 0;
    
    const interval = setInterval(() => {
        currentScore += 2;
        if (currentScore >= targetScore) {
            currentScore = targetScore;
            clearInterval(interval);
        }
        scoreElement.textContent = currentScore + '%';
    }, 20);
}

// Filter equipment by category
function filterEquipmentByCategory(category) {
    const equipmentItems = document.querySelectorAll('.equipment-item');
    
    equipmentItems.forEach(item => {
        if (category === 'all' || item.dataset.category === category) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
}

// Search equipment
function searchEquipment(searchTerm) {
    const equipmentItems = document.querySelectorAll('.equipment-item');
    
    equipmentItems.forEach(item => {
        const name = item.querySelector('h4').textContent.toLowerCase();
        const description = item.querySelector('p').textContent.toLowerCase();
        
        if (name.includes(searchTerm) || description.includes(searchTerm)) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
}

// Handle equipment actions
function handleEquipmentAction(item, action) {
    const itemName = item.querySelector('h4').textContent;
    
    if (action === 'edit') {
        console.log('Editing equipment:', itemName);
        // Open edit modal
    } else if (action === 'check') {
        console.log('Checking equipment:', itemName);
        // Open inspection checklist
        openInspectionChecklist(item);
    }
}

// View kit details
function viewKitDetails(kitName) {
    console.log('Viewing kit details:', kitName);
    // Implementation would open a modal with kit contents
}

// Create new kit
function createNewKit() {
    console.log('Creating new kit');
    // Implementation would open a kit creation modal
}

// Open safety checklist
function openSafetyChecklist() {
    console.log('Opening safety checklist');
    // Implementation would open a comprehensive safety checklist modal
}

// Open inspection checklist for specific equipment
function openInspectionChecklist(item) {
    const itemName = item.querySelector('h4').textContent;
    console.log('Opening inspection checklist for:', itemName);
    // Implementation would open an inspection checklist specific to the equipment type
}

// Handle reminder actions
document.querySelectorAll('.reminder-action').forEach(button => {
    button.addEventListener('click', function() {
        const reminder = this.closest('.reminder-item');
        const action = this.textContent.toLowerCase();
        
        if (action === 'review') {
            console.log('Reviewing reminder');
            // Open review modal
        } else if (action === 'schedule') {
            console.log('Scheduling maintenance');
            // Open scheduling modal
        }
    });
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
            
            // Update equipment categories based on bike type
            updateEquipmentCategories(bikeType);
            
            // Update kits based on bike type
            updateKitsByType(bikeType);
            
            // Reload equipment items for selected bike type
            loadEquipmentByType(bikeType);
        });
    });
}

// Update equipment categories based on bike type
function updateEquipmentCategories(bikeType) {
    const categoriesContainer = document.querySelector('.equipment-categories');
    if (!categoriesContainer) return;
    
    // Clear existing categories
    categoriesContainer.innerHTML = '';
    
    // Define categories for each bike type
    const categories = {
        motorcycle: [
            { id: 'tools', label: 'Tools', icon: '🔧', count: '12 items' },
            { id: 'first-aid', label: 'First Aid', icon: '🏥', count: '8 items' },
            { id: 'emergency', label: 'Emergency', icon: '🆘', count: '5 items' },
            { id: 'navigation', label: 'Navigation', icon: '🧭', count: '4 items' },
            { id: 'communication', label: 'Communication', icon: '📡', count: '3 items' }
        ],
        bicycle: [
            { id: 'tools', label: 'Tools', icon: '🔧', count: '8 items' },
            { id: 'repair', label: 'Repair Kit', icon: '🔩', count: '6 items' },
            { id: 'hydration', label: 'Hydration', icon: '💧', count: '4 items' },
            { id: 'nutrition', label: 'Nutrition', icon: '🍏', count: '5 items' },
            { id: 'safety', label: 'Safety', icon: '🩺', count: '6 items' }
        ],
        ebike: [
            { id: 'charging', label: 'Charging', icon: '🔌', count: '5 items' },
            { id: 'tools', label: 'Tools', icon: '🔧', count: '7 items' },
            { id: 'electronics', label: 'Electronics', icon: '🔋', count: '4 items' },
            { id: 'emergency', label: 'Emergency', icon: '🆘', count: '5 items' }
        ],
        scooter: [
            { id: 'storage', label: 'Storage', icon: '🎒', count: '6 items' },
            { id: 'locks', label: 'Locks', icon: '🔒', count: '4 items' },
            { id: 'tools', label: 'Tools', icon: '🔧', count: '5 items' },
            { id: 'rain-gear', label: 'Rain Gear', icon: '☔', count: '3 items' }
        ]
    };
    
    // Get categories for selected bike type
    const selectedCategories = categories[bikeType] || categories.motorcycle;
    
    // Create category cards
    selectedCategories.forEach((cat, index) => {
        const card = document.createElement('div');
        card.className = 'category-card' + (index === 0 ? ' active' : '');
        card.dataset.category = cat.id;
        card.innerHTML = `
            <div class="category-icon">${cat.icon}</div>
            <div class="category-info">
                <h4>${cat.label}</h4>
                <p>${cat.count}</p>
            </div>
        `;
        categoriesContainer.appendChild(card);
    });
    
    // Re-initialize category click handlers
    initializeCategories();
}

// Update kits based on bike type
function updateKitsByType(bikeType) {
    // This would update the equipment kits based on bike type
    console.log('Updating kits for:', bikeType);
    // In real implementation, would filter or reload kits
}

// Load equipment items based on bike type
function loadEquipmentByType(bikeType) {
    // This would typically fetch equipment items from server based on bike type
    console.log('Loading equipment for:', bikeType);
    // For now, just filter existing items
    const equipmentItems = document.querySelectorAll('.equipment-item');
    equipmentItems.forEach(item => {
        // Show all items for now, in real implementation would filter by bike type
        item.style.display = 'flex';
    });
}