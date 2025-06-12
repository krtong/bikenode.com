import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';

/**
 * Motorcycle Database Analyzer
 * Analyzes the current motorcycle database to identify missing variants,
 * gaps in coverage, and opportunities for improvement
 */
class MotorcycleDatabaseAnalyzer {
    constructor() {
        this.csvPath = '/Users/kevintong/Documents/Code/bikenode.com/database/data/motorcycles_updated.csv';
        this.imagesPath = '/Users/kevintong/Documents/Code/bikenode.com/images/motorcycles';
        this.analysisOutputDir = '/Users/kevintong/Documents/Code/bikenode.com/scrapers/06_motorcycle_image_scrapers/data/analysis';
        this.motorcycles = [];
        this.imageMap = new Map();
        
        this.initAnalysisDir();
    }

    initAnalysisDir() {
        if (!fs.existsSync(this.analysisOutputDir)) {
            fs.mkdirSync(this.analysisOutputDir, { recursive: true });
        }
    }

    async loadMotorcycleDatabase() {
        console.log('📊 Loading motorcycle database...');
        
        return new Promise((resolve, reject) => {
            const motorcycles = [];
            
            fs.createReadStream(this.csvPath)
                .pipe(csv())
                .on('data', (row) => {
                    motorcycles.push({
                        year: parseInt(row.Year),
                        make: row.Make?.trim(),
                        model: row.Model?.trim(),
                        package: row.Package?.trim() || '',
                        category: row.Category?.trim(),
                        engine: row.Engine?.trim()
                    });
                })
                .on('end', () => {
                    this.motorcycles = motorcycles.filter(m => m.year && m.make && m.model);
                    console.log(`✅ Loaded ${this.motorcycles.length} motorcycles from database`);
                    resolve(motorcycles);
                })
                .on('error', reject);
        });
    }

    analyzeImageCoverage() {
        console.log('🖼️  Analyzing image coverage...');
        
        const imageMap = new Map();
        const coverage = {
            total_motorcycles: this.motorcycles.length,
            with_images: 0,
            without_images: 0,
            total_images: 0,
            avg_images_per_motorcycle: 0,
            coverage_by_make: {},
            coverage_by_year: {},
            missing_images: []
        };

        // Scan image directory structure
        this.scanImageDirectory(this.imagesPath, imageMap);

        // Analyze coverage for each motorcycle
        for (const motorcycle of this.motorcycles) {
            const key = this.getMotorcycleKey(motorcycle);
            const images = imageMap.get(key) || [];
            
            if (images.length > 0) {
                coverage.with_images++;
                coverage.total_images += images.length;
            } else {
                coverage.without_images++;
                coverage.missing_images.push({
                    year: motorcycle.year,
                    make: motorcycle.make,
                    model: motorcycle.model,
                    package: motorcycle.package
                });
            }

            // Track by make
            if (!coverage.coverage_by_make[motorcycle.make]) {
                coverage.coverage_by_make[motorcycle.make] = { total: 0, with_images: 0 };
            }
            coverage.coverage_by_make[motorcycle.make].total++;
            if (images.length > 0) {
                coverage.coverage_by_make[motorcycle.make].with_images++;
            }

            // Track by year
            if (!coverage.coverage_by_year[motorcycle.year]) {
                coverage.coverage_by_year[motorcycle.year] = { total: 0, with_images: 0 };
            }
            coverage.coverage_by_year[motorcycle.year].total++;
            if (images.length > 0) {
                coverage.coverage_by_year[motorcycle.year].with_images++;
            }
        }

        coverage.avg_images_per_motorcycle = coverage.total_images / coverage.with_images || 0;
        coverage.coverage_percentage = (coverage.with_images / coverage.total_motorcycles) * 100;

        this.imageMap = imageMap;
        return coverage;
    }

