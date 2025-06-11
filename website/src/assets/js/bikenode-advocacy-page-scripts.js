// Advocacy Page JavaScript
document.addEventListener('DOMContentLoaded', () => {
  // Tab Navigation
  const tabButtons = document.querySelectorAll('.nav-tab');
  const tabContents = document.querySelectorAll('.tab-content');
  
  // Handle tab switching
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const targetTab = button.dataset.tab;
      
      // Update active states for buttons
      tabButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      
      // Update active states for content
      tabContents.forEach(content => content.classList.remove('active'));
      const targetContent = document.getElementById(`${targetTab}-tab`);
      if (targetContent) {
        targetContent.classList.add('active');
      }
      
      // Update URL hash without scrolling
      history.replaceState(null, null, `#${targetTab}`);
    });
  });
  
  // Handle direct navigation via URL hash
  const handleHashChange = () => {
    const hash = window.location.hash.slice(1);
    if (hash) {
      const targetButton = document.querySelector(`[data-tab="${hash}"]`);
      if (targetButton) {
        targetButton.click();
      }
    }
  };
  
  // Check for hash on page load
  handleHashChange();
  
  // Listen for hash changes
  window.addEventListener('hashchange', handleHashChange);
});