/**
 * Climbing Category Analyzer
 * Detects and categorizes climbs in elevation profiles like professional cycling
 */

class ClimbingCategoryAnalyzer {
    constructor() {
        // Professional cycling climb categories based on gradient and length
        this.categories = {
            HC: { // Hors Catégorie (Beyond Category)
                name: 'HC',
                color: '#000000',
                minPoints: 800,
                description: 'Beyond Category - Extreme climbs'
            },
            1: { // Category 1
                name: 'Cat 1',
                color: '#FF0000',
                minPoints: 400,
                maxPoints: 800,
                description: 'Very difficult climbs'
            },
            2: { // Category 2
                name: 'Cat 2',
                color: '#FF6600',
                minPoints: 200,
                maxPoints: 400,
                description: 'Difficult climbs'
            },
            3: { // Category 3
                name: 'Cat 3',
                color: '#FFAA00',
                minPoints: 100,
                maxPoints: 200,
                description: 'Moderate climbs'
            },
            4: { // Category 4
                name: 'Cat 4',
                color: '#00AA00',
                minPoints: 50,
                maxPoints: 100,
                description: 'Easy climbs'
            }
        };
        
        // Minimum thresholds for climb detection
        this.minClimbGradient = 3.0; // %
        this.minClimbLength = 500; // meters
        this.minClimbGain = 20; // meters
    }
    
    /**
     * Analyze elevation profile for climbs
     * @param {Array} elevationData - Array of {distance, elevation} points
     * @returns {Object} Analysis results with detected climbs
     */
    analyzeClimbs(elevationData) {
        if (!elevationData || elevationData.length < 2) {
            return { climbs: [], statistics: {} };
        }
        
        // Smooth elevation data first
        const smoothedData = this.smoothElevationData(elevationData);
        
        // Detect climb segments
        const climbSegments = this.detectClimbSegments(smoothedData);
        
        // Categorize each climb
        const categorizedClimbs = climbSegments.map(climb => 
            this.categorizeClimb(climb)
        );
        
        // Calculate statistics
        const statistics = this.calculateClimbStatistics(categorizedClimbs);
        
        // Generate climb profile data for visualization
        const profileData = this.generateClimbProfileData(categorizedClimbs, elevationData);
        
        return {
            climbs: categorizedClimbs,
            statistics: statistics,
            profileData: profileData
        };
    }
    
    /**
     * Smooth elevation data to reduce noise
     */
    smoothElevationData(data) {
        const smoothed = [];
        const windowSize = 5;
        
        for (let i = 0; i < data.length; i++) {
            let sumElev = 0;
            let count = 0;
            
            for (let j = Math.max(0, i - windowSize); j <= Math.min(data.length - 1, i + windowSize); j++) {
                sumElev += data[j].elevation;
                count++;
            }
            
            smoothed.push({
                distance: data[i].distance,
                elevation: sumElev / count,
                originalElevation: data[i].elevation
            });
        }
        
        return smoothed;
    }
    
    /**
     * Detect continuous climb segments
     */
    detectClimbSegments(data) {
        const climbs = [];
        let currentClimb = null;
        
        for (let i = 1; i < data.length; i++) {
            const distance = data[i].distance - data[i-1].distance;
            const elevationGain = data[i].elevation - data[i-1].elevation;
            const gradient = distance > 0 ? (elevationGain / distance) * 100 : 0;
            
            if (gradient >= this.minClimbGradient) {
                // Start or continue climb
                if (!currentClimb) {
                    currentClimb = {
                        startIndex: i - 1,
                        startDistance: data[i-1].distance,
                        startElevation: data[i-1].elevation,
                        segments: []
                    };
                }
                
                currentClimb.segments.push({
                    distance: distance,
                    elevationGain: elevationGain,
                    gradient: gradient
                });
                
            } else if (currentClimb) {
                // Check if we should end the climb
                const climbDistance = data[i-1].distance - currentClimb.startDistance;
                const totalGain = data[i-1].elevation - currentClimb.startElevation;
                
                if (gradient < 0 || (gradient < this.minClimbGradient && climbDistance > this.minClimbLength)) {
                    // End climb
                    currentClimb.endIndex = i - 1;
                    currentClimb.endDistance = data[i-1].distance;
                    currentClimb.endElevation = data[i-1].elevation;
                    
                    if (this.isValidClimb(currentClimb)) {
                        climbs.push(this.processClimbSegment(currentClimb, data));
                    }
                    
                    currentClimb = null;
                }
            }
        }
        
        // Handle climb that extends to end of route
        if (currentClimb) {
            currentClimb.endIndex = data.length - 1;
            currentClimb.endDistance = data[data.length - 1].distance;
            currentClimb.endElevation = data[data.length - 1].elevation;
            
            if (this.isValidClimb(currentClimb)) {
                climbs.push(this.processClimbSegment(currentClimb, data));
            }
        }
        
        return climbs;
    }
    
