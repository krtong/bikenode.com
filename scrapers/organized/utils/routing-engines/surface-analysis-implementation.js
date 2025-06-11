/**
 * Real Surface Type Detection Along Routes
 * Uses Overpass API to query actual OSM surface tags
 */

class RouteSurfaceAnalyzer {
    constructor() {
        this.overpassUrl = 'https://overpass-api.de/api/interpreter';
        this.surfaceCache = new Map();
        this.segmentLength = 100; // meters per segment
    }

    /**
     * Analyze surface types along a route
     * @param {Array} routeCoordinates - Array of {lat, lng} points
     * @returns {Object} Surface analysis results
     */
    async analyzeRouteSurfaces(routeCoordinates) {
        console.log('🛣️ Analyzing surface types along route...');
        
        // Split route into segments
        const segments = this.createRouteSegments(routeCoordinates);
        
        // Query OSM for each segment
        const surfaceData = await this.querySurfaceData(segments);
        
        // Analyze and aggregate results
        const analysis = this.aggregateSurfaceData(surfaceData);
        
        return {
            segments: surfaceData,
            statistics: analysis.statistics,
            warnings: analysis.warnings,
            recommendations: analysis.recommendations,
            visualData: this.createVisualizationData(surfaceData)
        };
    }

    /**
     * Create segments from route coordinates
     */
    createRouteSegments(coordinates) {
        const segments = [];
        let accumulatedDistance = 0;
        let segmentCoords = [coordinates[0]];
        
        for (let i = 1; i < coordinates.length; i++) {
            const distance = this.calculateDistance(
                coordinates[i-1], 
                coordinates[i]
            );
            
            accumulatedDistance += distance;
            segmentCoords.push(coordinates[i]);
            
            if (accumulatedDistance >= this.segmentLength || 
                i === coordinates.length - 1) {
                segments.push({
                    id: segments.length,
                    coordinates: [...segmentCoords],
                    length: accumulatedDistance,
                    startIndex: i - segmentCoords.length + 1,
                    endIndex: i
                });
                
                // Start new segment
                accumulatedDistance = 0;
                segmentCoords = [coordinates[i]];
            }
        }
        
        return segments;
    }

    /**
     * Query Overpass API for surface data
     */
    async querySurfaceData(segments) {
        const results = [];
        
        // Batch segments to avoid overwhelming Overpass
        const batchSize = 10;
        for (let i = 0; i < segments.length; i += batchSize) {
            const batch = segments.slice(i, i + batchSize);
            const batchResults = await Promise.all(
                batch.map(segment => this.querySegmentSurface(segment))
            );
            results.push(...batchResults);
            
            // Rate limiting
            if (i + batchSize < segments.length) {
                await this.sleep(1000); // 1 second between batches
            }
        }
        
        return results;
    }

    /**
     * Query surface data for a single segment
     */
    async querySegmentSurface(segment) {
        // Create bounding box for segment
        const bbox = this.calculateBoundingBox(segment.coordinates);
        
        // Check cache first
        const cacheKey = `${bbox.join(',')}`;
        if (this.surfaceCache.has(cacheKey)) {
            return {
                ...segment,
                ...this.surfaceCache.get(cacheKey)
            };
        }
        
        // Build Overpass query
        const query = `
            [out:json][timeout:25];
            (
                way["highway"](${bbox.join(',')});
            );
            out body;
            >;
            out skel qt;
        `;
        
        try {
            const response = await fetch(this.overpassUrl, {
                method: 'POST',
                body: `data=${encodeURIComponent(query)}`,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });
            
            const data = await response.json();
            const surfaces = this.extractSurfaceData(data, segment);
            
            // Cache result
            this.surfaceCache.set(cacheKey, surfaces);
            
            return {
                ...segment,
                ...surfaces
            };
        } catch (error) {
            console.error('Error querying Overpass:', error);
            return {
                ...segment,
                surface: 'unknown',
                smoothness: 'unknown',
                error: true
            };
        }
    }

