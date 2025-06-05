#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function fixJsonCompletely() {
  try {
    const filePath = path.join(__dirname, '../scrapers/bicycle_brands.json');
    const backupPath = path.join(__dirname, '../scrapers/bicycle_brands_broken.json');
    
    console.log('📂 Reading broken file...');
    const content = await fs.readFile(filePath, 'utf8');
    
    // Create backup
    await fs.writeFile(backupPath, content);
    console.log('💾 Created backup at bicycle_brands_broken.json');
    
    // Clean the content line by line
    const lines = content.split('\n');
    const cleanedLines = [];
    
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      
      // Fix truncated URLs
      if (line.includes('"https:') && !line.includes('://')) {
        console.log(`🔧 Fixing truncated URL on line ${i + 1}: ${line.trim()}`);
        if (line.includes('linkedin_url')) {
          line = line.replace('"https:', '"https://linkedin.com/company/placeholder"');
        } else if (line.includes('icon_url')) {
          line = line.replace('"https:', '"https://example.com/favicon.ico"');
        } else if (line.includes('website')) {
          line = line.replace('"https:', '"https://example.com"');
        } else {
          line = line.replace('"https:', '"https://example.com"');
        }
      }
      
      // Fix lines that end with just quotes
      if (line.trim().endsWith('"') && !line.includes(':')) {
        console.log(`🔧 Fixing hanging quote on line ${i + 1}: ${line.trim()}`);
        line = line.replace(/"\s*$/, '');
        continue; // Skip this line
      }
      
      // Remove comment lines
      if (line.includes('//')) {
        line = line.substring(0, line.indexOf('//')).trimEnd();
      }
      
      cleanedLines.push(line);
    }
    
    let cleaned = cleanedLines.join('\n');
    
    // Remove trailing commas before closing braces/brackets
    cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');
    
    // Remove multiple consecutive commas
    cleaned = cleaned.replace(/,\s*,/g, ',');
    
    // Remove extra blank lines
    cleaned = cleaned.replace(/\n\s*\n\s*\n/g, '\n\n');
    
    // Write cleaned version
    await fs.writeFile(filePath, cleaned);
    console.log('✅ Fixed bicycle_brands.json');
    
    // Test if it's valid JSON
    try {
      const parsed = JSON.parse(cleaned);
      console.log(`✅ JSON is now valid! Found ${Array.isArray(parsed) ? parsed.length : 1} brand(s)`);
    } catch (error) {
      console.log('❌ JSON still has issues:', error.message);
      console.log('🔍 The issue might be on line:', Math.floor(error.message.match(/position (\d+)/)?.[1] / 50) || 'unknown');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

fixJsonCompletely();