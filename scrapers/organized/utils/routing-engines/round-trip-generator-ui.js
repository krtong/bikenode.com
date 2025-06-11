/**
 * Round-Trip Route Generator UI Integration
 * Adds round-trip generation controls to the route planner
 */

// Add to RoutePlanner class:

initRoundTripGenerator() {
    this.roundTripGenerator = new RoundTripGenerator(this);
    
    // Set up event listeners
    const generateBtn = document.getElementById('generateRoundTrip');
    if (generateBtn) {
        generateBtn.addEventListener('click', () => this.generateRoundTrip());
    }
    
    // Shape preview canvas
    this.initShapePreview();
}

async generateRoundTrip() {
    // Get form values
    const startPoint = this.getStartPoint();
    if (!startPoint) {
        this.showNotification('Please set a starting point first', 'warning');
        return;
    }
    
    const targetDistance = parseFloat(document.getElementById('targetDistance').value) * 1000; // Convert km to m
    const shape = document.querySelector('input[name="routeShape"]:checked').value;
    const direction = document.querySelector('input[name="routeDirection"]:checked').value;
    
    // Get preferences
    const preferences = {
        scenic: document.getElementById('preferScenic').checked,
        nature: document.getElementById('preferNature').checked,
        cultural: document.getElementById('preferCultural').checked,
        poi: document.getElementById('includePOIs').checked,
        elevation: document.querySelector('input[name="elevationPreference"]:checked').value
    };
    
    // Show loading state
    this.showRoundTripLoading();
    
    try {
        const options = {
            startPoint: startPoint,
            targetDistance: targetDistance,
            shape: shape,
            direction: direction,
            preferences: preferences,
            vehicleType: this.vehicleType
        };
        
        console.log('🔄 Generating round-trip with options:', options);
        
        // Generate the route
        const roundTripRoute = await this.roundTripGenerator.generateRoundTrip(options);
        
        // Display the route
        this.displayRoundTripRoute(roundTripRoute);
        
        // Store as current route
        this.currentRoute = roundTripRoute;
        
        // Update stats
        this.updateRouteStats(roundTripRoute);
        
        // Show success
        this.showNotification(
            `Generated ${(roundTripRoute.distance / 1000).toFixed(1)}km round-trip route`, 
            'success'
        );
        
    } catch (error) {
        console.error('Round-trip generation failed:', error);
        this.showNotification('Unable to generate round-trip route', 'error');
    } finally {
        this.hideRoundTripLoading();
    }
}

displayRoundTripRoute(route) {
    // Clear existing route
    if (this.routeLine) {
        this.map.removeLayer(this.routeLine);
    }
    
    // Display waypoints
    route.waypoints.forEach((waypoint, index) => {
        const marker = L.circleMarker([waypoint.lat, waypoint.lng], {
            radius: 8,
            fillColor: '#FF6B6B',
            fillOpacity: 0.8,
            color: '#fff',
            weight: 2
        }).bindPopup(`Waypoint ${index + 1}`);
        
        marker.addTo(this.map);
    });
    
    // For now, connect waypoints with straight lines (mock route)
    const coordinates = route.waypoints.map(wp => [wp.lat, wp.lng]);
    
    this.routeLine = L.polyline(coordinates, {
        color: '#5865F2',
        weight: 4,
        opacity: 0.8
    }).addTo(this.map);
    
    // Fit map to route
    this.map.fitBounds(this.routeLine.getBounds(), { padding: [50, 50] });
    
    // Show route details
    this.showRoundTripDetails(route);
}

