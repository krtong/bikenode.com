// Event Handlers for Route Planner
import { setupRoutingEngineHandlers, initializeEngineStatus } from './routing-engine-handlers.js';
import { setupMTBHandlers } from './mtb-routing-handler.js';

export function setupEventHandlers(routePlanner) {
    // Initialize routing engine handlers
    setupRoutingEngineHandlers(routePlanner);
    initializeEngineStatus();
    
    // Initialize MTB-specific handlers
    setupMTBHandlers(routePlanner);
    // Vehicle Type Selector
    document.querySelectorAll('.route-type').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const type = e.target.dataset.type;
            routePlanner.setVehicleType(type);
            
            // Update active state
            document.querySelectorAll('.route-type').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
        });
    });

    // Start point input
    const startInput = document.getElementById('startPointInput');
    if (startInput) {
        startInput.addEventListener('keypress', async (e) => {
            if (e.key === 'Enter') {
                const address = e.target.value;
                if (address) {
                    try {
                        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`);
                        const results = await response.json();
                        if (results.length > 0) {
                            const latlng = L.latLng(results[0].lat, results[0].lon);
                            routePlanner.addWaypoint(latlng);
                            e.target.value = '';
                            routePlanner.map.setView(latlng, 13);
                        }
                    } catch (error) {
                        console.error('Error geocoding address:', error);
                    }
                }
            }
        });
    }

    // Use My Location button
    const locationBtn = document.getElementById('useMyLocation');
    if (locationBtn) {
        locationBtn.addEventListener('click', () => {
            // Check if we already have the user's location
            if (routePlanner.userLocation) {
                // Use the cached location
                routePlanner.addWaypoint(routePlanner.userLocation);
                routePlanner.map.setView(routePlanner.userLocation, 13);
                routePlanner.showNotification('Added waypoint at your location', 'success');
            } else if (navigator.geolocation) {
                // Get location if we don't have it cached
                locationBtn.disabled = true;
                locationBtn.textContent = '📍 Getting Location...';
                
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const latlng = L.latLng(position.coords.latitude, position.coords.longitude);
                        routePlanner.userLocation = latlng;
                        routePlanner.addWaypoint(latlng);
                        routePlanner.map.setView(latlng, 13);
                        routePlanner.showNotification('Added waypoint at your location', 'success');
                        
                        locationBtn.disabled = false;
                        locationBtn.textContent = '📍 Use My Location';
                    },
                    (error) => {
                        console.error('Error getting location:', error);
                        routePlanner.showNotification('Could not get your location', 'error');
                        
                        locationBtn.disabled = false;
                        locationBtn.textContent = '📍 Use My Location';
                    }
                );
            }
        });
    }

    // Waypoint Mode Toggle
    const waypointBtn = document.getElementById('addWaypointMode');
    if (waypointBtn) {
        waypointBtn.addEventListener('click', () => {
            // Check if toggleWaypointMode exists on routePlanner
            if (typeof routePlanner.toggleWaypointMode === 'function') {
                routePlanner.toggleWaypointMode();
            } else {
                // Fallback to inline implementation
                routePlanner.waypointMode = !routePlanner.waypointMode;
                const mapDiv = document.getElementById('routeMap');
                
                if (routePlanner.waypointMode) {
                    waypointBtn.classList.add('active');
                    waypointBtn.querySelector('.waypoint-text').textContent = 'Click Map to Add Points';
                    mapDiv.style.cursor = 'crosshair';
                    routePlanner.showNotification('Click on the map to add waypoints', 'info');
                } else {
                    waypointBtn.classList.remove('active');
                    waypointBtn.querySelector('.waypoint-text').textContent = 'Click to Add Waypoints';
                    mapDiv.style.cursor = '';
                }
            }
        });
    }

    // Map Style Selectors
    document.querySelectorAll('.map-style').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const style = e.target.dataset.style;
            routePlanner.switchMapStyle(style);
            
            // Update active state
            document.querySelectorAll('.map-style').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
        });
    });

    // Layer Toggles
    document.querySelectorAll('.layer-toggle').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const layer = e.target.dataset.layer;
            e.target.classList.toggle('active');
            routePlanner.toggleLayer(layer);
        });
    });

    // Display Options
    document.getElementById('showSurfaceType')?.addEventListener('change', (e) => {
        routePlanner.toggleSurfaceOverlay(e.target.checked);
    });

    document.getElementById('showDistanceMarkers')?.addEventListener('change', (e) => {
        routePlanner.toggleDistanceMarkers(e.target.checked);
    });

    document.getElementById('showHeatmaps')?.addEventListener('change', (e) => {
        routePlanner.toggleHeatmapLayer(e.target.checked);
    });

    document.getElementById('showSegments')?.addEventListener('change', (e) => {
        routePlanner.toggleSegmentsLayer(e.target.checked);
    });

    // Routing Preferences
    document.getElementById('rideType')?.addEventListener('change', (e) => {
        routePlanner.preferences.rideType = e.target.value;
        routePlanner.calculateRoute();
    });

    document.getElementById('elevationPref')?.addEventListener('change', (e) => {
        routePlanner.preferences.elevationPref = e.target.value;
        routePlanner.calculateRoute();
    });

    document.getElementById('surfacePref')?.addEventListener('change', (e) => {
        routePlanner.preferences.surfacePref = e.target.value;
        routePlanner.calculateRoute();
    });

    document.getElementById('avoidHighways')?.addEventListener('change', (e) => {
        routePlanner.preferences.avoidHighways = e.target.checked;
        routePlanner.calculateRoute();
    });

    document.getElementById('manualMode')?.addEventListener('change', (e) => {
        routePlanner.preferences.manualMode = e.target.checked;
        if (routePlanner.routingControl) {
            routePlanner.routingControl.options.addWaypoints = e.target.checked;
        }
    });

    // Route Actions
    document.getElementById('saveRoute')?.addEventListener('click', () => {
        routePlanner.saveRoute();
    });

    document.getElementById('shareRoute')?.addEventListener('click', () => {
        routePlanner.shareRoute();
    });

    document.getElementById('exportRoute')?.addEventListener('click', () => {
        routePlanner.exportRoute();
    });

    document.getElementById('clearRoute')?.addEventListener('click', () => {
        routePlanner.clearRoute();
    });

    document.getElementById('viewAllRoutes')?.addEventListener('click', () => {
        window.location.href = '/routes-gallery/';
    });
}

// Set Vehicle Type
export function setVehicleType(routePlanner, type) {
    routePlanner.vehicleType = type;
    
    // Update UI based on vehicle type
    if (type === 'bicycle') {
        // Show bicycle-specific options
        document.querySelectorAll('.bike-only').forEach(el => el.style.display = 'inline');
        
        // Update routing preferences
        document.getElementById('rideType').value = 'trails';
        document.getElementById('surfacePref').value = 'paved';
        
        // Adjust map layers
        routePlanner.toggleLayer('curves', false);
        routePlanner.toggleLayer('elevation', true);
    } else {
        // Hide bicycle-specific options
        document.querySelectorAll('.bike-only').forEach(el => el.style.display = 'none');
        
        // Reset to motorcycle defaults
        document.getElementById('rideType').value = 'popular';
        document.getElementById('surfacePref').value = 'any';
        
        // Adjust map layers
        routePlanner.toggleLayer('curves', true);
        routePlanner.toggleLayer('elevation', false);
    }
    
    // Recalculate route if exists
    if (routePlanner.waypoints.length >= 2) {
        routePlanner.calculateRoute();
    }
}