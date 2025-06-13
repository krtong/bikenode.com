// marketplace-browse-listings.js
document.addEventListener('DOMContentLoaded', function() {
    // Search functionality
    const searchInput = document.querySelector('.marketplace-browse-listings-search-input');
    const locationInput = document.querySelector('.marketplace-browse-listings-location-input');
    const searchButton = document.querySelector('.marketplace-browse-listings-search-button');
    
    if (searchButton) {
        searchButton.addEventListener('click', function() {
            const searchTerm = searchInput.value;
            const location = locationInput.value;
            console.log('Searching for:', searchTerm, 'in', location);
            // In a real app, this would submit to a search endpoint
        });
    }

    // Tab filtering
    const filterTabs = document.querySelectorAll('.marketplace-browse-listings-tab');
    filterTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            // Remove active class from all tabs
            filterTabs.forEach(t => t.classList.remove('active'));
            // Add active class to clicked tab
            this.classList.add('active');
            
            const filter = this.textContent.trim();
            console.log('Filtering by:', filter);
            // In a real app, this would filter the listings
        });
    });

    // Pagination
    const pageButtons = document.querySelectorAll('.marketplace-browse-listings-page-number');
    pageButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remove active class from all page buttons
            pageButtons.forEach(b => b.classList.remove('active'));
            // Add active class to clicked button
            this.classList.add('active');
            
            const pageNumber = this.textContent;
            console.log('Navigating to page:', pageNumber);
            // In a real app, this would load the appropriate page
        });
    });

    // Previous/Next buttons
    const prevButton = document.querySelector('.marketplace-browse-listings-page-button:first-child');
    const nextButton = document.querySelector('.marketplace-browse-listings-page-button:last-child');
    
    if (prevButton) {
        prevButton.addEventListener('click', function() {
            console.log('Previous page');
            // Handle previous page navigation
        });
    }
    
    if (nextButton) {
        nextButton.addEventListener('click', function() {
            console.log('Next page');
            // Handle next page navigation
        });
    }

    // Post ad button
    const postAdButton = document.querySelector('.marketplace-browse-listings-post-ad-button');
    if (postAdButton) {
        postAdButton.addEventListener('click', function() {
            window.location.href = '/marketplace/marketplace-create-listing/';
        });
    }

    // Category cards hover effect
    const categoryCards = document.querySelectorAll('.marketplace-browse-listings-category-card');
    categoryCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-4px)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(-2px)';
        });
    });

    // Listing cards click handling
    const listingCards = document.querySelectorAll('.marketplace-browse-listings-listing-card, .marketplace-browse-listings-list-item');
    listingCards.forEach(card => {
        card.style.cursor = 'pointer';
        card.addEventListener('click', function() {
            window.location.href = '/marketplace/marketplace-item-details/';
        });
    });

    // Search input enter key handling
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchButton.click();
            }
        });
    }
    
    if (locationInput) {
        locationInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchButton.click();
            }
        });
    }
});