showRoundTripDetails(route) {
    const detailsPanel = document.getElementById('roundTripDetails');
    if (!detailsPanel) return;
    
    const { metadata, instructions, pointsOfInterest } = route;
    
    let html = `
        <div class="round-trip-details">
            <h4>Round-Trip Route Details</h4>
            
            <div class="route-metadata">
                <div class="metadata-item">
                    <span class="label">Shape:</span>
                    <span class="value">${metadata.shape}</span>
                </div>
                <div class="metadata-item">
                    <span class="label">Target:</span>
                    <span class="value">${(metadata.targetDistance / 1000).toFixed(1)} km</span>
                </div>
                <div class="metadata-item">
                    <span class="label">Actual:</span>
                    <span class="value">${(metadata.actualDistance / 1000).toFixed(1)} km</span>
                </div>
                <div class="metadata-item">
                    <span class="label">Accuracy:</span>
                    <span class="value">${((1 - metadata.distanceError) * 100).toFixed(0)}%</span>
                </div>
            </div>
            
            ${instructions && instructions.length > 0 ? `
                <div class="route-instructions">
                    <h5>Route Instructions</h5>
                    <ol>
                        ${instructions.map(inst => `
                            <li>${inst.text} <span class="distance">${(inst.distance / 1000).toFixed(1)}km</span></li>
                        `).join('')}
                    </ol>
                </div>
            ` : ''}
            
            ${pointsOfInterest && pointsOfInterest.length > 0 ? `
                <div class="route-pois">
                    <h5>Points of Interest</h5>
                    <ul>
                        ${pointsOfInterest.map(poi => `
                            <li>${poi.name} - ${poi.type}</li>
                        `).join('')}
                    </ul>
                </div>
            ` : ''}
        </div>
    `;
    
    detailsPanel.innerHTML = html;
    detailsPanel.style.display = 'block';
}

initShapePreview() {
    const shapeInputs = document.querySelectorAll('input[name="routeShape"]');
    const canvas = document.getElementById('shapePreview');
    
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    shapeInputs.forEach(input => {
        input.addEventListener('change', () => {
            this.drawShapePreview(ctx, input.value);
        });
    });
    
    // Draw initial shape
    this.drawShapePreview(ctx, 'loop');
}

drawShapePreview(ctx, shape) {
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.3;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Style
    ctx.strokeStyle = '#5865F2';
    ctx.lineWidth = 3;
    ctx.fillStyle = '#5865F2';
    
    // Draw center point
    ctx.beginPath();
    ctx.arc(centerX, centerY, 5, 0, 2 * Math.PI);
    ctx.fill();
    
    // Draw shape
    ctx.beginPath();
    
    switch (shape) {
        case 'loop':
            ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
            break;
            
        case 'figure8':
            // Top loop
            ctx.arc(centerX, centerY - radius/2, radius/2, 0, 2 * Math.PI);
            ctx.moveTo(centerX + radius/2, centerY + radius/2);
            // Bottom loop
            ctx.arc(centerX, centerY + radius/2, radius/2, 0, 2 * Math.PI);
            break;
            
        case 'triangle':
            const angle1 = -Math.PI / 2;
            const angle2 = angle1 + (2 * Math.PI / 3);
            const angle3 = angle2 + (2 * Math.PI / 3);
            
            ctx.moveTo(
                centerX + radius * Math.cos(angle1),
                centerY + radius * Math.sin(angle1)
            );
            ctx.lineTo(
                centerX + radius * Math.cos(angle2),
                centerY + radius * Math.sin(angle2)
            );
            ctx.lineTo(
                centerX + radius * Math.cos(angle3),
                centerY + radius * Math.sin(angle3)
            );
            ctx.closePath();
            break;
            
        case 'random':
            // Draw question mark or random pattern
            ctx.font = '48px Arial';
            ctx.fillStyle = '#5865F2';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('?', centerX, centerY);
            return;
    }
    
    ctx.stroke();
    
    // Draw direction arrow
    this.drawDirectionArrow(ctx, shape, centerX, centerY, radius);
}

drawDirectionArrow(ctx, shape, centerX, centerY, radius) {
    const direction = document.querySelector('input[name="routeDirection"]:checked')?.value || 'any';
    
    if (direction === 'any') return;
    
    ctx.save();
    ctx.strokeStyle = '#FF6B6B';
    ctx.fillStyle = '#FF6B6B';
    ctx.lineWidth = 2;
    
    let arrowX, arrowY, arrowAngle;
    
    if (shape === 'loop') {
        arrowX = centerX + radius;
        arrowY = centerY;
        arrowAngle = direction === 'clockwise' ? Math.PI / 2 : -Math.PI / 2;
    } else if (shape === 'triangle') {
        arrowX = centerX;
        arrowY = centerY - radius;
        arrowAngle = direction === 'clockwise' ? Math.PI / 3 : -Math.PI / 3;
    } else {
        arrowX = centerX + radius * 0.7;
        arrowY = centerY;
        arrowAngle = direction === 'clockwise' ? Math.PI / 2 : -Math.PI / 2;
    }
    
    // Draw arrow
    ctx.translate(arrowX, arrowY);
    ctx.rotate(arrowAngle);
    
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-10, -5);
    ctx.lineTo(-10, 5);
    ctx.closePath();
    ctx.fill();
    
    ctx.restore();
}

