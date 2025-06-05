// Route Builder JavaScript - Implements interactive route planning functionality

class RouteBuilder {
    constructor() {
        this.map = null;
        this.waypoints = [];
        this.routePath = [];
        this.markers = [];
        this.polyline = null;
        this.drawingMode = false;
        this.routeType = 'road';
        this.preferences = {
            prefer_bike_paths: true,
            avoid_highways: true,
            minimize_elevation: true,
            follow_popular: false
        };
        this.elevationChart = null;
        this.heatmapLayer = null;
        this.segmentsLayer = null;
        
        this.initializeMap();
        this.setupEventListeners();
    }

    initializeMap() {
        // Initialize map with Mapbox or Leaflet
        // For demo, we'll use Leaflet with OpenStreetMap
        this.map = L.map('map-container', {
            center: [37.7749, -122.4194], // San Francisco
            zoom: 13
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.map);

        // Add drawing controls
        this.setupDrawingControls();
        
        // Load heatmap data
        this.loadHeatmapData();
        
        // Load nearby segments
        this.loadNearbySegments();
    }

    setupDrawingControls() {
        // Custom drawing toolbar
        const drawControl = L.Control.extend({
            options: { position: 'topleft' },
            onAdd: (map) => {
                const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
                container.innerHTML = `
                    <a href="#" title="Draw Route" id="draw-route-btn">✏️</a>
                    <a href="#" title="Add Waypoint" id="add-waypoint-btn">📍</a>
                    <a href="#" title="Clear Route" id="clear-route-btn">🗑️</a>
                    <a href="#" title="Center Map" id="center-map-btn">🎯</a>
                `;
                return container;
            }
        });

        this.map.addControl(new drawControl());

        // Tool button handlers
        document.getElementById('draw-route-btn').addEventListener('click', (e) => {
            e.preventDefault();
            this.toggleDrawingMode();
        });

        document.getElementById('add-waypoint-btn').addEventListener('click', (e) => {
            e.preventDefault();
            this.enableWaypointMode();
        });

        document.getElementById('clear-route-btn').addEventListener('click', (e) => {
            e.preventDefault();
            this.clearRoute();
        });

        document.getElementById('center-map-btn').addEventListener('click', (e) => {
            e.preventDefault();
            this.centerMap();
        });
    }

    setupEventListeners() {
        // Route type selection
        document.querySelectorAll('.route-type-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.route-type-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.routeType = btn.textContent.toLowerCase().includes('road') ? 'road' :
                               btn.textContent.toLowerCase().includes('mtb') ? 'mtb' : 'gravel';
                this.recalculateRoute();
            });
        });

        // Preferences
        document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const prefName = e.target.parentElement.textContent.toLowerCase()
                    .replace(/\s+/g, '_')
                    .replace('prefer_bike_paths', 'prefer_bike_paths')
                    .replace('avoid_highways', 'avoid_highways')
                    .replace('minimize_elevation', 'minimize_elevation');
                
                if (this.preferences.hasOwnProperty(prefName)) {
                    this.preferences[prefName] = e.target.checked;
                    this.recalculateRoute();
                }
            });
        });

        // Save/Create buttons
        document.querySelector('.btn-secondary').addEventListener('click', () => this.saveDraft());
        document.querySelector('.btn-primary').addEventListener('click', () => this.createRoute());

        // Map click handler
        this.map.on('click', (e) => {
            if (this.drawingMode) {
                this.addWaypoint(e.latlng);
            }
        });
    }

    toggleDrawingMode() {
        this.drawingMode = !this.drawingMode;
        document.getElementById('draw-route-btn').style.background = 
            this.drawingMode ? '#5865f2' : '';
        
        if (this.drawingMode) {
            this.map.getContainer().style.cursor = 'crosshair';
        } else {
            this.map.getContainer().style.cursor = '';
        }
    }

    enableWaypointMode() {
        this.drawingMode = true;
        this.map.getContainer().style.cursor = 'crosshair';
    }

    addWaypoint(latlng) {
        const waypoint = {
            lat: latlng.lat,
            lng: latlng.lng,
            type: this.waypoints.length === 0 ? 'start' : 'waypoint',
            position: this.waypoints.length
        };

        // Add marker
        const marker = L.marker([waypoint.lat, waypoint.lng], {
            draggable: true,
            icon: this.createWaypointIcon(waypoint.position)
        }).addTo(this.map);

        marker.on('dragend', (e) => {
            const pos = e.target.getLatLng();
            this.waypoints[waypoint.position].lat = pos.lat;
            this.waypoints[waypoint.position].lng = pos.lng;
            this.recalculateRoute();
        });

        this.markers.push(marker);
        this.waypoints.push(waypoint);

        // Update UI
        this.updateWaypointsList();

        // Calculate route if we have at least 2 waypoints
        if (this.waypoints.length >= 2) {
            this.calculateRoute();
        }
    }

    createWaypointIcon(position) {
        const label = position === 0 ? 'A' : String.fromCharCode(65 + position);
        return L.divIcon({
            className: 'waypoint-marker',
            html: `<div style="background: #5865f2; color: white; width: 24px; height: 24px; 
                   border-radius: 50%; display: flex; align-items: center; justify-content: center; 
                   font-weight: bold; font-size: 12px;">${label}</div>`,
            iconSize: [24, 24],
            iconAnchor: [12, 12]
        });
    }

    async calculateRoute() {
        if (this.waypoints.length < 2) return;

        // Show loading state
        this.showLoading(true);

        try {
            const response = await fetch('/api/routes/calculate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    waypoints: this.waypoints,
                    route_type: this.routeType,
                    preferences: this.preferences
                })
            });

            if (!response.ok) throw new Error('Failed to calculate route');

            const route = await response.json();
            this.displayRoute(route);
            this.updateRouteStats(route);
            this.updateElevationProfile(route);

        } catch (error) {
            console.error('Error calculating route:', error);
            this.showError('Failed to calculate route. Please try again.');
        } finally {
            this.showLoading(false);
        }
    }

    displayRoute(route) {
        // Remove existing polyline
        if (this.polyline) {
            this.map.removeLayer(this.polyline);
        }

        // Convert path to Leaflet format
        const latlngs = route.path.map(point => [point[1], point[0]]);

        // Create new polyline
        this.polyline = L.polyline(latlngs, {
            color: '#5865f2',
            weight: 4,
            opacity: 0.8
        }).addTo(this.map);

        // Fit map to route bounds
        this.map.fitBounds(this.polyline.getBounds(), { padding: [50, 50] });

        // Store route path
        this.routePath = route.path;

        // Check surface types
        this.analyzeSurfaceTypes(route.path);
    }

    async analyzeSurfaceTypes(path) {
        try {
            const response = await fetch('/api/heatmap/surface-types', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path })
            });

            if (response.ok) {
                const surfaceData = await response.json();
                this.displaySurfaceTypes(surfaceData.surfaces);
            }
        } catch (error) {
            console.error('Error analyzing surface types:', error);
        }
    }

    displaySurfaceTypes(surfaces) {
        // Create surface type indicators on the route
        const surfaceInfo = document.createElement('div');
        surfaceInfo.className = 'surface-info';
        surfaceInfo.innerHTML = `
            <h4>Surface Types</h4>
            ${Object.entries(surfaces).map(([type, percentage]) => `
                <div class="surface-type">
                    <span>${type}:</span>
                    <div class="surface-bar">
                        <div class="surface-fill" style="width: ${percentage * 100}%"></div>
                    </div>
                    <span>${(percentage * 100).toFixed(1)}%</span>
                </div>
            `).join('')}
        `;

        // Add to route controls
        const routeControls = document.querySelector('.route-controls');
        const existing = routeControls.querySelector('.surface-info');
        if (existing) existing.remove();
        routeControls.insertBefore(surfaceInfo, routeControls.querySelector('.action-buttons'));
    }

    updateRouteStats(route) {
        // Update distance
        document.querySelector('.stat-value').textContent = 
            (route.distance / 1609.34).toFixed(1); // Convert to miles

        // Update elevation
        document.querySelectorAll('.stat-value')[1].textContent = 
            Math.round(route.elevation * 3.28084); // Convert to feet

        // Update estimated time
        if (route.stats && route.stats.estimated_time) {
            const hours = Math.floor(route.stats.estimated_time / 60);
            const minutes = route.stats.estimated_time % 60;
            const timeStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
            
            // Add estimated time display
            const timeDisplay = document.createElement('div');
            timeDisplay.className = 'stat-box';
            timeDisplay.innerHTML = `
                <div class="stat-value">${timeStr}</div>
                <div class="stat-label">Est. Time</div>
            `;
            
            const statsContainer = document.querySelector('.route-stats');
            if (statsContainer.children.length < 3) {
                statsContainer.appendChild(timeDisplay);
            }
        }
    }

    async updateElevationProfile(route) {
        try {
            const response = await fetch('/api/elevation/profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: route.path })
            });

            if (!response.ok) throw new Error('Failed to get elevation profile');

            const profile = await response.json();
            this.displayElevationChart(profile);

        } catch (error) {
            console.error('Error getting elevation profile:', error);
        }
    }

    displayElevationChart(profile) {
        const container = document.querySelector('.elevation-profile');
        container.innerHTML = '';

        // Create a simple SVG elevation chart
        const width = container.offsetWidth - 32;
        const height = 80;
        const points = profile.points;

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', width);
        svg.setAttribute('height', height);

        // Create path
        const pathData = points.map((point, index) => {
            const x = (index / (points.length - 1)) * width;
            const y = height - ((point.elevation - profile.min_elevation) / 
                     (profile.max_elevation - profile.min_elevation)) * (height - 10) - 5;
            return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
        }).join(' ');

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', pathData + ` L ${width} ${height} L 0 ${height} Z`);
        path.setAttribute('fill', 'rgba(88, 101, 242, 0.3)');
        path.setAttribute('stroke', '#5865f2');
        path.setAttribute('stroke-width', '2');

        svg.appendChild(path);
        container.appendChild(svg);

        // Add elevation stats
        const stats = document.createElement('div');
        stats.className = 'elevation-stats';
        stats.innerHTML = `
            <span>↑ ${Math.round(profile.total_gain * 3.28084)}ft</span>
            <span>↓ ${Math.round(profile.total_loss * 3.28084)}ft</span>
            <span>Max: ${Math.round(profile.max_elevation * 3.28084)}ft</span>
        `;
        container.appendChild(stats);
    }

    async loadHeatmapData() {
        try {
            const bounds = this.map.getBounds();
            const params = new URLSearchParams({
                min_lat: bounds.getSouth(),
                max_lat: bounds.getNorth(),
                min_lng: bounds.getWest(),
                max_lng: bounds.getEast(),
                type: this.routeType,
                period: 'month'
            });

            const response = await fetch(`/api/heatmap?${params}`);
            if (!response.ok) throw new Error('Failed to load heatmap');

            const heatmapData = await response.json();
            this.displayHeatmap(heatmapData);

        } catch (error) {
            console.error('Error loading heatmap:', error);
        }
    }

    displayHeatmap(data) {
        if (this.heatmapLayer) {
            this.map.removeLayer(this.heatmapLayer);
        }

        // Create heat layer
        const heatPoints = data.points.map(point => [
            point.lat, 
            point.lng, 
            point.weight / data.total_weight
        ]);

        this.heatmapLayer = L.heatLayer(heatPoints, {
            radius: 15,
            blur: 20,
            maxZoom: 15,
            gradient: {
                0.0: 'transparent',
                0.2: 'blue',
                0.4: 'cyan',
                0.6: 'lime',
                0.8: 'yellow',
                1.0: 'red'
            }
        }).addTo(this.map);

        // Add toggle for heatmap
        this.addHeatmapToggle();
    }

    addHeatmapToggle() {
        const control = L.Control.extend({
            options: { position: 'topright' },
            onAdd: (map) => {
                const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
                container.innerHTML = `
                    <label style="padding: 5px; display: block; background: white;">
                        <input type="checkbox" id="heatmap-toggle" checked>
                        Show Popular Routes
                    </label>
                `;
                return container;
            }
        });

        this.map.addControl(new control());

        document.getElementById('heatmap-toggle').addEventListener('change', (e) => {
            if (e.target.checked) {
                this.heatmapLayer.addTo(this.map);
            } else {
                this.map.removeLayer(this.heatmapLayer);
            }
        });
    }

    async loadNearbySegments() {
        try {
            const center = this.map.getCenter();
            const params = new URLSearchParams({
                lat: center.lat,
                lng: center.lng,
                radius: 10000 // 10km
            });

            const response = await fetch(`/api/segments/nearby?${params}`);
            if (!response.ok) throw new Error('Failed to load segments');

            const segments = await response.json();
            this.displaySegments(segments);

        } catch (error) {
            console.error('Error loading segments:', error);
        }
    }

    displaySegments(segments) {
        if (this.segmentsLayer) {
            this.map.removeLayer(this.segmentsLayer);
        }

        this.segmentsLayer = L.layerGroup();

        segments.forEach(segment => {
            // Add segment markers
            const icon = L.divIcon({
                className: 'segment-marker',
                html: `<div style="background: ${this.getSegmentColor(segment.category)}; 
                       color: white; padding: 2px 6px; border-radius: 4px; font-size: 11px;">
                       ${this.getSegmentIcon(segment.category)} ${segment.name}
                       </div>`,
                iconAnchor: [50, 10]
            });

            const marker = L.marker([segment.bounds.min_lat, segment.bounds.min_lng], { icon })
                .bindPopup(`
                    <strong>${segment.name}</strong><br>
                    ${segment.location}<br>
                    Distance: ${(segment.distance / 1609.34).toFixed(1)} mi<br>
                    Elevation: ${Math.round(segment.elevation * 3.28084)} ft<br>
                    Category: ${segment.category.toUpperCase()}<br>
                    <a href="/segments/${segment.id}" target="_blank">View Details</a>
                `);

            this.segmentsLayer.addLayer(marker);
        });

        this.segmentsLayer.addTo(this.map);
    }

    getSegmentColor(category) {
        const colors = {
            'hc': '#8B0000',
            'cat1': '#DC143C',
            'cat2': '#FF6347',
            'cat3': '#FFA500',
            'cat4': '#FFD700',
            'sprint': '#9370DB',
            'flat': '#32CD32'
        };
        return colors[category] || '#5865f2';
    }

    getSegmentIcon(category) {
        const icons = {
            'hc': '⛰️',
            'cat1': '🏔️',
            'cat2': '⛰️',
            'cat3': '🗻',
            'cat4': '⛰️',
            'sprint': '🏃',
            'flat': '➡️'
        };
        return icons[category] || '📍';
    }

    updateWaypointsList() {
        const waypointList = document.querySelector('.waypoint-list');
        const waypointsHTML = this.waypoints.map((wp, index) => `
            <div class="waypoint-item" data-index="${index}">
                <div class="waypoint-marker">${String.fromCharCode(65 + index)}</div>
                <div class="waypoint-info">
                    <div class="waypoint-address">${wp.address || 'Loading address...'}</div>
                    <div class="waypoint-type">${wp.type}</div>
                </div>
                <button class="remove-waypoint" data-index="${index}">×</button>
            </div>
        `).join('');

        waypointList.innerHTML = '<h3>Waypoints</h3>' + waypointsHTML;

        // Add remove handlers
        waypointList.querySelectorAll('.remove-waypoint').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                this.removeWaypoint(index);
            });
        });

        // Reverse geocode addresses
        this.waypoints.forEach((wp, index) => {
            if (!wp.address) {
                this.reverseGeocode(wp.lat, wp.lng, index);
            }
        });
    }

    async reverseGeocode(lat, lng, waypointIndex) {
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
            );
            const data = await response.json();
            
            if (data.display_name) {
                this.waypoints[waypointIndex].address = data.display_name.split(',')[0];
                this.updateWaypointsList();
            }
        } catch (error) {
            console.error('Error reverse geocoding:', error);
        }
    }

    removeWaypoint(index) {
        // Remove waypoint
        this.waypoints.splice(index, 1);
        
        // Remove marker
        this.map.removeLayer(this.markers[index]);
        this.markers.splice(index, 1);

        // Update positions
        this.waypoints.forEach((wp, i) => {
            wp.position = i;
            wp.type = i === 0 ? 'start' : 'waypoint';
        });

        // Update marker labels
        this.markers.forEach((marker, i) => {
            marker.setIcon(this.createWaypointIcon(i));
        });

        // Update UI and recalculate
        this.updateWaypointsList();
        if (this.waypoints.length >= 2) {
            this.calculateRoute();
        } else if (this.polyline) {
            this.map.removeLayer(this.polyline);
            this.polyline = null;
        }
    }

    clearRoute() {
        // Clear all waypoints
        this.waypoints = [];
        
        // Remove all markers
        this.markers.forEach(marker => this.map.removeLayer(marker));
        this.markers = [];

        // Remove polyline
        if (this.polyline) {
            this.map.removeLayer(this.polyline);
            this.polyline = null;
        }

        // Reset UI
        this.updateWaypointsList();
        document.querySelector('.stat-value').textContent = '0.0';
        document.querySelectorAll('.stat-value')[1].textContent = '0';
        document.querySelector('.elevation-profile').innerHTML = 'Elevation profile will appear here';
    }

    centerMap() {
        if (this.polyline) {
            this.map.fitBounds(this.polyline.getBounds(), { padding: [50, 50] });
        } else if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((position) => {
                this.map.setView([position.coords.latitude, position.coords.longitude], 13);
            });
        }
    }

    recalculateRoute() {
        if (this.waypoints.length >= 2) {
            this.calculateRoute();
        }
    }

    saveDraft() {
        const routeData = {
            name: document.getElementById('routeName').value || 'Untitled Route',
            description: document.getElementById('routeDescription').value,
            waypoints: this.waypoints,
            route_type: this.routeType,
            preferences: this.preferences
        };

        // Save to localStorage
        localStorage.setItem('routeDraft', JSON.stringify(routeData));
        this.showSuccess('Route saved as draft!');
    }

    async createRoute() {
        const name = document.getElementById('routeName').value;
        const description = document.getElementById('routeDescription').value;

        if (!name) {
            this.showError('Please enter a route name');
            return;
        }

        if (this.waypoints.length < 2) {
            this.showError('Please add at least 2 waypoints');
            return;
        }

        try {
            const response = await fetch('/api/routes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    description,
                    waypoints: this.waypoints,
                    path: this.routePath,
                    route_type: this.routeType,
                    preferences: this.preferences,
                    distance: parseFloat(document.querySelector('.stat-value').textContent) * 1609.34,
                    elevation: parseFloat(document.querySelectorAll('.stat-value')[1].textContent) / 3.28084
                })
            });

            if (!response.ok) throw new Error('Failed to create route');

            const route = await response.json();
            this.showSuccess('Route created successfully!');
            
            // Redirect to route details page
            setTimeout(() => {
                window.location.href = `/routes/${route.id}`;
            }, 1500);

        } catch (error) {
            console.error('Error creating route:', error);
            this.showError('Failed to create route. Please try again.');
        }
    }

    showLoading(show) {
        // Add loading indicator
        if (show) {
            document.body.classList.add('loading');
        } else {
            document.body.classList.remove('loading');
        }
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.classList.add('show');
        }, 10);

        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}

