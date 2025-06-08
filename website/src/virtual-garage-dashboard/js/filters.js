// Filter functionality
export function initializeFilters() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    
    filterButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            // Remove active class from all buttons
            filterButtons.forEach(b => b.classList.remove('active'));
            // Add active class to clicked button
            this.classList.add('active');
            
            // Apply filter
            const filterType = this.textContent.trim();
            applyFilter(filterType);
        });
    });
}

function applyFilter(filterType) {
    const bikeCards = document.querySelectorAll('.bike-card:not(.add-bike-card)');
    
    bikeCards.forEach(card => {
        const bikeType = card.querySelector('.bike-type').textContent;
        
        if (filterType === 'All Bikes') {
            card.style.display = 'block';
        } else {
            // Simple filter logic - you can make this more sophisticated
            const showCard = bikeType.toLowerCase().includes(filterType.toLowerCase()) ||
                           (filterType === 'Motorcycles' && (bikeType.includes('Sport') || bikeType.includes('Cruiser'))) ||
                           (filterType === 'Bicycles' && (bikeType.includes('Mountain') || bikeType.includes('Road'))) ||
                           (filterType === 'eBikes' && bikeType.includes('Electric'));
            
            card.style.display = showCard ? 'block' : 'none';
        }
    });
}