    /**
     * Check if climb meets minimum requirements
     */
    isValidClimb(climb) {
        const distance = climb.endDistance - climb.startDistance;
        const gain = climb.endElevation - climb.startElevation;
        
        return distance >= this.minClimbLength && gain >= this.minClimbGain;
    }
    
    /**
     * Process climb segment to calculate detailed metrics
     */
    processClimbSegment(climb, data) {
        const distance = climb.endDistance - climb.startDistance;
        const totalGain = climb.endElevation - climb.startElevation;
        const avgGradient = (totalGain / distance) * 100;
        
        // Calculate max gradient
        let maxGradient = 0;
        let totalWeightedGradient = 0;
        
        climb.segments.forEach(segment => {
            maxGradient = Math.max(maxGradient, segment.gradient);
            totalWeightedGradient += segment.gradient * segment.distance;
        });
        
        // Extract elevation profile for this climb
        const profile = [];
        for (let i = climb.startIndex; i <= climb.endIndex; i++) {
            profile.push({
                distance: data[i].distance - climb.startDistance,
                elevation: data[i].elevation,
                gradient: i > climb.startIndex ? 
                    ((data[i].elevation - data[i-1].elevation) / (data[i].distance - data[i-1].distance)) * 100 : 0
            });
        }
        
        return {
            startDistance: climb.startDistance,
            endDistance: climb.endDistance,
            distance: distance,
            totalGain: totalGain,
            startElevation: climb.startElevation,
            endElevation: climb.endElevation,
            avgGradient: avgGradient,
            maxGradient: maxGradient,
            profile: profile,
            segments: climb.segments
        };
    }
    
    /**
     * Categorize climb based on difficulty points
     */
    categorizeClimb(climb) {
        // Calculate difficulty points (similar to cycling categorization)
        // Points = (elevation gain in meters) × (average gradient)² / 100
        const points = (climb.totalGain * Math.pow(climb.avgGradient, 2)) / 100;
        
        // Additional factors
        const lengthFactor = Math.min(climb.distance / 10000, 1.5); // Bonus for long climbs
        const steepnessFactor = climb.maxGradient > 15 ? 1.2 : 1.0; // Bonus for very steep sections
        
        const adjustedPoints = points * lengthFactor * steepnessFactor;
        
        // Determine category
        let category = null;
        if (adjustedPoints >= this.categories.HC.minPoints) {
            category = this.categories.HC;
        } else if (adjustedPoints >= this.categories[1].minPoints) {
            category = this.categories[1];
        } else if (adjustedPoints >= this.categories[2].minPoints) {
            category = this.categories[2];
        } else if (adjustedPoints >= this.categories[3].minPoints) {
            category = this.categories[3];
        } else if (adjustedPoints >= this.categories[4].minPoints) {
            category = this.categories[4];
        }
        
        // Calculate VAM (Velocity Ascended in Meters per hour)
        const vam = this.calculateVAM(climb.totalGain, climb.avgGradient);
        
        return {
            ...climb,
            category: category,
            points: adjustedPoints,
            vam: vam,
            difficulty: this.calculateDifficultyScore(climb, adjustedPoints)
        };
    }
    
    /**
     * Calculate VAM (climbing speed indicator)
     */
    calculateVAM(elevationGain, avgGradient) {
        // Simplified VAM calculation based on gradient
        // Professional cyclists: 1000-1800 VAM
        // Recreational: 600-1000 VAM
        const baseVAM = 800; // Recreational cyclist base
        const gradientFactor = Math.max(0.5, Math.min(1.5, avgGradient / 8));
        return Math.round(baseVAM * gradientFactor);
    }
    
    /**
     * Calculate overall difficulty score (0-100)
     */
    calculateDifficultyScore(climb, points) {
        const factors = {
            length: Math.min(climb.distance / 20000, 1) * 30, // Max 30 points for 20km+
            gradient: Math.min(climb.avgGradient / 15, 1) * 40, // Max 40 points for 15%+
            maxGradient: Math.min(climb.maxGradient / 20, 1) * 20, // Max 20 points for 20%+
            elevation: Math.min(climb.totalGain / 1000, 1) * 10 // Max 10 points for 1000m+
        };
        
        return Math.round(
            factors.length + 
            factors.gradient + 
            factors.maxGradient + 
            factors.elevation
        );
    }
    
