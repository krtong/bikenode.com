/**
 * Round-Trip Route Generator
 * Creates circular routes based on distance targets and preferences
 */

class RoundTripGenerator {
    constructor(routingEngine) {
        this.routingEngine = routingEngine;
        this.maxAttempts = 10;
        this.distanceTolerance = 0.1; // 10% tolerance
    }
    
    /**
     * Generate a round-trip route
     * @param {Object} options - Route generation options
     * @returns {Object} Generated route with waypoints
     */
    async generateRoundTrip(options) {
        const {
            startPoint,
            targetDistance,
            preferences = {},
            vehicleType = 'bicycle',
            shape = 'loop', // loop, figure8, triangle, random
            direction = 'any' // any, clockwise, counterclockwise
        } = options;
        
        console.log('🔄 Generating round-trip route...', options);
        
        // Validate inputs
        if (!startPoint || !targetDistance) {
            throw new Error('Start point and target distance are required');
        }
        
        // Calculate waypoints based on shape
        const waypoints = await this.generateWaypoints(
            startPoint, 
            targetDistance, 
            shape, 
            direction,
            preferences
        );
        
        // Try to create route with waypoints
        let bestRoute = null;
        let bestScore = Infinity;
        
        for (let attempt = 0; attempt < this.maxAttempts; attempt++) {
            try {
                // Generate route through waypoints
                const route = await this.createRoute(
                    [startPoint, ...waypoints, startPoint],
                    vehicleType,
                    preferences
                );
                
                // Score the route
                const score = this.scoreRoute(route, targetDistance, preferences);
                
                if (score < bestScore) {
                    bestScore = score;
                    bestRoute = route;
                    
                    // Check if route is good enough
                    if (this.isRouteAcceptable(route, targetDistance)) {
                        console.log(`✅ Found acceptable route on attempt ${attempt + 1}`);
                        break;
                    }
                }
                
                // Adjust waypoints for next attempt
                if (attempt < this.maxAttempts - 1) {
                    waypoints.forEach((wp, i) => {
                        waypoints[i] = this.adjustWaypoint(
                            wp, 
                            route.distance, 
                            targetDistance,
                            startPoint
                        );
                    });
                }
                
            } catch (error) {
                console.warn(`Attempt ${attempt + 1} failed:`, error);
            }
        }
        
        if (!bestRoute) {
            throw new Error('Could not generate a valid round-trip route');
        }
        
        // Enhance route with additional data
        return this.enhanceRoute(bestRoute, options);
    }
    
    /**
     * Generate waypoints based on shape and preferences
     */
    async generateWaypoints(startPoint, targetDistance, shape, direction, preferences) {
        const waypoints = [];
        
        // Calculate radius based on target distance
        // Circumference = 2πr, so for a circular route: r ≈ distance / (2π)
        const baseRadius = targetDistance / (2 * Math.PI * 1000); // km
        
        switch (shape) {
            case 'loop':
                waypoints.push(...this.generateLoopWaypoints(
                    startPoint, baseRadius, direction
                ));
                break;
                
            case 'figure8':
                waypoints.push(...this.generateFigure8Waypoints(
                    startPoint, baseRadius, direction
                ));
                break;
                
            case 'triangle':
                waypoints.push(...this.generateTriangleWaypoints(
                    startPoint, baseRadius, direction
                ));
                break;
                
            case 'random':
                waypoints.push(...await this.generateRandomWaypoints(
                    startPoint, baseRadius, preferences
                ));
                break;
                
            default:
                waypoints.push(...this.generateLoopWaypoints(
                    startPoint, baseRadius, direction
                ));
        }
        
        return waypoints;
    }
    
    /**
     * Generate waypoints for a simple loop
     */
    generateLoopWaypoints(center, radiusKm, direction) {
        const waypoints = [];
        const numPoints = 4; // Quadrants
        const angleStep = (2 * Math.PI) / numPoints;
        const startAngle = Math.random() * 2 * Math.PI; // Random starting direction
        
        for (let i = 0; i < numPoints; i++) {
            const angle = startAngle + (direction === 'counterclockwise' ? -1 : 1) * i * angleStep;
            const point = this.calculatePointAtDistance(center, radiusKm, angle);
            waypoints.push(point);
        }
        
        return waypoints;
    }
    
