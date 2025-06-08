// Enhanced Rides Functionality for Profile Page

// Ride Map Visualization using Leaflet
class RideMapViewer {
    constructor(containerId) {
        this.containerId = containerId;
        this.map = null;
    }

    initMap(ride) {
        // Create a simple static map preview
        // In production, this would use Leaflet or Mapbox
        const mapContainer = document.getElementById(this.containerId);
        if (!mapContainer) return;

        // For now, we'll use a placeholder
        // In production, you'd initialize Leaflet here:
        // this.map = L.map(this.containerId).setView([ride.startLat, ride.startLng], 13);
        // L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(this.map);
    }

    loadGPXRoute(gpxData) {
        // Load and display GPX route on map
        console.log('Loading GPX route...');
    }
}

// Elevation Profile Chart
class ElevationProfileChart {
    constructor(containerId, elevationData) {
        this.containerId = containerId;
        this.data = elevationData;
        this.render();
    }

    render() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        // Create SVG elevation profile
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('class', 'elevation-svg');
        svg.setAttribute('viewBox', '0 0 400 100');

        // Create path for elevation profile
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', this.generatePath());
        path.setAttribute('fill', 'rgba(88, 101, 242, 0.2)');
        path.setAttribute('stroke', 'var(--accent)');
        path.setAttribute('stroke-width', '2');

        svg.appendChild(path);
        container.appendChild(svg);
    }

    generatePath() {
        // Generate SVG path data from elevation points
        // This is a simplified example
        return 'M 0 80 L 100 60 L 200 40 L 300 55 L 400 70 L 400 100 L 0 100 Z';
    }
}

// Ride Statistics Calculator
class RideStats {
    static calculateStats(rides) {
        return {
            totalRides: rides.length,
            totalDistance: rides.reduce((sum, ride) => sum + parseFloat(ride.distance), 0),
            totalElevation: rides.reduce((sum, ride) => sum + parseFloat(ride.elevation), 0),
            totalTime: rides.reduce((sum, ride) => sum + this.parseDuration(ride.duration), 0),
            averageSpeed: this.calculateAverageSpeed(rides),
            longestRide: this.findLongestRide(rides),
            mostClimbing: this.findMostClimbing(rides)
        };
    }

    static parseDuration(durationStr) {
        // Parse "4h 32m" format to minutes
        const match = durationStr.match(/(\d+)h\s*(\d+)m/);
        if (match) {
            return parseInt(match[1]) * 60 + parseInt(match[2]);
        }
        return 0;
    }

    static calculateAverageSpeed(rides) {
        const totalSpeed = rides.reduce((sum, ride) => 
            sum + parseFloat(ride.avgSpeed), 0
        );
        return (totalSpeed / rides.length).toFixed(1);
    }

    static findLongestRide(rides) {
        return rides.reduce((longest, ride) => 
            parseFloat(ride.distance) > parseFloat(longest.distance) ? ride : longest
        , rides[0]);
    }

    static findMostClimbing(rides) {
        return rides.reduce((most, ride) => 
            parseFloat(ride.elevation) > parseFloat(most.elevation) ? ride : most
        , rides[0]);
    }
}

// Ride Filtering and Sorting
class RideFilter {
    constructor(rides) {
        this.allRides = rides;
        this.filteredRides = [...rides];
    }

    filterByTime(timeFilter) {
        const now = new Date();
        let startDate;

        switch(timeFilter) {
            case 'week':
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            case 'year':
                startDate = new Date(now.getFullYear(), 0, 1);
                break;
            default:
                this.filteredRides = [...this.allRides];
                return this;
        }

        this.filteredRides = this.allRides.filter(ride => 
            new Date(ride.date) >= startDate
        );
        return this;
    }

