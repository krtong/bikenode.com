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

async function checkSchema() {
  const pool = new pg.Pool(dbConfig);
  
  try {
    // Check bikes_data_2 table structure
    const result = await pool.query(`
      SELECT 
        column_name, 
        data_type, 
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_name = 'bikes_data_2' 
      ORDER BY ordinal_position
    `);
    
    console.log(chalk.blue('📋 bikes_data_2 table structure:'));
    for (const row of result.rows) {
      console.log(`  ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable}) default: ${row.column_default || 'none'}`);
    }
    
    // Check if keyid has a sequence
    const sequenceCheck = await pool.query(`
      SELECT sequence_name 
      FROM information_schema.sequences 
      WHERE sequence_schema = 'public'
      AND sequence_name LIKE '%bikes_data_2%'
    `);
    
    console.log(chalk.blue('\n🔍 Related sequences:'));
    if (sequenceCheck.rows.length > 0) {
      for (const seq of sequenceCheck.rows) {
        console.log(`  ${seq.sequence_name}`);
      }
    } else {
      console.log('  No sequences found for bikes_data_2');
    }
    
  } catch (error) {
    console.error(chalk.red('❌ Error:'), error.message);
  } finally {
    await pool.end();
  }
}

checkSchema();