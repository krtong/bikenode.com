// Enhanced Image Quality Analyzer and Validator
// Analyzes downloaded images and provides quality scoring

import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import axios from 'axios';
import { QUALITY_STANDARDS, IMAGE_CATEGORIES } from '../config/quality_standards.js';

export class ImageQualityAnalyzer {
    constructor() {
        this.qualityThreshold = 0.6; // Minimum quality score to keep image
    }

    /**
     * Analyze image quality based on multiple factors
     */
    async analyzeImageQuality(imageUrl, imageBuffer = null, metadata = {}) {
        const analysis = {
            url: imageUrl,
            scores: {},
            totalScore: 0,
            quality: 'unknown',
            recommendations: []
        };

        try {
            // Score based on source authority
            analysis.scores.sourceAuthority = this.scoreSourceAuthority(imageUrl, metadata.make);
            
            // Score based on URL quality indicators
            analysis.scores.urlQuality = this.scoreUrlQuality(imageUrl);
            
            // If we have image buffer, analyze file properties
            if (imageBuffer) {
                const fileAnalysis = await this.analyzeImageFile(imageBuffer);
                analysis.scores.fileSize = this.scoreFileSize(fileAnalysis.size);
                analysis.scores.dimensions = this.scoreDimensions(fileAnalysis.width, fileAnalysis.height);
            }

            // Calculate weighted total score
            analysis.totalScore = this.calculateWeightedScore(analysis.scores);
            analysis.quality = this.determineQualityLevel(analysis.totalScore);
            analysis.recommendations = this.generateRecommendations(analysis);

            return analysis;
        } catch (error) {
            console.error(`Error analyzing image quality for ${imageUrl}:`, error.message);
            return { ...analysis, error: error.message };
        }
    }

    /**
     * Score based on source domain authority
     */
    scoreSourceAuthority(imageUrl, make) {
        const domain = this.extractDomain(imageUrl);
        const makeLower = make?.toLowerCase() || '';
        
        // Check if from manufacturer's official domain
        const manufacturerDomains = QUALITY_STANDARDS.MANUFACTURER_DOMAINS[makeLower] || [];
        if (manufacturerDomains.some(d => domain.includes(d))) {
            return 1.0; // Perfect score for official manufacturer
        }
        
        // Check if from trusted motorcycle sources
        if (QUALITY_STANDARDS.TRUSTED_SOURCES.some(d => domain.includes(d))) {
            return 0.8; // High score for trusted sources
        }
        
        // Check for motorcycle-related domains
        if (domain.includes('motorcycle') || domain.includes('bike') || domain.includes('motor')) {
            return 0.6; // Good score for motorcycle-related sites
        }
        
        return 0.3; // Lower score for unknown sources
    }

    /**
     * Score based on URL quality indicators
     */
    scoreUrlQuality(imageUrl) {
        let score = 0.5; // Base score
        
        // Check for quality indicators in URL
        for (const pattern of QUALITY_STANDARDS.QUALITY_URL_PATTERNS) {
            if (pattern.test(imageUrl)) {
                score += 0.1;
            }
        }
        
        // Penalize for avoid patterns
        for (const pattern of QUALITY_STANDARDS.AVOID_URL_PATTERNS) {
            if (pattern.test(imageUrl)) {
                score -= 0.2;
            }
        }
        
        return Math.max(0, Math.min(1, score));
    }

    /**
     * Score based on file size
     */
    scoreFileSize(fileSize) {
        if (fileSize < QUALITY_STANDARDS.MIN_FILE_SIZE) {
            return 0.1; // Too small, likely low quality
        }
        
        if (fileSize > QUALITY_STANDARDS.MAX_FILE_SIZE) {
            return 0.7; // Very large, might be unnecessarily big
        }
        
        // Optimal range: 100KB - 2MB
        const optimalMin = 100000;
        const optimalMax = 2000000;
        
        if (fileSize >= optimalMin && fileSize <= optimalMax) {
            return 1.0;
        }
        
        if (fileSize < optimalMin) {
            return 0.5 + (fileSize - QUALITY_STANDARDS.MIN_FILE_SIZE) / (optimalMin - QUALITY_STANDARDS.MIN_FILE_SIZE) * 0.5;
        }
        
        return 0.8; // Larger than optimal but acceptable
    }

