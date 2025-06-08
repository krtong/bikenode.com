/**
 * Integration of Surface Analysis into Route Planner
 * This code should be added to the existing route-planner.njk
 */

// Add to RoutePlanner class methods:

async analyzeSurfaceTypes() {
    if (!this.currentRoute || !this.currentRoute.coordinates) {
        console.warn('No route available for surface analysis');
        return;
    }
    
    // Show loading indicator
    this.showSurfaceAnalysisLoading();
    
    try {
        // Initialize surface analyzer
        if (!this.surfaceAnalyzer) {
            this.surfaceAnalyzer = new RouteSurfaceAnalyzer();
        }
        
        // Analyze surfaces along route
        const analysis = await this.surfaceAnalyzer.analyzeRouteSurfaces(
            this.currentRoute.coordinates
        );
        
        // Store analysis results
        this.currentSurfaceAnalysis = analysis;
        
        // Update UI with results
        this.displaySurfaceAnalysis(analysis);
        
        // Update route visualization
        if (this.surfaceOverlayEnabled) {
            this.updateSurfaceOverlay(analysis.visualData);
        }
        
    } catch (error) {
        console.error('Surface analysis failed:', error);
        this.showNotification('Unable to analyze surface types', 'error');
    } finally {
        this.hideSurfaceAnalysisLoading();
    }
}

displaySurfaceAnalysis(analysis) {
    // Update surface statistics panel
    const statsPanel = document.getElementById('surfaceStatsPanel');
    if (!statsPanel) return;
    
    const { statistics, warnings, recommendations } = analysis;
    
    // Create surface breakdown chart
    const surfaceBreakdown = this.createSurfaceBreakdown(statistics.surfaces);
    
    // Create warnings display
    const warningsHtml = this.createWarningsDisplay(warnings);
    
    // Create recommendations display
    const recommendationsHtml = this.createRecommendationsDisplay(recommendations);
    
    statsPanel.innerHTML = `
        <div class="surface-analysis-results">
            <h3>Surface Analysis</h3>
            
            <div class="surface-breakdown">
                <h4>Surface Types</h4>
                ${surfaceBreakdown}
            </div>
            
            ${warnings.length > 0 ? `
                <div class="surface-warnings">
                    <h4>⚠️ Warnings</h4>
                    ${warningsHtml}
                </div>
            ` : ''}
            
            ${recommendations.length > 0 ? `
                <div class="surface-recommendations">
                    <h4>🚴 Recommendations</h4>
                    ${recommendationsHtml}
                </div>
            ` : ''}
            
            <div class="surface-actions">
                <button onclick="routePlanner.exportSurfaceReport()" class="btn-secondary">
                    Export Report
                </button>
                <button onclick="routePlanner.toggleSurfaceDetails()" class="btn-secondary">
                    View Details
                </button>
            </div>
        </div>
    `;
    
    // Show the panel
    statsPanel.style.display = 'block';
}

createSurfaceBreakdown(surfaces) {
    const sortedSurfaces = Object.entries(surfaces)
        .sort((a, b) => parseFloat(b[1].percentage) - parseFloat(a[1].percentage));
    
    let html = '<div class="surface-chart">';
    
    sortedSurfaces.forEach(([surface, data]) => {
        const color = this.surfaceAnalyzer.getSurfaceColor(surface);
        const formattedName = this.surfaceAnalyzer.formatSurfaceName(surface);
        
        html += `
            <div class="surface-bar-container">
                <div class="surface-label">
                    <span class="surface-color" style="background-color: ${color}"></span>
                    <span class="surface-name">${formattedName}</span>
                    <span class="surface-percentage">${data.percentage}%</span>
                </div>
                <div class="surface-bar">
                    <div class="surface-bar-fill" 
                         style="width: ${data.percentage}%; background-color: ${color}">
                    </div>
                </div>
                <div class="surface-distance">${this.formatDistance(data.distance)}</div>
            </div>
        `;
    });
    
    html += '</div>';
    return html;
}

createWarningsDisplay(warnings) {
    if (warnings.length === 0) return '';
    
    const groupedWarnings = warnings.reduce((acc, warning) => {
        acc[warning.severity] = acc[warning.severity] || [];
        acc[warning.severity].push(warning);
        return acc;
    }, {});
    
    let html = '<div class="warnings-list">';
    
    ['high', 'medium', 'low'].forEach(severity => {
        if (groupedWarnings[severity]) {
            groupedWarnings[severity].forEach(warning => {
                html += `
                    <div class="warning-item warning-${severity}">
                        <span class="warning-icon">⚠️</span>
                        <span class="warning-message">${warning.message}</span>
                    </div>
                `;
            });
        }
    });
    
    html += '</div>';
    return html;
}

