/**
 * Valhalla Routing Engine Integration
 * Provides advanced routing with JSON-based costing options and multi-modal support
 */

class ValhallaRouter {
    constructor(config = {}) {
        this.baseUrl = config.baseUrl || process.env.VALHALLA_URL || 'http://localhost:8002';
        this.apiKey = config.apiKey || process.env.VALHALLA_API_KEY;
        
        // Available costing models
        this.costingModels = {
            auto: {
                name: 'Automobile',
                supports: ['use_highways', 'use_tolls', 'use_ferries', 'hazmat'],
                options: {
                    maneuver_penalty: 5.0,
                    country_crossing_penalty: 600.0,
                    country_crossing_cost: 600.0,
                    use_highways: 1.0,
                    use_tolls: 1.0,
                    use_ferries: 1.0,
                    hazmat: 0
                }
            },
            auto_no_highway: {
                name: 'Automobile (No Highways)',
                base: 'auto',
                options: {
                    use_highways: 0.0,
                    use_tolls: 0.5
                }
            },
            motorcycle: {
                name: 'Motorcycle',
                base: 'auto',
                supports: ['use_trails', 'avoid_bad_surfaces'],
                options: {
                    use_highways: 1.0,
                    use_trails: 0.5,
                    avoid_bad_surfaces: 0.25,
                    maneuver_penalty: 3.0
                }
            },
            bicycle: {
                name: 'Bicycle',
                supports: ['use_roads', 'use_hills', 'avoid_bad_surfaces', 'bicycle_type'],
                options: {
                    bicycle_type: 'Hybrid',
                    use_roads: 0.5,
                    cycling_speed: 20.0,
                    use_hills: 0.5,
                    avoid_bad_surfaces: 0.25,
                    maneuver_penalty: 10.0
                }
            },
            bikeshare: {
                name: 'Bike Share',
                base: 'bicycle',
                options: {
                    bicycle_type: 'City'
                }
            },
            pedestrian: {
                name: 'Walking',
                supports: ['walking_speed', 'walkway_factor', 'alley_factor'],
                options: {
                    walking_speed: 5.1,
                    walkway_factor: 1.0,
                    alley_factor: 2.0,
                    driveway_factor: 5.0,
                    step_penalty: 30.0
                }
            },
            transit: {
                name: 'Public Transit',
                supports: ['use_bus', 'use_rail', 'use_transfers'],
                options: {
                    use_bus: 1.0,
                    use_rail: 1.0,
                    use_transfers: 1.0,
                    transit_start_end_max_distance: 2145,
                    transit_transfer_max_distance: 800
                }
            },
            multimodal: {
                name: 'Multimodal',
                supports: ['transit_available'],
                options: {}
            }
        };
        
        this.cache = new Map();
        this.cacheTimeout = 3600000; // 1 hour
    }
    
