/**
 * Bike management functions
 * Handles loading and rendering bike cards
 */

export async function loadBikes(apiBase) {
    try {
        const response = await fetch(`${apiBase}/user/bikes`);
        if (response.ok) {
            return await response.json();
        }
        throw new Error('Failed to load bikes');
    } catch (error) {
        console.error('Error loading bikes:', error);
        return [];
    }
}

export function renderBikeCard(bike) {
    const bikeTypeIcon = getBikeTypeIcon(bike.type);
    const bikeImage = bike.image || '/assets/images/bike-placeholder.jpg';
    
    return `
        <div class="card bike-card" 
             data-bike-id="${bike.id}"
             data-bike-type="${bike.type}"
             data-bike-category="${bike.category || ''}"
             data-bike-brand="${bike.brand}"
             data-bike-model="${bike.model}">
            <div class="bike-image">
                <img src="${bikeImage}" alt="${bike.name}" loading="lazy">
                <div class="bike-overlay">
                    <a href="/bike-details/${bike.id}/" class="btn btn-primary btn-sm">View Details</a>
                    <button class="btn btn-secondary btn-sm" onclick="editBike(${bike.id})">Edit</button>
                </div>
            </div>
            <div class="bike-info">
                <h3 class="font-lg font-semibold text-primary">${bike.name}</h3>
                <p class="bike-type">${bikeTypeIcon} ${bike.brand} ${bike.model}</p>
                <div class="bike-stats">
                    <span class="stat">📅 ${bike.year}</span>
                    <span class="stat">📏 ${formatMileage(bike.mileage)}</span>
                    <span class="stat">🏷️ ${bike.type}</span>
                </div>
                <div class="bike-actions">
                    <a href="/add-photos/${bike.id}/" class="action-link">📸 Add Photos</a>
                    <a href="/bike-maintenance/${bike.id}/" class="action-link">🔧 Maintenance</a>
                    <a href="/ride-log/${bike.id}/" class="action-link">📝 Log Ride</a>
                </div>
            </div>
        </div>
    `;
}

function getBikeTypeIcon(type) {
    const icons = {
        'motorcycle': '🏍️',
        'sport': '🏍️',
        'cruiser': '🏍️',
        'touring': '🏍️',
        'bicycle': '🚴',
        'mountain': '🚵',
        'road': '🚴',
        'ebike': '⚡',
        'e-bike': '⚡',
        'electric': '⚡'
    };
    
    const lowerType = type.toLowerCase();
    for (const [key, icon] of Object.entries(icons)) {
        if (lowerType.includes(key)) {
            return icon;
        }
    }
    return '🏍️'; // Default icon
}

function formatMileage(miles) {
    return miles.toLocaleString() + ' mi';
}

// Global functions for bike actions
window.editBike = function(bikeId) {
    window.location.href = `/edit-bike/${bikeId}/`;
};

window.viewBikeDetails = function(bikeId) {
    window.location.href = `/bike-details/${bikeId}/`;
};