    /**
     * Extract surface information from Overpass response
     */
    extractSurfaceData(overpassData, segment) {
        const ways = overpassData.elements.filter(e => e.type === 'way');
        
        // Find ways that intersect with our segment
        const intersectingWays = ways.filter(way => {
            // Simple check - in production, use proper line intersection
            return way.tags && way.tags.highway;
        });
        
        if (intersectingWays.length === 0) {
            return {
                surface: 'unknown',
                smoothness: 'unknown',
                highway: 'unknown',
                tracktype: null,
                mtbScale: null
            };
        }
        
        // Aggregate surface data from intersecting ways
        const surfaces = intersectingWays.map(way => ({
            surface: way.tags.surface || 'unspecified',
            smoothness: way.tags.smoothness || 'unknown',
            highway: way.tags.highway,
            tracktype: way.tags.tracktype || null,
            mtbScale: way.tags['mtb:scale'] || null,
            name: way.tags.name || 'Unnamed road'
        }));
        
        // Return most common surface (simplified)
        const surfaceCounts = {};
        surfaces.forEach(s => {
            surfaceCounts[s.surface] = (surfaceCounts[s.surface] || 0) + 1;
        });
        
        const dominantSurface = Object.entries(surfaceCounts)
            .sort((a, b) => b[1] - a[1])[0][0];
        
        return {
            surface: dominantSurface,
            smoothness: surfaces.find(s => s.surface === dominantSurface)?.smoothness || 'unknown',
            highway: surfaces[0].highway,
            tracktype: surfaces[0].tracktype,
            mtbScale: surfaces[0].mtbScale,
            allSurfaces: surfaces
        };
    }

    /**
     * Aggregate surface data and calculate statistics
     */
    aggregateSurfaceData(segmentData) {
        const totalDistance = segmentData.reduce((sum, s) => sum + s.length, 0);
        const surfaceDistances = {};
        const smoothnessDistances = {};
        
        // Calculate distances per surface type
        segmentData.forEach(segment => {
            const surface = segment.surface || 'unknown';
            const smoothness = segment.smoothness || 'unknown';
            
            surfaceDistances[surface] = (surfaceDistances[surface] || 0) + segment.length;
            smoothnessDistances[smoothness] = (smoothnessDistances[smoothness] || 0) + segment.length;
        });
        
        // Convert to percentages
        const surfaceStats = {};
        const smoothnessStats = {};
        
        Object.entries(surfaceDistances).forEach(([surface, distance]) => {
            surfaceStats[surface] = {
                distance: distance,
                percentage: (distance / totalDistance * 100).toFixed(1)
            };
        });
        
        Object.entries(smoothnessDistances).forEach(([smoothness, distance]) => {
            smoothnessStats[smoothness] = {
                distance: distance,
                percentage: (distance / totalDistance * 100).toFixed(1)
            };
        });
        
        // Generate warnings and recommendations
        const warnings = this.generateWarnings(surfaceStats, smoothnessStats);
        const recommendations = this.generateRecommendations(surfaceStats, smoothnessStats);
        
        return {
            statistics: {
                totalDistance,
                surfaces: surfaceStats,
                smoothness: smoothnessStats,
                segmentCount: segmentData.length
            },
            warnings,
            recommendations
        };
    }

    /**
     * Generate warnings based on surface analysis
     */
    generateWarnings(surfaceStats, smoothnessStats) {
        const warnings = [];
        
        // Check for unsuitable surfaces
        const unsuitableSurfaces = ['sand', 'mud', 'grass'];
        unsuitableSurfaces.forEach(surface => {
            if (surfaceStats[surface] && parseFloat(surfaceStats[surface].percentage) > 5) {
                warnings.push({
                    type: 'surface',
                    severity: 'high',
                    message: `Route contains ${surfaceStats[surface].percentage}% ${surface} surface`,
                    surface: surface
                });
            }
        });
        
        // Check for rough surfaces
        const roughSmoothness = ['bad', 'very_bad', 'horrible', 'very_horrible', 'impassable'];
        roughSmoothness.forEach(smoothness => {
            if (smoothnessStats[smoothness] && parseFloat(smoothnessStats[smoothness].percentage) > 5) {
                warnings.push({
                    type: 'smoothness',
                    severity: 'high',
                    message: `Route contains ${smoothnessStats[smoothness].percentage}% ${smoothness} sections`,
                    smoothness: smoothness
                });
            }
        });
        
        // Check unpaved percentage
        const unpavedSurfaces = ['unpaved', 'compacted', 'gravel', 'fine_gravel', 'dirt', 'earth', 'ground', 'grass'];
        const unpavedPercentage = unpavedSurfaces.reduce((sum, surface) => {
            return sum + (surfaceStats[surface] ? parseFloat(surfaceStats[surface].percentage) : 0);
        }, 0);
        
        if (unpavedPercentage > 20) {
            warnings.push({
                type: 'unpaved',
                severity: 'medium',
                message: `Route is ${unpavedPercentage.toFixed(1)}% unpaved`,
                percentage: unpavedPercentage
            });
        }
        
        return warnings;
    }

