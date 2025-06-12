/**
 * Climbing Analysis UI Integration
 * Adds climbing category detection and visualization to route planner
 */

// Add to RoutePlanner class:

analyzeClimbs() {
    if (!this.elevationData || this.elevationData.length < 2) {
        console.warn('No elevation data available for climb analysis');
        return;
    }
    
    // Initialize analyzer if needed
    if (!this.climbAnalyzer) {
        this.climbAnalyzer = new ClimbingCategoryAnalyzer();
    }
    
    // Analyze climbs
    const analysis = this.climbAnalyzer.analyzeClimbs(this.elevationData);
    
    // Store results
    this.climbAnalysis = analysis;
    
    // Update UI
    this.displayClimbAnalysis(analysis);
    
    // Update elevation profile with climb highlighting
    this.updateElevationProfileWithClimbs(analysis);
    
    // Add climb markers to map
    this.displayClimbMarkers(analysis.climbs);
}

displayClimbAnalysis(analysis) {
    const climbPanel = document.getElementById('climbAnalysisPanel');
    if (!climbPanel) return;
    
    const { climbs, statistics } = analysis;
    
    if (climbs.length === 0) {
        climbPanel.innerHTML = `
            <div class="climb-analysis">
                <h3>⛰️ Climb Analysis</h3>
                <p class="no-climbs">No significant climbs detected on this route.</p>
            </div>
        `;
        climbPanel.style.display = 'block';
        return;
    }
    
    const formattedClimbs = climbs.map((climb, i) => 
        this.climbAnalyzer.formatClimb(climb, i)
    );
    
    climbPanel.innerHTML = `
        <div class="climb-analysis">
            <h3>⛰️ Climb Analysis</h3>
            
            <div class="climb-summary">
                ${this.climbAnalyzer.generateClimbSummary(statistics)}
            </div>
            
            <div class="climb-statistics">
                ${this.createClimbStatistics(statistics)}
            </div>
            
            <div class="climb-categories">
                ${this.createClimbCategoryChart(statistics)}
            </div>
            
            <div class="climb-list">
                <h4>Climb Details</h4>
                ${formattedClimbs.map(climb => this.createClimbCard(climb)).join('')}
            </div>
            
            <div class="climb-actions">
                <button onclick="routePlanner.exportClimbAnalysis()" class="btn-secondary">
                    Export Climb Data
                </button>
                <button onclick="routePlanner.toggleClimbHighlighting()" class="btn-secondary">
                    Toggle Highlighting
                </button>
            </div>
        </div>
    `;
    
    climbPanel.style.display = 'block';
}

createClimbStatistics(stats) {
    const notableClimbs = [];
    
    if (stats.hardestClimb) {
        notableClimbs.push(`
            <div class="stat-item">
                <span class="stat-label">Hardest:</span>
                <span class="stat-value">${stats.hardestClimb.category.name} • ${stats.hardestClimb.difficulty}/100</span>
            </div>
        `);
    }
    
    if (stats.longestClimb) {
        notableClimbs.push(`
            <div class="stat-item">
                <span class="stat-label">Longest:</span>
                <span class="stat-value">${(stats.longestClimb.distance / 1000).toFixed(1)}km • ${Math.round(stats.longestClimb.totalGain)}m</span>
            </div>
        `);
    }
    
    if (stats.steepestClimb) {
        notableClimbs.push(`
            <div class="stat-item">
                <span class="stat-label">Steepest:</span>
                <span class="stat-value">${stats.steepestClimb.maxGradient.toFixed(1)}% max gradient</span>
            </div>
        `);
    }
    
    return `
        <div class="climb-stats-grid">
            <div class="stat-card">
                <div class="stat-number">${stats.totalClimbs}</div>
                <div class="stat-label">Total Climbs</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${Math.round(stats.totalClimbing)}m</div>
                <div class="stat-label">Total Climbing</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${(stats.totalClimbDistance / 1000).toFixed(1)}km</div>
                <div class="stat-label">Climbing Distance</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${stats.averageDifficulty}</div>
                <div class="stat-label">Avg Difficulty</div>
            </div>
        </div>
        ${notableClimbs.length > 0 ? `
            <div class="notable-climbs">
                <h5>Notable Climbs</h5>
                ${notableClimbs.join('')}
            </div>
        ` : ''}
    `;
}

