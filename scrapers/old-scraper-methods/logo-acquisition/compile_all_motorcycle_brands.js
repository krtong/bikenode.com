#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

// Function to read CSV and extract brands
function extractBrandsFromCSV(filePath, columnIndex = 0) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const records = parse(content, {
            columns: false,
            skip_empty_lines: true,
            from_line: 2 // Skip header
        });
        
        const brands = new Set();
        records.forEach(record => {
            if (record[columnIndex]) {
                brands.add(record[columnIndex].trim());
            }
        });
        
        return Array.from(brands);
    } catch (error) {
        console.error(`Error reading ${filePath}:`, error.message);
        return [];
    }
}

// Function to read brands from JavaScript files
function extractBrandsFromJS(filePath, arrayName) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const regex = new RegExp(`const ${arrayName} = \\[([^\\]]+)\\]`, 's');
        const match = content.match(regex);
        
        if (match) {
            const brandsString = match[1];
            const brands = brandsString
                .split(',')
                .map(b => b.trim().replace(/['"]/g, ''))
                .filter(b => b.length > 0);
            return brands;
        }
        return [];
    } catch (error) {
        console.error(`Error reading ${filePath}:`, error.message);
        return [];
    }
}

async function compileAllMotorcycleBrands() {
    console.log('🏍️ Compiling all motorcycle brands from various sources...\n');
    
    const allBrands = new Set();
    
    // 1. Main motorcycle brands CSV
    const mainBrandsCSV = '/Users/kevintong/Documents/Code/bikenode.com/database/data/motorcycle_brands.csv';
    const mainBrands = extractBrandsFromCSV(mainBrandsCSV, 0);
    console.log(`✓ Found ${mainBrands.length} brands in motorcycle_brands.csv`);
    mainBrands.forEach(brand => allBrands.add(brand));
    
    // 2. Discord bot motorcycle database
    const discordCSV = '/Users/kevintong/Documents/Code/bikenode.com/discord-bot/commands/motorcycle_database.csv';
    const discordBrands = extractBrandsFromCSV(discordCSV, 1); // Make column
    console.log(`✓ Found ${discordBrands.length} brands in discord bot database`);
    discordBrands.forEach(brand => allBrands.add(brand));
    
    // 3. Comprehensive motorcycle scraper
    const scraperJS = '/Users/kevintong/Documents/Code/bikenode.com/scrapers/comprehensive_motorcycle_scraper.js';
    const scraperBrands = extractBrandsFromJS(scraperJS, 'MOTORCYCLE_MANUFACTURERS');
    console.log(`✓ Found ${scraperBrands.length} brands in comprehensive scraper`);
    scraperBrands.forEach(brand => allBrands.add(brand));
    
    // 4. Check other CSV files
    const otherCSVs = [
        '/Users/kevintong/Documents/Code/bikenode.com/scrapers/motorcycles_comprehensive.csv',
        '/Users/kevintong/Documents/Code/bikenode.com/database/data/motorcycles.csv',
        '/Users/kevintong/Documents/Code/bikenode.com/database/data/motorcycles_updated.csv'
    ];
    
    for (const csvPath of otherCSVs) {
        if (fs.existsSync(csvPath)) {
            // Try different column indices for Make/Brand
            for (let col of [1, 2, 3]) {
                const brands = extractBrandsFromCSV(csvPath, col);
                if (brands.length > 0) {
                    console.log(`✓ Found ${brands.length} brands in ${path.basename(csvPath)} (column ${col})`);
                    brands.forEach(brand => allBrands.add(brand));
                    break;
                }
            }
        }
    }
    
    // Convert to sorted array and clean up
    const sortedBrands = Array.from(allBrands)
        .filter(brand => brand && brand.length > 0 && brand !== 'Make' && brand !== 'Brand')
        .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
    
    console.log(`\n📊 Total unique motorcycle brands found: ${sortedBrands.length}`);
    
    // Save to multiple formats
    const outputDir = '/Users/kevintong/Documents/Code/bikenode.com/scrapers/logo-acquisition';
    
    // 1. Simple text list
    const textPath = path.join(outputDir, 'all_motorcycle_brands.txt');
    fs.writeFileSync(textPath, sortedBrands.join('\n'));
    console.log(`✓ Saved text list to ${textPath}`);
    
    // 2. JSON format with metadata
    const jsonData = {
        metadata: {
            totalBrands: sortedBrands.length,
            compiledAt: new Date().toISOString(),
            sources: [
                'motorcycle_brands.csv',
                'discord bot database',
                'comprehensive scraper',
                'various motorcycle CSV files'
            ]
        },
        brands: sortedBrands.map(brand => ({
            name: brand,
            needsLogo: true,
            logoStatus: 'pending'
        }))
    };
    
    const jsonPath = path.join(outputDir, 'motorcycle_brands_for_logos.json');
    fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2));
    console.log(`✓ Saved JSON data to ${jsonPath}`);
    
    // 3. CSV for tracking logo acquisition
    const csvHeader = 'Brand,Logo_Status,Logo_URL,Notes\n';
    const csvContent = sortedBrands.map(brand => `"${brand}","pending","",""`)
                                   .join('\n');
    const csvPath = path.join(outputDir, 'motorcycle_logo_tracking.csv');
    fs.writeFileSync(csvPath, csvHeader + csvContent);
    console.log(`✓ Saved tracking CSV to ${csvPath}`);
    
    // Display sample brands
    console.log('\n📝 Sample brands (first 20):');
    sortedBrands.slice(0, 20).forEach(brand => console.log(`  - ${brand}`));
    
    console.log('\n✅ Compilation complete!');
}

// Run the compilation
compileAllMotorcycleBrands().catch(console.error);