getStartPoint() {
    // Get the first waypoint or marker
    if (this.waypoints && this.waypoints.length > 0) {
        const latlng = this.waypoints[0].getLatLng();
        return { lat: latlng.lat, lng: latlng.lng };
    }
    return null;
}

showRoundTripLoading() {
    const panel = document.getElementById('roundTripDetails');
    if (panel) {
        panel.innerHTML = '<div class="loading">Generating round-trip route...</div>';
        panel.style.display = 'block';
    }
}

hideRoundTripLoading() {
    // Loading will be replaced by results
}

// CSS Styles for Round-Trip Generator
const roundTripStyles = `
<style>
/* Round-Trip Generator Panel */
.round-trip-panel {
    background: var(--card-bg);
    border-radius: 12px;
    padding: 20px;
    margin-top: 20px;
}

.round-trip-controls {
    display: grid;
    gap: 20px;
}

.distance-input {
    display: flex;
    align-items: center;
    gap: 10px;
}

.distance-input input[type="number"] {
    width: 100px;
    padding: 8px;
    background: rgba(255,255,255,0.1);
    border: 1px solid rgba(255,255,255,0.2);
    border-radius: 6px;
    color: var(--text-primary);
}

.shape-selector {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
}

.shape-option {
    display: flex;
    align-items: center;
    padding: 10px;
    background: rgba(255,255,255,0.05);
    border: 2px solid transparent;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
}

.shape-option:hover {
    background: rgba(255,255,255,0.1);
}

.shape-option input[type="radio"] {
    margin-right: 8px;
}

.shape-option.selected {
    border-color: var(--accent);
    background: rgba(88, 101, 242, 0.1);
}

#shapePreview {
    width: 150px;
    height: 150px;
    background: rgba(255,255,255,0.05);
    border-radius: 8px;
    margin: 10px auto;
}

.direction-selector {
    display: flex;
    gap: 10px;
    justify-content: center;
}

.direction-option {
    padding: 8px 16px;
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
}

.direction-option:hover {
    background: rgba(255,255,255,0.1);
}

.direction-option input[type="radio"] {
    margin-right: 6px;
}

.preferences-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
}

.preference-item {
    display: flex;
    align-items: center;
    padding: 8px;
    background: rgba(255,255,255,0.05);
    border-radius: 6px;
}

.preference-item input[type="checkbox"] {
    margin-right: 8px;
}

.elevation-preference {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
}

.elevation-option {
    flex: 1;
    padding: 8px;
    text-align: center;
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 6px;
    cursor: pointer;
}

.elevation-option:hover {
    background: rgba(255,255,255,0.1);
}

/* Round-Trip Details */
.round-trip-details {
    background: rgba(255,255,255,0.05);
    border-radius: 8px;
    padding: 15px;
}

.route-metadata {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
    margin-bottom: 20px;
}

.metadata-item {
    display: flex;
    justify-content: space-between;
    padding: 8px;
    background: rgba(255,255,255,0.05);
    border-radius: 6px;
}

.metadata-item .label {
    color: var(--text-secondary);
    font-size: 13px;
}

.metadata-item .value {
    font-weight: 600;
}

.route-instructions {
    margin-top: 20px;
}

.route-instructions h5 {
    margin-bottom: 10px;
    color: var(--text-secondary);
}

.route-instructions ol {
    padding-left: 20px;
}

.route-instructions li {
    margin-bottom: 8px;
    font-size: 14px;
}

.route-instructions .distance {
    float: right;
    color: var(--text-secondary);
    font-size: 12px;
}

.route-pois {
    margin-top: 20px;
}

.route-pois ul {
    list-style: none;
    padding: 0;
}

.route-pois li {
    padding: 8px;
    background: rgba(255,255,255,0.05);
    border-radius: 6px;
    margin-bottom: 5px;
    font-size: 14px;
}

/* Loading state */
.loading {
    text-align: center;
    padding: 40px;
    color: var(--text-secondary);
}

/* Mobile responsive */
@media (max-width: 768px) {
    .shape-selector {
        grid-template-columns: 1fr;
    }
    
    .preferences-grid {
        grid-template-columns: 1fr;
    }
    
    .route-metadata {
        grid-template-columns: 1fr;
    }
}
</style>
`;

