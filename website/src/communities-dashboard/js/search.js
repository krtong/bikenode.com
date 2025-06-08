// Search functionality
export function initializeSearch() {
    // My Communities search
    const myCommunitiesSearch = document.getElementById('my-communities-search');
    if (myCommunitiesSearch) {
        myCommunitiesSearch.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            searchCommunities(searchTerm, '#my-communities .community-card');
        });
    }
    
    // Discover search
    const discoverSearch = document.getElementById('discover-search');
    if (discoverSearch) {
        discoverSearch.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            searchCommunities(searchTerm, '#discover .discover-card');
        });
    }
}

function searchCommunities(searchTerm, selector) {
    const cards = document.querySelectorAll(selector);
    
    cards.forEach(card => {
        const title = card.querySelector('h3').textContent.toLowerCase();
        const description = card.querySelector('.community-description p').textContent.toLowerCase();
        const tags = Array.from(card.querySelectorAll('.tag')).map(tag => tag.textContent.toLowerCase()).join(' ');
        
        const matchesSearch = title.includes(searchTerm) || 
                            description.includes(searchTerm) || 
                            tags.includes(searchTerm);
        
        card.style.display = matchesSearch ? 'block' : 'none';
    });
}