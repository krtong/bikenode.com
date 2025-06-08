// Define which CSS files should be loaded for each layout
module.exports = {
  // Map layouts to their required CSS files
  dashboard: [
    '/assets/css/dashboard.css'
  ],
  auth: [
    // Auth pages don't need dashboard.css
  ],
  docs: [
    '/assets/css/docs.css',
    '/assets/css/docs-layout.css'
  ],
  base: [
    // Base layout gets only the main CSS
  ]
};