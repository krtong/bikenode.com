/**
 * GraphHopper Routing Integration
 * Provides advanced routing with multiple profiles and real-time preferences
 */

class GraphHopperRouter {
    constructor(config = {}) {
        this.baseUrl = config.baseUrl || process.env.GRAPHHOPPER_URL || 'http://localhost:8989';
        this.apiKey = config.apiKey || process.env.GRAPHHOPPER_API_KEY;
        
        // Available profiles
        this.profiles = {
            car: {
                name: 'Car',
                profile: 'car',
                supports: ['avoid_motorway', 'avoid_toll', 'avoid_ferry']
            },
            car_no_highway: {
                name: 'Car (No Highways)',
                profile: 'car_no_highway',
                supports: ['avoid_toll', 'avoid_ferry']
            },
            motorcycle: {
                name: 'Motorcycle',
                profile: 'motorcycle',
                supports: ['avoid_motorway', 'avoid_toll', 'avoid_ferry', 'avoid_unpaved']
            },
            bike: {
                name: 'Bicycle',
                profile: 'bike',
                supports: ['avoid_ferry', 'avoid_steps', 'avoid_road']
            },
            mtb: {
                name: 'Mountain Bike',
                profile: 'mtb',
                supports: ['avoid_ferry', 'avoid_steps']
            },
            racingbike: {
                name: 'Racing Bike',
                profile: 'racingbike',
                supports: ['avoid_ferry', 'avoid_cobblestone', 'avoid_unpaved']
            },
            foot: {
                name: 'Walking',
                profile: 'foot',
                supports: ['avoid_ferry']
            },
            hike: {
                name: 'Hiking',
                profile: 'hike',
                supports: ['avoid_ferry', 'avoid_road']
            }
        };
        
        this.cache = new Map();
        this.cacheTimeout = 3600000; // 1 hour
    }
    