    scanImageDirectory(dirPath, imageMap, currentPath = '') {
        try {
            const items = fs.readdirSync(dirPath);
            
            for (const item of items) {
                const itemPath = path.join(dirPath, item);
                const newCurrentPath = currentPath ? `${currentPath}/${item}` : item;
                
                const stats = fs.statSync(itemPath);
                
                if (stats.isDirectory()) {
                    this.scanImageDirectory(itemPath, imageMap, newCurrentPath);
                } else if (stats.isFile() && /\.(jpg|jpeg|png|gif|webp)$/i.test(item)) {
                    // Extract motorcycle info from path: make/year/model/package/filename
                    const pathParts = newCurrentPath.split('/');
                    if (pathParts.length >= 4) {
                        const [make, year, model, packageName] = pathParts;
                        const key = `${year}_${make}_${model}_${packageName}`.toLowerCase();
                        
                        if (!imageMap.has(key)) {
                            imageMap.set(key, []);
                        }
                        imageMap.get(key).push({
                            filename: item,
                            path: newCurrentPath,
                            size: stats.size
                        });
                    }
                }
            }
        } catch (error) {
            console.error(`Error scanning directory ${dirPath}:`, error.message);
        }
    }

    getMotorcycleKey(motorcycle) {
        const packageName = motorcycle.package || 'base';
        return `${motorcycle.year}_${motorcycle.make}_${motorcycle.model}_${packageName}`.toLowerCase();
    }

    identifyMissingVariants() {
        console.log('🔍 Identifying missing motorcycle variants...');
        
        const analysis = {
            missing_by_make: {},
            missing_by_year: {},
            high_priority_missing: [],
            total_missing: 0
        };

        const missingMotorcycles = this.motorcycles.filter(motorcycle => {
            const key = this.getMotorcycleKey(motorcycle);
            const images = this.imageMap.get(key) || [];
            return images.length === 0;
        });

        analysis.total_missing = missingMotorcycles.length;

        // Group missing by make
        for (const motorcycle of missingMotorcycles) {
            if (!analysis.missing_by_make[motorcycle.make]) {
                analysis.missing_by_make[motorcycle.make] = [];
            }
            analysis.missing_by_make[motorcycle.make].push(motorcycle);

            // Group by year
            if (!analysis.missing_by_year[motorcycle.year]) {
                analysis.missing_by_year[motorcycle.year] = [];
            }
            analysis.missing_by_year[motorcycle.year].push(motorcycle);

            // Identify high priority (popular makes, recent years)
            const popularMakes = ['Honda', 'Yamaha', 'Kawasaki', 'Suzuki', 'Ducati', 'BMW', 'Harley-Davidson'];
            const recentYears = [2020, 2021, 2022, 2023, 2024, 2025];
            
            if (popularMakes.includes(motorcycle.make) && recentYears.includes(motorcycle.year)) {
                analysis.high_priority_missing.push(motorcycle);
            }
        }

        return analysis;
    }

    generateMakeYearMatrix() {
        console.log('📊 Generating make-year coverage matrix...');
        
        const matrix = {};
        const years = [...new Set(this.motorcycles.map(m => m.year))].sort();
        const makes = [...new Set(this.motorcycles.map(m => m.make))].sort();

        for (const make of makes) {
            matrix[make] = {};
            for (const year of years) {
                const motorcyclesInCell = this.motorcycles.filter(m => m.make === make && m.year === year);
                const withImages = motorcyclesInCell.filter(m => {
                    const key = this.getMotorcycleKey(m);
                    const images = this.imageMap.get(key) || [];
                    return images.length > 0;
                });

                matrix[make][year] = {
                    total: motorcyclesInCell.length,
                    with_images: withImages.length,
                    coverage_percentage: motorcyclesInCell.length > 0 ? (withImages.length / motorcyclesInCell.length) * 100 : 0
                };
            }
        }

        return { matrix, years, makes };
    }