// Initialize route builder when page loads
document.addEventListener('DOMContentLoaded', () => {
    // Check if we're on the create-route page
    if (document.querySelector('.route-builder')) {
        // Load Leaflet and heat plugin
        const leafletCSS = document.createElement('link');
        leafletCSS.rel = 'stylesheet';
        leafletCSS.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(leafletCSS);

        const leafletJS = document.createElement('script');
        leafletJS.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        leafletJS.onload = () => {
            // Load heat plugin
            const heatJS = document.createElement('script');
            heatJS.src = 'https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js';
            heatJS.onload = () => {
                // Initialize route builder
                window.routeBuilder = new RouteBuilder();
            };
            document.head.appendChild(heatJS);
        };
        document.head.appendChild(leafletJS);
    }
});

// Add custom styles
const style = document.createElement('style');
style.textContent = `
    #map-container {
        width: 100%;
        height: 100%;
    }

    .notification {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 16px 24px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        transform: translateX(400px);
        transition: transform 0.3s ease;
        z-index: 10000;
    }

    .notification.show {
        transform: translateX(0);
    }

    .notification.success {
        background: #22c55e;
    }

    .notification.error {
        background: #ef4444;
    }

    .loading .map-container::after {
        content: 'Calculating route...';
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 16px 32px;
        border-radius: 8px;
        z-index: 1000;
    }

    .surface-info {
        margin: 20px 0;
        padding: 16px;
        background: rgba(255, 255, 255, 0.03);
        border-radius: 8px;
    }

    .surface-info h4 {
        margin: 0 0 12px 0;
        font-size: 14px;
        font-weight: 600;
    }

    .surface-type {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 8px;
        font-size: 13px;
    }

    .surface-bar {
        flex: 1;
        height: 8px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 4px;
        overflow: hidden;
    }

    .surface-fill {
        height: 100%;
        background: #5865f2;
        transition: width 0.3s ease;
    }

    .elevation-stats {
        display: flex;
        justify-content: space-around;
        margin-top: 12px;
        font-size: 12px;
        color: var(--text-secondary);
    }

    .remove-waypoint {
        background: none;
        border: none;
        color: var(--text-secondary);
        font-size: 20px;
        cursor: pointer;
        padding: 0 8px;
        transition: color 0.2s ease;
    }

    .remove-waypoint:hover {
        color: #ef4444;
    }

    .waypoint-item {
        position: relative;
    }
`;
document.head.appendChild(style);