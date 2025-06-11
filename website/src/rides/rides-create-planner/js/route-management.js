// Route management utilities

export function loadSavedRoutes(routePlanner) {
    const savedRoutes = JSON.parse(localStorage.getItem('bikenode_routes') || '[]');
    routePlanner.savedRoutes = savedRoutes;
    
    // Update UI to show saved routes
    const savedRoutesList = document.getElementById('savedRoutesList');
    if (savedRoutesList) {
        if (savedRoutes.length === 0) {
            savedRoutesList.innerHTML = '<p class="no-routes">No saved routes yet</p>';
        } else {
            savedRoutesList.innerHTML = savedRoutes.slice(0, 3).map(route => `
                <div class="saved-route-item" onclick="window.routePlanner.loadRoute('${route.id}')">
                    <div class="route-info">
                        <strong>${route.name}</strong>
                        <span class="route-meta">${route.waypoints.length} waypoints • ${new Date(route.created).toLocaleDateString()}</span>
                    </div>
                    <button class="btn-sm" onclick="event.stopPropagation(); window.routePlanner.deleteRoute('${route.id}')">×</button>
                </div>
            `).join('');
        }
    }
}

// Add method to RoutePlanner to load a saved route
export function loadRoute(routePlanner, routeId) {
    const savedRoutes = JSON.parse(localStorage.getItem('bikenode_routes') || '[]');
    const route = savedRoutes.find(r => r.id === routeId);
    
    if (route) {
        // Clear current route
        routePlanner.clearRoute();
        
        // Restore waypoints
        route.waypoints.forEach(latlng => {
            routePlanner.addWaypoint(L.latLng(latlng.lat, latlng.lng));
        });
        
        // Restore preferences
        if (route.preferences) {
            routePlanner.preferences = { ...routePlanner.preferences, ...route.preferences };
        }
        
        // Set vehicle type
        if (route.vehicleType) {
            routePlanner.setVehicleType(route.vehicleType);
        }
        
        // Fit map to bounds
        if (routePlanner.waypoints.length > 0) {
            const group = L.featureGroup(routePlanner.waypoints);
            routePlanner.map.fitBounds(group.getBounds().pad(0.1));
        }
        
        routePlanner.showNotification(`Loaded route: ${route.name}`, 'success');
    }
}

// Add method to delete a saved route
export function deleteRoute(routePlanner, routeId) {
    if (confirm('Delete this route?')) {
        let savedRoutes = JSON.parse(localStorage.getItem('bikenode_routes') || '[]');
        savedRoutes = savedRoutes.filter(r => r.id !== routeId);
        localStorage.setItem('bikenode_routes', JSON.stringify(savedRoutes));
        
        routePlanner.loadSavedRoutes();
        routePlanner.showNotification('Route deleted', 'success');
    }
}