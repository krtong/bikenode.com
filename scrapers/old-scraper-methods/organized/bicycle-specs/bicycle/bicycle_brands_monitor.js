#!/usr/bin/env node
/**
 * Bicycle Brands Data Monitor
 * Automated validation, health checks, and monitoring system
 */

const fs = require('fs');
const https = require('https');
const http = require('http');
const url = require('url');

// Load the brands data
let brandinfo;
try {
    brandinfo = require('./bicycle_brands_cleaned.js');
    console.log('📦 Loaded cleaned bicycle brands data');
} catch (e) {
    brandinfo = require('./bicycle_brands.js');
    console.log('📦 Loaded original bicycle brands data');
}

class BrandMonitor {
    constructor(brands) {
        this.brands = brands;
        this.results = {
            timestamp: new Date().toISOString(),
            total_brands: brands.length,
            health_score: 0,
            validations: {},
            url_checks: {},
            data_quality: {},
            alerts: []
        };
    }

    async checkWebsiteHealth(brand) {
        return new Promise((resolve) => {
            if (!brand.website) {
                resolve({ status: 'no_website', message: 'No website provided' });
                return;
            }

            try {
                const parsedUrl = new URL(brand.website);
                const client = parsedUrl.protocol === 'https:' ? https : http;
                
                const options = {
                    hostname: parsedUrl.hostname,
                    port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
                    path: parsedUrl.pathname,
                    method: 'HEAD',
                    timeout: 10000,
                    headers: {
                        'User-Agent': 'BikeNode-Monitor/1.0'
                    }
                };

                const req = client.request(options, (res) => {
                    resolve({
                        status: 'success',
                        status_code: res.statusCode,
                        headers: res.headers,
                        message: `HTTP ${res.statusCode}`
                    });
                });

                req.on('timeout', () => {
                    req.destroy();
                    resolve({ status: 'timeout', message: 'Request timeout' });
                });

                req.on('error', (err) => {
                    resolve({ status: 'error', message: err.message });
                });

                req.end();
            } catch (error) {
                resolve({ status: 'invalid_url', message: error.message });
            }
        });
    }