// HTML structure
const roundTripHTML = `
<!-- Round-Trip Generator Panel -->
<div class="round-trip-panel">
    <h3>🔄 Round-Trip Route Generator</h3>
    <p class="panel-description">Create a circular route that returns to your starting point</p>
    
    <div class="round-trip-controls">
        <!-- Target Distance -->
        <div class="control-group">
            <label>Target Distance</label>
            <div class="distance-input">
                <input type="number" id="targetDistance" value="30" min="1" max="500" step="1">
                <span>kilometers</span>
            </div>
        </div>
        
        <!-- Route Shape -->
        <div class="control-group">
            <label>Route Shape</label>
            <canvas id="shapePreview" width="150" height="150"></canvas>
            <div class="shape-selector">
                <label class="shape-option">
                    <input type="radio" name="routeShape" value="loop" checked>
                    <span>Simple Loop</span>
                </label>
                <label class="shape-option">
                    <input type="radio" name="routeShape" value="figure8">
                    <span>Figure 8</span>
                </label>
                <label class="shape-option">
                    <input type="radio" name="routeShape" value="triangle">
                    <span>Triangle</span>
                </label>
                <label class="shape-option">
                    <input type="radio" name="routeShape" value="random">
                    <span>Random</span>
                </label>
            </div>
        </div>
        
        <!-- Direction -->
        <div class="control-group">
            <label>Direction</label>
            <div class="direction-selector">
                <label class="direction-option">
                    <input type="radio" name="routeDirection" value="any" checked>
                    <span>Any</span>
                </label>
                <label class="direction-option">
                    <input type="radio" name="routeDirection" value="clockwise">
                    <span>Clockwise</span>
                </label>
                <label class="direction-option">
                    <input type="radio" name="routeDirection" value="counterclockwise">
                    <span>Counter-clockwise</span>
                </label>
            </div>
        </div>
        
        <!-- Preferences -->
        <div class="control-group">
            <label>Route Preferences</label>
            <div class="preferences-grid">
                <label class="preference-item">
                    <input type="checkbox" id="preferScenic" checked>
                    <span>Scenic routes</span>
                </label>
                <label class="preference-item">
                    <input type="checkbox" id="preferNature">
                    <span>Nature areas</span>
                </label>
                <label class="preference-item">
                    <input type="checkbox" id="preferCultural">
                    <span>Cultural sites</span>
                </label>
                <label class="preference-item">
                    <input type="checkbox" id="includePOIs">
                    <span>Include POIs</span>
                </label>
            </div>
        </div>
        
        <!-- Elevation Preference -->
        <div class="control-group">
            <label>Elevation Preference</label>
            <div class="elevation-preference">
                <label class="elevation-option">
                    <input type="radio" name="elevationPreference" value="any" checked>
                    <div>Any</div>
                </label>
                <label class="elevation-option">
                    <input type="radio" name="elevationPreference" value="flat">
                    <div>Flat</div>
                </label>
                <label class="elevation-option">
                    <input type="radio" name="elevationPreference" value="hilly">
                    <div>Hilly</div>
                </label>
            </div>
        </div>
        
        <!-- Generate Button -->
        <button id="generateRoundTrip" class="btn-primary">
            Generate Round-Trip Route
        </button>
    </div>
</div>

<!-- Round-Trip Details Panel -->
<div id="roundTripDetails" class="stats-panel" style="display: none;">
    <!-- Details will be populated here -->
</div>
`;