    /**
     * Generate waypoints for a figure-8 pattern
     */
    generateFigure8Waypoints(center, radiusKm, direction) {
        const waypoints = [];
        const loopRadius = radiusKm / 2;
        
        // Top loop
        const topCenter = this.calculatePointAtDistance(center, loopRadius, 0);
        waypoints.push(
            this.calculatePointAtDistance(topCenter, loopRadius, Math.PI / 2),
            this.calculatePointAtDistance(topCenter, loopRadius, 0),
            this.calculatePointAtDistance(topCenter, loopRadius, -Math.PI / 2)
        );
        
        // Bottom loop (opposite direction)
        const bottomCenter = this.calculatePointAtDistance(center, loopRadius, Math.PI);
        waypoints.push(
            this.calculatePointAtDistance(bottomCenter, loopRadius, -Math.PI / 2),
            this.calculatePointAtDistance(bottomCenter, loopRadius, Math.PI),
            this.calculatePointAtDistance(bottomCenter, loopRadius, Math.PI / 2)
        );
        
        return direction === 'counterclockwise' ? waypoints.reverse() : waypoints;
    }
    
    /**
     * Generate waypoints for a triangular route
     */
    generateTriangleWaypoints(center, radiusKm, direction) {
        const waypoints = [];
        const angles = [0, 2 * Math.PI / 3, 4 * Math.PI / 3];
        const startAngle = Math.random() * 2 * Math.PI;
        
        angles.forEach(angle => {
            const adjustedAngle = startAngle + (direction === 'counterclockwise' ? -angle : angle);
            waypoints.push(this.calculatePointAtDistance(center, radiusKm, adjustedAngle));
        });
        
        return waypoints;
    }
    
    /**
     * Generate random waypoints with preferences
     */
    async generateRandomWaypoints(center, radiusKm, preferences) {
        const waypoints = [];
        const numPoints = 3 + Math.floor(Math.random() * 3); // 3-5 waypoints
        
        // Try to find interesting points
        if (preferences.scenic || preferences.poi) {
            const interestingPoints = await this.findInterestingPoints(
                center, 
                radiusKm, 
                preferences
            );
            
            if (interestingPoints.length > 0) {
                // Use interesting points as waypoints
                const selectedPoints = this.selectBestPoints(
                    interestingPoints, 
                    numPoints, 
                    center
                );
                waypoints.push(...selectedPoints);
            }
        }
        
        // Fill remaining with random points
        while (waypoints.length < numPoints) {
            const angle = Math.random() * 2 * Math.PI;
            const distance = radiusKm * (0.5 + Math.random() * 0.5); // 50-100% of radius
            waypoints.push(this.calculatePointAtDistance(center, distance, angle));
        }
        
        // Sort waypoints by angle for better route
        return this.sortWaypointsByAngle(waypoints, center);
    }
    
    /**
     * Find interesting points near the area
     */
    async findInterestingPoints(center, radiusKm, preferences) {
        const points = [];
        
        // Query OSM for interesting features
        const overpassQuery = this.buildInterestingPointsQuery(center, radiusKm, preferences);
        
        try {
            const response = await fetch('https://overpass-api.de/api/interpreter', {
                method: 'POST',
                body: `data=${encodeURIComponent(overpassQuery)}`,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });
            
            const data = await response.json();
            
            // Extract points
            data.elements.forEach(element => {
                if (element.type === 'node' && element.lat && element.lon) {
                    points.push({
                        lat: element.lat,
                        lng: element.lon,
                        tags: element.tags,
                        interest: this.calculateInterestScore(element.tags, preferences)
                    });
                }
            });
            
        } catch (error) {
            console.warn('Could not fetch interesting points:', error);
        }
        
        return points;
    }
    
    /**
     * Build Overpass query for interesting points
     */
    buildInterestingPointsQuery(center, radiusKm, preferences) {
        const radiusM = radiusKm * 1000;
        const tags = [];
        
        if (preferences.scenic) {
            tags.push(
                'tourism=viewpoint',
                'natural=peak',
                'amenity=bench',
                'tourism=picnic_site'
            );
        }
        
        if (preferences.nature) {
            tags.push(
                'natural=water',
                'leisure=park',
                'natural=wood',
                'natural=beach'
            );
        }
        
        if (preferences.cultural) {
            tags.push(
                'tourism=museum',
                'historic=*',
                'tourism=artwork',
                'amenity=place_of_worship'
            );
        }
        
        if (tags.length === 0) {
            // Default interesting points
            tags.push('tourism=*', 'leisure=park', 'natural=*');
        }
        
        const nodeQueries = tags.map(tag => 
            `node[${tag}](around:${radiusM},${center.lat},${center.lng});`
        ).join('\n');
        
        return `
            [out:json][timeout:25];
            (
                ${nodeQueries}
            );
            out body;
        `;
    }
    
