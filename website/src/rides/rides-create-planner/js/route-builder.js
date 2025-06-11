// Mock Route Builder - NOT CONNECTED TO DATABASE
console.log('Route Builder: Using mock data, not connected to database');

// Initialize the route builder
document.addEventListener('DOMContentLoaded', function() {
    // Create a simple map placeholder
    const mapContainer = document.getElementById('map-container');
    if (!mapContainer) return;
    
    // Add map placeholder
    mapContainer.innerHTML = `
        <div class="map-placeholder">
            🗺️ Interactive Map (Mock Mode)
        </div>
        <div class="map-tools">
            <button class="tool-btn" title="Draw Route">✏️</button>
            <button class="tool-btn" title="Add Waypoint">📍</button>
            <button class="tool-btn" title="Clear Route">🗑️</button>
            <button class="tool-btn" title="Center Map">🎯</button>
        </div>
    `;
    
    // Handle route type buttons
    document.querySelectorAll('.route-type-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.route-type-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
    
    // Handle action buttons
    document.querySelector('.btn-primary').addEventListener('click', () => {
        const routeName = document.getElementById('routeName').value;
        if (!routeName) {
            alert('Please enter a route name');
            return;
        }
        
        // Mock save
        console.log('Mock: Creating route:', {
            name: routeName,
            description: document.getElementById('routeDescription').value,
            type: document.querySelector('.route-type-btn.active').textContent.trim(),
            // Mock data
            distance: 42.5,
            elevation: 1250,
            waypoints: []
        });
        
        alert('Route created successfully! (Mock mode - not saved to database)');
        window.location.href = '/routes-gallery/';
    });
    
    document.querySelector('.btn-secondary').addEventListener('click', () => {
        alert('Draft saved! (Mock mode - not saved to database)');
    });
    
    // Simulate adding waypoints
    let waypointCount = 0;
    mapContainer.addEventListener('click', (e) => {
        if (e.target.closest('.tool-btn')) return;
        
        waypointCount++;
        
        // Update stats with mock data
        document.querySelector('.stat-value').textContent = (waypointCount * 12.5).toFixed(1);
        document.querySelectorAll('.stat-value')[1].textContent = waypointCount * 315;
        
        // Update waypoint list
        const waypointList = document.querySelector('.waypoint-list');
        if (waypointCount === 1) {
            // Update start point
            document.querySelector('.waypoint-address').textContent = 'Mock Location ' + waypointCount;
        } else {
            // Add new waypoint
            const newWaypoint = document.createElement('div');
            newWaypoint.className = 'waypoint-item';
            newWaypoint.innerHTML = `
                <div class="waypoint-marker">${String.fromCharCode(65 + waypointCount - 1)}</div>
                <div class="waypoint-info">
                    <div class="waypoint-address">Mock Location ${waypointCount}</div>
                    <div class="waypoint-type">${waypointCount === 2 ? 'End' : 'Via Point'}</div>
                </div>
            `;
            waypointList.appendChild(newWaypoint);
        }
        
        // Update elevation profile
        if (waypointCount > 1) {
            document.querySelector('.elevation-profile').textContent = 
                `Mock elevation profile: ${waypointCount} waypoints`;
        }
    });
    
    // Handle tool buttons
    document.querySelectorAll('.tool-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const title = btn.getAttribute('title');
            console.log('Tool clicked:', title);
            
            if (title === 'Clear Route') {
                waypointCount = 0;
                document.querySelector('.stat-value').textContent = '0.0';
                document.querySelectorAll('.stat-value')[1].textContent = '0';
                document.querySelector('.waypoint-address').textContent = 'Click map to add start point';
                
                // Remove extra waypoints
                const waypoints = document.querySelectorAll('.waypoint-item');
                for (let i = 1; i < waypoints.length; i++) {
                    waypoints[i].remove();
                }
                
                document.querySelector('.elevation-profile').textContent = 'Elevation profile will appear here';
            }
        });
    });
});