createClimbCategoryChart(stats) {
    const categories = ['HC', '1', '2', '3', '4'];
    const maxCount = Math.max(...Object.values(stats.categoryCounts));
    
    if (maxCount === 0) return '';
    
    let html = '<div class="category-chart">';
    html += '<h5>Climbs by Category</h5>';
    
    categories.forEach(cat => {
        const count = stats.categoryCounts[cat] || 0;
        const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
        const category = cat === 'HC' ? this.climbAnalyzer.categories.HC : 
                        this.climbAnalyzer.categories[cat];
        
        if (count > 0) {
            html += `
                <div class="category-bar">
                    <div class="category-label">
                        <span class="category-badge" style="background: ${category.color}">
                            ${category.name}
                        </span>
                        <span class="category-count">${count}</span>
                    </div>
                    <div class="category-bar-bg">
                        <div class="category-bar-fill" 
                             style="width: ${percentage}%; background: ${category.color}">
                        </div>
                    </div>
                </div>
            `;
        }
    });
    
    html += '</div>';
    return html;
}

createClimbCard(climb) {
    return `
        <div class="climb-card" data-climb-id="${climb.id}">
            <div class="climb-header">
                <span class="climb-category" style="background: ${climb.color}">
                    ${climb.category}
                </span>
                <span class="climb-name">${climb.name}</span>
                <button class="climb-locate" onclick="routePlanner.locateClimb('${climb.id}')" title="Show on map">
                    📍
                </button>
            </div>
            
            <div class="climb-metrics">
                <div class="metric">
                    <span class="metric-label">Distance:</span>
                    <span class="metric-value">${climb.distance}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Elevation:</span>
                    <span class="metric-value">${climb.elevation}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Avg Grade:</span>
                    <span class="metric-value">${climb.avgGradient}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Max Grade:</span>
                    <span class="metric-value">${climb.maxGradient}</span>
                </div>
            </div>
            
            <div class="climb-details">
                <div class="detail-row">
                    <span>Difficulty:</span>
                    <div class="difficulty-bar">
                        <div class="difficulty-fill" style="width: ${climb.raw.difficulty}%"></div>
                    </div>
                    <span>${climb.difficulty}</span>
                </div>
                <div class="detail-row">
                    <span>VAM:</span>
                    <span>${climb.vam}</span>
                </div>
                <div class="detail-row">
                    <span>Location:</span>
                    <span>${climb.startKm} - ${climb.endKm} km</span>
                </div>
            </div>
            
            <div class="climb-profile-mini">
                ${this.createMiniClimbProfile(climb.raw)}
            </div>
        </div>
    `;
}

createMiniClimbProfile(climb) {
    // Create SVG mini profile
    const width = 200;
    const height = 60;
    const padding = 5;
    
    // Find min/max elevation for scaling
    let minElev = Infinity, maxElev = -Infinity;
    climb.profile.forEach(point => {
        minElev = Math.min(minElev, point.elevation);
        maxElev = Math.max(maxElev, point.elevation);
    });
    
    // Create path
    const points = climb.profile.map((point, i) => {
        const x = padding + (i / (climb.profile.length - 1)) * (width - 2 * padding);
        const y = height - padding - ((point.elevation - minElev) / (maxElev - minElev)) * (height - 2 * padding);
        return `${x},${y}`;
    }).join(' ');
    
    // Create gradient areas
    const gradientPath = `M ${points.split(' ')[0]} L ${points} L ${width - padding},${height - padding} L ${padding},${height - padding} Z`;
    
    return `
        <svg width="${width}" height="${height}" class="climb-profile-svg">
            <defs>
                <linearGradient id="climb-gradient-${climb.startDistance}" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style="stop-color:${climb.category.color};stop-opacity:0.8" />
                    <stop offset="100%" style="stop-color:${climb.category.color};stop-opacity:0.2" />
                </linearGradient>
            </defs>
            <path d="${gradientPath}" fill="url(#climb-gradient-${climb.startDistance})" />
            <polyline points="${points}" fill="none" stroke="${climb.category.color}" stroke-width="2" />
        </svg>
    `;
}

