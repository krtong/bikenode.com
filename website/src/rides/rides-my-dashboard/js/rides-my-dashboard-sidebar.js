// Dashboard JavaScript
document.addEventListener('DOMContentLoaded', function() {
  console.log('Dashboard loaded');
  
  // Handle sidebar toggle on mobile
  const sidebarToggle = document.querySelector('.sidebar-toggle');
  const sidebar = document.querySelector('.dashboard-sidebar');
  
  if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener('click', () => {
      sidebar.classList.toggle('active');
    });
  }
});