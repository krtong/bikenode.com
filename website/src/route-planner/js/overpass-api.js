// Overpass API Integration for OpenStreetMap Data Queries

export class OverpassAPI {
    constructor() {
        this.endpoints = [
            'https://overpass-api.de/api/interpreter',
            'https://overpass.kumi.systems/api/interpreter',
            'https://overpass.openstreetmap.ru/api/interpreter'
        ];
        this.currentEndpoint = 0;
        this.cache = new Map();
        this.maxCacheSize = 50;
        this.cacheTimeout = 3600000; // 1 hour
    }
    
    async query(overpassQL, options = {}) {
        const cacheKey = this.getCacheKey(overpassQL);
        const cached = this.getFromCache(cacheKey);
        
        if (cached) {
            console.log('Returning cached Overpass result');
            return cached;
        }
        
        try {
            const result = await this.executeQuery(overpassQL, options);
            this.addToCache(cacheKey, result);
            return result;
        } catch (error) {
            console.error('Overpass API error:', error);
            
            // Try next endpoint
            this.currentEndpoint = (this.currentEndpoint + 1) % this.endpoints.length;
            
            // Retry with next endpoint
            if (options.retry !== false) {
                return this.query(overpassQL, { ...options, retry: false });
            }
            
            throw error;
        }
    }
    
    async executeQuery(overpassQL, options = {}) {
        const endpoint = this.endpoints[this.currentEndpoint];
        const timeout = options.timeout || 30;
        
        // Add timeout to query if not present
        let query = overpassQL;
        if (!query.includes('[timeout:')) {
            query = `[out:json][timeout:${timeout}];${query}`;
        }
        
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: `data=${encodeURIComponent(query)}`
        });
        
        if (!response.ok) {
            throw new Error(`Overpass API error: ${response.status}`);
        }
        
        const data = await response.json();
        return data.elements || [];
    }
    
    // Find bike shops near a route
    async findBikeShops(bounds, maxDistance = 5000) {
        const query = `
            [out:json][timeout:30];
            (
                node["shop"="bicycle"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
                way["shop"="bicycle"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
                node["amenity"="bicycle_repair_station"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
                node["service:bicycle:repair"="yes"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
            );
            out body;
            >;
            out skel qt;
        `;
        
        const elements = await this.query(query);
        
        return elements.map(element => ({
            id: element.id,
            type: element.type,
            lat: element.lat || element.center?.lat,
            lng: element.lon || element.center?.lon,
            name: element.tags?.name || 'Bike Shop',
            amenity: element.tags?.amenity,
            shop: element.tags?.shop,
            repair: element.tags?.['service:bicycle:repair'],
            opening_hours: element.tags?.opening_hours,
            phone: element.tags?.phone,
            website: element.tags?.website,
            tags: element.tags
        })).filter(shop => shop.lat && shop.lng);
    }
    
    // Find water sources (fountains, taps)
    async findWaterSources(bounds) {
        const query = `
            [out:json][timeout:30];
            (
                node["amenity"="drinking_water"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
                node["drinking_water"="yes"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
                node["amenity"="water_point"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
                node["amenity"="fountain"]["drinking_water"!="no"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
            );
            out body;
        `;
        
        const elements = await this.query(query);
        
        return elements.map(element => ({
            id: element.id,
            lat: element.lat,
            lng: element.lon,
            type: element.tags?.amenity || 'water',
            name: element.tags?.name || 'Water Source',
            drinking_water: element.tags?.drinking_water !== 'no',
            access: element.tags?.access || 'yes',
            description: element.tags?.description,
            tags: element.tags
        }));
    }
    
    // Find scenic viewpoints
    async findViewpoints(bounds) {
        const query = `
            [out:json][timeout:30];
            (
                node["tourism"="viewpoint"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
                node["natural"="peak"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
                node["tourism"="attraction"]["natural"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
            );
            out body;
        `;
        
        const elements = await this.query(query);
        
        return elements.map(element => ({
            id: element.id,
            lat: element.lat,
            lng: element.lon,
            type: element.tags?.tourism || element.tags?.natural || 'viewpoint',
            name: element.tags?.name || 'Viewpoint',
            elevation: element.tags?.ele,
            description: element.tags?.description,
            wikipedia: element.tags?.wikipedia,
            tags: element.tags
        }));
    }
    
    // Find MTB trails
    async findMTBTrails(bounds, difficulties = []) {
        let difficultyFilter = '';
        if (difficulties.length > 0) {
            difficultyFilter = difficulties.map(d => `["mtb:scale"="${d}"]`).join('');
        }
        
        const query = `
            [out:json][timeout:30];
            (
                way["highway"="path"]["bicycle"!="no"]${difficultyFilter}(${bounds.south},${bounds.west},${bounds.north},${bounds.east});
                way["highway"="track"]["bicycle"!="no"]${difficultyFilter}(${bounds.south},${bounds.west},${bounds.north},${bounds.east});
                way["singletrack"="yes"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
                way["mtb"="yes"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
            );
            out body;
            >;
            out skel qt;
        `;
        
        const elements = await this.query(query);
        
        return this.processMTBTrails(elements);
    }
    
    processMTBTrails(elements) {
        const ways = elements.filter(e => e.type === 'way');
        const nodes = elements.filter(e => e.type === 'node');
        
        // Create node lookup
        const nodeMap = new Map();
        nodes.forEach(node => {
            nodeMap.set(node.id, { lat: node.lat, lng: node.lon });
        });
        
        return ways.map(way => {
            const coordinates = way.nodes.map(nodeId => nodeMap.get(nodeId)).filter(Boolean);
            
            return {
                id: way.id,
                name: way.tags?.name || 'Trail',
                difficulty: way.tags?.['mtb:scale'],
                difficulty_uphill: way.tags?.['mtb:scale:uphill'],
                surface: way.tags?.surface,
                singletrack: way.tags?.singletrack === 'yes',
                width: way.tags?.width,
                highway: way.tags?.highway,
                tracktype: way.tags?.tracktype,
                smoothness: way.tags?.smoothness,
                coordinates: coordinates,
                length: this.calculateLength(coordinates),
                tags: way.tags
            };
        });
    }
    
    // Find restaurants/cafes for breaks
    async findRestStops(bounds) {
        const query = `
            [out:json][timeout:30];
            (
                node["amenity"="cafe"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
                node["amenity"="restaurant"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
                node["amenity"="pub"]["food"="yes"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
                node["amenity"="fast_food"]["outdoor_seating"="yes"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
            );
            out body;
        `;
        
        const elements = await this.query(query);
        
        return elements.map(element => ({
            id: element.id,
            lat: element.lat,
            lng: element.lon,
            type: element.tags?.amenity,
            name: element.tags?.name || 'Rest Stop',
            cuisine: element.tags?.cuisine,
            opening_hours: element.tags?.opening_hours,
            outdoor_seating: element.tags?.outdoor_seating === 'yes',
            wheelchair: element.tags?.wheelchair,
            website: element.tags?.website,
            phone: element.tags?.phone,
            tags: element.tags
        }));
    }
    
    // Find parking areas for route start points
    async findParking(center, radius = 1000) {
        const query = `
            [out:json][timeout:30];
            (
                node["amenity"="parking"](around:${radius},${center.lat},${center.lng});
                way["amenity"="parking"](around:${radius},${center.lat},${center.lng});
                node["amenity"="bicycle_parking"](around:${radius},${center.lat},${center.lng});
            );
            out body;
            >;
            out skel qt;
        `;
        
        const elements = await this.query(query);
        
        return elements.filter(e => e.tags?.amenity).map(element => ({
            id: element.id,
            lat: element.lat || element.center?.lat,
            lng: element.lon || element.center?.lon,
            type: element.tags?.amenity,
            name: element.tags?.name || 'Parking',
            fee: element.tags?.fee,
            access: element.tags?.access,
            capacity: element.tags?.capacity,
            bicycle_parking: element.tags?.bicycle_parking,
            covered: element.tags?.covered,
            tags: element.tags
        })).filter(parking => parking.lat && parking.lng);
    }
    
    // Get surface information for a route
    async getRouteSurfaces(coordinates, bufferMeters = 10) {
        // Sample coordinates to reduce query size
        const sampledCoords = this.sampleCoordinates(coordinates, 50);
        const bbox = this.calculateBBox(sampledCoords, bufferMeters);
        
        const query = `
            [out:json][timeout:30];
            (
                way["highway"]["surface"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
                way["highway"]["tracktype"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
            );
            out body;
            >;
            out skel qt;
        `;
        
        const elements = await this.query(query);
        const ways = elements.filter(e => e.type === 'way');
        
        // Analyze surface types
        const surfaces = {};
        ways.forEach(way => {
            const surface = way.tags?.surface || 'unknown';
            const tracktype = way.tags?.tracktype;
            
            const category = this.categorizeSurface(surface, tracktype);
            surfaces[category] = (surfaces[category] || 0) + 1;
        });
        
        return surfaces;
    }
    
    categorizeSurface(surface, tracktype) {
        // Categorize surfaces into main types
        const paved = ['asphalt', 'concrete', 'paved', 'paving_stones'];
        const gravel = ['gravel', 'fine_gravel', 'compacted'];
        const dirt = ['dirt', 'earth', 'ground', 'mud', 'sand'];
        
        if (paved.includes(surface)) return 'paved';
        if (gravel.includes(surface)) return 'gravel';
        if (dirt.includes(surface)) return 'dirt';
        
        // Use tracktype as fallback
        if (tracktype) {
            switch (tracktype) {
                case 'grade1': return 'paved';
                case 'grade2': return 'gravel';
                case 'grade3': return 'gravel';
                case 'grade4': return 'dirt';
                case 'grade5': return 'dirt';
            }
        }
        
        return 'unknown';
    }
    
    // Utility functions
    calculateBBox(coordinates, bufferMeters = 0) {
        let minLat = Infinity, maxLat = -Infinity;
        let minLng = Infinity, maxLng = -Infinity;
        
        coordinates.forEach(coord => {
            minLat = Math.min(minLat, coord.lat);
            maxLat = Math.max(maxLat, coord.lat);
            minLng = Math.min(minLng, coord.lng);
            maxLng = Math.max(maxLng, coord.lng);
        });
        
        // Add buffer in degrees (approximate)
        const bufferDeg = bufferMeters / 111000;
        
        return {
            south: minLat - bufferDeg,
            north: maxLat + bufferDeg,
            west: minLng - bufferDeg,
            east: maxLng + bufferDeg
        };
    }
    
    sampleCoordinates(coordinates, maxPoints) {
        if (coordinates.length <= maxPoints) return coordinates;
        
        const interval = Math.floor(coordinates.length / maxPoints);
        const sampled = [];
        
        for (let i = 0; i < coordinates.length; i += interval) {
            sampled.push(coordinates[i]);
        }
        
        // Always include last point
        if (sampled[sampled.length - 1] !== coordinates[coordinates.length - 1]) {
            sampled.push(coordinates[coordinates.length - 1]);
        }
        
        return sampled;
    }
    
    calculateLength(coordinates) {
        let length = 0;
        for (let i = 1; i < coordinates.length; i++) {
            length += this.haversineDistance(coordinates[i-1], coordinates[i]);
        }
        return length;
    }
    
    haversineDistance(coord1, coord2) {
        const R = 6371000; // Earth radius in meters
        const φ1 = coord1.lat * Math.PI / 180;
        const φ2 = coord2.lat * Math.PI / 180;
        const Δφ = (coord2.lat - coord1.lat) * Math.PI / 180;
        const Δλ = (coord2.lng - coord1.lng) * Math.PI / 180;
        
        const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                  Math.cos(φ1) * Math.cos(φ2) *
                  Math.sin(Δλ/2) * Math.sin(Δλ/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        
        return R * c;
    }
    
    getCacheKey(query) {
        return `overpass:${this.hashString(query)}`;
    }
    
    hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString(36);
    }
    
    getFromCache(key) {
        const cached = this.cache.get(key);
        if (!cached) return null;
        
        if (Date.now() - cached.timestamp > this.cacheTimeout) {
            this.cache.delete(key);
            return null;
        }
        
        return cached.data;
    }
    
    addToCache(key, data) {
        if (this.cache.size >= this.maxCacheSize) {
            // Remove oldest entry
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        
        this.cache.set(key, {
            data: data,
            timestamp: Date.now()
        });
    }
}

// Export singleton instance
export const overpassAPI = new OverpassAPI();