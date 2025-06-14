// BRouter Engine Implementation
import { BROUTER_API } from '../../../../../config/api-config.js';

export class BRouterEngine {
    constructor() {
        this.serverUrl = BROUTER_API;
        this.customServer = null;
        this.profiles = {
            'road': 'fastbike',
            'gravel': 'gravel',
            'mtb': 'mtb',
            'trekking': 'trekking',
            'city': 'safety',
            'shortest': 'shortest'
        };
    }
    
    setServerUrl(url) {
        this.customServer = url;
    }
    
    getServerUrl() {
        return this.customServer || this.serverUrl;
    }
    
    async calculateRoute(waypoints, vehicleType, preferences = {}) {
        if (vehicleType !== 'bicycle') {
            throw new Error('BRouter only supports bicycle routing');
        }
        
        const profile = this.getProfile(preferences);
        const lonlats = waypoints.map(wp => `${wp.lng},${wp.lat}`).join('|');
        
        const params = new URLSearchParams({
            lonlats: lonlats,
            profile: profile,
            alternativeidx: preferences.alternatives ? '0' : '',
            format: 'geojson'
        });
        
        // Add custom parameters based on preferences
        if (preferences.nogo) {
            params.append('nogo', preferences.nogo);
        }
        
        if (preferences.maxHeight) {
            params.append('maxheight', preferences.maxHeight);
        }
        
        // Add custom MTB parameters if available
        if (this.customMTBParams && preferences.mtb) {
            params.append('profile', this.customMTBParams.customProfile);
            this.customMTBParams.profileParams.forEach(param => {
                params.append('param', param);
            });
        }
        
        try {
            const response = await fetch(`${this.getServerUrl()}/brouter?${params}`);
            const data = await response.json();
            
            if (data.type !== 'FeatureCollection' || !data.features.length) {
                throw new Error('No route found');
            }
            
            const feature = data.features[0];
            const props = feature.properties;
            
            return {
                coordinates: feature.geometry.coordinates.map(coord => ({
                    lat: coord[1],
                    lng: coord[0],
                    elevation: coord[2]
                })),
                distance: props['track-length'],
                duration: props['total-time'] * 1000, // Convert to milliseconds
                ascent: props['filtered ascend'],
                descent: props['filtered descend'],
                energy: props['total-energy'],
                costPerKm: props['cost-per-km'],
                messages: props.messages || [],
                waypoints: this.extractWaypoints(data),
                surfaceBreakdown: this.extractSurfaceBreakdown(props),
                wayTypes: this.extractWayTypes(props),
                alternatives: this.extractAlternatives(data)
            };
        } catch (error) {
            console.error('BRouter routing error:', error);
            throw error;
        }
    }
    
    getProfile(preferences) {
        // Check for custom MTB profile first
        if (preferences.mtb && this.customMTBParams) {
            const mtbStyle = preferences.mtb.style;
            
            // Use specific MTB profiles based on riding style
            switch (mtbStyle) {
                case 'xc':
                    return 'mtb-xc';
                case 'downhill':
                    return 'mtb-downhill';
                case 'enduro':
                    return 'mtb-enduro';
                default:
                    return 'mtb-singletrack';
            }
        }
        
        // Select profile based on preferences
        if (preferences.surfacePref === 'trails') {
            return this.profiles.mtb;
        } else if (preferences.surfacePref === 'gravel') {
            return this.profiles.gravel;
        } else if (preferences.shortest) {
            return this.profiles.shortest;
        } else if (preferences.safe) {
            return this.profiles.city;
        } else if (preferences.touring) {
            return this.profiles.trekking;
        }
        
        return this.profiles.road;
    }
    
    extractWaypoints(data) {
        const waypoints = [];
        
        data.features.forEach(feature => {
            if (feature.properties.name && feature.properties.name.startsWith('WP')) {
                waypoints.push({
                    name: feature.properties.name,
                    lat: feature.geometry.coordinates[1],
                    lng: feature.geometry.coordinates[0],
                    elevation: feature.geometry.coordinates[2]
                });
            }
        });
        
        return waypoints;
    }
    
