import fs from 'fs';
import path from 'path';
import pg from 'pg';
import { fileURLToPath } from 'url';

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import maker_ids mapping
const makerIdsPath = path.join(__dirname, '../scrapers/maker_ids.js');
const makerIdsContent = fs.readFileSync(makerIdsPath, 'utf8');
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

// Function to search for JSON patterns in strings
function findJsonPatterns(str) {
  const patterns = [];
  
  // First, unescape any JSON strings (handle \" to ")
  const unescaped = str.replace(/\\"/g, '"');
  
  // Look for makerid patterns - handle escaped quotes too
  const makeridMatches = [...unescaped.matchAll(/"makerid"\s*:\s*"([^"]+)"/g),
                           ...unescaped.matchAll(/makerid:\s*"([^"]+)"/g),
                           ...str.matchAll(/makerid\\":\\"([^"\\]+)/g)];
  for (const match of makeridMatches) {
    patterns.push({ type: 'makerid', value: match[1] });
  }
  
  // Look for familyid patterns
  const familyidMatches = [...unescaped.matchAll(/"familyid"\s*:\s*"([^"]+)"/g),
                           ...unescaped.matchAll(/familyid:\s*"([^"]+)"/g),
                           ...str.matchAll(/familyid\\":\\"([^"\\]+)/g)];
  for (const match of familyidMatches) {
    patterns.push({ type: 'familyid', value: match[1] });
  }
  
  // Look for family patterns
  const familyMatches = [...unescaped.matchAll(/"family"\s*:\s*"([^"]+)"/g),
                         ...unescaped.matchAll(/family:\s*"([^"]+)"/g),
                         ...str.matchAll(/family\\":\\"([^"\\]+)/g)];
  for (const match of familyMatches) {
    patterns.push({ type: 'family', value: match[1] });
  }
  
  // Look for model patterns
  const modelMatches = [...unescaped.matchAll(/"model"\s*:\s*"([^"]+)"/g),
                        ...unescaped.matchAll(/model:\s*"([^"]+)"/g)];
  for (const match of modelMatches) {
    patterns.push({ type: 'model', value: match[1] });
  }
  
  // Look for year patterns
  const yearMatches = [...unescaped.matchAll(/"year"\s*:\s*(\d{4})/g),
                       ...unescaped.matchAll(/year:\s*(\d{4})/g)];
  for (const match of yearMatches) {
    patterns.push({ type: 'year', value: parseInt(match[1]) });
  }
  
  return patterns;
}

// Function to extract bike info from any data structure
function extractBikeInfo(data, keyid) {
  const info = {
    keyid: keyid,
    makerid: null,
    maker: null,
    familyid: null,
    family: null,
    model: null,
    year: null,
    variant: null
  };
  
  // Convert everything to string to search
  const dataStr = JSON.stringify(data);
  const patterns = findJsonPatterns(dataStr);
  
  // Extract values from patterns
  for (const pattern of patterns) {
    if (pattern.type === 'makerid' && !info.makerid) {
      info.makerid = pattern.value;
    }
    if (pattern.type === 'familyid' && !info.familyid) {
      info.familyid = pattern.value;
    }
    if (pattern.type === 'family' && !info.family) {
      info.family = pattern.value;
    }
    if (pattern.type === 'model' && !info.model) {
      info.model = pattern.value;
    }
    if (pattern.type === 'year' && !info.year) {
      info.year = pattern.value;
    }
  }
  
  // Look up maker name from makerid
  if (info.makerid && makerIds[info.makerid]) {
    info.maker = makerIds[info.makerid];
  }
  
  // Try to extract variant from current catalog data
  return info;
}

async function analyzeAndFixData() {
  try {
    await client.connect();
    console.log('Connected to database');
    
    // First, analyze a sample to show what we'll be doing
    console.log('\n=== ANALYZING SAMPLE DATA ===\n');
    
    const sampleResult = await client.query(`
      SELECT 
        bd.keyid,
        bd.comprehensive_data,
        bc.make as current_make,
        bc.model as current_model,
        bc.year as current_year,
        bc.variant as current_variant
      FROM bikes_data bd
      LEFT JOIN bikes_catalog bc ON bd.keyid = bc.keyid
      WHERE bd.comprehensive_data IS NOT NULL 
        AND (bd.comprehensive_data::text LIKE '%makerid%' 
         OR bd.comprehensive_data::text LIKE '%familyid%')
      LIMIT 5
    `);
    
    let fixableCount = 0;
    
    for (const row of sampleResult.rows) {
      const extracted = extractBikeInfo(row.comprehensive_data, row.keyid);
      
      console.log(`KeyID: ${row.keyid}`);
      console.log(`  Current catalog entry:`);
      console.log(`    Make: ${row.current_make}`);
      console.log(`    Model: ${row.current_model}`);
      console.log(`    Year: ${row.current_year}`);
      console.log(`    Variant: ${row.current_variant}`);
      
      if (extracted.makerid || extracted.family) {
        fixableCount++;
        console.log(`  ✓ Found embedded data:`);
        console.log(`    MakerID: ${extracted.makerid}`);
        console.log(`    Maker: ${extracted.maker}`);
        console.log(`    FamilyID: ${extracted.familyid}`);
        console.log(`    Family: ${extracted.family}`);
        console.log(`    Model: ${extracted.model}`);
        console.log(`    Year: ${extracted.year}`);
      } else {
        console.log(`  ✗ No embedded data found`);
      }
      console.log('');
    }
    
    // Get total count of records with data
    const countResult = await client.query(`
      SELECT COUNT(*) as total
      FROM bikes_data
      WHERE comprehensive_data IS NOT NULL
    `);
    
    const totalRecords = parseInt(countResult.rows[0].total);
    console.log(`\n=== STATISTICS ===`);
    console.log(`Total records with comprehensive_data: ${totalRecords}`);
    console.log(`Sample shows ${fixableCount}/5 records can be fixed`);
    
    // Ask user to proceed
    console.log('\n=== READY TO FIX DATA ===');
    console.log('This script will:');
    console.log('1. Extract makerid, familyid, and family from stringified JSON blobs');
    console.log('2. Use maker_ids.js to map makerid to proper manufacturer names');
    console.log('3. Update bikes_catalog with corrected data');
    console.log('\nTo proceed with fixing ALL records, run with --fix flag:');
    console.log('node fix_bike_catalog.js --fix');
    
    if (process.argv.includes('--fix')) {
      console.log('\n=== FIXING DATA ===\n');
      
      // Process in batches
      const batchSize = 100;
      let offset = 0;
      let totalFixed = 0;
      let totalProcessed = 0;
      
      while (offset < totalRecords) {
        const batchResult = await client.query(`
          SELECT 
            bd.keyid,
            bd.comprehensive_data,
            bc.make as current_make,
            bc.model as current_model,
            bc.year as current_year,
            bc.variant as current_variant
          FROM bikes_data bd
          LEFT JOIN bikes_catalog bc ON bd.keyid = bc.keyid
          WHERE bd.comprehensive_data IS NOT NULL 
          LIMIT $1 OFFSET $2
        `, [batchSize, offset]);
        
        for (const row of batchResult.rows) {
          totalProcessed++;
          const extracted = extractBikeInfo(row.comprehensive_data, row.keyid);
          
          if (extracted.maker || extracted.family) {
            // Prepare update values
            const updates = [];
            const values = [];
            let paramCount = 1;
            
            if (extracted.maker) {
              updates.push(`make = $${paramCount++}`);
              values.push(extracted.maker);
            }
            
            if (extracted.family) {
              updates.push(`model = $${paramCount++}`);
              values.push(extracted.family);
            } else if (extracted.familyid && extracted.maker) {
              // Extract model name from familyid by removing maker prefix
              const familyParts = extracted.familyid.split('-');
              if (familyParts[0] === extracted.makerid) {
                // Remove maker prefix and capitalize remaining parts
                const modelParts = familyParts.slice(1);
                const modelName = modelParts.map(part => 
                  part.charAt(0).toUpperCase() + part.slice(1)
                ).join(' ');
                updates.push(`model = $${paramCount++}`);
                values.push(modelName);
              } else {
                updates.push(`model = $${paramCount++}`);
                values.push(extracted.familyid);
              }
            }
            
            if (extracted.year) {
              updates.push(`year = $${paramCount++}`);
              values.push(extracted.year);
            }
            
            // Keep original variant if we don't have a better one
            if (row.current_variant && !extracted.model) {
              // Current variant might contain the actual model info
              updates.push(`variant = $${paramCount++}`);
              values.push(row.current_variant);
            } else if (extracted.model) {
              updates.push(`variant = $${paramCount++}`);
              values.push(extracted.model);
            }
            
            values.push(row.keyid);
            
            try {
              // Update the catalog
              await client.query(`
                UPDATE bikes_catalog 
                SET ${updates.join(', ')}
                WHERE keyid = $${paramCount}
              `, values);
              
              totalFixed++;
              
              if (totalFixed % 10 === 0) {
                console.log(`Fixed ${totalFixed} records...`);
              }
            } catch (error) {
              if (error.code === '23505') {
                // Duplicate key error - skip this record
                console.log(`  Skipping keyid ${row.keyid} - would create duplicate`);
              } else {
                throw error; // Re-throw other errors
              }
            }
          }
        }
        
        offset += batchSize;
        console.log(`Processed ${totalProcessed}/${totalRecords} records (${Math.round(totalProcessed/totalRecords*100)}%)`);
      }
      
      console.log(`\n=== COMPLETE ===`);
      console.log(`Total records processed: ${totalProcessed}`);
      console.log(`Total records fixed: ${totalFixed}`);
      console.log(`Success rate: ${Math.round(totalFixed/totalProcessed*100)}%`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

// Run the script
analyzeAndFixData();