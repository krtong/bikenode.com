#!/usr/bin/env node
import pg from 'pg';
import chalk from 'chalk';

const dbConfig = {
  host: 'localhost',
  port: 5432,
  database: 'bikenode',
  user: 'postgres',
  password: 'postgres'
};

async function debugExtraction() {
  const pool = new pg.Pool(dbConfig);
  
  try {
    // Check what's in bikes_data for keyid 1 and 2
    const result = await pool.query(`
      SELECT 
        bd.keyid,
        bc.make,
        bc.model,
        bc.year,
        bd.comprehensive_data
      FROM bikes_data bd
      JOIN bikes_catalog bc ON bd.keyid = bc.keyid
      WHERE bd.keyid IN (1, 2)
    `);
    
    console.log(chalk.blue('=== BIKES_DATA CONTENT ==='));
    for (const row of result.rows) {
      console.log(chalk.yellow(`\nKeyID ${row.keyid}: ${row.make} ${row.model} ${row.year}`));
      console.log('Comprehensive data keys:', Object.keys(row.comprehensive_data || {}));
      
      if (row.comprehensive_data) {
        // Try to find manufacturer/makerid info
        const data = row.comprehensive_data;
        console.log('Manufacturer field:', data.manufacturer || 'NOT FOUND');
        console.log('Make field:', data.make || 'NOT FOUND');
        console.log('MakerID field:', data.makerid || data.makerId || 'NOT FOUND');
        
        // Check bikeDetails for manufacturer info
        if (data.bikeDetails) {
          console.log('BikeDetails keys:', Object.keys(data.bikeDetails));
          console.log('BikeDetails manufacturer:', data.bikeDetails.manufacturer || 'NOT FOUND');
          console.log('BikeDetails makerid:', data.bikeDetails.makerid || data.bikeDetails.makerId || 'NOT FOUND');
          console.log('BikeDetails model:', data.bikeDetails.model || 'NOT FOUND');
          console.log('BikeDetails year:', data.bikeDetails.year || 'NOT FOUND');
          
          // Test the manufacturer cleanup logic
          let manufacturer = data.bikeDetails.manufacturer;
          if (manufacturer && manufacturer.includes('Cross')) {
            const match = manufacturer.match(/^([A-Z]+)(?=[A-Z][a-z])/);
            if (match) {
              console.log('Cleaned manufacturer would be:', match[1]);
            }
          }
        }
        
        // Check pageInfo
        if (data.pageInfo) {
          console.log('PageInfo keys:', Object.keys(data.pageInfo));
        }
        
        if (data.frameMaterial && typeof data.frameMaterial === 'string' && data.frameMaterial.includes('{"props"')) {
          console.log('Has embedded JSON in frameMaterial!');
        }
      }
    }
    
    // Check if anything was saved to bikes_data_2
    const data2Result = await pool.query(`
      SELECT keyid, url, has_embedded_data, extracted_data 
      FROM bikes_data_2 
      WHERE keyid IN (1, 2)
    `);
    
    console.log(chalk.blue('\n=== BIKES_DATA_2 CONTENT ==='));
    if (data2Result.rows.length === 0) {
      console.log(chalk.red('No records found in bikes_data_2'));
    } else {
      for (const row of data2Result.rows) {
        console.log(`KeyID ${row.keyid}: ${row.url}, embedded_data: ${row.has_embedded_data}`);
        if (row.extracted_data) {
          console.log('Extracted manufacturer:', row.extracted_data.manufacturer || 'NOT FOUND');
          console.log('Extracted makerid:', row.extracted_data.makerid || 'NOT FOUND');
          console.log('Extracted model:', row.extracted_data.model || 'NOT FOUND');
          console.log('Extracted year:', row.extracted_data.year || 'NOT FOUND');
        }
      }
    }
    
  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
  } finally {
    await pool.end();
  }
}

debugExtraction();