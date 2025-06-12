/* Dashboard Home Page JavaScript */

// FAB Menu Toggle
function dashboardHomePageInitializeFAB() {
    const dashboardHomePageFabTrigger = document.getElementById('dashboard-home-page-fab-trigger');
    const dashboardHomePageFabMenu = document.getElementById('dashboard-home-page-fab-menu');
    
    if (dashboardHomePageFabTrigger && dashboardHomePageFabMenu) {
        dashboardHomePageFabTrigger.addEventListener('click', function() {
            dashboardHomePageFabMenu.classList.toggle('dashboard-home-page-fab-menu-open');
        });
        
        // Close FAB menu when clicking outside
        document.addEventListener('click', function(event) {
            if (!dashboardHomePageFabTrigger.contains(event.target) && !dashboardHomePageFabMenu.contains(event.target)) {
                dashboardHomePageFabMenu.classList.remove('dashboard-home-page-fab-menu-open');
            }
        });
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', dashboardHomePageInitializeFAB);