    /**
     * Calculate interest score for a point
     */
    calculateInterestScore(tags, preferences) {
        let score = 1;
        
        if (preferences.scenic && tags.tourism === 'viewpoint') score += 3;
        if (preferences.scenic && tags.natural === 'peak') score += 2;
        if (preferences.nature && tags.natural) score += 2;
        if (preferences.cultural && tags.historic) score += 2;
        if (tags.name) score += 1; // Named features are usually more interesting
        
        return score;
    }
    
    /**
     * Select best points for route
     */
    selectBestPoints(points, numPoints, center) {
        // Sort by interest score
        points.sort((a, b) => b.interest - a.interest);
        
        // Take top points but ensure good distribution
        const selected = [];
        const usedAngles = new Set();
        
        for (const point of points) {
            if (selected.length >= numPoints) break;
            
            // Calculate angle from center
            const angle = Math.atan2(
                point.lat - center.lat,
                point.lng - center.lng
            );
            const angleSection = Math.floor(angle / (Math.PI / 4)); // 8 sections
            
            // Skip if we already have a point in this section
            if (usedAngles.has(angleSection)) continue;
            
            selected.push(point);
            usedAngles.add(angleSection);
        }
        
        // Fill remaining with best scored points
        while (selected.length < numPoints && selected.length < points.length) {
            const nextPoint = points.find(p => !selected.includes(p));
            if (nextPoint) selected.push(nextPoint);
            else break;
        }
        
        return selected;
    }
    
    /**
     * Create route through waypoints
     */
    async createRoute(waypoints, vehicleType, preferences) {
        // This would call the actual routing engine
        // For now, return a mock route
        const route = {
            waypoints: waypoints,
            coordinates: [],
            distance: 0,
            duration: 0,
            ascent: 0,
            descent: 0
        };
        
        // Calculate approximate distance
        for (let i = 0; i < waypoints.length - 1; i++) {
            route.distance += this.calculateDistance(waypoints[i], waypoints[i + 1]);
        }
        
        // Mock some values
        route.duration = route.distance / 15000 * 3600; // 15 km/h average
        route.ascent = Math.random() * 500 + 100;
        route.descent = route.ascent; // Round trip
        
        return route;
    }
    
    /**
     * Score a route based on criteria
     */
    scoreRoute(route, targetDistance, preferences) {
        let score = 0;
        
        // Distance score (most important)
        const distanceError = Math.abs(route.distance - targetDistance) / targetDistance;
        score += distanceError * 100;
        
        // Elevation score (if preference set)
        if (preferences.elevation === 'flat' && route.ascent > 500) {
            score += (route.ascent - 500) / 100;
        } else if (preferences.elevation === 'hilly' && route.ascent < 500) {
            score += (500 - route.ascent) / 100;
        }
        
        // Loop quality (how circular is it)
        const loopScore = this.calculateLoopQuality(route.waypoints);
        score += (1 - loopScore) * 20;
        
        return score;
    }
    
    /**
     * Check if route meets criteria
     */
    isRouteAcceptable(route, targetDistance) {
        const distanceError = Math.abs(route.distance - targetDistance) / targetDistance;
        return distanceError <= this.distanceTolerance;
    }
    
    /**
     * Adjust waypoint to improve route
     */
    adjustWaypoint(waypoint, currentDistance, targetDistance, center) {
        const scaleFactor = targetDistance / currentDistance;
        
        // Calculate current distance from center
        const currentRadius = this.calculateDistance(center, waypoint);
        const newRadius = currentRadius * scaleFactor;
        
        // Calculate angle
        const angle = Math.atan2(
            waypoint.lat - center.lat,
            waypoint.lng - center.lng
        );
        
        // Return adjusted point
        return this.calculatePointAtDistance(center, newRadius / 1000, angle);
    }
    
