/* ===================================
   BikeNode Main Layout Header Component JavaScript
   Self-contained header functionality
   =================================== */

document.addEventListener('DOMContentLoaded', function() {
    // User menu dropdown
    const userMenuButton = document.querySelector('.bikenode-main-layout-01-header-user-menu-button');
    const userDropdown = document.querySelector('.bikenode-main-layout-01-header-user-dropdown');
    
    if (userMenuButton && userDropdown) {
        userMenuButton.addEventListener('click', function() {
            const isOpen = !userDropdown.hidden;
            userDropdown.hidden = isOpen;
            userMenuButton.setAttribute('aria-expanded', !isOpen);
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', function(event) {
            if (!event.target.closest('.bikenode-main-layout-01-header-user-menu')) {
                userDropdown.hidden = true;
                userMenuButton.setAttribute('aria-expanded', 'false');
            }
        });
    }
    
    // Mobile menu
    const mobileMenuButton = document.querySelector('.bikenode-main-layout-01-header-mobile-menu-button');
    const mobileNav = document.querySelector('.bikenode-main-layout-01-header-mobile-nav');
    
    if (mobileMenuButton && mobileNav) {
        mobileMenuButton.addEventListener('click', function() {
            const isOpen = !mobileNav.hidden;
            mobileNav.hidden = isOpen;
            mobileMenuButton.setAttribute('aria-expanded', !isOpen);
        });
    }
    
    // Add logged in class if user is authenticated
    // This would typically be set by your backend
    if (document.cookie.includes('authenticated=true')) {
        document.body.classList.add('bikenode-main-layout-01-user-logged-in');
    }
});