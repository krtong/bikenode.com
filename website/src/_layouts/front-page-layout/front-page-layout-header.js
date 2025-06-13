// Front Page Layout Header JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Search button functionality
    const searchBtn = document.querySelector('.front-page-layout-header-search-btn');
    const searchInput = document.querySelector('.front-page-layout-header-search-input');
    
    if (searchBtn && searchInput) {
        // Handle search input focus
        searchInput.addEventListener('focus', function() {
            searchBtn.style.width = '200px';
        });
        
        // Handle search input blur
        searchInput.addEventListener('blur', function() {
            if (searchInput.value === '') {
                searchBtn.style.width = '44px';
            }
        });
        
        // Handle search submission
        searchBtn.addEventListener('submit', function(e) {
            e.preventDefault();
            const searchQuery = searchInput.value.trim();
            if (searchQuery) {
                // Implement search functionality here
                console.log('Search for:', searchQuery);
                // For now, redirect to a search results page
                window.location.href = `/search/?q=${encodeURIComponent(searchQuery)}`;
            }
        });
        
        // Handle Enter key in search input
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                const searchQuery = searchInput.value.trim();
                if (searchQuery) {
                    window.location.href = `/search/?q=${encodeURIComponent(searchQuery)}`;
                }
            }
        });
    }
    
    // Mobile menu functionality
    const mobileMenuBtn = document.querySelector('.front-page-layout-header-mobile-menu-btn');
    const nav = document.querySelector('.front-page-layout-header-nav');
    
    if (mobileMenuBtn && nav) {
        mobileMenuBtn.addEventListener('click', function() {
            nav.classList.toggle('front-page-layout-header-nav--open');
            mobileMenuBtn.classList.toggle('front-page-layout-header-mobile-menu-btn--active');
        });
    }
});