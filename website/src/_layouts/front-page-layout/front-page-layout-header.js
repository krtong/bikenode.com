// Front Page Layout Header JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Header hover timing controls
    const header = document.querySelector('.front-page-layout-header-container');
    let hoverTimeout = null;
    let leaveTimeout = null;
    
    if (header) {
        header.addEventListener('mouseenter', function() {
            // Clear any pending leave timeout
            if (leaveTimeout) {
                clearTimeout(leaveTimeout);
                leaveTimeout = null;
            }
            
            // If already expanded, keep it expanded
            if (header.classList.contains('header-expanded')) {
                return;
            }
            
            // Don't expand immediately - wait 0.2s
            hoverTimeout = setTimeout(() => {
                header.classList.add('header-expanded');
            }, 200);
        });
        
        header.addEventListener('mouseleave', function() {
            // Clear any pending hover timeout
            if (hoverTimeout) {
                clearTimeout(hoverTimeout);
                hoverTimeout = null;
            }
            
            // Only start collapse timer if currently expanded
            if (header.classList.contains('header-expanded')) {
                // Wait 2 seconds before collapsing
                leaveTimeout = setTimeout(() => {
                    header.classList.remove('header-expanded');
                }, 2000);
            }
        });
    }
    // Search button functionality
    const searchBtn = document.querySelector('.front-page-layout-header-search-btn');
    const searchInput = document.querySelector('.front-page-layout-header-search-input');
    
    if (searchBtn && searchInput) {
        // Note: Search button expansion is now handled by CSS classes, not inline styles
        
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