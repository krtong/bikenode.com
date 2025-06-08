/**
 * POI Search Along Routes Implementation
 * Uses Overpass API to find points of interest near the route
 */

class RoutePOISearcher {
    constructor() {
        this.overpassUrl = 'https://overpass-api.de/api/interpreter';
        this.poiCache = new Map();
        this.searchRadius = 1000; // meters from route
        
        // Define POI categories and their OSM tags
        this.poiCategories = {
            bikeShops: {
                name: 'Bike Shops',
                icon: '🚲',
                color: '#4CAF50',
                tags: {
                    shop: ['bicycle', 'sports'],
                    amenity: ['bicycle_repair_station'],
                    service: ['bicycle:repair']
                }
            },
            waterSources: {
                name: 'Water Sources',
                icon: '💧',
                color: '#2196F3',
                tags: {
                    amenity: ['drinking_water', 'water_point', 'fountain'],
                    man_made: ['water_tap', 'water_well']
                }
            },
            foodStops: {
                name: 'Food & Cafes',
                icon: '☕',
                color: '#FF9800',
                tags: {
                    amenity: ['cafe', 'restaurant', 'fast_food', 'pub', 'bar'],
                    shop: ['bakery', 'convenience']
                }
            },
            restrooms: {
                name: 'Restrooms',
                icon: '🚻',
                color: '#9C27B0',
                tags: {
                    amenity: ['toilets']
                }
            },
            gasStations: {
                name: 'Gas Stations',
                icon: '⛽',
                color: '#F44336',
                tags: {
                    amenity: ['fuel'],
                    shop: ['gas']
                }
            },
            viewpoints: {
                name: 'Scenic Viewpoints',
                icon: '📸',
                color: '#FF5722',
                tags: {
                    tourism: ['viewpoint', 'picnic_site'],
                    amenity: ['bench'],
                    natural: ['peak']
                }
            },
            accommodation: {
                name: 'Hotels & Camping',
                icon: '🏨',
                color: '#3F51B5',
                tags: {
                    tourism: ['hotel', 'motel', 'hostel', 'guest_house', 'camp_site', 'caravan_site'],
                    amenity: ['shelter']
                }
            },
            bikePumps: {
                name: 'Bike Pumps & Tools',
                icon: '🔧',
                color: '#795548',
                tags: {
                    amenity: ['compressed_air', 'bicycle_repair_station'],
                    service: ['bicycle:pump', 'bicycle:chain_tool']
                }
            },
            parking: {
                name: 'Bike Parking',
                icon: '🅿️',
                color: '#607D8B',
                tags: {
                    amenity: ['bicycle_parking'],
                    bicycle_parking: ['*']
                }
            },
            medical: {
                name: 'Medical Services',
                icon: '🏥',
                color: '#E91E63',
                tags: {
                    amenity: ['hospital', 'clinic', 'doctors', 'pharmacy']
                }
            },
            atm: {
                name: 'ATMs & Banks',
                icon: '💰',
                color: '#009688',
                tags: {
                    amenity: ['atm', 'bank']
                }
            },
            chargingStations: {
                name: 'E-Bike Charging',
                icon: '🔌',
                color: '#8BC34A',
                tags: {
                    amenity: ['charging_station'],
                    bicycle: ['yes']
                }
            }
        };
    }
    
    /**
     * Search for POIs along a route
     * @param {Array} routeCoordinates - Array of {lat, lng} points
     * @param {Array} categories - POI categories to search for
     * @param {Object} options - Search options
     */
    async searchAlongRoute(routeCoordinates, categories = ['bikeShops', 'waterSources'], options = {}) {
        const searchRadius = options.radius || this.searchRadius;
        const maxResults = options.maxResults || 100;
        
        console.log('🔍 Searching for POIs along route...');
        
        // Create route buffer polygon
        const routeBuffer = this.createRouteBuffer(routeCoordinates, searchRadius);
        
        // Build Overpass query
        const query = this.buildPOIQuery(routeBuffer, categories);
        
        // Check cache first
        const cacheKey = this.getCacheKey(routeBuffer, categories);
        if (this.poiCache.has(cacheKey)) {
            console.log('📦 Using cached POI results');
            return this.poiCache.get(cacheKey);
        }
        
        try {
            // Execute query
            const response = await fetch(this.overpassUrl, {
                method: 'POST',
                body: `data=${encodeURIComponent(query)}`,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });
            
            const data = await response.json();
            
            // Process results
            const pois = this.processPOIResults(data, categories, routeCoordinates);
            
            // Filter and sort by distance from route
            const filteredPOIs = this.filterAndSortPOIs(pois, routeCoordinates, maxResults);
            
            // Cache results
            this.poiCache.set(cacheKey, filteredPOIs);
            
            return filteredPOIs;
            
        } catch (error) {
            console.error('Error searching for POIs:', error);
            return { error: error.message, pois: [] };
        }
    }
    
