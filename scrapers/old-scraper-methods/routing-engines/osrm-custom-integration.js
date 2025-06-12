/**
 * OSRM Custom Instance Integration
 * Connects the route planner to self-hosted OSRM with custom profiles
 */

class CustomOSRMRouter {
    constructor(config = {}) {
        // Use environment variable or config for base URL
        this.baseUrl = config.baseUrl || process.env.OSRM_SERVER_URL || 'http://localhost:8080';
        
        // Profile mappings
        this.profiles = {
            motorcycle: {
                endpoint: '/route/v1/motorcycle',
                name: 'Motorcycle',
                options: {
                    avoid_highways: true,
                    avoid_tolls: true,
                    prefer_scenic: false
                }
            },
            bicycle: {
                endpoint: '/route/v1/bicycle',
                name: 'Bicycle (MTB)',
                options: {
                    avoid_highways: true,
                    prefer_bike_paths: true,
                    surface_types: ['paved', 'gravel', 'dirt']
                }
            },
            car: {
                endpoint: '/route/v1/car',
                name: 'Car (No Highways)',
                options: {
                    avoid_highways: true,
                    avoid_tolls: true,
                    prefer_local_roads: true
                }
            }
        };
        
        // Cache for recent routes
        this.routeCache = new Map();
        this.cacheTimeout = 3600000; // 1 hour
    }
    