updateElevationProfileWithClimbs(analysis) {
    if (!this.elevationChart || !analysis.profileData) return;
    
    // Add climb highlighting to elevation chart
    const canvas = this.elevationChart.canvas;
    const ctx = canvas.getContext('2d');
    
    // Create climb annotations
    const annotations = {};
    analysis.climbs.forEach((climb, index) => {
        const startX = (climb.startDistance / this.totalDistance) * canvas.width;
        const endX = (climb.endDistance / this.totalDistance) * canvas.width;
        
        annotations[`climb_${index}`] = {
            type: 'box',
            xMin: startX,
            xMax: endX,
            yMin: 0,
            yMax: canvas.height,
            backgroundColor: climb.category.color + '20', // 20% opacity
            borderColor: climb.category.color,
            borderWidth: 1
        };
    });
    
    // Update chart with annotations
    this.elevationChart.options.plugins.annotation = {
        annotations: annotations
    };
    this.elevationChart.update();
}

displayClimbMarkers(climbs) {
    // Clear existing climb markers
    if (this.climbMarkers) {
        this.climbMarkers.forEach(marker => this.map.removeLayer(marker));
    }
    this.climbMarkers = [];
    
    climbs.forEach((climb, index) => {
        const formatted = this.climbAnalyzer.formatClimb(climb, index);
        
        // Find start position on route
        const startPoint = this.findPointOnRoute(climb.startDistance);
        if (!startPoint) return;
        
        // Create custom icon
        const icon = L.divIcon({
            className: 'climb-marker',
            html: `
                <div class="climb-marker-content" style="background: ${climb.category.color}">
                    <span class="climb-marker-text">${climb.category.name}</span>
                </div>
            `,
            iconSize: [60, 24],
            iconAnchor: [30, 12]
        });
        
        // Create marker
        const marker = L.marker(startPoint, { icon })
            .bindPopup(this.createClimbPopup(formatted));
        
        marker.climbData = formatted;
        marker.addTo(this.map);
        this.climbMarkers.push(marker);
    });
}

createClimbPopup(climb) {
    return `
        <div class="climb-popup">
            <h4 style="color: ${climb.color}">${climb.name}</h4>
            <div class="climb-popup-stats">
                <div><strong>Distance:</strong> ${climb.distance}</div>
                <div><strong>Elevation:</strong> ${climb.elevation}</div>
                <div><strong>Avg Grade:</strong> ${climb.avgGradient}</div>
                <div><strong>Max Grade:</strong> ${climb.maxGradient}</div>
                <div><strong>Difficulty:</strong> ${climb.difficulty}</div>
            </div>
            <div class="climb-popup-description">
                ${climb.description}
            </div>
        </div>
    `;
}

// Helper methods
findPointOnRoute(distance) {
    if (!this.currentRoute || !this.currentRoute.coordinates) return null;
    
    let accumulatedDistance = 0;
    
    for (let i = 1; i < this.currentRoute.coordinates.length; i++) {
        const segmentDistance = this.calculateDistance(
            this.currentRoute.coordinates[i-1],
            this.currentRoute.coordinates[i]
        );
        
        if (accumulatedDistance + segmentDistance >= distance) {
            // Interpolate position
            const ratio = (distance - accumulatedDistance) / segmentDistance;
            const lat = this.currentRoute.coordinates[i-1].lat + 
                       (this.currentRoute.coordinates[i].lat - this.currentRoute.coordinates[i-1].lat) * ratio;
            const lng = this.currentRoute.coordinates[i-1].lng + 
                       (this.currentRoute.coordinates[i].lng - this.currentRoute.coordinates[i-1].lng) * ratio;
            return [lat, lng];
        }
        
        accumulatedDistance += segmentDistance;
    }
    
    return null;
}

locateClimb(climbId) {
    const marker = this.climbMarkers.find(m => m.climbData.id === climbId);
    if (marker) {
        this.map.setView(marker.getLatLng(), 14);
        marker.openPopup();
    }
}

