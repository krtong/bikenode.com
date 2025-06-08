// Dashboard Configuration
// Toggle between v1 and v2 dashboards

module.exports = {
  // Set to 'v2' to use the new dashboard, 'v1' for the original
  version: 'v2',
  
  // Feature flags for gradual rollout
  features: {
    realTimeUpdates: true,
    advancedWidgets: true,
    newNavigation: true
  },
  
  // A/B testing configuration
  abTesting: {
    enabled: false,
    percentage: 50, // Percentage of users to show v2
    cookieName: 'dashboard_version'
  }
};