    /**
     * Calculate route with GraphHopper
     */
    async calculateRoute(waypoints, vehicleType = 'car', options = {}) {
        // Validate inputs
        if (!waypoints || waypoints.length < 2) {
            throw new Error('At least 2 waypoints required');
        }
        
        const profile = this.profiles[vehicleType];
        if (!profile) {
            throw new Error(`Unknown vehicle type: ${vehicleType}`);
        }
        
        // Build request
        const params = this.buildRequestParams(waypoints, profile, options);
        const cacheKey = this.getCacheKey(params);
        
        // Check cache
        const cached = this.getFromCache(cacheKey);
        if (cached) {
            console.log('📍 Using cached GraphHopper route');
            return cached;
        }
        
        try {
            console.log(`🗺️ Requesting GraphHopper route: ${vehicleType}`);
            
            const response = await fetch(`${this.baseUrl}/route?${params}`, {
                headers: this.apiKey ? { 'X-API-Key': this.apiKey } : {},
                signal: AbortSignal.timeout(30000)
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || `HTTP ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data.paths || data.paths.length === 0) {
                throw new Error('No route found');
            }
            
            // Process route
            const route = this.processRoute(data.paths[0], vehicleType, options);
            
            // Handle alternatives if requested
            if (options.alternatives && data.paths.length > 1) {
                route.alternatives = data.paths.slice(1).map(path => 
                    this.processRoute(path, vehicleType, options)
                );
            }
            
            // Cache result
            this.saveToCache(cacheKey, route);
            
            return route;
            
        } catch (error) {
            console.error('GraphHopper routing failed:', error);
            throw error;
        }
    }
    
    /**
     * Build request parameters
     */
    buildRequestParams(waypoints, profile, options) {
        const params = new URLSearchParams({
            profile: profile.profile,
            locale: options.locale || 'en',
            elevation: options.elevation !== false,
            instructions: options.instructions !== false,
            points_encoded: false,
            optimize: options.optimize || false,
            type: 'json'
        });
        
        // Add waypoints
        waypoints.forEach(wp => {
            params.append('point', `${wp.lat},${wp.lng}`);
        });
        
        // Add avoid parameters
        const avoidOptions = this.getAvoidParameters(options, profile);
        avoidOptions.forEach(avoid => params.append('avoid', avoid));
        
        // Alternative routes
        if (options.alternatives) {
            params.append('algorithm', 'alternative_route');
            params.append('alternative_route.max_paths', options.maxAlternatives || 3);
            params.append('alternative_route.max_weight_factor', options.alternativeWeightFactor || 1.4);
            params.append('alternative_route.max_share_factor', options.alternativeShareFactor || 0.6);
        }
        
        // Additional options
        if (options.heading) {
            options.heading.forEach(h => params.append('heading', h));
        }
        
        if (options.heading_penalty) {
            params.append('heading_penalty', options.heading_penalty);
        }
        
        if (options.pass_through !== undefined) {
            params.append('pass_through', options.pass_through);
        }
        
        if (options.details) {
            options.details.forEach(d => params.append('details', d));
        }
        
        return params;
    }
    
    /**
     * Get avoid parameters based on options
     */
    getAvoidParameters(options, profile) {
        const avoidList = [];
        
        // Check each avoid option
        if (options.avoid_highways && profile.supports.includes('avoid_motorway')) {
            avoidList.push('motorway');
        }
        
        if (options.avoid_tolls && profile.supports.includes('avoid_toll')) {
            avoidList.push('toll');
        }
        
        if (options.avoid_ferries && profile.supports.includes('avoid_ferry')) {
            avoidList.push('ferry');
        }
        
        if (options.avoid_unpaved && profile.supports.includes('avoid_unpaved')) {
            avoidList.push('track');
            avoidList.push('ford');
        }
        
        if (options.avoid_steps && profile.supports.includes('avoid_steps')) {
            avoidList.push('steps');
        }
        
        // Custom avoid list
        if (options.avoid && Array.isArray(options.avoid)) {
            avoidList.push(...options.avoid);
        }
        
        return [...new Set(avoidList)]; // Remove duplicates
    }
    
    /**
     * Process GraphHopper route response
     */
    processRoute(path, vehicleType, options) {
        const route = {
            vehicleType: vehicleType,
            distance: path.distance,
            duration: path.time,
            ascent: path.ascend || 0,
            descent: path.descend || 0,
            coordinates: [],
            waypoints: [],
            steps: [],
            bounds: null,
            details: {}
        };
        
        // Extract coordinates with elevation
        if (path.points && path.points.coordinates) {
            route.coordinates = path.points.coordinates.map(coord => ({
                lat: coord[1],
                lng: coord[0],
                ele: coord[2] || null
            }));
        }
        
        // Process waypoints
        if (path.snapped_waypoints && path.snapped_waypoints.coordinates) {
            route.waypoints = path.snapped_waypoints.coordinates.map((coord, i) => ({
                location: { lat: coord[1], lng: coord[0] },
                originalIndex: i,
                snapped: true
            }));
        }
        
        // Process turn-by-turn instructions
        if (path.instructions) {
            route.steps = path.instructions.map(instruction => ({
                distance: instruction.distance,
                duration: instruction.time,
                text: instruction.text,
                streetName: instruction.street_name,
                interval: instruction.interval,
                sign: instruction.sign,
                exitNumber: instruction.exit_number,
                turnAngle: instruction.turn_angle
            }));
        }
        
        // Process details (surface, road_class, etc.)
        if (path.details) {
            Object.entries(path.details).forEach(([key, segments]) => {
                route.details[key] = segments.map(segment => ({
                    from: segment[0],
                    to: segment[1],
                    value: segment[2]
                }));
            });
        }
        
        // Calculate bounds
        if (path.bbox) {
            route.bounds = {
                southwest: { lat: path.bbox[1], lng: path.bbox[0] },
                northeast: { lat: path.bbox[3], lng: path.bbox[2] }
            };
        } else if (route.coordinates.length > 0) {
            route.bounds = this.calculateBounds(route.coordinates);
        }
        
        // Add metadata
        route.metadata = {
            profile: this.profiles[vehicleType].name,
            timestamp: new Date().toISOString(),
            engine: 'GraphHopper',
            transfers: path.transfers || 0,
            warnings: this.extractWarnings(path, options)
        };
        
        return route;
    }
    
    /**
     * Extract warnings from route
     */
    extractWarnings(path, options) {
        const warnings = [];
        
        // Check if route uses avoided features
        if (options.avoid_highways && path.details && path.details.road_class) {
            const hasHighway = path.details.road_class.some(segment => 
                segment[2] === 'motorway' || segment[2] === 'trunk'
            );
            if (hasHighway) {
                warnings.push({
                    type: 'avoided_feature',
                    message: 'Route includes highway segments despite preference'
                });
            }
        }
        
        // Elevation warnings
        if (path.ascend > 2000) {
            warnings.push({
                type: 'elevation',
                message: `Significant elevation gain: ${Math.round(path.ascend)}m`,
                value: path.ascend
            });
        }
        
        // Distance warnings
        if (path.distance > 100000) {
            warnings.push({
                type: 'distance',
                message: `Long route: ${(path.distance / 1000).toFixed(1)}km`,
                value: path.distance
            });
        }
        
        return warnings;
    }
    
    /**
     * Generate isochrone (reachability polygon)
     */
    async generateIsochrone(origin, options = {}) {
        const params = new URLSearchParams({
            profile: options.profile || 'car',
            time_limit: options.timeLimit || 600, // 10 minutes default
            distance_limit: options.distanceLimit || -1,
            buckets: options.buckets || 1,
            reverse_flow: options.reverseFlow || false,
            type: 'json'
        });
        
        params.append('point', `${origin.lat},${origin.lng}`);
        
        try {
            const response = await fetch(`${this.baseUrl}/isochrone?${params}`, {
                headers: this.apiKey ? { 'X-API-Key': this.apiKey } : {}
            });
            
            const data = await response.json();
            
            if (data.polygons) {
                return data.polygons.map(polygon => ({
                    geometry: polygon.geometry,
                    properties: polygon.properties,
                    bounds: this.calculateBoundsFromGeoJSON(polygon.geometry)
                }));
            }
            
            throw new Error('No isochrone data returned');
            
        } catch (error) {
            console.error('Isochrone generation failed:', error);
            throw error;
        }
    }
    
    /**
     * Get route info (without full geometry)
     */
    async getRouteInfo(waypoints, profile = 'car') {
        const params = new URLSearchParams({
            profile: profile,
            instructions: false,
            calc_points: false,
            type: 'json'
        });
        
        waypoints.forEach(wp => {
            params.append('point', `${wp.lat},${wp.lng}`);
        });
        
        const response = await fetch(`${this.baseUrl}/route?${params}`, {
            headers: this.apiKey ? { 'X-API-Key': this.apiKey } : {}
        });
        
        const data = await response.json();
        
        if (data.paths && data.paths[0]) {
            const path = data.paths[0];
            return {
                distance: path.distance,
                duration: path.time,
                feasible: true
            };
        }
        
        return { feasible: false };
    }
    
    /**
     * Optimize waypoint order (TSP)
     */
    async optimizeWaypoints(waypoints, options = {}) {
        return this.calculateRoute(waypoints, options.profile || 'car', {
            ...options,
            optimize: true
        });
    }
    
    /**
     * Cache management
     */
    getCacheKey(params) {
        return params.toString();
    }
    
    getFromCache(key) {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.data;
        }
        this.cache.delete(key);
        return null;
    }
    
    saveToCache(key, data) {
        if (this.cache.size > 100) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        
        this.cache.set(key, {
            data: data,
            timestamp: Date.now()
        });
    }
    
    /**
     * Utility functions
     */
    calculateBounds(coordinates) {
        if (!coordinates || coordinates.length === 0) return null;
        
        let minLat = Infinity, maxLat = -Infinity;
        let minLng = Infinity, maxLng = -Infinity;
        
        coordinates.forEach(coord => {
            minLat = Math.min(minLat, coord.lat);
            maxLat = Math.max(maxLat, coord.lat);
            minLng = Math.min(minLng, coord.lng);
            maxLng = Math.max(maxLng, coord.lng);
        });
        
        return {
            southwest: { lat: minLat, lng: minLng },
            northeast: { lat: maxLat, lng: maxLng }
        };
    }
    
    calculateBoundsFromGeoJSON(geometry) {
        const coordinates = geometry.coordinates[0];
        return this.calculateBounds(
            coordinates.map(coord => ({ lat: coord[1], lng: coord[0] }))
        );
    }
}

/**
 * Integration with RoutePlanner
 */
class GraphHopperRoutePlannerIntegration {
    constructor(routePlanner, config = {}) {
        this.routePlanner = routePlanner;
        this.graphhopper = new GraphHopperRouter(config);
        this.enabled = true;
        
        this.checkAvailability();
    }
    
    async checkAvailability() {
        try {
            const response = await fetch(`${this.graphhopper.baseUrl}/health`);
            this.enabled = response.ok;
            
            if (this.enabled) {
                console.log('✅ GraphHopper instance available');
                // Get available profiles
                const info = await fetch(`${this.graphhopper.baseUrl}/info`);
                const data = await info.json();
                console.log('Available profiles:', data.profiles);
            }
        } catch (error) {
            console.warn('GraphHopper instance not available:', error);
            this.enabled = false;
        }
    }
    
    async calculateRoute(waypoints, options = {}) {
        if (!this.enabled) {
            throw new Error('GraphHopper routing not available');
        }
        
        const vehicleType = this.routePlanner.vehicleType || 'car';
        
        // Map UI preferences to GraphHopper options
        const routingOptions = {
            avoid_highways: document.getElementById('avoidHighways')?.checked,
            avoid_tolls: document.getElementById('avoidTolls')?.checked,
            avoid_ferries: document.getElementById('avoidFerries')?.checked,
            avoid_unpaved: document.getElementById('avoidUnpaved')?.checked,
            alternatives: document.getElementById('showAlternatives')?.checked,
            elevation: true,
            details: ['road_class', 'surface', 'max_speed'],
            ...options
        };
        
        try {
            const route = await this.graphhopper.calculateRoute(
                waypoints,
                vehicleType,
                routingOptions
            );
            
            // Display route
            this.routePlanner.displayRoute(route);
            
            // Show alternatives if available
            if (route.alternatives) {
                this.displayAlternatives(route.alternatives);
            }
            
            // Show warnings
            if (route.metadata.warnings.length > 0) {
                route.metadata.warnings.forEach(warning => {
                    this.routePlanner.showNotification(warning.message, 'warning');
                });
            }
            
            return route;
            
        } catch (error) {
            console.error('GraphHopper routing failed:', error);
            this.routePlanner.showNotification('Routing failed: ' + error.message, 'error');
            throw error;
        }
    }
    
    displayAlternatives(alternatives) {
        const container = document.getElementById('alternativeRoutes');
        if (!container) return;
        
        container.innerHTML = alternatives.map((alt, index) => `
            <div class="alternative-route" data-index="${index}">
                <h4>Alternative ${index + 1}</h4>
                <div class="route-stats">
                    <span>Distance: ${(alt.distance / 1000).toFixed(1)} km</span>
                    <span>Time: ${Math.round(alt.duration / 60)} min</span>
                    <span>Ascent: ${alt.ascent}m</span>
                </div>
                <button onclick="selectAlternative(${index})">Select</button>
            </div>
        `).join('');
        
        container.style.display = 'block';
    }
    
    async generateIsochrone(origin, timeLimit = 600) {
        if (!this.enabled) return;
        
        try {
            const isochrones = await this.graphhopper.generateIsochrone(origin, {
                profile: this.routePlanner.vehicleType || 'car',
                timeLimit: timeLimit,
                buckets: 3
            });
            
            // Display on map
            this.displayIsochrones(isochrones);
            
        } catch (error) {
            console.error('Isochrone generation failed:', error);
        }
    }
    
    displayIsochrones(isochrones) {
        // Remove existing isochrones
        if (this.isochroneLayers) {
            this.isochroneLayers.forEach(layer => this.routePlanner.map.removeLayer(layer));
        }
        
        this.isochroneLayers = isochrones.map((isochrone, index) => {
            const layer = L.geoJSON(isochrone.geometry, {
                style: {
                    fillColor: ['#ff0000', '#ff6600', '#ffaa00'][index],
                    fillOpacity: 0.3,
                    color: '#333',
                    weight: 2
                }
            });
            
            layer.addTo(this.routePlanner.map);
            return layer;
        });
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GraphHopperRouter, GraphHopperRoutePlannerIntegration };
}