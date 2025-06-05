#!/usr/bin/env node
import pg from 'pg';

const dbConfig = {
  host: 'localhost',
  port: 5432,
  database: 'bikenode',
  user: 'postgres',
  password: 'postgres'
};

async function debugTable() {
  const pool = new pg.Pool(dbConfig);
  
  try {
    // Check if table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'bicycle_brands'
      );
    `);
    
    console.log('Table exists:', tableCheck.rows[0].exists);
    
    // If table exists, check its structure
    if (tableCheck.rows[0].exists) {
      const columns = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'bicycle_brands'
        ORDER BY ordinal_position;
      `);
      
      console.log('Table columns:');
      columns.rows.forEach(row => {
        console.log(`  - ${row.column_name}: ${row.data_type}`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

debugTable();