    /**
     * Create a buffer polygon around the route
     */
    createRouteBuffer(coordinates, radius) {
        // Simplified approach - create bounding box with buffer
        let minLat = Infinity, maxLat = -Infinity;
        let minLng = Infinity, maxLng = -Infinity;
        
        coordinates.forEach(coord => {
            minLat = Math.min(minLat, coord.lat);
            maxLat = Math.max(maxLat, coord.lat);
            minLng = Math.min(minLng, coord.lng);
            maxLng = Math.max(maxLng, coord.lng);
        });
        
        // Add buffer in degrees (rough approximation)
        const bufferDegrees = radius / 111111; // 1 degree ≈ 111km
        
        return {
            south: minLat - bufferDegrees,
            west: minLng - bufferDegrees,
            north: maxLat + bufferDegrees,
            east: maxLng + bufferDegrees
        };
    }
    
    /**
     * Build Overpass query for POIs
     */
    buildPOIQuery(bbox, categories) {
        const bounds = `${bbox.south},${bbox.west},${bbox.north},${bbox.east}`;
        
        let tagQueries = [];
        
        categories.forEach(categoryKey => {
            const category = this.poiCategories[categoryKey];
            if (!category) return;
            
            Object.entries(category.tags).forEach(([key, values]) => {
                values.forEach(value => {
                    if (value === '*') {
                        tagQueries.push(`node["${key}"](${bounds});`);
                        tagQueries.push(`way["${key}"](${bounds});`);
                    } else {
                        tagQueries.push(`node["${key}"="${value}"](${bounds});`);
                        tagQueries.push(`way["${key}"="${value}"](${bounds});`);
                    }
                });
            });
        });
        
        return `
            [out:json][timeout:25];
            (
                ${tagQueries.join('\n                ')}
            );
            out body;
            >;
            out skel qt;
        `;
    }
    
    /**
     * Process POI results from Overpass
     */
    processPOIResults(overpassData, categories, routeCoordinates) {
        const pois = [];
        const processedIds = new Set();
        
        overpassData.elements.forEach(element => {
            // Skip if already processed
            if (processedIds.has(element.id)) return;
            processedIds.add(element.id);
            
            // Get POI details
            const poi = this.extractPOIDetails(element, categories);
            if (!poi) return;
            
            // Calculate distance to route
            poi.distanceToRoute = this.calculateDistanceToRoute(poi, routeCoordinates);
            
            // Add route position (closest point on route)
            poi.routePosition = this.findClosestRoutePosition(poi, routeCoordinates);
            
            pois.push(poi);
        });
        
        return pois;
    }
    
    /**
     * Extract POI details from OSM element
     */
    extractPOIDetails(element, categories) {
        if (!element.tags) return null;
        
        let poiCategory = null;
        let matchedTag = null;
        
        // Find which category this POI belongs to
        for (const categoryKey of categories) {
            const category = this.poiCategories[categoryKey];
            if (!category) continue;
            
            for (const [tagKey, tagValues] of Object.entries(category.tags)) {
                if (element.tags[tagKey]) {
                    if (tagValues.includes('*') || tagValues.includes(element.tags[tagKey])) {
                        poiCategory = categoryKey;
                        matchedTag = `${tagKey}=${element.tags[tagKey]}`;
                        break;
                    }
                }
            }
            if (poiCategory) break;
        }
        
        if (!poiCategory) return null;
        
        // Extract coordinates
        let lat, lng;
        if (element.type === 'node') {
            lat = element.lat;
            lng = element.lon;
        } else if (element.type === 'way' && element.center) {
            lat = element.center.lat;
            lng = element.center.lon;
        } else {
            return null;
        }
        
        const category = this.poiCategories[poiCategory];
        
        return {
            id: element.id,
            type: element.type,
            category: poiCategory,
            categoryName: category.name,
            icon: category.icon,
            color: category.color,
            lat: lat,
            lng: lng,
            name: element.tags.name || this.generatePOIName(element.tags, poiCategory),
            tags: element.tags,
            matchedTag: matchedTag,
            
            // Useful details
            address: this.extractAddress(element.tags),
            phone: element.tags.phone || element.tags['contact:phone'],
            website: element.tags.website || element.tags['contact:website'],
            openingHours: element.tags.opening_hours,
            wheelchair: element.tags.wheelchair,
            description: element.tags.description,
            
            // Category-specific details
            ...this.extractCategorySpecificDetails(element.tags, poiCategory)
        };
    }
    
