/* ===================================
   BikeNode Main Layout Header Component JavaScript
   Handles dropdown menu functionality
   =================================== */

(function() {
    const dropdown = document.querySelector('.bikenode-main-layout-01-header-user-dropdown');
    const trigger = dropdown.querySelector('.bikenode-main-layout-01-header-user-dropdown-trigger');
    const menu = dropdown.querySelector('.bikenode-main-layout-01-header-user-dropdown-menu');
    
    trigger.addEventListener('click', function(e) {
        e.stopPropagation();
        const isOpen = trigger.getAttribute('aria-expanded') === 'true';
        trigger.setAttribute('aria-expanded', !isOpen);
        menu.setAttribute('aria-hidden', isOpen);
    });
    
    document.addEventListener('click', function() {
        trigger.setAttribute('aria-expanded', 'false');
        menu.setAttribute('aria-hidden', 'true');
    });
    
    menu.addEventListener('click', function(e) {
        e.stopPropagation();
    });
})();