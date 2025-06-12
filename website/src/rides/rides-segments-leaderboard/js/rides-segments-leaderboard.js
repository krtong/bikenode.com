// Rides Segments Leaderboard JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Initialize map
    let ridesSegmentsLeaderboardMap = null;
    let ridesSegmentsLeaderboardSegments = [];
    
    // Initialize Leaflet map
    function ridesSegmentsLeaderboardInitMap() {
        ridesSegmentsLeaderboardMap = L.map('rides-segments-leaderboard-map').setView([37.7749, -122.4194], 11);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(ridesSegmentsLeaderboardMap);
        
        // Load and display segments
        ridesSegmentsLeaderboardLoadSegments();
    }
    
    // Load segments (mock data)
    function ridesSegmentsLeaderboardLoadSegments() {
        // In a real app, this would fetch from API
        const mockSegments = [
            {id: 1, name: "Hawk Hill Climb", lat: 37.8324, lng: -122.4997, distance: 2.8, elevation: 184},
            {id: 2, name: "Paradise Loop Sprint", lat: 37.8554, lng: -122.4829, distance: 1.2, elevation: 12},
        ];
        
        mockSegments.forEach(segment => {
            L.marker([segment.lat, segment.lng])
                .addTo(ridesSegmentsLeaderboardMap)
                .bindPopup(`<b>${segment.name}</b><br>${segment.distance} km`);
        });
    }
    
    // Handle modal interactions
    const ridesSegmentsLeaderboardDetailModal = document.getElementById('rides-segments-leaderboard-detail-modal');
    const ridesSegmentsLeaderboardCreateModal = document.getElementById('rides-segments-leaderboard-create-modal');
    
    // Show segment details
    document.querySelectorAll('.rides-segments-leaderboard-segment-card').forEach(card => {
        card.addEventListener('click', function() {
            ridesSegmentsLeaderboardDetailModal.style.display = 'block';
        });
    });
    
    // Create segment button
    const createSegmentBtn = document.getElementById('rides-segments-leaderboard-create-segment');
    if (createSegmentBtn) {
        createSegmentBtn.addEventListener('click', function() {
            ridesSegmentsLeaderboardCreateModal.style.display = 'block';
        });
    }
    
    // Close modals
    document.querySelectorAll('.rides-segments-leaderboard-modal-close, .rides-segments-leaderboard-modal-overlay').forEach(el => {
        el.addEventListener('click', function() {
            ridesSegmentsLeaderboardDetailModal.style.display = 'none';
            ridesSegmentsLeaderboardCreateModal.style.display = 'none';
        });
    });
    
    // Initialize map
    ridesSegmentsLeaderboardInitMap();
});