toggleClimbHighlighting() {
    this.climbHighlightingEnabled = !this.climbHighlightingEnabled;
    
    if (this.climbMarkers) {
        this.climbMarkers.forEach(marker => {
            if (this.climbHighlightingEnabled) {
                marker.addTo(this.map);
            } else {
                this.map.removeLayer(marker);
            }
        });
    }
    
    // Update elevation chart
    if (this.elevationChart) {
        this.elevationChart.options.plugins.annotation.enabled = this.climbHighlightingEnabled;
        this.elevationChart.update();
    }
}

exportClimbAnalysis() {
    if (!this.climbAnalysis) return;
    
    const { climbs, statistics } = this.climbAnalysis;
    
    let content = 'CLIMB ANALYSIS REPORT\n';
    content += '=' .repeat(50) + '\n\n';
    content += `Route: ${this.routeName || 'Unnamed Route'}\n`;
    content += `Date: ${new Date().toLocaleString()}\n`;
    content += `Total Distance: ${(this.totalDistance / 1000).toFixed(1)} km\n\n`;
    
    content += 'SUMMARY\n';
    content += '-'.repeat(30) + '\n';
    content += `Total Climbs: ${statistics.totalClimbs}\n`;
    content += `Total Climbing: ${Math.round(statistics.totalClimbing)} m\n`;
    content += `Climbing Distance: ${(statistics.totalClimbDistance / 1000).toFixed(1)} km\n`;
    content += `Average Difficulty: ${statistics.averageDifficulty}/100\n\n`;
    
    content += 'CLIMB BREAKDOWN\n';
    content += '-'.repeat(30) + '\n';
    ['HC', '1', '2', '3', '4'].forEach(cat => {
        if (statistics.categoryCounts[cat] > 0) {
            const catName = cat === 'HC' ? 'HC' : `Category ${cat}`;
            content += `${catName}: ${statistics.categoryCounts[cat]} climbs\n`;
        }
    });
    
    content += '\n\nDETAILED CLIMB LIST\n';
    content += '='.repeat(50) + '\n';
    
    climbs.forEach((climb, index) => {
        const formatted = this.climbAnalyzer.formatClimb(climb, index);
        content += `\n${formatted.name} (${formatted.category})\n`;
        content += '-'.repeat(30) + '\n';
        content += `Location: ${formatted.startKm} - ${formatted.endKm} km\n`;
        content += `Distance: ${formatted.distance}\n`;
        content += `Elevation Gain: ${formatted.elevation}\n`;
        content += `Average Gradient: ${formatted.avgGradient}\n`;
        content += `Maximum Gradient: ${formatted.maxGradient}\n`;
        content += `Difficulty Score: ${formatted.difficulty}\n`;
        content += `VAM: ${formatted.vam}\n`;
    });
    
    // Download file
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `climb-analysis-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
}

// CSS Styles for Climb Analysis UI
const climbAnalysisStyles = `
<style>
/* Climb Analysis Panel */
.climb-analysis {
    background: var(--card-bg);
    border-radius: 12px;
    padding: 20px;
}

.climb-summary {
    background: rgba(255,255,255,0.05);
    padding: 15px;
    border-radius: 8px;
    margin-bottom: 20px;
    text-align: center;
    font-size: 16px;
    font-weight: 500;
}

/* Statistics */
.climb-stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 15px;
    margin-bottom: 20px;
}

.stat-card {
    background: rgba(255,255,255,0.08);
    padding: 15px;
    border-radius: 8px;
    text-align: center;
}

.stat-number {
    font-size: 24px;
    font-weight: 600;
    color: var(--accent);
}

.stat-label {
    font-size: 12px;
    color: var(--text-secondary);
    margin-top: 5px;
}

.notable-climbs {
    margin-top: 20px;
}

.notable-climbs h5 {
    margin-bottom: 10px;
    color: var(--text-secondary);
}

.stat-item {
    display: flex;
    justify-content: space-between;
    padding: 8px 0;
    border-bottom: 1px solid rgba(255,255,255,0.1);
}

/* Category Chart */
.category-chart {
    margin: 20px 0;
}

.category-bar {
    margin-bottom: 10px;
}