    /**
     * Get route with custom preferences
     */
    async getRoute(waypoints, vehicleType = 'car', options = {}) {
        // Validate inputs
        if (!waypoints || waypoints.length < 2) {
            throw new Error('At least 2 waypoints required');
        }
        
        // Build cache key
        const cacheKey = this.buildCacheKey(waypoints, vehicleType, options);
        
        // Check cache
        const cached = this.getFromCache(cacheKey);
        if (cached) {
            console.log('🎯 Using cached route');
            return cached;
        }
        
        // Build request URL
        const url = this.buildRequestUrl(waypoints, vehicleType, options);
        
        try {
            console.log(`🛣️ Requesting route from custom OSRM: ${vehicleType}`);
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                },
                // Add timeout
                signal: AbortSignal.timeout(30000)
            });
            
            if (!response.ok) {
                throw new Error(`OSRM request failed: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.code !== 'Ok') {
                throw new Error(`OSRM error: ${data.message || data.code}`);
            }
            
            if (!data.routes || data.routes.length === 0) {
                throw new Error('No route found');
            }
            
            // Process route
            const route = this.processRoute(data.routes[0], vehicleType);
            
            // Cache result
            this.saveToCache(cacheKey, route);
            
            return route;
            
        } catch (error) {
            console.error('OSRM request failed:', error);
            
            // Fallback to public OSRM if custom instance fails
            if (this.shouldFallback(error)) {
                console.warn('Falling back to public OSRM...');
                return this.fallbackToPublicOSRM(waypoints, vehicleType);
            }
            
            throw error;
        }
    }
    
    /**
     * Build request URL with parameters
     */
    buildRequestUrl(waypoints, vehicleType, options) {
        const profile = this.profiles[vehicleType];
        if (!profile) {
            throw new Error(`Unknown vehicle type: ${vehicleType}`);
        }
        
        // Format coordinates
        const coordinates = waypoints
            .map(wp => `${wp.lng},${wp.lat}`)
            .join(';');
        
        // Build query parameters
        const params = new URLSearchParams({
            overview: 'full',
            geometries: 'geojson',
            steps: true,
            alternatives: options.alternatives !== false,
            continue_straight: options.continue_straight || false
        });
        
        // Add exclusions based on options
        const exclude = [];
        if (options.avoid_tolls) exclude.push('toll');
        if (options.avoid_ferries) exclude.push('ferry');
        if (options.avoid_highways) exclude.push('motorway');
        
        if (exclude.length > 0) {
            params.append('exclude', exclude.join(','));
        }
        
        return `${this.baseUrl}${profile.endpoint}/${coordinates}?${params}`;
    }
    
    /**
     * Process OSRM route response
     */
    processRoute(route, vehicleType) {
        const processed = {
            vehicleType: vehicleType,
            coordinates: [],
            distance: route.distance,
            duration: route.duration,
            geometry: route.geometry,
            waypoints: [],
            steps: [],
            bounds: null
        };
        
        // Extract coordinates
        if (route.geometry && route.geometry.coordinates) {
            processed.coordinates = route.geometry.coordinates.map(coord => ({
                lat: coord[1],
                lng: coord[0]
            }));
            
            // Calculate bounds
            processed.bounds = this.calculateBounds(processed.coordinates);
        }
        
        // Process waypoints
        if (route.legs) {
            route.legs.forEach((leg, index) => {
                // Add waypoint info
                processed.waypoints.push({
                    index: index,
                    distance: leg.distance,
                    duration: leg.duration,
                    summary: leg.summary
                });
                
                // Process steps
                if (leg.steps) {
                    leg.steps.forEach(step => {
                        processed.steps.push({
                            distance: step.distance,
                            duration: step.duration,
                            instruction: this.generateInstruction(step),
                            name: step.name,
                            mode: step.mode,
                            maneuver: step.maneuver,
                            geometry: step.geometry
                        });
                    });
                }
            });
        }
        
        // Add metadata
        processed.metadata = {
            profile: this.profiles[vehicleType].name,
            timestamp: new Date().toISOString(),
            engine: 'OSRM Custom',
            warnings: this.checkRouteWarnings(processed, vehicleType)
        };
        
        return processed;
    }
    
    /**
     * Generate human-readable instruction from step
     */
    generateInstruction(step) {
        if (!step.maneuver) {
            return step.name ? `Continue on ${step.name}` : 'Continue';
        }
        
        const maneuver = step.maneuver;
        let instruction = '';
        
        switch (maneuver.type) {
            case 'depart':
                instruction = `Start on ${step.name || 'the road'}`;
                break;
            case 'arrive':
                instruction = 'Arrive at your destination';
                break;
            case 'turn':
                const direction = maneuver.modifier || maneuver.direction;
                instruction = `Turn ${direction} onto ${step.name || 'the road'}`;
                break;
            case 'new name':
                instruction = `Continue onto ${step.name}`;
                break;
            case 'continue':
                instruction = `Continue on ${step.name}`;
                break;
            case 'merge':
                instruction = `Merge onto ${step.name}`;
                break;
            case 'on ramp':
                instruction = `Take the ramp onto ${step.name}`;
                break;
            case 'off ramp':
                instruction = `Take the exit`;
                break;
            case 'fork':
                instruction = `Keep ${maneuver.modifier} at the fork`;
                break;
            case 'roundabout':
                instruction = `Enter the roundabout and take exit ${maneuver.exit}`;
                break;
            default:
                instruction = step.name || 'Continue';
        }
        
        return instruction;
    }
    
    /**
     * Check for route warnings
     */
    checkRouteWarnings(route, vehicleType) {
        const warnings = [];
        
        // Check for highway usage when avoiding
        if (vehicleType === 'car' || vehicleType === 'motorcycle') {
            const highwaySteps = route.steps.filter(step => 
                step.name && (
                    step.name.includes('I-') ||
                    step.name.includes('US-') ||
                    step.name.includes('Highway') ||
                    step.name.includes('Freeway')
                )
            );
            
            if (highwaySteps.length > 0) {
                warnings.push({
                    type: 'highway_detected',
                    message: 'Route may include highway segments despite avoidance preference',
                    count: highwaySteps.length
                });
            }
        }
        
        // Check for long distance without services
        if (route.distance > 50000) { // 50km
            warnings.push({
                type: 'long_distance',
                message: 'Long route - ensure you have adequate fuel/water',
                distance: route.distance
            });
        }
        
        return warnings;
    }
    
    /**
     * Calculate bounds for coordinates
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
    
    /**
     * Cache management
     */
    buildCacheKey(waypoints, vehicleType, options) {
        const wpString = waypoints.map(wp => `${wp.lat},${wp.lng}`).join('|');
        const optString = JSON.stringify(options);
        return `${vehicleType}:${wpString}:${optString}`;
    }
    
    getFromCache(key) {
        const cached = this.routeCache.get(key);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.data;
        }
        this.routeCache.delete(key);
        return null;
    }
    
    saveToCache(key, data) {
        // Limit cache size
        if (this.routeCache.size > 100) {
            const firstKey = this.routeCache.keys().next().value;
            this.routeCache.delete(firstKey);
        }
        
        this.routeCache.set(key, {
            data: data,
            timestamp: Date.now()
        });
    }
    
    /**
     * Fallback handling
     */
    shouldFallback(error) {
        // Fallback on network errors or timeouts
        return error.name === 'TypeError' || 
               error.name === 'AbortError' ||
               error.message.includes('fetch');
    }
    
    async fallbackToPublicOSRM(waypoints, vehicleType) {
        const publicUrl = 'https://router.project-osrm.org';
        const profile = vehicleType === 'bicycle' ? 'bike' : 'car';
        
        const coordinates = waypoints
            .map(wp => `${wp.lng},${wp.lat}`)
            .join(';');
        
        const url = `${publicUrl}/route/v1/${profile}/${coordinates}?overview=full&geometries=geojson`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.routes && data.routes.length > 0) {
            return this.processRoute(data.routes[0], vehicleType);
        }
        
        throw new Error('Fallback routing also failed');
    }
    
    /**
     * Health check for custom instance
     */
    async checkHealth() {
        try {
            const response = await fetch(`${this.baseUrl}/health`, {
                signal: AbortSignal.timeout(5000)
            });
            return response.ok;
        } catch {
            return false;
        }
    }
    
    /**
     * Get server status
     */
    async getServerStatus() {
        const status = {
            available: false,
            profiles: {},
            responseTime: null
        };
        
        const startTime = Date.now();
        
        try {
            // Check main health
            status.available = await this.checkHealth();
            
            if (status.available) {
                // Test each profile endpoint
                const testCoords = '-118.2437,34.0522;-118.2427,34.0532'; // 1km test route
                
                for (const [type, profile] of Object.entries(this.profiles)) {
                    try {
                        const url = `${this.baseUrl}${profile.endpoint}/${testCoords}?overview=false`;
                        const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
                        status.profiles[type] = response.ok;
                    } catch {
                        status.profiles[type] = false;
                    }
                }
            }
            
            status.responseTime = Date.now() - startTime;
            
        } catch (error) {
            console.error('Status check failed:', error);
        }
        
        return status;
    }
}

// Integration with main RoutePlanner class
class OSRMRoutePlannerIntegration {
    constructor(routePlanner) {
        this.routePlanner = routePlanner;
        this.customRouter = new CustomOSRMRouter();
        this.useCustomInstance = true;
        
        // Check custom instance availability on init
        this.checkCustomInstance();
    }
    
    async checkCustomInstance() {
        const isHealthy = await this.customRouter.checkHealth();
        if (!isHealthy) {
            console.warn('Custom OSRM instance not available, using public API');
            this.useCustomInstance = false;
        } else {
            console.log('✅ Connected to custom OSRM instance');
        }
    }
    
    async calculateRoute(waypoints, options = {}) {
        const vehicleType = this.routePlanner.vehicleType || 'car';
        
        // Determine routing preferences
        const routingOptions = {
            avoid_highways: document.getElementById('avoidHighways')?.checked || false,
            avoid_tolls: document.getElementById('avoidTolls')?.checked || false,
            avoid_ferries: document.getElementById('avoidFerries')?.checked || false,
            alternatives: true
        };
        
        try {
            let route;
            
            if (this.useCustomInstance) {
                // Use custom instance with preferences
                route = await this.customRouter.getRoute(
                    waypoints,
                    vehicleType,
                    routingOptions
                );
            } else {
                // Fallback to standard routing
                route = await this.routePlanner.standardRouting(waypoints, vehicleType);
            }
            
            // Display route
            this.routePlanner.displayRoute(route);
            
            // Show any warnings
            if (route.metadata && route.metadata.warnings) {
                route.metadata.warnings.forEach(warning => {
                    this.routePlanner.showNotification(warning.message, 'warning');
                });
            }
            
            return route;
            
        } catch (error) {
            console.error('Routing failed:', error);
            this.routePlanner.showNotification('Unable to calculate route', 'error');
            throw error;
        }
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CustomOSRMRouter, OSRMRoutePlannerIntegration };
}