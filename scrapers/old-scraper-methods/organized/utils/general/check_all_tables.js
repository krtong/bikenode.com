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

async function checkAllTables() {
  const pool = new pg.Pool(dbConfig);
  
  try {
    // Get all table names
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    console.log(chalk.blue('📋 All tables in database:'));
    
    for (const table of tables.rows) {
      const tableName = table.table_name;
      try {
        const count = await pool.query(`SELECT COUNT(*) FROM ${tableName}`);
        console.log(`  ${tableName}: ${chalk.yellow(count.rows[0].count)} records`);
      } catch (error) {
        console.log(`  ${tableName}: ${chalk.red('Error getting count')}`);
      }
    }
    
    // Check for motorcycle-related tables
    console.log(chalk.blue('\n🔍 Looking for motorcycle/additional data:'));
    const motorcycleCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND (table_name ILIKE '%motor%' OR table_name ILIKE '%vehicle%' OR table_name ILIKE '%catalog%')
      ORDER BY table_name
    `);
    
    if (motorcycleCheck.rows.length > 0) {
      for (const table of motorcycleCheck.rows) {
        const count = await pool.query(`SELECT COUNT(*) FROM ${table.table_name}`);
        console.log(`  ${table.table_name}: ${chalk.yellow(count.rows[0].count)} records`);
      }
    } else {
      console.log(`  No motorcycle/vehicle specific tables found`);
    }
    
  } catch (error) {
    console.error(chalk.red('❌ Error:'), error.message);
  } finally {
    await pool.end();
  }
}

checkAllTables();