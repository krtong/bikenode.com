#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ScraperStatusMonitor {
    constructor() {
        this.projectRoot = path.resolve(__dirname, '../../../..');
        this.scraperRoot = path.resolve(__dirname, '..');
        this.imageRoot = '/Users/kevintong/Documents/Code/bikenode.com/images/motorcycles';
        this.progressDir = path.join(this.scraperRoot, 'data/progress');
        
        this.scraperProcesses = [
            {
                name: 'Generic Motorcycle Scraper',
                processPattern: '06_motorcycle_image_scraper.js',
                progressFile: 'motorcycle_scraper_progress.json'
            },
            {
                name: 'Honda Official Scraper',
                processPattern: 'honda_official_scraper.js',
                progressFile: 'honda_scraper_progress.json'
            },
            {
                name: 'Yamaha Official Scraper',
                processPattern: 'yamaha_official_scraper.js',
                progressFile: 'yamaha_scraper_progress.json'
            },
            {
                name: 'Suzuki Official Scraper',
                processPattern: 'suzuki_official_scraper.js',
                progressFile: 'suzuki_scraper_progress.json'
            }
        ];
    }

    getRunningProcesses() {
        const runningProcesses = [];
        
        for (const scraper of this.scraperProcesses) {
            try {
                const output = execSync(`ps aux | grep "${scraper.processPattern}" | grep -v grep`, { encoding: 'utf8' });
                if (output.trim()) {
                    const lines = output.trim().split('\n');
                    for (const line of lines) {
                        const parts = line.trim().split(/\s+/);
                        runningProcesses.push({
                            name: scraper.name,
                            pid: parts[1],
                            cpu: parts[2],
                            memory: parts[3],
                            startTime: parts[8],
                            runtime: parts[9],
                            progressFile: scraper.progressFile
                        });
                    }
                }
            } catch (error) {
                // Process not running
            }
        }
        
        return runningProcesses;
    }

    getProgressStats() {
        const stats = {};
        
        for (const scraper of this.scraperProcesses) {
            const progressPath = path.join(this.progressDir, scraper.progressFile);
            if (fs.existsSync(progressPath)) {
                try {
                    const progress = JSON.parse(fs.readFileSync(progressPath, 'utf8'));
                    stats[scraper.name] = progress;
                } catch (error) {
                    stats[scraper.name] = { error: 'Failed to read progress' };
                }
            } else {
                stats[scraper.name] = { status: 'No progress file' };
            }
        }
        
        return stats;
    }

    getImageStats() {
        const stats = {
            totalImages: 0,
            byManufacturer: {},
            recentActivity: {}
        };

        if (!fs.existsSync(this.imageRoot)) {
            return stats;
        }

        try {
            // Get total image count
            const output = execSync(`find "${this.imageRoot}" -name "*.jpg" -o -name "*.png" -o -name "*.jpeg" | wc -l`, { encoding: 'utf8' });
            stats.totalImages = parseInt(output.trim());

            // Get manufacturer breakdown
            const manufacturers = fs.readdirSync(this.imageRoot, { withFileTypes: true })
                .filter(dirent => dirent.isDirectory())
                .map(dirent => dirent.name);

            for (const manufacturer of manufacturers) {
                const manufacturerPath = path.join(this.imageRoot, manufacturer);
                try {
                    const count = execSync(`find "${manufacturerPath}" -name "*.jpg" -o -name "*.png" -o -name "*.jpeg" | wc -l`, { encoding: 'utf8' });
                    stats.byManufacturer[manufacturer] = parseInt(count.trim());
                } catch (error) {
                    stats.byManufacturer[manufacturer] = 0;
                }
            }

            // Get recent activity (last 10 minutes)
            try {
                const recentCount = execSync(`find "${this.imageRoot}" -name "*.jpg" -newermt "10 minutes ago" | wc -l`, { encoding: 'utf8' });
                stats.recentActivity.last10min = parseInt(recentCount.trim());
            } catch (error) {
                stats.recentActivity.last10min = 0;
            }

            // Get recent activity (last hour)
            try {
                const recentHourCount = execSync(`find "${this.imageRoot}" -name "*.jpg" -newermt "1 hour ago" | wc -l`, { encoding: 'utf8' });
                stats.recentActivity.lastHour = parseInt(recentHourCount.trim());
            } catch (error) {
                stats.recentActivity.lastHour = 0;
            }

        } catch (error) {
            console.error('Error getting image stats:', error.message);
        }

        return stats;
    }

    getDatabaseStats() {
        try {
            const dbPath = '/Users/kevintong/Documents/Code/bikenode.com/database/data/motorcycles_updated.csv';
            if (!fs.existsSync(dbPath)) {
                return { error: 'Database file not found' };
            }

            const content = fs.readFileSync(dbPath, 'utf8');
            const lines = content.split('\n');
            const totalMotorcycles = lines.length - 1; // Subtract header row

            return {
                totalMotorcycles,
                databaseFile: dbPath,
                lastModified: fs.statSync(dbPath).mtime
            };
        } catch (error) {
            return { error: error.message };
        }
    }

    calculateCoverageStats(imageStats, dbStats) {
        if (dbStats.error || !dbStats.totalMotorcycles) {
            return { error: 'Cannot calculate coverage without database stats' };
        }

        const totalImages = imageStats.totalImages;
        const totalMotorcycles = dbStats.totalMotorcycles;
        
        // Estimate unique motorcycles with images (assuming ~3 images per motorcycle)
        const estimatedCoverage = Math.round((totalImages / 3) / totalMotorcycles * 100 * 100) / 100;
        
        return {
            totalImages,
            totalMotorcycles,
            estimatedCoverage: `${estimatedCoverage}%`,
            avgImagesPerMotorcycle: Math.round((totalImages / totalMotorcycles) * 100) / 100,
            remainingMotorcycles: totalMotorcycles - Math.floor(totalImages / 3)
        };
    }

    getTopManufacturersByImageCount(imageStats, limit = 10) {
        const manufacturers = Object.entries(imageStats.byManufacturer)
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit);
        
        return manufacturers;
    }

    generateReport() {
        console.log('\n🚀 MOTORCYCLE IMAGE SCRAPER STATUS REPORT');
        console.log('==========================================');
        console.log(`📅 Generated: ${new Date().toLocaleString()}\n`);

        // Running processes
        const runningProcesses = this.getRunningProcesses();
        console.log('🔄 RUNNING SCRAPERS:');
        if (runningProcesses.length === 0) {
            console.log('   ❌ No scrapers currently running\n');
        } else {
            runningProcesses.forEach(proc => {
                console.log(`   ✅ ${proc.name}`);
                console.log(`      PID: ${proc.pid} | CPU: ${proc.cpu}% | Memory: ${proc.memory}% | Runtime: ${proc.runtime}`);
            });
            console.log();
        }

        // Progress stats
        const progressStats = this.getProgressStats();
        console.log('📊 PROGRESS STATUS:');
        Object.entries(progressStats).forEach(([scraperName, progress]) => {
            if (progress.error) {
                console.log(`   ⚠️  ${scraperName}: ${progress.error}`);
            } else if (progress.status) {
                console.log(`   📝 ${scraperName}: ${progress.status}`);
            } else {
                console.log(`   📈 ${scraperName}:`);
                console.log(`      Processed: ${progress.processed || 0} | Downloaded: ${progress.downloaded || 0} | Failed: ${progress.failed || 0} | Skipped: ${progress.skipped || 0}`);
            }
        });
        console.log();

        // Image stats
        const imageStats = this.getImageStats();
        console.log('🖼️  IMAGE COLLECTION STATUS:');
        console.log(`   📸 Total Images: ${imageStats.totalImages.toLocaleString()}`);
        console.log(`   🏭 Manufacturers: ${Object.keys(imageStats.byManufacturer).length}`);
        console.log(`   🔥 Recent Activity: ${imageStats.recentActivity.last10min} new images (last 10 min), ${imageStats.recentActivity.lastHour} (last hour)`);
        console.log();

        // Database stats
        const dbStats = this.getDatabaseStats();
        console.log('💾 DATABASE STATUS:');
        if (dbStats.error) {
            console.log(`   ❌ Error: ${dbStats.error}`);
        } else {
            console.log(`   📋 Total Motorcycles: ${dbStats.totalMotorcycles.toLocaleString()}`);
            console.log(`   📅 Last Modified: ${new Date(dbStats.lastModified).toLocaleString()}`);
        }
        console.log();

        // Coverage analysis
        const coverage = this.calculateCoverageStats(imageStats, dbStats);
        console.log('📈 COVERAGE ANALYSIS:');
        if (coverage.error) {
            console.log(`   ❌ ${coverage.error}`);
        } else {
            console.log(`   🎯 Estimated Coverage: ${coverage.estimatedCoverage}`);
            console.log(`   📸 Avg Images/Motorcycle: ${coverage.avgImagesPerMotorcycle}`);
            console.log(`   🎯 Remaining Motorcycles: ${coverage.remainingMotorcycles.toLocaleString()}`);
        }
        console.log();

        // Top manufacturers
        const topManufacturers = this.getTopManufacturersByImageCount(imageStats);
        console.log('🏆 TOP MANUFACTURERS BY IMAGE COUNT:');
        topManufacturers.forEach(([manufacturer, count], index) => {
            console.log(`   ${index + 1}. ${manufacturer}: ${count} images`);
        });

        return {
            runningProcesses,
            progressStats,
            imageStats,
            dbStats,
            coverage,
            topManufacturers,
            timestamp: new Date().toISOString()
        };
    }

    async saveReportToFile() {
        const report = this.generateReport();
        const reportPath = path.join(this.scraperRoot, 'data/analysis/scraper_status_report.json');
        
        // Ensure directory exists
        const reportDir = path.dirname(reportPath);
        if (!fs.existsSync(reportDir)) {
            fs.mkdirSync(reportDir, { recursive: true });
        }

        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        console.log(`\n📄 Detailed report saved to: ${reportPath}\n`);
        
        return reportPath;
    }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
    const monitor = new ScraperStatusMonitor();
    const command = process.argv[2] || 'report';

    switch (command) {
        case 'report':
            monitor.generateReport();
            break;
        case 'save':
            monitor.saveReportToFile();
            break;
        case 'watch':
            console.log('🔄 Starting status monitor (refreshing every 30 seconds)...\n');
            monitor.generateReport();
            setInterval(() => {
                console.clear();
                monitor.generateReport();
            }, 30000);
            break;
        default:
            console.log('Usage: node scraper_status_monitor.js [report|save|watch]');
            console.log('  report - Display current status (default)');
            console.log('  save   - Generate report and save to file');
            console.log('  watch  - Continuous monitoring (refresh every 30s)');
    }
}

export default ScraperStatusMonitor;
