// Filter functionality
export function initializeFilters() {
    // My Communities filters
    const myCommunitiesFilters = document.querySelectorAll('#my-communities .filter-btn');
    myCommunitiesFilters.forEach(btn => {
        btn.addEventListener('click', function() {
            myCommunitiesFilters.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            const filterType = this.dataset.filter;
            filterCommunities(filterType);
        });
    });
    
    // Discover category filters
    const categoryFilters = document.querySelectorAll('.category-btn');
    categoryFilters.forEach(btn => {
        btn.addEventListener('click', function() {
            categoryFilters.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            const category = this.dataset.category;
            filterDiscoverCommunities(category);
        });
    });
}

function filterCommunities(filterType) {
    const communityCards = document.querySelectorAll('#my-communities .community-card');
    
    communityCards.forEach(card => {
        if (filterType === 'all') {
            card.style.display = 'block';
        } else {
            const roleElement = card.querySelector('.role-badge');
            const role = roleElement.textContent.toLowerCase();
            const shouldShow = 
                (filterType === 'admin' && (role === 'owner' || role === 'admin')) ||
                (filterType === 'moderator' && role === 'moderator') ||
                (filterType === 'member' && role === 'member');
            
            card.style.display = shouldShow ? 'block' : 'none';
        }
    });
}

function filterDiscoverCommunities(category) {
    console.log('Filtering by category:', category);
    // In a real implementation, this would filter the discover communities
}