    /**
     * Generate POI name if not provided
     */
    generatePOIName(tags, category) {
        const categoryDefaults = {
            bikeShops: 'Bike Shop',
            waterSources: 'Water Source',
            foodStops: tags.amenity || 'Food',
            restrooms: 'Public Restroom',
            gasStations: tags.brand || 'Gas Station',
            viewpoints: 'Viewpoint',
            accommodation: tags.tourism || 'Accommodation',
            bikePumps: 'Bike Pump/Tools',
            parking: 'Bike Parking',
            medical: tags.amenity || 'Medical',
            atm: tags.operator || 'ATM',
            chargingStations: 'E-Bike Charging'
        };
        
        return categoryDefaults[category] || 'Point of Interest';
    }
    
    /**
     * Extract address from tags
     */
    extractAddress(tags) {
        const parts = [];
        
        if (tags['addr:housenumber']) parts.push(tags['addr:housenumber']);
        if (tags['addr:street']) parts.push(tags['addr:street']);
        if (tags['addr:city']) parts.push(tags['addr:city']);
        if (tags['addr:postcode']) parts.push(tags['addr:postcode']);
        
        return parts.length > 0 ? parts.join(', ') : null;
    }
    
    /**
     * Extract category-specific details
     */
    extractCategorySpecificDetails(tags, category) {
        const details = {};
        
        switch (category) {
            case 'bikeShops':
                details.services = [];
                if (tags['service:bicycle:repair'] === 'yes') details.services.push('Repair');
                if (tags['service:bicycle:rental'] === 'yes') details.services.push('Rental');
                if (tags['service:bicycle:pump'] === 'yes') details.services.push('Pump');
                if (tags['service:bicycle:retail'] === 'yes') details.services.push('Sales');
                break;
                
            case 'waterSources':
                details.drinkable = tags.drinking_water !== 'no';
                details.bottle = tags.bottle === 'yes';
                break;
                
            case 'foodStops':
                details.cuisine = tags.cuisine;
                details.diet = [];
                if (tags['diet:vegetarian'] === 'yes') details.diet.push('Vegetarian');
                if (tags['diet:vegan'] === 'yes') details.diet.push('Vegan');
                details.outdoor_seating = tags.outdoor_seating === 'yes';
                break;
                
            case 'accommodation':
                details.stars = tags.stars;
                details.rooms = tags.rooms;
                details.internet = tags.internet_access;
                details.bikeParking = tags['bicycle_parking'] === 'yes';
                break;
                
            case 'bikePumps':
                details.fee = tags.fee === 'yes';
                details.covered = tags.covered === 'yes';
                details.tools = tags['service:bicycle:tools'] === 'yes';
                break;
                
            case 'parking':
                details.capacity = tags.capacity;
                details.covered = tags.covered === 'yes';
                details.access = tags.access || 'public';
                details.parkingType = tags.bicycle_parking;
                break;
        }
        
        return details;
    }
    
    /**
     * Calculate distance from POI to nearest point on route
     */
    calculateDistanceToRoute(poi, routeCoordinates) {
        let minDistance = Infinity;
        
        for (let i = 0; i < routeCoordinates.length - 1; i++) {
            const distance = this.pointToLineDistance(
                poi,
                routeCoordinates[i],
                routeCoordinates[i + 1]
            );
            minDistance = Math.min(minDistance, distance);
        }
        
        return Math.round(minDistance);
    }
    