    sortBy(sortType) {
        switch(sortType) {
            case 'distance':
                this.filteredRides.sort((a, b) => 
                    parseFloat(b.distance) - parseFloat(a.distance)
                );
                break;
            case 'elevation':
                this.filteredRides.sort((a, b) => 
                    parseFloat(b.elevation) - parseFloat(a.elevation)
                );
                break;
            case 'speed':
                this.filteredRides.sort((a, b) => 
                    parseFloat(b.avgSpeed) - parseFloat(a.avgSpeed)
                );
                break;
            case 'recent':
            default:
                this.filteredRides.sort((a, b) => 
                    new Date(b.date) - new Date(a.date)
                );
        }
        return this;
    }

    getResults() {
        return this.filteredRides;
    }
}

// GPX Export Functionality
class GPXExporter {
    static exportRide(ride) {
        const gpx = this.generateGPX(ride);
        const blob = new Blob([gpx], { type: 'application/gpx+xml' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `${ride.title.replace(/\s+/g, '_')}_${ride.date}.gpx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    static generateGPX(ride) {
        // Simplified GPX generation
        return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="BikeNode">
    <metadata>
        <name>${ride.title}</name>
        <time>${ride.date}</time>
    </metadata>
    <trk>
        <name>${ride.title}</name>
        <trkseg>
            <!-- Track points would go here -->
        </trkseg>
    </trk>
</gpx>`;
    }
}

// Photo Gallery Handler
class RidePhotoGallery {
    static init() {
        document.addEventListener('click', (e) => {
            if (e.target.closest('.ride-photo')) {
                this.openGallery(e.target.closest('.ride-photo'));
            }
        });
    }

    static openGallery(photoElement) {
        const img = photoElement.querySelector('img');
        if (!img) return;

        // Create lightbox
        const lightbox = document.createElement('div');
        lightbox.className = 'photo-lightbox';
        lightbox.innerHTML = `
            <div class="lightbox-content">
                <img src="${img.src}" alt="${img.alt}">
                <button class="lightbox-close">&times;</button>
            </div>
        `;

        document.body.appendChild(lightbox);

        // Close on click
        lightbox.addEventListener('click', (e) => {
            if (e.target.classList.contains('photo-lightbox') || 
                e.target.classList.contains('lightbox-close')) {
                lightbox.remove();
            }
        });
    }
}

// Social Features
class RideSocial {
    static async toggleKudos(rideId) {
        // In production, this would make an API call
        const kudosElement = document.querySelector(`[data-ride-id="${rideId}"] .social-stat`);
        if (kudosElement) {
            kudosElement.classList.toggle('active');
            // Update kudos count
        }
    }

    static async shareRide(rideId) {
        const ride = this.getRideData(rideId);
        
        if (navigator.share) {
            try {
                await navigator.share({
                    title: ride.title,
                    text: `Check out my ${ride.distance} ride: ${ride.title}`,
                    url: `/rides/${rideId}`
                });
            } catch (err) {
                console.log('Error sharing:', err);
            }
        } else {
            // Fallback to copy link
            this.copyShareLink(rideId);
        }
    }

    static copyShareLink(rideId) {
        const url = `${window.location.origin}/rides/${rideId}`;
        navigator.clipboard.writeText(url).then(() => {
            this.showToast('Link copied to clipboard!');
        });
    }

    static showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'toast-notification';
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('show');
        }, 100);

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    static getRideData(rideId) {
        // In production, this would fetch from state or API
        return {
            id: rideId,
            title: 'Sample Ride',
            distance: '100 miles'
        };
    }
}

// Initialize enhanced ride features
document.addEventListener('DOMContentLoaded', () => {
    RidePhotoGallery.init();
    
    // Export functions to global scope for onclick handlers
    window.RideSocial = RideSocial;
    window.GPXExporter = GPXExporter;
});

// Export classes for use in other modules
export {
    RideMapViewer,
    ElevationProfileChart,
    RideStats,
    RideFilter,
    GPXExporter,
    RidePhotoGallery,
    RideSocial
};