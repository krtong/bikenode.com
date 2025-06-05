#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function removeCommentsOnly() {
  try {
    const filePath = path.join(__dirname, '../scrapers/bicycle_brands.json');
    
    console.log('📂 Reading original file...');
    const content = await fs.readFile(filePath, 'utf8');
    
    // Split into lines and only remove comment parts
    const lines = content.split('\n');
    const cleanedLines = lines.map(line => {
      // Find // and remove everything after it
      const commentIndex = line.indexOf('//');
      if (commentIndex !== -1) {
        return line.substring(0, commentIndex).trimEnd();
      }
      return line;
    });
    
    // Join back together
    let cleaned = cleanedLines.join('\n');
    
    // Remove trailing commas before closing braces/brackets
    cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');
    
    // Write cleaned version
    await fs.writeFile(filePath, cleaned);
    console.log('✅ Removed comments from bicycle_brands.json');
    
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

removeCommentsOnly();