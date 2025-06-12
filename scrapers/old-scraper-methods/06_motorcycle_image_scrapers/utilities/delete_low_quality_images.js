#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { loadImage } from 'canvas';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const IMAGES_DIR = path.join(__dirname, '../../../images/motorcycles');
const MIN_WIDTH = 600;
const MIN_HEIGHT = 600;

// Stats tracking
let stats = {
    totalChecked: 0,
    deleted: 0,
    errors: 0,
    skipped: 0
};

// Log file for deleted images
const logFile = path.join(__dirname, '../logs/deleted_low_quality_images.log');

function logDeletion(imagePath, dimensions) {
    const logEntry = `${new Date().toISOString()} - DELETED: ${imagePath} (${dimensions.width}x${dimensions.height})\n`;
    fs.appendFileSync(logFile, logEntry);
}

function logError(imagePath, error) {
    const logEntry = `${new Date().toISOString()} - ERROR: ${imagePath} - ${error.message}\n`;
    fs.appendFileSync(logFile, logEntry);
}

async function getImageDimensions(imagePath) {
    try {
        const image = await loadImage(imagePath);
        return { width: image.width, height: image.height };
    } catch (error) {
        throw new Error(`Failed to load image: ${error.message}`);
    }
}

async function processImage(imagePath) {
    try {
        stats.totalChecked++;
        
        const dimensions = await getImageDimensions(imagePath);
        
        if (dimensions.width < MIN_WIDTH || dimensions.height < MIN_HEIGHT) {
            // Delete the low-quality image
            fs.unlinkSync(imagePath);
            logDeletion(imagePath, dimensions);
            stats.deleted++;
            console.log(`Deleted: ${path.basename(imagePath)} (${dimensions.width}x${dimensions.height})`);
        } else {
            stats.skipped++;
        }
        
        // Progress indicator
        if (stats.totalChecked % 100 === 0) {
            console.log(`Progress: ${stats.totalChecked} images checked, ${stats.deleted} deleted`);
        }
        
    } catch (error) {
        stats.errors++;
        logError(imagePath, error);
        console.error(`Error processing ${imagePath}: ${error.message}`);
    }
}

async function processDirectory(dirPath) {
    try {
        const items = fs.readdirSync(dirPath);
        
        for (const item of items) {
            const itemPath = path.join(dirPath, item);
            const stat = fs.statSync(itemPath);
            
            if (stat.isDirectory()) {
                await processDirectory(itemPath);
            } else if (stat.isFile() && /\.(jpg|jpeg|png|webp|gif)$/i.test(item)) {
                await processImage(itemPath);
            }
        }
    } catch (error) {
        console.error(`Error processing directory ${dirPath}: ${error.message}`);
    }
}

async function main() {
    console.log('Starting low-quality image cleanup...');
    console.log(`Target directory: ${IMAGES_DIR}`);
    console.log(`Minimum dimensions: ${MIN_WIDTH}x${MIN_HEIGHT}`);
    console.log('');
    
    // Check if images directory exists
    if (!fs.existsSync(IMAGES_DIR)) {
        console.error(`Images directory not found: ${IMAGES_DIR}`);
        process.exit(1);
    }
    
    // Ensure logs directory exists
    const logsDir = path.dirname(logFile);
    if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
    }
    
    // Start processing
    const startTime = Date.now();
    await processDirectory(IMAGES_DIR);
    const endTime = Date.now();
    
    // Final report
    console.log('\n=== CLEANUP COMPLETE ===');
    console.log(`Total images checked: ${stats.totalChecked}`);
    console.log(`Images deleted: ${stats.deleted}`);
    console.log(`Images kept: ${stats.skipped}`);
    console.log(`Errors encountered: ${stats.errors}`);
    console.log(`Processing time: ${((endTime - startTime) / 1000).toFixed(2)} seconds`);
    console.log(`Log file: ${logFile}`);
    
    // Save final stats
    const statsFile = path.join(__dirname, '../logs/cleanup_stats.json');
    fs.writeFileSync(statsFile, JSON.stringify({
        ...stats,
        processingTime: endTime - startTime,
        timestamp: new Date().toISOString(),
        minDimensions: { width: MIN_WIDTH, height: MIN_HEIGHT }
    }, null, 2));
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n\nInterrupted by user. Final stats:');
    console.log(`Checked: ${stats.totalChecked}, Deleted: ${stats.deleted}, Errors: ${stats.errors}`);
    process.exit(0);
});

main().catch(console.error);
