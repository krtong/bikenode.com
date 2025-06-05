import fs from 'fs';
import path from 'path';
import pg from 'pg';
import { fileURLToPath } from 'url';
import readline from 'readline';

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database connection
const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'bikenode',
  user: 'postgres',
  password: 'postgres'
});

// Manual corrections for common brand names
const brandCorrections = {
  '3t': '3T',
  'allcity': 'All City',
  'santacruz': 'Santa Cruz',
  'ridefox': 'Ride Fox',
  'rockymountain': 'Rocky Mountain',
  'publicbikes': 'PUBLIC Bikes',
  'podbike': 'Pod Bike',
  'pivotcycles': 'Pivot Cycles',
  'prioritybicycles': 'Priority Bicycles',
  'purecycles': 'Pure Cycles',
  'qualitybicycleproducts': 'Quality Bicycle Products',
  'radbikes': 'Rad Bikes',
  'ridecannondale': 'Cannondale',
  'ridescoozy': 'Ride Scoozy',
  'retrospec': 'Retrospec',
  'rebellionbikes': 'Rebellion Bikes',
  'rarebicycles': 'Rare Bicycles',
  'reebcycles': 'Reeb Cycles',
  'rbinmotion': 'R&B In Motion',
  'ridebikeco': 'Ride Bike Co',
  'riese&muller': 'Riese & Müller',
  'roadmachinecycles': 'Road Machine Cycles',
  'rockshox': 'RockShox',
  'roguemechanic': 'Rogue Mechanic',
  'royalbaby': 'RoyalBaby',
  'salcycles': 'Salsa Cycles',
  'sanvegobikes': 'San Vego Bikes',
  'schwinn': 'Schwinn',
  'scottusa': 'Scott',
  'scoutbikes': 'Scout Bikes',
  'serottacycles': 'Serotta Cycles',
  'sixthreezero': 'sixthreezero',
  'slingshotbikes': 'Slingshot Bikes',
  'somausa': 'Soma',
  'sonderdesign': 'Sonder Design',
  'southernrockstar': 'Southern Rockstar',
  'specialized': 'Specialized',
  'speedvagen': 'Speedvagen',
  'spindatt': 'Spindatt',
  'squishbikes': 'Squish Bikes',
  'srammtb': 'SRAM MTB',
  'sramroad': 'SRAM Road',
  'stacyc': 'Stacyc',
  'standardbykecompany': 'Standard Byke Company',
  'statefixed': 'State Fixed',
  'steelbikes': 'Steel Bikes',
  'sternerfaehigkeiten': 'Sterner Faehigkeiten',
  'striderbikes': 'Strider Bikes',
  'sundaybikes': 'Sunday Bikes',
  'surlybikes': 'Surly Bikes',
  'sworks': 'S-Works',
  'swiftcarbon': 'Swift Carbon',
  'talariabikes': 'Talaria Bikes',
  'tempusbikes': 'Tempus Bikes',
  'terrybicycles': 'Terry Bicycles',
  'thebikebros': 'The Bike Bros',
  'theironhorse': 'The Iron Horse',
  'therideal': 'The Rideal',
  'theoremebikes': 'Theoreme Bikes',
  'thesis': 'Thesis',
  'tommaso': 'Tommaso',
  'trekbikes': 'Trek',
  'trek': 'Trek',
  'triathlonlab': 'Triathlon LAB',
  'tritonbikes': 'Triton Bikes',
  'truebike': 'True Bike',
  'tumbleweedbicycles': 'Tumbleweed Bicycles',
  'twinsix': 'Twin Six',
  'uicycling': 'UI Cycling',
  'unibike': 'Uni Bike',
  'upway': 'Upway',
  'vanhawks': 'VanHawks',
  'velecusa': 'Velec USA',
  'ventumracing': 'Ventum Racing',
  'vermontbicycleshop': 'Vermont Bicycle Shop',
  'villycustom': 'Villy Custom',
  'viner': 'Viner',
  'vintageelectricbikes': 'Vintage Electric Bikes',
  'vitus': 'Vitus',
  'volagi': 'Volagi',
  'vvolt': 'VVolt',
  'wabicycles': 'Wabi Cycles',
  'weehoo': 'WeeHoo',
  'wethepeople': 'We The People',
  'whyte': 'Whyte',
  'willowbikes': 'Willow Bikes',
  'windeedrider': 'Windee Drider',
  'woom': 'Woom',
  'worksmancycles': 'Worksman Cycles',
  'yeti': 'Yeti',
  'yuba': 'Yuba',
  'zerocycles': 'Zero Cycles',
  'zinn': 'Zinn',
  'zipvolt': 'ZipVolt',
  'aventon': 'Aventon',
  'bianchi': 'Bianchi',
  'bmc': 'BMC',
  'canyon': 'Canyon',
  'cannondale': 'Cannondale',
  'cervelo': 'Cervélo',
  'colnago': 'Colnago',
  'cube': 'Cube',
  'devinci': 'Devinci',
  'factor': 'Factor',
  'felt': 'Felt',
  'fuji': 'Fuji',
  'ghost': 'Ghost',
  'giant': 'Giant',
  'gitane': 'Gitane',
  'gt': 'GT',
  'haibike': 'Haibike',
  'haro': 'Haro',
  'jamis': 'Jamis',
  'khs': 'KHS',
  'kona': 'Kona',
  'lapierre': 'Lapierre',
  'litespeed': 'Litespeed',
  'liv': 'Liv',
  'look': 'Look',
  'marin': 'Marin',
  'merida': 'Merida',
  'mongoose': 'Mongoose',
  'mondraker': 'Mondraker',
  'norco': 'Norco',
  'orbea': 'Orbea',
  'pinarello': 'Pinarello',
  'polygon': 'Polygon',
  'propain': 'Propain',
  'quintana': 'Quintana Roo',
  'raleigh': 'Raleigh',
  'ribble': 'Ribble',
  'ridley': 'Ridley',
  'salsa': 'Salsa',
  'scott': 'Scott',
  'soma': 'Soma',
  'surly': 'Surly',
  'time': 'Time',
  'transition': 'Transition',
  'wilier': 'Wilier'
};

