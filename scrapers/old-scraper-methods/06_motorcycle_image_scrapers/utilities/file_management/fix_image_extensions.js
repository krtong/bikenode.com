// Fix existing image files with incorrect extensions
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const imageDir = '/Users/kevintong/Documents/Code/bikenode.com/images/motorcycles';

function detectFileType(filePath) {
    try {
        // Use the 'file' command to detect actual file type
        const result = execSync(`file "${filePath}"`, { encoding: 'utf8' });
        
        if (result.includes('JPEG') || result.includes('JFIF')) {
            return 'jpg';
        } else if (result.includes('PNG')) {
            return 'png';
        } else if (result.includes('GIF')) {
            return 'gif';
        } else if (result.includes('WebP')) {
            return 'webp';
        } else if (result.includes('bitmap') || result.includes('BMP')) {
            return 'bmp';
        }
        
        return null;
    } catch (error) {
        console.log(`Error detecting file type for ${filePath}: ${error.message}`);
        return null;
    }
}

function hasValidExtension(filename) {
    const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
    const ext = path.extname(filename).toLowerCase();
    return validExtensions.includes(ext);
}

function findAndFixImages(dir) {
    if (!fs.existsSync(dir)) {
        console.log(`Directory does not exist: ${dir}`);
        return;
    }
    
    const items = fs.readdirSync(dir);
    let fixedCount = 0;
    let errorCount = 0;
    
    for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            // Recursively process subdirectories
            const result = findAndFixImages(fullPath);
            fixedCount += result.fixedCount;
            errorCount += result.errorCount;
        } else if (stat.isFile()) {
            // Check if this is a file that looks like it should be an image
            if (item.startsWith('hero_') && !hasValidExtension(item)) {
                console.log(`🔍 Checking file: ${item}`);
                
                const detectedType = detectFileType(fullPath);
                if (detectedType) {
                    // Extract the hero number from the original filename
                    const heroMatch = item.match(/^hero_(\d+)/);
                    if (heroMatch) {
                        const heroNumber = heroMatch[1];
                        const newName = `hero_${heroNumber}.${detectedType}`;
                        const newPath = path.join(dir, newName);
                        
                        try {
                            fs.renameSync(fullPath, newPath);
                            console.log(`✅ Renamed: ${item} → ${newName}`);
                            fixedCount++;
                        } catch (error) {
                            console.log(`❌ Failed to rename ${item}: ${error.message}`);
                            errorCount++;
                        }
                    }
                } else {
                    console.log(`❓ Could not detect file type for: ${item}`);
                    errorCount++;
                }
            }
        }
    }
    
    return { fixedCount, errorCount };
}

console.log('🔧 Starting image file extension fix...');
console.log(`📁 Scanning directory: ${imageDir}`);

const result = findAndFixImages(imageDir);

console.log('\\n🎉 Fix completed!');
console.log(`✅ Fixed files: ${result.fixedCount}`);
console.log(`❌ Errors: ${result.errorCount}`);
