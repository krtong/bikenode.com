// Search functionality
export function initializeSearch() {
    const searchInput = document.querySelector('.form-control');
    const searchBtn = document.querySelector('.btn-icon');
    
    if (!searchInput || !searchBtn) return;
    
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
    const searchInput = document.querySelector('.form-control');
    const searchTerm = searchInput.value.toLowerCase();
    const bikeCards = document.querySelectorAll('.card-grid-3 > .card:not(.border-dashed)');
    
    bikeCards.forEach(card => {
        const titleElement = card.querySelector('.card-title');
        const typeElement = card.querySelector('.text-secondary.font-sm');
        
        if (!titleElement || !typeElement) return;
        
        const title = titleElement.textContent.toLowerCase();
        const type = typeElement.textContent.toLowerCase();
        
        if (title.includes(searchTerm) || type.includes(searchTerm)) {
            card.style.display = '';
        } else {
            card.style.display = 'none';
        }
    });
}