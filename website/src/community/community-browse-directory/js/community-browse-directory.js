// Community Browse Directory JavaScript

// Category filtering
document.querySelectorAll('.community-browse-directory-category-tab').forEach(tab => {
    tab.addEventListener('click', function() {
        document.querySelectorAll('.community-browse-directory-category-tab').forEach(t => t.classList.remove('active'));
        this.classList.add('active');
        
        const category = this.dataset.category;
        console.log('Filtering by category:', category);
        // In a real app, this would filter the communities
    });
});

// Search functionality
const searchInput = document.querySelector('.community-browse-directory-search');
if (searchInput) {
    searchInput.addEventListener('input', function(e) {
        const searchTerm = e.target.value.toLowerCase();
        console.log('Searching for:', searchTerm);
        // In a real app, this would search communities
    });
}

// Mock join community
document.querySelectorAll('.BN-Global-btn, .community-browse-directory-join-link').forEach(btn => {
    btn.addEventListener('click', function(e) {
        if (this.textContent.includes('Join') || this.textContent.includes('View') || this.textContent.includes('Load More') || this.textContent.includes('Create')) {
            e.preventDefault();
            alert('In a real app, this would let you join or view the community!');
        }
    });
});