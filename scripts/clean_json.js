#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function cleanJsonFile() {
  try {
    const filePath = path.join(__dirname, '../scrapers/bicycle_brands.json');
    const backupPath = path.join(__dirname, '../scrapers/bicycle_brands.json.backup');
    
    console.log('📂 Reading file...');
    const content = await fs.readFile(filePath, 'utf8');
    
    // Create backup
    await fs.writeFile(backupPath, content);
    console.log('💾 Created backup at bicycle_brands.json.backup');
    
    // Clean the content
    const lines = content.split('\n');
    const cleanedLines = lines.map(line => {
      // Find the comment start
      const commentIndex = line.indexOf('//');
      if (commentIndex !== -1) {
        // Keep everything before the comment
        let cleanLine = line.substring(0, commentIndex).trimEnd();
        return cleanLine;
      }
      return line;
    });
    
    let cleaned = cleanedLines.join('\n');
    
    // Remove trailing commas before closing braces/brackets
    cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');
    
    // Remove extra blank lines
    cleaned = cleaned.replace(/\n\s*\n\s*\n/g, '\n\n');
    
    // Write cleaned version
    await fs.writeFile(filePath, cleaned);
    console.log('✅ Cleaned bicycle_brands.json');
    
    // Test if it's valid JSON
    try {
      JSON.parse(cleaned);
      console.log('✅ JSON is now valid!');
    } catch (error) {
      console.log('❌ JSON still has issues:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

cleanJsonFile();