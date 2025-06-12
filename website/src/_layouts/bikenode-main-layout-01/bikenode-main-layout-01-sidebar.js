/* ===================================
   BikeNode Main Layout Sidebar Component JavaScript
   Handles collapsible sections and mobile toggle functionality
   =================================== */

(function() {
    // Get all section toggle buttons
    const toggleButtons = document.querySelectorAll('.bikenode-main-layout-01-sidebar-section-toggle');
    
    // Add click event to each toggle button
    toggleButtons.forEach(button => {
        button.addEventListener('click', function() {
            const isExpanded = this.getAttribute('aria-expanded') === 'true';
            this.setAttribute('aria-expanded', !isExpanded);
        });
    });
    
    // Handle mobile sidebar toggle
    const sidebar = document.getElementById('bikenode-main-layout-01-sidebar');
    
    // Function to toggle sidebar on mobile
    window.toggleBikenodeSidebar = function() {
        sidebar.classList.toggle('active');
    };
    
    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', function(event) {
        if (window.innerWidth <= 1024) {
            const isClickInsideSidebar = sidebar.contains(event.target);
            const isToggleButton = event.target.closest('[data-toggle-sidebar]');
            
            if (!isClickInsideSidebar && !isToggleButton && sidebar.classList.contains('active')) {
                sidebar.classList.remove('active');
            }
        }
    });
})();