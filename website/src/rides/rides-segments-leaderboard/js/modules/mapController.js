// Map Controller for Segments
let map;
let segmentMarkers = [];

export function initMap() {
    // Initialize the main segments map
    const mapContainer = document.getElementById('segmentsMap');
    if (!mapContainer) return;
    
    // Initialize Leaflet map
    map = L.map('segmentsMap').setView([37.7749, -122.4194], 11); // San Francisco
    
    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18
    }).addTo(map);
    
    // Add sample segments to map
    addSampleSegments();
    
    // Initialize map controls
    initMapControls();
}

function addSampleSegments() {
    const segments = [
        {
            id: 1,
            name: 'Hawk Hill Climb',
            type: 'climb',
            coords: [[37.8324, -122.4990], [37.8280, -122.4835]],
            color: '#ef4444'
        },
        {
            id: 2,
            name: 'Marina Sprint',
            type: 'sprint',
            coords: [[37.8090, -122.4383], [37.8045, -122.4475]],
            color: '#3b82f6'
        },
        {
            id: 3,
            name: 'Paradise Loop KOM',
            type: 'mixed',
            coords: [[37.8590, -122.4783], [37.8723, -122.5246]],
            color: '#8b5cf6'
        }
    ];
    
    segments.forEach(segment => {
        // Add polyline for segment
        const polyline = L.polyline(segment.coords, {
            color: segment.color,
            weight: 4,
            opacity: 0.8
        }).addTo(map);
        
        // Add start/end markers
        const startMarker = L.circleMarker(segment.coords[0], {
            radius: 6,
            fillColor: '#10b981',
            color: 'white',
            weight: 2,
            fillOpacity: 1
        }).addTo(map);
        
        const endMarker = L.circleMarker(segment.coords[segment.coords.length - 1], {
            radius: 6,
            fillColor: '#ef4444',
            color: 'white',
            weight: 2,
            fillOpacity: 1
        }).addTo(map);
        
        // Add popup
        polyline.bindPopup(`
            <div class="segment-popup">
                <h4>${segment.name}</h4>
                <p>Type: ${segment.type}</p>
                <button class="btn-small" onclick="viewSegmentDetail(${segment.id})">View Details</button>
            </div>
        `);
        
        segmentMarkers.push({ polyline, startMarker, endMarker, segment });
    });
}

function initMapControls() {
    // Heatmap toggle
    const heatmapBtn = document.getElementById('toggleHeatmapBtn');
    heatmapBtn?.addEventListener('click', () => {
        toggleHeatmap();
        updateControlButton(heatmapBtn);
    });
    
    // My segments toggle
    const mySegmentsBtn = document.getElementById('toggleMySegmentsBtn');
    mySegmentsBtn?.addEventListener('click', () => {
        toggleMySegments();
        updateControlButton(mySegmentsBtn);
    });
    
    // All segments toggle
    const allSegmentsBtn = document.getElementById('toggleAllSegmentsBtn');
    allSegmentsBtn?.addEventListener('click', () => {
        showAllSegments();
        updateControlButton(allSegmentsBtn);
    });
}

function updateControlButton(activeBtn) {
    document.querySelectorAll('.map-control-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    activeBtn.classList.add('active');
}

function toggleHeatmap() {
    console.log('Toggle heatmap view');
    // Implementation would show/hide heatmap layer
}

function toggleMySegments() {
    console.log('Toggle my segments');
    // Implementation would filter to show only user's segments
}

function showAllSegments() {
    console.log('Show all segments');
    // Implementation would show all segments
}

// Make viewSegmentDetail available globally
window.viewSegmentDetail = function(segmentId) {
    const event = new CustomEvent('viewSegment', { detail: { segmentId } });
    window.dispatchEvent(event);
};