/**
 * POI Search UI Integration for Route Planner
 * Adds POI search controls and display to the route planner interface
 */

// Add to RoutePlanner class:

async searchPOIs() {
    if (!this.currentRoute || !this.currentRoute.coordinates) {
        this.showNotification('Please create a route first', 'warning');
        return;
    }
    
    // Get selected POI categories
    const selectedCategories = this.getSelectedPOICategories();
    if (selectedCategories.length === 0) {
        this.showNotification('Please select at least one POI category', 'warning');
        return;
    }
    
    // Show loading state
    this.showPOISearchLoading();
    
    try {
        // Initialize POI searcher if needed
        if (!this.poiSearcher) {
            this.poiSearcher = new RoutePOISearcher();
        }
        
        // Search for POIs
        const searchOptions = {
            radius: this.getPOISearchRadius(),
            maxResults: 50
        };
        
        const results = await this.poiSearcher.searchAlongRoute(
            this.currentRoute.coordinates,
            selectedCategories,
            searchOptions
        );
        
        // Store results
        this.currentPOIResults = results;
        
        // Display results
        this.displayPOIResults(results);
        
        // Add POI markers to map
        this.displayPOIMarkers(results);
        
    } catch (error) {
        console.error('POI search failed:', error);
        this.showNotification('Unable to search for POIs', 'error');
    } finally {
        this.hidePOISearchLoading();
    }
}

displayPOIResults(results) {
    const poiPanel = document.getElementById('poiResultsPanel');
    if (!poiPanel) return;
    
    const { categories, summary, total } = results;
    
    let html = `
        <div class="poi-results">
            <div class="poi-header">
                <h3>📍 Points of Interest</h3>
                <span class="poi-count">${total} found</span>
            </div>
            
            <div class="poi-summary">
                ${this.createPOISummary(summary)}
            </div>
            
            <div class="poi-categories">
                ${this.createPOICategoryTabs(categories)}
            </div>
            
            <div class="poi-list">
                ${this.createPOIList(categories)}
            </div>
            
            <div class="poi-actions">
                <button onclick="routePlanner.exportPOIList()" class="btn-secondary">
                    Export POI List
                </button>
                <button onclick="routePlanner.clearPOIMarkers()" class="btn-secondary">
                    Clear POIs
                </button>
            </div>
        </div>
    `;
    
    poiPanel.innerHTML = html;
    poiPanel.style.display = 'block';
    
    // Set up tab switching
    this.setupPOITabs();
}

