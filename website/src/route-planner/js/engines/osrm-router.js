// OSRM Router Implementation
export class OSRMRouter {
    constructor() {
        this.publicServer = 'https://router.project-osrm.org/route/v1';
        this.customServer = null;
        this.profiles = {
            car: 'driving',
            motorcycle: 'driving',
            bicycle: 'bike',
            foot: 'foot'
        };
    }
    
    setServerUrl(url) {
        this.customServer = url;
    }
    
    getServerUrl() {
        return this.customServer || this.publicServer;
    }
    
    async calculateRoute(waypoints, vehicleType, preferences = {}) {
        const profile = this.getProfile(vehicleType, preferences);
        const coordinates = waypoints.map(wp => `${wp.lng},${wp.lat}`).join(';');
        
        const params = new URLSearchParams({
            overview: 'full',
            geometries: 'geojson',
            steps: true,
            annotations: true
        });
        
        // Add alternatives if requested
        if (preferences.alternatives) {
            params.append('alternatives', 'true');
        }
        
        const url = `${this.getServerUrl()}/${profile}/${coordinates}?${params}`;
        
        try {
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.code !== 'Ok') {
                throw new Error(data.message || 'OSRM routing failed');
            }
            
            const route = data.routes[0];
            
            return {
                coordinates: route.geometry.coordinates.map(coord => ({
                    lat: coord[1],
                    lng: coord[0]
                })),
                distance: route.distance,
                duration: route.duration,
                instructions: this.convertInstructions(route.legs),
                waypoints: data.waypoints,
                alternatives: data.routes.slice(1).map(r => ({
                    coordinates: r.geometry.coordinates.map(coord => ({
                        lat: coord[1],
                        lng: coord[0]
                    })),
                    distance: r.distance,
                    duration: r.duration
                }))
            };
        } catch (error) {
            console.error('OSRM routing error:', error);
            throw error;
        }
    }
    
    getProfile(vehicleType, preferences) {
        // Use custom profile if avoid highways is set and custom server is available
        if (preferences.avoidHighways && this.customServer) {
            switch (vehicleType) {
                case 'car':
                case 'motorcycle':
                    return 'car-no-highway';
                case 'bicycle':
                    return preferences.surfacePref === 'trails' ? 'bicycle-mtb' : 'bicycle';
                default:
                    return 'foot';
            }
        }
        
        return this.profiles[vehicleType] || 'driving';
    }
    
    convertInstructions(legs) {
        const instructions = [];
        
        legs.forEach(leg => {
            leg.steps.forEach(step => {
                instructions.push({
                    type: step.maneuver.type,
                    modifier: step.maneuver.modifier,
                    text: step.name,
                    distance: step.distance,
                    duration: step.duration,
                    location: step.maneuver.location
                });
            });
        });
        
        return instructions;
    }
    
    async testConnection() {
        try {
            // Test with a simple route
            const testWaypoints = [
                { lat: 37.7749, lng: -122.4194 },
                { lat: 37.7751, lng: -122.4180 }
            ];
            
            await this.calculateRoute(testWaypoints, 'car');
            return { 
                serverUrl: this.getServerUrl(),
                version: 'OSRM v5.x'
            };
        } catch (error) {
            throw new Error(`Connection test failed: ${error.message}`);
        }
    }
    
    supportsAlternatives() {
        return true;
    }
    
    supportsIsochrones() {
        return false;
    }
    
    supportsOptimization() {
        return false;
    }
    
    supportsElevation() {
        return false;
    }
    
    getSupportedVehicleTypes() {
        return ['car', 'motorcycle', 'bicycle', 'foot'];
    }
    
    getSupportedPreferences() {
        return ['avoidHighways', 'alternatives'];
    }
    
    async getAlternativeRoutes(waypoints, vehicleType, preferences = {}, count = 3) {
        const prefs = { ...preferences, alternatives: true };
        const result = await this.calculateRoute(waypoints, vehicleType, prefs);
        
        const routes = [result];
        if (result.alternatives) {
            routes.push(...result.alternatives.slice(0, count - 1));
        }
        
        return routes;
    }
}