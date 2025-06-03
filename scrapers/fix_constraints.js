#!/usr/bin/env node

import pg from 'pg';
import 'dotenv/config.js';
import chalk from 'chalk';

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'bikenode',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres'
};

async function removeConstraints() {
  const pool = new pg.Pool(dbConfig);
  
  try {
    console.log(chalk.blue('🔧 Removing problematic foreign key constraint...\n'));
    
    // Check if constraint exists
    const constraintCheck = await pool.query(`
      SELECT constraint_name 
      FROM information_schema.table_constraints 
      WHERE constraint_type = 'FOREIGN KEY' 
        AND table_name = 'bikes_data_2' 
        AND constraint_name = 'bikes_data_2_keyid_fkey'
    `);
    
    if (constraintCheck.rows.length > 0) {
      console.log(chalk.yellow('Found foreign key constraint: bikes_data_2_keyid_fkey'));
      
      // Drop the constraint
      await pool.query('ALTER TABLE bikes_data_2 DROP CONSTRAINT bikes_data_2_keyid_fkey');
      
      console.log(chalk.green('✅ Successfully removed foreign key constraint!'));
      console.log(chalk.blue('📝 bikes_data_2.keyid is now independent from bikes_catalog.keyid'));
      
    } else {
      console.log(chalk.yellow('⚠️ Foreign key constraint not found - it may have already been removed'));
    }
    
    // Also check and fix the bikes table if it has the same issue
    const bikesConstraintCheck = await pool.query(`
      SELECT constraint_name 
      FROM information_schema.table_constraints 
      WHERE constraint_type = 'FOREIGN KEY' 
        AND table_name = 'bikes' 
        AND constraint_name LIKE '%keyid%'
    `);
    
    if (bikesConstraintCheck.rows.length > 0) {
      console.log(chalk.yellow('\nFound foreign key constraint on bikes table too:'));
      bikesConstraintCheck.rows.forEach(row => {
        console.log(`  ${row.constraint_name}`);
      });
      
      // Drop any keyid-related constraints on bikes table
      for (const row of bikesConstraintCheck.rows) {
        await pool.query(`ALTER TABLE bikes DROP CONSTRAINT ${row.constraint_name}`);
        console.log(chalk.green(`✅ Removed constraint: ${row.constraint_name}`));
      }
    }
    
    console.log(chalk.bold.green('\n🎉 Database is now ready for independent bike scraping!'));
    console.log(chalk.blue('The scraper can now generate keyids without checking bikes_catalog.'));
    
  } catch (error) {
    console.error(chalk.red('❌ Error:'), error.message);
  } finally {
    await pool.end();
  }
}

removeConstraints();