// Function to convert brand ID to proper case
function toBrandName(brandId) {
  // Check manual corrections first
  if (brandCorrections[brandId]) {
    return brandCorrections[brandId];
  }
  
  // Default: capitalize first letter
  return brandId.charAt(0).toUpperCase() + brandId.slice(1);
}

// Load brand IDs from file
function loadBrandIds() {
  const brandIds = fs.readFileSync(path.join(__dirname, '../scrapers/maker_ids.txt'), 'utf-8')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);
  
  // Create a map of brandId -> proper brand name
  const brandMap = new Map();
  brandIds.forEach(brandId => {
    brandMap.set(brandId, toBrandName(brandId));
  });
  
  return brandMap;
}

// Function to find and split concatenated brand+model
function splitBrandModel(concatenated, brandMap) {
  const lowerConcat = concatenated.toLowerCase();
  
  // Try to find the longest matching brand
  let bestMatch = null;
  let bestBrand = null;
  
  for (const [brandId, brandName] of brandMap) {
    if (lowerConcat.startsWith(brandId)) {
      if (!bestMatch || brandId.length > bestMatch.length) {
        bestMatch = brandId;
        bestBrand = brandName;
      }
    }
  }
  
  if (bestMatch) {
    // Extract the model part
    const modelPart = concatenated.substring(bestMatch.length);
    
    // Clean up the model part (add spaces before capitals, etc.)
    const cleanModel = modelPart
      .replace(/([a-z])([A-Z])/g, '$1 $2')  // Add space between lowercase and uppercase
      .replace(/([0-9])([A-Z])/g, '$1 $2')  // Add space between number and uppercase
      .trim();
    
    return {
      brand: bestBrand,
      model: cleanModel || null,
      matched: true
    };
  }
  
  // No match found
  return {
    brand: concatenated,
    model: null,
    matched: false
  };
}

async function cleanBikeCatalog() {
  try {
    await client.connect();
    console.log('Connected to database');
    
    const brandMap = loadBrandIds();
    console.log(`Loaded ${brandMap.size} brand mappings`);
    
    // Get all unique make values that might be concatenated
    const result = await client.query(`
      SELECT DISTINCT make, COUNT(*) as count
      FROM bikes_catalog
      GROUP BY make
      ORDER BY count DESC
    `);
    
    console.log(`Found ${result.rows.length} unique make values`);
    
    // Track statistics
    let fixed = 0;
    let notFixed = 0;
    const updates = [];
    
    // Process each unique make value
    for (const row of result.rows) {
      const originalMake = row.make;
      const split = splitBrandModel(originalMake, brandMap);
      
      if (split.matched && split.model) {
        // We found a concatenated brand+model
        updates.push({
          oldMake: originalMake,
          newMake: split.brand,
          model: split.model,
          count: row.count
        });
        fixed += parseInt(row.count);
      } else {
        notFixed += parseInt(row.count);
      }
    }
    
    console.log(`\nAnalysis complete:`);
    console.log(`- Can fix: ${fixed} records across ${updates.length} unique values`);
    console.log(`- Cannot fix: ${notFixed} records`);
    
    // Show some examples
    console.log(`\nExample fixes:`);
    updates.slice(0, 10).forEach(update => {
      console.log(`  "${update.oldMake}" → Brand: "${update.newMake}", Model: "${update.model}" (${update.count} records)`);
    });
    
    // Ask for confirmation
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const answer = await new Promise(resolve => {
      rl.question('\nDo you want to apply these fixes? (yes/no): ', resolve);
    });
    rl.close();
    
    if (answer.toLowerCase() === 'yes') {
      console.log('\nApplying fixes...');
      
      // Start transaction
      await client.query('BEGIN');
      
      for (const update of updates) {
        const query = `
          UPDATE bikes_catalog 
          SET make = $1
          WHERE make = $2
        `;
        
        const result = await client.query(query, [update.newMake, update.oldMake]);
        console.log(`Updated ${result.rowCount} records: ${update.oldMake} → ${update.newMake}`);
      }
      
      // Also fix the 'Standard' variant issue
      const variantResult = await client.query(`
        UPDATE bikes_catalog 
        SET variant = NULL 
        WHERE variant = 'Standard'
      `);
      console.log(`\nCleared ${variantResult.rowCount} 'Standard' variant entries`);
      
      await client.query('COMMIT');
      console.log('\nAll fixes applied successfully!');
    } else {
      console.log('Fixes cancelled');
    }
    
  } catch (error) {
    console.error('Error:', error);
    await client.query('ROLLBACK');
  } finally {
    await client.end();
  }
}

// Run the cleaning
cleanBikeCatalog();