    /**
     * Find closest position on route
     */
    findClosestRoutePosition(poi, routeCoordinates) {
        let minDistance = Infinity;
        let closestIndex = 0;
        let closestPoint = null;
        
        for (let i = 0; i < routeCoordinates.length - 1; i++) {
            const projected = this.projectPointOnLine(
                poi,
                routeCoordinates[i],
                routeCoordinates[i + 1]
            );
            
            const distance = this.calculateDistance(poi, projected);
            
            if (distance < minDistance) {
                minDistance = distance;
                closestIndex = i;
                closestPoint = projected;
            }
        }
        
        // Calculate distance along route to this point
        let routeDistance = 0;
        for (let i = 0; i < closestIndex; i++) {
            routeDistance += this.calculateDistance(
                routeCoordinates[i],
                routeCoordinates[i + 1]
            );
        }
        
        if (closestPoint) {
            routeDistance += this.calculateDistance(
                routeCoordinates[closestIndex],
                closestPoint
            );
        }
        
        return {
            index: closestIndex,
            point: closestPoint,
            distance: routeDistance
        };
    }
    
    /**
     * Filter and sort POIs
     */
    filterAndSortPOIs(pois, routeCoordinates, maxResults) {
        // Group by category
        const categorizedPOIs = {};
        
        pois.forEach(poi => {
            if (!categorizedPOIs[poi.category]) {
                categorizedPOIs[poi.category] = [];
            }
            categorizedPOIs[poi.category].push(poi);
        });
        
        // Sort each category by distance along route
        Object.keys(categorizedPOIs).forEach(category => {
            categorizedPOIs[category].sort((a, b) => 
                a.routePosition.distance - b.routePosition.distance
            );
            
            // Limit results per category
            const limitPerCategory = Math.ceil(maxResults / Object.keys(categorizedPOIs).length);
            categorizedPOIs[category] = categorizedPOIs[category].slice(0, limitPerCategory);
        });
        
        return {
            total: pois.length,
            categories: categorizedPOIs,
            summary: this.generatePOISummary(categorizedPOIs)
        };
    }
    
    /**
     * Generate POI summary
     */
    generatePOISummary(categorizedPOIs) {
        const summary = {};
        
        Object.entries(categorizedPOIs).forEach(([category, pois]) => {
            const categoryInfo = this.poiCategories[category];
            summary[category] = {
                name: categoryInfo.name,
                icon: categoryInfo.icon,
                count: pois.length,
                nearest: pois[0] ? {
                    name: pois[0].name,
                    distance: pois[0].distanceToRoute,
                    routeDistance: Math.round(pois[0].routePosition.distance / 1000 * 10) / 10 // km
                } : null
            };
        });
        
        return summary;
    }
    
    // Utility functions
    calculateDistance(coord1, coord2) {
        const R = 6371e3;
        const φ1 = coord1.lat * Math.PI/180;
        const φ2 = coord2.lat * Math.PI/180;
        const Δφ = (coord2.lat - coord1.lat) * Math.PI/180;
        const Δλ = (coord2.lng - coord1.lng) * Math.PI/180;

        const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                  Math.cos(φ1) * Math.cos(φ2) *
                  Math.sin(Δλ/2) * Math.sin(Δλ/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

        return R * c;
    }
    
    pointToLineDistance(point, lineStart, lineEnd) {
        const projected = this.projectPointOnLine(point, lineStart, lineEnd);
        return this.calculateDistance(point, projected);
    }
    
    projectPointOnLine(point, lineStart, lineEnd) {
        const dx = lineEnd.lng - lineStart.lng;
        const dy = lineEnd.lat - lineStart.lat;
        
        if (dx === 0 && dy === 0) {
            return lineStart;
        }
        
        const t = ((point.lng - lineStart.lng) * dx + (point.lat - lineStart.lat) * dy) / 
                  (dx * dx + dy * dy);
        
        const tClamped = Math.max(0, Math.min(1, t));
        
        return {
            lat: lineStart.lat + tClamped * dy,
            lng: lineStart.lng + tClamped * dx
        };
    }
    
    getCacheKey(bbox, categories) {
        return `${bbox.south},${bbox.west},${bbox.north},${bbox.east}_${categories.sort().join(',')}`;
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RoutePOISearcher;
}