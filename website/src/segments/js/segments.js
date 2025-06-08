// Segments page functionality

class SegmentsManager {
    constructor() {
        this.segments = [];
        this.map = null;
        this.filters = {
            distance: 16093, // 10 miles in meters
            type: 'all',
            starred: false,
            hasAttempts: false
        };
        this.userLocation = null;
        
        this.init();
    }

    async init() {
        // Get user location
        await this.getUserLocation();
        
        // Initialize map
        this.initializeMap();
        
        // Load segments
        await this.loadSegments();
        
        // Setup event listeners
        this.setupEventListeners();
    }

    async getUserLocation() {
        return new Promise((resolve) => {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        this.userLocation = {
                            lat: position.coords.latitude,
                            lng: position.coords.longitude
                        };
                        resolve();
                    },
                    () => {
                        // Default to San Francisco if geolocation fails
                        this.userLocation = { lat: 37.7749, lng: -122.4194 };
                        resolve();
                    }
                );
            } else {
                this.userLocation = { lat: 37.7749, lng: -122.4194 };
                resolve();
            }
        });
    }

    initializeMap() {
        // Initialize Leaflet map
        this.map = L.map('segments-map', {
            center: [this.userLocation.lat, this.userLocation.lng],
            zoom: 12
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.map);

        // Add user location marker
        L.marker([this.userLocation.lat, this.userLocation.lng], {
            icon: L.divIcon({
                className: 'user-location',
                html: '<div style="background: #5865f2; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.4);"></div>',
                iconSize: [16, 16],
                iconAnchor: [8, 8]
            })
        }).addTo(this.map);
    }

    async loadSegments() {
        try {
            const params = new URLSearchParams({
                lat: this.userLocation.lat,
                lng: this.userLocation.lng,
                radius: this.filters.distance
            });

            if (this.filters.type !== 'all') {
                params.append('type', this.filters.type);
            }

            const response = await fetch(`/api/segments/nearby?${params}`);
            if (!response.ok) throw new Error('Failed to load segments');

            this.segments = await response.json();
            
            // Load leaderboards for each segment
            await this.loadLeaderboards();
            
            // Display segments on map and list
            this.displaySegments();
            this.displaySegmentsList();

        } catch (error) {
            console.error('Error loading segments:', error);
            // Use mock data for demo
            this.loadMockSegments();
        }
    }

    loadMockSegments() {
        // Mock segments data for demonstration
        this.segments = [
            {
                id: '1',
                name: 'Hawk Hill Climb',
                location: 'Mill Valley, CA',
                category: 'cat2',
                distance: 3380,
                elevation: 200,
                avg_grade: 6.2,
                stats: {
                    total_attempts: 12847,
                    popularity_score: 95
                },
                bounds: {
                    min_lat: this.userLocation.lat - 0.01,
                    max_lat: this.userLocation.lat + 0.01,
                    min_lng: this.userLocation.lng - 0.015,
                    max_lng: this.userLocation.lng - 0.005
                },
                leaderboard: [
                    { rank: 1, user_name: 'Mike Rodriguez', time: 443, user_id: '1' },
                    { rank: 2, user_name: 'Sarah Chen', time: 461, user_id: '2' },
                    { rank: 3, user_name: 'Tom Davies', time: 472, user_id: '3' }
                ]
            },
            {
                id: '2',
                name: 'Marina Sprint',
                location: 'San Francisco, CA',
                category: 'sprint',
                distance: 1287,
                elevation: 3.6,
                avg_grade: 0.3,
                stats: {
                    total_attempts: 8234,
                    popularity_score: 82
                },
                bounds: {
                    min_lat: this.userLocation.lat - 0.005,
                    max_lat: this.userLocation.lat,
                    min_lng: this.userLocation.lng + 0.01,
                    max_lng: this.userLocation.lng + 0.02
                },
                leaderboard: [
                    { rank: 1, user_name: 'Jake Wilson', time: 92, user_id: '4' },
                    { rank: 2, user_name: 'Emma Foster', time: 94, user_id: '5' },
                    { rank: 3, user_name: 'Ryan Lee', time: 95, user_id: '6' }
                ]
            }
        ];

        this.displaySegments();
        this.displaySegmentsList();
    }

    async loadLeaderboards() {
        // Load top 3 leaderboard entries for each segment
        const leaderboardPromises = this.segments.map(async (segment) => {
            try {
                const response = await fetch(`/api/segments/${segment.id}/leaderboard?limit=3`);
                if (response.ok) {
                    segment.leaderboard = await response.json();
                }
            } catch (error) {
                console.error(`Error loading leaderboard for segment ${segment.id}:`, error);
            }
        });

        await Promise.all(leaderboardPromises);
    }

    displaySegments() {
        // Clear existing markers
        if (this.segmentMarkers) {
            this.segmentMarkers.forEach(marker => this.map.removeLayer(marker));
        }
        this.segmentMarkers = [];

        // Add segment markers to map
        this.segments.forEach(segment => {
            const bounds = segment.bounds;
            const center = [
                (bounds.min_lat + bounds.max_lat) / 2,
                (bounds.min_lng + bounds.max_lng) / 2
            ];

            // Create segment polyline (simplified)
            const polyline = L.polyline([
                [bounds.min_lat, bounds.min_lng],
                [bounds.max_lat, bounds.max_lng]
            ], {
                color: this.getSegmentColor(segment.category),
                weight: 4,
                opacity: 0.7
            }).addTo(this.map);

            // Add segment label
            const icon = L.divIcon({
                className: 'segment-map-marker',
                html: `<div style="background: ${this.getSegmentColor(segment.category)}; 
                       color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; 
                       white-space: nowrap; font-weight: bold;">
                       ${this.getSegmentIcon(segment.category)} ${segment.name}
                       </div>`,
                iconAnchor: [50, 10]
            });

            const marker = L.marker(center, { icon })
                .bindPopup(this.createSegmentPopup(segment))
                .on('click', () => this.highlightSegment(segment.id));

            this.segmentMarkers.push(marker);
            this.segmentMarkers.push(polyline);
            marker.addTo(this.map);
        });

        // Fit map to show all segments
        if (this.segments.length > 0) {
            const group = L.featureGroup(this.segmentMarkers);
            this.map.fitBounds(group.getBounds().pad(0.1));
        }
    }

    displaySegmentsList() {
        const container = document.querySelector('.segments-grid');
        container.innerHTML = '';

        const filteredSegments = this.filterSegments();

        filteredSegments.forEach(segment => {
            const card = this.createSegmentCard(segment);
            container.appendChild(card);
        });

        // Update count
        this.updateSegmentCount(filteredSegments.length);
    }

    filterSegments() {
        return this.segments.filter(segment => {
            if (this.filters.starred && !this.isSegmentStarred(segment.id)) {
                return false;
            }
            if (this.filters.hasAttempts && !this.hasUserAttempt(segment.id)) {
                return false;
            }
            return true;
        });
    }

    createSegmentCard(segment) {
        const card = document.createElement('div');
        card.className = 'segment-card';
        if (this.isSegmentStarred(segment.id)) {
            card.classList.add('starred-segment');
        }
        
        card.innerHTML = `
            <div class="segment-info">
                <div class="segment-map" id="mini-map-${segment.id}">
                    <canvas width="120" height="80"></canvas>
                </div>
                <div class="segment-details">
                    <h3 class="segment-name">${segment.name}</h3>
                    <p class="segment-location">${segment.location} • ${this.formatCategory(segment.category)}</p>
                    
                    <div class="segment-stats">
                        <div class="segment-stat">
                            <span class="segment-stat-value">${this.formatDistance(segment.distance)}</span>
                            <span class="segment-stat-label">Distance</span>
                        </div>
                        <div class="segment-stat">
                            <span class="segment-stat-value">${this.formatElevation(segment.elevation)}</span>
                            <span class="segment-stat-label">Elevation</span>
                        </div>
                        <div class="segment-stat">
                            <span class="segment-stat-value">${segment.avg_grade.toFixed(1)}%</span>
                            <span class="segment-stat-label">Avg Grade</span>
                        </div>
                        <div class="segment-stat">
                            <span class="segment-stat-value">${segment.stats.total_attempts.toLocaleString()}</span>
                            <span class="segment-stat-label">Attempts</span>
                        </div>
                    </div>
                    
                    <div class="segment-actions">
                        <button class="star-btn ${this.isSegmentStarred(segment.id) ? 'starred' : ''}" 
                                data-segment-id="${segment.id}">
                            <span>${this.isSegmentStarred(segment.id) ? '⭐' : '☆'}</span> 
                            ${this.isSegmentStarred(segment.id) ? 'Starred' : 'Star'}
                        </button>
                        <button class="btn-secondary" onclick="window.location.href='/segment-details/${segment.id}'">
                            View Full Leaderboard
                        </button>
                    </div>
                </div>
            </div>
            
            <div class="segment-leaderboard">
                <div class="leaderboard-header">Top Performances</div>
                ${this.createLeaderboardHTML(segment)}
            </div>
        `;

        // Draw mini map
        setTimeout(() => this.drawMiniMap(segment), 100);

        // Add event listeners
        card.querySelector('.star-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleStar(segment.id);
        });

        card.addEventListener('click', (e) => {
            if (!e.target.closest('button')) {
                this.showSegmentDetails(segment.id);
            }
        });

        return card;
    }

    createLeaderboardHTML(segment) {
        const userAttempt = this.getUserAttempt(segment.id);
        let leaderboardHTML = '';

        // Show top 3
        if (segment.leaderboard && segment.leaderboard.length > 0) {
            segment.leaderboard.slice(0, 3).forEach(entry => {
                leaderboardHTML += `
                    <div class="leaderboard-entry">
                        <span class="leaderboard-position ${this.getRankClass(entry.rank)}">${entry.rank}</span>
                        <div class="leaderboard-avatar">${this.getInitials(entry.user_name)}</div>
                        <span class="leaderboard-name">${entry.user_name}</span>
                        <span class="leaderboard-time">${this.formatTime(entry.time)}</span>
                    </div>
                `;
            });
        }

        // Add user attempt
        if (userAttempt) {
            leaderboardHTML += `
                <div class="leaderboard-entry your-attempt">
                    <span class="leaderboard-position">${userAttempt.rank}</span>
                    <div class="leaderboard-avatar">👤</div>
                    <span class="leaderboard-name">You</span>
                    <span class="leaderboard-time">${this.formatTime(userAttempt.time)}</span>
                </div>
            `;
        } else {
            leaderboardHTML += `
                <div class="leaderboard-entry">
                    <span class="leaderboard-position">-</span>
                    <div class="leaderboard-avatar">👤</div>
                    <span class="leaderboard-name">You</span>
                    <span class="leaderboard-time">No attempt</span>
                </div>
            `;
        }

        return leaderboardHTML;
    }

    drawMiniMap(segment) {
        const canvas = document.querySelector(`#mini-map-${segment.id} canvas`);
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const bounds = segment.bounds;

        // Clear canvas
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, 120, 80);

        // Draw simplified segment path
        ctx.strokeStyle = this.getSegmentColor(segment.category);
        ctx.lineWidth = 3;
        ctx.beginPath();
        
        // Simple line for now
        const startX = 20;
        const startY = 60;
        const endX = 100;
        const endY = 20;
        
        ctx.moveTo(startX, startY);
        ctx.bezierCurveTo(40, 50, 80, 30, endX, endY);
        ctx.stroke();

        // Add start/end markers
        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.arc(startX, startY, 4, 0, 2 * Math.PI);
        ctx.fill();

        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(endX, endY, 4, 0, 2 * Math.PI);
        ctx.fill();
    }

    setupEventListeners() {
        // Search functionality
        const searchInput = document.querySelector('.search-box input');
        searchInput.addEventListener('input', (e) => {
            this.searchSegments(e.target.value);
        });

        // Distance filter
        const distanceFilter = document.querySelectorAll('.filter-dropdown')[0];
        distanceFilter.addEventListener('click', () => {
            this.showDistanceOptions();
        });

        // Type filter
        const typeFilter = document.querySelectorAll('.filter-dropdown')[1];
        typeFilter.addEventListener('click', () => {
            this.showTypeOptions();
        });

        // Filter pills
        document.querySelectorAll('.filter-pill').forEach(pill => {
            pill.addEventListener('click', () => {
                const filterType = pill.textContent.toLowerCase();
                
                // Reset other pills
                document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
                pill.classList.add('active');

                // Apply filter
                if (filterType.includes('all')) {
                    this.filters.starred = false;
                    this.filters.hasAttempts = false;
                } else if (filterType.includes('starred')) {
                    this.filters.starred = true;
                    this.filters.hasAttempts = false;
                } else if (filterType.includes('prs')) {
                    this.filters.starred = false;
                    this.filters.hasAttempts = true;
                }

                this.displaySegmentsList();
            });
        });

        // Create segment button
        document.querySelector('.btn-primary').addEventListener('click', () => {
            this.createNewSegment();
        });
    }

    searchSegments(query) {
        const filtered = this.segments.filter(segment => 
            segment.name.toLowerCase().includes(query.toLowerCase()) ||
            segment.location.toLowerCase().includes(query.toLowerCase())
        );

        this.displayFilteredSegments(filtered);
    }

    displayFilteredSegments(segments) {
        const container = document.querySelector('.segments-grid');
        container.innerHTML = '';

        segments.forEach(segment => {
            const card = this.createSegmentCard(segment);
            container.appendChild(card);
        });

        this.updateSegmentCount(segments.length);
    }

    updateSegmentCount(count) {
        const subtitle = document.querySelector('.segments-header p');
        subtitle.textContent = `${count} segments found near you`;
    }

    toggleStar(segmentId) {
        const starred = this.getStarredSegments();
        const index = starred.indexOf(segmentId);

        if (index > -1) {
            starred.splice(index, 1);
        } else {
            starred.push(segmentId);
        }

        localStorage.setItem('starredSegments', JSON.stringify(starred));
        
        // Update UI
        const btn = document.querySelector(`[data-segment-id="${segmentId}"]`);
        const card = btn.closest('.segment-card');
        
        if (index > -1) {
            btn.classList.remove('starred');
            btn.innerHTML = '<span>☆</span> Star';
            card.classList.remove('starred-segment');
        } else {
            btn.classList.add('starred');
            btn.innerHTML = '<span>⭐</span> Starred';
            card.classList.add('starred-segment');
        }
    }

    getStarredSegments() {
        return JSON.parse(localStorage.getItem('starredSegments') || '[]');
    }

    isSegmentStarred(segmentId) {
        return this.getStarredSegments().includes(segmentId);
    }

    getUserAttempt(segmentId) {
        // In a real app, this would fetch from the API
        // For demo, return mock data for some segments
        const mockAttempts = {
            '1': { rank: 147, time: 558 },
            '3': { rank: 523, time: 947 }
        };
        return mockAttempts[segmentId];
    }

    hasUserAttempt(segmentId) {
        return !!this.getUserAttempt(segmentId);
    }

    createSegmentPopup(segment) {
        return `
            <div style="min-width: 200px;">
                <h4 style="margin: 0 0 8px 0;">${segment.name}</h4>
                <p style="margin: 0 0 8px 0; color: #888;">${segment.location}</p>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 13px;">
                    <div><strong>Distance:</strong> ${this.formatDistance(segment.distance)}</div>
                    <div><strong>Elevation:</strong> ${this.formatElevation(segment.elevation)}</div>
                    <div><strong>Grade:</strong> ${segment.avg_grade.toFixed(1)}%</div>
                    <div><strong>Attempts:</strong> ${segment.stats.total_attempts.toLocaleString()}</div>
                </div>
                <button onclick="window.location.href='/segment-details/${segment.id}'" 
                        style="width: 100%; margin-top: 12px; padding: 8px; background: #5865f2; 
                               color: white; border: none; border-radius: 4px; cursor: pointer;">
                    View Details
                </button>
            </div>
        `;
    }

    highlightSegment(segmentId) {
        // Highlight segment in the list
        document.querySelectorAll('.segment-card').forEach(card => {
            card.classList.remove('highlighted');
        });

        const card = document.querySelector(`[data-segment-id="${segmentId}"]`)?.closest('.segment-card');
        if (card) {
            card.classList.add('highlighted');
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    showSegmentDetails(segmentId) {
        window.location.href = `/segment-details/${segmentId}`;
    }

    createNewSegment() {
        // Navigate to segment creation page
        window.location.href = '/create-segment';
    }

    showDistanceOptions() {
        // Create distance options modal
        const options = [
            { label: 'Within 1 mile', value: 1609 },
            { label: 'Within 5 miles', value: 8047 },
            { label: 'Within 10 miles', value: 16093 },
            { label: 'Within 25 miles', value: 40234 }
        ];

        this.showFilterModal('Distance', options, (value) => {
            this.filters.distance = value;
            this.loadSegments();
        });
    }

    showTypeOptions() {
        // Create type options modal
        const options = [
            { label: 'All Types', value: 'all' },
            { label: 'Climbs', value: 'climb' },
            { label: 'Sprints', value: 'sprint' },
            { label: 'Flat', value: 'flat' }
        ];

        this.showFilterModal('Type', options, (value) => {
            this.filters.type = value;
            this.loadSegments();
        });
    }

    showFilterModal(title, options, onSelect) {
        // Simple modal implementation
        const modal = document.createElement('div');
        modal.className = 'filter-modal';
        modal.innerHTML = `
            <div class="filter-modal-content">
                <h3>${title}</h3>
                ${options.map(opt => `
                    <div class="filter-option" data-value="${opt.value}">
                        ${opt.label}
                    </div>
                `).join('')}
            </div>
        `;

        document.body.appendChild(modal);

        modal.addEventListener('click', (e) => {
            if (e.target.classList.contains('filter-option')) {
                onSelect(e.target.dataset.value);
                modal.remove();
            } else if (e.target === modal) {
                modal.remove();
            }
        });
    }

    // Utility functions
    getSegmentColor(category) {
        const colors = {
            'hc': '#8B0000',
            'cat1': '#DC143C',
            'cat2': '#FF6347',
            'cat3': '#FFA500',
            'cat4': '#FFD700',
            'sprint': '#9370DB',
            'flat': '#32CD32',
            'rolling': '#5865f2'
        };
        return colors[category] || '#5865f2';
    }

    getSegmentIcon(category) {
        const icons = {
            'hc': '⛰️',
            'cat1': '🏔️',
            'cat2': '⛰️',
            'cat3': '🗻',
            'cat4': '⛰️',
            'sprint': '🏃',
            'flat': '➡️',
            'rolling': '〰️'
        };
        return icons[category] || '📍';
    }

    formatCategory(category) {
        const categories = {
            'hc': 'HC Climb',
            'cat1': 'Cat 1 Climb',
            'cat2': 'Cat 2 Climb',
            'cat3': 'Cat 3 Climb',
            'cat4': 'Cat 4 Climb',
            'sprint': 'Sprint',
            'flat': 'Flat',
            'rolling': 'Rolling Hills'
        };
        return categories[category] || category;
    }

    formatDistance(meters) {
        const miles = meters / 1609.34;
        return miles < 1 ? `${Math.round(meters)} m` : `${miles.toFixed(1)} mi`;
    }

    formatElevation(meters) {
        const feet = meters * 3.28084;
        return `${Math.round(feet)} ft`;
    }

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    getInitials(name) {
        return name.split(' ').map(n => n[0]).join('').toUpperCase();
    }

    getRankClass(rank) {
        if (rank === 1) return 'gold';
        if (rank === 2) return 'silver';
        if (rank === 3) return 'bronze';
        return '';
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    if (document.querySelector('.segments-grid')) {
        // Load Leaflet
        const leafletCSS = document.createElement('link');
        leafletCSS.rel = 'stylesheet';
        leafletCSS.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(leafletCSS);

        const leafletJS = document.createElement('script');
        leafletJS.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        leafletJS.onload = () => {
            // Replace placeholder with actual map
            const mapContainer = document.querySelector('.map-container');
            mapContainer.innerHTML = '<div id="segments-map" style="width: 100%; height: 100%;"></div>';
            
            // Initialize segments manager
            window.segmentsManager = new SegmentsManager();
        };
        document.head.appendChild(leafletJS);
    }
});

// Add custom styles
const style = document.createElement('style');
style.textContent = `
    .filter-modal {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
    }

    .filter-modal-content {
        background: var(--card-bg);
        padding: 24px;
        border-radius: 12px;
        min-width: 300px;
    }

    .filter-modal-content h3 {
        margin: 0 0 16px 0;
    }

    .filter-option {
        padding: 12px;
        margin: 8px 0;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s ease;
    }

    .filter-option:hover {
        background: rgba(255, 255, 255, 0.1);
    }

    .segment-card.highlighted {
        box-shadow: 0 0 0 2px #5865f2;
    }

    #segments-map {
        background: #1a1a1a;
    }

    .user-location {
        z-index: 1000;
    }
`;
document.head.appendChild(style);