    /**
     * Generate bike type recommendations
     */
    generateRecommendations(surfaceStats, smoothnessStats) {
        const recommendations = [];
        
        // Calculate surface scores for different bike types
        const scores = {
            roadBike: this.calculateBikeScore(surfaceStats, 'road'),
            gravelBike: this.calculateBikeScore(surfaceStats, 'gravel'),
            mountainBike: this.calculateBikeScore(surfaceStats, 'mtb'),
            hybridBike: this.calculateBikeScore(surfaceStats, 'hybrid')
        };
        
        // Sort by score
        const sortedBikes = Object.entries(scores)
            .sort((a, b) => b[1] - a[1])
            .map(([bike, score]) => ({
                type: bike,
                score: score,
                suitable: score > 70
            }));
        
        // Add recommendations
        sortedBikes.forEach(bike => {
            if (bike.suitable) {
                recommendations.push({
                    bikeType: bike.type,
                    score: bike.score,
                    message: `${this.formatBikeName(bike.type)} - ${bike.score}% suitable`
                });
            }
        });
        
        // Add tire recommendations
        if (surfaceStats.gravel || surfaceStats.dirt) {
            const gravelPercent = 
                (parseFloat(surfaceStats.gravel?.percentage || 0) + 
                 parseFloat(surfaceStats.dirt?.percentage || 0));
            
            if (gravelPercent > 30) {
                recommendations.push({
                    type: 'tires',
                    message: `Consider wider tires (35mm+) for ${gravelPercent.toFixed(0)}% gravel/dirt`
                });
            }
        }
        
        return recommendations;
    }

    /**
     * Calculate suitability score for bike type
     */
    calculateBikeScore(surfaceStats, bikeType) {
        const surfaceScores = {
            road: {
                asphalt: 100, paved: 100, concrete: 95,
                paving_stones: 70, cobblestone: 50,
                compacted: 30, gravel: 10, dirt: 5,
                sand: 0, mud: 0, grass: 0
            },
            gravel: {
                asphalt: 90, paved: 90, concrete: 85,
                paving_stones: 80, cobblestone: 70,
                compacted: 95, gravel: 100, fine_gravel: 100,
                dirt: 85, earth: 80, ground: 75,
                sand: 40, mud: 20, grass: 60
            },
            mtb: {
                asphalt: 70, paved: 70, concrete: 70,
                paving_stones: 80, cobblestone: 85,
                compacted: 90, gravel: 95, fine_gravel: 95,
                dirt: 100, earth: 100, ground: 100,
                sand: 70, mud: 60, grass: 90,
                rock: 95, roots: 90
            },
            hybrid: {
                asphalt: 95, paved: 95, concrete: 90,
                paving_stones: 85, cobblestone: 70,
                compacted: 85, gravel: 80, fine_gravel: 85,
                dirt: 70, earth: 65, ground: 60,
                sand: 30, mud: 20, grass: 50
            }
        };
        
        let totalScore = 0;
        let totalPercentage = 0;
        
        Object.entries(surfaceStats).forEach(([surface, data]) => {
            const score = surfaceScores[bikeType][surface] || 50;
            const percentage = parseFloat(data.percentage);
            totalScore += score * percentage;
            totalPercentage += percentage;
        });
        
        return totalPercentage > 0 ? Math.round(totalScore / totalPercentage) : 50;
    }

