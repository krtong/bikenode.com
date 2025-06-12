import fs from 'fs';
import path from 'path';

/**
 * Image Quality Monitor
 * Monitors and analyzes the quality of downloaded images
 */
class ImageQualityMonitor {
    constructor() {
        this.baseImageDir = '/Users/kevintong/Documents/Code/bikenode.com/images/motorcycles';
        this.qualityReportFile = '/Users/kevintong/Documents/Code/bikenode.com/scrapers/06_motorcycle_image_scrapers/data/analysis/image_quality_report.json';
        this.initReportFile();
    }

    initReportFile() {
        const reportDir = path.dirname(this.qualityReportFile);
        if (!fs.existsSync(reportDir)) {
            fs.mkdirSync(reportDir, { recursive: true });
        }
    }

    async analyzeImageQuality() {
        console.log('🔍 Starting image quality analysis...');
        
        const analysis = {
            timestamp: new Date().toISOString(),
            totalImages: 0,
            sizeDistribution: {
                tiny: { count: 0, threshold: '< 1KB', files: [] },
                small: { count: 0, threshold: '1KB - 5KB', files: [] },
                medium: { count: 0, threshold: '5KB - 20KB', files: [] },
                large: { count: 0, threshold: '20KB - 100KB', files: [] },
                xlarge: { count: 0, threshold: '> 100KB', files: [] }
            },
            qualityMetrics: {
                averageSize: 0,
                medianSize: 0,
                qualityScore: 0
            },
            problematicImages: []
        };

        const imageFiles = this.getAllImageFiles();
        analysis.totalImages = imageFiles.length;
        
        const fileSizes = [];

        for (const imagePath of imageFiles) {
            try {
                const stats = fs.statSync(imagePath);
                const sizeBytes = stats.size;
                fileSizes.push(sizeBytes);

                // Categorize by size
                if (sizeBytes < 1024) {
                    analysis.sizeDistribution.tiny.count++;
                    analysis.sizeDistribution.tiny.files.push({
                        path: imagePath.replace(this.baseImageDir, ''),
                        size: sizeBytes
                    });
                    analysis.problematicImages.push({
                        path: imagePath.replace(this.baseImageDir, ''),
                        size: sizeBytes,
                        issue: 'Too small (likely thumbnail or icon)'
                    });
                } else if (sizeBytes < 5120) {
                    analysis.sizeDistribution.small.count++;
                    analysis.sizeDistribution.small.files.push({
                        path: imagePath.replace(this.baseImageDir, ''),
                        size: sizeBytes
                    });
                } else if (sizeBytes < 20480) {
                    analysis.sizeDistribution.medium.count++;
                    analysis.sizeDistribution.medium.files.push({
                        path: imagePath.replace(this.baseImageDir, ''),
                        size: sizeBytes
                    });
                } else if (sizeBytes < 102400) {
                    analysis.sizeDistribution.large.count++;
                    analysis.sizeDistribution.large.files.push({
                        path: imagePath.replace(this.baseImageDir, ''),
                        size: sizeBytes
                    });
                } else {
                    analysis.sizeDistribution.xlarge.count++;
                    analysis.sizeDistribution.xlarge.files.push({
                        path: imagePath.replace(this.baseImageDir, ''),
                        size: sizeBytes
                    });
                }
            } catch (error) {
                console.error(`Error analyzing ${imagePath}:`, error.message);
            }
        }

        // Calculate metrics
        if (fileSizes.length > 0) {
            analysis.qualityMetrics.averageSize = Math.round(fileSizes.reduce((a, b) => a + b, 0) / fileSizes.length);
            
            const sortedSizes = fileSizes.sort((a, b) => a - b);
            const midIndex = Math.floor(sortedSizes.length / 2);
            analysis.qualityMetrics.medianSize = sortedSizes[midIndex];
            
            // Quality score: percentage of images >= 5KB (decent quality)
            const decentQualityCount = fileSizes.filter(size => size >= 5120).length;
            analysis.qualityMetrics.qualityScore = Math.round((decentQualityCount / fileSizes.length) * 100);
        }

        // Save report
        fs.writeFileSync(this.qualityReportFile, JSON.stringify(analysis, null, 2));
        
        // Print summary
        this.printQualityReport(analysis);
        
        return analysis;
    }

