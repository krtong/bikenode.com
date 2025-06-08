// Search functionality
export function initializeSearch() {
    const searchInput = document.querySelector('.search-input');
    const searchBtn = document.querySelector('.search-btn');
    
    // Search on input
    searchInput.addEventListener('input', performSearch);
    
    // Search on button click
    searchBtn.addEventListener('click', performSearch);
    
    // Search on Enter key
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            performSearch();
        }
    });
}

function performSearch() {
    const searchInput = document.querySelector('.search-input');
    const searchTerm = searchInput.value.toLowerCase();
    const bikeCards = document.querySelectorAll('.bike-card:not(.add-bike-card)');
    
    bikeCards.forEach(card => {
        const title = card.querySelector('h3').textContent.toLowerCase();
        const type = card.querySelector('.bike-type').textContent.toLowerCase();
        
        if (title.includes(searchTerm) || type.includes(searchTerm)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}