    /**
     * Score based on image dimensions
     */
    scoreDimensions(width, height) {
        if (!width || !height) return 0.3;
        
        // Check minimum requirements
        if (width < QUALITY_STANDARDS.MIN_WIDTH || height < QUALITY_STANDARDS.MIN_HEIGHT) {
            return 0.2;
        }
        
        const aspectRatio = width / height;
        let aspectScore = 0.5;
        
        // Check against preferred aspect ratios
        for (const preferred of QUALITY_STANDARDS.PREFERRED_ASPECT_RATIOS) {
            const diff = Math.abs(aspectRatio - preferred.ratio);
            if (diff < 0.1) { // Close match
                aspectScore = Math.max(aspectScore, preferred.weight);
            }
        }
        
        // Bonus for high resolution
        const pixelCount = width * height;
        let resolutionScore = 0.5;
        
        if (pixelCount > 2000000) resolutionScore = 1.0; // > 2MP
        else if (pixelCount > 1000000) resolutionScore = 0.8; // > 1MP
        else if (pixelCount > 500000) resolutionScore = 0.6; // > 0.5MP
        
        return (aspectScore + resolutionScore) / 2;
    }

    /**
     * Calculate weighted total score
     */
    calculateWeightedScore(scores) {
        let totalScore = 0;
        const weights = QUALITY_STANDARDS.QUALITY_WEIGHTS;
        
        totalScore += (scores.sourceAuthority || 0) * weights.SOURCE_AUTHORITY;
        totalScore += (scores.urlQuality || 0) * weights.URL_QUALITY;
        totalScore += (scores.fileSize || 0) * weights.FILE_SIZE;
        totalScore += (scores.dimensions || 0) * weights.IMAGE_SIZE;
        
        return Math.min(1, totalScore);
    }

    /**
     * Determine quality level from score
     */
    determineQualityLevel(score) {
        if (score >= 0.8) return 'excellent';
        if (score >= 0.6) return 'good';
        if (score >= 0.4) return 'fair';
        return 'poor';
    }

    /**
     * Generate recommendations for improvement
     */
    generateRecommendations(analysis) {
        const recommendations = [];
        
        if (analysis.scores.sourceAuthority < 0.5) {
            recommendations.push('Consider searching official manufacturer websites for higher quality images');
        }
        
        if (analysis.scores.urlQuality < 0.4) {
            recommendations.push('URL suggests this might not be a product/hero image');
        }
        
        if (analysis.scores.fileSize < 0.5) {
            recommendations.push('Image file size suggests low quality - seek higher resolution images');
        }
        
        if (analysis.scores.dimensions < 0.5) {
            recommendations.push('Image dimensions are below recommended standards for hero images');
        }
        
        return recommendations;
    }

    /**
     * Analyze image file properties (simplified - would need image processing library for full analysis)
     */
    async analyzeImageFile(buffer) {
        // This is a simplified version - in production, you'd use a library like sharp or jimp
        return {
            size: buffer.length,
            width: null, // Would need image processing library
            height: null, // Would need image processing library
            format: this.detectImageFormat(buffer)
        };
    }

    /**
     * Detect image format from buffer
     */
    detectImageFormat(buffer) {
        if (buffer[0] === 0xFF && buffer[1] === 0xD8) return 'jpeg';
        if (buffer[0] === 0x89 && buffer[1] === 0x50) return 'png';
        if (buffer[0] === 0x47 && buffer[1] === 0x49) return 'gif';
        return 'unknown';
    }

    /**
     * Extract domain from URL
     */
    extractDomain(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname.toLowerCase();
        } catch {
            return '';
        }
    }

    /**
     * Filter images based on quality threshold
     */
    filterHighQualityImages(imageAnalyses) {
        return imageAnalyses
            .filter(analysis => analysis.totalScore >= this.qualityThreshold)
            .sort((a, b) => b.totalScore - a.totalScore);
    }
}