    /**
     * Calculate loop quality (0-1, higher is better)
     */
    calculateLoopQuality(waypoints) {
        if (waypoints.length < 3) return 0;
        
        // Check if start and end are the same
        const startEndSame = this.calculateDistance(
            waypoints[0], 
            waypoints[waypoints.length - 1]
        ) < 100; // Within 100m
        
        if (!startEndSame) return 0;
        
        // Calculate center of mass
        const center = this.calculateCenterOfMass(waypoints);
        
        // Calculate variance in distances from center
        const distances = waypoints.map(wp => 
            this.calculateDistance(center, wp)
        );
        
        const avgDistance = distances.reduce((a, b) => a + b, 0) / distances.length;
        const variance = distances.reduce((sum, d) => 
            sum + Math.pow(d - avgDistance, 2), 0
        ) / distances.length;
        
        // Lower variance = better circle
        const normalizedVariance = variance / (avgDistance * avgDistance);
        return Math.max(0, 1 - normalizedVariance);
    }
    
    /**
     * Enhance route with additional features
     */
    async enhanceRoute(route, options) {
        const enhanced = { ...route };
        
        // Add route metadata
        enhanced.metadata = {
            type: 'round-trip',
            shape: options.shape,
            targetDistance: options.targetDistance,
            actualDistance: route.distance,
            distanceError: Math.abs(route.distance - options.targetDistance) / options.targetDistance,
            generatedAt: new Date().toISOString()
        };
        
        // Add turn-by-turn instructions
        enhanced.instructions = this.generateInstructions(route);
        
        // Add interesting points along route
        if (options.preferences.poi) {
            enhanced.pointsOfInterest = await this.findPOIsAlongRoute(route);
        }
        
        return enhanced;
    }
    
    /**
     * Generate turn instructions
     */
    generateInstructions(route) {
        const instructions = [];
        
        instructions.push({
            type: 'start',
            text: 'Start your round-trip adventure',
            distance: 0
        });
        
        // Add waypoint instructions
        for (let i = 1; i < route.waypoints.length - 1; i++) {
            instructions.push({
                type: 'waypoint',
                text: `Continue through waypoint ${i}`,
                distance: this.calculateDistanceToWaypoint(route, i)
            });
        }
        
        instructions.push({
            type: 'finish',
            text: 'Complete your round-trip journey',
            distance: route.distance
        });
        
        return instructions;
    }
    
    // Utility functions
    calculateDistance(point1, point2) {
        const R = 6371e3; // Earth radius in meters
        const φ1 = point1.lat * Math.PI/180;
        const φ2 = point2.lat * Math.PI/180;
        const Δφ = (point2.lat - point1.lat) * Math.PI/180;
        const Δλ = (point2.lng - point1.lng) * Math.PI/180;

        const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                  Math.cos(φ1) * Math.cos(φ2) *
                  Math.sin(Δλ/2) * Math.sin(Δλ/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

        return R * c; // meters
    }
    
    calculatePointAtDistance(origin, distanceKm, bearing) {
        const R = 6371; // Earth radius in km
        const d = distanceKm;
        const brng = bearing;
        
        const lat1 = origin.lat * Math.PI / 180;
        const lon1 = origin.lng * Math.PI / 180;
        
        const lat2 = Math.asin(
            Math.sin(lat1) * Math.cos(d/R) +
            Math.cos(lat1) * Math.sin(d/R) * Math.cos(brng)
        );
        
        const lon2 = lon1 + Math.atan2(
            Math.sin(brng) * Math.sin(d/R) * Math.cos(lat1),
            Math.cos(d/R) - Math.sin(lat1) * Math.sin(lat2)
        );
        
        return {
            lat: lat2 * 180 / Math.PI,
            lng: lon2 * 180 / Math.PI
        };
    }
    
    calculateCenterOfMass(points) {
        const sum = points.reduce((acc, point) => ({
            lat: acc.lat + point.lat,
            lng: acc.lng + point.lng
        }), { lat: 0, lng: 0 });
        
        return {
            lat: sum.lat / points.length,
            lng: sum.lng / points.length
        };
    }
    
    sortWaypointsByAngle(waypoints, center) {
        return waypoints.sort((a, b) => {
            const angleA = Math.atan2(a.lat - center.lat, a.lng - center.lng);
            const angleB = Math.atan2(b.lat - center.lat, b.lng - center.lng);
            return angleA - angleB;
        });
    }
    
    calculateDistanceToWaypoint(route, waypointIndex) {
        // This would calculate actual distance along route
        // For now, return approximate
        return route.distance * (waypointIndex / (route.waypoints.length - 1));
    }
    
    async findPOIsAlongRoute(route) {
        // This would use the POI searcher
        // For now return empty array
        return [];
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RoundTripGenerator;
}