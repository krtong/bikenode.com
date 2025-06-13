/* ===================================
   BikeNode Main Layout Sidebar Component JavaScript
   Self-contained sidebar functionality
   =================================== */

document.addEventListener('DOMContentLoaded', function() {
    const sidebar = document.querySelector('.bikenode-main-layout-01-sidebar');
    const toggle = document.querySelector('.bikenode-main-layout-01-sidebar-toggle');
    
    // Handle collapse toggle
    if (toggle && sidebar) {
        toggle.addEventListener('click', function() {
            sidebar.classList.toggle('bikenode-main-layout-01-sidebar-collapsed');
            localStorage.setItem('bikenode-main-layout-01-sidebarCollapsed', sidebar.classList.contains('bikenode-main-layout-01-sidebar-collapsed'));
        });
        
        // Restore collapsed state
        if (localStorage.getItem('bikenode-main-layout-01-sidebarCollapsed') === 'true') {
            sidebar.classList.add('bikenode-main-layout-01-sidebar-collapsed');
        }
    }
    
    // Handle collapsible sections
    const sectionToggles = document.querySelectorAll('.bikenode-main-layout-01-sidebar-section-toggle');
    sectionToggles.forEach(toggle => {
        toggle.addEventListener('click', function() {
            const isExpanded = this.getAttribute('aria-expanded') === 'true';
            this.setAttribute('aria-expanded', !isExpanded);
            
            // Save state
            const sectionId = this.getAttribute('aria-controls');
            localStorage.setItem(`bikenode-main-layout-01-section-${sectionId}`, !isExpanded);
        });
        
        // Restore section states
        const sectionId = toggle.getAttribute('aria-controls');
        const savedState = localStorage.getItem(`bikenode-main-layout-01-section-${sectionId}`);
        if (savedState !== null) {
            toggle.setAttribute('aria-expanded', savedState);
        }
    });
    
    // Handle details elements (nav groups) to only allow one open at a time
    const detailsElements = document.querySelectorAll('.bikenode-main-layout-01-nav-group');
    detailsElements.forEach(details => {
        details.addEventListener('toggle', function() {
            if (this.open) {
                detailsElements.forEach(otherDetails => {
                    if (otherDetails !== this && otherDetails.open) {
                        otherDetails.open = false;
                    }
                });
            }
        });
    });
    
    // Mobile sidebar handling
    if (window.innerWidth <= 768) {
        sidebar.classList.add('bikenode-main-layout-01-sidebar-mobile-hidden');
        
        // Create mobile toggle button if it doesn't exist
        let mobileToggle = document.querySelector('.bikenode-main-layout-01-mobile-sidebar-toggle');
        if (!mobileToggle) {
            mobileToggle = document.createElement('button');
            mobileToggle.className = 'bikenode-main-layout-01-mobile-sidebar-toggle';
            mobileToggle.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12H21M3 6H21M3 18H21"></path></svg>';
            mobileToggle.setAttribute('aria-label', 'Toggle sidebar');
            document.body.appendChild(mobileToggle);
            
            mobileToggle.addEventListener('click', function() {
                sidebar.classList.toggle('bikenode-main-layout-01-sidebar-mobile-open');
            });
        }
        
        // Close sidebar when clicking outside on mobile
        document.addEventListener('click', function(event) {
            if (!sidebar.contains(event.target) && !event.target.closest('.bikenode-main-layout-01-mobile-sidebar-toggle')) {
                sidebar.classList.remove('bikenode-main-layout-01-sidebar-mobile-open');
            }
        });
    }
});