    extractSurfaceBreakdown(props) {
        const surfaces = {
            paved: 0,
            gravel: 0,
            dirt: 0,
            path: 0
        };
        
        // BRouter provides way type statistics in properties
        if (props.way_type_statistics) {
            const stats = props.way_type_statistics;
            surfaces.paved = stats.paved || 0;
            surfaces.gravel = stats.gravel || 0;
            surfaces.dirt = stats.ground || 0;
            surfaces.path = stats.path || 0;
        }
        
        return surfaces;
    }
    
    extractWayTypes(props) {
        const wayTypes = {};
        
        // Extract way type percentages from BRouter output
        if (props.way_types) {
            Object.entries(props.way_types).forEach(([type, distance]) => {
                wayTypes[type] = {
                    distance: distance,
                    percentage: (distance / props['track-length'] * 100).toFixed(1)
                };
            });
        }
        
        return wayTypes;
    }
    
    extractAlternatives(data) {
        const alternatives = [];
        
        // BRouter can return multiple routes in the feature collection
        if (data.features.length > 1) {
            data.features.slice(1).forEach(feature => {
                const props = feature.properties;
                alternatives.push({
                    coordinates: feature.geometry.coordinates.map(coord => ({
                        lat: coord[1],
                        lng: coord[0],
                        elevation: coord[2]
                    })),
                    distance: props['track-length'],
                    duration: props['total-time'] * 1000,
                    ascent: props['filtered ascend'],
                    descent: props['filtered descend']
                });
            });
        }
        
        return alternatives;
    }
    
    async getElevationProfile(waypoints, preferences = {}) {
        // BRouter includes elevation in route calculation
        const result = await this.calculateRoute(waypoints, 'bicycle', preferences);
        
        return {
            points: result.coordinates,
            stats: {
                totalAscent: result.ascent,
                totalDescent: result.descent,
                maxElevation: Math.max(...result.coordinates.map(p => p.elevation)),
                minElevation: Math.min(...result.coordinates.map(p => p.elevation))
            }
        };
    }
    
    async testConnection() {
        try {
            // Test with a simple status request
            const response = await fetch(`${this.getServerUrl()}/brouter/profile`);
            const profiles = await response.text();
            
            return {
                serverUrl: this.getServerUrl(),
                version: 'BRouter 1.7.x',
                availableProfiles: profiles.split('\n').filter(p => p.length > 0)
            };
        } catch (error) {
            throw new Error(`Connection test failed: ${error.message}`);
        }
    }
    
    supportsAlternatives() {
        return true;
    }
    
    supportsIsochrones() {
        return false; // BRouter doesn't support isochrones
    }
    
    supportsOptimization() {
        return false; // BRouter doesn't support waypoint optimization
    }
    
    supportsElevation() {
        return true; // BRouter always includes elevation
    }
    
    getSupportedVehicleTypes() {
        return ['bicycle']; // BRouter is bicycle-only
    }
    
    getSupportedPreferences() {
        return [
            'surfacePref',
            'elevationPref',
            'alternatives',
            'shortest',
            'safe',
            'touring',
            'nogo',
            'maxHeight'
        ];
    }
    
    // BRouter-specific methods
    async getProfiles() {
        try {
            const response = await fetch(`${this.getServerUrl()}/brouter/profile`);
            const profiles = await response.text();
            return profiles.split('\n').filter(p => p.length > 0);
        } catch (error) {
            console.error('Failed to fetch profiles:', error);
            return Object.values(this.profiles);
        }
    }
    
    async uploadCustomProfile(name, content) {
        try {
            const response = await fetch(`${this.getServerUrl()}/brouter/profile/${name}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/plain'
                },
                body: content
            });
            
            return response.ok;
        } catch (error) {
            console.error('Failed to upload profile:', error);
            return false;
        }
    }
    
    createNogoArea(polygon) {
        // Convert polygon to BRouter nogo format
        // Format: lng1,lat1|lng2,lat2|...
        return polygon.map(point => `${point.lng},${point.lat}`).join('|');
    }
}