createPOISummary(summary) {
    let html = '<div class="poi-summary-grid">';
    
    Object.entries(summary).forEach(([category, info]) => {
        const nearest = info.nearest;
        html += `
            <div class="poi-summary-item">
                <div class="poi-summary-icon">${info.icon}</div>
                <div class="poi-summary-details">
                    <div class="poi-summary-name">${info.name}</div>
                    <div class="poi-summary-count">${info.count} found</div>
                    ${nearest ? `
                        <div class="poi-summary-nearest">
                            Nearest: ${nearest.name} at ${nearest.routeDistance}km
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    return html;
}

createPOICategoryTabs(categories) {
    let html = '<div class="poi-tabs">';
    let first = true;
    
    Object.keys(categories).forEach(category => {
        const categoryInfo = this.poiSearcher.poiCategories[category];
        const count = categories[category].length;
        
        html += `
            <button class="poi-tab ${first ? 'active' : ''}" 
                    data-category="${category}"
                    onclick="routePlanner.switchPOITab('${category}')">
                <span class="tab-icon">${categoryInfo.icon}</span>
                <span class="tab-name">${categoryInfo.name}</span>
                <span class="tab-count">${count}</span>
            </button>
        `;
        first = false;
    });
    
    html += '</div>';
    return html;
}

createPOIList(categories) {
    let html = '<div class="poi-lists">';
    let first = true;
    
    Object.entries(categories).forEach(([category, pois]) => {
        html += `
            <div class="poi-category-list ${first ? 'active' : ''}" 
                 data-category="${category}">
        `;
        
        pois.forEach((poi, index) => {
            html += this.createPOIItem(poi, index);
        });
        
        html += '</div>';
        first = false;
    });
    
    html += '</div>';
    return html;
}

createPOIItem(poi, index) {
    const distanceKm = (poi.routePosition.distance / 1000).toFixed(1);
    const offRouteM = poi.distanceToRoute;
    
    return `
        <div class="poi-item" data-poi-id="${poi.id}">
            <div class="poi-item-header">
                <span class="poi-item-icon" style="color: ${poi.color}">${poi.icon}</span>
                <span class="poi-item-name">${poi.name}</span>
                <button class="poi-item-locate" 
                        onclick="routePlanner.locatePOI('${poi.id}')"
                        title="Show on map">
                    📍
                </button>
            </div>
            
            <div class="poi-item-details">
                <div class="poi-distance">
                    <span class="distance-along">📏 ${distanceKm}km along route</span>
                    <span class="distance-off">↔️ ${offRouteM}m off route</span>
                </div>
                
                ${poi.address ? `
                    <div class="poi-address">📍 ${poi.address}</div>
                ` : ''}
                
                ${poi.openingHours ? `
                    <div class="poi-hours">🕐 ${poi.openingHours}</div>
                ` : ''}
                
                ${poi.phone ? `
                    <div class="poi-phone">📞 ${poi.phone}</div>
                ` : ''}
                
                ${poi.website ? `
                    <div class="poi-website">
                        <a href="${poi.website}" target="_blank">🌐 Website</a>
                    </div>
                ` : ''}
                
                ${this.createPOISpecificDetails(poi)}
            </div>
            
            <div class="poi-item-actions">
                <button onclick="routePlanner.addPOIAsWaypoint('${poi.id}')" 
                        class="btn-small">
                    Add as Waypoint
                </button>
                <button onclick="routePlanner.getDirectionsToPOI('${poi.id}')" 
                        class="btn-small">
                    Directions
                </button>
            </div>
        </div>
    `;
}

createPOISpecificDetails(poi) {
    let html = '';
    
    // Bike shop services
    if (poi.services && poi.services.length > 0) {
        html += `<div class="poi-services">🔧 ${poi.services.join(', ')}</div>`;
    }
    
    // Food details
    if (poi.cuisine) {
        html += `<div class="poi-cuisine">🍽️ ${poi.cuisine}</div>`;
    }
    if (poi.diet && poi.diet.length > 0) {
        html += `<div class="poi-diet">🥗 ${poi.diet.join(', ')}</div>`;
    }
    
    // Accommodation details
    if (poi.stars) {
        html += `<div class="poi-stars">⭐ ${poi.stars} stars</div>`;
    }
    if (poi.bikeParking) {
        html += `<div class="poi-bike-parking">🚲 Bike parking available</div>`;
    }
    
    // Parking details
    if (poi.capacity) {
        html += `<div class="poi-capacity">🅿️ Capacity: ${poi.capacity}</div>`;
    }
    if (poi.covered) {
        html += `<div class="poi-covered">☔ Covered</div>`;
    }
    
    return html;
}

displayPOIMarkers(results) {
    // Clear existing POI markers
    this.clearPOIMarkers();
    
    const { categories } = results;
    this.poiMarkers = [];
    this.poiMarkerGroups = {};
    
    Object.entries(categories).forEach(([category, pois]) => {
        const categoryInfo = this.poiSearcher.poiCategories[category];
        const markers = [];
        
        pois.forEach(poi => {
            // Create custom icon
            const icon = L.divIcon({
                className: 'poi-marker',
                html: `
                    <div class="poi-marker-content" style="background-color: ${poi.color}">
                        <span class="poi-marker-icon">${poi.icon}</span>
                    </div>
                `,
                iconSize: [30, 30],
                iconAnchor: [15, 15]
            });
            
            // Create marker
            const marker = L.marker([poi.lat, poi.lng], { icon })
                .bindPopup(this.createPOIPopup(poi));
            
            // Store POI data with marker
            marker.poiData = poi;
            
            markers.push(marker);
            this.poiMarkers.push(marker);
        });
        
        // Create layer group for category
        this.poiMarkerGroups[category] = L.layerGroup(markers);
        this.poiMarkerGroups[category].addTo(this.map);
    });
}

createPOIPopup(poi) {
    return `
        <div class="poi-popup">
            <h4>${poi.icon} ${poi.name}</h4>
            ${poi.address ? `<p>${poi.address}</p>` : ''}
            <div class="poi-popup-details">
                <div>📏 ${(poi.routePosition.distance / 1000).toFixed(1)}km along route</div>
                <div>↔️ ${poi.distanceToRoute}m off route</div>
            </div>
            <div class="poi-popup-actions">
                <button onclick="routePlanner.addPOIAsWaypoint('${poi.id}')" 
                        class="btn-small">Add Waypoint</button>
            </div>
        </div>
    `;
}

// Helper methods
getSelectedPOICategories() {
    const checkboxes = document.querySelectorAll('.poi-category-checkbox:checked');
    return Array.from(checkboxes).map(cb => cb.value);
}

getPOISearchRadius() {
    const radiusInput = document.getElementById('poiSearchRadius');
    return radiusInput ? parseInt(radiusInput.value) : 1000;
}

switchPOITab(category) {
    // Update tab buttons
    document.querySelectorAll('.poi-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.category === category);
    });
    
    // Update content
    document.querySelectorAll('.poi-category-list').forEach(list => {
        list.classList.toggle('active', list.dataset.category === category);
    });
}

locatePOI(poiId) {
    const marker = this.poiMarkers.find(m => m.poiData.id == poiId);
    if (marker) {
        this.map.setView(marker.getLatLng(), 16);
        marker.openPopup();
    }
}

addPOIAsWaypoint(poiId) {
    const poi = this.findPOIById(poiId);
    if (poi) {
        this.addWaypoint(L.latLng(poi.lat, poi.lng));
        this.showNotification(`Added ${poi.name} as waypoint`, 'success');
    }
}

clearPOIMarkers() {
    if (this.poiMarkerGroups) {
        Object.values(this.poiMarkerGroups).forEach(group => {
            this.map.removeLayer(group);
        });
    }
    this.poiMarkers = [];
    this.poiMarkerGroups = {};
}

findPOIById(poiId) {
    if (!this.currentPOIResults) return null;
    
    for (const pois of Object.values(this.currentPOIResults.categories)) {
        const poi = pois.find(p => p.id == poiId);
        if (poi) return poi;
    }
    return null;
}

exportPOIList() {
    if (!this.currentPOIResults) return;
    
    let content = 'POINTS OF INTEREST ALONG ROUTE\n';
    content += '=' .repeat(50) + '\n\n';
    content += `Generated: ${new Date().toLocaleString()}\n\n`;
    
    const { categories, summary } = this.currentPOIResults;
    
    // Summary
    content += 'SUMMARY:\n';
    content += '-'.repeat(30) + '\n';
    Object.entries(summary).forEach(([category, info]) => {
        content += `${info.icon} ${info.name}: ${info.count} found\n`;
        if (info.nearest) {
            content += `  Nearest: ${info.nearest.name} at ${info.nearest.routeDistance}km\n`;
        }
    });
    
    // Detailed list
    content += '\n\nDETAILED LIST:\n';
    content += '='.repeat(50) + '\n';
    
    Object.entries(categories).forEach(([category, pois]) => {
        const categoryInfo = this.poiSearcher.poiCategories[category];
        content += `\n${categoryInfo.icon} ${categoryInfo.name}\n`;
        content += '-'.repeat(30) + '\n';
        
        pois.forEach((poi, index) => {
            content += `\n${index + 1}. ${poi.name}\n`;
            content += `   Distance: ${(poi.routePosition.distance / 1000).toFixed(1)}km along route\n`;
            content += `   Off route: ${poi.distanceToRoute}m\n`;
            if (poi.address) content += `   Address: ${poi.address}\n`;
            if (poi.phone) content += `   Phone: ${poi.phone}\n`;
            if (poi.website) content += `   Website: ${poi.website}\n`;
            if (poi.openingHours) content += `   Hours: ${poi.openingHours}\n`;
        });
    });
    
    // Download file
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `poi-list-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
}

// CSS Styles for POI Search UI
const poiSearchStyles = `
<style>
/* POI Search Panel */
.poi-search-panel {
    background: var(--card-bg);
    border-radius: 12px;
    padding: 20px;
    margin-top: 20px;
}

.poi-category-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 10px;
    margin: 15px 0;
}

.poi-category-item {
    display: flex;
    align-items: center;
    padding: 8px;
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
}

.poi-category-item:hover {
    background: rgba(255,255,255,0.05);
}

.poi-category-item input {
    margin-right: 8px;
}

.poi-category-icon {
    font-size: 20px;
    margin-right: 8px;
}

.poi-search-radius {
    margin: 15px 0;
}

.poi-search-radius label {
    display: block;
    margin-bottom: 5px;
    font-size: 14px;
    color: var(--text-secondary);
}

.poi-search-radius input {
    width: 100%;
    padding: 8px;
    background: rgba(255,255,255,0.1);
    border: 1px solid rgba(255,255,255,0.2);
    border-radius: 6px;
    color: var(--text-primary);
}

/* POI Results */
.poi-results {
    max-height: 600px;
    overflow-y: auto;
}

.poi-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
}