    /**
     * Create visualization data for route display
     */
    createVisualizationData(segmentData) {
        return segmentData.map(segment => ({
            coordinates: segment.coordinates,
            color: this.getSurfaceColor(segment.surface),
            surface: segment.surface,
            smoothness: segment.smoothness,
            tooltip: this.createSegmentTooltip(segment)
        }));
    }

    /**
     * Get color for surface type
     */
    getSurfaceColor(surface) {
        const colors = {
            asphalt: '#333333',
            paved: '#444444',
            concrete: '#555555',
            paving_stones: '#666666',
            cobblestone: '#777777',
            compacted: '#8B7355',
            gravel: '#A0826D',
            fine_gravel: '#B8956A',
            dirt: '#CD853F',
            earth: '#D2691E',
            ground: '#DEB887',
            grass: '#7CFC00',
            sand: '#F4A460',
            mud: '#8B4513',
            rock: '#696969',
            unknown: '#CCCCCC'
        };
        
        return colors[surface] || colors.unknown;
    }

    /**
     * Create tooltip for segment
     */
    createSegmentTooltip(segment) {
        return `
            <strong>Surface:</strong> ${this.formatSurfaceName(segment.surface)}<br>
            <strong>Smoothness:</strong> ${this.formatSmoothnessName(segment.smoothness)}<br>
            <strong>Type:</strong> ${segment.highway || 'Unknown'}<br>
            ${segment.tracktype ? `<strong>Track:</strong> ${segment.tracktype}<br>` : ''}
            ${segment.mtbScale ? `<strong>MTB Scale:</strong> ${segment.mtbScale}<br>` : ''}
            <strong>Length:</strong> ${Math.round(segment.length)}m
        `;
    }

    // Utility functions
    calculateDistance(coord1, coord2) {
        const R = 6371e3; // Earth's radius in meters
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

    calculateBoundingBox(coordinates) {
        let minLat = Infinity, maxLat = -Infinity;
        let minLng = Infinity, maxLng = -Infinity;
        
        coordinates.forEach(coord => {
            minLat = Math.min(minLat, coord.lat);
            maxLat = Math.max(maxLat, coord.lat);
            minLng = Math.min(minLng, coord.lng);
            maxLng = Math.max(maxLng, coord.lng);
        });
        
        // Add small buffer
        const buffer = 0.0001;
        return [
            minLat - buffer,
            minLng - buffer,
            maxLat + buffer,
            maxLng + buffer
        ];
    }

    formatSurfaceName(surface) {
        const names = {
            asphalt: 'Asphalt',
            paved: 'Paved',
            concrete: 'Concrete',
            paving_stones: 'Paving Stones',
            cobblestone: 'Cobblestone',
            compacted: 'Compacted Gravel',
            gravel: 'Gravel',
            fine_gravel: 'Fine Gravel',
            dirt: 'Dirt',
            earth: 'Earth',
            ground: 'Ground',
            grass: 'Grass',
            sand: 'Sand',
            mud: 'Mud',
            rock: 'Rock',
            roots: 'Roots',
            unknown: 'Unknown',
            unspecified: 'Not specified'
        };
        
        return names[surface] || surface;
    }

    formatSmoothnessName(smoothness) {
        const names = {
            excellent: 'Excellent',
            good: 'Good',
            intermediate: 'Intermediate',
            bad: 'Bad',
            very_bad: 'Very Bad',
            horrible: 'Horrible',
            very_horrible: 'Very Horrible',
            impassable: 'Impassable',
            unknown: 'Unknown'
        };
        
        return names[smoothness] || smoothness;
    }

    formatBikeName(bikeType) {
        const names = {
            roadBike: 'Road Bike',
            gravelBike: 'Gravel Bike',
            mountainBike: 'Mountain Bike',
            hybridBike: 'Hybrid Bike'
        };
        
        return names[bikeType] || bikeType;
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Export for use in route planner
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RouteSurfaceAnalyzer;
}