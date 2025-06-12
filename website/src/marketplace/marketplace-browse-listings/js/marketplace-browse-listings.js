// marketplace-browse-listings.js
document.addEventListener('DOMContentLoaded', function() {
    // Search functionality
    const searchInput = document.querySelector('.marketplace-browse-listings-search-input');
    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            console.log('Searching for:', e.target.value);
            // Add search logic here
        });
    }

    // Category filter
    const categorySelect = document.querySelector('.marketplace-browse-listings-select[data-filter="category"]');
    if (categorySelect) {
        categorySelect.addEventListener('change', function(e) {
            console.log('Category changed to:', e.target.value);
            // Add category filter logic here
        });
    }

    // Sort filter
    const sortSelect = document.querySelector('.marketplace-browse-listings-select[data-filter="sort"]');
    if (sortSelect) {
        sortSelect.addEventListener('change', function(e) {
            console.log('Sort changed to:', e.target.value);
            // Add sort logic here
        });
    }

    // Load more button
    const loadMoreButton = document.querySelector('.marketplace-browse-listings-load-button');
    if (loadMoreButton) {
        loadMoreButton.addEventListener('click', function() {
            console.log('Loading more listings...');
            // Add load more logic here
        });
    }

    // View details buttons
    const viewDetailsButtons = document.querySelectorAll('.marketplace-browse-listings-item-button');
    viewDetailsButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            // Navigation is handled by the link, but we could add analytics here
            console.log('Viewing item details');
        });
    });
});