createRecommendationsDisplay(recommendations) {
    if (recommendations.length === 0) return '';
    
    let html = '<div class="recommendations-list">';
    
    recommendations.forEach(rec => {
        if (rec.bikeType) {
            const icon = this.getBikeIcon(rec.bikeType);
            html += `
                <div class="recommendation-item">
                    <span class="recommendation-icon">${icon}</span>
                    <span class="recommendation-text">${rec.message}</span>
                    <div class="suitability-bar">
                        <div class="suitability-fill" style="width: ${rec.score}%"></div>
                    </div>
                </div>
            `;
        } else {
            html += `
                <div class="recommendation-item">
                    <span class="recommendation-icon">💡</span>
                    <span class="recommendation-text">${rec.message}</span>
                </div>
            `;
        }
    });
    
    html += '</div>';
    return html;
}

updateSurfaceOverlay(visualData) {
    // Remove existing surface overlay
    if (this.surfaceOverlay) {
        this.map.removeLayer(this.surfaceOverlay);
    }
    
    // Create multi-polyline for different surface types
    const polylines = [];
    
    visualData.forEach(segment => {
        const latLngs = segment.coordinates.map(coord => [coord.lat, coord.lng]);
        
        const polyline = L.polyline(latLngs, {
            color: segment.color,
            weight: 8,
            opacity: 0.7,
            className: `surface-overlay surface-${segment.surface}`
        });
        
        // Add popup with surface info
        polyline.bindPopup(segment.tooltip);
        
        polylines.push(polyline);
    });
    
    // Create layer group
    this.surfaceOverlay = L.layerGroup(polylines);
    this.surfaceOverlay.addTo(this.map);
}

// Add these CSS styles to route-planner.njk:
const surfaceAnalysisStyles = `
<style>
/* Surface Analysis Panel */
.surface-analysis-results {
    background: var(--card-bg);
    border-radius: 12px;
    padding: 20px;
    margin-top: 20px;
}

.surface-analysis-results h3 {
    margin-top: 0;
    color: var(--text-primary);
    font-size: 18px;
}

.surface-analysis-results h4 {
    color: var(--text-secondary);
    font-size: 14px;
    margin: 15px 0 10px 0;
}

/* Surface Chart */
.surface-chart {
    margin: 15px 0;
}

.surface-bar-container {
    margin-bottom: 12px;
}

.surface-label {
    display: flex;
    align-items: center;
    margin-bottom: 4px;
    font-size: 13px;
}

.surface-color {
    width: 16px;
    height: 16px;
    border-radius: 3px;
    margin-right: 8px;
    border: 1px solid rgba(255,255,255,0.2);
}

.surface-name {
    flex: 1;
    color: var(--text-primary);
}

.surface-percentage {
    color: var(--text-secondary);
    font-weight: 600;
}

.surface-bar {
    background: rgba(255,255,255,0.1);
    height: 20px;
    border-radius: 10px;
    overflow: hidden;
    margin-bottom: 2px;
}

.surface-bar-fill {
    height: 100%;
    transition: width 0.3s ease;
}

.surface-distance {
    font-size: 11px;
    color: var(--text-secondary);
    text-align: right;
}

/* Warnings */
.surface-warnings {
    background: rgba(255, 193, 7, 0.1);
    border: 1px solid rgba(255, 193, 7, 0.3);
    border-radius: 8px;
    padding: 15px;
    margin: 15px 0;
}

.warning-item {
    display: flex;
    align-items: center;
    padding: 8px;
    margin-bottom: 6px;
    border-radius: 6px;
    font-size: 13px;
}

.warning-high {
    background: rgba(220, 53, 69, 0.1);
    border: 1px solid rgba(220, 53, 69, 0.3);
}

.warning-medium {
    background: rgba(255, 193, 7, 0.1);
    border: 1px solid rgba(255, 193, 7, 0.3);
}

.warning-low {
    background: rgba(23, 162, 184, 0.1);
    border: 1px solid rgba(23, 162, 184, 0.3);
}

.warning-icon {
    margin-right: 8px;
    font-size: 16px;
}

/* Recommendations */
.surface-recommendations {
    background: rgba(40, 167, 69, 0.1);
    border: 1px solid rgba(40, 167, 69, 0.3);
    border-radius: 8px;
    padding: 15px;
    margin: 15px 0;
}

.recommendation-item {
    display: flex;
    align-items: center;
    padding: 8px;
    margin-bottom: 8px;
    font-size: 13px;
}

.recommendation-icon {
    margin-right: 8px;
    font-size: 20px;
}

.recommendation-text {
    flex: 1;
}

.suitability-bar {
    width: 60px;
    height: 8px;
    background: rgba(255,255,255,0.1);
    border-radius: 4px;
    overflow: hidden;
    margin-left: 10px;
}

.suitability-fill {
    height: 100%;
    background: var(--accent);
    transition: width 0.3s ease;
}

/* Surface Actions */
.surface-actions {
    display: flex;
    gap: 10px;
    margin-top: 20px;
}

.surface-actions button {
    flex: 1;
    padding: 8px 16px;
    font-size: 13px;
}

/* Loading State */
.surface-analysis-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 40px;
    color: var(--text-secondary);
}

.surface-analysis-loading::before {
    content: '';
    width: 24px;
    height: 24px;
    border: 3px solid rgba(255,255,255,0.1);
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-right: 12px;
}

/* Surface Overlay on Map */
.surface-overlay {
    cursor: pointer;
}

.surface-overlay:hover {
    opacity: 1 !important;
}

/* Animations */
@keyframes spin {
    to { transform: rotate(360deg); }
}

/* Mobile Responsive */
@media (max-width: 768px) {
    .surface-analysis-results {
        padding: 15px;
    }
    
    .surface-actions {
        flex-direction: column;
    }
    
    .surface-actions button {
        width: 100%;
    }
}
</style>
`;

