// Route Planner State Management
class RoutePlanner {
    constructor() {
        this.map = null;
        this.routingControl = null;
        this.waypoints = [];
        this.pois = [];
        this.currentPOIMode = null;
        this.vehicleType = 'motorcycle'; // Default vehicle type
        this.currentRoute = null;
        this.elevationProfile = null;
        this.elevationChart = null;
        this.elevationData = [];
        this.preferences = {
            avoidHighways: false,
            avoidTolls: false,
            preferCurves: true,
            routeType: 'scenic',
            rideType: 'popular',
            elevationPref: 'any',
            surfacePref: 'any',
            manualMode: false
        };
        this.layers = {};
        this.overlays = {};
        this.distanceMarkers = [];
        this.surfaceOverlay = null;
        this.heatmapLayer = null;
        this.segmentsLayer = null;
        this.savedRoutes = [];
        this.waypointMode = false;
        this.elevationCache = new Map(); // Cache elevation data to reduce API calls
        this.updateWaypointListTimeout = null; // Debounce timer
        this.isUpdatingWaypointList = false; // Lock to prevent concurrent updates
    }

    async init() {
        console.log('RoutePlanner initialization starting...');
        this.initStarted = true;
        try {
            console.log('Step 1: Initializing map...');
            await this.initializeMap();
            console.log('✅ Map initialized successfully');
            
            console.log('Step 2: Setting up event listeners...');
            this.setupEventListeners();
            console.log('✅ Event listeners set up successfully');
            
            console.log('Step 2.5: Setting up map click events...');
            this.setupMapClickEvents();
            console.log('✅ Map click events set up successfully');
            
            // Initialize bicycle mode indicators
            if (this.vehicleType === 'bicycle') {
                document.querySelectorAll('.bike-only').forEach(el => el.style.display = 'inline');
            }
            
            console.log('Step 3: Loading user location...');
            this.loadUserLocation();
            console.log('✅ User location loading initiated');
            
            console.log('Step 4: Loading saved routes...');
            this.loadSavedRoutes();
            console.log('✅ Saved routes loading initiated');
            
            console.log('Step 5: Initializing POI handler...');
            await this.initializePOIHandler();
            console.log('✅ POI handler initialized');
            
            this.initCompleted = true;
            console.log('🎉 RoutePlanner initialization complete!');
            
            // Make sure it's accessible globally
            window.routePlanner = this;
            console.log('✅ RoutePlanner set as global variable');
            
        } catch (error) {
            console.error('❌ Error during RoutePlanner initialization:', error);
            console.error('Error stack:', error.stack);
            this.initError = error;
            throw error;
        }
    }

    async initializeMap() {
        console.log('Initializing map...');
        
        // Wait for DOM to be ready
        const mapContainer = document.getElementById('routeMap');
        if (!mapContainer) {
            console.error('Map container not found!');
            return;
        }
        
        console.log('Map container found:', mapContainer);
        
        try {
            // Initialize map with explicit height
            this.map = L.map('routeMap', {
                center: [39.8283, -98.5795],
                zoom: 5,
                zoomControl: true,
                scrollWheelZoom: true
            });
            
            console.log('Map initialized, adding tile layer...');
            
            // Add dark theme base layer
            this.layers.dark = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
                subdomains: 'abcd',
                maxZoom: 20
            }).addTo(this.map);
            
