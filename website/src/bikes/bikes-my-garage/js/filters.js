// Filter functionality
export function initializeFilters() {
    const filterButtons = document.querySelectorAll('.btn-secondary.btn-sm, .btn-primary.btn-sm');
    
    filterButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            // Skip if it's a divider
            if (this.textContent === '|') return;
            
            // Remove primary class from all buttons and add secondary
            filterButtons.forEach(b => {
                b.classList.remove('btn-primary');
                b.classList.add('btn-secondary');
            });
            // Add primary class to clicked button
            this.classList.remove('btn-secondary');
            this.classList.add('btn-primary');
            
            // Apply filter
            const filterType = this.textContent.trim();
            applyFilter(filterType);
        });
    });
}

function applyFilter(filterType) {
    const bikeCards = document.querySelectorAll('.card-grid-3 > .card:not(.border-dashed)');
    
    bikeCards.forEach(card => {
        const bikeTypeElement = card.querySelector('.text-secondary.font-sm');
        if (!bikeTypeElement) return;
        
        const bikeType = bikeTypeElement.textContent;
        
        if (filterType === 'All Bikes') {
            card.style.display = '';
        } else {
            // Simple filter logic - you can make this more sophisticated
            const showCard = bikeType.toLowerCase().includes(filterType.toLowerCase()) ||
                           (filterType === 'Motorcycles' && (bikeType.includes('Sport') || bikeType.includes('Cruiser') || bikeType.includes('Naked'))) ||
                           (filterType === 'Bicycles' && (bikeType.includes('Mountain') || bikeType.includes('Road') || bikeType.includes('Hybrid') || bikeType.includes('Cyclocross'))) ||
                           (filterType === 'eBikes' && bikeType.includes('E-Bike'));
            
            card.style.display = showCard ? '' : 'none';
        }
    });
}