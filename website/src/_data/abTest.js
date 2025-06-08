// A/B Test configuration data
module.exports = {
  // Test configuration
  tests: {
    headerSidebarRedesign: {
      name: 'header_sidebar_redesign',
      description: 'Testing new header and sidebar designs',
      startDate: '2025-01-06',
      endDate: '2025-02-06',
      traffic: 0.5, // 50% of users get the variant
      enabled: true,
      variants: {
        control: {
          header: 'main-header.njk',
          sidebar: 'dashboard-sidebar.njk'
        },
        variant: {
          header: 'main-header-v2.njk',
          sidebar: 'dashboard-sidebar-v2.njk'
        }
      }
    }
  },
  
  // Helper function to get test assignment
  getTestAssignment: function(testName) {
    const test = this.tests[testName];
    if (!test || !test.enabled) return 'control';
    
    // Server-side assignment logic could go here
    // For now, we'll handle it client-side
    return null;
  }
};