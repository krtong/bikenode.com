// GraphHopper Router Implementation
export class GraphHopperRouter {
    constructor() {
        this.serverUrl = 'https://graphhopper.com/api/1/route';
        this.apiKey = null; // Set this for public GraphHopper API
        this.customServer = null;
    }
    
    setServerUrl(url) {
        this.customServer = url;
    }
    
    setApiKey(key) {
        this.apiKey = key;
    }
    
    getServerUrl() {
        return this.customServer || this.serverUrl;
    }
    
    async calculateRoute(waypoints, vehicleType, preferences = {}) {
        const params = this.buildRequestParams(waypoints, vehicleType, preferences);
        
        try {
            const response = await fetch(this.getServerUrl(), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` })
                },
                body: JSON.stringify(params)
            });
            
            const data = await response.json();
            
            if (!data.paths || data.paths.length === 0) {
                throw new Error('No route found');
            }
            
            const path = data.paths[0];
            
            return {
                coordinates: this.decodePolyline(path.points),
                distance: path.distance,
                duration: path.time,
                ascent: path.ascend,
                descent: path.descend,
                instructions: this.convertInstructions(path.instructions),
                bbox: path.bbox,
                elevationData: path.elevation ? this.extractElevationData(path) : null,
                alternatives: data.paths.slice(1).map(p => ({
                    coordinates: this.decodePolyline(p.points),
                    distance: p.distance,
                    duration: p.time,
                    ascent: p.ascend,
                    descent: p.descend
                }))
            };
        } catch (error) {
            console.error('GraphHopper routing error:', error);
            throw error;
        }
    }
    
    buildRequestParams(waypoints, vehicleType, preferences) {
        const points = waypoints.map(wp => [wp.lng, wp.lat]);
        
        const params = {
            points: points,
            profile: this.getProfile(vehicleType, preferences),
            locale: 'en',
            instructions: true,
            calc_points: true,
            points_encoded: true,
            elevation: true,
            details: ['surface', 'road_class', 'road_environment']
        };
        
        // Add custom model for preferences
        if (Object.keys(preferences).length > 0) {
            params.custom_model = this.buildCustomModel(vehicleType, preferences);
        }
        
        // Alternative routes
        if (preferences.alternatives) {
            params.algorithm = 'alternative_route';
            params['alternative_route.max_paths'] = 3;
        }
        
        return params;
    }
    
    getProfile(vehicleType, preferences) {
        const profileMap = {
            car: 'car',
            motorcycle: 'car', // Use car profile with custom model
            bicycle: preferences.surfacePref === 'trails' ? 'mtb' : 'bike',
            foot: preferences.elevationPref === 'hilly' ? 'hike' : 'foot'
        };
        
        return profileMap[vehicleType] || 'car';
    }
    
    buildCustomModel(vehicleType, preferences) {
        const model = {
            speed: [],
            priority: [],
            avoid: {}
        };
        
        // Avoid highways
        if (preferences.avoidHighways) {
            model.speed.push({
                if: 'road_class == MOTORWAY',
                multiply_by: 0.1
            });
            model.priority.push({
                if: 'road_class == MOTORWAY',
                multiply_by: 0.1
            });
        }
        
        // Avoid tolls
        if (preferences.avoidTolls) {
            model.avoid.toll = true;
        }
        
        // Avoid ferries
        if (preferences.avoidFerries) {
            model.avoid.ferry = true;
        }
        
        // Surface preferences for bicycles
        if (vehicleType === 'bicycle') {
            if (preferences.surfacePref === 'paved') {
                model.priority.push({
                    if: 'surface == UNPAVED',
                    multiply_by: 0.3
                });
            } else if (preferences.surfacePref === 'gravel') {
                model.priority.push({
                    if: 'surface == GRAVEL',
                    multiply_by: 1.5
                });
            }
        }
        
        // Elevation preferences
        if (preferences.elevationPref === 'flat') {
            model.priority.push({
                if: 'grade > 5',
                multiply_by: 0.5
            });
        } else if (preferences.elevationPref === 'hilly') {
            model.priority.push({
                if: 'grade > 5',
                multiply_by: 1.5
            });
        }
        
        return model;
    }
    
    decodePolyline(encoded) {
        // GraphHopper uses standard Google polyline encoding
        const coords = [];
        let index = 0;
        let lat = 0;
        let lng = 0;
        
        while (index < encoded.length) {
            let shift = 0;
            let result = 0;
            let byte;
            
            do {
                byte = encoded.charCodeAt(index++) - 63;
                result |= (byte & 0x1f) << shift;
                shift += 5;
            } while (byte >= 0x20);
            
            const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
            lat += dlat;
            
            shift = 0;
            result = 0;
            
            do {
                byte = encoded.charCodeAt(index++) - 63;
                result |= (byte & 0x1f) << shift;
                shift += 5;
            } while (byte >= 0x20);
            
            const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
            lng += dlng;
            
            coords.push({
                lat: lat / 1e5,
                lng: lng / 1e5
            });
        }
        
        return coords;
    }
    
    convertInstructions(instructions) {
        if (!instructions) return [];
        
        return instructions.map(inst => ({
            type: this.convertInstructionType(inst.sign),
            text: inst.text,
            distance: inst.distance,
            duration: inst.time,
            streetName: inst.street_name,
            exit: inst.exit_number
        }));
    }
    
    convertInstructionType(sign) {
        const typeMap = {
            '-3': 'sharp-left',
            '-2': 'left',
            '-1': 'slight-left',
            '0': 'straight',
            '1': 'slight-right',
            '2': 'right',
            '3': 'sharp-right',
            '4': 'finish',
            '5': 'via-point',
            '6': 'roundabout'
        };
        
        return typeMap[sign] || 'continue';
    }
    
    extractElevationData(path) {
        if (!path.points_encoded || !path.elevation) return null;
        
        const coordinates = this.decodePolyline(path.points);
        const elevations = [];
        
        // GraphHopper provides elevation as part of the polyline (3D)
        // This is a simplified extraction
        for (let i = 0; i < coordinates.length; i++) {
            elevations.push({
                lat: coordinates[i].lat,
                lng: coordinates[i].lng,
                elevation: path.elevation[i] || 0
            });
        }
        
        return elevations;
    }
    
    async generateIsochrone(center, vehicleType, options = {}) {
        const params = {
            point: [center.lng, center.lat],
            profile: this.getProfile(vehicleType),
            time_limit: options.minutes * 60 || 600, // Default 10 minutes
            distance_limit: options.distance || -1,
            buckets: options.buckets || 3,
            reverse_flow: options.reverse || false
        };
        
        try {
            const response = await fetch(`${this.getServerUrl()}/isochrone`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` })
                },
                body: JSON.stringify(params)
            });
            
            const data = await response.json();
            
            return {
                polygons: data.polygons,
                center: center,
                buckets: data.info.buckets
            };
        } catch (error) {
            console.error('GraphHopper isochrone error:', error);
            throw error;
        }
    }
    
    async testConnection() {
        try {
            const testWaypoints = [
                { lat: 37.7749, lng: -122.4194 },
                { lat: 37.7751, lng: -122.4180 }
            ];
            
            await this.calculateRoute(testWaypoints, 'car');
            return { 
                serverUrl: this.getServerUrl(),
                version: 'GraphHopper 7.x',
                hasApiKey: !!this.apiKey
            };
        } catch (error) {
            throw new Error(`Connection test failed: ${error.message}`);
        }
    }
    
    supportsAlternatives() {
        return true;
    }
    
    supportsIsochrones() {
        return true;
    }
    
    supportsOptimization() {
        return true;
    }
    
    supportsElevation() {
        return true;
    }
    
    getSupportedVehicleTypes() {
        return ['car', 'motorcycle', 'bicycle', 'foot'];
    }
    
    getSupportedPreferences() {
        return [
            'avoidHighways',
            'avoidTolls', 
            'avoidFerries',
            'surfacePref',
            'elevationPref',
            'alternatives'
        ];
    }
    
    async optimizeRoute(waypoints, vehicleType, preferences = {}) {
        // GraphHopper's route optimization endpoint
        const params = {
            vehicles: [{
                vehicle_id: '1',
                start_address: {
                    location_id: 'start',
                    lon: waypoints[0].lng,
                    lat: waypoints[0].lat
                },
                type_id: vehicleType
            }],
            vehicle_types: [{
                type_id: vehicleType,
                profile: this.getProfile(vehicleType, preferences)
            }],
            services: waypoints.slice(1, -1).map((wp, i) => ({
                id: `service_${i}`,
                name: `Waypoint ${i + 1}`,
                address: {
                    location_id: `location_${i}`,
                    lon: wp.lng,
                    lat: wp.lat
                }
            }))
        };
        
        // Add end point if different from start
        const lastWp = waypoints[waypoints.length - 1];
        if (lastWp.lat !== waypoints[0].lat || lastWp.lng !== waypoints[0].lng) {
            params.vehicles[0].end_address = {
                location_id: 'end',
                lon: lastWp.lng,
                lat: lastWp.lat
            };
        }
        
        try {
            const response = await fetch(`${this.getServerUrl()}/optimize`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` })
                },
                body: JSON.stringify(params)
            });
            
            const data = await response.json();
            
            if (!data.solution) {
                throw new Error('No optimization solution found');
            }
            
            // Extract optimized waypoint order
            const optimizedOrder = data.solution.routes[0].activities.map(act => {
                const location = act.address;
                return { lat: location.lat, lng: location.lon };
            });
            
            // Calculate the actual route with optimized order
            return this.calculateRoute(optimizedOrder, vehicleType, preferences);
        } catch (error) {
            console.error('GraphHopper optimization error:', error);
            // Fallback to regular routing
            return this.calculateRoute(waypoints, vehicleType, preferences);
        }
    }
}