    /**
     * Calculate route with Valhalla
     */
    async calculateRoute(waypoints, costing = 'auto', options = {}) {
        // Validate inputs
        if (!waypoints || waypoints.length < 2) {
            throw new Error('At least 2 waypoints required');
        }
        
        // Build request body
        const request = this.buildRouteRequest(waypoints, costing, options);
        const cacheKey = JSON.stringify(request);
        
        // Check cache
        const cached = this.getFromCache(cacheKey);
        if (cached) {
            console.log('🗺️ Using cached Valhalla route');
            return cached;
        }
        
        try {
            console.log(`📍 Requesting Valhalla route: ${costing}`);
            
            const response = await fetch(`${this.baseUrl}/route`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(this.apiKey ? { 'Authorization': `Bearer ${this.apiKey}` } : {})
                },
                body: JSON.stringify(request),
                signal: AbortSignal.timeout(30000)
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || `HTTP ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data.trip) {
                throw new Error('No route found');
            }
            
            // Process route
            const route = this.processRoute(data.trip, costing, options);
            
            // Handle alternatives if available
            if (data.alternates && data.alternates.length > 0) {
                route.alternatives = data.alternates.map(alt => 
                    this.processRoute(alt.trip, costing, options)
                );
            }
            
            // Cache result
            this.saveToCache(cacheKey, route);
            
            return route;
            
        } catch (error) {
            console.error('Valhalla routing failed:', error);
            throw error;
        }
    }
    
    /**
     * Build Valhalla route request
     */
    buildRouteRequest(waypoints, costing, options) {
        // Get costing model configuration
        const costingModel = this.getCostingModel(costing);
        
        const request = {
            locations: waypoints.map((wp, index) => ({
                lat: wp.lat,
                lon: wp.lng,
                type: index === 0 ? 'break' : (index === waypoints.length - 1 ? 'break' : 'via')
            })),
            costing: costingModel.base || costing,
            directions_options: {
                units: options.units || 'kilometers',
                language: options.language || 'en-US',
                format: 'json'
            },
            alternates: options.alternatives ? (options.maxAlternatives || 2) : 0
        };
        
        // Add costing options
        request.costing_options = {};
        request.costing_options[costingModel.base || costing] = {
            ...costingModel.options,
            ...this.mapOptionsToCosting(options, costingModel)
        };
        
        // Add time constraints if specified
        if (options.departAt) {
            request.date_time = {
                type: 1, // Depart at
                value: options.departAt
            };
        } else if (options.arriveBy) {
            request.date_time = {
                type: 2, // Arrive by
                value: options.arriveBy
            };
        }
        
        // Add exclude locations (areas to avoid)
        if (options.exclude_polygons) {
            request.exclude_polygons = options.exclude_polygons;
        }
        
        // Add preferred/avoided edges
        if (options.preferred_edges) {
            request.costing_options[costingModel.base || costing].preferred_edges = options.preferred_edges;
        }
        
        if (options.avoided_edges) {
            request.costing_options[costingModel.base || costing].avoided_edges = options.avoided_edges;
        }
        
        return request;
    }
    
    /**
     * Get costing model configuration
     */
    getCostingModel(costing) {
        return this.costingModels[costing] || this.costingModels.auto;
    }
    
    /**
     * Map UI options to Valhalla costing options
     */
    mapOptionsToCosting(options, costingModel) {
        const costingOptions = {};
        
        // Auto/Motorcycle options
        if (options.avoid_highways && costingModel.supports?.includes('use_highways')) {
            costingOptions.use_highways = 0.0;
        }
        
        if (options.avoid_tolls && costingModel.supports?.includes('use_tolls')) {
            costingOptions.use_tolls = 0.0;
        }
        
        if (options.avoid_ferries && costingModel.supports?.includes('use_ferries')) {
            costingOptions.use_ferries = 0.0;
        }
        
        // Bicycle options
        if (options.bicycle_type && costingModel.supports?.includes('bicycle_type')) {
            costingOptions.bicycle_type = options.bicycle_type; // Road, Hybrid, City, Mountain
        }
        
        if (options.use_hills !== undefined && costingModel.supports?.includes('use_hills')) {
            costingOptions.use_hills = options.use_hills; // 0.0 to 1.0
        }
        
        if (options.avoid_bad_surfaces && costingModel.supports?.includes('avoid_bad_surfaces')) {
            costingOptions.avoid_bad_surfaces = 0.75;
        }
        
        // Walking options
        if (options.walking_speed && costingModel.supports?.includes('walking_speed')) {
            costingOptions.walking_speed = options.walking_speed;
        }
        
        // Transit options
        if (options.use_bus !== undefined && costingModel.supports?.includes('use_bus')) {
            costingOptions.use_bus = options.use_bus;
        }
        
        if (options.use_rail !== undefined && costingModel.supports?.includes('use_rail')) {
            costingOptions.use_rail = options.use_rail;
        }
        
        return costingOptions;
    }
    
    /**
     * Process Valhalla route response
     */
    processRoute(trip, costing, options) {
        const route = {
            vehicleType: costing,
            distance: trip.summary.length * 1000, // Convert to meters
            duration: trip.summary.time,
            coordinates: [],
            waypoints: [],
            steps: [],
            bounds: null,
            details: {}
        };
        
        // Process legs
        if (trip.legs) {
            trip.legs.forEach((leg, legIndex) => {
                // Extract coordinates from shape
                if (leg.shape) {
                    const decoded = this.decodePolyline(leg.shape);
                    route.coordinates.push(...decoded);
                }
                
                // Process maneuvers (turn-by-turn)
                if (leg.maneuvers) {
                    leg.maneuvers.forEach(maneuver => {
                        route.steps.push({
                            distance: maneuver.length * 1000, // Convert to meters
                            duration: maneuver.time,
                            instruction: maneuver.instruction,
                            verbal_pre_transition_instruction: maneuver.verbal_pre_transition_instruction,
                            type: maneuver.type,
                            street_names: maneuver.street_names,
                            begin_shape_index: maneuver.begin_shape_index,
                            end_shape_index: maneuver.end_shape_index,
                            toll: maneuver.toll,
                            highway: maneuver.highway,
                            rough: maneuver.rough
                        });
                    });
                }
                
                // Add leg summary
                route.waypoints.push({
                    index: legIndex,
                    distance: leg.summary.length * 1000,
                    duration: leg.summary.time,
                    has_toll: leg.summary.has_toll,
                    has_highway: leg.summary.has_highway,
                    has_ferry: leg.summary.has_ferry
                });
            });
        }
        
        // Calculate bounds
        if (route.coordinates.length > 0) {
            route.bounds = this.calculateBounds(route.coordinates);
        }
        
        // Add elevation data if available
        if (trip.summary.min_elevation !== undefined) {
            route.elevation = {
                min: trip.summary.min_elevation,
                max: trip.summary.max_elevation
            };
        }
        
        // Add metadata
        route.metadata = {
            profile: this.costingModels[costing]?.name || costing,
            timestamp: new Date().toISOString(),
            engine: 'Valhalla',
            units: trip.units || 'kilometers',
            warnings: this.extractWarnings(trip, options)
        };
        
        return route;
    }
    
    /**
     * Decode Valhalla's encoded polyline
     */
    decodePolyline(encoded) {
        const coordinates = [];
        let index = 0;
        let lat = 0;
        let lng = 0;
        
        while (index < encoded.length) {
            let b, shift = 0, result = 0;
            do {
                b = encoded.charCodeAt(index++) - 63;
                result |= (b & 0x1f) << shift;
                shift += 5;
            } while (b >= 0x20);
            
            const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
            lat += dlat;
            
            shift = 0;
            result = 0;
            do {
                b = encoded.charCodeAt(index++) - 63;
                result |= (b & 0x1f) << shift;
                shift += 5;
            } while (b >= 0x20);
            
            const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
            lng += dlng;
            
            coordinates.push({
                lat: lat / 1e6,
                lng: lng / 1e6
            });
        }
        
        return coordinates;
    }
    
    /**
     * Generate isochrone (time/distance polygon)
     */
    async generateIsochrone(origin, options = {}) {
        const request = {
            locations: [{
                lat: origin.lat,
                lon: origin.lng
            }],
            costing: options.costing || 'auto',
            contours: options.contours || [
                { time: 10 }, // 10 minutes
                { time: 20 }, // 20 minutes
                { time: 30 }  // 30 minutes
            ],
            polygons: true,
            denoise: options.denoise || 1.0,
            generalize: options.generalize || 150
        };
        
        // Add costing options
        request.costing_options = {};
        request.costing_options[request.costing] = this.mapOptionsToCosting(
            options, 
            this.getCostingModel(request.costing)
        );
        
        try {
            const response = await fetch(`${this.baseUrl}/isochrone`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(this.apiKey ? { 'Authorization': `Bearer ${this.apiKey}` } : {})
                },
                body: JSON.stringify(request)
            });
            
            const data = await response.json();
            
            if (data.features) {
                return data.features.map(feature => ({
                    geometry: feature.geometry,
                    properties: feature.properties,
                    contour: feature.properties.contour,
                    color: feature.properties.color
                }));
            }
            
            throw new Error('No isochrone data returned');
            
        } catch (error) {
            console.error('Isochrone generation failed:', error);
            throw error;
        }
    }
    
    /**
     * Calculate many-to-many matrix
     */
    async calculateMatrix(sources, targets, options = {}) {
        const request = {
            sources: sources.map(src => ({
                lat: src.lat,
                lon: src.lng
            })),
            targets: targets.map(tgt => ({
                lat: tgt.lat,
                lon: tgt.lng
            })),
            costing: options.costing || 'auto'
        };
        
        // Add costing options
        request.costing_options = {};
        request.costing_options[request.costing] = this.mapOptionsToCosting(
            options, 
            this.getCostingModel(request.costing)
        );
        
        const response = await fetch(`${this.baseUrl}/sources_to_targets`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(this.apiKey ? { 'Authorization': `Bearer ${this.apiKey}` } : {})
            },
            body: JSON.stringify(request)
        });
        
        const data = await response.json();
        
        if (data.sources_to_targets) {
            return {
                distances: data.sources_to_targets.map(row => 
                    row.map(cell => cell.distance * 1000) // Convert to meters
                ),
                durations: data.sources_to_targets.map(row => 
                    row.map(cell => cell.time)
                )
            };
        }
        
        throw new Error('Matrix calculation failed');
    }
    
    /**
     * Optimize waypoint order (traveling salesman)
     */
    async optimizeRoute(waypoints, options = {}) {
        const request = {
            locations: waypoints.map((wp, index) => ({
                lat: wp.lat,
                lon: wp.lng,
                type: index === 0 ? 'break' : 'through'
            })),
            costing: options.costing || 'auto',
            directions_options: {
                units: options.units || 'kilometers',
                format: 'json'
            }
        };
        
        // Add costing options
        request.costing_options = {};
        request.costing_options[request.costing] = this.mapOptionsToCosting(
            options, 
            this.getCostingModel(request.costing)
        );
        
        const response = await fetch(`${this.baseUrl}/optimized_route`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(this.apiKey ? { 'Authorization': `Bearer ${this.apiKey}` } : {})
            },
            body: JSON.stringify(request)
        });
        
        const data = await response.json();
        
        if (data.trip) {
            return this.processRoute(data.trip, request.costing, options);
        }
        
        throw new Error('Route optimization failed');
    }
    
    /**
     * Map matching - snap GPS trace to roads
     */
    async matchRoute(gpsTrace, options = {}) {
        const request = {
            shape: gpsTrace.map(point => ({
                lat: point.lat,
                lon: point.lng,
                time: point.time
            })),
            costing: options.costing || 'auto',
            shape_match: options.shape_match || 'map_snap',
            filters: {
                attributes: ['edge.id', 'edge.length', 'node.elapsed_time'],
                action: 'include'
            }
        };
        
        const response = await fetch(`${this.baseUrl}/trace_route`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(this.apiKey ? { 'Authorization': `Bearer ${this.apiKey}` } : {})
            },
            body: JSON.stringify(request)
        });
        
        const data = await response.json();
        
        if (data.trip) {
            return this.processRoute(data.trip, request.costing, options);
        }
        
        throw new Error('Map matching failed');
    }
    
    /**
     * Extract warnings from route
     */
    extractWarnings(trip, options) {
        const warnings = [];
        
        // Check for features user wanted to avoid
        if (trip.summary) {
            if (options.avoid_highways && trip.summary.has_highway) {
                warnings.push({
                    type: 'highway',
                    message: 'Route includes highway segments despite preference'
                });
            }
            
            if (options.avoid_tolls && trip.summary.has_toll) {
                warnings.push({
                    type: 'toll',
                    message: 'Route includes toll roads'
                });
            }
            
            if (options.avoid_ferries && trip.summary.has_ferry) {
                warnings.push({
                    type: 'ferry',
                    message: 'Route includes ferry crossing'
                });
            }
        }
        
        // Long route warning
        if (trip.summary && trip.summary.length > 100) {
            warnings.push({
                type: 'distance',
                message: `Long route: ${trip.summary.length.toFixed(1)}km`,
                value: trip.summary.length
            });
        }
        
        return warnings;
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
}

/**
 * Integration with RoutePlanner
 */
class ValhallaRoutePlannerIntegration {
    constructor(routePlanner, config = {}) {
        this.routePlanner = routePlanner;
        this.valhalla = new ValhallaRouter(config);
        this.enabled = true;
        
        this.checkAvailability();
    }
    
    async checkAvailability() {
        try {
            // Valhalla doesn't have a dedicated health endpoint, 
            // so we'll try a simple route request
            const testRoute = await this.valhalla.calculateRoute(
                [
                    { lat: 40.7128, lng: -74.0060 },
                    { lat: 40.7580, lng: -73.9855 }
                ],
                'pedestrian'
            );
            
            this.enabled = true;
            console.log('✅ Valhalla instance available');
            
        } catch (error) {
            console.warn('Valhalla instance not available:', error);
            this.enabled = false;
        }
    }
    
    async calculateRoute(waypoints, options = {}) {
        if (!this.enabled) {
            throw new Error('Valhalla routing not available');
        }
        
        const vehicleType = this.routePlanner.vehicleType || 'car';
        
        // Map vehicle types to Valhalla costing models
        const costingMap = {
            car: 'auto',
            motorcycle: 'motorcycle',
            bicycle: 'bicycle',
            bike: 'bicycle',
            mtb: 'bicycle',
            foot: 'pedestrian',
            walk: 'pedestrian'
        };
        
        const costing = costingMap[vehicleType] || 'auto';
        
        // Map UI options to Valhalla options
        const routingOptions = {
            avoid_highways: document.getElementById('avoidHighways')?.checked,
            avoid_tolls: document.getElementById('avoidTolls')?.checked,
            avoid_ferries: document.getElementById('avoidFerries')?.checked,
            avoid_bad_surfaces: document.getElementById('avoidBadSurfaces')?.checked,
            alternatives: document.getElementById('showAlternatives')?.checked,
            
            // Bicycle-specific options
            bicycle_type: this.getBicycleType(),
            use_hills: this.getHillPreference(),
            
            ...options
        };
        
        try {
            const route = await this.valhalla.calculateRoute(
                waypoints,
                costing,
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
            console.error('Valhalla routing failed:', error);
            this.routePlanner.showNotification('Routing failed: ' + error.message, 'error');
            throw error;
        }
    }
    
    getBicycleType() {
        const bikeType = document.getElementById('bicycleType')?.value;
        const typeMap = {
            road: 'Road',
            mountain: 'Mountain',
            hybrid: 'Hybrid',
            city: 'City'
        };
        return typeMap[bikeType] || 'Hybrid';
    }
    
    getHillPreference() {
        const hillPref = document.getElementById('hillPreference')?.value;
        const prefMap = {
            avoid: 0.0,
            minimize: 0.25,
            normal: 0.5,
            prefer: 0.75,
            love: 1.0
        };
        return prefMap[hillPref] || 0.5;
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
                    ${alt.waypoints.some(wp => wp.has_toll) ? '<span class="warning">⚠️ Tolls</span>' : ''}
                    ${alt.waypoints.some(wp => wp.has_highway) ? '<span class="warning">🛣️ Highway</span>' : ''}
                    ${alt.waypoints.some(wp => wp.has_ferry) ? '<span class="warning">⛴️ Ferry</span>' : ''}
                </div>
                <button onclick="selectAlternative(${index})">Select</button>
            </div>
        `).join('');
        
        container.style.display = 'block';
    }
    
