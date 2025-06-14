/* ===================================
   BikeNode Main Layout Header Component JavaScript
   Self-contained header functionality
   =================================== */

document.addEventListener('DOMContentLoaded', function() {
    // Header expand/collapse functionality
    const header = document.querySelector('.bikenode-main-layout-01-header');
    const navLinks = document.querySelectorAll('.bikenode-main-layout-01-header-nav-link');
    const navTexts = document.querySelectorAll('.bikenode-main-layout-01-header-nav-text');
    let expandTimer = null;
    let collapseTimer = null;
    let isExpanded = false;
    
    // Function to expand header
    function expandHeader() {
        if (!isExpanded) {
            isExpanded = true;
            header.classList.add('bikenode-main-layout-01-header-expanded');
            navTexts.forEach(text => {
                text.style.opacity = '0';
                text.style.maxWidth = '0';
                text.style.display = 'inline-block';
                // Force reflow
                text.offsetHeight;
                text.style.transition = 'opacity 0.3s ease, max-width 0.3s ease';
                text.style.opacity = '1';
                text.style.maxWidth = '200px';
            });
        }
    }
    
    // Function to collapse header
    function collapseHeader() {
        if (isExpanded) {
            isExpanded = false;
            navTexts.forEach(text => {
                text.style.opacity = '0';
                text.style.maxWidth = '0';
            });
            setTimeout(() => {
                if (!isExpanded) {
                    header.classList.remove('bikenode-main-layout-01-header-expanded');
                    navTexts.forEach(text => {
                        text.style.display = '';
                    });
                }
            }, 300);
        }
    }
    
    // Mouse enter event
    header.addEventListener('mouseenter', function() {
        // Clear any pending collapse
        if (collapseTimer) {
            clearTimeout(collapseTimer);
            collapseTimer = null;
        }
        
        // Set expand timer for 0.25 seconds
        expandTimer = setTimeout(() => {
            expandHeader();
        }, 250);
    });
    
    // Mouse leave event
    header.addEventListener('mouseleave', function() {
        // Clear any pending expand
        if (expandTimer) {
            clearTimeout(expandTimer);
            expandTimer = null;
        }
        
        // Set collapse timer for 2 seconds
        collapseTimer = setTimeout(() => {
            collapseHeader();
        }, 2000);
    });
    
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