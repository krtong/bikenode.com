// Map Click Handlers for Route Planner

export function setupMapClickHandlers(routePlanner) {
    const map = routePlanner.map;
    
    console.log('Setting up map click handlers');
    
    // Left click handler
    map.on('click', (e) => {
        console.log('Map clicked, waypointMode:', routePlanner.waypointMode);
        if (routePlanner.waypointMode) {
            // Check if handleMapClick exists, otherwise handle inline
            if (typeof routePlanner.handleMapClick === 'function') {
                routePlanner.handleMapClick(e);
            } else {
                // Direct waypoint addition
                routePlanner.addWaypoint(e.latlng);
            }
        }
    });
    
    // Right click handler for context menu
    map.on('contextmenu', (e) => {
        if (typeof routePlanner.handleRightClick === 'function') {
            routePlanner.handleRightClick(e);
        } else {
            // Show context menu directly
            e.originalEvent.preventDefault();
            showContextMenu(routePlanner, e.latlng, e.containerPoint);
        }
    });
    
    // Close context menu on map click
    map.on('click contextmenu', () => {
        const existingMenu = document.querySelector('.context-menu');
        if (existingMenu) {
            existingMenu.remove();
        }
    });
}

export function handleMapClick(routePlanner, e) {
    const latlng = e.latlng;
    
    if (routePlanner.currentPOIMode) {
        // Add POI at clicked location
        addPOI(routePlanner, latlng, routePlanner.currentPOIMode);
    } else if (routePlanner.waypointMode) {
        // Add waypoint at clicked location
        routePlanner.addWaypoint(latlng);
    }
}

export function handleRightClick(routePlanner, e) {
    e.originalEvent.preventDefault();
    const latlng = e.latlng;
    const point = e.containerPoint;
    showContextMenu(routePlanner, latlng, point);
}

function showContextMenu(routePlanner, latlng, point) {
    // Remove any existing context menu
    const existingMenu = document.querySelector('.context-menu');
    if (existingMenu) {
        existingMenu.remove();
    }
    
    // Create context menu
    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.style.left = `${point.x}px`;
    menu.style.top = `${point.y}px`;
    
    const menuItems = [
        { text: 'Add Waypoint Here', action: () => routePlanner.addWaypoint(latlng) },
        { text: 'Center Map Here', action: () => routePlanner.map.setView(latlng) },
        { divider: true },
        { text: 'Add Gas Station', action: () => addPOI(routePlanner, latlng, 'gas') },
        { text: 'Add Restaurant', action: () => addPOI(routePlanner, latlng, 'food') },
        { text: 'Add Hotel', action: () => addPOI(routePlanner, latlng, 'hotel') },
        { text: 'Add Scenic Viewpoint', action: () => addPOI(routePlanner, latlng, 'scenic') }
    ];
    
    menuItems.forEach(item => {
        if (item.divider) {
            const divider = document.createElement('div');
            divider.className = 'context-menu-item divider';
            menu.appendChild(divider);
        } else {
            const menuItem = document.createElement('div');
            menuItem.className = 'context-menu-item';
            menuItem.textContent = item.text;
            menuItem.onclick = () => {
                item.action();
                menu.remove();
            };
            menu.appendChild(menuItem);
        }
    });
    
    document.querySelector('.map-container').appendChild(menu);
    
    // Remove menu after a delay or on next click
    setTimeout(() => {
        if (menu.parentNode) {
            menu.remove();
        }
    }, 5000);
}

function addPOI(routePlanner, latlng, type) {
    const poiIcons = {
        gas: '⛽',
        food: '🍔',
        hotel: '🏨',
        scenic: '📸'
    };
    
    const marker = L.marker(latlng, {
        icon: L.divIcon({
            className: 'poi-marker',
            html: poiIcons[type] || '📍',
            iconSize: [36, 36],
            iconAnchor: [18, 18]
        })
    });
    
    marker.addTo(routePlanner.map);
    routePlanner.pois.push({ marker, type, latlng });
    
    // Add popup with POI info
    marker.bindPopup(`
        <div style="min-width: 150px;">
            <strong>${type.charAt(0).toUpperCase() + type.slice(1)}</strong><br>
            <small>Right-click to remove</small>
        </div>
    `);
    
    // Right-click to remove POI
    marker.on('contextmenu', () => {
        marker.remove();
        routePlanner.pois = routePlanner.pois.filter(p => p.marker !== marker);
    });
}

export function toggleWaypointMode(routePlanner) {
    routePlanner.waypointMode = !routePlanner.waypointMode;
    const btn = document.getElementById('addWaypointMode');
    const mapDisplay = document.querySelector('.map-display');
    
    if (routePlanner.waypointMode) {
        btn.classList.add('active');
        btn.querySelector('.waypoint-text').textContent = 'Click Map to Add Points';
        mapDisplay.classList.add('waypoint-mode');
        
        // Update instruction text
        const instructionText = document.getElementById('instructionText');
        if (routePlanner.waypoints.length === 0) {
            instructionText.textContent = 'Click the map to add start point';
        } else {
            instructionText.textContent = 'Click the map to add waypoints';
        }
    } else {
        btn.classList.remove('active');
        btn.querySelector('.waypoint-text').textContent = 'Click to Add Waypoints';
        mapDisplay.classList.remove('waypoint-mode');
        
        // Reset instruction text
        document.getElementById('instructionText').textContent = 'Click the map or enter start point';
    }
}