/**
 * Search functionality for Virtual Garage
 * Uses global form styling from global-components.css
 */

export function initializeSearch() {
    const searchInput = document.getElementById('bikeSearch');
    const searchBtn = document.getElementById('searchBtn');
    
    if (searchInput) {
        // Search on input
        searchInput.addEventListener('input', debounce(performSearch, 300));
        
        // Search on enter key
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                performSearch();
            }
        });
    }
    
    if (searchBtn) {
        searchBtn.addEventListener('click', performSearch);
    }
}

function performSearch() {
    const searchTerm = document.getElementById('bikeSearch').value.toLowerCase().trim();
    const bikeCards = document.querySelectorAll('.bike-card:not(.add-bike-card)');
    
    if (!searchTerm) {
        // Show all bikes if search is empty
        bikeCards.forEach(card => {
            card.style.display = 'block';
        });
        return;
    }
    
    bikeCards.forEach(card => {
        const bikeName = card.querySelector('h3')?.textContent.toLowerCase() || '';
        const bikeType = card.querySelector('.bike-type')?.textContent.toLowerCase() || '';
        const bikeBrand = card.dataset.bikeBrand?.toLowerCase() || '';
        const bikeModel = card.dataset.bikeModel?.toLowerCase() || '';
        
        const searchableText = `${bikeName} ${bikeType} ${bikeBrand} ${bikeModel}`;
        
        if (searchableText.includes(searchTerm)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
    
    // Check if no results
    const visibleCards = document.querySelectorAll('.bike-card:not(.add-bike-card):not([style*="display: none"])');
    const emptySearchState = document.getElementById('emptySearchState');
    
    if (visibleCards.length === 0 && emptySearchState) {
        emptySearchState.classList.remove('d-none');
    } else if (emptySearchState) {
        emptySearchState.classList.add('d-none');
    }
}

// Utility function to debounce search
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Export search utilities
export function clearSearch() {
    const searchInput = document.getElementById('bikeSearch');
    if (searchInput) {
        searchInput.value = '';
        performSearch();
    }
}

export function getSearchTerm() {
    return document.getElementById('bikeSearch')?.value || '';
}