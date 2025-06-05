#!/usr/bin/env node
import pg from 'pg';

const dbConfig = {
  host: 'localhost',
  port: 5432,
  database: 'bikenode',
  user: 'postgres',
  password: 'postgres'
};

const pool = new pg.Pool(dbConfig);
await pool.query("DELETE FROM brands WHERE brand_id IN ('example1', 'test_brand')");
console.log('✅ Cleaned up test brands');
await pool.end();