    async generateIsochrone(origin, minutes = [10, 20, 30]) {
        if (!this.enabled) return;
        
        try {
            const isochrones = await this.valhalla.generateIsochrone(origin, {
                costing: this.routePlanner.vehicleType === 'bicycle' ? 'bicycle' : 'auto',
                contours: minutes.map(time => ({ time }))
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
        
        this.isochroneLayers = isochrones.map(isochrone => {
            const layer = L.geoJSON(isochrone.geometry, {
                style: {
                    fillColor: isochrone.color || '#5865F2',
                    fillOpacity: 0.3,
                    color: '#333',
                    weight: 2
                }
            }).bindPopup(`${isochrone.contour} minutes`);
            
            layer.addTo(this.routePlanner.map);
            return layer;
        });
    }
    
    async optimizeWaypoints(waypoints) {
        if (!this.enabled) return;
        
        try {
            const optimized = await this.valhalla.optimizeRoute(waypoints, {
                costing: this.routePlanner.vehicleType === 'bicycle' ? 'bicycle' : 'auto'
            });
            
            // Display optimized route
            this.routePlanner.displayRoute(optimized);
            
            // Show optimization result
            this.routePlanner.showNotification(
                'Route optimized for shortest travel time',
                'success'
            );
            
            return optimized;
            
        } catch (error) {
            console.error('Route optimization failed:', error);
            this.routePlanner.showNotification('Optimization failed', 'error');
        }
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ValhallaRouter, ValhallaRoutePlannerIntegration };
}