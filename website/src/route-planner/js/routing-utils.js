// Routing Utilities for Route Planner

export async function setupRoutingControl(map, routePlanner) {
    console.log('Setting up routing control...');
    
    // Start with standard OSRM router for now
    const router = L.Routing.osrmv1({
        serviceUrl: 'https://router.project-osrm.org/route/v1',
        profile: routePlanner.vehicleType === 'bicycle' ? 'bike' : 'driving'
    });
    
    const control = L.Routing.control({
        waypoints: [],
        router: router,
        createMarker: function(i, waypoint, n) {
            // Return null to prevent duplicate markers (we manage our own)
            return null;
        },
        lineOptions: {
            styles: [{ color: '#4F46E5', weight: 6, opacity: 0.8 }],
            addWaypoints: false
        },
        addWaypoints: false,
        routeWhileDragging: false,
        showAlternatives: false,
        show: false  // Hide the default control UI
    });

    control.on('routesfound', function(e) {
        const routes = e.routes;
        if (routes && routes[0]) {
            routePlanner.currentRoute = routes[0];
            updateRouteStats(routePlanner, routes[0]);
            updateRouteWithElevation(routePlanner, routes[0]);
        }
    });

    control.on('waypointschanged', function(e) {
        // Don't overwrite waypoints here - they're managed by RoutePlanner
        // This event fires when dragging waypoints, which is already handled
        console.log('Waypoints changed event fired');
    });

    control.on('routingerror', function(e) {
        console.error('Routing error:', e.error);
        routePlanner.showNotification('Failed to calculate route. Please try again.', 'error');
    });

    control.addTo(map);
    console.log('Routing control added to map');
    return control;
}

async function createRouter(routePlanner) {
    // Import routing engine manager
    const { createManagedRouter } = await import('./routing-engines.js');
    
    // Return the managed router that uses our routing engine system
    return createManagedRouter(routePlanner);
}

function updateRouteStats(routePlanner, route) {
    const distance = route.summary.totalDistance;
    const distanceMiles = (distance * 0.000621371).toFixed(1);
    
    document.getElementById('routeDistance').textContent = distanceMiles;
    
    // Update surface breakdown if available
    if (route.surfaceBreakdown) {
        updateSurfaceBreakdown(route.surfaceBreakdown);
    }
}

export async function updateRouteWithElevation(routePlanner, route) {
    if (!route || !route.coordinates || route.coordinates.length === 0) {
        console.log('No route to update elevation for');
        return;
    }

    try {
        // Sample points along the route for elevation
        const samplePoints = sampleRoutePoints(route.coordinates, 100); // Sample every 100 points
        
        // Fetch elevation data in batches
        const elevationData = await fetchElevationBatch(samplePoints);
        
        if (elevationData && elevationData.length > 0) {
            routePlanner.elevationData = elevationData;
            routePlanner.updateElevationProfile();
            
            // Calculate elevation stats
            const stats = calculateElevationStats(elevationData);
            updateElevationDisplay(stats);
        }
    } catch (error) {
        console.error('Error updating elevation:', error);
    }
}

function sampleRoutePoints(coordinates, interval) {
    const sampled = [];
    for (let i = 0; i < coordinates.length; i += interval) {
        sampled.push(coordinates[i]);
    }
    // Always include the last point
    if (sampled[sampled.length - 1] !== coordinates[coordinates.length - 1]) {
        sampled.push(coordinates[coordinates.length - 1]);
    }
    return sampled;
}

async function fetchElevationBatch(points, batchSize = 100) {
    const allElevations = [];
    
    for (let i = 0; i < points.length; i += batchSize) {
        const batch = points.slice(i, i + batchSize);
        const locations = batch.map(p => `${p.lat},${p.lng}`).join('|');
        
        try {
            const response = await fetch(`/api/elevation?locations=${encodeURIComponent(locations)}`);
            if (response.ok) {
                const data = await response.json();
                allElevations.push(...data.results);
            }
        } catch (error) {
            console.error('Error fetching elevation batch:', error);
        }
    }
    
    return allElevations;
}

function calculateElevationStats(elevationData) {
    let totalGain = 0;
    let totalLoss = 0;
    let maxElevation = -Infinity;
    let minElevation = Infinity;
    
    for (let i = 1; i < elevationData.length; i++) {
        const diff = elevationData[i].elevation - elevationData[i - 1].elevation;
        if (diff > 0) {
            totalGain += diff;
        } else {
            totalLoss += Math.abs(diff);
        }
        
        maxElevation = Math.max(maxElevation, elevationData[i].elevation);
        minElevation = Math.min(minElevation, elevationData[i].elevation);
    }
    
    return {
        totalGain: Math.round(totalGain * 3.28084), // Convert to feet
        totalLoss: Math.round(totalLoss * 3.28084),
        maxElevation: Math.round(maxElevation * 3.28084),
        minElevation: Math.round(minElevation * 3.28084)
    };
}

function updateElevationDisplay(stats) {
    document.getElementById('routeElevation').textContent = `${stats.totalGain.toLocaleString()} ft`;
    document.getElementById('elevationLost').textContent = `${stats.totalLoss.toLocaleString()} ft`;
    document.getElementById('elevationMax').textContent = `${stats.maxElevation.toLocaleString()} ft`;
    document.getElementById('elevationMin').textContent = `${stats.minElevation.toLocaleString()} ft`;
}

function updateSurfaceBreakdown(breakdown) {
    const total = breakdown.paved + breakdown.gravel + breakdown.dirt;
    if (total > 0) {
        document.getElementById('pavedPercent').textContent = `${Math.round(breakdown.paved / total * 100)}%`;
        document.getElementById('gravelPercent').textContent = `${Math.round(breakdown.gravel / total * 100)}%`;
        document.getElementById('dirtPercent').textContent = `${Math.round(breakdown.dirt / total * 100)}%`;
    }
}

export function calculateRoute(routePlanner) {
    console.log('calculateRoute called with', routePlanner.waypoints.length, 'waypoints');
    
    if (routePlanner.waypoints.length >= 2 && routePlanner.routingControl) {
        // Our waypoints are Leaflet markers, so get their LatLng
        const latLngs = routePlanner.waypoints.map(marker => marker.getLatLng());
        console.log('Setting waypoints on routing control:', latLngs);
        routePlanner.routingControl.setWaypoints(latLngs);
    }
}