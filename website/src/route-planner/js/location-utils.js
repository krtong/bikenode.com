// Location utilities for Route Planner

export function loadUserLocation(routePlanner) {
    console.log('Attempting to get user location...');
    
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                const latlng = L.latLng(lat, lng);
                
                console.log(`✅ User location obtained: ${lat}, ${lng}`);
                
                // Center map on user location
                routePlanner.map.setView(latlng, 13);
                
                // Add a marker for user location
                const userMarker = L.marker(latlng, {
                    icon: L.divIcon({
                        html: '<div style="background: #4285F4; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
                        className: 'user-location-marker',
                        iconSize: [22, 22],
                        iconAnchor: [11, 11]
                    })
                }).addTo(routePlanner.map);
                
                // Add pulsing effect
                userMarker._icon.innerHTML += '<div style="position: absolute; top: -3px; left: -3px; width: 22px; height: 22px; border: 2px solid #4285F4; border-radius: 50%; animation: pulse 2s infinite;"></div>';
                
                // Store user location
                routePlanner.userLocation = latlng;
                
                // Show notification
                routePlanner.showNotification('Location found! Centered on your position.', 'success');
            },
            (error) => {
                console.error('❌ Error getting location:', error);
                let errorMessage = 'Unable to get your location. ';
                
                switch(error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage += 'Please allow location access.';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage += 'Location information unavailable.';
                        break;
                    case error.TIMEOUT:
                        errorMessage += 'Location request timed out.';
                        break;
                    default:
                        errorMessage += 'An unknown error occurred.';
                }
                
                routePlanner.showNotification(errorMessage, 'error');
                
                // Default to a reasonable location (San Francisco)
                console.log('Using default location: San Francisco');
                routePlanner.map.setView([37.7749, -122.4194], 11);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 30000
            }
        );
    } else {
        console.error('❌ Geolocation not supported');
        routePlanner.showNotification('Geolocation is not supported by your browser.', 'error');
        
        // Default to US center
        routePlanner.map.setView([39.8283, -98.5795], 5);
    }
}

// Add CSS for pulsing animation
const style = document.createElement('style');
style.textContent = `
    @keyframes pulse {
        0% {
            transform: scale(1);
            opacity: 1;
        }
        50% {
            transform: scale(1.5);
            opacity: 0.5;
        }
        100% {
            transform: scale(2);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);