#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

/**
 * Enhanced monitoring script for image scraping progress
 */

function formatNumber(num) {
    return num.toLocaleString();
}

function calculateETA(processed, total, startTime) {
    const elapsed = Date.now() - startTime;
    const rate = processed / (elapsed / 1000); // items per second
    const remaining = total - processed;
    const etaSeconds = remaining / rate;
    
    const hours = Math.floor(etaSeconds / 3600);
    const minutes = Math.floor((etaSeconds % 3600) / 60);
    
    return `${hours}h ${minutes}m`;
}

function getBrandStats() {
    try {
        const brandDirs = execSync(`ls /Users/kevintong/Documents/Code/bikenode.com/images/motorcycles`).toString().trim().split('\n');
        const stats = {};
        
        brandDirs.forEach(brand => {
            try {
                const brandPath = `/Users/kevintong/Documents/Code/bikenode.com/images/motorcycles/${brand}`;
                const imageCount = execSync(`find "${brandPath}" -name "*.jpg" -o -name "*.png" -o -name "*.gif" -o -name "*.webp" | wc -l`).toString().trim();
                stats[brand] = parseInt(imageCount);
            } catch (e) {
                stats[brand] = 0;
            }
        });
        
        return stats;
    } catch (e) {
        return {};
    }
}

function getProgress() {
    try {
        // Read progress from both scrapers
        const generalProgress = JSON.parse(fs.readFileSync('/Users/kevintong/Documents/Code/bikenode.com/scrapers/06_motorcycle_image_scrapers/data/progress/motorcycle_scraper_progress.json', 'utf8'));
        
        let ducatiProgress = { processed: 0, downloaded: 0, failed: 0, skipped: 0 };
        try {
            ducatiProgress = JSON.parse(fs.readFileSync('/Users/kevintong/Documents/Code/bikenode.com/scrapers/06_motorcycle_image_scrapers/data/progress/ducati_2025_progress.json', 'utf8'));
        } catch (e) {
            // Ducati progress file might not exist
        }
        
        // Count actual image files
        const imageCount = execSync(`find /Users/kevintong/Documents/Code/bikenode.com/images/motorcycles -name "*.jpg" -o -name "*.png" -o -name "*.gif" -o -name "*.webp" | wc -l`).toString().trim();
        
        // Calculate totals
        const totalProcessed = generalProgress.processed + ducatiProgress.processed;
        const totalDownloaded = generalProgress.downloaded + ducatiProgress.downloaded;
        const totalFailed = generalProgress.failed + ducatiProgress.failed;
        const totalSkipped = generalProgress.skipped + ducatiProgress.skipped;
        
        const totalMotorcycles = 44124; // Total in database
        const startTime = Date.now() - (totalProcessed * 2000); // Estimate start time
        
        console.log('🏍️  Motorcycle Image Scraping Progress Report');
        console.log('=' .repeat(50));
        console.log(`📊 General Scraper: ${formatNumber(generalProgress.processed)} processed, ${formatNumber(generalProgress.downloaded)} downloaded`);
        console.log(`🏁 Ducati Scraper: ${formatNumber(ducatiProgress.processed)} processed, ${formatNumber(ducatiProgress.downloaded)} downloaded`);
        console.log('');
        console.log(`📁 Total Images on Disk: ${formatNumber(parseInt(imageCount))}`);
        console.log(`✅ Total Downloaded: ${formatNumber(totalDownloaded)}`);
        console.log(`❌ Total Failed: ${formatNumber(totalFailed)}`);
        console.log(`⏭️  Total Skipped: ${formatNumber(totalSkipped)}`);
        console.log(`📈 Success Rate: ${((totalDownloaded / (totalDownloaded + totalFailed)) * 100).toFixed(1)}%`);
        console.log('');
        console.log(`🎯 Progress: ${formatNumber(totalProcessed)} / ${formatNumber(totalMotorcycles)} (${((totalProcessed / totalMotorcycles) * 100).toFixed(2)}%)`);
        console.log(`⏱️  Estimated ETA: ${calculateETA(totalProcessed, totalMotorcycles, startTime)}`);
        console.log(`🔥 Average Images per Motorcycle: ${(totalDownloaded / totalProcessed).toFixed(1)}`);
        console.log('');
        
        // Show top brands by image count
        console.log('🏆 Top Brands by Image Count:');
        const brandStats = getBrandStats();
        const sortedBrands = Object.entries(brandStats)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10);
        
        sortedBrands.forEach(([brand, count], index) => {
            console.log(`   ${index + 1}. ${brand}: ${formatNumber(count)} images`);
        });
        console.log('');
        
        // Show directory structure sample
        console.log('📁 Sample Directory Structure:');
        try {
            const sampleBrands = execSync(`ls /Users/kevintong/Documents/Code/bikenode.com/images/motorcycles | head -5`).toString().trim().split('\n');
            sampleBrands.forEach(brand => {
                const brandPath = `/Users/kevintong/Documents/Code/bikenode.com/images/motorcycles/${brand}`;
                try {
                    const years = execSync(`ls "${brandPath}" | head -2`).toString().trim().split('\n');
                    console.log(`   📂 ${brand}/`);
                    years.forEach(year => {
                        console.log(`      📂 ${year}/`);
                    });
                } catch (e) {
                    console.log(`   📂 ${brand}/`);
                }
            });
        } catch (e) {
            console.log('   Error reading directory structure');
        }
        
    } catch (error) {
        console.error('Error reading progress:', error.message);
    }
}

// Run monitoring
getProgress();
