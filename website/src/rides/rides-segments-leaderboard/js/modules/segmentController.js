// Segment Controller
import { mockSegmentsData, getMockNearbySegments, getMockUserSegments } from '../mockSegmentsData.js';

export function initSegmentCards() {
    // Initialize star buttons
    initStarButtons();
    
    // Initialize segment card clicks
    initSegmentCardClicks();
    
    // Initialize view toggle
    initViewToggle();
    
    // Load mock data into the page
    loadMockSegments();
}

function loadMockSegments() {
    // For now, just log that we're using mock data
    console.log('Loading mock segments data:', mockSegmentsData.length + ' segments');
}

function initStarButtons() {
    document.querySelectorAll('.star-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent card click
            toggleStar(btn);
        });
    });
}

function toggleStar(button) {
    const isStarred = button.classList.contains('active');
    const segmentCard = button.closest('.segment-card');
    
    if (isStarred) {
        button.classList.remove('active');
        button.querySelector('.star-icon').textContent = '☆';
        segmentCard?.classList.remove('starred');
    } else {
        button.classList.add('active');
        button.querySelector('.star-icon').textContent = '⭐';
        segmentCard?.classList.add('starred');
    }
    
    // Would make API call to update starred status
    console.log('Star toggled for segment');
}

function initSegmentCardClicks() {
    document.querySelectorAll('.segment-card').forEach(card => {
        card.addEventListener('click', (e) => {
            // Don't open if clicking on buttons
            if (e.target.closest('button')) return;
            
            const segmentId = card.dataset.segmentId;
            openSegmentDetail(segmentId);
        });
    });
}

function openSegmentDetail(segmentId) {
    const event = new CustomEvent('viewSegment', { detail: { segmentId } });
    window.dispatchEvent(event);
}

function initViewToggle() {
    const viewButtons = document.querySelectorAll('.view-btn');
    const segmentsGrid = document.getElementById('segmentsGrid');
    
    viewButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const view = btn.dataset.view;
            
            // Update active button
            viewButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Update grid class
            if (view === 'list') {
                segmentsGrid?.classList.add('list-view');
            } else {
                segmentsGrid?.classList.remove('list-view');
            }
        });
    });
}

// Listen for view segment events
window.addEventListener('viewSegment', (e) => {
    const { segmentId } = e.detail;
    showSegmentDetailModal(segmentId);
});

function showSegmentDetailModal(segmentId) {
    const modal = document.getElementById('segmentDetailModal');
    if (!modal) return;
    
    // Would fetch segment details and populate modal
    console.log('Opening segment detail for ID:', segmentId);
    
    // Show modal
    modal.classList.add('active');
    
    // Initialize detail map
    setTimeout(() => {
        initDetailMap(segmentId);
    }, 100);
}

function initDetailMap(segmentId) {
    const mapContainer = document.getElementById('detailMap');
    if (!mapContainer || mapContainer._leaflet_id) return;
    
    // Initialize detail map
    const detailMap = L.map('detailMap').setView([37.8324, -122.4990], 13);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18
    }).addTo(detailMap);
    
    // Add segment route
    const coords = [[37.8324, -122.4990], [37.8280, -122.4835]];
    L.polyline(coords, {
        color: '#ef4444',
        weight: 4,
        opacity: 0.8
    }).addTo(detailMap);
}

// Initialize action buttons
document.addEventListener('DOMContentLoaded', () => {
    // View details buttons
    document.querySelectorAll('.segment-actions .btn-secondary').forEach(btn => {
        if (btn.textContent.includes('View Details')) {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const card = btn.closest('.segment-card');
                const segmentId = card?.dataset.segmentId;
                if (segmentId) openSegmentDetail(segmentId);
            });
        }
    });
    
    // Compare/Set time buttons
    document.querySelectorAll('.segment-actions .btn-primary').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            console.log('Action button clicked:', btn.textContent);
        });
    });
});