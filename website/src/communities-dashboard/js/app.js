// Main app entry point for communities dashboard
import { initializeTabs } from './tabs.js';
import { initializeFilters } from './filters.js';
import { initializeSearch } from './search.js';
import { initializeActions } from './actions.js';

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeTabs();
    initializeFilters();
    initializeSearch();
    initializeActions();
});