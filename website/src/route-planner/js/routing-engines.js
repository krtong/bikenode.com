// Routing Engine Integration Module
import { OSRMRouter } from './engines/osrm-router.js';
import { GraphHopperRouter } from './engines/graphhopper-router.js';
import { ValhallaRouter } from './engines/valhalla-router.js';
import { BRouterEngine } from './engines/brouter-engine.js';

export class RoutingEngineManager {
    constructor() {
        this.engines = {
            osrm: new OSRMRouter(),
            graphhopper: new GraphHopperRouter(),
            valhalla: new ValhallaRouter(),
            brouter: new BRouterEngine()
        };
        
        this.currentEngine = 'osrm';
        this.customServers = {};
        this.cache = new Map();
        this.maxCacheSize = 100;
    }
    
    setEngine(engineName) {
        if (this.engines[engineName]) {
            this.currentEngine = engineName;
            return true;
        }
        return false;
    }
    
    setCustomServer(engineName, serverUrl) {
        if (this.engines[engineName]) {
            this.customServers[engineName] = serverUrl;
            this.engines[engineName].setServerUrl(serverUrl);
            return true;
        }
        return false;
    }
    
    async calculateRoute(waypoints, vehicleType, preferences = {}) {
        const cacheKey = this.getCacheKey(waypoints, vehicleType, preferences);
        
        // Check cache first
        if (this.cache.has(cacheKey)) {
            console.log('Returning cached route');
            return this.cache.get(cacheKey);
        }
        
        try {
            const engine = this.engines[this.currentEngine];
            const result = await engine.calculateRoute(waypoints, vehicleType, preferences);
            
            // Cache the result
            this.addToCache(cacheKey, result);
            
            return result;
        } catch (error) {
            console.error(`Routing engine ${this.currentEngine} failed:`, error);
            
            // Try fallback to OSRM if current engine fails
            if (this.currentEngine !== 'osrm') {
                console.log('Falling back to OSRM');
                return this.engines.osrm.calculateRoute(waypoints, vehicleType, preferences);
            }
            
            throw error;
        }
    }
    
    async generateIsochrone(center, vehicleType, options = {}) {
        const engine = this.engines[this.currentEngine];
        
        if (!engine.supportsIsochrones()) {
            throw new Error(`${this.currentEngine} does not support isochrones`);
        }
        
        return engine.generateIsochrone(center, vehicleType, options);
    }
    
    async optimizeRoute(waypoints, vehicleType, preferences = {}) {
        const engine = this.engines[this.currentEngine];
        
        if (!engine.supportsOptimization()) {
            // Fallback to simple ordering
            return this.calculateRoute(waypoints, vehicleType, preferences);
        }
        
        return engine.optimizeRoute(waypoints, vehicleType, preferences);
    }
    
    async getAlternativeRoutes(waypoints, vehicleType, preferences = {}, count = 3) {
        const engine = this.engines[this.currentEngine];
        
        if (!engine.supportsAlternatives()) {
            // Return just the main route
            const mainRoute = await this.calculateRoute(waypoints, vehicleType, preferences);
            return [mainRoute];
        }
        
        return engine.getAlternativeRoutes(waypoints, vehicleType, preferences, count);
    }
    
    getCapabilities() {
        const engine = this.engines[this.currentEngine];
        return {
            engine: this.currentEngine,
            supportsAlternatives: engine.supportsAlternatives(),
            supportsIsochrones: engine.supportsIsochrones(),
            supportsOptimization: engine.supportsOptimization(),
            supportsElevation: engine.supportsElevation(),
            supportedVehicleTypes: engine.getSupportedVehicleTypes(),
            supportedPreferences: engine.getSupportedPreferences()
        };
    }
    
    async testConnection(engineName = null) {
        const engine = this.engines[engineName || this.currentEngine];
        
        if (!engine) {
            return { success: false, error: 'Unknown engine' };
        }
        
        try {
            const result = await engine.testConnection();
            return { success: true, ...result };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    getCacheKey(waypoints, vehicleType, preferences) {
        const waypointStr = waypoints.map(wp => `${wp.lat},${wp.lng}`).join('|');
        const prefStr = JSON.stringify(preferences);
        return `${this.currentEngine}-${vehicleType}-${waypointStr}-${prefStr}`;
    }
    
    addToCache(key, value) {
        // Implement LRU cache
        if (this.cache.size >= this.maxCacheSize) {
            // Remove oldest entry
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        
        this.cache.set(key, value);
    }
    
    clearCache() {
        this.cache.clear();
    }
}

// Create and export singleton instance
export const routingEngineManager = new RoutingEngineManager();

// Export function to create Leaflet router that uses our engine manager
export function createManagedRouter(routePlanner) {
    return {
        route: function(waypoints, callback, context, options) {
            const wpData = waypoints.map(wp => ({
                lat: wp.latLng.lat,
                lng: wp.latLng.lng
            }));
            
            routingEngineManager.calculateRoute(
                wpData,
                routePlanner.vehicleType,
                routePlanner.preferences
            ).then(result => {
                // Convert coordinates to Leaflet LatLng format
                const latlngs = result.coordinates.map(coord => L.latLng(coord.lat, coord.lng));
                
                // Convert to Leaflet routing format
                const routes = [{
                    name: result.name || 'Route',
                    coordinates: latlngs,
                    instructions: result.instructions || [],
                    summary: {
                        totalDistance: result.distance,
                        totalTime: result.duration
                    },
                    inputWaypoints: waypoints,
                    waypoints: waypoints.map(wp => ({
                        latLng: wp.latLng,
                        name: wp.name || ''
                    })),
                    waypointIndices: waypoints.map((_, i) => i)
                }];
                
                callback.call(context, null, routes);
            }).catch(error => {
                console.error('Routing error:', error);
                callback.call(context, error);
            });
        }
    };
}