.poi-count {
    background: var(--accent);
    padding: 4px 12px;
    border-radius: 12px;
    font-size: 14px;
}

/* POI Summary */
.poi-summary-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 10px;
    margin-bottom: 20px;
}

.poi-summary-item {
    display: flex;
    padding: 10px;
    background: rgba(255,255,255,0.05);
    border-radius: 8px;
}

.poi-summary-icon {
    font-size: 32px;
    margin-right: 10px;
}

.poi-summary-details {
    flex: 1;
}

.poi-summary-name {
    font-weight: 600;
    font-size: 14px;
}

.poi-summary-count {
    font-size: 12px;
    color: var(--text-secondary);
}

.poi-summary-nearest {
    font-size: 11px;
    color: var(--accent);
    margin-top: 2px;
}

/* POI Tabs */
.poi-tabs {
    display: flex;
    gap: 5px;
    margin-bottom: 15px;
    overflow-x: auto;
    padding-bottom: 5px;
}

.poi-tab {
    display: flex;
    align-items: center;
    padding: 8px 12px;
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;
}

.poi-tab:hover {
    background: rgba(255,255,255,0.1);
}

.poi-tab.active {
    background: var(--accent);
    border-color: var(--accent);
}

.tab-icon {
    font-size: 18px;
    margin-right: 6px;
}