    async runCompleteAnalysis() {
        console.log('🚀 Starting comprehensive motorcycle database analysis...');
        console.log('===============================================');

        // Load database
        await this.loadMotorcycleDatabase();

        // Run analyses
        const imageCoverage = this.analyzeImageCoverage();
        const missingVariants = this.identifyMissingVariants();
        const matrixData = this.generateMakeYearMatrix();

        // Generate report
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                total_motorcycles: this.motorcycles.length,
                coverage_percentage: imageCoverage.coverage_percentage,
                total_images: imageCoverage.total_images,
                missing_motorcycles: missingVariants.total_missing
            },
            image_coverage: imageCoverage,
            missing_variants: missingVariants,
            make_year_matrix: matrixData
        };

        // Save detailed report
        const reportPath = path.join(this.analysisOutputDir, 'database_analysis_report.json');
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

        // Generate missing variants CSV for easy processing
        const missingCsvPath = path.join(this.analysisOutputDir, 'missing_motorcycles.csv');
        this.generateMissingVariantsCSV(missingVariants, missingCsvPath);

        // Print summary
        this.printAnalysisSummary(report);

        return report;
    }

    generateMissingVariantsCSV(missingVariants, outputPath) {
        const csvHeader = 'Year,Make,Model,Package,Category,Engine,Priority\n';
        const csvRows = [];

        const allMissing = Object.values(missingVariants.missing_by_make).flat();
        
        for (const motorcycle of allMissing) {
            const isHighPriority = missingVariants.high_priority_missing.includes(motorcycle);
            const priority = isHighPriority ? 'HIGH' : 'NORMAL';
            
            csvRows.push([
                motorcycle.year,
                motorcycle.make,
                motorcycle.model,
                motorcycle.package || '',
                motorcycle.category || '',
                motorcycle.engine || '',
                priority
            ].join(','));
        }

        fs.writeFileSync(outputPath, csvHeader + csvRows.join('\n'));
        console.log(`📄 Missing variants CSV saved to: ${outputPath}`);
    }

    printAnalysisSummary(report) {
        console.log('\n📊 MOTORCYCLE DATABASE ANALYSIS SUMMARY');
        console.log('==========================================');
        console.log(`📅 Analysis Date: ${report.timestamp}`);
        console.log(`🏍️  Total Motorcycles: ${report.summary.total_motorcycles.toLocaleString()}`);
        console.log(`📸 Image Coverage: ${report.summary.coverage_percentage.toFixed(1)}%`);
        console.log(`🖼️  Total Images: ${report.summary.total_images.toLocaleString()}`);
        console.log(`❌ Missing Images: ${report.summary.missing_motorcycles.toLocaleString()}`);

        console.log('\n🏆 TOP 10 MAKES BY MISSING COUNT:');
        const missingByMake = Object.entries(report.missing_variants.missing_by_make)
            .map(([make, motorcycles]) => ({ make, count: motorcycles.length }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        missingByMake.forEach((item, index) => {
            console.log(`${index + 1}. ${item.make}: ${item.count} missing`);
        });

        console.log('\n📈 RECENT YEARS COVERAGE:');
        const recentYears = [2020, 2021, 2022, 2023, 2024, 2025];
        for (const year of recentYears) {
            const yearData = report.missing_variants.missing_by_year[year] || [];
            const totalForYear = report.image_coverage.coverage_by_year[year]?.total || 0;
            const withImagesForYear = report.image_coverage.coverage_by_year[year]?.with_images || 0;
            const coveragePercentage = totalForYear > 0 ? (withImagesForYear / totalForYear) * 100 : 0;
            
            console.log(`${year}: ${coveragePercentage.toFixed(1)}% coverage (${yearData.length} missing)`);
        }

        console.log(`\n🎯 High Priority Missing: ${report.missing_variants.high_priority_missing.length}`);
        console.log(`📄 Full report saved to: ${path.join(this.analysisOutputDir, 'database_analysis_report.json')}`);
    }
}

// CLI Usage
if (import.meta.url === `file://${process.argv[1]}`) {
    const analyzer = new MotorcycleDatabaseAnalyzer();
    await analyzer.runCompleteAnalysis();
}

export default MotorcycleDatabaseAnalyzer;
