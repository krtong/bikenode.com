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
    '/documentation/assets/css/style.css'
  ],
  base: [
    // Base layout gets only the main CSS
  ]
};