.tab-count {
    margin-left: 6px;
    padding: 2px 6px;
    background: rgba(0,0,0,0.2);
    border-radius: 10px;
    font-size: 12px;
}

/* POI List */
.poi-category-list {
    display: none;
}

.poi-category-list.active {
    display: block;
}

.poi-item {
    background: rgba(255,255,255,0.05);
    border-radius: 8px;
    padding: 15px;
    margin-bottom: 10px;
    transition: all 0.2s;
}

.poi-item:hover {
    background: rgba(255,255,255,0.08);
}

.poi-item-header {
    display: flex;
    align-items: center;
    margin-bottom: 10px;
}

.poi-item-icon {
    font-size: 24px;
    margin-right: 10px;
}

.poi-item-name {
    flex: 1;
    font-weight: 600;
    font-size: 15px;
}

.poi-item-locate {
    background: none;
    border: none;
    font-size: 18px;
    cursor: pointer;
    opacity: 0.7;
    transition: opacity 0.2s;
}

.poi-item-locate:hover {
    opacity: 1;
}

.poi-item-details {
    font-size: 13px;
    color: var(--text-secondary);
    margin-bottom: 10px;
}

.poi-distance {
    display: flex;
    gap: 15px;
    margin-bottom: 5px;
}

.distance-along {
    color: var(--accent);
}

.poi-item-actions {
    display: flex;
    gap: 10px;
}

