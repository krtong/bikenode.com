const { Pool } = require('pg');
const { validateAndSanitize } = require('./validation');
require('dotenv').config();

// Create a connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Function to insert or update motorcycle data
async function upsertMotorcycle(motorcycleData) {
  // Validate and sanitize data first
  const validation = validateAndSanitize(motorcycleData);
  if (!validation.isValid) {
    throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
  }
  
  const validData = validation.data;
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
    
    const specsResult = await client.query(specsQuery, [JSON.stringify(validData.specifications || {})]);
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
      validData.year,
      validData.make,
      validData.model,
      validData.package || null,
      validData.category || 'cabin',
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
async function motorcycleExists(year, make, model, packageName = null) {
  const query = `
    SELECT id FROM motorcycle_data_make_model_year
    WHERE year = $1 AND make = $2 AND model = $3 
    AND ($4::text IS NULL OR package = $4)
  `;
  
  const result = await pool.query(query, [year, make, model, packageName]);
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

// Function to start logging scraping activity
async function startScrapingLog(scraperName, manufacturer = null, metadata = null) {
  const query = `SELECT log_scraping_start($1, $2, $3)`;
  
  try {
    const result = await pool.query(query, [scraperName, manufacturer, metadata]);
    return result.rows[0].log_scraping_start;
  } catch (err) {
    console.error('Failed to start scraping log:', err);
    return null;
  }
}

// Function to complete logging scraping activity
async function completeScrapingLog(logId, modelsScraped, status, error = null, metadata = null) {
  const query = `SELECT log_scraping_complete($1, $2, $3, $4, $5)`;
  
  try {
    await pool.query(query, [logId, modelsScraped, status, error, metadata]);
  } catch (err) {
    console.error('Failed to complete scraping log:', err);
  }
}

// Legacy function for backward compatibility
async function logScrapingActivity(manufacturer, modelsScraped, status, error = null) {
  const logId = await startScrapingLog('cabin-motorcycles', manufacturer);
  if (logId) {
    await completeScrapingLog(logId, modelsScraped, status, error);
  }
}

module.exports = {
  pool,
  upsertMotorcycle,
  motorcycleExists,
  getMotorcyclesByMake,
  startScrapingLog,
  completeScrapingLog,
  logScrapingActivity
};