// Add to HTML structure in route-planner.njk:
const surfaceAnalysisHTML = `
<!-- Surface Analysis Panel -->
<div id="surfaceStatsPanel" class="stats-panel" style="display: none;">
    <div class="surface-analysis-loading">
        Analyzing surface types along route...
    </div>
</div>

<!-- Surface Analysis Toggle in Display Options -->
<label class="checkbox-label">
    <input type="checkbox" id="enableSurfaceAnalysis" 
           onchange="routePlanner.toggleSurfaceAnalysis(this.checked)">
    <span>Analyze Surface Types</span>
    <span class="info-icon" title="Query real OSM data for surface information">ⓘ</span>
</label>
`;

// Helper methods
showSurfaceAnalysisLoading() {
    const panel = document.getElementById('surfaceStatsPanel');
    if (panel) {
        panel.innerHTML = '<div class="surface-analysis-loading">Analyzing surface types along route...</div>';
        panel.style.display = 'block';
    }
}

hideSurfaceAnalysisLoading() {
    // Content will be replaced by results
}

toggleSurfaceAnalysis(enabled) {
    if (enabled && this.currentRoute) {
        this.analyzeSurfaceTypes();
    } else {
        const panel = document.getElementById('surfaceStatsPanel');
        if (panel) panel.style.display = 'none';
    }
}

getBikeIcon(bikeType) {
    const icons = {
        roadBike: '🚴',
        gravelBike: '🚵',
        mountainBike: '🚵‍♂️',
        hybridBike: '🚲'
    };
    return icons[bikeType] || '🚴';
}

formatDistance(meters) {
    if (meters < 1000) {
        return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
}

exportSurfaceReport() {
    if (!this.currentSurfaceAnalysis) return;
    
    const report = this.generateSurfaceReport(this.currentSurfaceAnalysis);
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `surface-analysis-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
}

generateSurfaceReport(analysis) {
    const { statistics, warnings, recommendations } = analysis;
    
    let report = 'ROUTE SURFACE ANALYSIS REPORT\n';
    report += '=' .repeat(50) + '\n\n';
    report += `Generated: ${new Date().toLocaleString()}\n`;
    report += `Total Distance: ${this.formatDistance(statistics.totalDistance)}\n\n`;
    
    report += 'SURFACE BREAKDOWN:\n';
    report += '-'.repeat(30) + '\n';
    Object.entries(statistics.surfaces).forEach(([surface, data]) => {
        const name = this.surfaceAnalyzer.formatSurfaceName(surface);
        report += `${name.padEnd(20)} ${data.percentage.padStart(6)}% (${this.formatDistance(data.distance)})\n`;
    });
    
    if (warnings.length > 0) {
        report += '\n\nWARNINGS:\n';
        report += '-'.repeat(30) + '\n';
        warnings.forEach(warning => {
            report += `[${warning.severity.toUpperCase()}] ${warning.message}\n`;
        });
    }
    
    if (recommendations.length > 0) {
        report += '\n\nRECOMMENDATIONS:\n';
        report += '-'.repeat(30) + '\n';
        recommendations.forEach(rec => {
            report += `• ${rec.message}\n`;
        });
    }
    
    return report;
}