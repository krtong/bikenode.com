#!/usr/bin/env node

import pg from 'pg';
import 'dotenv/config.js';

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'bikenode',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres'
};

async function checkConstraints() {
  const pool = new pg.Pool(dbConfig);
  
  try {
    console.log('🔍 Checking database constraints...\n');
    
    // Check if bikes_catalog table exists
    const catalogExists = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'bikes_catalog'
      );
    `);
    
    console.log('bikes_catalog table exists:', catalogExists.rows[0].exists);
    
    if (catalogExists.rows[0].exists) {
      // Check bikes_catalog record count
      const catalogCount = await pool.query('SELECT COUNT(*) FROM bikes_catalog');
      console.log('bikes_catalog record count:', catalogCount.rows[0].count);
      
      // Check bikes_catalog structure first
      const catalogStructure = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'bikes_catalog' 
        ORDER BY ordinal_position 
        LIMIT 10;
      `);
      
      console.log('bikes_catalog table structure:');
      catalogStructure.rows.forEach(row => {
        console.log(`  ${row.column_name}: ${row.data_type}`);
      });
      
      // Show sample records with actual columns
      const catalogSample = await pool.query('SELECT * FROM bikes_catalog LIMIT 3');
      console.log('\nSample bikes_catalog records:');
      catalogSample.rows.forEach((row, i) => {
        console.log(`  Record ${i + 1}:`, Object.keys(row).slice(0, 5).map(key => `${key}: ${row[key]}`).join(', '));
      });
    }
    
    // Check bikes_data_2 table structure
    const data2Structure = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'bikes_data_2' 
      ORDER BY ordinal_position;
    `);
    
    console.log('\nbikes_data_2 table structure:');
    data2Structure.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });
    
    // Check foreign key constraints
    const constraints = await pool.query(`
      SELECT 
        tc.constraint_name,
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name = 'bikes_data_2';
    `);
    
    console.log('\nForeign key constraints on bikes_data_2:');
    constraints.rows.forEach(row => {
      console.log(`  ${row.constraint_name}: ${row.table_name}.${row.column_name} -> ${row.foreign_table_name}.${row.foreign_column_name}`);
    });
    
    // Check bikes_data_2 record count
    const data2Count = await pool.query('SELECT COUNT(*) FROM bikes_data_2');
    console.log('\nbikes_data_2 record count:', data2Count.rows[0].count);
    
    // Check for keyid mismatches
    if (catalogExists.rows[0].exists) {
      const mismatches = await pool.query(`
        SELECT bd.keyid 
        FROM bikes_data_2 bd 
        LEFT JOIN bikes_catalog bc ON bd.keyid = bc.keyid 
        WHERE bc.keyid IS NULL 
        LIMIT 5;
      `);
      
      console.log('\nKeyIDs in bikes_data_2 that don\'t exist in bikes_catalog:');
      mismatches.rows.forEach(row => {
        console.log(`  keyid: ${row.keyid}`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkConstraints();