            // Store other layer options
            this.layers.street = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
                subdomains: 'abcd',
                maxZoom: 20
            });
            
            this.layers.satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
                attribution: 'Tiles &copy; Esri',
                maxZoom: 20
            });
            
            this.layers.terrain = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
                attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)',
                maxZoom: 17
            });
            
            console.log('✅ Map initialization complete');
            
            // Initialize routing control after map is set up
            await this.initializeRouting();
            
        } catch (error) {
            console.error('❌ Error initializing map:', error);
            throw error;
        }
    }

    async initializeRouting() {
        console.log('Initializing routing control...');
        
        try {
            // Import routing utilities
            const { setupRoutingControl, updateRouteWithElevation } = await import('./routing-utils.js');
            
            // Set up the routing control (await since it's now async)
            this.routingControl = await setupRoutingControl(this.map, this);
            
            console.log('✅ Routing control initialized');
        } catch (error) {
            console.error('Error initializing routing:', error);
        }
    }

    setupEventListeners() {
        // Import event handlers
        import('./event-handlers.js').then(module => {
            module.setupEventHandlers(this);
        });
    }

    setupMapClickEvents() {
        // Import map click handlers
        import('./map-click-handlers.js').then(module => {
            module.setupMapClickHandlers(this);
        });
    }

    loadUserLocation() {
        // Import location utilities
        import('./location-utils.js').then(module => {
            module.loadUserLocation(this);
        });
    }

    loadSavedRoutes() {
        // Import route management utilities
        import('./route-management.js').then(module => {
            module.loadSavedRoutes(this);
        });
    }
    
    async initializePOIHandler() {
        // Import and initialize POI handler
        const { initializePOIHandler } = await import('./poi-handler.js');
        this.poiHandler = initializePOIHandler(this);
    }

    // Export other methods that will be imported from utilities
    updateWaypointList() {
        import('./waypoint-utils.js').then(module => {
            module.updateWaypointList(this);
        });
    }

    calculateRoute() {
        // Simply delegate to updateRoute since they do the same thing
        this.updateRoute();
    }

    updateElevationProfile() {
        import('./elevation-utils.js').then(module => {
            module.updateElevationProfile(this);
        });
    }

    // Toggle waypoint mode
    toggleWaypointMode() {
        this.waypointMode = !this.waypointMode;
        const btn = document.getElementById('addWaypointMode');
        const mapDiv = document.getElementById('routeMap');
        
        if (this.waypointMode) {
            btn.classList.add('active');
            btn.querySelector('.waypoint-text').textContent = 'Click Map to Add Points';
            mapDiv.style.cursor = 'crosshair';
            this.showNotification('Click on the map to add waypoints', 'info');
        } else {
            btn.classList.remove('active');
            btn.querySelector('.waypoint-text').textContent = 'Click to Add Waypoints';
            mapDiv.style.cursor = '';
        }
    }

    // Add waypoint to the route
    addWaypoint(latlng) {
        console.log('Adding waypoint at:', latlng);
        
        // Create waypoint marker
        const waypointIndex = this.waypoints.length;
        const letter = String.fromCharCode(65 + waypointIndex); // A, B, C, etc.
        
        const marker = L.marker(latlng, {
            icon: L.divIcon({
                html: `${letter}`,
                className: 'waypoint-marker-custom',
                iconSize: [32, 32],
                iconAnchor: [16, 16]
            }),
            draggable: true
        }).addTo(this.map);
        
        // Add drag event
        marker.on('dragend', (e) => {
            this.updateRoute();
        });
        
        // Add right-click to remove
        marker.on('contextmenu', (e) => {
            this.removeWaypoint(waypointIndex);
            e.originalEvent.preventDefault();
        });
        
        // Store waypoint
        this.waypoints.push(marker);
        
        // Update waypoint list UI
        this.updateWaypointList();
        
        // Update route if we have at least 2 waypoints
        if (this.waypoints.length >= 2) {
            this.updateRoute();
        }
        
        // Exit waypoint mode after adding
        if (this.waypointMode) {
            this.toggleWaypointMode();
        }
    }

    // Remove waypoint
    removeWaypoint(index) {
        if (index >= 0 && index < this.waypoints.length) {
            // Remove marker from map
            this.map.removeLayer(this.waypoints[index]);
            
            // Remove from array
            this.waypoints.splice(index, 1);
            
            // Re-label remaining waypoints
            this.waypoints.forEach((marker, i) => {
                const letter = String.fromCharCode(65 + i);
                if (marker._icon) {
                    marker._icon.textContent = letter;
                }
            });
            
            // Update UI
            this.updateWaypointList();
            
            // Update route
            if (this.waypoints.length >= 2) {
                this.updateRoute();
            } else if (this.waypoints.length < 2) {
                this.clearRouteDisplay();
            }
        }
    }

    // Update route calculation
    updateRoute() {
        if (!this.routingControl || this.waypoints.length < 2) {
            console.log('Cannot update route:', {
                hasRoutingControl: !!this.routingControl,
                waypointCount: this.waypoints.length
            });
            return;
        }
        
        console.log('Updating route with waypoints:', this.waypoints.length);
        const waypoints = this.waypoints.map(marker => marker.getLatLng());
        console.log('Setting waypoints on routing control:', waypoints);
        this.routingControl.setWaypoints(waypoints);
    }

    // Clear route display
    clearRouteDisplay() {
        if (this.routingControl) {
            this.routingControl.setWaypoints([]);
        }
        // Clear any elevation profile, stats, etc.
    }

    // Clear all waypoints and route
    clearRoute() {
        // Remove all waypoint markers
        this.waypoints.forEach(marker => this.map.removeLayer(marker));
        this.waypoints = [];
        
        // Clear route
        this.clearRouteDisplay();
        
        // Update UI
        this.updateWaypointList();
        
        this.showNotification('Route cleared', 'success');
    }

    // Switch map style
    switchMapStyle(style) {
        // Remove all layers first
        Object.values(this.layers).forEach(layer => {
            if (this.map.hasLayer(layer)) {
                this.map.removeLayer(layer);
            }
        });
        
        // Add selected layer
        if (this.layers[style]) {
            this.layers[style].addTo(this.map);
        }
    }

    // Toggle overlay layers
    toggleLayer(layerName) {
        // Implementation depends on what overlays you want
        console.log(`Toggling layer: ${layerName}`);
    }

    // Show notification
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            background: var(--card-bg);
            border: 1px solid var(--accent);
            border-radius: 8px;
            padding: 12px 16px;
            color: var(--text-primary);
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            animation: slideIn 0.3s ease;
            max-width: 300px;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Auto remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    // Save route
    saveRoute() {
        if (this.waypoints.length < 2) {
            this.showNotification('Please add at least 2 waypoints to save a route', 'warning');
            return;
        }
        
        const routeName = prompt('Enter route name:');
        if (!routeName) return;
        
        const routeData = {
            id: Date.now().toString(),
            name: routeName,
            waypoints: this.waypoints.map(marker => marker.getLatLng()),
            vehicleType: this.vehicleType,
            preferences: { ...this.preferences },
            created: new Date().toISOString()
        };
        
        // Save to localStorage
        const savedRoutes = JSON.parse(localStorage.getItem('bikenode_routes') || '[]');
        savedRoutes.push(routeData);
        localStorage.setItem('bikenode_routes', JSON.stringify(savedRoutes));
        
        this.showNotification('Route saved successfully!', 'success');
        this.loadSavedRoutes(); // Refresh saved routes list
    }

    // Share route
    shareRoute() {
        if (this.waypoints.length < 2) {
            this.showNotification('Please create a route to share', 'warning');
            return;
        }
        
        const routeData = {
            waypoints: this.waypoints.map(marker => marker.getLatLng()),
            vehicleType: this.vehicleType
        };
        
        const routeUrl = `${window.location.origin}/route-planner?data=${encodeURIComponent(JSON.stringify(routeData))}`;
        
        if (navigator.share) {
            navigator.share({
                title: 'BikeNode Route',
                url: routeUrl
            });
        } else {
            navigator.clipboard.writeText(routeUrl);
            this.showNotification('Route URL copied to clipboard!', 'success');
        }
    }

    // Export route as GPX
    exportRoute() {
        if (this.waypoints.length < 2) {
            this.showNotification('Please create a route to export', 'warning');
            return;
        }
        
        const routeName = prompt('Enter route name:', 'BikeNode Route') || 'BikeNode Route';
        
        // Create simple GPX with waypoints
        let gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="BikeNode Route Planner">
  <metadata>
    <name>${routeName}</name>
    <time>${new Date().toISOString()}</time>
  </metadata>`;
        
        // Add waypoints
        this.waypoints.forEach((marker, index) => {
            const latlng = marker.getLatLng();
            const name = String.fromCharCode(65 + index);
            gpx += `
  <wpt lat="${latlng.lat}" lon="${latlng.lng}">
    <name>Waypoint ${name}</name>
  </wpt>`;
        });
        
        gpx += '\n</gpx>';
        
        // Download file
        const blob = new Blob([gpx], { type: 'application/gpx+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${routeName.replace(/[^a-z0-9]/gi, '_')}.gpx`;
        a.click();
        URL.revokeObjectURL(url);
        
        this.showNotification('Route exported as GPX', 'success');
    }

    // Set vehicle type
    setVehicleType(type) {
        this.vehicleType = type;
        
        // Update routing if we have waypoints
        if (this.waypoints.length >= 2) {
            this.updateRoute();
        }
    }

    // Handle map click
    handleMapClick(e) {
        if (this.waypointMode) {
            this.addWaypoint(e.latlng);
        }
    }

    // Handle right click
    handleRightClick(e) {
        // Handled in map-click-handlers.js
    }

    // Load a saved route
    loadRoute(routeId) {
        import('./route-management.js').then(module => {
            module.loadRoute(this, routeId);
        });
    }

    // Delete a saved route
    deleteRoute(routeId) {
        import('./route-management.js').then(module => {
            module.deleteRoute(this, routeId);
        });
    }
}

export default RoutePlanner;