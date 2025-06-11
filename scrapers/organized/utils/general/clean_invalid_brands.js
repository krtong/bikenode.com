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

async function cleanInvalidBrands() {
  const pool = new pg.Pool(dbConfig);
  
  try {
    // First, let's see what brands we have that look invalid
    console.log(chalk.blue('🔍 Checking for invalid brands...'));
    
    const allBrands = await pool.query(`
      SELECT id, name, normalized_name, data_quality_score
      FROM bicycle_brands 
      ORDER BY name
    `);
    
    console.log(chalk.blue(`\n📊 Current brands (${allBrands.rows.length} total):`));
    
    // Identify brands that look like model variants rather than actual brands
    const invalidBrands = [];
    const validBrands = [];
    
    for (const brand of allBrands.rows) {
      const name = brand.name.toLowerCase();
      const normalizedName = brand.normalized_name;
      
      // Identify invalid patterns
      const isInvalid = 
        // 3T variants (not actual brands)
        (normalizedName.startsWith('3t') && normalizedName !== '3t') ||
        // Alchemy variants 
        (normalizedName.startsWith('alchemy') && normalizedName !== 'alchemy') ||
        // Other suspicious patterns
        name.includes('exploro') ||  // 3T Exploro is a bike model
        name.includes('racemax') ||  // 3T Racemax is a bike model
        name.includes('strada') ||   // 3T Strada is a bike model
        name.includes('velocio') ||  // 3T Velocio is a bike model
        name.includes('primo') ||    // 3T Primo is a bike model
        name.includes('ultra') ||    // 3T Ultra is a bike model
        name.includes('extrema') ||  // 3T Extrema is a bike model
        name.includes('arktos') ||   // Alchemy Arktos is a bike model
        name.includes('argos') ||    // Alchemy Argos is a bike model
        name.includes('atlas') ||    // Alchemy Atlas is a bike model
        name.includes('arkti') ||    // Alchemy Arkti is a bike model
        name.includes('ark') && normalizedName.startsWith('alchemy'); // Alchemy Ark models
      
      if (isInvalid) {
        invalidBrands.push(brand);
      } else {
        validBrands.push(brand);
      }
    }
    
    console.log(chalk.red(`\n❌ Invalid brands to delete (${invalidBrands.length}):`));
    for (const brand of invalidBrands) {
      console.log(`  ${brand.name} (${brand.normalized_name}) - ID: ${brand.id}`);
    }
    
    console.log(chalk.green(`\n✅ Valid brands to keep (${validBrands.length}):`));
    for (const brand of validBrands.slice(0, 10)) { // Show first 10
      console.log(`  ${brand.name} (${brand.normalized_name}) - Quality: ${brand.data_quality_score}`);
    }
    if (validBrands.length > 10) {
      console.log(`  ... and ${validBrands.length - 10} more valid brands`);
    }
    
    // Ask for confirmation before deleting
    if (invalidBrands.length > 0) {
      console.log(chalk.yellow(`\n⚠️  Ready to delete ${invalidBrands.length} invalid brands.`));
      console.log(chalk.yellow(`This will permanently remove them from the database.`));
      console.log(chalk.blue(`\nTo proceed, run this script with --confirm flag:`));
      console.log(chalk.white(`node clean_invalid_brands.js --confirm`));
      
      // Check if --confirm flag was provided
      const args = process.argv.slice(2);
      if (args.includes('--confirm')) {
        console.log(chalk.red('\n🗑️  Deleting invalid brands...'));
        
        for (const brand of invalidBrands) {
          await pool.query('DELETE FROM bicycle_brands WHERE id = $1', [brand.id]);
          console.log(chalk.gray(`  ✓ Deleted ${brand.name} (ID: ${brand.id})`));
        }
        
        console.log(chalk.green(`\n✅ Successfully deleted ${invalidBrands.length} invalid brands!`));
        console.log(chalk.green(`✅ ${validBrands.length} valid brands remain in the database.`));
      }
    } else {
      console.log(chalk.green('\n✅ No invalid brands found! Database is clean.'));
    }
    
  } catch (error) {
    console.error(chalk.red('❌ Error:'), error.message);
  } finally {
    await pool.end();
  }
}

cleanInvalidBrands();