.category-label {
    display: flex;
    align-items: center;
    margin-bottom: 5px;
}

.category-badge {
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 600;
    color: white;
    margin-right: 10px;
}

.category-count {
    margin-left: auto;
    font-weight: 600;
}

.category-bar-bg {
    height: 20px;
    background: rgba(255,255,255,0.1);
    border-radius: 10px;
    overflow: hidden;
}

.category-bar-fill {
    height: 100%;
    transition: width 0.3s ease;
}

/* Climb Cards */
.climb-list {
    margin-top: 20px;
}

.climb-card {
    background: rgba(255,255,255,0.05);
    border-radius: 8px;
    padding: 15px;
    margin-bottom: 15px;
    transition: all 0.2s;
}

.climb-card:hover {
    background: rgba(255,255,255,0.08);
}

.climb-header {
    display: flex;
    align-items: center;
    margin-bottom: 15px;
}

.climb-category {
    padding: 4px 10px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 600;
    color: white;
    margin-right: 10px;
}

.climb-name {
    flex: 1;
    font-weight: 600;
}

.climb-locate {
    background: none;
    border: none;
    font-size: 18px;
    cursor: pointer;
    opacity: 0.7;
}

.climb-locate:hover {
    opacity: 1;
}

.climb-metrics {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
    margin-bottom: 15px;
}

.metric {
    display: flex;
    justify-content: space-between;
    font-size: 13px;
}

.metric-label {
    color: var(--text-secondary);
}

.metric-value {
    font-weight: 600;
}

.climb-details {
    font-size: 13px;
    margin-bottom: 15px;
}

.detail-row {
    display: flex;
    align-items: center;
    margin-bottom: 8px;
    gap: 10px;
}

.difficulty-bar {
    flex: 1;
    height: 8px;
    background: rgba(255,255,255,0.1);
    border-radius: 4px;
    overflow: hidden;
}

.difficulty-fill {
    height: 100%;
    background: linear-gradient(90deg, #4CAF50 0%, #FF9800 50%, #F44336 100%);
    transition: width 0.3s ease;
}

/* Mini Profile */
.climb-profile-mini {
    border-top: 1px solid rgba(255,255,255,0.1);
    padding-top: 10px;
}

.climb-profile-svg {
    width: 100%;
    height: auto;
}

/* Climb Markers */
.climb-marker {
    background: none !important;
    border: none !important;
}

.climb-marker-content {
    padding: 4px 8px;
    border-radius: 4px;
    color: white;
    font-size: 12px;
    font-weight: 600;
    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    white-space: nowrap;
}

/* Climb Popup */
.climb-popup h4 {
    margin: 0 0 10px 0;
}

.climb-popup-stats {
    font-size: 13px;
    margin-bottom: 10px;
}

.climb-popup-stats div {
    margin-bottom: 3px;
}

.climb-popup-description {
    font-size: 12px;
    color: #666;
    font-style: italic;
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px solid #eee;
}

/* No climbs message */
.no-climbs {
    text-align: center;
    color: var(--text-secondary);
    padding: 40px 20px;
    font-style: italic;
}

/* Actions */
.climb-actions {
    display: flex;
    gap: 10px;
    margin-top: 20px;
}

.climb-actions button {
    flex: 1;
}

/* Mobile Responsive */
@media (max-width: 768px) {
    .climb-stats-grid {
        grid-template-columns: repeat(2, 1fr);
    }
    
    .climb-metrics {
        grid-template-columns: 1fr;
    }
    
    .climb-actions {
        flex-direction: column;
    }
}
</style>
`;

// HTML structure
const climbAnalysisHTML = `
<!-- Climb Analysis Panel -->
<div id="climbAnalysisPanel" class="stats-panel" style="display: none;">
    <!-- Content will be dynamically generated -->
</div>

<!-- Toggle in elevation section -->
<label class="checkbox-label">
    <input type="checkbox" id="analyzeClimbs" 
           onchange="routePlanner.toggleClimbAnalysis(this.checked)">
    <span>Analyze Climbs</span>
    <span class="info-icon" title="Detect and categorize climbs like pro cycling">ⓘ</span>
</label>
`;