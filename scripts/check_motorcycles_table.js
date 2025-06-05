#!/usr/bin/env node
import pg from 'pg';

const dbConfig = {
  host: 'localhost',
  port: 5432,
  database: 'bikenode',
  user: 'postgres',
  password: 'postgres'
};

async function checkMotorcyclesTable() {
  const pool = new pg.Pool(dbConfig);
  
  try {
    // Check if motorcycles table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'motorcycles'
      );
    `);
    
    console.log('Motorcycles table exists:', tableCheck.rows[0].exists);
    
    // If table exists, check its structure
    if (tableCheck.rows[0].exists) {
      const columns = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'motorcycles'
        ORDER BY ordinal_position;
      `);
      
      console.log('Motorcycles table columns:');
      columns.rows.forEach(row => {
        console.log(`  - ${row.column_name}: ${row.data_type}`);
      });
      
      // Check sample data
      const sampleData = await pool.query(`
        SELECT make, model, category, engine, package 
        FROM motorcycles 
        WHERE category IS NOT NULL 
        LIMIT 10;
      `);
      
      console.log('\nSample motorcycle data:');
      sampleData.rows.forEach(row => {
        console.log(`  ${row.make} ${row.model} - Category: ${row.category}, Engine: ${row.engine}, Package: ${row.package}`);
      });
      
      // Check distinct categories
      const categories = await pool.query(`
        SELECT DISTINCT category, COUNT(*) as count
        FROM motorcycles 
        WHERE category IS NOT NULL 
        GROUP BY category 
        ORDER BY count DESC;
      `);
      
      console.log('\nMotorcycle categories:');
      categories.rows.forEach(row => {
        console.log(`  ${row.category}: ${row.count} models`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkMotorcyclesTable();