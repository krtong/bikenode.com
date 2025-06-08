// Valhalla Router Implementation
export class ValhallaRouter {
    constructor() {
        this.serverUrl = 'http://localhost:8002';
        this.customServer = null;
    }
    
    setServerUrl(url) {
        this.customServer = url;
    }
    
    getServerUrl() {
        return this.customServer || this.serverUrl;
    }
    
    async calculateRoute(waypoints, vehicleType, preferences = {}) {
        const request = this.buildRouteRequest(waypoints, vehicleType, preferences);
        
        try {
            const response = await fetch(`${this.getServerUrl()}/route`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(request)
            });
            
            const data = await response.json();
            
            if (!data.trip) {
                throw new Error(data.error || 'No route found');
            }
            
            const trip = data.trip;
            
            return {
                coordinates: this.decodePolyline(trip.legs[0].shape),
                distance: trip.summary.length * 1000, // Convert km to meters
                duration: trip.summary.time,
                ascent: trip.summary.elevation_gain,
                descent: trip.summary.elevation_loss,
                instructions: this.convertManeuvers(trip.legs[0].maneuvers),
                surfaceBreakdown: this.extractSurfaceBreakdown(trip.legs[0]),
                alternatives: data.alternates ? data.alternates.map(alt => ({
                    coordinates: this.decodePolyline(alt.trip.legs[0].shape),
                    distance: alt.trip.summary.length * 1000,
                    duration: alt.trip.summary.time
                })) : []
            };
        } catch (error) {
            console.error('Valhalla routing error:', error);
            throw error;
        }
    }
    
    buildRouteRequest(waypoints, vehicleType, preferences) {
        const locations = waypoints.map(wp => ({
            lat: wp.lat,
            lon: wp.lng
        }));
        
        const costing = this.getCosting(vehicleType, preferences);
        const costingOptions = this.buildCostingOptions(vehicleType, preferences);
        
        const request = {
            locations: locations,
            costing: costing,
            costing_options: {
                [costing]: costingOptions
            },
            directions_options: {
                units: 'kilometers',
                language: 'en-US'
            },
            alternates: preferences.alternatives ? 3 : 0
        };
        
        // Add custom costing model if specified
        if (preferences.customCosting) {
            request.costing = preferences.customCosting;
        }
        
        return request;
    }
    
    getCosting(vehicleType, preferences) {
        // Check for custom costing models first
        if (preferences.offroad && vehicleType === 'motorcycle') {
            return 'motorcycle_offroad';
        }
        
        const costingMap = {
            car: preferences.avoidHighways ? 'auto_no_highway' : 'auto',
            motorcycle: preferences.touring ? 'motorcycle_touring' : 'motorcycle',
            bicycle: this.getBicycleCosting(preferences),
            foot: preferences.hiking ? 'pedestrian_hike' : 'pedestrian'
        };
        
        return costingMap[vehicleType] || 'auto';
    }
    
    getBicycleCosting(preferences) {
        if (preferences.surfacePref === 'trails' || preferences.mountain) {
            return 'bicycle_mountain';
        } else if (preferences.surfacePref === 'gravel') {
            return 'bicycle_gravel';
        } else if (preferences.commute) {
            return 'bicycle_commute';
        }
        return 'bicycle_road';
    }
    
    buildCostingOptions(vehicleType, preferences) {
        const options = {};
        
        // Common options
        if (preferences.avoidTolls) {
            options.use_tolls = 0.0;
        }
        
        if (preferences.avoidFerries) {
            options.use_ferry = 0.0;
        }
        
        if (preferences.avoidHighways) {
            options.use_highways = 0.0;
        }
        
        // Vehicle-specific options
        switch (vehicleType) {
            case 'bicycle':
                options.bicycle_type = this.getBicycleType(preferences);
                options.cycling_speed = preferences.speed || 20.0;
                options.use_roads = preferences.surfacePref === 'trails' ? 0.3 : 0.8;
                options.avoid_bad_surfaces = preferences.surfacePref === 'paved' ? 0.9 : 0.3;
                
                if (preferences.elevationPref === 'flat') {
                    options.use_hills = 0.2;
                } else if (preferences.elevationPref === 'hilly') {
                    options.use_hills = 0.8;
                }
                break;
                
            case 'motorcycle':
                options.use_highways = preferences.avoidHighways ? 0.0 : 0.8;
                options.use_trails = preferences.offroad ? 0.8 : 0.0;
                options.avoid_bad_surfaces = preferences.offroad ? 0.0 : 0.5;
                break;
                
            case 'foot':
                options.walking_speed = preferences.speed || 5.0;
                options.max_hiking_difficulty = preferences.hiking ? 6 : 1;
                options.use_lit = preferences.night ? 1.0 : 0.0;
                break;
        }
        
        return options;
    }
    
    getBicycleType(preferences) {
        if (preferences.surfacePref === 'trails') return 'Mountain';
        if (preferences.surfacePref === 'gravel') return 'Hybrid';
        if (preferences.commute) return 'City';
        return 'Road';
    }
    
    decodePolyline(encoded) {
        // Valhalla uses precision 6 for polyline encoding
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
                lat: lat / 1e6,
                lng: lng / 1e6
            });
        }
        
        return coords;
    }
    
    convertManeuvers(maneuvers) {
        if (!maneuvers) return [];
        
        return maneuvers.map(man => ({
            type: this.convertManeuverType(man.type),
            instruction: man.instruction,
            distance: man.length * 1000, // Convert km to meters
            duration: man.time,
            streetName: man.street_names ? man.street_names[0] : '',
            modifier: man.modifier
        }));
    }
    
    convertManeuverType(type) {
        const typeMap = {
            0: 'none',
            1: 'start',
            2: 'start-right',
            3: 'start-left',
            4: 'destination',
            5: 'destination-right',
            6: 'destination-left',
            7: 'becomes',
            8: 'continue',
            9: 'slight-right',
            10: 'right',
            11: 'sharp-right',
            12: 'uturn-right',
            13: 'uturn-left',
            14: 'sharp-left',
            15: 'left',
            16: 'slight-left',
            17: 'ramp-straight',
            18: 'ramp-right',
            19: 'ramp-left',
            20: 'exit-right',
            21: 'exit-left',
            22: 'stay-straight',
            23: 'stay-right',
            24: 'stay-left',
            25: 'merge',
            26: 'roundabout-enter',
            27: 'roundabout-exit',
            28: 'ferry-enter',
            29: 'ferry-exit'
        };
        
        return typeMap[type] || 'continue';
    }
    
    extractSurfaceBreakdown(leg) {
        // Extract surface information from Valhalla's edge annotations
        const surfaces = {
            paved: 0,
            gravel: 0,
            dirt: 0
        };
        
        // This would normally parse edge.surface from annotations
        // For now, return mock data
        return surfaces;
    }
    
    async generateIsochrone(center, vehicleType, options = {}) {
        const costing = this.getCosting(vehicleType, options.preferences || {});
        
        const request = {
            locations: [{
                lat: center.lat,
                lon: center.lng
            }],
            costing: costing,
            contours: [{
                time: options.minutes || 10,
                color: 'ff0000'
            }],
            polygons: true,
            denoise: 1.0,
            generalize: 50
        };
        
        try {
            const response = await fetch(`${this.getServerUrl()}/isochrone`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(request)
            });
            
            const data = await response.json();
            
            return {
                features: data.features,
                center: center,
                time: options.minutes
            };
        } catch (error) {
            console.error('Valhalla isochrone error:', error);
            throw error;
        }
    }
    
    async optimizeRoute(waypoints, vehicleType, preferences = {}) {
        const locations = waypoints.map(wp => ({
            lat: wp.lat,
            lon: wp.lng
        }));
        
        const request = {
            locations: locations,
            costing: this.getCosting(vehicleType, preferences),
            costing_options: {
                [this.getCosting(vehicleType, preferences)]: this.buildCostingOptions(vehicleType, preferences)
            }
        };
        
        try {
            const response = await fetch(`${this.getServerUrl()}/optimized_route`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(request)
            });
            
            const data = await response.json();
            
            if (!data.trip) {
                throw new Error('No optimized route found');
            }
            
            // Convert to standard format
            return {
                coordinates: this.decodePolyline(data.trip.legs[0].shape),
                distance: data.trip.summary.length * 1000,
                duration: data.trip.summary.time,
                optimizedOrder: data.trip.locations.map(loc => ({
                    lat: loc.lat,
                    lng: loc.lon
                }))
            };
        } catch (error) {
            console.error('Valhalla optimization error:', error);
            // Fallback to regular routing
            return this.calculateRoute(waypoints, vehicleType, preferences);
        }
    }
    
    async testConnection() {
        try {
            const response = await fetch(`${this.getServerUrl()}/status`);
            const data = await response.json();
            
            return {
                serverUrl: this.getServerUrl(),
                version: data.version || 'Valhalla 3.x',
                tileset: data.tileset_last_modified
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
            'alternatives',
            'customCosting',
            'offroad',
            'touring',
            'hiking',
            'mountain',
            'commute',
            'speed',
            'night'
        ];
    }
}