.btn-small {
    padding: 5px 10px;
    font-size: 12px;
    background: rgba(255,255,255,0.1);
    border: 1px solid rgba(255,255,255,0.2);
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
}

.btn-small:hover {
    background: rgba(255,255,255,0.2);
}

/* POI Markers on Map */
.poi-marker {
    background: none !important;
    border: none !important;
}

.poi-marker-content {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid white;
    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    font-size: 16px;
}

/* POI Popup */
.poi-popup h4 {
    margin: 0 0 10px 0;
    font-size: 16px;
}

.poi-popup-details {
    font-size: 12px;
    color: #666;
    margin: 10px 0;
}

.poi-popup-actions {
    margin-top: 10px;
}

/* Loading State */
.poi-search-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 40px;
    color: var(--text-secondary);
}

.poi-search-loading::before {
    content: '';
    width: 24px;
    height: 24px;
    border: 3px solid rgba(255,255,255,0.1);
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-right: 12px;
}

/* Mobile Responsive */
@media (max-width: 768px) {
    .poi-category-grid {
        grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    }
    
    .poi-summary-grid {
        grid-template-columns: 1fr;
    }
    
    .poi-tabs {
        flex-wrap: nowrap;
        overflow-x: scroll;
        -webkit-overflow-scrolling: touch;
    }
    
    .poi-distance {
        flex-direction: column;
        gap: 2px;
    }
}
</style>
`;

// HTML structure to add to route planner
const poiSearchHTML = `
<!-- POI Search Panel -->
<div class="poi-search-panel">
    <h3>🔍 Search Points of Interest</h3>
    
    <div class="poi-category-grid">
        <label class="poi-category-item">
            <input type="checkbox" class="poi-category-checkbox" value="bikeShops" checked>
            <span class="poi-category-icon">🚲</span>
            <span>Bike Shops</span>
        </label>
        <label class="poi-category-item">
            <input type="checkbox" class="poi-category-checkbox" value="waterSources" checked>
            <span class="poi-category-icon">💧</span>
            <span>Water</span>
        </label>
        <label class="poi-category-item">
            <input type="checkbox" class="poi-category-checkbox" value="foodStops">
            <span class="poi-category-icon">☕</span>
            <span>Food & Cafes</span>
        </label>
        <label class="poi-category-item">
            <input type="checkbox" class="poi-category-checkbox" value="restrooms">
            <span class="poi-category-icon">🚻</span>
            <span>Restrooms</span>
        </label>
        <label class="poi-category-item">
            <input type="checkbox" class="poi-category-checkbox" value="gasStations">
            <span class="poi-category-icon">⛽</span>
            <span>Gas Stations</span>
        </label>
        <label class="poi-category-item">
            <input type="checkbox" class="poi-category-checkbox" value="viewpoints">
            <span class="poi-category-icon">📸</span>
            <span>Viewpoints</span>
        </label>
        <label class="poi-category-item">
            <input type="checkbox" class="poi-category-checkbox" value="accommodation">
            <span class="poi-category-icon">🏨</span>
            <span>Hotels</span>
        </label>
        <label class="poi-category-item">
            <input type="checkbox" class="poi-category-checkbox" value="bikePumps">
            <span class="poi-category-icon">🔧</span>
            <span>Bike Tools</span>
        </label>
    </div>
    
    <div class="poi-search-radius">
        <label for="poiSearchRadius">Search radius from route (meters)</label>
        <input type="range" id="poiSearchRadius" min="100" max="5000" value="1000" step="100">
        <span id="poiRadiusValue">1000m</span>
    </div>
    
    <button onclick="routePlanner.searchPOIs()" class="btn-primary">
        Search POIs Along Route
    </button>
</div>

<!-- POI Results Panel -->
<div id="poiResultsPanel" class="stats-panel" style="display: none;">
    <div class="poi-search-loading">
        Searching for points of interest...
    </div>
</div>
`;

// Event listener for radius slider
document.getElementById('poiSearchRadius')?.addEventListener('input', function(e) {
    document.getElementById('poiRadiusValue').textContent = e.target.value + 'm';
});