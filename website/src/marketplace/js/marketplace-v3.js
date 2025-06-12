// Marketplace V3 JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Initialize marketplace functionality
    initializeSearch();
    initializeFilters();
    initializeSaveButtons();
    initializePagination();
});

// Search functionality
function initializeSearch() {
    const searchForm = document.querySelector('.search-form');
    const searchInput = document.querySelector('.search-input');
    
    if (searchForm) {
        searchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const searchTerm = searchInput.value.trim();
            const category = document.querySelector('.category-filter').value;
            
            // Perform search
            performSearch(searchTerm, category);
        });
    }
}

// Filter functionality
function initializeFilters() {
    const priceInputs = document.querySelectorAll('.price-input');
    const checkboxes = document.querySelectorAll('.checkbox-label input');
    const locationInput = document.querySelector('.location-input');
    const radiusSelect = document.querySelector('.radius-select');
    const resetFilters = document.querySelector('.reset-filters');
    
    // Price range filter
    priceInputs.forEach(input => {
        input.addEventListener('change', applyFilters);
    });
    
    // Condition checkboxes
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', applyFilters);
    });
    
    // Location filter
    if (locationInput) {
        locationInput.addEventListener('change', applyFilters);
    }
    
    if (radiusSelect) {
        radiusSelect.addEventListener('change', applyFilters);
    }
    
    // Reset filters
    if (resetFilters) {
        resetFilters.addEventListener('click', (e) => {
            e.preventDefault();
            resetAllFilters();
        });
    }
}

// Save button functionality
function initializeSaveButtons() {
    const saveButtons = document.querySelectorAll('.save-button');
    
    saveButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            button.classList.toggle('saved');
            
            // Add animation
            button.style.transform = 'scale(1.2)';
            setTimeout(() => {
                button.style.transform = 'scale(1)';
            }, 200);
        });
    });
}

// Pagination
function initializePagination() {
    const pageButtons = document.querySelectorAll('.page-button:not([disabled])');
    
    pageButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Remove active class from all buttons
            document.querySelectorAll('.page-button').forEach(btn => {
                btn.classList.remove('active');
            });
            
            // Add active class to clicked button
            button.classList.add('active');
            
            // Load page content (placeholder)
            const pageNumber = button.textContent;
            if (pageNumber === 'Next' || pageNumber === 'Previous') {
                // Handle next/previous
                console.log(`Navigate to ${pageNumber.toLowerCase()} page`);
            } else {
                console.log(`Load page ${pageNumber}`);
            }
        });
    });
}

// Apply filters
function applyFilters() {
    const filters = {
        priceMin: document.querySelector('.price-input:first-of-type').value,
        priceMax: document.querySelector('.price-input:last-of-type').value,
        conditions: Array.from(document.querySelectorAll('.checkbox-label input:checked')).map(cb => cb.value),
        location: document.querySelector('.location-input').value,
        radius: document.querySelector('.radius-select').value
    };
    
    console.log('Applying filters:', filters);
    // TODO: Implement actual filtering logic
}

// Reset all filters
function resetAllFilters() {
    document.querySelectorAll('.price-input').forEach(input => input.value = '');
    document.querySelectorAll('.checkbox-label input').forEach(cb => cb.checked = false);
    document.querySelector('.location-input').value = '';
    document.querySelector('.radius-select').value = '10';
    
    applyFilters();
}

// Perform search
function performSearch(searchTerm, category) {
    console.log(`Searching for: ${searchTerm} in category: ${category || 'all'}`);
    // TODO: Implement actual search logic
}

// Sort functionality
document.addEventListener('DOMContentLoaded', function() {
    const sortSelect = document.querySelector('.sort-select');
    
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            const sortBy = e.target.value;
            console.log(`Sorting by: ${sortBy}`);
            // TODO: Implement sorting logic
        });
    }
});