    async checkSocialMediaUrls(brand) {
        const social = brand.social_media || {};
        const checks = {};

        for (const [platform, url] of Object.entries(social)) {
            if (url) {
                checks[platform] = await this.checkWebsiteHealth({ website: url });
                // Add small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }

        return checks;
    }

    validateDataStructure(brand) {
        const issues = [];
        const warnings = [];

        // Required fields
        if (!brand.brand_id) issues.push('Missing brand_id');
        if (!brand.brand_name) issues.push('Missing brand_name');

        // Data type validation
        if (brand.founding?.year && (isNaN(brand.founding.year) || brand.founding.year < 1800 || brand.founding.year > new Date().getFullYear() + 5)) {
            issues.push(`Invalid founding year: ${brand.founding.year}`);
        }

        // URL validation
        const urlFields = [
            { field: 'website', value: brand.website },
            { field: 'wikipedia_url', value: brand.wikipedia_url },
            { field: 'logo.logo_url', value: brand.logo?.logo_url },
            { field: 'logo.icon_url', value: brand.logo?.icon_url }
        ];

        urlFields.forEach(({ field, value }) => {
            if (value && !this.isValidUrl(value)) {
                issues.push(`Invalid URL in ${field}: ${value}`);
            }
        });

        // Social media URL validation
        if (brand.social_media) {
            Object.entries(brand.social_media).forEach(([platform, url]) => {
                if (url && !this.isValidUrl(url)) {
                    issues.push(`Invalid ${platform} URL: ${url}`);
                }
            });
        }

        // Array validation
        const arrayFields = ['founders', 'famous_models', 'flagship_models'];
        arrayFields.forEach(field => {
            const value = brand[field];
            if (value && !Array.isArray(value)) {
                issues.push(`Field ${field} should be an array`);
            } else if (Array.isArray(value) && value.some(item => !item || item.trim() === '')) {
                warnings.push(`Field ${field} contains empty values`);
            }
        });

        // Completeness warnings
        if (!brand.website) warnings.push('Missing website');
        if (!brand.founding?.year) warnings.push('Missing founding year');
        if (!brand.headquarters?.country) warnings.push('Missing headquarters country');
        if (!brand.logo?.icon_url) warnings.push('Missing logo/icon');
        if (!brand.social_media?.instagram && !brand.social_media?.facebook) {
            warnings.push('Missing social media presence');
        }

        return { issues, warnings };
    }

    isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }

    async runHealthChecks() {
        console.log('🏥 Running health checks on all brands...');
        const healthResults = {};
        let healthyCount = 0;

        for (let i = 0; i < this.brands.length; i++) {
            const brand = this.brands[i];
            console.log(`Checking ${i + 1}/${this.brands.length}: ${brand.brand_name}`);

            const websiteCheck = await this.checkWebsiteHealth(brand);
            const socialChecks = await this.checkSocialMediaUrls(brand);

            healthResults[brand.brand_id] = {
                website: websiteCheck,
                social_media: socialChecks
            };

            if (websiteCheck.status === 'success' && websiteCheck.status_code === 200) {
                healthyCount++;
            }

            // Progress indicator
            if (i % 10 === 0 || i === this.brands.length - 1) {
                console.log(`Progress: ${i + 1}/${this.brands.length} (${Math.round((i + 1) / this.brands.length * 100)}%)`);
            }
        }

        this.results.url_checks = healthResults;
        this.results.health_score = Math.round((healthyCount / this.brands.length) * 100);
        
        return healthResults;
    }

    runDataValidation() {
        console.log('🔍 Running data validation...');
        const validationResults = {};
        let totalIssues = 0;
        let totalWarnings = 0;

        this.brands.forEach(brand => {
            const validation = this.validateDataStructure(brand);
            validationResults[brand.brand_id] = validation;
            totalIssues += validation.issues.length;
            totalWarnings += validation.warnings.length;

            // Create alerts for critical issues
            if (validation.issues.length > 0) {
                this.results.alerts.push({
                    type: 'data_validation',
                    severity: 'error',
                    brand_id: brand.brand_id,
                    brand_name: brand.brand_name,
                    issues: validation.issues
                });
            }
        });

        this.results.validations = validationResults;
        this.results.data_quality = {
            total_issues: totalIssues,
            total_warnings: totalWarnings,
            brands_with_issues: Object.values(validationResults).filter(v => v.issues.length > 0).length,
            brands_with_warnings: Object.values(validationResults).filter(v => v.warnings.length > 0).length
        };

        return validationResults;
    }

    generateHealthReport() {
        const report = {
            summary: {
                timestamp: this.results.timestamp,
                total_brands: this.results.total_brands,
                health_score: this.results.health_score,
                data_quality_score: Math.round(((this.results.total_brands - this.results.data_quality.brands_with_issues) / this.results.total_brands) * 100)
            },
            website_health: {
                total_checked: Object.keys(this.results.url_checks).length,
                healthy: Object.values(this.results.url_checks).filter(r => r.website.status === 'success' && r.website.status_code === 200).length,
                timeout: Object.values(this.results.url_checks).filter(r => r.website.status === 'timeout').length,
                error: Object.values(this.results.url_checks).filter(r => r.website.status === 'error').length,
                no_website: Object.values(this.results.url_checks).filter(r => r.website.status === 'no_website').length
            },
            data_quality: this.results.data_quality,
            alerts: this.results.alerts,
            recommendations: this.generateRecommendations()
        };

        return report;
    }

    generateRecommendations() {
        const recommendations = [];

        // Website health recommendations
        const websiteIssues = Object.values(this.results.url_checks).filter(r => 
            r.website.status !== 'success' && r.website.status !== 'no_website'
        ).length;

        if (websiteIssues > 0) {
            recommendations.push({
                category: 'website_health',
                priority: 'high',
                message: `${websiteIssues} brands have website connectivity issues. Consider updating URLs or removing broken links.`
            });
        }

        // Data completeness recommendations
        if (this.results.data_quality.brands_with_issues > 0) {
            recommendations.push({
                category: 'data_quality',
                priority: 'high',
                message: `${this.results.data_quality.brands_with_issues} brands have data validation issues. Run the cleaner tool to fix common problems.`
            });
        }

        // Missing data recommendations
        const brandsWithoutWebsites = this.brands.filter(b => !b.website).length;
        if (brandsWithoutWebsites > 5) {
            recommendations.push({
                category: 'data_completeness',
                priority: 'medium',
                message: `${brandsWithoutWebsites} brands missing websites. Use the enhancer tool to add missing URLs.`
            });
        }

        const brandsWithoutSocial = this.brands.filter(b => 
            !b.social_media?.instagram && !b.social_media?.facebook
        ).length;
        if (brandsWithoutSocial > 10) {
            recommendations.push({
                category: 'data_completeness',
                priority: 'low',
                message: `${brandsWithoutSocial} brands missing social media presence. Consider adding Instagram/Facebook URLs.`
            });
        }

        return recommendations;
    }

    async runFullMonitoring() {
        console.log('🚀 Starting comprehensive brand monitoring...\n');

        // Run data validation
        this.runDataValidation();
        console.log(`✅ Data validation complete: ${this.results.data_quality.total_issues} issues, ${this.results.data_quality.total_warnings} warnings\n`);

        // Run health checks
        await this.runHealthChecks();
        console.log(`\n✅ Health checks complete: ${this.results.health_score}% healthy websites\n`);

        // Generate report
        const report = this.generateHealthReport();
        
        // Save detailed results
        const timestamp = new Date().toISOString().split('T')[0];
        const resultsFile = `bicycle_brands_monitoring_${timestamp}.json`;
        fs.writeFileSync(resultsFile, JSON.stringify(this.results, null, 2));

        // Save summary report
        const reportFile = `bicycle_brands_health_report_${timestamp}.json`;
        fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));

