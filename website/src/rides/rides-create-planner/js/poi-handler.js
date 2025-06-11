// POI (Points of Interest) Handler
import { overpassAPI } from './overpass-api.js';

export class POIHandler {
    constructor(routePlanner) {
        this.routePlanner = routePlanner;
        this.poiMarkers = [];
        this.poiLayers = {
            bikeShops: L.layerGroup(),
            water: L.layerGroup(),
            viewpoints: L.layerGroup(),
            restStops: L.layerGroup(),
            parking: L.layerGroup()
        };
        
        // Add layers to map
        Object.values(this.poiLayers).forEach(layer => {
            layer.addTo(routePlanner.map);
        });
        
        this.setupEventHandlers();
    }
    
    setupEventHandlers() {
        // POI toggles
        document.querySelectorAll('.poi-toggle input').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const poiType = e.target.dataset.poiType;
                if (e.target.checked) {
                    this.poiLayers[poiType].addTo(this.routePlanner.map);
                } else {
                    this.routePlanner.map.removeLayer(this.poiLayers[poiType]);
                }
            });
        });
        
        // Search button
        document.getElementById('searchPOIs')?.addEventListener('click', () => {
            this.searchPOIs();
        });
        
        // Clear button
        document.getElementById('clearPOIs')?.addEventListener('click', () => {
            this.clearPOIs();
        });
    }
    
    async searchPOIs() {
        if (this.routePlanner.waypoints.length < 2) {
            this.routePlanner.showNotification('Please create a route first', 'warning');
            return;
        }
        
        const searchBtn = document.getElementById('searchPOIs');
        searchBtn.disabled = true;
        searchBtn.textContent = 'Searching...';
        
        try {
            // Get route bounds
            const bounds = this.getRouteBounds();
            
            // Get selected POI types
            const selectedTypes = this.getSelectedPOITypes();
            
            if (selectedTypes.length === 0) {
                this.routePlanner.showNotification('Please select at least one POI type', 'warning');
                return;
            }
            
            // Clear existing POIs
            this.clearPOIs();
            
            // Search for each POI type
            const results = await this.searchAllPOITypes(bounds, selectedTypes);
            
            // Display results
            this.displayPOIResults(results);
            
        } catch (error) {
            console.error('POI search error:', error);
            this.routePlanner.showNotification('Error searching for POIs', 'error');
        } finally {
            searchBtn.disabled = false;
            searchBtn.textContent = 'Search Along Route';
        }
    }
    
    getRouteBounds() {
        if (!this.routePlanner.currentRoute) {
            // Use waypoints to calculate bounds
            const latlngs = this.routePlanner.waypoints.map(marker => marker.getLatLng());
            const bounds = L.latLngBounds(latlngs);
            
            // Expand bounds by search radius
            const radius = parseInt(document.getElementById('poiRadius')?.value || 5000);
            const radiusDeg = radius / 111000; // Approximate degrees
            
            return {
                south: bounds.getSouth() - radiusDeg,
                north: bounds.getNorth() + radiusDeg,
                west: bounds.getWest() - radiusDeg,
                east: bounds.getEast() + radiusDeg
            };
        }
        
        // Use route coordinates
        const coords = this.routePlanner.currentRoute.coordinates;
        return overpassAPI.calculateBBox(coords, parseInt(document.getElementById('poiRadius')?.value || 5000));
    }
    
    getSelectedPOITypes() {
        const types = [];
        document.querySelectorAll('.poi-toggle input:checked').forEach(checkbox => {
            types.push(checkbox.dataset.poiType);
        });
        return types;
    }
    
    async searchAllPOITypes(bounds, types) {
        const results = {};
        
        for (const type of types) {
            try {
                switch (type) {
                    case 'bikeShops':
                        results.bikeShops = await overpassAPI.findBikeShops(bounds);
                        break;
                    case 'water':
                        results.water = await overpassAPI.findWaterSources(bounds);
                        break;
                    case 'viewpoints':
                        results.viewpoints = await overpassAPI.findViewpoints(bounds);
                        break;
                    case 'restStops':
                        results.restStops = await overpassAPI.findRestStops(bounds);
                        break;
                    case 'parking':
                        const center = this.routePlanner.waypoints[0].getLatLng();
                        results.parking = await overpassAPI.findParking(center, 2000);
                        break;
                }
            } catch (error) {
                console.error(`Error searching for ${type}:`, error);
            }
        }
        
        return results;
    }
    
    displayPOIResults(results) {
        let totalCount = 0;
        
        // Add markers for each POI type
        Object.entries(results).forEach(([type, pois]) => {
            pois.forEach(poi => {
                const marker = this.createPOIMarker(poi, type);
                marker.addTo(this.poiLayers[type]);
                this.poiMarkers.push(marker);
                totalCount++;
            });
        });
        
        // Update UI
        document.getElementById('poiCount').textContent = totalCount;
        document.getElementById('poiResults').style.display = 'block';
        
        // Populate POI list
        this.populatePOIList(results);
        
        this.routePlanner.showNotification(`Found ${totalCount} points of interest`, 'success');
    }
    
    createPOIMarker(poi, type) {
        const icons = {
            bikeShops: '🔧',
            water: '💧',
            viewpoints: '🏔️',
            restStops: '☕',
            parking: '🅿️'
        };
        
        const colors = {
            bikeShops: '#ef4444',
            water: '#3b82f6',
            viewpoints: '#10b981',
            restStops: '#f59e0b',
            parking: '#6b7280'
        };
        
        const marker = L.marker([poi.lat, poi.lng], {
            icon: L.divIcon({
                html: `<div style="background: ${colors[type]}; color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; box-shadow: 0 2px 6px rgba(0,0,0,0.3);">${icons[type]}</div>`,
                className: 'poi-marker',
                iconSize: [28, 28],
                iconAnchor: [14, 14]
            })
        });
        
        // Create popup content
        let popupContent = `<strong>${poi.name}</strong>`;
        
        if (poi.opening_hours) {
            popupContent += `<br>Hours: ${poi.opening_hours}`;
        }
        
        if (poi.phone) {
            popupContent += `<br>Phone: <a href="tel:${poi.phone}">${poi.phone}</a>`;
        }
        
        if (poi.website) {
            popupContent += `<br><a href="${poi.website}" target="_blank">Website</a>`;
        }
        
        if (poi.elevation) {
            popupContent += `<br>Elevation: ${poi.elevation}m`;
        }
        
        marker.bindPopup(popupContent);
        
        // Store POI data
        marker.poiData = poi;
        marker.poiType = type;
        
        return marker;
    }
    
    populatePOIList(results) {
        const poiList = document.getElementById('poiList');
        poiList.innerHTML = '';
        
        const icons = {
            bikeShops: '🔧',
            water: '💧',
            viewpoints: '🏔️',
            restStops: '☕',
            parking: '🅿️'
        };
        
        Object.entries(results).forEach(([type, pois]) => {
            pois.forEach(poi => {
                const distance = this.calculateDistanceToRoute(poi);
                
                const item = document.createElement('div');
                item.className = 'poi-item';
                item.innerHTML = `
                    <div class="poi-item-header">
                        <span class="poi-item-icon">${icons[type]}</span>
                        <span class="poi-item-name">${poi.name}</span>
                        <span class="poi-item-distance">${this.formatDistance(distance)}</span>
                    </div>
                    ${this.getPOIDetails(poi, type)}
                `;
                
                // Click to center on marker
                item.addEventListener('click', () => {
                    this.routePlanner.map.setView([poi.lat, poi.lng], 16);
                    
                    // Find and open marker popup
                    this.poiMarkers.forEach(marker => {
                        if (marker.poiData.id === poi.id) {
                            marker.openPopup();
                        }
                    });
                });
                
                poiList.appendChild(item);
            });
        });
    }
    
    getPOIDetails(poi, type) {
        const details = [];
        
        switch (type) {
            case 'bikeShops':
                if (poi.repair) details.push('Repair service');
                if (poi.opening_hours) details.push(poi.opening_hours);
                break;
            case 'water':
                if (poi.drinking_water) details.push('Drinking water');
                if (poi.access !== 'yes') details.push(`Access: ${poi.access}`);
                break;
            case 'viewpoints':
                if (poi.elevation) details.push(`${poi.elevation}m`);
                if (poi.description) details.push(poi.description);
                break;
            case 'restStops':
                if (poi.cuisine) details.push(poi.cuisine);
                if (poi.outdoor_seating) details.push('Outdoor seating');
                break;
            case 'parking':
                if (poi.fee) details.push(`Fee: ${poi.fee}`);
                if (poi.capacity) details.push(`Capacity: ${poi.capacity}`);
                break;
        }
        
        return details.length > 0 ? 
            `<div class="poi-item-details">${details.join(' • ')}</div>` : '';
    }
    
    calculateDistanceToRoute(poi) {
        if (!this.routePlanner.currentRoute) {
            // Calculate distance to nearest waypoint
            let minDistance = Infinity;
            this.routePlanner.waypoints.forEach(marker => {
                const distance = marker.getLatLng().distanceTo([poi.lat, poi.lng]);
                minDistance = Math.min(minDistance, distance);
            });
            return minDistance;
        }
        
        // Calculate distance to nearest point on route
        let minDistance = Infinity;
        const coords = this.routePlanner.currentRoute.coordinates;
        
        for (let i = 0; i < coords.length - 1; i++) {
            const distance = this.pointToLineDistance(
                { lat: poi.lat, lng: poi.lng },
                coords[i],
                coords[i + 1]
            );
            minDistance = Math.min(minDistance, distance);
        }
        
        return minDistance;
    }
    
    pointToLineDistance(point, lineStart, lineEnd) {
        // Calculate perpendicular distance from point to line segment
        const A = point.lat - lineStart.lat;
        const B = point.lng - lineStart.lng;
        const C = lineEnd.lat - lineStart.lat;
        const D = lineEnd.lng - lineStart.lng;
        
        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        let param = -1;
        
        if (lenSq !== 0) {
            param = dot / lenSq;
        }
        
        let xx, yy;
        
        if (param < 0) {
            xx = lineStart.lat;
            yy = lineStart.lng;
        } else if (param > 1) {
            xx = lineEnd.lat;
            yy = lineEnd.lng;
        } else {
            xx = lineStart.lat + param * C;
            yy = lineStart.lng + param * D;
        }
        
        const dx = point.lat - xx;
        const dy = point.lng - yy;
        
        return Math.sqrt(dx * dx + dy * dy) * 111000; // Convert to meters
    }
    
    formatDistance(meters) {
        if (meters < 1000) {
            return `${Math.round(meters)}m`;
        }
        return `${(meters / 1000).toFixed(1)}km`;
    }
    
    clearPOIs() {
        // Clear all markers
        this.poiMarkers.forEach(marker => {
            marker.remove();
        });
        this.poiMarkers = [];
        
        // Clear layers
        Object.values(this.poiLayers).forEach(layer => {
            layer.clearLayers();
        });
        
        // Hide results
        document.getElementById('poiResults').style.display = 'none';
        document.getElementById('poiList').innerHTML = '';
    }
}

// Export function to initialize POI handler
export function initializePOIHandler(routePlanner) {
    return new POIHandler(routePlanner);
}