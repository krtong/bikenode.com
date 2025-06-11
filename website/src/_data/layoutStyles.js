// Define which CSS files should be loaded for each layout
module.exports = {
  // Map layouts to their required CSS files
  'bikenode-main-layout-01': [
    '/assets/css/bikenode-main-layout-01.css',
    '/assets/css/bikenode-main-layout-01-sidebar.css',
    '/assets/css/bikenode-main-layout-01-header.css'
  ],
  dashboard: [
    '/assets/css/bikenode-dashboard-layout-structure.css',
    '/assets/css/bikenode-dashboard-page-styles.css'
  ],
  app: [
    // Legacy - to be removed after migration
  ],
  auth: [
    '/auth/auth.css'
  ],
  docs: [
    '/assets/css/bikenode-documentation-page-styles.css'
  ],
  main: [
    // Main layout for marketing pages gets only the global CSS
  ]
};