const { Pool } = require('pg');
require('dotenv').config();

// Create a connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Function to insert or update motorcycle data
async function upsertMotorcycle(motorcycleData) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // First, insert or update the specs
    const specsQuery = `
      INSERT INTO motorcycle_data_specs (specifications)
      VALUES ($1)
      ON CONFLICT ON CONSTRAINT unique_motorcycle_specs
      DO UPDATE SET 
        specifications = EXCLUDED.specifications,
        updated_at = NOW()
      RETURNING id
    `;
    
    const specsResult = await client.query(specsQuery, [JSON.stringify(motorcycleData.specifications)]);
    const specId = specsResult.rows[0].id;
    
    // Then, insert or update the motorcycle
    const motorcycleQuery = `
      INSERT INTO motorcycle_data_make_model_year (
        year, make, model, package, category, spec_id
      ) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (year, make, model, COALESCE(package, ''))
      DO UPDATE SET
        category = EXCLUDED.category,
        spec_id = EXCLUDED.spec_id,
        updated_at = NOW()
      RETURNING id
    `;
    
    const values = [
      motorcycleData.year,
      motorcycleData.make,
      motorcycleData.model,
      motorcycleData.package || null,
      motorcycleData.category || 'cabin',
      specId
    ];
    
    const result = await client.query(motorcycleQuery, values);
    
    await client.query('COMMIT');
    
    return {
      motorcycleId: result.rows[0].id,
      specId: specId
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Function to check if a motorcycle exists
async function motorcycleExists(year, make, model, package = null) {
  const query = `
    SELECT id FROM motorcycle_data_make_model_year
    WHERE year = $1 AND make = $2 AND model = $3 
    AND ($4::text IS NULL OR package = $4)
  `;
  
  const result = await pool.query(query, [year, make, model, package]);
  return result.rows.length > 0;
}

// Function to get all motorcycles by manufacturer
async function getMotorcyclesByMake(make) {
  const query = `
    SELECT m.*, s.specifications
    FROM motorcycle_data_make_model_year m
    LEFT JOIN motorcycle_data_specs s ON m.spec_id = s.id
    WHERE m.make = $1
    ORDER BY m.year DESC, m.model
  `;
  
  const result = await pool.query(query, [make]);
  return result.rows;
}

// Function to log scraping activity
async function logScrapingActivity(manufacturer, modelsScraped, status, error = null) {
  const query = `
    INSERT INTO scraping_logs (
      scraper_name, manufacturer, models_scraped, status, error_message, scraped_at
    ) VALUES ($1, $2, $3, $4, $5, NOW())
  `;
  
  try {
    await pool.query(query, [
      'cabin-motorcycles',
      manufacturer,
      modelsScraped,
      status,
      error
    ]);
  } catch (err) {
    console.error('Failed to log scraping activity:', err);
  }
}

module.exports = {
  pool,
  upsertMotorcycle,
  motorcycleExists,
  getMotorcyclesByMake,
  logScrapingActivity
};