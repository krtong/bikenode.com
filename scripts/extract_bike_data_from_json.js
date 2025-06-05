import fs from 'fs';
import path from 'path';
import pg from 'pg';
import { fileURLToPath } from 'url';

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import maker_ids mapping by converting it to JSON
const makerIdsPath = path.join(__dirname, '../scrapers/maker_ids.js');
const makerIdsContent = fs.readFileSync(makerIdsPath, 'utf8');
// Extract the object literal from the file - handle missing semicolon
const makerIdsMatch = makerIdsContent.match(/const maker_ids = ({[\s\S]*})\s*;?\s*$/);
const makerIds = makerIdsMatch ? JSON.parse(makerIdsMatch[1]) : {};

// Database connection
const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'bikenode',
  user: 'postgres',
  password: 'postgres'
});

// Function to search for JSON objects within a string
function extractJsonObjects(text) {
  const jsonObjects = [];
  const stack = [];
  let currentJson = '';
  let inJson = false;
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    
    if (char === '{') {
      if (!inJson) {
        inJson = true;
        currentJson = '';
      }
      stack.push('{');
      currentJson += char;
    } else if (char === '}' && inJson) {
      stack.pop();
      currentJson += char;
      
      if (stack.length === 0) {
        try {
          const parsed = JSON.parse(currentJson);
          // Check if this JSON has the fields we're looking for
          if (parsed.makerid || parsed.familyid || parsed.family || parsed.model) {
            jsonObjects.push(parsed);
          }
        } catch (e) {
          // Not valid JSON, continue
        }
        inJson = false;
        currentJson = '';
      }
    } else if (inJson) {
      currentJson += char;
    }
  }
  
  return jsonObjects;
}

// Function to extract bike info from various JSON structures
function extractBikeInfo(jsonData) {
  const info = {
    makerid: null,
    maker: null,
    familyid: null,
    family: null,
    model: null,
    year: null,
    variant: null
  };
  
  // Direct fields
  if (jsonData.makerid) info.makerid = jsonData.makerid;
  if (jsonData.familyid) info.familyid = jsonData.familyid;
  if (jsonData.family) info.family = jsonData.family;
  if (jsonData.model) info.model = jsonData.model;
  if (jsonData.year) info.year = jsonData.year;
  if (jsonData.variant) info.variant = jsonData.variant;
  
  // Try to get maker name from makerid
  if (info.makerid && makerIds[info.makerid]) {
    info.maker = makerIds[info.makerid];
  }
  
  // Search nested structures
  const searchNested = (obj) => {
    if (typeof obj !== 'object' || obj === null) return;
    
    for (const [key, value] of Object.entries(obj)) {
      if (key === 'makerid' && value) info.makerid = value;
      if (key === 'familyid' && value) info.familyid = value;
      if (key === 'family' && value) info.family = value;
      if (key === 'model' && value) info.model = value;
      if (key === 'year' && value) info.year = value;
      if (key === 'variant' && value) info.variant = value;
      
      if (typeof value === 'object') {
        searchNested(value);
      }
    }
  };
  
  searchNested(jsonData);
  
  // Update maker if we found makerid in nested data
  if (info.makerid && !info.maker && makerIds[info.makerid]) {
    info.maker = makerIds[info.makerid];
  }
  
  return info;
}

async function analyzeAndExtractData() {
  try {
    await client.connect();
    console.log('Connected to database');
    
    // Get sample data first to test
    const sampleResult = await client.query(`
      SELECT keyid, comprehensive_data
      FROM bikes_data
      WHERE comprehensive_data IS NOT NULL 
      LIMIT 10
    `);
    
    console.log(`\nAnalyzing ${sampleResult.rows.length} sample records...`);
    console.log('=' .repeat(80));
    
    for (const row of sampleResult.rows) {
      console.log(`\nKeyID: ${row.keyid}`);
      
      let extractedInfo = null;
      
      // Check comprehensive_data field
      if (row.comprehensive_data) {
        // First try to use it directly as an object
        const info = extractBikeInfo(row.comprehensive_data);
        
        if (info.makerid || info.family || info.model) {
          extractedInfo = info;
        } else {
          // If that didn't work, try searching for embedded JSON strings
          const jsonString = JSON.stringify(row.comprehensive_data);
          const jsonObjects = extractJsonObjects(jsonString);
          
          for (const json of jsonObjects) {
            const embeddedInfo = extractBikeInfo(json);
            
            if (embeddedInfo.makerid || embeddedInfo.family || embeddedInfo.model) {
              extractedInfo = embeddedInfo;
              break;
            }
          }
        }
      }
      
      if (extractedInfo) {
        console.log(`  Extracted info:`);
        console.log(`    MakerID: ${extractedInfo.makerid}`);
        console.log(`    Maker: ${extractedInfo.maker}`);
        console.log(`    FamilyID: ${extractedInfo.familyid}`);
        console.log(`    Family: ${extractedInfo.family}`);
        console.log(`    Model: ${extractedInfo.model}`);
        console.log(`    Year: ${extractedInfo.year}`);
        console.log(`    Variant: ${extractedInfo.variant}`);
        
        // Check current bikes_catalog entry
        const catalogResult = await client.query(
          'SELECT make, model, year, variant FROM bikes_catalog WHERE keyid = $1',
          [row.keyid]
        );
        
        if (catalogResult.rows.length > 0) {
          const catalog = catalogResult.rows[0];
          console.log(`  Current catalog entry:`);
          console.log(`    Make: ${catalog.make}`);
          console.log(`    Model: ${catalog.model}`);
          console.log(`    Year: ${catalog.year}`);
          console.log(`    Variant: ${catalog.variant}`);
        }
      } else {
        console.log(`  No bike info found in comprehensive_data`);
      }
    }
    
    // Ask user if they want to proceed with full analysis
    console.log('\n' + '=' .repeat(80));
    console.log('\nThis was just a sample. Would you like to analyze the entire database?');
    console.log('This will show you statistics before making any changes.');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

// Run the analysis
analyzeAndExtractData();