        console.log('📊 MONITORING SUMMARY');
        console.log('=' * 25);
        console.log(`Overall Health Score: ${report.summary.health_score}%`);
        console.log(`Data Quality Score: ${report.summary.data_quality_score}%`);
        console.log(`\n🌐 Website Health:`);
        console.log(`  Healthy: ${report.website_health.healthy}`);
        console.log(`  Timeouts: ${report.website_health.timeout}`);
        console.log(`  Errors: ${report.website_health.error}`);
        console.log(`  No Website: ${report.website_health.no_website}`);
        
        console.log(`\n🔍 Data Quality:`);
        console.log(`  Brands with Issues: ${report.data_quality.brands_with_issues}`);
        console.log(`  Brands with Warnings: ${report.data_quality.brands_with_warnings}`);
        console.log(`  Total Issues: ${report.data_quality.total_issues}`);
        console.log(`  Total Warnings: ${report.data_quality.total_warnings}`);

        if (report.alerts.length > 0) {
            console.log(`\n⚠️  ALERTS (${report.alerts.length}):`);
            report.alerts.slice(0, 5).forEach(alert => {
                console.log(`  ${alert.severity.toUpperCase()}: ${alert.brand_name} - ${alert.issues.join(', ')}`);
            });
            if (report.alerts.length > 5) {
                console.log(`  ... and ${report.alerts.length - 5} more alerts`);
            }
        }

        if (report.recommendations.length > 0) {
            console.log(`\n💡 RECOMMENDATIONS:`);
            report.recommendations.forEach(rec => {
                console.log(`  [${rec.priority.toUpperCase()}] ${rec.message}`);
            });
        }

        console.log(`\n💾 Files saved:`);
        console.log(`  Detailed results: ${resultsFile}`);
        console.log(`  Summary report: ${reportFile}`);

        return report;
    }

    async quickHealthCheck() {
        console.log('⚡ Running quick health check (data validation only)...');
        
        this.runDataValidation();
        const report = this.generateHealthReport();
        
        console.log(`\n📊 Quick Health Check Results:`);
        console.log(`Data Quality Score: ${report.summary.data_quality_score}%`);
        console.log(`Issues: ${report.data_quality.total_issues}`);
        console.log(`Warnings: ${report.data_quality.total_warnings}`);

        return report;
    }
}

// CLI interface
if (require.main === module) {
    const monitor = new BrandMonitor(brandinfo);
    
    const args = process.argv.slice(2);
    const command = args[0] || 'full';

    if (command === 'quick') {
        monitor.quickHealthCheck().catch(console.error);
    } else if (command === 'full') {
        monitor.runFullMonitoring().catch(console.error);
    } else if (command === 'validation') {
        monitor.runDataValidation();
        console.log('✅ Data validation complete');
        console.log(`Issues: ${monitor.results.data_quality.total_issues}`);
        console.log(`Warnings: ${monitor.results.data_quality.total_warnings}`);
    } else {
        console.log('🏥 Bicycle Brands Monitor');
        console.log('\nUsage:');
        console.log('  node bicycle_brands_monitor.js [command]');
        console.log('\nCommands:');
        console.log('  full       - Complete monitoring with health checks (default)');
        console.log('  quick      - Quick data validation only');
        console.log('  validation - Data structure validation only');
        console.log('\nExamples:');
        console.log('  node bicycle_brands_monitor.js');
        console.log('  node bicycle_brands_monitor.js quick');
    }
}

module.exports = BrandMonitor;