    /**
     * Calculate climb statistics
     */
    calculateClimbStatistics(climbs) {
        if (climbs.length === 0) {
            return {
                totalClimbs: 0,
                totalClimbing: 0,
                categoryCounts: {},
                hardestClimb: null,
                longestClimb: null,
                steepestClimb: null
            };
        }
        
        const stats = {
            totalClimbs: climbs.length,
            totalClimbing: climbs.reduce((sum, climb) => sum + climb.totalGain, 0),
            totalClimbDistance: climbs.reduce((sum, climb) => sum + climb.distance, 0),
            categoryCounts: {},
            climbsByCategory: {},
            averageDifficulty: 0
        };
        
        // Count by category
        Object.keys(this.categories).forEach(cat => {
            stats.categoryCounts[cat] = 0;
            stats.climbsByCategory[cat] = [];
        });
        
        climbs.forEach(climb => {
            if (climb.category) {
                const catKey = climb.category.name === 'HC' ? 'HC' : 
                    climb.category.name.replace('Cat ', '');
                stats.categoryCounts[catKey]++;
                stats.climbsByCategory[catKey].push(climb);
            }
        });
        
        // Find notable climbs
        stats.hardestClimb = climbs.reduce((hardest, climb) => 
            !hardest || climb.difficulty > hardest.difficulty ? climb : hardest
        , null);
        
        stats.longestClimb = climbs.reduce((longest, climb) => 
            !longest || climb.distance > longest.distance ? climb : longest
        , null);
        
        stats.steepestClimb = climbs.reduce((steepest, climb) => 
            !steepest || climb.maxGradient > steepest.maxGradient ? climb : steepest
        , null);
        
        stats.averageDifficulty = Math.round(
            climbs.reduce((sum, climb) => sum + climb.difficulty, 0) / climbs.length
        );
        
        return stats;
    }
    
    /**
     * Generate data for climb profile visualization
     */
    generateClimbProfileData(climbs, elevationData) {
        const profileData = elevationData.map(point => ({
            ...point,
            isClimb: false,
            category: null,
            climbInfo: null
        }));
        
        // Mark climb sections
        climbs.forEach((climb, climbIndex) => {
            profileData.forEach(point => {
                if (point.distance >= climb.startDistance && 
                    point.distance <= climb.endDistance) {
                    point.isClimb = true;
                    point.category = climb.category;
                    point.climbInfo = {
                        index: climbIndex,
                        name: `${climb.category.name} Climb`,
                        progress: (point.distance - climb.startDistance) / climb.distance
                    };
                }
            });
        });
        
        return profileData;
    }
    
    /**
     * Format climb for display
     */
    formatClimb(climb, index) {
        const distanceKm = (climb.distance / 1000).toFixed(1);
        const gainM = Math.round(climb.totalGain);
        const avgGradient = climb.avgGradient.toFixed(1);
        const maxGradient = climb.maxGradient.toFixed(1);
        
        return {
            id: `climb_${index}`,
            name: `${climb.category.name} Climb #${index + 1}`,
            category: climb.category.name,
            color: climb.category.color,
            description: climb.category.description,
            
            // Metrics
            distance: `${distanceKm} km`,
            elevation: `${gainM} m`,
            avgGradient: `${avgGradient}%`,
            maxGradient: `${maxGradient}%`,
            difficulty: `${climb.difficulty}/100`,
            vam: `${climb.vam} m/h`,
            
            // Location
            startKm: (climb.startDistance / 1000).toFixed(1),
            endKm: (climb.endDistance / 1000).toFixed(1),
            
            // Raw data
            raw: climb
        };
    }
    
    /**
     * Generate climb summary text
     */
    generateClimbSummary(statistics) {
        if (statistics.totalClimbs === 0) {
            return 'No significant climbs detected on this route.';
        }
        
        const parts = [`${statistics.totalClimbs} climb${statistics.totalClimbs > 1 ? 's' : ''}`];
        parts.push(`${Math.round(statistics.totalClimbing)}m total elevation gain`);
        
        // Add category breakdown if there are categorized climbs
        const catParts = [];
        ['HC', '1', '2', '3', '4'].forEach(cat => {
            if (statistics.categoryCounts[cat] > 0) {
                catParts.push(`${statistics.categoryCounts[cat]}×${cat === 'HC' ? 'HC' : 'Cat ' + cat}`);
            }
        });
        
        if (catParts.length > 0) {
            parts.push(`(${catParts.join(', ')})`);
        }
        
        return parts.join(' • ');
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ClimbingCategoryAnalyzer;
}