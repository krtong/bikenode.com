// Segments Application
import { initMap } from './modules/mapController.js';
import { initFilters } from './modules/filterController.js';
import { initSegmentCards } from './modules/segmentController.js';
import { initModals } from './modules/modalController.js';
import { drawElevationSparklines } from './modules/elevationChart.js';

// Initialize the segments page
document.addEventListener('DOMContentLoaded', () => {
    // Initialize components
    initMap();
    initFilters();
    initSegmentCards();
    initModals();
    
    // Draw elevation sparklines
    drawElevationSparklines();
    
    // Initialize explore map button
    const exploreBtn = document.getElementById('exploreSegmentsBtn');
    const mapSection = document.getElementById('segmentsMapSection');
    
    exploreBtn?.addEventListener('click', () => {
        mapSection.classList.toggle('active');
        
        if (mapSection.classList.contains('active')) {
            exploreBtn.textContent = '📋 Hide Map';
            // Trigger map resize when shown
            setTimeout(() => {
                window.dispatchEvent(new Event('resize'));
            }, 100);
        } else {
            exploreBtn.innerHTML = '<span class="icon">🗺️</span> Explore Map';
        }
    });
    
    // Search functionality
    const searchInput = document.getElementById('segmentSearchInput');
    let searchTimeout;
    
    searchInput?.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            performSearch(e.target.value);
        }, 300);
    });
    
    // Sort functionality
    const sortSelect = document.getElementById('segmentSortSelect');
    sortSelect?.addEventListener('change', (e) => {
        sortSegments(e.target.value);
    });
    
    // Load more button
    const loadMoreBtn = document.getElementById('loadMoreSegmentsBtn');
    loadMoreBtn?.addEventListener('click', loadMoreSegments);
});

// Search segments
function performSearch(query) {
    console.log('Searching for:', query);
    // Implementation would filter segments based on search query
    // This would typically make an API call to search segments
}

// Sort segments
function sortSegments(sortBy) {
    console.log('Sorting by:', sortBy);
    // Implementation would reorder segments based on selected criteria
    // This would typically make an API call with sort parameters
}

// Load more segments
function loadMoreSegments() {
    console.log('Loading more segments...');
    // Implementation would fetch and append more segments
    // This would typically make an API call with pagination
    
    // For demo, just show a loading state
    const btn = document.getElementById('loadMoreSegmentsBtn');
    const originalText = btn.textContent;
    btn.textContent = 'Loading...';
    btn.disabled = true;
    
    setTimeout(() => {
        btn.textContent = originalText;
        btn.disabled = false;
        // Would append new segments to the grid here
    }, 1000);
}