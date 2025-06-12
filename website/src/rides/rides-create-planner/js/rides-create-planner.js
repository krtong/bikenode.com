// Rides Create Planner JavaScript
// Initialize the route planner when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM loaded, initializing RoutePlanner...');
    
    // Initialize Leaflet map
    const ridesCreatePlannerMap = L.map('rides-create-planner-map').setView([37.7749, -122.4194], 13);
    
    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(ridesCreatePlannerMap);
    
    // Initialize routing
    const ridesCreatePlannerRoutingControl = L.Routing.control({
        waypoints: [],
        routeWhileDragging: true,
        addWaypoints: true
    }).addTo(ridesCreatePlannerMap);
    
    // Handle route type selection
    document.querySelectorAll('.rides-create-planner-route-type').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.rides-create-planner-route-type').forEach(b => {
                b.classList.remove('rides-create-planner-route-type-active');
            });
            btn.classList.add('rides-create-planner-route-type-active');
        });
    });
});