    getAllImageFiles() {
        const imageFiles = [];
        
        const scanDirectory = (dirPath) => {
            try {
                const items = fs.readdirSync(dirPath);
                for (const item of items) {
                    const itemPath = path.join(dirPath, item);
                    const stats = fs.statSync(itemPath);
                    
                    if (stats.isDirectory()) {
                        scanDirectory(itemPath);
                    } else if (stats.isFile() && /\.(jpg|jpeg|png|gif|webp)$/i.test(item)) {
                        imageFiles.push(itemPath);
                    }
                }
            } catch (error) {
                console.error(`Error scanning directory ${dirPath}:`, error.message);
            }
        };

        scanDirectory(this.baseImageDir);
        return imageFiles;
    }

    printQualityReport(analysis) {
        console.log('\n📊 IMAGE QUALITY ANALYSIS REPORT');
        console.log('=====================================');
        console.log(`🗓️  Timestamp: ${analysis.timestamp}`);
        console.log(`📁 Total Images: ${analysis.totalImages}`);
        console.log(`📏 Average Size: ${this.formatBytes(analysis.qualityMetrics.averageSize)}`);
        console.log(`📊 Median Size: ${this.formatBytes(analysis.qualityMetrics.medianSize)}`);
        console.log(`⭐ Quality Score: ${analysis.qualityMetrics.qualityScore}% (images ≥ 5KB)`);
        
        console.log('\n📊 SIZE DISTRIBUTION:');
        console.log(`🔸 Tiny (< 1KB): ${analysis.sizeDistribution.tiny.count} (${Math.round(analysis.sizeDistribution.tiny.count / analysis.totalImages * 100)}%)`);
        console.log(`🔹 Small (1-5KB): ${analysis.sizeDistribution.small.count} (${Math.round(analysis.sizeDistribution.small.count / analysis.totalImages * 100)}%)`);
        console.log(`🔷 Medium (5-20KB): ${analysis.sizeDistribution.medium.count} (${Math.round(analysis.sizeDistribution.medium.count / analysis.totalImages * 100)}%)`);
        console.log(`🔶 Large (20-100KB): ${analysis.sizeDistribution.large.count} (${Math.round(analysis.sizeDistribution.large.count / analysis.totalImages * 100)}%)`);
        console.log(`🔴 X-Large (> 100KB): ${analysis.sizeDistribution.xlarge.count} (${Math.round(analysis.sizeDistribution.xlarge.count / analysis.totalImages * 100)}%)`);
        
        if (analysis.problematicImages.length > 0) {
            console.log(`\n⚠️  PROBLEMATIC IMAGES: ${analysis.problematicImages.length}`);
            console.log('(First 10 listed):');
            analysis.problematicImages.slice(0, 10).forEach(img => {
                console.log(`   ${img.path} (${this.formatBytes(img.size)}) - ${img.issue}`);
            });
        }
        
        console.log(`\n📄 Full report saved to: ${this.qualityReportFile}`);
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    async cleanupTinyImages() {
        console.log('🧹 Starting cleanup of tiny images...');
        
        const imageFiles = this.getAllImageFiles();
        let deletedCount = 0;
        
        for (const imagePath of imageFiles) {
            try {
                const stats = fs.statSync(imagePath);
                if (stats.size < 1024) { // Less than 1KB
                    fs.unlinkSync(imagePath);
                    deletedCount++;
                    console.log(`🗑️  Deleted tiny image: ${imagePath.replace(this.baseImageDir, '')} (${stats.size} bytes)`);
                }
            } catch (error) {
                console.error(`Error deleting ${imagePath}:`, error.message);
            }
        }
        
        console.log(`✅ Cleanup complete. Deleted ${deletedCount} tiny images.`);
        return deletedCount;
    }
}

// CLI Usage
if (import.meta.url === `file://${process.argv[1]}`) {
    const monitor = new ImageQualityMonitor();
    
    const command = process.argv[2];
    
    switch (command) {
        case 'analyze':
            await monitor.analyzeImageQuality();
            break;
        case 'cleanup':
            await monitor.cleanupTinyImages();
            break;
        case 'both':
            await monitor.analyzeImageQuality();
            await monitor.cleanupTinyImages();
            await monitor.analyzeImageQuality(); // Re-analyze after cleanup
            break;
        default:
            console.log('Usage: node image_quality_monitor.js [analyze|cleanup|both]');
    }
}

export default ImageQualityMonitor;
